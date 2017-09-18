var Portfolio = require('../lib//portfolio');
var Investment = require('../lib/investment');
var Security = require('../lib/security');
var logger = require('../config/log');
var httpProxyAgent = require('http-proxy-agent');
var httpsProxyAgent = require('https-proxy-agent');
var logger = require('../config/log');
var util = require('util');
var Google = require('./Google');
var AlphaVantage = require('./alphavantage');
var CNBC = require('./cnbc');

function test_Portfolio() {
    var portfolio = new Portfolio('RRSP');
};

function test_Google() {
    var security = new Security('GOOG','GOOG','United States');
    var google = new Google(new httpProxyAgent(process.env.HTTP_PROXY));
    //google.gethistory(security, false, function(s) { google.getprice(s,console.log)}, function(s) {google.getprice(s,console.log)});
    //google.getprice(security,function(s) { console.log(util.inspect(s)); });

    var security = new Security('CTI16','CTI16','MUTF_CA');
    var google = new Google(new httpProxyAgent(process.env.HTTP_PROXY));
    google.gethistory(security, false, function(s) { google.getprice(s,console.log)}, function(s) {google.getprice(s,console.log)});
    //google.getprice(security,function(s) { console.log(util.inspect(s)); },function(s) { console.log(util.inspect(s)); });
}

function test_Alpha() {
    var security = new Security('GOOG','GOOG','United States');
    var alpha = new AlphaVantage(new httpsProxyAgent(process.env.HTTP_PROXY));
    //alpha.gethistory(security, false, function(s) { alpha.getprice(s,console.log)}, function(s) {alpha.getprice(s,console.log)});
    alpha.getprice(security,function(s) { console.log(util.inspect(s)) });
}

function test_Alpha() {
    var security = new Security('GOOG','GOOG','United States');
    var cnbc = new CNBC(new httpsProxyAgent(process.env.HTTP_PROXY));
    cnbc.getprice(security,
        function(s) { console.log(util.inspect(s)) },
        function(s) { console.log(util.inspect(s)) });
}

test_Alpha();
