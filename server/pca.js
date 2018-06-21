var zmq = require('zeromq');
var numeric = require('numeric');
var util = require('util');
var stat = require('../util/statistics');
var PCA = require('../util/pca');
var carry = require('../util2/carry');
var logger = require('../config/log');
var zmqports = require('../config/zmq')();
var Security = require('../lib/security');
var Indicator = require('../util/indicator');

// result {
//  data: raw input data
//  covariance: covariance matrix of inputs
//  correlation: correlation matrix of inputs
//  pca: raw pca results
//  loadings: eigen vectors
//  contribution: variance explained by loadings
//  output: PCA applied to data with n PC
//  residual: diff between adjusted an output
//  zscore: zscore on last data point
//}
class PCAServer {
    constructor() {
        logger.log('info','PCAServer Started');
        this.response = zmq.socket('rep').connect(zmqports.pca[1]);
        this.response.on('disconnect', function() { logger.log('info','disconnect', arguments); });
        this.response.on('message', (request) => this.onrequest(JSON.parse(request)));
    }

    onrequest(request) {
        logger.log('info','PCAServer on '+request.tickers,request.nDays,'days','asof',request.asOf,'model date',request.nPC,'PC',request.weightDate,"@",new Date().toLocaleTimeString());

        request.response = this.response;
        request.quote = zmq.socket('dealer').connect(zmqports.quote[0]);
        request.result = { data: [], contribution: [], variance: [], zscore: [], carry: []  };

        request.onerror = function(security) { 
            this.quote.close();
            this.response.send(JSON.stringify(security));
            logger.log('info','Sending PCA result with error',security.ticker, security.error);
        };

        request.quote.on('message', (function() {
            var request = this;
            var security = new Security().consume(JSON.parse(arguments[arguments.length-1]));
            if (security.error) request.onerror(security);
            security.done = true;
            request.securities[security.ticker] = security;
            var indicator = new Indicator(security.quotes.slice(-request.nDays));
            request.result.data[request.tickers.indexOf(security.ticker)] = indicator.closes;
            request.times = indicator.dates;
            if (request.tickers.every((e) => request.securities[e].done)) request.onprocess(request);
        }).bind(request));
        
        request.onprocess = function(request) {
            var pca = new PCA(this.result.data.map(function(e) { return stat.MeanRemoval(e); }));
            var output = pca.calculate(request.nPC);
            request.result = pca;
            request.result.times = request.times;
            request.result.dv01 = new Array();
            request.result.carry = request.tickers.map((e) => (request.securities[e].country.toUpperCase()=="K2")?carry.calculate(request.asOf, e):0);
            request.quote.close(); delete request.quote;
            request.response.send(JSON.stringify(request));
            logger.log('verbose','PCA Server result sent to '+request.who+' on '+request.tenors);
        }


        request.tickers.forEach((e) => {
            request.quote.send(['', JSON.stringify({ action: 'quotes', who: 'PCA', security: request.securities[e], asOf: this.asOf })])
        });
    }
}

module.exports = new PCAServer;
