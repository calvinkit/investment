var zmq = require('zeromq');
var router = require('express').Router();
var zmqports = require('../config/zmq')();

router.subscribe('/:name', function(req, res, next) {
    var name = req.params['name'];
    var request = { action: 'subscribe', name: name };
    // Subscript the portfolio
    // Allow the portfolio push notifications to the subscriber
});

router.unsubscribe('/', function(req, res, next) {
    var request = { action: 'unsubscribe' };
    // Remove all subscriptions for this client 
});

router.get('/:name', function(req, res, next) {
    var name = req.params['name'];
    var request = { action: 'get', name: name };
    // Get portfolio object to the client
});

router.put('/:name', function(req, res, next) {
    var name = req.params['name'];
    var portfolio = req.params['portfolio'];
    var request = { action: 'get', name: name, portfolio: portfolio };
    // Update portfolio 
});

module.exports = router;
