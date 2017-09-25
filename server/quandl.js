var logger = require('../config/log');
var https = require('follow-redirects').https;
var auth_token = 'zTV2xEzhBzUTzg2sScz8';

function Quandl(agent) {
    this.agent = agent;
}

Quandl.prototype.table = function(security, onsuccess, onerror) {
    var data = "";
    var options = { host: 'www.quandl.com',
                   headers: { Host: 'quandl.com' },
                   agent: this.agent,
                   path: '/api/v3/datasets/'+security.ticker+'.json?api_key='+auth_token };

    logger.log('info','Quandl Received table request on '+security.ticker,'@',new Date().toLocaleTimeString());
    https.get(options, function(res) {
        res.setEncoding();
        res.on('data', function(chunk) { data += chunk; });
        res.on('error', function(err) { console.log('error',err); onerror(err); });
        res.on('end', function() {
            try {
                if (data!="") {
                    var data = JSON.parse(data);
                    onsuccess(toSeries(data.dataset.column_names, data.dataset.data));
                }
            } catch(err) { console.log(data); console.log('error',err); }
        });
    });
};

Quandl.prototype.timeseries = function(security, onsuccess, onerror) {
    var data = "";
    var options = { host: 'www.quandl.com',
                    headers: { Host: 'www.quandl.com' },
                    agent: this.agent,
                    path: '/api/v3/datasets/'+security.ticker+'/data.json?api_key='+auth_token };

    https.get(options, function(res) {
        res.setEncoding();
        res.on('data', function(chunk) { data += chunk; });
        res.on('error', function(err) { console.log('error',err); onerror(err); });
        res.on('end', function() {
            try {
                if (data && data!="") {
                    data = JSON.parse(String(data));
                    onsuccess(toSeries(data.dataset_data.column_names, data.dataset_data.data));
                }
            } catch(err) { console.log(data); console.log('error',err); }
        });
    });
};

function toSeries(columns, series) {
    var results = {};
    var dates = series.map(function(e) { return new Date(e[0]).fromGMTDate().getTime(); });
    columns.shift();
    columns.forEach(function(e,i) { 
        results[e] = series.map(function(e2,j) { return [ dates[j], e2[i+1] ]; });
    });
    return results;
}

module.exports = Quandl;
