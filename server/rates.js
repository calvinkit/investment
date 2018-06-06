var sqlite = require('sqlite3');
var logger = require('../config/log');
var numeric = require('numeric');
var stat = require('../util/statistics.js');
var cusips = require('./../data/cusips');
var ratesDB = new sqlite.Database(__dirname+'/../data/Rates.db');

class RatesServer {
    constructor() {
    }

    gethistory(security, onsuccess, onerror) {
        var ticker = security.ticker.toLowerCase();
        logger.log('info','GetRates on '+ticker+'@'+new Date().toLocaleTimeString());
        var asOf = (security.asOf?new Date(security.asOf):new Date(new Date().toDateString()));
        var oldtickers = (ticker==null?new Array():ticker.split('/'));
        var tickers = oldtickers.map((e) => cusips.hasOwnProperty(e)?cusips[e]:e);
        var RatesWeights = security.RatesWeights?security.RatesWeights.split('/'):null;

        if (tickers.length == 1) {
            ratesDB.all("SELECT * FROM Historical WHERE CurveDate<=? AND Tenor IN (?) ORDER BY CurveDate ASC", asOf.getTime(), tickers[0], (err, rows) => {
                var data = new Array();
                if (rows.length == 0) return onerror(security, new Error(tickers[0] + ' is not in the database.'));
                security.quotes = rows.map((row) => { 
                    var val = Math.round(row.Quote*1000000)/10000;
                    return { date:row.CurveDate, open: val, hi: val, lo: val, price: val };
                });
                onsuccess(security);
            });
        } else if (tickers.length == 2) { // switch
            RatesWeights = RatesWeights?[-RatesWeights[0], RatesWeights[1]]:[-1,1];
            ratesDB.all("SELECT * FROM Historical WHERE CurveDate<=? AND Tenor IN (?,?) ORDER BY CurveDate ASC", asOf.getTime(), tickers[0], tickers[1], (err, rows) => {
                var wings = tickers.map((tenor) => rows.filter((row) => row.Tenor == tenor )); 
                if (wings[0].length == 0) return onerror(security, new Error(tickers[0] + ' is not in the database.'));
                if (wings[1].length == 0) return onerror(security, new Error(tickers[1] + ' is not in the database.'));
                var dates = stat.StripValues(MergeOnDates(wings.map(function(e) { return e.map(function(e2) { return [e2.CurveDate]; }); }))[0]);
                var wings = wings.map(function(w) { return w.filter(function(e) { return dates.indexOf(e.CurveDate)>-1; }); });
                var spd = numeric.dot(RatesWeights, wings.map(function(w) { return w.map(function(e) { return e.Quote; }); }));
                security.quotes = dates.map((e,i) => ({ date:e, open: spd[i]*100, hi: spd[i]*100, lo: spd[i]*100, price: spd[i]*100 }));
                onsuccess(security);
            });
        } else if (tickers.length == 3) { // fly
            RatesWeights = RatesWeights?[-parseFloat(RatesWeights[0]), parseFloat(RatesWeights[1]), -parseFloat(RatesWeights[2])]:[-1,2,-1];
            ratesDB.all("SELECT * FROM Historical WHERE CurveDate<=? AND Tenor IN (?,?,?) ORDER BY CurveDate ASC", asOf.getTime(), tickers[0], tickers[1], tickers[2], (err, rows) => {
                var wings = tickers.map(function(tenor) { return rows.filter(function(row) { return row.Tenor == tenor; }); });
                if (wings[0].length == 0) return onerror(security, new Error(tickers[0] + ' is not in the database.'));
                if (wings[1].length == 0) return onerror(security, new Error(tickers[1] + ' is not in the database.'));
                if (wings[2].length == 0) return onerror(security, new Error(tickers[2] + ' is not in the database.'));
                var dates = stat.StripValues(MergeOnDates(wings.map(function(e) { return e.map(function(e2) { return [e2.CurveDate]; }); }))[0]);
                var wings = wings.map(function(w) { return w.filter(function(e) { return dates.indexOf(e.CurveDate)>-1; }); });
                var fly = numeric.dot(RatesWeights, wings.map(function(w) { return w.map(function(e) { return e.Quote; }); }));
                security.quotes = dates.map((e,i) => ({ date:e, open: fly[i]*100, hi: fly[i]*100, lo: fly[i]*100, price: fly[i]*100 }));
                onsuccess(security);
            });
        } else if (tickers.length == 4) { // spread on spread
            RatesWeights = RatesWeights?[-RatesWeights[0], RatesWeights[1]]:[-1,1];
            ratesDB.all("SELECT * FROM Historical WHERE CurveDate<=? AND Tenor IN (?,?,?,?) ORDER BY CurveDate ASC", asOf.getTime(), tickers[0], tickers[1], tickers[2], tickers[3], (err, rows) => {
                var wings = tickers.map(function(tenor) { return rows.filter(function(row) { return row.Tenor == tenor; }); });
                if (wings[0].length == 0) return onerror(security, new Error(tickers[0] + ' is not in the database.'));
                if (wings[1].length == 0) return onerror(security, new Error(tickers[1] + ' is not in the database.'));
                if (wings[2].length == 0) return onerror(security, new Error(tickers[2] + ' is not in the database.'));
                if (wings[3].length == 0) return onerror(security, new Error(tickers[3] + ' is not in the database.'));
                var dates = stat.StripValues(MergeOnDates(wings.map(function(e) { return e.map(function(e2) { return [e2.CurveDate]; }); }))[0]);
                var wings = wings.map(function(w) { return w.filter(function(e) { return dates.indexOf(e.CurveDate)>-1; }); });
                var spd1 = numeric.dot([-1, 1], wings.slice(0,2).map(function(w) { return w.map(function(e) { return e.Quote; }); }));
                var spd2 = numeric.dot([-1, 1], wings.slice(2,4).map(function(w) { return w.map(function(e) { return e.Quote; }); }));
                var spd = numeric.dot(RatesWeights, [spd1, spd2]);
                security.quotes = dates.map((e,i) => ({ date:e, open: spd[i]*100, hi: spd[i]*100, lo: spd[i]*100, price: spd[i]*100 }));
                onsuccess(security);
            });
        } else if (tickers.length == 6) { // spread on fly
            RatesWeights = RatesWeights?[-RatesWeights[0],RatesWeights[1]]:[-1,1];
            ratesDB.all("SELECT * FROM Historical WHERE CurveDate<=? AND Tenor IN (?,?,?,?,?,?) ORDER BY CurveDate ASC", asOf.getTime(), tickers[0], tickers[1], tickers[2], tickers[3], tickers[4], tickers[5], (err, rows) => {
                var wings = tickers.map(function(tenor) { return rows.filter(function(row) { return row.Tenor == tenor; }); });
                if (wings[0].length == 0) return onerror(security, new Error(tickers[0] + ' is not in the database.'));
                if (wings[1].length == 0) return onerror(security, new Error(tickers[1] + ' is not in the database.'));
                if (wings[2].length == 0) return onerror(security, new Error(tickers[2] + ' is not in the database.'));
                if (wings[3].length == 0) return onerror(security, new Error(tickers[3] + ' is not in the database.'));
                if (wings[4].length == 0) return onerror(security, new Error(tickers[4] + ' is not in the database.'));
                if (wings[5].length == 0) return onerror(security, new Error(tickers[5] + ' is not in the database.'));
                var dates = stat.StripValues(MergeOnDates(wings.map(function(e) { return e.map(function(e2) { return [e2.CurveDate]; }); }))[0]);
                var wings = wings.map(function(w) { return w.filter(function(e) { return dates.indexOf(e.CurveDate)>-1; }); });
                var fly1 = numeric.dot([-1,2,-1], wings.slice(0,3).map(function(w) { return w.map(function(e) { return e.Quote; }); }));
                var fly2 = numeric.dot([-1,2,-1], wings.slice(3,6).map(function(w) { return w.map(function(e) { return e.Quote; }); }));
                var spd = numeric.dot(RatesWeights, [fly1, fly2]);
                security.quotes = dates.map((e,i) => ({ date:e, open: spd[i]*100, hi: spd[i]*100, lo: spd[i]*100, price: spd[i]*100 }));
                onsuccess(security);
            });
        }
    };
}

module.exports = RatesServer;

