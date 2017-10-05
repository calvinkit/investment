var logger = require('../config/log');

var a = new Date('2010-01-01');
// 2010-01-01 intended to be local
// a is GMT instead
// to make a as local 2010-01-01, we need a to be 2010-01-01 5:00 GMT
// i.e. add 5 hours
console.log(a.toUTCString(), a.toString());
console.log(a.fromGMTDate().toUTCString(), a.fromGMTDate().toString());
console.log(a.fromGMTDate().fromGMTDate().toUTCString(), a.fromGMTDate().toGMTDate().toString());
