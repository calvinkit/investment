var http = require('follow-redirects').http;
var csv2array = require('csv2array');
var moment = require('moment');
var logger = require('../config/log');
var util = require('util');

function Google(agent) {
    this.agent = agent; 
}

// http://finance.google.com/finance?output=json&q="+security.ticker
Google.prototype.getprice = function(security, onsuccess, onerror) {
    var data = "";
    var options = { host: 'finance.google.com',
        headers: { Host: 'finance.google.com' },
        agent: this.agent,
        path: "/finance?output=json&q="+(security.country!="United States"?security.country+":":"US:")+security.ticker };

    if (!security || security.ticker=="") { logger.log('info','Why would security be null...'); logger.log('error',security); }

    http.get(options, function(res) {
        res.setEncoding();
        res.on('data', function(chunk) { data += chunk; });
        res.on('error', function(err) { logger.log('error', 'Google.getprice',security.ticker+err); onerror(security); });
        res.on('end', function() {
            try {
                if (res.statusCode == 404) throw data;
                data = data.replace(/\n/g,"").substring(3);
                data = data.replace(/\\.../g,"").replace(/,}/g,'}');
                logger.log('debug',data);
                if (data!="") populatePriceInfo(security,JSON.parse(data.replace(/\/\//g,""))[0]);
                logger.log('verbose','Google.getprice result returned', security.ticker);
                onsuccess(security);
            } catch (err) { 
                security.error = "Error in Google.GetPrice: "+security.ticker;
                logger.log('error','Google.getprice', security.ticker);
                logger.log('verbose','Google.getprice', err+data);
                onerror(security);
            }
        });
    });
}

//Refer to http://www.marketcalls.in/database/google-realtime-intraday-backfill-data.html
//https://www.google.com/finance/getprices?q={0}&x={1}&i=86400&p=3Y&f=d,c,v,k,o,h,l
//q - Stock symbol x - Stock exchange symbol on which stock is traded (ex: NASD)
//i - Interval size in seconds (86400 = 1 day intervals)
//p - Period. (A number followed by a "d" or "Y", eg. Days or years. Ex: 40Y = 40 years.)
//f - What data do you want? d (date - timestamp/interval, c - close, v - volume, etc...) 
//Note: Column order may not match what you specify here
//df - 
//ts - Starting timestamp (Unix format). If blank, it uses today.
Google.prototype.gethistory = function(security, intraday, onsuccess, onerror) {
    var data = "";
    var period = intraday?'5d':'8Y';
    var options = { host: 'www.google.com',
        headers: { Host: 'www.google..com' },
        agent: this.agent,
        path: 'http://finance.google.com/finance/getprices?q='+security.ticker+'&x='+(security.country!='United States'?security.country:'')+'&i='+(intraday?120:86400)+'&p='+period+'&f=d,c,v,k,o,h,l&' };

    http.get(options, function(res) { 
        res.setEncoding();
            res.on('data', function(chunk) { data += chunk; });
            res.on('error', function(err) { logger.log('error', 'Google.gethistory',security.ticker+'\r\n'); onerror(security); });
            res.on('end', function() {
                try {
                    if (res.statusCode == 404) { throw data; }
                    if (data!="") {
                        data = csv2array(data);
                        security = populateHistoricalQuotes(security, data);
                    }
                    logger.log('detail','Google.gethistory result:', security, data);
                    logger.log('verbose','Google.gethistory result returned:', security.ticker);
                    onsuccess(security);
                } catch (err) {
                    logger.log('error','Google.gethistory:', security.ticker);
                    logger.log('verbose','Google.gethistory:', err+data);
                    onerror(security);
                }
            });
    });
}

function populatePriceInfo(security, priceInfo) {
    security.name = priceInfo.name;
    security.exchange = priceInfo.e;
    if (security.country == 'MUTF_CA') {
        security.price = priceInfo.nav_prior==""?0:parseFloat(priceInfo.nav_prior.replace(",","")); 
        security.change = priceInfo.nav_c==""?0:parseFloat(priceInfo.nav_c);
        security.pchange = priceInfo.nav_cp==""?0:parseFloat(priceInfo.nav_cp); 
        if (security.quotes.length==0 || security.quotes.slice(-1)[0] != new Date().toGMTDate().getTime()) {
            security.quotes.push({ 
                date:new Date().toGMTDate().getTime(),
                price: security.price,
                vol: security.quotes.length>1?security.quotes[security.quotes.length-1]["vol"]:0,
                lo: security.price,
                hi: security.price
            });
        }
        security.holdings = priceInfo.topholdings;
    } else {
        security.price = priceInfo.l==""?0:parseFloat(priceInfo.l.replace(",","")); 
        security.change = priceInfo.c==""?0:parseFloat(priceInfo.c);
        security.pchange = priceInfo.cp==""?0:parseFloat(priceInfo.cp); 
        if (security.quotes.length==0 || security.quotes.slice(-1)[0] != new Date().toGMTDate().getTime()) {
            security.quotes.push({ 
                date:new Date().toGMTDate().getTime(),
                price: security.price,
                vol: security.quotes.length>1?security.quotes[security.quotes.length-1]["vol"]:0,
                lo: security.price,
                hi: security.price
            });
        }
    }
    return security;
}

function populateHistoricalQuotes(security, quotes) {
    security.quotes = new Array();
    security.exchange = quotes[0][0].substr(11,100);
    var interval = parseInt(quotes[3][0].split('=')[1])*1000;
    var columns = quotes[4];
    var anchor;
    for (var i=7; i<quotes.length; i++) {
        var e = quotes[i];
        if (e.length > 1)  {
            if (e[0].substr(0,8) == "TIMEZONE") 
                continue;
            else if (e[0].substr(0,1) == "a") 
                anchor = date = parseInt(e[0].substr(1,100))*1000;
            else
                date = anchor + parseInt(e[0])*interval;

            // date is a 4pm quote. Need to trim out the time
            date = new Date(new Date(date).toTimestamp()).getTime();
            security.quotes.push({ 
                date:date,
                price: parseFloat(e[1]),
                vol: parseFloat(e[5]),
                lo: parseFloat(e[3]),
                hi: parseFloat(e[2])
            });
        }
    }
    security.quotes.sort(function(a,b) { return (a.date<b.date?-1:1); });
    return security;
}

module.exports = Google;
