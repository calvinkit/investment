var Portfolio = require('../lib/portfolio');
var Security = require('../lib/security');
var logger = require('../config/log');
var zmqports = require('../config/zmq')();
var fs = require('fs');
var zmq = require('zeromq');
var util = require('util');
var humanize = require('humanize');
var Table = require('easy-table');


function toPortfolio() {
    var universe = JSON.parse(String(fs.readFileSync('universe.dat')));
    var portfolio = new Portfolio('EMPTY');
    universe.filter(function(e) {
        return e[1] != "";
    }).forEach(function(e) {
        var security = new Security(e[2], e[2], e[0], e[3]);
        portfolio.add(security, new Date('2010-01-01').fromGMTDate(), 1, 1, 0);
    });
    portfolio.write();
}

toPortfolio();
