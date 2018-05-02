var http = require('follow-redirects').https;
var csv2array = require('csv2array');
var moment = require('moment');
var logger = require('../config/log');
var util = require('util');

class AlphaVantage {
    constructor(agent) {
        this.agent = agent; 
    }

    // https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=TSE:XIU&apikey=BZ7PZOM050R6M03T&datatype=csv
    gethistory(security, bAdjClose, onsuccess, onerror) {
        var data = "";
        var options = { host: 'www.alphavantage.co',
            headers: { Host: 'www.alphavantage.co' },
            agent: this.agent,
            path: 'https://www.alphavantage.co/query?function=TIME_SERIES_DAILY_ADJUSTED&apikey=BZ7PZOM050R6M03T&datatype=csv&outputsize=full&symbol='+(security.country!='United States'?security.country+':':'')+security.ticker };

        http.get(options, (res) => { 
            res.setEncoding();
            try {
                res.on('data', (chunk) => { data += chunk; } );
                res.on('error', (err) => { logger.log('error', 'AlphaVantage.gethistory',security.ticker+'\r\n'+err); onerror(security); });
                res.on('end', () => {
                    if (res.statusCode == 404) { throw data; }
                    if (data!="") {
                        security = populateHistoricalQuotes(security, true, csv2array(data));
                    }
                    logger.log('detail','AlphaVantage.gethistory result:', security);
                    logger.log('verbose','AlphaVantage.gethistory result returned:', security.ticker);
                    onsuccess(security);
                });
            } catch (err) {
                logger.log('error','AlphaVantage.gethistory:', [security.ticker,String(data).substr(0,100),err].join('\r\n'));
                onerror(security);
            }
        });
    }

    getprice(security, onsuccess, onerror) {
        var data = "";
        var options = { host: 'www.alphavantage.co',
            headers: { Host: 'www.alphavantage.co' },
            agent: this.agent,
            path: 'https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&apikey=BZ7PZOM050R6M03T&datatype=csv&symbol='+(security.country!='United States'?security.country+':':'')+security.ticker };

        http.get(options, function(res) { 
            res.setEncoding();
            res.on('data', function(chunk) { data += chunk; });
            res.on('error', function(err) { logger.log('error', 'AlphaVantage.gethistory',security.ticker+'\r\n'+err); onerror(security); });
            res.on('end', function() {
                try {
                    if (res.statusCode == 404) { throw data; }
                    if (data!="") {
                        security = populateHistoricalQuotes(security, false, csv2array(data));
                    }
                    logger.log('detail','AlphaVantage.gethistory result:', security);
                    logger.log('verbose','AlphaVantage.gethistory result returned:', security.ticker);
                    onsuccess(security);
                } catch (err) {
                    logger.log('error','AlphaVantage.gethistory:', [security.ticker,String(data).substr(0,100),err].join('\r\n'));
                    onerror(security);
                }
            });
        });
    }
}

function populateHistoricalQuotes(security, bAdjClose, quotes) {
    security.quotes = new Array();
    for (var i=1; i<quotes.length; i++) {
        var e = quotes[i];
        security.quotes.push({ 
            date: new Date(e[0]).toGMTDate().getTime(),
            price: bAdjClose?parseFloat(e[5]):parseFloat(e[4]),
            vol: parseFloat(e[5]),
            lo: parseFloat(e[3]),
            hi: parseFloat(e[2])});
    }
    security.quotes.sort(function(a,b) { return (a.date<b.date?-1:1); });

    var latest = security.quotes.slice(-1)[0];
    var latest2 = security.quotes.slice(-2)[0];
    security.price = latest.price;
    security.change = latest.price-latest2.price;
    security.pchange = security.change/latest2.price*100;

    return security;
}

module.exports = AlphaVantage;
