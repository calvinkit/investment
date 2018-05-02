var https = require('follow-redirects').https;
var logger = require('../config/log');
var util = require('util');

class CNBC {
    constructor(agent) {
        this.agent = agent;
    }

    //https://quote.cnbc.com/quote-html-webservice/quoteform.htm
    //https://quote.cnbc.com/quote-html-webservice/quote.htm?symbols=@CL.1&requestMethod=quick&exthrs=1&noform=1&fund=1&output=json&
    getprice(security, onsuccess, onerror) {
        var data = "";
        var options = { host: 'quote.cnbc.com',
            headers: { Host: 'quote.cnbc.com' },
            agent: this.agent,
            path: "/quote-html-webservice/quote.htm?output=json&symbols="+security.ticker };

        https.get(options, (res) => {
            res.setEncoding();
            res.on('data', (chunk) => { data += chunk; });
            res.on('error', (err) => { logger.log('error', security.ticker, err); onerror({error: 'Error in CNBCGetPrice'})});
            res.on('end', () => {
                try {
                    if (data!="") populatePriceInfo(security, JSON.parse(data), 'cnbc');
                    onsuccess(security);
                    logger.log('verbose','QuoteServer.cnbc_getprice result:', security.ticker);
                } catch(err) { logger.log('error', security.ticker, err); onerror({error: 'Error in CNBCGetPrice'})}
            });
        });
    }
}

function populatePriceInfo(security, priceInfo) {
    logger.log('detail', util.inspect(priceInfo));
    priceInfo = priceInfo.QuickQuoteResult.QuickQuote;
    security.name = priceInfo.onAirName;
    security.price = parseFloat(priceInfo.last);
    security.change = parseFloat(priceInfo.change);
    security.pchange = Math.round(security.change/parseFloat(priceInfo.previous_day_closing)*10000)/100;
    security.exchange = priceInfo.exchange;
    return security;
}

module.exports = CNBC;
