var http = require('follow-redirects').http;
var csv2array = require('csv2array');
var moment = require('moment');
var logger = require('../config/log');
var util = require('util');

function Yahoo(agent) {
    this.agent = agent;
}

Yahoo.prototype.getprice = function(security, onsuccess, onerror) {
    var sql = encodeURIComponent("select * FROM yahoo.finance.quotes where symbol in ")+"('"+security.yticker+(security.country!="United States"?'.'+security.country:'')+"')";
    var data = "";
    sql += "&env="+encodeURIComponent("store://datatables.org/alltableswithkeys")+"&format=json";
    var options = { host: 'query.yahooapis.com',
        headers: { Host: 'query.yahooapis.com' },
        agent: this.agent,
        path: '/v1/public/yql?q='+sql };

    http.get(options, function(res) {
        res.setEncoding();
        res.on('data', function(chunk) { data += chunk; });
        res.on('error', function(err) { logger.log('error', 'YahooGetPrice',security.ticker, err); onerror({error: 'Error in getting price'})});
        res.on('end', function() {
            try {
                if (data!="") {
                    onsuccess(populatePriceInfo(security, JSON.parse(data)));
                    logger.log('detail','Yahoo.getprice result: ',data);
                }
            } catch(err) { 
                logger.log('error', security.ticker, err); 
                onerror({error: 'Error in get YahooGetPrice'})
            }
        });
    });
}

//http://ichart.finance.yahoo.com/table.csv?s={0}&a=0&b=1&c=2000&f=dohlcv' };
Yahoo.prototype.gethistory = function(security, intraday, onsuccess, onerror) {
    var data = "";
    var options = { host: 'ichart.finance.yahoo.com',
        headers: { Host: 'ichart.finance.yahoo.com' },
        agent: this.agent,
        path: 'http://ichart.finance.yahoo.com/table.csv?s='+security.yticker+(security.country!='United States'?'.TO':'')+'&a='+this.fromDate.month()+'&b='+this.fromDate.date()+'&c='+this.fromDate.year()+'&f=dohlcv' };

    http.get(options, function(res) {
        res.setEncoding();
        res.on('data', function(chunk) { data += chunk; });
        res.on('error', function(err) { logger.log('error', security.ticker, err); onerror(security); });
        res.on('end', function() {
            try {
                if (data.substr(0,4) == "Date") {
                    data = csv2array(data);
                    data.splice(0,1);
                    security = populateHistoricalQuotes(security, data);
                }
                onsuccess(security);
                logger.log('detail','QuoteServer.yahoo_gethistory result:', security.ticker, data);
            } catch (err) {
                onerror(security);
                logger.log('error','QuoteServer.yahoo_gethistory:', security.ticker, err);
            }
        });
    });
}

Yahoo.prototype.getdetails = function(security, onsuccess, onerror) {
    var sql = encodeURIComponent("select * FROM yahoo.finance.stocks where symbol in ")+"('"+security.yticker+(security.country=="Canada"?'.TO':'')+"')";
    var data = "";
    sql += "&env="+encodeURIComponent("store://datatables.org/alltableswithkeys")+"&format=json";
    var options = { host: 'query.yahooapis.com',
        headers: { Host: 'query.yahooapis.com' },
        agent: this.agent,
        path: "http://query.yahooapis.com/v1/public/yql?q="+sql };

    http.get(options, function(res) { 
            res.setEncoding();
            res.on('data', function(chunk) { data += chunk; }); 
            res.on('error', function(err) { logger.log('error', 'YahooGetDetails',security.ticker, err); onerror(security); });
            res.on('end', function() { 
                try {
                    if (this.statusCode == 200) {
                        var details = JSON.parse(data);
                        security.sector = (details.query.results.stock.Sector || "Unknown");
                        security.industry = (details.query.results.stock.Industry || "Unknown");
                    }
                    onsuccess(security);
                    logger.log('detail','QuoteServer.yahoo_getdetails result:', security.ticker, data);
                } catch(err) { 
                    onerror(security);
                    logger.log('error','QuoteServer.yahoo_getdetails:', [security.ticker,data,err].join('\r\n'));
                }
            }); 
    });
}

function populatePriceInfo(security, priceInfo) {
    priceInfo = priceInfo.query.results.quote;
    security.price = parseFloat(priceInfo.LastTradePriceOnly); 
    security.change = parseFloat(priceInfo.Change); 
    security.pchange = parseFloat(priceInfo.PercentChange);
    security.exchange = priceInfo.StockExchange;
    return security;
}

function populateHistoricalQuotes(security, quotes) {
    security.quotes = new Array();
    quotes.forEach(function(e) {
        if (e.length > 1 ) 
            security.quotes.push({ 
                date:moment(e[0]).toDate().getTime(), 
                price: parseFloat(e[4]),
                vol: parseFloat(e[5]),
                lo: parseFloat(e[3]),
                hi: parseFloat(e[2])
            });
    });
    security.quotes.sort(function(a,b) { return (a.date<b.date?-1:1); });
    return security;
}

module.exports = Yahoo;
