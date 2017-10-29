var Portfolio = require('../lib/portfolio');
var Security = require('../lib/security');
var logger = require('../config/log');
var zmqports = require('../config/zmq')();
var zmq = require('zeromq');
var util = require('util');
var humanize = require('humanize');
var Table = require('easy-table');

var portfolio = new Portfolio('Watch');
var p_req = zmq.socket('dealer');
p_req.identity = parseInt(new Date().getTime()).toString()+String.fromCharCode(32+parseInt(Math.random()*40));
p_req.connect(zmqports.portfolio[0]);
p_req.on('message', onmessage);
p_req.send(['',JSON.stringify({ action: 'get', portfolioName: portfolio.name, begin:null, end:null })]);

var Engine = require('tingodb')();
var db = new Engine.Db('./', {});
var collection = db.collection("stocks");

function onmessage( portfolioName, investment ) {
    portfolioName = portfolioName.toString();
    investment = JSON.parse(investment);
    if (!portfolio.investments[investment.security.ticker].received || Math.abs(portfolio.investments[investment.security.ticker].transactions.pos) < 1) {
        portfolio.investments[investment.security.ticker].consume(investment);
        portfolio.investments[investment.security.ticker].received = true;
        collection.update({ticker: investment.security.ticker}, investment.security, {upsert:true, w:1}, function(err, result) { console.log(err, result)});
        show();
    } 
}

function show() {
    for (var ticker in portfolio.investments) if (!portfolio.investments[ticker].received) return;
    try { p_req.close(); } catch(e) {};
    console.log('done');
}



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
