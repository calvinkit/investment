var numeric = require('numeric');
var ttest = require('ttest');
var util = require('util');
var stat = require('./statistics');
var StudentT = require('distributions').Studentt;

// Standard deviation measures the deviation of the population around the mean
// Standard error measure deviation of the estimate (e.g. mean) against the true value. This would be a function of N/degree-of-freedom.
// t-statistics and alike reflect this deviation as a likelihood in pValue, or in turns, the confidnece level.
// standard t test takes in array of samples, run the sample mean vs null hypothesis mean, and return pValue
// for regression adf test purpose, the array of samples are the regression residuals 
function Regression(x,y) {
    this.x = x;
    this.y = y;
}

Regression.prototype.linear = function(bOrigin) {
    var result = new Object();
    result.cov = stat.covariance(this.x, this.y);
    result.corr = stat.correlation(this.x, this.y);
    result.beta = !bOrigin?result.cov/stat.variance(this.x):numeric.dot(this.x,this.y)/numeric.dot(this.x,this.x);
    result.alpha = !bOrigin?stat.mean(this.y)-result.beta*stat.mean(this.x): 0;
    result.residual = this.residual(this.x, this.y, result, 'linear');
    result.me = stat.mean(result.residual);                                     // mean error (in/out sample) this must be zero...
    result.sse = stat.variance(result.residual)*(result.residual.length-1);     // sum of square error (use variance since me = 0 anyways)
    result.mse = result.sse/result.residual.length;                             // almost same as sample variance but /N instead of /N-1
    result.smse = Math.sqrt(result.mse);                                        // square root of mse
    result.se = Math.sqrt(result.sse/(this.x.length-2)/stat.variance(this.x)/(this.x.length-1)); // standard error of the slope 
    result.tstat = result.se!=0?result.beta/result.se:1000; // t-statistics of the beta
    result.pValue = new StudentT(this.x.length-1).cdf(result.tstat);

    return this.x.length==0?null:result;
};

// y-x*beha-alpha
Regression.prototype.residual = function(x, y, result, type) {
    // type == linear
    return numeric.sub(y, this.projection(x, result, type));
};

Regression.prototype.projection = function(x, result, type) {
    //type == linear
    return numeric.add(result.alpha,numeric.dot(result.beta,x));
};

// To test if a series is stationary, we define y_i+1 = y_i*thi + error
Regression.prototype.adf = function(residual) {
    var regression = new Regression(residual.slice(0,-1), stat.differencing(residual, 1).slice(1));
    var result = regression.linear(true);
    return { tstat: result.tstat, pValue: result.pValue };
};

Regression.prototype.TheilSenRegression = function() {
    var x = this.x;
    var y = this.y;
    var result = new Object();
    result.cov = stat.covariance(x,y);
    result.corr = stat.correlation(x, y);
    var slopes = new Array();
    var intercepts = new Array();
    var size = x.length;
    for (var i=0; i<size; i++) {
        for (var j=i+1; j<size; j++) {
            var x1 = x[i];
            var y1 = y[i];
            var x2 = x[j];
            var y2 = y[j];
            if (x2!=x1) slopes.push((y2-y1)/(x2-x1));
        }
    }
    slopes.sort();
    result.beta = slopes[Math.floor(slopes.length/2)];
    for (var i=0; i<size; i++) intercepts.push(y[i]-result.beta*x[i]);
    intercepts.sort();
    result.alpha = intercepts[Math.floor(intercepts.length/2)];
    return result;
};

Regression.prototype.unit_test = function() {
    //correlated
    var x = new Array(); var y = new Array(); 
    var beta = 2; var alpha = 5; var variance = 10;
    var result;
    for (var i=0; i<100; i++) { 
        x[i] = i; 
        y[i] = beta*Math.random()*i+alpha+(Math.random()-0.5)*variance; 
    }
    var regression = new Regression(x, y);
    console.log(util.inspect({ beta: beta, alpha: alpha, me:0 }, false, 0, true));
    console.log(util.inspect(result = regression.linear(), false, 0, true));
    console.log(util.inspect(regression.adf(result.residual), false, 0, true));
}

module.exports = Regression;
