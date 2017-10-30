var util = require('util');
var stat = require('./statistics');
var Regression = require('./regression');
var cache = require('../data/cache');

function PCA_test() {
    var PCA = require('./pca');
    var data = numeric.transpose([[7,4,3],[4,1,8],[6,3,5],[8,6,1],[8,5,7],[7,2,9],[5,3,3],[9,5,8],[7,4,5],[8,2,2]]);
    var pca = new PCA(data);
    console.log(util.inspect(pca.calculate(3), false, 1, true));
}

function zScore_test() {
    var indicator = new Indicator(quotes);
    var zScore = indicator.zScore(stat, 10);
    console.log(util.inspect(zScore, false, 1, true));
}

function Regression_test() {
    var x = cache.find({ticker:'.INX'})[0].indicator.closes;
    var y = cache.find({ticker:'.DJI'})[0].indicator.closes;
    cache.close();

    console.log('beta','corr', 'tstat', 'pValue', 'se');
    for (var i=1; i<150; i++) {
        var xp = x.slice(-250-i).slice(0,-i);
        var yp = y.slice(-250-i).slice(0,-i);
        var regression = new Regression(xp, yp);
        var result = regression.linear();
        //console.log(result.beta);
        //console.log(result.beta, result.corr, result.tstat, result.pValue, result.se);
        //console.log(util.inspect(result, false, 0, true));
        var adf = regression.adf(result.residual);
        console.log(util.inspect(adf, false, 0, true));
    }
}


//Regression.prototype.unit_test();
Regression_test();
