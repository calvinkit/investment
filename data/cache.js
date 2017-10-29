var loki = require('lokijs');
var zmq = require('zeromq');
var zmqports = require('../config/zmq')();
var Security = require('../lib/security');
var logger = require('../config/log');

function Cache() {
    this.db = new loki('./data.dat', {
        autoload: true,
        autoloadCallback : databaseInitialize.bind(this),
        autosave: true, 
        autosaveInterval: 4000
    });

    this.quote = zmq.socket('dealer').connect(zmqports.quote[0]);
    this.quote.on('message', (function() {
        var security = new Security().consume(JSON.parse(arguments[arguments.length-1]));
        //this.collection.update({ticker: security.ticker}, security, {upsert:true, w:1}, function(err, result) { console.log(err, result) });
        this.collection.insert(security);
        this._size++;
        console.log(this._size);
        if (this.size == this._size) this.close();
    }).bind(this));

    function databaseInitialize() {
        this.collection = this.db.getCollection("stocks");
        if (this.collection === null) {
            this.collection = this.db.addCollection("stocks", { autoupdate: true });
        }
        this.size = this.collection.count();
        console.log(this.size);
        this.size = 2;
        this._size = this.size;
        this.refresh();
    }
}

Cache.prototype.refresh = function() {
    this._size = 0;
    this.quote.send(['', JSON.stringify({ action: 'quotes', security: new Security('GOOG','GOOG','United States') })]);
    this.quote.send(['', JSON.stringify({ action: 'quotes', security: new Security('AAPL','AAPL','United States') })]);
    //this.all(console.log);
    //this.all((function(err, items) {
    //    //items.forEach((function(s) {
    //    //    this.quote.send(['', JSON.stringify({ action: 'quotes', security: s })]);
    //    //}).bind(this));
    //}).bind(this));
};

Cache.prototype.all = function(cb) {
    var cursor = this.collection.find({});
    //cursor.toArray(cb);
};

Cache.prototype.close = function() {
    try { this.quote.close(); } catch(e) {};
    this.db.saveDatabase();
    console.log('done');
};

module.exports = new Cache();


