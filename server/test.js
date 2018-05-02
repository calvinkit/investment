var Security = require('../lib/security');
var logger = require('../config/log');
var httpProxyAgent = require('http-proxy-agent');
var httpsProxyAgent = require('https-proxy-agent');
var util = require('util');
var httpsProxy = process.env.HTTP_PROXY?new httpsProxyAgent(process.env.HTTP_PROXY):null;
var httpProxy = process.env.HTTP_PROXY?new httpProxyAgent(process.env.HTTP_PROXY):null;

var Google = require('./Google');
var AlphaVantage = require('./alphavantage');
var CNBC = require('./cnbc');
var Quandl = require('./quandl');
var Yahoo = require('./yahoo');
var Morningstar = require('./morningstar');
var fs = require('fs');

function test_Google() {
    var security = new Security('GOOG','GOOG','United States');
    var google = new Google(httpProxy);
    google.gethistory(security, false, function(s) { google.getprice(s,console.log)}, function(s) {google.getprice(s,console.log)});

    var security = new Security('CTI16','CTI16','MUTF_CA');
    var google = new Google(httpProxy);
    google.gethistory(security, false, function(s) { google.getprice(s,console.log)}, function(s) {google.getprice(s,console.log)});
}

function test_Alpha() {
    var security = new Security('XSP','XSP','TSE');
    var alpha = new AlphaVantage(httpsProxy);
    alpha.gethistory(security, false, (s) => alpha.getprice(s,console.log), (s) => alpha.getprice(s,console.log));
}

function test_Morningstar() {
    var security = new Security('GOOG','GOOG','United States');
    var quote = new Morningstar(httpProxy);
    quote.getfinancials(security,(s) => console.log(util.inspect(s)));
}

function test_Yahoo() {
    var security = new Security('TDB652','TDCOMMETDIVE','MUTF_CA');
    var quote = new Yahoo(httpsProxy);
    //quote.gethistory(security, false, (s) => quote.getprice(s,console.log), (s) => quote.getprice(s,console.log));
    quote.getprice(security, (s) => console.log(util.inspect(s)), (s) => console.log(util.inspect(s)));
}

function test_CNBC() {
    var security = new Security('GOOG','GOOG','United States');
    var quote = new CNBC(httpsProxy);
    quote.getprice(security, (s) => console.log(util.inspect(s)), (s) => console.log(util.inspect(s)));
}

function test_Quandl() {
    var security = new Security('CFTC/TN_F_ALL','CFTC/TN_F_ALL','');
    var quote = new Quandl(httpsProxy);
    quote.timeseries(security, (s) => console.log(util.inspect(s)), (s) => console.log(util.inspect(s)));
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

test_Alpha();
//test_CNBC();
//test_Morningstar();
//test_Yahoo();
