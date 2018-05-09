var util = require('util');
var assert = require('assert');
var Table = require('./../util/mytable');
var Transactions = require('./transactions'); 
var Portfolio = require('./portfolio');

describe('Transaction', function () {
    var transactions = new Transactions();
    transactions.add(new Date("2016-01-01"),4,2,0); // bought 4 @ 2
    transactions.add(new Date("2016-01-02"),4,4,0); // bought 4 @ 4 (avg cost 3)
    transactions.add(new Date("2016-01-03"),-4,4,0); // sold 4 @ 4 (pnl +4)
    transactions.add(new Date("2016-03-04"),-4,3,0); // sold 4 @ 3  (pnl 0)
    transactions.add(new Date("2016-06-05"),4,2,0); // bought 4 @ 2 
    transactions.add(new Date("2016-06-06"),4,4,0); // bought 4 @ 4 (avg cost 3)
    transactions.add(new Date("2016-06-07"),-4,4,0); // sold 4 @ 4 (pnl +4)
    transactions.add(new Date("2016-06-08"),-4,3,0); // sold 4 @ 3 (pnl 0)

    var t = new Table();
    transactions.calculate(3).show(t);
    var resultString = 
    "Date       Qty  Price  Pnl\n" +
    "---------  ---  -----  ---\n" +
    "01-Jan-16    4   2.00    0\n" +
    "02-Jan-16    4   4.00    0\n" +
    "03-Jan-16   -4   4.00    4\n" +
    "04-Mar-16   -4   3.00    0\n" +
    "05-Jun-16    4   2.00    0\n" +
    "06-Jun-16    4   4.00    0\n" +
    "07-Jun-16   -4   4.00    4\n" +
    "08-Jun-16   -4   3.00    0\n";
    it('transactions pnl calculation', function() {
        console.log(t.toString());
        assert.strictEqual(t.toString(), resultString);
    });

    var t2 = new Table();
    transactions.truncate(new Date("2016-01-03"),5).calculate(3).show(t2);
    var resultString2 = 
    "Date       Qty  Price  Pnl\n" +
    "---------  ---  -----  ---\n" +
    "03-Jan-16    4   5.00    0\n" +
    "04-Mar-16   -4   3.00   -8\n" +
    "05-Jun-16    4   2.00    0\n" +
    "06-Jun-16    4   4.00    0\n" +
    "07-Jun-16   -4   4.00    4\n" +
    "08-Jun-16   -4   3.00    0\n";
    it('truncated trasacttion pnl calculation', function() {
        console.log(t2.toString());
        assert.strictEqual(t2.toString(), resultString2);
    });

    var transactions = new Transactions();
    transactions.add(new Date("2016-01-01"),1,100,0);
    transactions.add(new Date("2016-06-30"),1,5,0);
    transactions.add(new Date("2016-12-31"),-2,60,0);
    it('transaction yield calculation', () => {
        assert.strictEqual(+transactions.yield().toFixed(4), 14.6434);
    });
});
