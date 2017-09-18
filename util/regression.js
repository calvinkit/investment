var numeric = require('numeric');
var stat = require('./statistics');
var util = require('util');

function Regression(x,y) {
    this.x = x;
    this.y = y;
}

Regression.prototype.SimpleLinear = function(differencing) {
    var result = new Object();
    x = differencing?stat.differencing(this.x,1):this.x;
    y = differencing?stat.differencing(this.y,1):this.y;
    result.cov = stat.covariance(x, y);
    result.corr = stat.correlation(x, y);
    result.beta = result.cov/stat.variance(x);
    result.alpha = stat.mean(this.y)-result.beta*stat.mean(this.x);
    result.error = this.LinearError(this.x, this.y, result.alpha, result.beta);
    result.me = stat.mean(result.error);             // mean error (in/out sample)
    result.mse = stat.variance(result.error);        // mean square (variance of) error
    result.smse = Math.sqrt(result.mse);             // stdd of error
    result.sse = result.mse*(result.error.length-1); // sum of square error
    result.se = Math.sqrt(result.sse/(this.x.length-2)/stat.variance(this.x)/(this.x.length-1)); // standard error of the slope 
    result.tstat = result.se!=0?Math.abs(result.beta)/result.se:1000; // t-statistics of the beta
    //console.log(util.inspect(result,false,1,true));
    return this.x.length==0?null:result;
};

Regression.prototype.SimpleLinearWithNoIntercept = function() {
    var result = new Object();
    result.cov = stat.covariance(this.x,this.y);
    result.corr = stat.correlation(this.x, this.y);
    result.beta = numeric.dot(this.x,this.y)/numeric.dot(this.x,this.x);
    result.alpha = 0;
    result.error = this.LinearError(this.x, this.y, result.alpha, result.beta);
    result.sse = stat.variance(result.error)*(result.error.length-1); // sum of square error
    result.mse = result.sse/(result.error.length-2);  // mean square error
    result.smse = Math.sqrt(result.mse);
    result.tstat = Math.abs(result.beta)/(result.smse/Math.sqrt(stat.variance(this.x)*(this.x.length-1)));
    return this.x.length==0?null:result;
};
// y-x*beha-alpha
Regression.prototype.LinearError = function(x, y, alpha, beta) {
    return numeric.sub(numeric.sub(y, numeric.dot(beta,x)),alpha);
};

Regression.prototype.LinearProjection = function(x, alpha, beta) {
    return numeric.add(alpha,numeric.dot(beta,x));
};

Regression.prototype.GrowthError = function(dy, dx, alpha, beta) {
    var est = this.GrowthProjection(y, dx, alpha, beta);
    return numeric.sub(dy, est);
};

Regression.prototype.GrowthProjection = function(dx, alpha, beta) {
    return this.LinearProjection(dx, alpha, beta);
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

module.exports = Regression;
