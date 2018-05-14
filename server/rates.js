var zmq = require('zeromq');
var sqlite = require('sqlite3');
var logger = require('../config/log');
var zmqports = require('../config/zmq')(false);
var numeric = require('numeric');
var stat = require('../util/statistics.js');
var cusips = require('./../data/cusips');
var ratesDB = new sqlite.Database(__dirname+'/../data/Rates.db');

class RatesServer {
    constructor() {
        logger.log('info','RatesServer ('+process.pid+') running in '+(process.env.HTTP_PROXY?"Proxy":"Direct")+" mode on "+zmqports.single[1]);
        this.responder = zmq.socket('rep').connect(zmqports.single[1]);
        this.responder.on('message', (msg) => this.getHistory(JSON.parse(msg)));;
    }

    getHistory(msg) {
        var msg = msg.security;
        msg.Tenor = msg.ticker.toLowerCase();
        logger.log('info','GetRates on '+msg.Tenor+'@'+new Date().toLocaleTimeString());
        var asOf = (msg.asOf?new Date(msg.asOf):new Date(new Date().toDateString()));
        var oldTenor = (msg.Tenor==null?new Array():msg.Tenor.split('/'));
        var Tenor = oldTenor.map((e) => cusips.hasOwnProperty(e)?cusips[e]:e);
        var RatesWeights = msg.RatesWeights?msg.RatesWeights.split('/'):null;

        if (Tenor.length == 1) {
            ratesDB.all("SELECT * FROM Historical WHERE CurveDate<=? AND Tenor IN (?) ORDER BY CurveDate ASC", asOf.getTime(), Tenor[0], (err, rows) => {
                var data = new Array();
                if (rows.length == 0) return onerror( { socket: this.responder, message: Tenor[0] + ' is not in the database.'});
                msg.quotes = rows.map((row) => { 
                    var val = Math.round(row.Quote*1000000)/1000000;
                    return { date:row.CurveDate, open: val, hi: val, lo: val, price: val };
                });
                this.responder.send(JSON.stringify(msg));
            });
        } else if (Tenor.length == 2) { // switch
            RatesWeights = RatesWeights?[-RatesWeights[0], RatesWeights[1]]:[-1,1];
            ratesDB.all("SELECT * FROM Historical WHERE CurveDate<=? AND Tenor IN (?,?) ORDER BY CurveDate ASC", asOf.getTime(), Tenor[0], Tenor[1], (err, rows) => {
                var wings = Tenor.map((tenor) => rows.filter((row) => row.Tenor == tenor )); 
                if (wings[0].length == 0) return onerror({ socket: this.responder, message: Tenor[0] + ' is not in the database.'});
                if (wings[1].length == 0) return onerror({ socket: this.responder, message: Tenor[1] + ' is not in the database.'});
                var dates = stat.StripValues(MergeOnDates(wings.map(function(e) { return e.map(function(e2) { return [e2.CurveDate]; }); }))[0]);
                var wings = wings.map(function(w) { return w.filter(function(e) { return dates.indexOf(e.CurveDate)>-1; }); });
                var spd = numeric.dot(RatesWeights, wings.map(function(w) { return w.map(function(e) { return e.Quote; }); }));
                msg.quotes = dates.map((e,i) => ({ date:e, open: spd[i]*100, hi: spd[i]*100, lo: spd[i]*100, price: spd[i]*100 }));
                this.responder.send(JSON.stringify(msg));
            });
        } else if (Tenor.length == 3) { // fly
            RatesWeights = RatesWeights?[-parseFloat(RatesWeights[0]), parseFloat(RatesWeights[1]), -parseFloat(RatesWeights[2])]:[-1,2,-1];
            ratesDB.all("SELECT * FROM Historical WHERE CurveDate<=? AND Tenor IN (?,?,?) ORDER BY CurveDate ASC", asOf.getTime(), Tenor[0], Tenor[1], Tenor[2], (err, rows) => {
                var wings = Tenor.map(function(tenor) { return rows.filter(function(row) { return row.Tenor == tenor; }); });
                if (wings[0].length == 0) { onerror({ socket: this.responder, message: Tenor[0] + ' is not in the database.'}); return; }
                if (wings[1].length == 0) { onerror({ socket: this.responder, message: Tenor[1] + ' is not in the database.'}); return; }
                if (wings[2].length == 0) { onerror({ socket: this.responder, message: Tenor[2] + ' is not in the database.'}); return; }
                var dates = stat.StripValues(MergeOnDates(wings.map(function(e) { return e.map(function(e2) { return [e2.CurveDate]; }); }))[0]);
                var wings = wings.map(function(w) { return w.filter(function(e) { return dates.indexOf(e.CurveDate)>-1; }); });
                var fly = numeric.dot(RatesWeights, wings.map(function(w) { return w.map(function(e) { return e.Quote; }); }));
                msg.quotes = dates.map((e,i) => ({ date:e, open: fly[i]*100, hi: fly[i]*100, lo: fly[i]*100, price: fly[i]*100 }));
                this.responder.send(JSON.stringify(msg));
            });
        } else if (Tenor.length == 4) { // spread on spread
            RatesWeights = RatesWeights?[-RatesWeights[0], RatesWeights[1]]:[-1,1];
            ratesDB.all("SELECT * FROM Historical WHERE CurveDate<=? AND Tenor IN (?,?,?,?) ORDER BY CurveDate ASC", asOf.getTime(), Tenor[0], Tenor[1], Tenor[2], Tenor[3], (err, rows) => {
                var wings = Tenor.map(function(tenor) { return rows.filter(function(row) { return row.Tenor == tenor; }); });
                if (wings[0].length == 0) { onerror({ socket: this.responder, message: Tenor[0] + ' is not in the database.'}); return; }
                if (wings[1].length == 0) { onerror({ socket: this.responder, message: Tenor[1] + ' is not in the database.'}); return; }
                if (wings[2].length == 0) { onerror({ socket: this.responder, message: Tenor[2] + ' is not in the database.'}); return; }
                if (wings[3].length == 0) { onerror({ socket: this.responder, message: Tenor[3] + ' is not in the database.'}); return; }
                var dates = stat.StripValues(MergeOnDates(wings.map(function(e) { return e.map(function(e2) { return [e2.CurveDate]; }); }))[0]);
                var wings = wings.map(function(w) { return w.filter(function(e) { return dates.indexOf(e.CurveDate)>-1; }); });
                var spd1 = numeric.dot([-1, 1], wings.slice(0,2).map(function(w) { return w.map(function(e) { return e.Quote; }); }));
                var spd2 = numeric.dot([-1, 1], wings.slice(2,4).map(function(w) { return w.map(function(e) { return e.Quote; }); }));
                var spd = numeric.dot(RatesWeights, [spd1, spd2]);
                msg.quotes = dates.map((e,i) => ({ date:e, open: spd[i]*100, hi: spd[i]*100, lo: spd[i]*100, price: spd[i]*100 }));
                this.responder.send(JSON.stringify(msg));
            });
        } else if (Tenor.length == 6) { // spread on fly
            RatesWeights = RatesWeights?[-RatesWeights[0],RatesWeights[1]]:[-1,1];
            ratesDB.all("SELECT * FROM Historical WHERE CurveDate<=? AND Tenor IN (?,?,?,?,?,?) ORDER BY CurveDate ASC", asOf.getTime(), Tenor[0], Tenor[1], Tenor[2], Tenor[3], Tenor[4], Tenor[5], (err, rows) => {
                var wings = Tenor.map(function(tenor) { return rows.filter(function(row) { return row.Tenor == tenor; }); });
                if (wings[0].length == 0) { onerror({ socket: this.responder, message: Tenor[0] + ' is not in the database.'}); return; }
                if (wings[1].length == 0) { onerror({ socket: this.responder, message: Tenor[1] + ' is not in the database.'}); return; }
                if (wings[2].length == 0) { onerror({ socket: this.responder, message: Tenor[2] + ' is not in the database.'}); return; }
                if (wings[3].length == 0) { onerror({ socket: this.responder, message: Tenor[3] + ' is not in the database.'}); return; }
                if (wings[4].length == 0) { onerror({ socket: this.responder, message: Tenor[4] + ' is not in the database.'}); return; }
                if (wings[5].length == 0) { onerror({ socket: this.responder, message: Tenor[5] + ' is not in the database.'}); return; }
                var dates = stat.StripValues(MergeOnDates(wings.map(function(e) { return e.map(function(e2) { return [e2.CurveDate]; }); }))[0]);
                var wings = wings.map(function(w) { return w.filter(function(e) { return dates.indexOf(e.CurveDate)>-1; }); });
                var fly1 = numeric.dot([-1,2,-1], wings.slice(0,3).map(function(w) { return w.map(function(e) { return e.Quote; }); }));
                var fly2 = numeric.dot([-1,2,-1], wings.slice(3,6).map(function(w) { return w.map(function(e) { return e.Quote; }); }));
                var spd = numeric.dot(RatesWeights, [fly1, fly2]);
                msg.quotes = dates.map((e,i) => ({ date:e, open: spd[i]*100, hi: spd[i]*100, lo: spd[i]*100, price: spd[i]*100 }));
                this.responder.send(JSON.stringify(msg));
            });
        }
    };
}

onerror = function(err) {
    err.message += ' Please refer to help on the syntax for the symbol.';
    err.socket.send(JSON.stringify({error: err}));
    logger.log('error','GetRates:'+JSON.stringify(err.message));
}

process.on('uncaughtException', function(err) { logger.log('error','Uncaught Exception '+err); });
process.on('exit', function(err) { logger.log('info','RatesServer ('+process.id+') exiting...'); });
process.on('SIGINT', function(err) { logger.log('info','RatesServer ('+process.id+') exiting...'); });
module.exports = new RatesServer;

