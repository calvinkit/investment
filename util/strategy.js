function StockFilter() {
    var criterias = this.criterias = new Array();
    criterias.push(function(security) {
        var indicators = security.indicators;
        var statistics = security.statistics;
        var returns = security.returns;
        return (
                security.quotes.length > 50 &&
                returns['14d'].slice(-10).every(function(e,i,d) { return e[1] <= d[Math.max(0,i-1)][1]; }) &&
                security.quotes.slice(-2)[0].price > indicators["ema100"].slice(-2)[0][1] &&
                security.price < indicators["ema100"].slice(-1)[0][1] &&
                true
                );
    });
    criterias[criterias.length-1].description='Falling 14-d return for the previous 10 days and just dip-below off 100d ema';

    criterias.push(function(security) {
        var indicators = security.indicators;
        var statistics = security.statistics;
        var returns = security.returns;
        var count = 0;
        return (
                security.quotes.length > 50 &&
                returns['14d'].slice(-20).every(function(e,i,d) { if (e[1] <= d[Math.max(0,i-1)][1]) count++; return true; }) &&
                count >= 15 &&
                ((security.quotes.slice(-11,-1).every(function(e,i,d) { return e.price > indicators["ema100"].slice(-11,-1)[i][1]; }) &&
                 security.quotes.slice(-1).price < indicators["ema100"].slice(-1)[1]) || 
                 (security.quotes.slice(-11,-1).every(function(e,i,d) { return e.price > indicators["ema50"].slice(-11,-1)[i][1]; }) &&
                 security.quotes.slice(-1).price < indicators["ema50"].slice(-1)[1])) &&
                true
                );
    });
    criterias[criterias.length-1].description='15+ down in 14p return for the past 20 periods, just dip below 100p ema or 50p ema';

    criterias.push(function(security) {
        var indicators = security.indicators;
        var statistics = security.statistics;
        var returns = security.returns;
        var count = 0;
        return (
                security.quotes.length > 50 &&
                returns['14d'].slice(-20).every(function(e,i,d) { if (e[1] >= d[Math.max(0,i-1)][1] && e[1] >= 0) count++; return true; }) &&
                count >= 15 &&
                ((security.quotes.slice(-11,-1).every(function(e,i,d) { return e.price < indicators["ema100"].slice(-11,-1)[i][1]; }) &&
                 security.quotes.slice(-1).price >= indicators["ema100"].slice(-1)[1]) || 
                 (security.quotes.slice(-11,-1).every(function(e,i,d) { return e.price < indicators["ema50"].slice(-11,-1)[i][1]; }) &&
                 security.quotes.slice(-1).price >= indicators["ema50"].slice(-1)[1])) &&
                true
                );
    });
    criterias[criterias.length-1].description='15+ up and +ve in 14p return for the past 20 periods, just pass 100p ema or 50p ema';

    criterias.push(function criteria4(security) {
        var indicators = security.indicators;
        var statistics = security.statistics;
        var returns = security.returns;
        var count = 0;
        return (
                security.quotes.length > 50 &&
                returns['14d'].slice(-20).every(function(e,i,d) { if (e[1]<=0) count++; return true; }) &&
                count >=15 &&
                indicators["rsi"].slice(-1)[0][1] < 30 &&
                true
                );
    });
    criterias[criterias.length-1].description='15+ down in 14p return over the past 20 periods, and rsi below 32';

    criterias.push(function (security) {
        var indicators = security.indicators;
        var statistics = security.statistics;
        var returns = security.returns;
        var count = 0;
        return (
                security.quotes.length > 50 &&
                (indicators["rsi"].slice(-1)[0][1] <= 30 ||
                 indicators["rsi"].slice(-1)[0][1] >= 70) &&
                true
                );
    });
    criterias[criterias.length-1].description='RSI below 30 or higher than 70';
}

if (typeof module != "undefined") 
    module.exports = new StockFilter();
else
    var criterias = new StockFilter();
