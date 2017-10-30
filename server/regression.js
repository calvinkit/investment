var zmq = require('zeromq');
var Security = require('../lib/security');
var stat = require('../util/statistics');
var Indicator = require(__dirname+'/../util/indicator');
var Regression = require('../util/regression');
var logger = require('../config/log');
var zmqports = require('../config/zmq')();

function RegressionServer() {
    logger.log('info','Regression Server Started');
    this.response = zmq.socket('rep').connect(zmqports.regression[1]);
    this.response.on('disconnect', function() { logger.log('info','disconnect', arguments); });
    this.response.on('message', (function(request) {
        this.onrequest(JSON.parse(request));
    }).bind(this));
}

// Attach quote service to the portfolio
RegressionServer.prototype.onrequest = function(request) {
    request.response = this.response;
    request.onerror = function(security) { 
        this.quote.close();
        this.response.send(JSON.stringify(security));
        logger.log('info','Sending Regression result',security);
    };
    request.quote = zmq.socket('dealer').connect(zmqports.quote[0]);
    request.quote.on('message', (function() {
        var request = this;
        var security = new Security().consume(JSON.parse(arguments[arguments.length-1]));
        if (security.error) request.onerror(security);
        if (security.ticker == request.RegressionTarget.ticker) request.target = security;
        if (security.ticker == request.RegressionRegressor.ticker) request.regressor = security;
        if (request.target && request.regressor) request.onregress();
    }).bind(request));
    request.onregress = function() {
        var analysisResult = this;
        var D = MergeOnDates([toSeries(this.regressor), toSeries(this.target)]);
        var dates = stat.StripValues(D[0]);
        var nDays = this.RegressionDays;
        var rDate = this.RegressionDate?new Date(this.RegressionDate):new Date().getTime();
        var rDates = dates.filter(function(e) { return e<=rDate; }).slice(-nDays);
        // Full Data
        analysisResult.x = D[0];
        analysisResult.y = D[1];
        var dx = analysisResult.dx = stat.returns(stat.StripTimeSeries(D[0]), 1);
        var dy = analysisResult.dy = stat.returns(stat.StripTimeSeries(D[1]), 1);
        analysisResult.rsi = new Indicator(analysisResult.y).RSI(14);
        analysisResult.histcorr = stat.TimeSeries(dates, dx.map((function(e,i,a) { var start = Math.max(0, i-this.nDays); return stat.correlation(dx.slice(start, i), dy.slice(start, i)); }).bind(this))).slice(3);
        // Regression Data
        var rD = D.map(function(w) { return w.filter(function(e) { return rDates.indexOf(e[0])>-1; }); });
        var x = stat.returns(stat.StripTimeSeries(rD[0]),1);
        var y = stat.returns(stat.StripTimeSeries(rD[1]),1);
        var regression = new Regression(x, y);
        analysisResult.slr = regression.linear(); //Input is returns rate already
        analysisResult.tsr = regression.TheilSenRegression();
        // Stripped Data
        var dates = analysisResult.dates = dates.filter(function(e) { return e>=rDates[0]; });
        var D = D.map(function(w) { return w.filter(function(e) { return dates.indexOf(e[0])>-1; }); });
        var x = stat.StripTimeSeries(D[0]);
        var y = stat.StripTimeSeries(D[1]);
        var dx = analysisResult.dx.slice(-x.length);
        var dy = analysisResult.dy.slice(-y.length);
        var tmp = y.slice(-this.nDays);
        analysisResult.mean = stat.mean(tmp);
        analysisResult.stdd = stat.stdev(tmp);
        analysisResult.high = Math.max.apply(null,tmp);
        analysisResult.low = Math.min.apply(null,tmp);
        analysisResult.xy = dates.map(function(e,i,a) { return [ x[i], y[i] ]; });
        analysisResult.dxy = dates.map(function(e,i,a) { return [ dx[i], dy[i] ]; });
        analysisResult.est = regression.projection(dx, analysisResult.slr, 'linear');
        analysisResult.error = regression.residual(dx, dy, dx, analysisResult.slr, 'linear');
        analysisResult.me = stat.mean(analysisResult.error);             // mean error (in/out sample)
        analysisResult.zscore = analysisResult.error.map(function(e) { return e/analysisResult.slr.smse; });
        analysisResult.autobeta = stat.autobeta(y, 1);
        analysisResult.autocorr = stat.autocorrelation(y, 1);
        analysisResult.dautobeta = stat.autobeta(dy, 1);
        analysisResult.dautocorr = stat.autocorrelation(dy, 1);
        analysisResult.error_autobeta = stat.autobeta(analysisResult.error, 1);
        this.quote.close();
        this.response.send(JSON.stringify(analysisResult));
        logger.log('debug','Sending Regression result',this.target.ticker,this.regressor.ticker);
    };
    request.quote.send(['', JSON.stringify({ action: 'quotes', security: request.RegressionTarget })]);
    request.quote.send(['', JSON.stringify({ action: 'quotes', security: request.RegressionRegressor })]);
};

RegressionServer.prototype.close = function() {
    this.response.close();
};

function toSeries(security) { return security.quotes.map(function(e) { return [e.date, e.price]; }); }

process.on('uncaughtException', function(err) { logger.log('error','Regression Server Uncaught Exception: '+err); });

module.exports = new RegressionServer;
