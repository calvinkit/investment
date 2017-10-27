var ttest = require('ttest');
var stat = require('../util/statistics');
//https://www.npmjs.com/package/ttest

var a = [1,1,1,1,1,2,2,2,2,2,3,3,3,3,3,4,5,6,7,4,3,5,6,4,34,5,6,45,43,5,6,1];
var mu = stat.mean(a);
var stdev = stat.stdev(a);
var sn = Math.sqrt(a.length);
console.log('my',mu, 0, stdev/sn );
console.log(mu/stdev*sn);
// (mean-mu)/sqrt(variance/size)
console.log(ttest(a, {mu: 0, alpha: 0.05}).testValue());

//console.log(ttest(a, {mu: 0, alpha: 0.05}).pValue());

var a = new Object();
a.return = function() { return 1; };
console.log(a.return());


function A() {
};

A.prototype.abc = function() {
console.log(1);
};

A.prototype.abc();
