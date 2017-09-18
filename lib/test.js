var util = require('util');
var Transactions = require('./transactions'); 
var Portfolio = require('./portfolio');

function transactions_test() {
    var transactions = new Transactions();
    transactions.add(new Date("2016-01-01"),4,2,0);
    transactions.add(new Date("2016-01-02"),4,4,0);
    transactions.add(new Date("2016-01-03"),-4,4,0);
    transactions.add(new Date("2016-01-04"),-4,3,0);
    transactions.add(new Date("2016-01-05"),4,2,0);
    transactions.add(new Date("2016-01-06"),4,4,0);
    transactions.add(new Date("2016-01-07"),-4,4,0);
    transactions.add(new Date("2016-01-08"),-4,3,0);
    console.log(util.inspect(transactions.calculate(3)));
    console.log(util.inspect(transactions.truncate(new Date("2016-01-05"),3).calculate(1)));
    console.log(util.inspect(transactions.truncate(new Date("2016-01-05"),3,new Date("2016-01-09"),4).calculate(1)));

    var transactions = new Transactions();
    transactions.add(new Date("2016-01-01"),1,100,0);
    transactions.add(new Date("2016-06-30"),1,5,0);
    transactions.add(new Date("2016-12-31"),-2,60,0);
    console.log("result: ",util.inspect(transactions.yield())); // 14.6434%
    console.log("expected: 14.6434");
}

transactions_test();


function portfolio_test() {
    var p = new Portfolio('RESP');
    console.log(util.inspect(p));
}

//portfolio_test();

