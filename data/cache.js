var db = require('diskdb');
var zmq = require('zeromq');
var zmqports = require(__dirname+'/../config/zmq')();
var Security = require(__dirname+'/../lib/security');
var Portfolio = require(__dirname+'/../lib/portfolio');
var logger = require(__dirname+'/../config/log');

function Cache() {
    this.db = db.connect(__dirname+'/', ['stocks','universe','bluechips']);
    this.collection = this.db.stocks;
    this.size = this._size = this.collection.count();

    this.quote = zmq.socket('dealer').connect(zmqports.quote[0]);
    this.quote.on('message', (function() {
        var security = new Security().consume(JSON.parse(arguments[arguments.length-1]));
        // clear the indicators/statistics
        delete security.indicators; delete security.statistics;delete security.returns;
        this.collection.update({ ticker: security.ticker }, security, { upsert: true });
        if (this.size == ++this._size) this.close();
    }).bind(this));
}

Cache.prototype.refresh = function() {
    this._size = 0;
    if (false) {
        this.size = 0;
        this.size++; this.quote.send(['', JSON.stringify({ action: 'quotes', security: new Security('GOOG','GOOG','United States') })]);
        this.size++; this.quote.send(['', JSON.stringify({ action: 'quotes', security: new Security('GOOGL','GOOGL','United States') })]);
        this.size++; this.quote.send(['', JSON.stringify({ action: 'quotes', security: new Security('AAPL','AAPL','United States') })]);
        this.size++; this.quote.send(['', JSON.stringify({ action: 'quotes', security: new Security('NFLX','NFLX','United States') })]);
        this.size++; this.quote.send(['', JSON.stringify({ action: 'quotes', security: new Security('AMZN','AMZN','United States') })]);
        this.size++; this.quote.send(['', JSON.stringify({ action: 'quotes', security: new Security('FB','FB','United States') })]);
        this.size++; this.quote.send(['', JSON.stringify({ action: 'quotes', security: new Security('.INX','.INX','INDEXSP') })]);
        this.size++; this.quote.send(['', JSON.stringify({ action: 'quotes', security: new Security('.DJI','.DJI','INDEXDJX') })]);
        this.size++; this.quote.send(['', JSON.stringify({ action: 'quotes', security: new Security('.IXIC','.IXIC','INDEXNASDAQ') })]);
        this.size++; this.quote.send(['', JSON.stringify({ action: 'quotes', security: new Security('OSPTX','OSPTX','INDEXTSI') })]);
    } else {
        this.find().forEach((function(s) {
            this.quote.send(['', JSON.stringify({ action: 'quotes', security: s })]);
        }).bind(this));
    }
};

Cache.prototype.find = function(query) {
    return this.collection.find(query).map(function(s) { return new Security().consume(s); });
};

Cache.prototype.close = function() {
    try { this.quote.close(); } catch(e) {};
    console.log('Done');
};

Cache.prototype.toPortfolio = function() {
    var portfolio = new Portfolio('EMPTY');
    this.db.bluechips.find().forEach(function(s) {
        portfolio.add(s, new Date('2010-01-01').fromGMTDate(), 1, 1, 0);
    });
    portfolio.write();
};

module.exports = new Cache();


