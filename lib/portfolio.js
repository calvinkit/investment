var Table = require('easy-table');
var csv2array = require('csv2array');
var humanize = require('humanize');
var moment = require('moment');
var Investment = require('./investment');
var Security = require('./security');
var Transactions = require('./transactions');
var logger = require('../config/log');
var fs = require('fs');

// begin/end time in GMT
function Portfolio(name, begin, end) {
    this.name = name;
    this.investments = new Object();
    this.transactions = new Transactions();
    this.begin = begin?new Date(begin).getTime():0;
    this.end = end?new Date(end).getTime():null;
    this.dailyPnl = 0;
    try {
        if (name == "Overall") {
            this.read(__dirname+'/../portfolios/RRSP.csv');
            this.read(__dirname+'/../portfolios/TFSA.csv');
            this.read(__dirname+'/../portfolios/Margin.csv');
            this.read(__dirname+'/../portfolios/Marcus.csv');
            this.read(__dirname+'/../portfolios/Benjamin.csv');
            this.read(__dirname+'/../portfolios/Tania.csv');
        } else if (name == "Calvin") {
            this.read(__dirname+'/../portfolios/RRSP.csv');
            this.read(__dirname+'/../portfolios/TFSA.csv');
            this.read(__dirname+'/../portfolios/Margin.csv');
            this.read(__dirname+'/../portfolios/Marcus.csv');
            this.read(__dirname+'/../portfolios/Benjamin.csv');
        } else if (name == 'EMPTY') {
        } else {
            this.read(__dirname+'/../portfolios/'+name+'.csv');
        }
    } catch (ex) {
        throw "Portfolio "+name+" doesn't exist";
    }
};

Portfolio.prototype.add = function(security, transdate, shares, px, brokage) {
    if (typeof this.investments[security.ticker] == 'undefined') this.investments[security.ticker] = new Investment(security);
    this.investments[security.ticker].add(transdate.getTime(), shares, px, brokage);
    return this;
};

Portfolio.prototype.read = function(filename) {
    if (fs.existsSync(filename)) {
        var s = fs.readFileSync(filename,'utf8');
        var data = csv2array(s);
        for (var i=1; i<data.length; ++i) {
            var ticker = data[i][0]; if (ticker ==  "") continue;
            var country = data[i][2];
            var yticker = data[i][7];
            var shares = (data[i][3]=="Buy"?1:-1) * parseFloat(data[i][5]);
            var px = parseFloat(data[i][6]);
            var transdate = new Date(data[i][4]);
            var brokage = parseFloat(data[i][8]==''?0:data[i][8]);
            if (typeof this.investments[ticker] == 'undefined') this.investments[ticker] = new Investment(new Security(ticker, yticker, country, data[i][1]));
            this.investments[ticker].add(transdate.getTime(), shares, px, brokage);
        }
    }
};

Portfolio.prototype.write = function() {
    console.log('Symbol,Name,Country,Type,Date,Shares,Price,Yahoo Ticker,Commission');
    for (var ticker in this.investments) {
        var investment = this.investments[ticker];
        var name = investment.security.name;
        var country = investment.security.country;
        var yticker = investment.security.yticker;
        for (var i=0; i<investment.transactions.transactions.length; i++) {
            var trans = investment.transactions.transactions[i];
            var buysell = trans.qty<0?'Sell':'Buy';
            var qty = Math.abs(trans.qty);
            var px = trans.px;
            var transdate = new Date(trans.date).fromGMTDate();
            var brokage = trans.brokage;
            console.log([ticker,name,country,buysell,moment(transdate).format('DD-MMM-YYYY'),qty,px,yticker,brokage].join(','));
        }
    }
};

Portfolio.prototype.consume = function(portfolio) {
    this.investments = new Investment().consume(portfolio.investments);
    this.transactions = new Transactions().consume(portfolio.transactions);
    this.begin = portfolio.being;
    this.end = portfolio.end;
    this.dailyPnl = portfolio.dailyPnl;
    return this;
};

Portfolio.prototype.show = function (t, trans_table) {

    if (t) {
        t.cell('Name',this.name);
        t.cell('Daily Pnl',this.dailyPnl, Table.Thousand());
        t.cell('Current Pnl',this.transactions.pnl, Table.Thousand());
        t.cell('Total Pnl',this.transactions.totalPnl, Table.Thousand());
        t.cell('Total Return',this.transactions.totalReturn, Table.Number(2));
        t.cell('Yield',this.yield, Table.Number(2));
        t.newRow();
    }

    if (trans_table) this.transactions.show(trans_table);
};

Portfolio.prototype.calculate = function() {
    this.dailyPnl = this.totalPnl = 0;
    for (var ticker in this.investments) {
        var investment = this.investments[ticker];
        this.dailyPnl += investment.dailyPnl;
    }
    this.transactions.calculate(0);
    this.yield = this.transactions.yield();
    return this;
};

Portfolio.prototype.size = function() {
    var size = 0;
    for (var key in this.investments) if (this.investments.hasOwnProperty(key)) size++;
    return size;
};

Portfolio.prototype.taxable = function(year, t) {
    var taxableGain = 0;
    for (var ticker in this.investments) {
        var investment = this.investments[ticker];
        investment.transactions.transactions.forEach(function(trans) {
            if (new Date(trans["date"]).getFullYear() == year && trans["pnl"] != 0) {
                taxableGain += trans["pnl"];
                t.cell('Name', investment.security.ticker);
                t.cell('Date', moment(new Date(trans["date"]).fromGMTDate()).format("DD-MMM-YY"));
                t.cell('Realized Pnl', trans["pnl"], Table.Thousand(0));
                t.newRow();
            }
        });
    }
    return taxableGain;
};

Portfolio.prototype.valueAt = function(date) {
    var ret = 0;
    for (var ticker in this.investments) {
        var investment = this.investments[ticker];
        ret +=investment.valueAt(date);
    }
    return ret;
};

Portfolio.prototype.getPx = function(date) {
    var pos = 0;
    for (var ticker in this.investments) pos += this.investments[ticker].position(date);
    var value = this.valueAt(date);
    if (pos!=0) return value/pos;
    return 0;
};

Portfolio.prototype.periodReturn = function(start, end, t, t2) {
    var ret = 0;
    var trans = this.transactions.truncate(start,this.getPx(start),end,this.getPx(end));
    var yield = trans.yield();
    if (t) {
        t.cell('Begin', start.toString());
        t.cell('End', end.toString());
        t.cell('Return', yield, Table.Number(2));
        t.cell('Value', this.valueAt(end), Table.Thousand(0));
        t.newRow()
        if (t2) trans.show(t2);
    }
    return yield;
};

module.exports = Portfolio;
