function Statistics() {
}

Statistics.prototype.sum = function(x) {
    if (x.length==0) return 0;
    return x.reduce(function(acum, curr) { return acum+curr; });
};

Statistics.prototype.mean = function(x) {
    var sum = this.sum(x);
    return sum/(x.length || 1);
};

Statistics.prototype.stdev = function(x) {
    return Math.sqrt(this.variance(x));
};

Statistics.prototype.variance = function(x) {
    var len = x.length;
    var m = this.mean(x);
    var v = 0;
    for (var i=0; i<len; i++) v += (x[i]-m)*(x[i]-m);
    return v/(x.length-1 || 1);
};

Statistics.prototype.covariance = function(x, y) {
    assert(x.length == y.length, 'covariance matrix must be same size');
    var len = x.length;
    var mx = this.mean(x);
    var my = this.mean(y);
    var xy = 0;
    for (var i=0; i<len; i++) xy += (x[i]-mx)*(y[i]-my);
    return xy/(x.length-1 || 1);
};

// data is a n*m data with n series and each has m data points: data[n][m]
Statistics.prototype.covarianceMatrix = function(data) {
    var result = new Array();
    for (var i=0; i<data.length; i++) {
        result[i] = new Array();
        for (var j=0; j<=i; j++) {
            result[i][j] = result[j][i] = this.covariance(data[i], data[j]);
        }
    }
    return result;
};

Statistics.prototype.correlation = function(x, y) {
    if (x.length <= 1 || y.length <= 1) return 0;
    return this.covariance(x,y)/this.stdev(x)/this.stdev(y);
};

// data is a n*m data with n series and each has m data points: data[n][m]
Statistics.prototype.correlationMatrix = function(data) {
    var result = new Array();
    for (var i=0; i<data.length; i++) {
        result[i] = new Array();
        for (var j=0; j<=i; j++) {
            result[i][j] = result[j][i] = this.correlation(data[i], data[j]);
        }
    }
    return result;
};

Statistics.prototype.autocorrelation = function(x, nLag) {
    var y = x.slice(0, x.length-nLag);
    x = x.slice(nLag);
    return this.covariance(x,y)/this.stdev(x)/this.stdev(y);
};

Statistics.prototype.autobeta = function(x, nLag) {
    var y = x.slice(0, x.length-nLag);
    x = x.slice(nLag);
    return this.covariance(x,y)/this.variance(y);
};

Statistics.prototype.differencing = function(x, nLag) {
    if (x[0] && x[0].length>0)
        return x.map(function(e,i,a) { return e.map(function(e,i,a) { return i>=nLag?e-a[i-nLag]:0; })});
    else
        return x.map(function(e,i,a) { return i>=nLag?e-a[i-nLag]:0; });
};

// Percentage returns over the nLag/period
Statistics.prototype.returns = function(x, nLag) {
    return x.map(function(e,i,a) { return i>=nLag?e/a[i-nLag]-1:0; });
};

Statistics.prototype.TimeSeries = function(time, value) {
    var series = new Array();
    for (var i=0; i<time.length && i<value.length; i++) series[i] = [time[i], value[i]];
    return series;
};

Statistics.prototype.StripTimeSeries = function(series) {
    var values = new Array();
    for (var i=0; i<series.length; i++) values[i] = series[i][1];
    return values;
};

Statistics.prototype.StripValues = function(series) {
    var times = new Array();
    for (var i=0; i<series.length; i++) times[i] = series[i][0];
    return times;
};

Statistics.prototype.MeanRemoval = function(data) {
    var mean = data.length==0?0:data.reduce(function(prev,curr,index,array) { return prev+curr; })/data.length;
    return data.map(function(e) { return e-mean; });
};

Statistics.prototype.histvolatility = function(series, period, forward) {
    if (series.length==0) return [];
    data = this.differencing(this.StripTimeSeries(series),1);
    return data.map(function(e,i,a) { 
        var d;
        if (!forward) {
            d = a.slice(Math.max(0,i+1-period),i+1); 
        } else {
            d = a.slice(i, i+1+period);
        }
        return [series[i][0], Statistics.prototype.stdev(d)];
    });
};

function assert(condition, error) {
    if (!condition && error)
        throw error;
    else if (!condition)
        console.log('error','assert failed', condition);
};

function unit_test() {
    var a = [1,2,3,4,5];
    console.log(a[1].length>0);
    console.log(util.inspect(stat.differencing(a,1)));

    var a = [ [1,2,3,4,5], [6,7,8,9,10] ];
    console.log(a[1].length>0);
    console.log(util.inspect(stat.differencing(a,1)));
}

if (typeof module != "undefined") 
    module.exports = new Statistics();
else
    var statistics = new Statistics();
