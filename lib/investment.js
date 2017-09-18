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
    return !((begin && end && this.transactions.transactions.filter(function(e){return e.date>=begin&&e.date<=end}).length!=0)
           || Math.abs(this.transactions.pos)>0.5
           || (this.transactions.transactions.filter(function(e){return e.date>=begin}).length>0&&Math.abs(this.transactions.pos)>0.5));
};

Investment.prototype.calculate = function(portfolio) {
    this.dailyPnl = this.transactions.pos*(this.security.change);
    // zero out ending position
    var trans = this.transactions.truncate(portfolio.begin,this.security.getPx(portfolio.begin),portfolio.end?portfolio.end:new Date().toGMTDate(),this.security.getPx(portfolio.end?portfolio.end:new Date().toGMTDate()));
    this.yield = trans.yield();
    portfolio.transactions.concat(trans, this.security.ticker);
    // real transactions
    this.transactions = this.transactions.truncate(portfolio.begin,this.security.getPx(portfolio.begin),portfolio.end,this.security.getPx(portfolio.end));
    return this.transactions.calculate(this.security.getPx(portfolio.end));
}

Investment.prototype.show = function(t, trans_table) {
    var ticker = this.security.ticker;
    if (t) {
        this.security.show(t);
        t.cell('Pos',this.transactions.pos, Table.Thousand(0));
        t.cell('Daily Pnl',this.dailyPnl, Table.Thousand());
        t.cell('Current Pnl',this.transactions.pnl, Table.Thousand());
        t.cell('Total Pnl',this.transactions.totalPnl, Table.Thousand());
        t.cell('Total Return',this.transactions.totalReturn, Table.Number(2));
        t.cell('Yield',this.yield, Table.Number(2));
        t.cell('Avg Cost',this.transactions.avgCost, Table.Number(2));
        t.newRow();
    }

    if (trans_table) this.transactions.show(trans_table);
}

Investment.prototype.consume = function (investment) {
    this.security = new Security().consume(investment.security);
    this.transactions = new Transactions().consume(investment.transactions);
    this.pnl = investment.pnl;
    return this;
};

module.exports = Investment;
