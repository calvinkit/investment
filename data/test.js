var fs = require('fs');
var a = fs.readFileSync('report.dat');
var b = JSON.parse(String(a));
console.log(b);
