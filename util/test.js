var stat = require('./statistics');
var Regression = require('./regression');
var util = require('util');

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

Regression.prototype.unit_test();
