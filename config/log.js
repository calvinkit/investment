var winston = require('winston');
var custom = {
    'levels': {
        'detail': 0,
        'trace': 1,
        'debug': 2,
        'enter': 3,
        'info': 4,
        'warn': 5,
        'error': 6 },
    'colors': {
        'detail': 'grey',
        'trace': 'white',
        'debug': 'blue',
        'enter': 'grey',
        'info': 'green',
        'warn': 'yellow',
        'error': 'red' }
};
winston.setLevels(custom.levels);
winston.addColors(custom.colors);
// { error: 0, warn: 1, info: 2, verbose: 3, debug: 4, silly: 5 }
var logger = new (winston.Logger)({ 
    'transports': [ new (winston.transports.Console)( { 
        'level': process.env.debug||'info', 
        'colorize': true 
})], });

var moment = require('moment');
Date.prototype.toString = function() {
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    var d = this.getDate()<10?"0"+this.getDate():this.getDate();
    var m = this.getMonth();
    var y = this.getFullYear();
    return d+"-"+months[m]+"-"+y;
};

Date.prototype.toTimestamp = function() {
    var year = this.getFullYear();
    var month = this.getMonth()+1;
    var date = this.getDate();
    return year+'-'+(month<10?"0":"")+month+"-"+(date<10?"0":"")+date;
};


Date.prototype.toTimeString = function() {
    var s = this.getSeconds()<10?"0"+this.getSeconds():this.getSeconds();
    var m = this.getMinutes(); m = m<10?"0"+m:m;
    var h = this.getHours(); h = h<10?"0"+h:h;
    return h+":"+m+":"+s;
};

Date.prototype.toGMTDate = function() {
    var a = new Date(this.getFullYear(), this.getMonth(), this.getDate());
    var b = a.getTimezoneOffset()*60000;
    return new Date(a.getTime()-b);
};

Date.prototype.fromGMTDate = function() {
    var a = new Date(this.getFullYear(), this.getMonth(), this.getDate());
    var b = a.getTimezoneOffset()*60000;
    return new Date(a.getTime()+b);
};

Date.prototype.parseInput = function(str) {
    return (str&&str!=""?new Date(str.replace("-","/")).toGMTDate():null);
};

Date.prototype.addBusinessDate = function(d) {
    var wks = d>0?Math.floor(d/5):Math.ceil(d/5);
    var dys = d%5
    var dy = this.getDay();
    if (dy === 6 && dys > -1) {
        if (dys === 0) {dys-=2; dy+=2;}
        dys++; dy -= 6;
    }
    if (dy === 0 && dys < 1) {
        if (dys === 0) {dys+=2; dy-=2;}
        dys--; dy += 6;
    }
    if (dy + dys > 5) dys += 2;
    if (dy + dys < 1) dys -= 2;
    this.setDate(this.getDate()+wks*7+dys);
    return this;
};

Date.prototype.toExcelDate = function() {
    return parseInt(this.getTime()/(1000*60*60*24)+25569);
};

Date.prototype.fromExcelDate = function(excel) {
    return new Date((excel-25569.0)*3600000*24);
};

Date.prototype.add = function(val, type) {
    return moment(this).add(val, type).toDate();

};

global.MergeOnDates = function(quotes) {
    var dates = quotes.map(function(e) { return e.map(function(e2) { return e2[0]; }); });
    var result = dates.shift().filter(function(v) {
        return dates.every(function(a) {
            return a.indexOf(v) !== -1;
        });
    });
    return quotes.map(function(w) { return w.filter(function(e) { return result.indexOf(e[0])>-1; }); });
}

module.exports = logger;
