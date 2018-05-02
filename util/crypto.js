var crypto = require('crypto');
var fs = require('fs');
var hash = crypto.createHash('sha256');
hash.update('This is my private key');
console.log(hash.digest('hex'));
var hash = crypto.createHash('sha256');
hash.update('This is my private key');
hash.update('This is my private key');
console.log(hash.digest('hex'));

