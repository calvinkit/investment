var zmq = require('zeromq');
var router = require('express').Router();
var zmqports = require('../config/zmq')();
var Security = require('../lib/security');

router.get('/security', function(req, res, next) {
    var security = new Security(req.query.ticker, req.query.yticker, req.query.country);
    var request = { action: req.query.action, security: security };
    var sender = zmq.socket('req').connect(zmqports.quote[0]);
    sender.on('message', (function(msg) {
        this.res.json(JSON.parse(msg));
        this.sender.close();
    }).bind({ res:res, sender: sender}));
    sender.send(JSON.stringify(request));
});

router.get('/futures', function(req, res, next) {
    var security = new Security(req.query.ticker, req.query.yticker, req.query.country);
    var request = { action: 'futures', security: security };
    var sender = zmq.socket('req').connect(zmqports.quote[0]);
    sender.on('message', (function(msg) {
        this.res.json(JSON.parse(msg));
        this.sender.close();
    }).bind({ res:res, sender: sender}));
    sender.send(JSON.stringify(request));
});

module.exports = router;
