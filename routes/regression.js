var express = require('express');
var router = express.Router();
var zmq = require('zeromq');
var zmqports = require('../config/zmq')();
var logger = require('../config/log');
var Security = require('../lib/security');

router.get('/', function(req, res, next) {
    var request = { action: 'regress' };
    request.RegressionTarget = new Security(req.query.RegressionTarget, req.query.RegressionTarget, req.query.RegressionTargetCountry);
    request.RegressionRegressor = new Security(req.query.RegressionRegressor, req.query.RegressionRegressor, req.query.RegressionRegressorCountry);
    request.RegressionDays = req.query.RegressionDays;
    request.RegressionAsOf = req.query.RegressionAsOf;
    request.RegressionDate = req.query.RegressionDate;
    var sender = zmq.socket('req').connect(zmqports.regression[0]);
    sender.on('message', (function(msg) {
        this.res.json(JSON.parse(msg));
        this.sender.close();
    }).bind({ res:res, sender: sender}));
    sender.send(JSON.stringify(request));
    logger.log('info','Regression on '+request.RegressionTarget.ticker,'vs',request.RegressionRegressor.ticker,request.RegressionAsOf,request.RegressionDate,"@",new Date().toLocaleTimeString());
});

module.exports = router;

