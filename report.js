var zmq = require('zeromq');
var util = require('util');
var humanize = require('humanize');
var Table = require('easy-table');
var Portfolio = require('./lib/portfolio');
var Security = require('./lib/security');
var zmqports = require('./config/zmq')();
var logger = require('./config/log');


// node report PORTFOLIO(2) MODE(3) [BEGIN](4) [END](5)
if (process.argv.length<4) { 
    console.log('node report PORTFOLIO MODE [BEGIN] [END]');
    console.log('mode: 1: taxable gain\n'+
                '      2: portfolio return\n'+
                '      4: security level returns\n'+
                '      8: portfolio transactions\n'+
                '      16: investments periodic return\n'+
                '      32: portfolio periodic performance\n'+
                '      64: portfolio security performance\n'
                );
    process.exit(0);
} 
var portfolioName = process.argv[2];
var mode = process.argv[3];
var BEGIN = new Date('2000-01-01').toGMTDate();
var begin = process.argv[4]?new Date(process.argv[4]):BEGIN;
var end = process.argv[5]?new Date(process.argv[5]):null;

var portfolio = new Portfolio(portfolioName, begin, end);
var p_req = zmq.socket('dealer');
p_req.identity = parseInt(new Date().getTime()).toString()+String.fromCharCode(32+parseInt(Math.random()*40));
p_req.connect(zmqports.portfolio[0]);
p_req.on('message', onmessage);
p_req.send(['',JSON.stringify({ action: 'get', portfolioName: portfolio.name, begin:portfolio.begin, end: portfolio.end })]);
show();

function onmessage( portfolioName, investment ) {
    portfolioName = portfolioName.toString();
    investment = JSON.parse(investment);
    if (!portfolio.investments[investment.security.ticker].received || Math.abs(portfolio.investments[investment.security.ticker].transactions.pos) < 1) {
        portfolio.investments[investment.security.ticker].consume(investment);
        portfolio.investments[investment.security.ticker].received = true;
        show();
    } 
}

// 1: taxable gain
// 2: portfolio return
// 4: security level returns
// 8: portfolio transactions
// 16: investments period returns
// 32: portfolio period returns
function show() {
    for (var ticker in portfolio.investments) logger.log('verbose',util.inspect({ ticker:ticker,
                                                                     'isClosed':portfolio.investments[ticker].isClosed(portfolio.begin,portfolio.end),
                                                                     'received':portfolio.investments[ticker].received }));
    //for (var ticker in portfolio.investments) if (!portfolio.investments[ticker].isClosed(portfolio.begin,portfolio.end) && !portfolio.investments[ticker].received) return;
    for (var ticker in portfolio.investments) if (!portfolio.investments[ticker].received) return;
    try { p_req.close(); } catch(e) {};

    for (var ticker in portfolio.investments) portfolio.investments[ticker].calculate(portfolio);
    portfolio.calculate();

    // show taxable gain
    if ((parseInt(process.argv[3]) & 1) > 0) {
        var year = 2016;
        console.log(year+" Taxable Gain");
        var t = new Table();
        portfolio.taxable(year, t);
        console.log(t.toString());
    }

    // show portfolio return
    if ((parseInt(process.argv[3]) & 2) > 0) {
        console.log("Portfolio Pnl between "+new Date(portfolio.transactions.transactions[0].date).toDateString()+' till '+new Date(portfolio.transactions.transactions[portfolio.transactions.transactions.length-1]).toDateString());
        var t = new Table();
        portfolio.show(t, null);
        console.log(t.toString());
    }

    // show Investments returns
    if ((parseInt(process.argv[3]) & 4) > 0) {
        var t = new Table();
        for (var ticker in portfolio.investments) if (!portfolio.investments[ticker].isClosed(portfolio.begin,portfolio.end)) portfolio.investments[ticker].show(t,null);
        if (begin != BEGIN) {t.sort(['Current Pnl|des'])} else {t.sort(['Daily Pnl|des']);}
        t.total('Daily Pnl', { printer: Table.Thousand(0) });
        t.total('Current Pnl', { printer: Table.Thousand(0)});
        t.total('Total Pnl', { printer: Table.Thousand(0)});
        console.log(t.toString());
    }

    // portfolio transactions 
    if ((parseInt(process.argv[3]) & 8) > 0) {
        console.log("Transactions since "+new Date(portfolio.transactions.transactions[0].date).toDateString());
        var t = new Table();
        portfolio.show(null, t);
        console.log(t.toString());
    }

    // Calculate investment level periodic return, every 3m
    var t = new Table();
    var t2 = new Table();
    if ((parseInt(process.argv[3]) & 16) > 0) {
        var t = new Table();
        var begin = new Date(portfolio.begin).fromGMTDate();
        var today = portfolio.end?new Date(portfolio.end).fromGMTDate():new Date();
        for (var end = begin.add(3,'M'); end <= today; ) {
            var yields = {};
            for (var ticker in portfolio.investments) {
                var investment = portfolio.investments[ticker];
                yields[ticker] = investment.periodReturn(begin,end);
            }
            t.cell('Begin',begin.toString());
            t.cell('End',end.toString());
            for (var ticker in portfolio.investments) t.cell(ticker, yields[ticker], Table.Number(2));
            t.newRow();
            begin = begin.add(3,'M'); 
            end = begin.add(3,'M');
        }
        console.log(t.toString());
    }

    // Calculate portfolio periodic return, every 3m
    var t = new Table();
    var t2 = new Table();
    if ((parseInt(process.argv[3]) & 32) > 0) {
        var t = new Table();
        var begin = new Date(portfolio.begin).fromGMTDate();
        var today = portfolio.end?new Date(portfolio.end).fromGMTDate():new Date();
        for (var end = begin.add(3,'M'); end <= today; ) {
            portfolio.periodReturn(begin,end,t,t2);
            begin = begin.add(3,'M'); 
            end = begin.add(3,'M');
        }
        console.log(t.toString());
    }

    // Calculate security periodic return, every 3m
    var t = new Table();
    if ((parseInt(process.argv[3]) & 64) > 0) {
        var t = new Table();
        var begin = new Date(portfolio.begin).fromGMTDate();
        var today = portfolio.end?new Date(portfolio.end).fromGMTDate():new Date();
        var results = {};
        for (var end = begin.add(3,'M'); end <= today; ) {
            var yields = {};
            for (var ticker in portfolio.investments) {
                var investment = portfolio.investments[ticker];
                results[ticker] = investment.security.performance(begin,end);
            }
            t.cell('Begin',begin.toString());
            t.cell('End',end.toString());
            for (var ticker in portfolio.investments) t.cell(ticker, results[ticker].ret*100/results[ticker].vol, Table.Number(2));
            t.newRow();
            begin = begin.add(3,'M'); 
            end = begin.add(3,'M');
        }
        console.log(t.toString());
    }
}

function Report() { this.collection = new Array(); this.data = new Object(); }
Report.prototype.toString = function() { return ""; };
Report.prototype.cell = function(header,value,opt) { this.data[header] = value; console.log(header, value); };
Report.prototype.newRow = function() { this.collection.push(this.data); this.data = new Object(); };
Report.prototype.sort = Report.prototype.total = function() {};
