var util = require('util');
var Table = require('easy-table');
var Transactions = require('./transactions'); 
var Portfolio = require('./portfolio');

function transactions_test() {
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
    console.log(t.toString());
    /*
    Date       Qty  Price  Pnl
    ---------  ---  -----  ---
    01-Jan-16    4   2.00
    02-Jan-16    4   4.00
    03-Jan-16   -4   4.00    4
    04-Mar-16   -4   3.00
    05-Jun-16    4   2.00
    06-Jun-16    4   4.00
    07-Jun-16   -4   4.00    4
    08-Jun-16   -4   3.00
    */

    var t = new Table();
    transactions.truncate(new Date("2016-01-03"),5).calculate(3).show(t);
    console.log('Result');
    console.log(t.toString());
    console.log('Expected');
    console.log(
    ' Date       Qty  Price  Pnl'+'\r\n'+
    '---------  ---  -----  ---'+'\r\n'+
    '03-Jan-16    4   5.00'+'\r\n'+
    '04-Mar-16   -4   3.00   -8'+'\r\n'+
    '05-Jun-16    4   2.00'+'\r\n'+
    '06-Jun-16    4   4.00'+'\r\n'+
    '07-Jun-16   -4   4.00    4'+'\r\n'+
    '08-Jun-16   -4   3.00\r\n');

    var t = new Table();


    var transactions = new Transactions();
    transactions.add(new Date("2016-01-01"),1,100,0);
    transactions.add(new Date("2016-06-30"),1,5,0);
    transactions.add(new Date("2016-12-31"),-2,60,0);
    console.log("result: ",util.inspect(transactions.yield())); // 14.6434%
    console.log("expected: 14.6434");
}

//transactions_test();


function portfolio_test() {
    var p = new Portfolio('TFSA');
    p.name = 'test2';
    p.write();
}

portfolio_test();

