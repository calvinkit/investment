var zmq = require('zeromq');
var Security = require('../lib/security');
var stat = require('../util/statistics');
var Indicator = require(__dirname+'/../util/indicator');
var regression = require('regression-extend');
var logger = require('../config/log');
var zmqports = require('../config/zmq')();
var carry = require('../util2/carry');
var DAY = 1000*60*60*24;

class RegressionServer {
    constructor() {
        logger.log('info','Regression Server Started');
        this.response = zmq.socket('rep').connect(zmqports.regression[1]);
        this.response.on('disconnect', function() { logger.log('info','disconnect', arguments); });
        this.response.on('message', (request) => this.onrequest(JSON.parse(request)));
        this.quote = zmq.socket('dealer').connect(zmqports.quote[0]);
        this.quote.on('message', this.onmessage.bind(this));
    }

    onerror(security) {
        delete this.request;
        this.response.send(JSON.stringify(security));
        logger.log('info','Sending Regression result with error',security.ticker, security.error);
    }

    onmessage() {
        var security = new Security().consume(JSON.parse(arguments[arguments.length-1]));
        var request = this.request;
        if (security.error) return this.onerror(security);
        if (request && security.ticker == request.RegressionTarget.ticker) request.target = security;
        if (request && security.ticker == request.RegressionRegressor.ticker) request.regressor = security;
        if ((request.target && request.regressor) || !request.RegressionRegressor.ticker && request.target) this.onregress();
    }

    onregress() {
        var result = this.request;
        var nDays = result.RegressionDays;

        // As Of
        var asOf = result.RegressionAsOf?new Date(result.RegressionAsOf):new Date().getTime();
        var rDate = result.RegressionDate?new Date(result.RegressionDate):asOf;
        var yIndicator = new Indicator(result.target.quotes);

        result.dates = stat.StripValues(toSeries(result.target).filter((e) => e[0] <= asOf));
        // Add 365 points ahead of regression date in additon of nDays
        result.dates = result.dates.filter(function(e) { return e<=rDate; }).slice(-nDays-365);
        result.y = yIndicator.series.filter((e) => e[0]>= result.dates[0] && e[0] <= asOf);
        var dy = result.dy = stat.differencing(stat.StripTimeSeries(result.y), 1); 
        var xy = [];

        // Last nDays statistics
        var y = stat.StripTimeSeries(result.y);
        var tmp = y.slice(-nDays);
        var dtmp = dy.slice(-nDays);
        result.mean = stat.mean(tmp);
        result.stdd = stat.stdev(tmp);
        result.vol = stat.stdev(dtmp);
        result.high = Math.max.apply(null,tmp);
        result.low = Math.min.apply(null,tmp);
        result.autobeta = stat.autobeta(tmp, 1);
        result.autocorr = stat.autocorrelation(tmp, 1);
        result.dautobeta = stat.autobeta(dtmp, 1);
        result.dautocorr = stat.autocorrelation(dtmp, 1);

        if (result.regressor) {
            var D = MergeOnDates([toSeries(result.regressor), result.y]);
            result.dates = stat.StripValues(D[0]);
            result.x = D[0]; // x series
            var dx = result.dx = stat.differencing(stat.StripTimeSeries(result.x), 1); // dx values (delta)
            result.y = D[1]; // y series
            var dy = result.dy = stat.differencing(stat.StripTimeSeries(result.y), 1); // dy values (delta)

            // Historical corr/beta
            result.histcorr = [];
            result.histbeta = [];
            dx.forEach((e,i,a) => {
                var start = Math.max(0, i-nDays); 
                result.histcorr[i] = [ result.dates[i], stat.correlation(dx.slice(start, i), dy.slice(start, i))];
                result.histbeta[i] = [ result.dates[i], regression.linear(dx.slice(start, i), dy.slice(start, i)).beta];
            });
            result.histcorr = result.histcorr.slice(3);
            result.histbeta = result.histbeta.slice(3);

            // Regression Data(in sample data)
            var D = D.map(function(w) { return w.filter(function(e) { return e[0] <= rDate; }); });
            var x = stat.StripTimeSeries(D[0].slice(-nDays));
            var y = stat.StripTimeSeries(D[1].slice(-nDays));
            var dx = stat.differencing(x, 1); // dx values (delta)
            var dy = stat.differencing(y, 1); // dy values (delta)
            if (result.regressor.country.toUpperCase() == "K2") dx = x;
            if (result.target.country.toUpperCase() == "K2") dy = y;
            result.slr = regression.linear(dx, dy, { precision: 5});

            // Full Data 
            var x = stat.StripTimeSeries(result.x); // x values
            var y = stat.StripTimeSeries(result.y); // y values
            result.est = x.map((e) => result.slr.predict(e)).map((e) => e[1]);
            result.residual = y.map((e,i) => e-result.est[i]);
            result.me = stat.mean(result.residual);
            result.zscore = result.residual.map((e) => e/result.slr.smse);
            result.error_autobeta = stat.autobeta(result.residual, 1);
        }

        result.RegressionTarget = result.target;
        result.RegressionRegressor = result.regressor;

        // Carry stuff for k2
        if (result.target.country.toUpperCase()=="K2") result.ycarry = carry.calculate(asOf, result.target.ticker).reduce((t,e) => t+e);
        if (result.regressor && result.regressor.country.toUpperCase()=="K2") result.xcarry = carry.calculate(asOf, result.RegressionRegressor.ticker).reduce((t,e) => t+e);

        // cleanup before send
        delete result.RegressionTarget.quotes;
        delete result.RegressionTarget.indicator;
        if (result.RegressionRegressor) delete result.RegressionRegressor.quotes;
        if (result.RegressionRegressor) delete result.RegressionRegressor.indicator;
        delete result.target;
        delete result.regressor;
        delete this.request;
        this.response.send(JSON.stringify(result));
        logger.log('debug','Sending Regression result',result.RegressionTarget.ticker,'vs',result.RegressionRegressor?result.RegressionRegressor.ticker:'');
    }

    onrequest(request) {
        logger.log('info','RegressionServer on '+request.RegressionTarget.ticker,'vs',request.RegressionRegressor.ticker,'asof',request.RegressionAsOf,'until',request.RegressionDate,"@",new Date().toLocaleTimeString());
        this.request = request;

        if (request.RegressionTarget.ticker) this.quote.send(['', JSON.stringify({ action: 'quotes', security: request.RegressionTarget })]);
        if (request.RegressionRegressor.ticker) this.quote.send(['', JSON.stringify({ action: 'quotes', security: request.RegressionRegressor })]);
    }

    close() {
        this.quote.close();
        this.response.close();
    }
}


function toSeries(security) { return security.quotes.map(function(e) { return [e.date, e.price]; }); }

process.on('uncaughtException', function(err) { logger.log('error','Regression Server Uncaught Exception: '+err); });

module.exports = new RegressionServer;
