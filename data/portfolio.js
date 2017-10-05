var Portfolio = require('../lib/portfolio');
var Security = require('../lib/security');
var logger = require('../config/log');
var fs = require('fs');


var a = fs.readFileSync('index.dat');
var universe = JSON.parse(String(a));
var portfolio = new Portfolio('EMPTY');
universe.filter(function(e) {
    return e[1]!="";
}).forEach(function(e) {
    var security = new Security(e[2], e[2], e[0], e[3]);
    portfolio.add(security, new Date('2010-01-01').fromGMTDate(), 1, 1, 0);
});
portfolio.write();
