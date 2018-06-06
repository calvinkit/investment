var zmq = require('zeromq');
var Security = require('../lib/security');
var stat = require('../util/statistics');
var Indicator = require(__dirname+'/../util/indicator');
var regression = require('regression-extend');
var logger = require('../config/log');
var zmqports = require('../config/zmq')();

function RegressionServer() {
    logger.log('info','Regression Server Started');
    this.response = zmq.socket('rep').connect(zmqports.regression[1]);
    this.response.on('disconnect', function() { logger.log('info','disconnect', arguments); });
    this.response.on('message', (request) => this.onrequest(JSON.parse(request)));
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
        var result = this;
        var D = MergeOnDates([toSeries(this.regressor), toSeries(this.target)]);
        this.histbeta = [];
        var dates = stat.StripValues(D[0]);
        var nDays = this.RegressionDays;
        var x = result.x = D[0]; // x series
        var y = result.y = D[1]; // y series
        var dx = result.dx = stat.differencing(stat.StripTimeSeries(x), 1); // dx values (delta)
        var dy = result.dy = stat.differencing(stat.StripTimeSeries(y), 1); // dy values (delta)
        result.rsi = new Indicator(y).rsi(14);

        // Historical corr/beta
        result.histcorr = [];
        result.histbeta = [];
        dx.forEach((e,i,a) => {
            var start = Math.max(0, i-nDays); 
            result.histcorr[i] = [ dates[i], stat.correlation(dx.slice(start, i), dy.slice(start, i))];
            result.histbeta[i] = [ dates[i], regression.linear(dx.slice(start, i), dy.slice(start, i)).beta];
        });
        result.histcorr = result.histcorr.slice(3);
        result.histbeta = result.histbeta.slice(3);

        // Regression Data(in sample data)
        var rDate = this.RegressionDate?new Date(this.RegressionDate):new Date().getTime();
        var rdates = dates.filter(function(e) { return e<=rDate; }).slice(-nDays);
        var rD = D.map(function(w) { return w.filter(function(e) { return rdates.indexOf(e[0])>-1; }); });
        var x = stat.StripTimeSeries(rD[0]);
        var y = stat.StripTimeSeries(rD[1]);
        var dx = stat.differencing(x, 1); // dx values (delta)
        var dy = stat.differencing(y, 1); // dy values (delta)
        if (result.regressor.country == "K2") dx = x;
        if (result.target.country == "K2") dy = y;
        result.slr = regression.linear(dx, dy, { precision: 5});
        //result.slr.pValue = x.length<=2?0:new StudentT(x.length-1).cdf(result.slr.tstat);

        // Stripped Data(in/out sample data)
        var dates = result.dates = dates.filter(function(e) { return e>=rdates[0]; });
        var D = D.map(function(w) { return w.filter(function(e) { return dates.indexOf(e[0])>-1; }); });
        var x = stat.StripTimeSeries(D[0]); // x values
        var y = stat.StripTimeSeries(D[1]); // y values
        var dx = result.dx.slice(-x.length); // dx values
        var dy = result.dy.slice(-y.length); // dy values
        result.xy = dates.map(function(e,i,a) { return [ x[i], y[i] ]; });
        result.dxy = dates.map(function(e,i,a) { return [ dx[i], dy[i] ]; });
        result.est = x.map((e) => result.slr.predict(e)).map((e) => e[1]);
        result.residual = y.map((e,i) => e-result.est[i]);
        result.me = stat.mean(result.residual);
        result.zscore = result.residual.map((e) => e/result.slr.smse);
        result.autobeta = stat.autobeta(y, 1);
        result.autocorr = stat.autocorrelation(y, 1);
        result.dautobeta = stat.autobeta(dy, 1);
        result.dautocorr = stat.autocorrelation(dy, 1);
        result.error_autobeta = stat.autobeta(result.residual, 1);

        // Last nDays statistics
        var tmp = y.slice(-this.nDays);
        result.mean = stat.mean(tmp);
        result.stdd = stat.stdev(tmp);
        result.vol = stat.stdev(dy.slice(-nDays));
        result.high = Math.max.apply(null,tmp);
        result.low = Math.min.apply(null,tmp);

        this.quote.close();
        // cleanup before send
        delete result.quote;
        delete result.RegressionTarget;
        delete result.RegressionRegressor;
        this.response.send(JSON.stringify(result));
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
