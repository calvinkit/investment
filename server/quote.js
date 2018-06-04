var zmq = require('zeromq');
var httpProxyAgent = require('http-proxy-agent');
var httpsProxyAgent = require('https-proxy-agent');
var csv2array = require('csv2array');
var moment = require('moment');
var logger = require('../config/log');
var Security = require('../lib/security');
var zmqports = require('../config/zmq')(false);
var Google = require('./google');
var Quotes = require('finance-quotes');
var Indicator = require('../util/indicator');
var util = require('util');

var obj = require('url').parse(process.env.HTTP_PROXY);
obj.rejectUnauthorized = false;
var httpAgent = process.env.HTTP_PROXY?new httpProxyAgent(obj):null;
var httpsAgent = process.env.HTTP_PROXY?new httpsProxyAgent(obj):null;

var cache = {};

function QuoteServer() {
    logger.log('info','QuoteServer ('+process.pid+') running in '+(process.env.HTTP_PROXY?"Proxy":"Direct")+" mode on "+zmqports.quote[1]);
    this.fromDate = moment(new Date());
    this.fromDate.subtract(4, 'years');
    this.response = zmq.socket('rep').connect(zmqports.quote[1]);
    this.securities = new Object();

    this.alpha =        new Quotes.alphavantage(httpsAgent, process.env.ALPHAVANTAGE);
    this.quandl =       new Quotes.quandl(httpsAgent, process.env.QUANDL);
    this.cnbc =         new Quotes.cnbc(httpsAgent);
    this.morningstar =  new Quotes.morningstar(httpAgent);
    this.yahoo =        new Quotes.yahoo(httpsAgent);

    this.response.on('message', (function(msg) {
        msg = JSON.parse(msg);
        security = new Security().consume(msg.security);
        logger.log('info','QuoteServer('+process.pid+'): Received '+msg.action+' request on '+security.ticker,'@',new Date().toLocaleTimeString());
        switch (msg.action) {
            case 'subscribe':
                if (!this.securities[security.ticker]) this.securities[security.ticker] = { security: security, count: 0 };
                this.securities[security.ticker].count++;
                this.getPrice(this.securities[security.ticker].security);
                break;

            case 'unsubscribe':
                if (!this.securities[security.ticker]) this.securities[security.ticker] = { security: security, count: 0 };
                if (--this.securities[security.ticker].count <= 0) delete this.securities[security.ticker];
                break;

            case 'quote':
                this.getPrice(security);
                break;

            case 'quotes':
                this.getHistory(security);
                break;

            case 'financials':
                this.getFinancials(security);
                break;

            case 'intraday':
                this.getHistory(security);
                break;

            case 'futures':
                var server = this;
                logger.log('verbose','QuoteServer.futures on',security.ticker);
                server.cnbc.getprice(security, 
                                    (function(s) { this.response.send(JSON.stringify(s)); }).bind(server), 
                                    (function(s) { this.response.send(JSON.stringify(s)); }).bind(server));
                break;

            case 'quandl':
                var server = this;
                logger.log('verbose','QuoteServer.quandl on',security.ticker);
                logger.log('info','QuoteServer Received Quandl timeseries request on '+security.ticker,'@',new Date().toLocaleTimeString());
                server.quandl.timeseries(security, 
                                         (function(s) { this.response.send(JSON.stringify(s)); }).bind(server), 
                                         (function(s) { this.response.send(JSON.stringify(s)); }).bind(server));
                break;
        }
    }).bind(this));
}


QuoteServer.prototype.getFinancials = function(security) {
    var onsuccess = (s) => { logger.log('verbose','QuoteServer.getFinancials onsuccess', s.ticker); this.getHistory(s); }
    var onerror = (s, err) => { logger.log('error', 'QuoteServer.getFinancials onerror', err); this.getHistory(s); };
    logger.log('verbose','QuoteServer.getFinancials on',security.ticker);
    if (security.country == "EXPIRED") return onsuccess(security);
    this.morningstar.getprice(security, onsuccess, onerror);
};

QuoteServer.prototype.getHistory = function(security) {
    var server = this;
    var onsuccess = (s) => {
        logger.log('verbose','QuoteServer.getHistory onsuccess', s.ticker); 
        cache[s.ticker+s.country]=s; 
        if (s.country!='EXPIRED'&&s.quotes.length==0) logger.log('error',s.ticker+':'+s.country,'has empty history');
        this.getPrice(s); 
    };
    var onerror = (s, err) => { logger.log('error','QuoteServer.getHistory onerror:', err.message); this.getPrice(s); };
    logger.log('verbose','QuoteServer.getHistory on',security.ticker);
    if (security.country == "EXPIRED") return onsuccess(security);
    if (cache[security.ticker+security.country]) { this.getPrice(cache[security.ticker+security.country]); return; }
    try {
        logger.log('verbose','QuoteServer.getHistory link '+this.alpha.buildHistoryURL(security));
        this.alpha.gethistory(security, onsuccess, onerror);
    } catch (err) {
        onerror(security, err);
    }
};

QuoteServer.prototype.getPrice = function(security) {
    var onsuccess = (s) => { 
        logger.log('verbose','QuoteServer.getPrice onsuccess', s.ticker); 
        s.indicator = new Indicator(s.quotes);
        s.calculate(1).calculate(10).calculate(20).calculate(14).calculate(50).calculate(100).calculate(200).calcIndicators();
        this.response.send(JSON.stringify(s)); 
    };
    var onerror = (s, err) => { 
        logger.log('error','QuoteServer.getPrice onerror:', err.message); 
        s.indicator = new Indicator(s.quotes);
        s.calculate(1).calculate(10).calculate(20).calculate(14).calculate(50).calculate(100).calculate(200).calcIndicators();
        this.response.send(JSON.stringify(s)); 
    };
    logger.log('verbose','QuoteServer.getPrice on',security.ticker);
    if (security.country == "EXPIRED") return onsuccess(security);
    try {
        logger.log('verbose','QuoteServer.getPrice link '+this.cnbc.buildPriceURL(security));
        this.cnbc.getprice(security, onsuccess, onerror);
    } catch (err) {
        onerror(security, err);
    }
};


QuoteServer.prototype.close = function() {
    this.securities = new Object();
    this.response.close();
};

process.on('uncaughtException', function(err) { logger.log('error', util.inspect(err)); });
process.on('exit', function(err) { logger.log('info','QuoteServer ('+process.id+') exiting...'); });
process.on('SIGINT', function(err) { logger.log('info','QuoteServer ('+process.id+') exiting...'); });
module.exports = new QuoteServer;
