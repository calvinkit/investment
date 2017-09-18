var Table = require('easy-table');
var moment = require('moment');
var humanize = require('humanize');
var logger = require('../config/log');
var statistics = require('../util/statistics');
var Indicator = require('../util/indicator');

function Security(ticker, yticker, country, name) {
    this.ticker = (ticker || "");
    this.yticker = (yticker || "");
    this.country = (country || "");
    this.name = (name || "");
    this.exchange = (country || "");
    this.sector = "";
    this.industry = "";
    this.quotes = new Array();
    this.price = 0;
    this.change = 0;
    this.pchange = 0;
    this.error = null;
    this.returns = new Object();
    this.statistics = new Object();
    this.indicators = new Object();
    this.financials = new Array();
    this.holdings = new Array();
}

Security.prototype.consume = function (security) {
    if (security.error) { this.error=security.error; return this; }
    if (this.ticker == "" || security.ticker != "") this.ticker = security.ticker;
    if (this.yticker == "" || security.yticker != "") this.yticker = security.yticker;
    if (this.name == "" || security.name != "") this.name = security.name;
    if (this.country == "" || security.country != "") this.country = security.country;
    if (this.exchange == "" || security.exchange != "") this.exchange = security.exchange;
    if (this.price == 0 || security.price != 0) this.price = security.price;
    if (this.change == 0 || security.change != 0) this.change = security.change;
    if (this.pchange == 0 || security.pchange != 0) this.pchange = security.pchange;
    if (this.sector == "" || security.sector != "") this.sector = security.sector;
    if (this.industry == "" || security.industry != "") this.industry = security.industry;
    if (this.quotes.length <= security.quotes.length) this.quotes = security.quotes;
    if (this.financials.length == 0 || security.financials.length != 0) this.financials = security.financials;
    if (this.holdings.length == 0 || security.holdings.length != 0) this.holdings = security.holdings;
    if (Object.keys(this.returns).length == 0 || Object.keys(security.returns).length != 0) this.returns = security.returns;
    if (Object.keys(this.statistics).length == 0 || Object.keys(security.statistics).length != 0) this.statistics = security.statistics;
    if (Object.keys(this.indicators).length == 0 || Object.keys(security.indicators).length != 0) this.indicators = security.indicators;
    return this;
};

/*
 * Daily Return stores the daily return rate
 * Trailing store the trailing P-day-period return rate
 * Mean stores the average of the last N trailing P-day-period return rate
 * Stdd stores the stddev of the last 252 daily return rate
 */
Security.prototype.calculate = function(P, N) {
    var period = P+"d";
    this.returns[period] = new Array();
    try {
        for (var i=P; i<this.quotes.length; i++) this.returns[period].push([this.quotes[i].date, (this.quotes[i].price/this.quotes[i-P].price-1)]);
        var values = statistics.StripTimeSeries(this.returns[period]).slice(-(N ||252));
        this.statistics[period] = [ 100*statistics.mean(values), Math.sqrt(P)*100*statistics.stdev(values) ];
    } catch (err) {
        throw 'security.calculate: '+err;
    }
    return this;
}

Security.prototype.calculateW = function(P) {
    var daily = this.quotes.map(function(e,i,a) { return [e.date, e.price/a[Math.min(0,i-1)].price-1] }); 
    var weights = new Array(P).map(function(e,i) { return (i+1)*2/P/(1+P); });
    //return daily.map(function(e,i,a) { return 
}


Security.prototype.indicator = function() {
    var indicator = new Indicator(this.quotes);
    this.indicators["obv"] = indicator.OBV();
    this.indicators["rsi"] = indicator.RSI(14);
    this.indicators["pivots"] = indicator.pivots();
    this.indicators["ema10"] = indicator.ema(10);
    this.indicators["ema20"] = indicator.ema(20);
    this.indicators["ema50"] = indicator.ema(50);
    this.indicators["ema100"] = indicator.ema(100);
    this.indicators["ema200"] = indicator.ema(200);
    this.indicators["sma20"] = indicator.sma(20);
    this.indicators["sma50"] = indicator.sma(50);
    this.indicators["sma200"] = indicator.sma(200);
    return this;
}

Security.prototype.show = function(t, bShowCalc, bShowQuotes) {
    t.cell('Ticker',this.ticker);
    //t.cell('Exchange',this.exchange);
    t.cell('Last Price',this.price, Table.Number(2));
    t.cell('Chg(%)',this.pchange, Table.Number(2));
    if (bShowCalc) {
        for (var period in this.statistics) {
            t.cell(period+" mean",this.statistics[period][0], Table.Number(2));
            t.cell(period+" S(%)",this.statistics[period][0]/this.statistics[period][1]*100, Table.Number(2));
        }
    }
    if (bShowQuotes) {
        for (var i=0; i<this.quotes.length && i<10; ++i) {
            process.stdout.write("  "+moment(this.quotes[i]["date"]).format('DD-MMM-YYYY'));
            process.stdout.write(": "+humanize.numberFormat(this.quotes[i]["price"]));
            for (var period in this.returns) {
                if (i <this.returns[period].length) process.stdout.write(" "+period+" "+humanize.numberFormat(100*this.returns[period][i]));
            }
            process.stdout.write("\n");
        }
    }
}

Security.prototype.trim = function(size) {
    this.quotes = this.quotes.slice(-size);
    for (var prop in this.returns) this.returns[prop] = this.returns[prop].slice(-size);
    for (var prop in this.statistics) this.statistics[prop] = this.statistics[prop].slice(-size);
    for (var prop in this.indicators) this.indicators[prop] = this.indicators[prop].slice(-size);
    return this;
}

Security.prototype.getPx = function(date) {
    if (!date) return this.price;
    date = new Date(date).getTime();
    if (this.quotes.length>0 && date < this.quotes[0].date) return this.quotes[0].price;
    if (this.quotes.length>0 && date > this.quotes[this.quotes.length-1].date) return this.quotes[this.quotes.length-1].price;
    var qs = this.quotes.filter(function(e) { return e.date <= date; });
    if (qs.length==0) logger.log('debug','Cannot find price for',this.ticker,'on '+new Date(date).fromGMTDate().toString());
    var px = qs.length==0?this.price:qs[qs.length-1].price;
    return px;
};

module.exports = Security;
