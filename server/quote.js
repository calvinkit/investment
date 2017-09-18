var zmq = require('zeromq');
var http = require('follow-redirects').http;
var https = require('follow-redirects').https;
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

function QuoteServer() {
    logger.log('info','QuoteServer ('+process.pid+') Started');
    this.fromDate = moment(new Date());
    this.fromDate.subtract(4, 'years');
    this.response = zmq.socket('rep').connect(zmqports.quote[1]);
    this.securities = new Object();
    this.agent = new httpProxyAgent(process.env.HTTP_PROXY);
    this.google = new Google(this.agent);
    this.morningstar = new Morningstar(this.agent);
    this.alpha = new AlphaVantage(new httpsProxyAgent(process.env.HTTP_PROXY));
    this.quandl = new Quandl(new httpsProxyAgent(process.env.HTTP_PROXY));
    this.cnbc = new CNBC(new httpsProxyAgent(process.env.HTTP_PROXY));
    this.yahoo = new Yahoo(new httpsProxyAgent(process.env.HTTP_PROXY));


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
                this.google_gethistory(security, true);
                break;

            case 'futures':
                var server = this;
                logger.log('debug','QuoteServer.futures on',security.ticker);
                server.cnbc.getprice(security, 
                                    (function(s) { this.response.send(JSON.stringify(s)); }).bind(server), 
                                    (function(s) { this.response.send(JSON.stringify(s)); }).bind(server));
                break;

            case 'quandl':
                var server = this;
                logger.log('debug','QuoteServer.quandl on',security.ticker);
                server.quandl.timeseries(security, 
                                         (function(s) { this.response.send(JSON.stringify(s)); }).bind(server), 
                                         (function(s) { this.response.send(JSON.stringify(s)); }).bind(server));
                break;
        }
    }).bind(this));

    logger.log('debug',"QuoteServer running in "+(process.env.HTTP_PROXY?"Proxy":"Direct")+" mode on "+zmqports.quote[1]);
}


QuoteServer.prototype.getPrice = function(security) {
    var server = this;
    logger.log('debug','QuoteServer.getPrice on',security.ticker);
    server.google.getprice(security, 
                           (function(s) { this.response.send(JSON.stringify(s)); }).bind(server), 
                           (function(s) { this.response.send(JSON.stringify(s)); }).bind(server));
};

QuoteServer.prototype.getHistory = function(security) {
    var server = this;
    logger.log('debug','QuoteServer.getHistory on',security.ticker);
    server.google.gethistory(security, false,
                             (function(s) { this.getPrice(s); }).bind(server), 
                             (function(s) { this.getPrice(s); }).bind(server));
};

QuoteServer.prototype.getDetail = function(security) {
    var server = this;
    logger.log('debug','QuoteServer.getDetail on',security.ticker);
    server.yahoo.getdetails(security, 
                            (function(s) { this.getHistory(s); }).bind(server), 
                            (function(s) { this.getHistory(s); }).bind(server));
};

QuoteServer.prototype.getFinancials = function(security) {
    var server = this;
    logger.log('debug','QuoteServer.getFinancials on',security.ticker);
    server.morningstar.getfinancials(security,
                                     (function(s) { this.getDetail(s); }).bind(server), 
                                     (function(s) { this.getDetail(s); }).bind(server));
};

QuoteServer.prototype.close = function() {
    this.securities = new Object();
    this.response.close();
};

process.on('uncaughtException', function(err) { logger.log('error','Uncaught Exception '+err); });

module.exports = new QuoteServer;
