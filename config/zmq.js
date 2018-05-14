var zmq = require('zeromq');

module.exports = function (server) {
    if (server) {
        // quote broker
        var frontend = zmq.socket('router');
        var backend = zmq.socket('dealer');
        frontend.bindSync('tcp://127.0.0.1:9500');
        backend.bindSync('tcp://127.0.0.1:9501');
        frontend.on('message', function() { backend.send(Array.apply(null, arguments)); });
        backend.on('message', function() { frontend.send(Array.apply(null, arguments)); });

        // regression job broker
        var frontend2 = zmq.socket('router');
        var backend2 = zmq.socket('dealer');
        frontend2.bindSync('tcp://127.0.0.1:9502');
        backend2.bindSync('tcp://127.0.0.1:9503');
        frontend2.on('message', function() { backend2.send(Array.apply(null, arguments)); });
        backend2.on('message', function() { frontend2.send(Array.apply(null, arguments)); });

        // rates job broker
        var frontend3 = zmq.socket('router');
        var backend3 = zmq.socket('dealer');
        frontend3.bindSync('tcp://127.0.0.1:9507');
        backend3.bindSync('tcp://127.0.0.1:9508');
        frontend3.on('message', function() { backend3.send(Array.apply(null, arguments))} );
        backend3.on('message', function() { frontend3.send(Array.apply(null, arguments)) });
    }
    return { quote: ['tcp://127.0.0.1:9500','tcp://127.0.0.1:9501'], 
             regression: ['tcp://127.0.0.1:9502','tcp://127.0.0.1:9503'],
             single: ['tcp://127.0.0.1:9507','tcp://127.0.0.1:9508'],
             portfolio: ['tcp://127.0.0.1:9504','tcp://127.0.0.1:9504'],
             quandl: ['tcp://127.0.0.1:9505','tcp://127.0.0.1:9506'] };
};
