var zmq = require('zeromq');
var httpProxyAgent = require('http-proxy-agent');
var httpsProxyAgent = require('https-proxy-agent');
var csv2array = require('csv2array');
var moment = require('moment');
var logger = require('../config/log');
var Security = require('../lib/security');
var zmqports = require('../config/zmq')(false);
var Google = require('./google');
var Yahoo = require('./yahoo');
var AlphaVantage = require('./alphavantage');
var Morningstar = require('./morningstar');
var Quandl = require('./quandl');
var CNBC = require('./cnbc');
var Indicator = require('../util/indicator');

function QuoteServer() {
    logger.log('info','QuoteServer ('+process.pid+') running in '+(process.env.HTTP_PROXY?"Proxy":"Direct")+" mode on "+zmqports.quote[1]);
    this.fromDate = moment(new Date());
    this.fromDate.subtract(4, 'years');
    this.response = zmq.socket('rep').connect(zmqports.quote[1]);
    this.securities = new Object();
    this.agent = process.env.HTTP_PROXY?new httpProxyAgent(process.env.HTTP_PROXY):null;
    this.google = new Google(this.agent);
    this.morningstar = new Morningstar(this.agent);
    this.alpha = new AlphaVantage(process.env.HTTP_PROXY?new httpsProxyAgent(process.env.HTTP_PROXY):null);
    this.quandl = new Quandl(process.env.HTTP_PROXY?new httpsProxyAgent(process.env.HTTP_PROXY):null);
    this.cnbc = new CNBC(process.env.HTTP_PROXY?new httpsProxyAgent(process.env.HTTP_PROXY):null);
    this.yahoo = new Yahoo(process.env.HTTP_PROXY?new httpsProxyAgent(process.env.HTTP_PROXY):null);


    //this.response.on('disconnect', function() { console.log(arguments); });
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

            case 'detail':
                this.getDetail(security);
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

QuoteServer.prototype.getDetail = function(security) {
    var server = this;
    var onsuccess = (function(s) { this.getHistory(s); }).bind(server);
    var onerror = (function(s) { this.getHistory(s); }).bind(server);
    logger.log('verbose','QuoteServer.getDetail on',security.ticker);
    if (security.country == "EXPIRED") { onsuccess(security); return; }
    server.yahoo.getdetails(security, onsuccess, onerror);
};

QuoteServer.prototype.getFinancials = function(security) {
    var server = this;
    var onsuccess = (function(s) { this.getDetail(s); }).bind(server);
    var onerror = (function(s) { this.getDetail(s); }).bind(server);
    logger.log('verbose','QuoteServer.getFinancials on',security.ticker);
    if (security.country == "EXPIRED") { onsuccess(security); return; }
    server.morningstar.getfinancials(security, onsuccess, onerror);
};

var cache = {};
QuoteServer.prototype.getHistory = function(security) {
    var server = this;
    var onsuccess = (function(s) {
        logger.log('verbose','QuoteServer.getHistory onsuccess'); 
        cache[s.ticker+s.country]=s; 
        if (s.country!='EXPIRED'&&s.quotes.length==0) logger.log('error',s.ticker+':'+s.country,'has empty history');
        this.getPrice(s); 
    }).bind(server);
    var onerror = (function(s) {
        logger.log('error','QuoteServer.getHistory onerror'); 
        this.getPrice(s); 
    }).bind(server);

    logger.log('verbose','QuoteServer.getHistory on',security.ticker);

    if (security.country == "EXPIRED") { onsuccess(security); return; }

    var handler = security.ticker=='XSP'?server.alpha:server.google;
    // Should I actually cache the result...per node
    if (cache[security.ticker+security.country]) { this.getPrice(cache[security.ticker+security.country]); return; }
    handler.gethistory(security, false, onsuccess, onerror);
};

QuoteServer.prototype.getPrice = function(security) {
    var server = this;
    var onsuccess = (function(s) { 
        logger.log('verbose','QuoteServer.getPrice onsuccess'); 
        s.indicator = new Indicator(s.quotes);
        s.calculate(1).calculate(10).calculate(20).calculate(14).calculate(50).calculate(100).calculate(200).calcIndicators();
        this.response.send(JSON.stringify(s)); 
    }).bind(server);
    var onerror = (function(s) { 
        logger.log('error','QuoteServer.getPrice onerror'); 
        s.indicator = new Indicator(s.quotes);
        s.calculate(1).calculate(10).calculate(20).calculate(14).calculate(50).calculate(100).calculate(200).calcIndicators();
        this.response.send(JSON.stringify(s)); 
    }).bind(server);
    logger.log('verbose','QuoteServer.getPrice on',security.ticker);
    if (security.country == "EXPIRED") { onsuccess(security); return; }
    server.google.getprice(security, onsuccess, onerror);
};


QuoteServer.prototype.close = function() {
    this.securities = new Object();
    this.response.close();
};

process.on('uncaughtException', function(err) { logger.log('error','Uncaught Exception '+err); });
process.on('exit', function(err) { logger.log('info','QuoteServer ('+process.id+') exiting...'); });
process.on('SIGINT', function(err) { logger.log('info','QuoteServer ('+process.id+') exiting...'); });
module.exports = new QuoteServer;
