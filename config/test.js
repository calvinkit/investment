var zmq = require('zeromq');
var zmqports = require('./zmq')(false);
var Security = require('../lib/security');
var quandl = require('./quandl');
var util = require('util');

function test_quandl() {
    //quandl.table({ source:'CFTC',table:'TN_F_ALL'}, function(e) {
    //    console.log(util.inspect(e));
    //});

    quandl.timeseries({ source:'CFTC',table:'TN_F_ALL'}, function(e) {
        console.log(util.inspect(e));
    });
}

test_quandl();
