class Indicator {
    constructor(quotes) {
        this.vols = quotes.map(e => e.vol);
        this.dates = quotes.map(e => e.date);
        this.closes = quotes.map(e => e.price);
        this.lo = quotes.map(e => e.lo);
        this.hi = quotes.map(e => e.hi);
        this.series = quotes.map(e => [e.date, e.price]);
    }

    pivots() {
        var pivots = new Array();
        for (var i=0; i<this.closes.length; i++) {
            var p = (this.closes[i]+this.hi[i]+this.lo[i])/3;   // Avg of hi/lo/close
            var R1 = 2*p-this.lo[i];                            
            var S1 = 2*p-this.hi[i];
            var R2 = p+this.hi[i]-this.lo[i];
            var S2 = p-this.hi[i]+this.lo[i];
            var R3 = R1+this.hi[i]-this.lo[i];
            var S3 = S1-this.hi[i]+this.lo[i];
            pivots.push([this.dates[i], {r1: R1, s1: S1, r2: R2, r3: R3, s2: S2, s3: S3 }]);
        }
        if (pivots.length>0) pivots.push(pivots[pivots.length-1]);
        if (pivots.length>0) pivots[pivots.length-1][0] += 1000*60*60*24;

        return pivots;
    }

    obv() {
        var dates = this.dates;
        var vols = this.vols;
        var closes = this.closes;
        var obv = [ [dates[0], vols[0]] ];
        for (var i=1; i<closes.length; i++) {
            if (closes[i] > closes[i-1])
                obv.push([dates[i], obv[obv.length-1][1] + vols[i]]);
            else if (closes[i] < closes[i-1])
                obv.push([dates[i], obv[obv.length-1][1] - vols[i]]);
            else
                obv.push([dates[i], obv[obv.length-1][1]]);
        }
        return obv;
    }

    rsi(period) {
        var closes = this.closes;
        var dates = this.dates;
        var rsi = [];
        var diff = [];
        for (var i=1; i<closes.length; i++) diff.push(closes[i]-closes[i-1]);
        var portion = diff.slice(0, period);
        var gain=0; var loss=0.000000001;
        portion.forEach(e=>e>0? gain+=e/period: loss-=e/period);
        for (var i=0; i<=period; i++) {
            rsi.push([dates[i], 100-100/(1+gain/loss)]);
        }
        for (var i=period; i<diff.length; i++) {
            gain = (gain*(period-1) + (diff[i]>0?diff[i]:0))/period;
            loss = (loss*(period-1) - (diff[i]<0?diff[i]:0))/period;
            rsi.push([dates[i+1], 100-100/(1+gain/loss)]);
        }
        return rsi;
    }

    sma(nDay) {
        var daytype = "d";
        var offset = { 'd': 1, 'w': 5, 'm': 20 };
        if (isNaN(nDay)) { daytype = nDay[nDay.length-1]; nDay = nDay.replace(daytype,''); }
        if (this.series.length==0) return [];
        return this.series.filter((e,i,a) => (a.length-1-i)%offset[daytype] == 0)
        .map((e,i,a) => { 
            var d = a.slice(Math.max(0,i+1-nDay),i+1); 
            return [e[0], d.reduce((acum,curr) => acum+curr[1], 0)/d.length] 
        });
    }

    ema(nDay) {
        var len = this.series.length;
        var result = new Array();
        var sma = this.sma(nDay).slice(0, nDay);
        for (var i=0; i<nDay && i<this.closes.length; i++) result[i] = [sma[i][0], sma[i][1]];
        var multiplier = 2/(nDay+1);
        for (var i=nDay; i<this.series.length; i++)
            result[i] = [ this.series[i][0], (this.series[i][1]-result[i-1][1])*multiplier+result[i-1][1] ];
        return result;
    }

    // zScore of close vs SMA
    zscore(stat, nDay) {
        var close = this.closes;
        var sma = this.sma(nDay);
        var stddev = this.closes.map((e,i,a) => stat.stdev(a.slice(Math.max(0,i-nDay+1),i+1)));
        return sma.map((e,i,a) => [e[0], stddev[i]==0?0:(close[i]-sma[i][1])/stddev[i]]);
    }

