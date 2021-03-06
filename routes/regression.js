var express = require('express');
var router = express.Router();
var zmq = require('zeromq');
var zmqports = require('../config/zmq')();
var logger = require('../config/log');
var Security = require('../lib/security');
var users = require('../users');

router.get('/', function(req, res, next) {
    var request = { action: 'regress' };
    request.RegressionTarget = new Security(req.query.RegressionTarget, req.query.RegressionTarget, req.query.RegressionTargetCountry);
    request.RegressionRegressor = new Security(req.query.RegressionRegressor, req.query.RegressionRegressor, req.query.RegressionRegressorCountry);
    request.RegressionDays = req.query.RegressionDays;
    request.RegressionAsOf = req.query.RegressionAsOf;
    request.RegressionDate = req.query.RegressionDate;

    var who = (users[req.connection.remoteAddress] || req.connection.remoteAddress);
    logger.log('info','Received regression reqest on '+request.RegressionTarget.ticker,'vs',request.RegressionRegressor.ticker,'asof',request.RegressionAsOf,'until',request.RegressionDate,"@",new Date().toLocaleTimeString());

    var sender = zmq.socket('req').connect(zmqports.regression[0]);
    sender.on('message', (function(msg) {
        this.res.json(JSON.parse(msg));
        this.sender.close();
    }).bind({ res:res, sender: sender}));
    sender.send(JSON.stringify(request));
});

module.exports = router;

