var numeric = require('numeric');
var stat = require('./statistics');
var util = require('util');
var test = numeric.transpose([[7,4,3],[4,1,8],[6,3,5],[8,6,1],[8,5,7],[7,2,9],[5,3,3],[9,5,8],[7,4,5],[8,2,2]]);
//var test = [[1,2,3,4,5,6,7,8,9,10],[2,4,6,8,10,12,14,16,18,20],[10,20,30,40,50,60,70,80,90,100]];


// PCA in layman terms: Decomposing original space into different space with same dimentions, but with each dimention orthorgonal/independent with each 
// other. Then only choose the dimention that explains the majority of the variance of the original inputs.  
// The dot product of Each input to the individual eigenvector  will represent the input in the new space.
//
// data is a n*m data with n series and each has m data points: data[n][m]
function PCA(data) {
    this.data = data;
}

PCA.prototype.calculate = function(nPC) {
    var differencing = this.data;
    //var differencing = stat.differencing(this.data, 1);
    var covariance = this.covariance = stat.covarianceMatrix(differencing);
    var correlation = this.correlation = stat.correlationMatrix(differencing);
    var eig = numeric.eig(covariance);
    var eigenVectors = numeric.transpose(eig.E.x);
    // Sort the eigen based on eigenvalues (explanation of variances)
    var eigen = eig.lambda.x.map(function(e,i) { return [e, eigenVectors[i]]; }).sort(function(a,b) { return b[0]-a[0]; });
    var eigenValues = this.eigenValues = eigen.map(function(e) { return e[0]; });
    var eigenVectors = this.eigenVectors = eigen.map(function(e) { return e[1]; });
    var totalVariance = this.totalVariance = eigenValues.reduce(function(prev,curr,index,array) { return prev+curr; });
    var contribution = this.contribution = eigenValues.map(function(v) { return v/totalVariance; });
    var npca = eigenVectors.slice(0,nPC).concat(eigenVectors.slice(nPC).map(function(e) { return e.map(function(ei) { return 0; }) }));
    var ipca = numeric.transpose(eigenVectors);
    var transform = this.transform = numeric.dot(ipca, npca);
    var output = this.output = numeric.dot(transform, this.data);
    var error = this.error = numeric.sub(this.data, output);
    var mse = this.mse = error.map(function(e) { return stat.stdev(e); });
    var zscore = this.zscore = error.map(function(e) { return (Math.abs(e[e.length-1])<1e-12?0:e[e.length-1])/stat.stdev(e); });
    return output;
};

function unit_test() {
    //console.log(util.inspect(process.memoryUsage()));
    var newdata = test;
    var pca = new PCA(newdata);
    var output = pca.calculate(1);
    //console.log(util.inspect(process.memoryUsage(), {colors:true}));
    console.log(util.inspect(pca, {colors:true}));
}

module.exports = PCA;
