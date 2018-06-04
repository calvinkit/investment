var http = require('http');
var express = require('express');
var session = require('express-session');
var bodyParser = require('body-parser');
var path = require('path');
var app = express();
var server = http.createServer(app);
var util = require('util');

var routes = require('./routes/index');
var quotes = require('./routes/quotes');
var portfolio = require('./routes/portfolio');
var vix = require('./routes/vix');
var regress = require('./routes/regression');
var url = require('./routes/url');

// Setup on zmq/socket.io
var io = require('socket.io').listen(server);
var zmq = require('zeromq');
var zmqports = require('./config/zmq')(true);
var logger = require('./config/log');
var Security = require('./lib/security');
var fs = require('fs');

// Spawn worker server server
var fork = require('child_process').fork;
var workers = new Array();
// k2 stuff
//for (var i=0; i<2; i++) workers.push(fork(__dirname+'/server/rates'));
for (var i=0; i<5; i++) workers.push(fork(__dirname+'/server/quote'));
for (var i=0; i<1; i++) workers.push(fork(__dirname+'/server/regression'));
for (var i=0; i<1; i++) workers.push(fork(__dirname+'/server/portfolio')); // there shd be only 1 portoflio server

var p_req = {};

// setup passport
var passport = require('passport');
var GoogleOAuth = require('passport-google-oauth').OAuthStrategy;
passport.use('provider', new GoogleOAuth(
    {
        consumerKey: '1064879537388-ifm31din0o583h13q5bhokp0dvlepvv7.apps.googleusercontent.com',
        consumerSecret: 'GSPcYES1rZ5QQUUBX8MFy91u',
        callbackURL: "/auth/google/callback"
    },
    function(token, tokenSecret, profile, done) {
        User.findOrCreate({ googleId: profile.id }, function (err, user) {
            return done(err, user);
        });
    }
));
// GET /auth/google
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  The first step in Google authentication will involve
//   redirecting the user to google.com.  After authorization, Google
//   will redirect the user back to this application at /auth/google/callback
app.get('/auth/google',
        passport.authenticate('google', { scope: ['https://www.googleapis.com/auth/plus.login'] }));

// GET /auth/google/callback
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  If authentication fails, the user will be redirected back to the
//   login page.  Otherwise, the primary route function function will be called,
//   which, in this example, will redirect the user to the home page.
app.get('/auth/google/callback', 
        passport.authenticate('google', { failureRedirect: '/login' }),
        function(req, res) {
        res.redirect('/');
        });
        

// view engine setup
var cors = require('cors');
app.use(cors({origin:'http://localhost.com', optionsSuccessStatus: 200})); //allow cross-origin-resource sharing
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.set('json space',2);
app.locals.pretty = true;
app.use(bodyParser.urlencoded({extended:false}));
app.use(bodyParser.json());

app.use(express.static(path.join(__dirname, 'service')));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'node_modules')));
app.get('/js/statistics.js',function(req, res) { res.sendFile(__dirname+'/util/statistics.js') });
app.get('/js/indicator.js',function(req, res) { res.sendFile(__dirname+'/util/indicator.js') });

app.use('/', routes);
app.use('/portfolio', portfolio);
app.use('/quotes', quotes);
app.use('/vix', vix);
app.use('/regression', regress);
app.use('/url', url);

app.subscribe('/portfolio', function(req, res, next) {
    var id = req.body.id;
    var portfolioName = req.body.portfolio;
    var portfolioSince = req.body.portfolioSince;
    p_req[id].send(['',JSON.stringify( { action: 'unsubscribe' })]);
    if (portfolioName != "") {
        var request = { action: 'subscribe', portfolioName: portfolioName, since: portfolioSince, closedPos: req.body.closedPos };
        p_req[id].send(['',JSON.stringify(request)]);
    }
});

io.on('connection', function (socket) {
    logger.log('info','Client connected:', socket.request.connection.remoteAddress);

    // Portfolio request/reply
    p_req[socket.id] = zmq.socket('dealer');
    p_req[socket.id].identity = socket.id;
    p_req[socket.id].connect(zmqports.portfolio[0]);
    p_req[socket.id].on('message', (function(portfolio, investment) {
        this.socket.emit('investment', portfolio.toString(), JSON.parse(investment));
    }).bind({ socket:socket }));

    // Stock Screen request/reply
    var q_req = zmq.socket('dealer').connect(zmqports.quote[0]);
    q_req.on('message', function() {
        socket.emit('stock screen result', JSON.parse(arguments[arguments.length-1]));
    });

    // Web services
    //socket.on("stock screen", function(exchange,index,sector) {
    //    exchange = new RegExp(exchange);
    //    index = new RegExp(index);
    //    sector = new RegExp(sector);
    //    var filtered = universe.filter(function(security) { return exchange.test(security[0]) && index.test(security[1]) && sector.test(security[4]); });
    //    filtered.forEach(function(s) {
    //        var security = new Security(s[2],s[2].replace('-','-P'),s[0],s[3])
    //        security.sector = s[4]; security.industry = s[5];
    //        q_req.send(['', JSON.stringify({ action: 'quotes', security: security })]);
    //    });
    //});

    socket.on('disconnect', function () {
        logger.log('info','Client disconnected');
        var request = { action: 'unsubscribe'};
        p_req[socket.id].send(['',JSON.stringify(request)]);
        p_req[socket.id].close();
        p_req[socket.id] = null;
        q_req.close();
    });
});

process.on('uncaughtException', function(err) { logger.log('error','Uncaught Exception '+err); });
process.on('exit', function() { console.log('exiting...'); for (var i=0; i<workers.length; i++) workers[i].emit('exit'); });

server.listen(4000);
logger.log('info','Server app up and running on port 4000');

//if (process.platform === "win32") {
//    var rl = require("readline").createInterface({
//        input: process.stdin,
//        output: process.stdout
//    });
//
//    rl.on("SIGINT", function () {
//        process.emit("SIGINT");
//    });
//}
//process.on('SIGINT', function() { console.log('exiting...'); for (var i=0; i<workers.length; i++) workers[i].emit('SIGINT'); });
