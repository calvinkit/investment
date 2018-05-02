var util = require('util');
var cache = require('./cache');
//cache.init();
cache.refresh('NYSE');
//cache.toPortfolio();
//console.log(util.inspect(cache.find({ ticker: 'GOOG'})));
//cache.close();
