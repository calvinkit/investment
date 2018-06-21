var express = require('express');
var router = express.Router();
var zmq = require('zeromq');
var zmqports = require('../config/zmq')(false);
var Security = require('../lib/security');
var logger = require('../config/log');
var users = require('../users');

router.get('/', function(req, res, next) {
    var who = (users[req.connection.remoteAddress] || req.connection.remoteAddress);
    var tickers = req.query.tickers;
    var securities = req.query.securities;
    var nDays = req.query.nDays;
    var nPC = req.query.nPC;
    var asOf = req.query.asOf==''?null:new Date(parseFloat(req.query.asOf));
    var weightDate = req.query.weightDate==''?null:new Date(parseFloat(req.query.weightDate));
    var sender = zmq.socket('req').connect(zmqports.pca[0]);
    sender.on('message', (function(msg) {
        this.res.json(JSON.parse(msg));
        this.sender.close();
    }).bind({ res:res, sender: sender}));
    sender.send(JSON.stringify({ action:'pca', who: who, tickers: tickers, securities: securities, nDays: nDays, nPC: nPC, asOf: asOf, weightDate: weightDate }));
});

module.exports = router;

