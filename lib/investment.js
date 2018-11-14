var util = require('util');
var Table = require('easy-table');
var moment = require('moment');
var humanize = require('humanize');
var colors = require('colors');
var logger = require('../config/log');
var Security = require('./security');
var Transactions = require('./transactions');

function Investment (security) {
    this.security = security;
    this.transactions = new Transactions();
    this.dailyPnl = 0;
}

Investment.prototype.add = function(date, pos, px, brokage) {
    this.transactions.add(date, pos, px, brokage);
};

// If no transactions within begin/end, it is considered as closed
Investment.prototype.isClosed = function(begin,end) {
    return this.transactions.isClosed(begin,end);
};

Investment.prototype.valueAt = function(date) {
    var pos = this.transactions.position(date);
    return pos * this.security.getPx(date);
};

Investment.prototype.position = function(date) { 
    return this.transactions.position(date);
};

Investment.prototype.calculate = function(portfolio) {
    this.dailyPnl = this.transactions.pos*(this.security.change);
    // zero out ending position
    var trans = this.transactions.truncate(portfolio.begin,
                                           this.security.getPx(portfolio.begin),
                                           portfolio.end?portfolio.end:new Date().toGMTDate(),
                                           this.security.getPx(portfolio.end?portfolio.end:new Date().toGMTDate()));
    this.yield = trans.yield();
    portfolio.transactions.concat(trans, this.security.ticker);
    // real transactions
    this.transactions = this.transactions.truncate(portfolio.begin,
                                                   this.security.getPx(portfolio.begin),
                                                   portfolio.end,
                                                   this.security.getPx(portfolio.end));
    return this.transactions.calculate(this.security.getPx(portfolio.end));
}

Investment.prototype.show = function(t, trans_table) {
    var ticker = this.security.ticker;
    if (t) {
        this.security.show(t);
        t.cell('Pos',this.transactions.pos, Table.number(0));
        t.cell('Daily Pnl',this.dailyPnl, Table.number(0));
        t.cell('Current Pnl',this.transactions.pnl, Table.number(0));
        t.cell('Total Pnl',this.transactions.totalPnl, Table.number(0));
        t.cell('Total Return',this.transactions.totalReturn, Table.number(2));
        t.cell('Yield',this.yield, Table.number(2));
        t.cell('Avg Cost',this.transactions.avgCost, Table.number(2));
        t.newRow();
    }

    if (trans_table) this.transactions.show(trans_table);
}

Investment.prototype.periodReturn = function(start, end, t, t2) {
    var ret = 0;
    var yield = 0;
    var trans = this.transactions.truncate(start,this.security.getPx(start),end,this.security.getPx(end));
    
    if (!trans.isClosed(start, end)) yield = trans.yield();
    if (t) {
        t.cell('Begin', start.toString());
        t.cell('End', end.toString());
        t.cell('Return', yield, Table.Number(2));
        t.newRow()
        if (t2) trans.show(t2);
    }
    return yield;
};

Investment.prototype.consume = function (investment) {
    this.security = new Security().consume(investment.security);
    this.transactions = new Transactions().consume(investment.transactions);
    this.pnl = investment.pnl;
    return this;
};

module.exports = Investment;