    macd(short,long,signal) {
        var fast = this.ema(short);
        var slow = this.ema(long);
        var diff = fast.map((e,i) => [e[0], e[1]-slow[i][1]]);
        var signal = new Indicator(diff.map(e => ({date:e[0],price:e[1]}))).ema(signal);
        return { macd: diff, signal: signal};
    }

    bollinger(stat, nDays, stdd) {
        var sma = this.sma(nDays);
        var stddev = this.closes.map((e,i,a) => stat.stdev(a.slice(Math.max(0,i-nDays),i)));
        return stat.StripTimeSeries(sma).map((e,i) => [sma[i][0], e-stdd*stddev[i], e+stdd*stddev[i]]);
    }

    support(current, period) {
        var minimums = this.series.slice(period?-period:-9999).filter((e,i,a) => {
            (i>0 && i<a.length-2 && a[i-1][1]>e[1] && a[i+1][1]>e[1] && a[i-2][1]>e[1] && a[i+2][1]>e[1] && e[1]<current);
        });
        return minimums;
    }

    resistance(current, period) {
        var maximum = this.series.slice(period?-period:-9999).filter((e,i,a) => {
            (i>0 && i<a.length-2 && a[i-1][1]<e[1] && a[i+1][1]<e[1] && a[i-2][1]<e[1] && a[i+2][1]<e[1] && e[1]>current);
        });
        return maximum;
    }

    fibonacci() {
        var max = Math.max.apply(null, this.closes); 
        var min = Math.min.apply(null, this.closes); 
        var spread = max-min;
        return [0, 0.118, 0.191, 0.125, 0.309, 0.5, 0.691, 0.75, 0.809, 0.882, 1].map(e => {
            return [[this.dates[0], max-e*spread], [this.dates[this.dates.length-1], max-e*spread]];
        });
    }

    sharpe(stat, period, rf) {
        rf = rf?0:rf;
        var g = this.returns(1);
        return g.map((e,i,a) => {
                var v = stat.StripTimeSeries(a.slice(Math.max(0, i-period), i));
                return [e[0], (stat.mean(v)-rf)/stat.stdev(v)];
                });
    }

    // annualized continous compounding return over the nLag/period
    returns(P) {
        var result = [];
        try {
            var dates = this.dates;
            var t = P/252;
            result = this.closes.map(function(e,i,a) { return [dates[i], Math.log(e/a[Math.max(0,i-P)])/t]; });
            for (var i=0; i<result.length && i<P; i++) result[i][1] = result[Math.min(result.length-1,P)][1];
        } catch (err) {
            throw 'indicator.returns '+err;
        }
        return result;
    }

    // Volume weighted return: Given n days period, return volume weighted on the daily return in %
    // Result: [ vwr1, vw2....vwn ]
    vwr(period) {
        var daily = this.closes.map(function(e,i,a) { return e/a[Math.max(0,i-1)]-1 }); 
        var vweights = this.vols.map(function(e,i,a) { 
                var volumns = a.slice(Math.max(0,i-period+1), i+1);
                var total = volumns.reduce(function(acum, curr) { return acum+curr; },0);
                return volumns.map(function(e) { return total==0?1:e/total; });
                });
        return this.dates.map(function(e,i,a) {
                return [e, daily.slice(Math.max(0,i-period+1), i+1).reduce(function(accu,curr,j,a) { return accu+curr*vweights[i][j]; }, 0)*100 ]
                });
    }

    // Stochastic Oscillator
// Result: { K: k, D: MA of k }
    stoch(stat, period, ma) {
        var k = stat.TimeSeries(this.dates, this.close.map(function(e,i,a) {
                    var max = Math.max.apply(null, a.slice(i-period, i)); 
                    var min = Math.min.apply(null, a.slice(i-period, i)); 
                    return (e-min)/(max-min)*100;
                    }));
        return {K:k, D:new Indicator(k).sma(ma)};
    }

    trend(period) {
        var support = this.support(9999999,period);
        var resistance = this.resistance(-9999999,period);
        //iterative the resistance, select pair of points so the line is above the other resistances within the points, and some are within some threshold.
        //this way the line is likely a resistance trend. Same goes to support trend line.
    }
}

if (typeof module != "undefined") module.exports = Indicator;
