var db = require('diskdb');
var zmq = require('zeromq');
var fs = require('fs');
var zmqports = require(__dirname+'/../config/zmq')();
var Security = require(__dirname+'/../lib/security');
var Portfolio = require(__dirname+'/../lib/portfolio');
var logger = require(__dirname+'/../config/log');
var exchanges = ['TSX','NYSE','NASDAQ'];
var remaining = {};

function Cache() {
    this.db = db.connect(__dirname+'/', ['stocks','universe']);
    this.db.loadCollections(exchanges);
    this.collection = this.db.stocks; // default to stocks

    this.quote = zmq.socket('dealer').connect(zmqports.quote[0]);
    this.quote.on('message', (function() {
        var security = new Security().consume(JSON.parse(arguments[arguments.length-1]));
        // clear the indicators/statistics
        delete security.indicators; delete security.statistics;delete security.returns;
        this.collection.update({ ticker: security.ticker }, security, { upsert: true });
        delete remaining[security.ticker];
        if (this.size == ++this._size) this.close();
        //if (this.size - this._size < 30) console.log(remaining);
    }).bind(this));
}

Cache.prototype.refresh = function(coll_name) {
    this.collection = coll_name?this.db[coll_name]:this.collection;
    this.size = this.collection.count();
    this._size = 0;

    if (false) {
        this.size = 0;
        this.size++; this.quote.send(['', JSON.stringify({ action: 'quotes', security: new Security('.INX','.INX','INDEXSP') })]);
        this.size++; this.quote.send(['', JSON.stringify({ action: 'quotes', security: new Security('.DJI','.DJI','INDEXDJX') })]);
        this.size++; this.quote.send(['', JSON.stringify({ action: 'quotes', security: new Security('.IXIC','.IXIC','INDEXNASDAQ') })]);
        this.size++; this.quote.send(['', JSON.stringify({ action: 'quotes', security: new Security('OSPTX','OSPTX','INDEXTSI') })]);
    } else {
        this.find(null,this.collection).forEach((function(s) {
            remaining[s.ticker] = true;
            this.quote.send(['', JSON.stringify({ action: 'quotes', security: s })]);
        }).bind(this));
    }
};

Cache.prototype.find = function(query, collection) {
    var coll = collection?collection:this.collection;
    return coll.find(query).map(function(s) { return new Security().consume(s); });
};

Cache.prototype.close = function() {
    try { this.quote.close(); } catch(e) {};
    console.log('Done');
};

Cache.prototype.init = function() {
    exchanges.forEach((function(e) {
        this.db[e].remove();
        this.db.loadCollections([e]);
        var data = fs.readFileSync(__dirname+'/'+e+'.txt');
        this.db[e].save(String(data).split('\n').slice(1,-1).map(function(line) {
            var ticker = line.split('\t')[0];
            var name = line.split('\t')[1].replace(/\n/g,'');
            return new Security(ticker, ticker, e, name);
        }));
    }).bind(this));
    this.close();
};

Cache.prototype.toPortfolio = function() {
    var portfolio = new Portfolio('EMPTY');
    this.db.bluechips.find().forEach(function(s) {
        portfolio.add(s, new Date('2010-01-01').fromGMTDate(), 1, 1, 0);
    });
    portfolio.write();
};

module.exports = new Cache();


