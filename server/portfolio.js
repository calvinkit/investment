var zmq = require('zeromq');
var csv2array = require('csv2array');
var logger = require('../config/log');
var Security = require('../lib/security');
var Investment = require('../lib/investment');
var Portfolio = require('../lib/portfolio');
var zmqports = require('../config/zmq')();


function PortfolioServer() {
    logger.log('info','PortfolioServer Started on '+zmqports.portfolio[1]);
    this.response = zmq.socket('router').bindSync(zmqports.portfolio[1]);
    this.subscribers = {};

    this.response.on('disconnect', function() { logger.log('info','PortfolioServer.disconnect', arguments); });

    this.response.on('message', (function(identity, empty, request) {
        identity = identity.toString();
        request = JSON.parse(request);
        portfolioName = request.portfolioName;
        switch (request.action) {
        case 'subscribe':
            logger.log('info','PortfolioServer.Subscribing '+portfolioName+' from '+identity);
            if (!this.subscribers[identity]) this.subscribers[identity]= []; 
            var portfolio = new Portfolio(portfolioName, request.since);
            this.subscribers[identity].push(portfolio);
            this.activitate(portfolio, identity, true);
            break;
        case 'unsubscribe':
            logger.log('info','PortfolioServer.Unsubscribing '+identity);
            if (this.subscribers[identity]) this.subscribers[identity].forEach(function(e) { e.deactivitate(); });
            this.subscribers[identity] = [];
            break;
        case 'get':
            logger.log('info','PortfolioServer.Getting '+portfolioName+' from '+identity);
            var portfolio = new Portfolio(portfolioName, request.begin, request.end);
            portfolio.always = true;
            this.activitate(portfolio,identity, false);
            break;
        }
    }).bind(this));

    this.update = setInterval((function() {
        this.refresh();
    }).bind(this), 30000); // run every 30 seconds
}

PortfolioServer.prototype.refresh = function() {
    for (var identity in this.subscribers) {
        for (var i=0; i<this.subscribers[identity].length; i++) {
            this.subscribers[identity][i].refresh('quote');
        }
    }
};

// Attach quote service to the portfolio
PortfolioServer.prototype.activitate = function(portfolio, listener, permanent) {
    portfolio.permanent = permanent;
    portfolio.listener = listener;
    portfolio.response = this.response;
    portfolio.remaining = permanent?portfolio.investments.count:-1;
    portfolio.quote = zmq.socket('dealer').connect(zmqports.quote[0]);
    portfolio.quote.on('message', (function() {
        var security = JSON.parse(arguments[arguments.length-1]);
        var investment = this.investments[security.ticker];
        investment.security.consume(security);
        investment.calculate(this);
        logger.log('verbose','PortfolioServer.Sending investment',investment.security.ticker,this.name,this.listener);
        this.response.send([this.listener, this.name, JSON.stringify(investment)]);
        if (this.remaining!=-1 && --this.remaining==0) this.deactivitate();
    }).bind(portfolio));
    portfolio.refresh = function(quote_action) {
        for (var ticker in this.investments) {
            var investment = this.investments[ticker];
            if (!portfolio.always && investment.isClosed(portfolio.begin, portfolio.end)) continue;
            this.quote.send(['', JSON.stringify({ action: quote_action, security: investment.security })]);
        }
    };
    portfolio.deactivitate = function() {
    console.log('deactivitate');
        portfolio.quote.close();
        portfolio.listener = null;
        portfolio.refresh = null;
    };
    portfolio.refresh('quotes');
};

process.on('uncaughtException', function(err) { logger.log('error','PortfolioServer.Uncaught Exception '+err); });

module.exports = new PortfolioServer;
