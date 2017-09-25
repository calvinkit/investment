var Table = require('easy-table');
var moment = require('moment');

function Transactions(transactions) {
    this.transactions = (transactions?transactions:new Array());
    this.pos = this.transactions.reduce(function(prev,curr){return prev+curr.qty;},0);
    this.totalPnl = this.totalReturn = this.pnl = 0;
}

Transactions.prototype.add = function(date, qty, px, brokage) {
    var index = this.transactions.length;
    if (qty != 0) {
        this.transactions[index] = {}
        this.transactions[index]["date"] = date;
        this.transactions[index]["brokage"] = brokage;
        this.transactions[index]["px"] = parseFloat(px);
        this.transactions[index]["qty"] = qty;
        this.transactions[index]["amount"] = -qty*px-brokage;
        this.pos += qty;

        if (Math.abs(this.pos)<0.5) {
            this.transactions[index]["qty"] = qty-this.pos;
            this.pos = 0;
        }
    }
    return this;
};

Transactions.prototype.concat = function(transactions, ticker) {
    transactions.transactions.forEach((function(t)  {
        this.add(t.date, t.qty, t.px, t.brokage);
        this.transactions[this.transactions.length-1].ticker = ticker;
    }).bind(this));
    this.sort();
    return this;
};

Transactions.prototype.sort = function() {
    this.transactions.sort(function(a,b) { return (a["date"]>b["date"]?1:-1); });
    return this;
};

// return the position as of the EOD date
Transactions.prototype.position = function(date) {
    return this.transactions.reduce(function(prev,curr) { return prev+(curr.date<=date?curr.qty:0); }, 0);
};

Transactions.prototype.duration = function() {
    if (this.transactions.length>2) {
        var days = (this.transactions[this.transactions.length-1].date-this.transactions[0].date)/86400000;
        return days/365;
    } else {
        return 0;
    };
};

// Truncate transactions to within sDate/eDate, excluding sDate
Transactions.prototype.truncate = function(sDate, sPx, eDate, ePx) {
    var sPos = this.position(sDate);
    if (eDate) {
        var ePos = -this.position(eDate);
        var trans = new Transactions(this.transactions.filter(function(e){return e.date>sDate && e.date<=eDate;}));
        if (Math.abs(sPos)>0.5) trans = trans.add(sDate,sPos,sPx,0);
        if (Math.abs(ePos)>0.5) trans = trans.add(eDate,ePos,ePx,0)
        return trans.sort();
    } else  {
        var trans = new Transactions(this.transactions.filter(function(e){return e.date>sDate;})).add(sDate,sPos,sPx,0).sort();
        return trans;
    }
};

Transactions.prototype.calculate = function(currPx) {
    this.sort();

    var p=0,n=0,P=0,Q=0;
    this.transactions.forEach((function(e) {
        this.totalPnl += e.amount;
        p += e.amount>0?e.amount:0;  // Sell
        n -= e.amount<=0?e.amount:0; // Buy

        if (Q/e.qty>=0) {
            P = (P*Q+e.amount)/(Q+=e.qty);
            e.pnl = 0;
        } else {
            e.pnl = e.amount-P*e.qty;
            Q+=e.qty;
        }
    }).bind(this));
    if (this.pos>0.001) p += this.pos*currPx;
    if (this.pos<-0.001) n -= this.pos*currPx; 
    this.totalPnl += this.pos*currPx;
    this.totalReturn = n==0?0:((p-n)/n)*100;
    this.pnl = this.pos*(currPx+P);
    this.avgCost = P;

    return this;
};

// Transactions' cashflows between start/end, excluding start date and including end date 
Transactions.prototype.cashflows = function(start, end) {
    logger.log('debug','Transactions.cashflows', this.security.ticker, this.valueAt(start), this.valueAt(end), this.cashflows(start, end));
    var ts = this.transactions.filter(function(e) { return (e.date > start && e.date <= end); });
    return ts.reduce(function(acum,curr) { return acum+curr.amount; },0);
};

Transactions.prototype.show = function(t) {
    this.transactions.forEach(function(e) {
        if (e.qty != 0) {
            t.cell('Date', moment(new Date(e.date).fromGMTDate()).format("DD-MMM-YY"));
            if (e.ticker) t.cell('Ticker', e.ticker);
            t.cell('Qty', e.qty, Table.Thousand());
            t.cell('Price', -e.amount/e.qty, Table.Number(2));
            t.cell('Pnl', e.pnl, Table.Thousand());
            t.newRow();
        }
    });
}

Transactions.prototype.yield = function() {
    pv = (function(y) {
        var result = 0;
        for (var i=0; i<this.transactions.length; ++i)
            result += this.transactions[i].amount*Math.exp(-y*(moment(this.transactions[i].date).diff(moment(this.transactions[0].date),'day')/365));
        return result;
    }).bind(this);

    pvprime = (function(y) {
        var result = 0;
        for (var i=0; i<this.transactions.length; ++i) 
            result += -moment(this.transactions[i].date).diff(moment(this.transactions[0].date),'day')/365*this.transactions[i].amount*Math.exp(-y*(moment(this.transactions[i].date).diff(moment(this.transactions[0].date),'day')/365));
        return result;
    }).bind(this);

    // If timeframe is less than a year, just return totalReturn
    if (this.duration() < 1) {
        this.calculate();
        return this.totalReturn;
    }

    // Annualized Yield
    this.irr = 0;
    for (var i=0; i<50; i++) {
        var delta = pv(this.irr)/pvprime(this.irr);
        if (Math.abs(delta) < 0.000001) break;
        this.irr -= delta;
    }
    return this.irr = (Math.exp(this.irr)-1)*100;
};

Transactions.prototype.consume = function(t) {
    this.transactions = t.transactions;
    this.pos = t.pos;
    this.totalPnl = t.totalPnl;
    this.totalReturn = t.totalReturn;
    this.pnl = t.pnl;
    return this;
};

// The transactions is considered not close if
// 1. Transaction occurred b/w start/end (if end is not defined, define it as today+1)
// 2. Position was not zero at beginning
Transactions.prototype.isClosed = function(start,end) {
    end = end?end:new Date().toGMTDate().add(1,'d');
    return !(
           this.transactions.filter(function(e){return e.date>=start&&e.date<=end}).length!=0
           || Math.abs(this.position(start))>0.5
    );
};


module.exports = Transactions;
