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
        this.histbeta = [];
        var dates = stat.StripValues(D[0]);
        var nDays = this.RegressionDays;
        var x = analysisResult.x = D[0]; // x series
        var y = analysisResult.y = D[1]; // y series
        var dx = analysisResult.dx = stat.differencing(stat.StripTimeSeries(x), 1); // dx values (delta)
        var dy = analysisResult.dy = stat.differencing(stat.StripTimeSeries(y), 1); // dy values (delta)
        analysisResult.rsi = new Indicator(y).RSI(14);

        // Historical corr/beta
        [analysisResult.histcorr, analysisResult.histbeta] = dx.map((function(e,i,a) {
            var start = Math.max(0, i-this.nDays); 
            return [
                [ dates[i], stat.correlation(dx.slice(start, i), dy.slice(start, i))],
                [ dates[i], new Regression(dx.slice(start, i), dy.slice(start, i)).linear().beta]
            ];
        }).bind(this));
        analysisResult.histcorr = analysisResult.histcorr.slice(3);
        analysisResult.histbeta = analysisResult.histbeta.slice(3);

        // Regression Data(in sample data)
        var rDate = this.RegressionDate?new Date(this.RegressionDate):new Date().getTime();
        var rdates = dates.filter(function(e) { return e<=rDate; }).slice(-nDays);
        var rD = D.map(function(w) { return w.filter(function(e) { return rdates.indexOf(e[0])>-1; }); });
        var x = stat.StripTimeSeries(rD[0]);
        var y = stat.StripTimeSeries(rD[1]);
        var dx = stat.differencing(x, 1); // dx values (delta)
        var dy = stat.differencing(y, 1); // dy values (delta)
        var regression = new Regression(dx, dy);
        analysisResult.slr = regression.linear(true);  
        // !! shd I modify the alpha...
        analysisResult.slr.alpha = stat.mean(y)-analysisResult.slr.beta*stat.mean(x);
        analysisResult.tsr = regression.theil_sen();

        // Stripped Data(in/out sample data)
        var dates = analysisResult.dates = dates.filter(function(e) { return e>=rdates[0]; });
        var D = D.map(function(w) { return w.filter(function(e) { return dates.indexOf(e[0])>-1; }); });
        var x = stat.StripTimeSeries(D[0]); // x values
        var y = stat.StripTimeSeries(D[1]); // y values
        var dx = analysisResult.dx.slice(-x.length); // dx values
        var dy = analysisResult.dy.slice(-y.length); // dy values
        analysisResult.xy = dates.map(function(e,i,a) { return [ x[i], y[i] ]; });
        analysisResult.dxy = dates.map(function(e,i,a) { return [ dx[i], dy[i] ]; });
        analysisResult.est = regression.projection(x, analysisResult.slr, 'linear');
        analysisResult.residual = regression.residual(x, y, analysisResult.slr, 'linear');
        analysisResult.me = stat.mean(analysisResult.residual);
        analysisResult.zscore = analysisResult.residual.map(function(e) { return e/analysisResult.slr.smse; });
        analysisResult.autobeta = stat.autobeta(y, 1);
        analysisResult.autocorr = stat.autocorrelation(y, 1);
        analysisResult.dautobeta = stat.autobeta(dy, 1);
        analysisResult.dautocorr = stat.autocorrelation(dy, 1);
        analysisResult.error_autobeta = stat.autobeta(analysisResult.residual, 1);

        // Last nDays statistics
        var tmp = y.slice(-this.nDays);
        analysisResult.mean = stat.mean(tmp);
        analysisResult.stdd = stat.stdev(tmp);
        analysisResult.vol = stat.stdev(dy.slice(-this.nDays));
        analysisResult.high = Math.max.apply(null,tmp);
        analysisResult.low = Math.min.apply(null,tmp);

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
