var fs = require('fs');
var csv2array = require('csv2array');

function toCSV() {
    var data = JSON.parse(fs.readFileSync("index.dat"));
    fs.writeSync("index.csv","");
    for (var i=0; i<data.length; i++) {
        for (var j=0; j<data[i].length; j++) {
            fs.appendFileSync("index.csv",data[i][j]+",");
        }
        fs.appendFileSync("index.csv","\n");
    }
}

function toJSON(filename) {
    var data = csv2array(fs.readFileSync(filename+'.csv','utf8'));
    fs.writeFileSync(filename+".dat","[\n");
    for (var i=1; i<data.length-1; i++) fs.appendFileSync(filename+".dat",JSON.stringify(data[i])+(i==data.length-2?"":",")+"\n");
    fs.appendFileSync(filename+".dat","]\n");
}

function cleanup() {
    var data = JSON.parse(fs.readFileSync("index.dat"));
    var symbol = {};
    fs.writeSync("index.csv","");
    for (var i=0; i<data.length; i++) {
        var key = [data[i][0],data[i][2]].join('');
        if (!symbol[key]) {
            symbol[key] = true;
            console.log(key);
            for (var j=0; j<data[i].length; j++) {
                fs.appendFileSync("index.csv",data[i][j]+",");
            }
            fs.appendFileSync("index.csv","\n");
        }
    }
}

toJSON(process.argv[2]);
