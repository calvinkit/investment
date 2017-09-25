var zmq = require('zeromq');
var fs = require('fs');
var zmqports = require('./config/zmq');
var logger = require('./config/log');
var Security = require('./lib/security');
var stat = require('./util/statistics');
var data = JSON.parse(fs.readFileSync('data/index.dat','utf8'));

function SectorAnalysis_Handler() {
}

SectorAnalysis_Handler.prototype.handle = function() {
    var that = this;
    this.count = 0;
    this.securities = new Array();
    this.req = zmq.socket('dealer').connect(zmqports.quote[0]);
    this.req.on('message', (function() {
        var security = new Security().consume(JSON.parse(arguments[arguments.length-1]));
        onsecurity.apply(this, [security.calculate(20)]);
    }).bind(that));

    var filtered = data.filter((function(row) { return row[2] == this.country && row[4] == this.sector && (!this.indexed || row[3] != ""); }).bind(this));
    for (var i=0; i<filtered.length; i++) {
        if (filtered[i][0] != '') {
            this.req.send(['', JSON.stringify({ action: 'quotes', security: new Security(filtered[i][1], filtered[i][1]+'.TO', filtered[i][0]) })]);
            this.count++;
        }
    }
}

function onsecurity(security) {
    if (security.dailyReturn.length >= 252) {
        this.securities.push([security, security.dailyReturn.slice(0, 252)]);
    } else {
        logger.log('verbose','Skipping '+security.ticker);
    }
    if (--this.count == 0) {
        this.securities.sort(function(a,b) { return (a[0].ticker < b[0].ticker?-1:1); });
        var corr = stat.correlationMatrix(this.securities.map(function(e) { return e[1]; }));
        this.res.json({securities: this.securities.map(function(e) { return e[0]; }), corr: corr });
    }
}

module.exports = SectorAnalysis_Handler;
