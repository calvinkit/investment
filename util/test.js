var util = require('util');
var assert = require('assert');
var stat = require('./statistics');
var Indicator = require('./indicator');

describe('PCA', function() {
    var PCA = require('./pca');
    var data = numeric.transpose([[7,4,3],[4,1,8],[6,3,5],[8,6,1],[8,5,7],[7,2,9],[5,3,3],[9,5,8],[7,4,5],[8,2,2]]);
    var pca = new PCA(data);
    var result = pca.calculate(3);
    it('PC1 vector is expected', function() {
        assert.deepStrictEqual(result[0], [7,3.999999999999995,5.999999999999998,8.000000000000004,8,6.999999999999994,5,8.999999999999998,6.999999999999999,7.999999999999998]);
    });
    it('PC3 vector is expected', function() {
        assert.deepStrictEqual(result[2], [2.9999999999999933, 7.999999999999993, 4.999999999999993, 0.9999999999999938, 6.999999999999991, 8.999999999999991, 2.9999999999999947, 7.999999999999989, 4.999999999999993, 1.999999999999994 ]);
    });
});

describe('Indicator', function() {
    var cache = require('../data/cache');
    var goog = cache.find({ticker:'GOOG'})[0];
    var yahoo = cache.find({ticker:'YHOO'})[0];
    var indicator = new Indicator(goog.quotes);
    it('RSI', function() {
        assert.deepStrictEqual(indicator.rsi(14).slice(-5),[0]);
    });
    it('SMA', function() {
        assert.deepStrictEqual(indicator.sma(10).slice(-5),[0]);
    });
    it('EMA', function() {
        assert.deepStrictEqual(indicator.rsi.slice(-5),[0]);
    });
    //it('RSI', function() {
    //    assert.deepStrictEqual(indicator.rsi.slice(-5),[0]);
    //});
    //it('RSI', function() {
    //    assert.deepStrictEqual(indicator.rsi.slice(-5),[0]);
    //});
    cache.close();
});
