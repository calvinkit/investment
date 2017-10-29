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
var Quandl = require('./quandl');
var fs = require('fs');
var httpsProxy = process.env.HTTP_PROXY?new httpsProxyAgent(process.env.HTTP_PROXY):null;
var httpProxy = process.env.HTTP_PROXY?new httpProxyAgent(process.env.HTTP_PROXY):null;

function test_Portfolio() {
    var portfolio = new Portfolio('RRSP');
};

function test_Google() {
    var security = new Security('GOOG','GOOG','United States');
    var google = new Google(httpProxy);
    //google.gethistory(security, false, function(s) { google.getprice(s,console.log)}, function(s) {google.getprice(s,console.log)});
    //google.getprice(security,function(s) { console.log(util.inspect(s)); });

    var security = new Security('CTI16','CTI16','MUTF_CA');
    var google = new Google(httpProxy);
    google.gethistory(security, false, function(s) { google.getprice(s,console.log)}, function(s) {google.getprice(s,console.log)});
    //google.getprice(security,function(s) { console.log(util.inspect(s)); },function(s) { console.log(util.inspect(s)); });
}

function test_Alpha() {
    var security = new Security('XSP','XSP','TSE');
    var alpha = new AlphaVantage(httpsProxy);
    alpha.gethistory(security, false, function(s) { alpha.getprice(s,console.log)}, function(s) {alpha.getprice(s,console.log)});
    //alpha.getprice(security,function(s) { console.log(util.inspect(s)) });
}

function test_CNBC() {
    var security = new Security('GOOG','GOOG','United States');
    var cnbc = new CNBC(httpsProxy);
    cnbc.getprice(security,
        function(s) { console.log(util.inspect(s)) },
        function(s) { console.log(util.inspect(s)) });
}

function test_Quandl() {
    var security = new Security('CFTC/TN_F_ALL','CFTC/TN_F_ALL','');
    var quandl = new Quandl(httpsProxy);
    quandl.timeseries(security,
        function(s) { console.log(util.inspect(s)) },
        function(s) { console.log(util.inspect(s)) });
}

function sample_data() {
    function save_data(s) {
        //fs.appendFileSync('./data.dat', JSON.stringify(s));
        collection.insert(s);
    }

    var security = new Security('GOOG','GOOG','United States');
    var google = new Google(httpProxy);
    google.gethistory(security, false, function(s) { google.getprice(s,save_data)}, function(s) {google.getprice(s,save_data)});

    var security = new Security('CTI16','CTI16','MUTF_CA');
    var google = new Google(httpProxy);
    google.gethistory(security, false, function(s) { google.getprice(s,save_data)}, function(s) {google.getprice(s,save_data)});
}

sample_data();
