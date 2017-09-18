var stat = require('./statistics');
var util = require('util');
var Indicator = require('./indicator');
var Transactions = require('/transactions'); 

var x = new Array(); var y = new Array(); var quotes = new Array();
for (var i=0; i<100; i++) { 
    x[i] = i; 
    y[i] = i*2+100+Math.random()*10-5; 
    quotes[i] = { vols: 0, date: i, price: i*2, lo: i*2, hi: i*2 };
}


function PCA_test() {
    var PCA = require('./pca');
    var data = numeric.transpose([[7,4,3],[4,1,8],[6,3,5],[8,6,1],[8,5,7],[7,2,9],[5,3,3],[9,5,8],[7,4,5],[8,2,2]]);
    var pca = new PCA(data);
    console.log(util.inspect(pca.calculate(3), false, 1, true));
}

function Regression_test() {
    var Regression = require('./regression');
    var regression = new Regression(x, y);
    console.log(util.inspect(regression.SimpleLinear(), false, 0, true));
}

function zScore_test() {
    var indicator = new Indicator(quotes);
    var zScore = indicator.zScore(stat, 10);
    console.log(util.inspect(zScore, false, 1, true));
}

function transactions_test() {
    var transactions = new Transactions();
    transactions.add(1,4,1,0);
    transactions.add(1,4,2,0);
    transactions.add(1,-4,1,0);
    transactions.add(1,-5,1,0);
    transactions.add(1,1,1,0);
    console.log(util.inspecttransactions.calculate(10));
}

//PCA_test();
//Regression_test();
//zScore_test();
transactions_test();
