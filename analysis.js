var zmq = require('zeromq');
var fs = require('fs');
var readline = require('readline');
var stream = require('stream');
var Security = require('./lib/security');
var statistic = require('./util/statistics');
var filter = require('./util/strategy');
var zmqports = require('./config/zmq')();

var db = require('nedb');
var Table = require('easy-table');

function Analysis() {
    this.req = zmq.socket('dealer').connect(zmqports.quote[0]);
    this.req.on('message', this.onmessage.bind(this));

    this.securities = new Array();
    this.criterias = arguments[1].map(function(e) { return filter.criterias[e]; });

    var universe = JSON.parse(fs.readFileSync('data/index.dat'));
    var filtered = universe.filter(function(security) { return (security[0] != "" && (security[1] != "" || security[4]=="ETF")); });
    //var filtered = universe.filter(function(security) { return (security[0] == "TSE" && (security[1] != "" || security[4]=="ETF")); });
    //var filtered = universe.filter(function(security) { return (security[2]=="BNS"); });
    total = filtered.length;

    if (arguments[0] == 'intraday') {
        action = 'quote';
    } else {
        action = 'quotes';
        fs.unlinkSync('./data/historical');
    }

    this.intraday = new db({ filename: "./data/intraday", autoload: true });
    this.intraday.ensureIndex({fieldName:'country'});
    this.intraday.ensureIndex({fieldName:'ticker'});
    this.historical = new db({ filename: "./data/historical", autoload: true });
    this.historical.ensureIndex({fieldName:'country'});
    this.historical.ensureIndex({fieldName:'ticker'});

    this.count = 0;
    filtered.forEach((function(s) { 
        var security = new Security(s[2],s[2].replace('-','-P'),s[0],s[3])
        security.sector = s[4]; security.industry = s[5];
        this.req.send(['', JSON.stringify({ action: action, security: security })]);
    }).bind(this));
}

Analysis.prototype.start = function(nCriteria) {
    this.criterias.forEach((function(criteria) {
        console.log('Criteria:',criteria.description);
        var t = new Table();
        this.securities.filter(criteria).forEach(function(s) {
            t.cell('Security', s.name.substr(0,30)+' ('+s.ticker+')');
            t.cell('Exch', s.country=="United States"?'':s.country);
            t.cell('Price', s.price, Table.Number(2));
            t.cell('20p ema', s.indicators['ema20'].slice(-1)[0][1],Table.Number(2));
            t.cell('50p ema', s.indicators['ema50'].slice(-1)[0][1],Table.Number(2));
            t.cell('100p ema', s.indicators['ema100'].slice(-1)[0][1],Table.Number(2));
            t.cell('rsi', s.indicators['rsi'].slice(-1)[0][1],Table.Number(2));
            t.cell('Sector', s.sector.substr(0,20));
            t.newRow();
        });
        t.sort(['rsi']);
        try {this.req.close();} catch(e) {}
        console.log(t.toString());
    }).bind(this));
};

Analysis.prototype.onmessage = function() {
    var s = new Security().consume(JSON.parse(arguments[arguments.length-1]));;
    if (!s.error) {
        s._id = [s.ticker,s.country].join('.');
        this.securities.push(s.trim(252));
        if (process.argv[2]=='historical') this.historical.insert(s.trim(100));
    } else  {
        console.log(s.error);
    }
    if (++this.count == total) {
        switch (process.argv[2])
        {
            case 'historical':
                this.start();
                break;
            case 'intraday':
                this.securities.forEach(function(s,i,a) { 
                    this.historical.findOne({ ticker: s.ticker, country: s.country}, function(err, doc) {
                        if (doc) { doc.indicators["rsi"]=a[i].indicators["rsi"]; a[i].indicators = doc.indicators; a[i].returns = doc.returns; a[i].quotes = doc.quotes; a[i].returns = doc.returns; }
                        if (i==a.length-1) this.start();
                    }.bind(this));
                }.bind(this));
                break;
        }
    } 
}

if (process.argv.length <= 3) {
    console.log('Usage: node analysis intraday/historicals [citerias]');
    process.exit(1);
}
var analysis = new Analysis(process.argv[2], JSON.parse(process.argv[3]));


