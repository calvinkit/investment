$(document).ready(function(){
    $('#PCAAccordion').accordion({active:0, heightStyle: 'content'});
    $('#PCATarget').val($('#PCATarget').val());
    $('#PCALag').val($('#PCALag').val());
    $('#PCAPCNum').val($('#PCAPCNum').val());
    $('#PCAAsOf').val($('#PCAAsOf').val());
    $('#PCAWeight').val($('#PCAWeight').val());
});

function run_pca() {
    var asOf = new Date().parseInput($('#PCAAsOf').val());
    var weightDate = new Date().parseInput($('#PCAWeight').val());
    asOf=asOf?asOf.getTime():asOf;
    weightDate=weightDate?weightDate.getTime():weightDate;
    var tickers = $('#PCATarget').val().split(",");
    var securities = {};
    tickers.forEach((e) => { securities[e] = { ticker: e, yticker: e, country: 'K2'}});
    $.getJSON('pca', {tickers: tickers, securities: securities, nDays: $('#PCALag').val(), nPC: $('#PCAPCNum').val(), asOf: asOf, weightDate: weightDate }, onpca);
    loading.show();
    return true;
}

// PCA
function onpca(result)
{
    if (result.error) return onerror(result.error.message);
    var tickers = result.tickers;
    var result = result.result;
    var data = result.data;
    var numPC = $('#PCAPCNum').val();
    var residuals1 = result.error;
    var residuals2 = numeric.transpose(residuals1);
    $('#PCA').data('result', result);
    $('#PCA').data('tickers', tickers);

    $('#PCAChart1').highcharts({
        chart: { zoomType: 'x' },
        title: { text: 'Principal Components' },
        xAxis: { title: { text: 'input' }, categories: tickers },
        yAxis: { title: { text: 'change (bp) / stdd' }, labels: { formatter: function() { return this.value*100; } } },
        series: [{
            type: 'line',
            name: 'PC1',
            data: result.eigenVectors[0],
            marker: { symbol: 'diamond' }
        },{
            type: 'line',
            name: 'PC2',
            data: result.eigenVectors[1]
        },{
            type: 'line',
            name: 'PC3',
            data: result.eigenVectors[2]
        }],
    });

    var seriesdata = new Array();
    for (var i=0; i<residuals1.length; i++) {
        var j = 0;
        seriesdata[i] = { 
            name: tickers[i],
            y: residuals2.slice(-1)[0][i], 
            drilldown: [{
                name: 'residuals',
                type: 'area',
                data: statistics.TimeSeries( result.times, residuals1[i]),
                marker: { enabled: false }
            }]
        };
    }
    var times = result.times;
    var series = [
        { name:'yesterday', type: 'column', enableMouseTracking: true, marker: { enabled: false }, data: seriesdata , tooltip: { valueDecimals: 6, valueSuffix: '%' } },
        { name:'5 days ago', type: 'line', enableMouseTracking: false, data: residuals2[residuals2.length-5], marker: { symbol: 'diamond' }, lineWidth: 0 },
        { name:'10 days ago', type: 'line', enableMouseTracking: false, data: residuals2[residuals2.length-10], marker: { symbol: 'triangle' }, lineWidth: 0 },
        { name:'30 days ago', type: 'line', enableMouseTracking: false, data: residuals2[residuals2.length-30], marker: { symbol: 'triangle-down' }, lineWidth: 0 }
    ];

    function setChart(newseries, categories, xAxisType) {
        $('#PCAChart2').highcharts({
            chart: { zoomType: 'x' },
            title: { text: 'Residuals' },
            xAxis: { title: { text: 'input'}, categories: categories, type: xAxisType },
            yAxis: { title: { text: 'residuals (bp)' }, labels: { formatter:function() { return this.value*100; } } },
            series: newseries,
            plotOptions: { 
                column: { point: { events: { click: function() {
                                var drilldown = this.drilldown;
                                if (drilldown) 
                                    setChart(drilldown, null, 'datetime');
                                else
                                    setChart(series, tickers, 'category');
                } } } },
                area: { point: { events: { click: function() {
                                var drilldown = this.drilldown;
                                if (drilldown) 
                                    setChart(drilldown, null, 'datetime');
                                else
                                    setChart(series, tickers, 'category');
                } } } } 
            }
        });
    }
    setChart(series, tickers, 'category');

    var index = new Array();
    if (typeof(t) != "undefined") { t.destroy(); t.table().node().innerHTML = ""; }
    t = $('#PCAResult').DataTable({
        "destroy": true,
        "bPaginate": false, 
        "bInfo": false, 
        "bFilter": false,
        "bSort": false,
        "bProcessing": false,
        "sDom": "irtflp",
        "aoColumnDefs": [{
            "sType":"formatted-num",
            "mRender": function (data, type, row) { return humanize.numberFormat(parseFloat(data),2); },
            "aTargets": [1].concat(result.eigenVectors.map(function(e,i) { return i+2; }))
        }],

        columns: [{title: ''}, {title:'variance'}].concat(tickers.map(function(e,i) { return { title: e }; })),
        data: result.eigenVectors.map(function(e,i) { return ['PC'+(i+1), result.contribution[i]*100].concat(e.map(function(e2) { return e2*100; })) })
    });
    if (typeof(t2) != "undefined") { t2.destroy(); t2.table().node().innerHTML = ""; }
    t2 = $('#PCAZScore').DataTable({
        destroy: true,
        "bPaginate": false, 
        "bInfo": false, 
        "bFilter": false,
        "bSort": false,
        "bProcessing": false,
        "sDom": "irtflp",
        "aoColumnDefs": [{
            "sType":"formatted-num",
            "mRender": function (data, type, row) { return humanize.numberFormat(parseFloat(data),2); },
            "aTargets": tickers.map(function(e,i) { return i+1; })
        }],
        columns: [{title:' '}].concat(tickers.map(function(e) { return { title: e} })),
        data: [['z-score'].concat(result.zscore), ['3m carry'].concat(result.carry), ['Res. diff(bps)'].concat(result.mse.map(function(e){ return e*100; }))]
    });
    if (typeof(t3) != "undefined") { t3.destroy(); t3.table().node().innerHTML = ""; }
    t3 = $('#PCACorrelation').DataTable({
        destroy: true,
        "bPaginate": false, 
        "bInfo": false, 
        "bFilter": false,
        "bSort": false,
        "bProcessing": false,
        "sDom": "irtflp",
        "aoColumnDefs": [{
            "sType":"formatted-num",
            "mRender": function (data, type, row) { return humanize.numberFormat(data,2); },
            "aTargets": tickers.map(function(e,i) { return i; })
        }],
        columns: tickers.map(function(e) { return { title: e} }),
        data: result.correlation
    });
    //if (typeof(t4) != "undefined") { t4.destroy(); t4.table().node().innerHTML = ""; }
    //t4 = $('#PCADV01').DataTable({
    //    destroy: true,
    //    "bPaginate": false, 
    //    "bInfo": false, 
    //    "bFilter": false,
    //    "bSort": false,
    //    "bProcessing": false,
    //    "sDom": "irtflp",
    //    "aoColumnDefs": [{
    //        "sType":"formatted-num",
    //        "mRender": function (data, type, row) { return humanize.numberFormat(data,0); },
    //        "aTargets": index 
    //    }],

    //    columns: tickers.map(function(tickers) { return { title: tickers }; }),
    //    data: [result.dv01]
    //});
    tabview.switchTo('PCA');
    loading.hide();
}

function pca_calculate_pca_weights(strategy) {
    var parts = strategy.split(",");
    var tickers = $('#PCATarget').val().split(',');
    if (parts.length == 3 && tickers.length >= 3 && parts.every(function(e) { return tickers.indexOf(e)>-1; })) {
        var indexes = [parts[0],parts[2]].map(function(e) { return tickers.indexOf(e); });
        //var dv01 = indexes.map(function(e) { return $('#PCADV01').DataTable().data()[0][e]; });
        //var dv01 = [ [dv01[0], 0], [0, dv01[1]] ];
        //var dv01 = [ [1,0], [0,1] ];
        var pc = $('#PCAResult').DataTable().data();
        var pc = [pc[1], pc[2]];
        var A = numeric.dot(pc.map(function(e) { return e.filter(function(v,i,a) { return indexes.indexOf(i)>-1; }); }),dv01);
        var bellyDV01 = $('#PCADV01').DataTable().data()[0][tickers.indexOf(parts[1])];
        var bellyDV01 = 1;
        var b = [ pc[0][tickers.indexOf(parts[1])]*bellyDV01, pc[1][tickers.indexOf(parts[1])]*bellyDV01 ];
        var weight = numeric.solve(A,b).map(function(e) { return Math.abs(Math.round(parseFloat(e*10000))/10000); });
        $('#PCAWeights').text([2*weight[0],2.0,2*weight[1]].join('/'));
    } else if (parts.length == 2 && tickers.length >= 2 &&  parts.every(function(e) { return tickers.indexOf(e)>-1; })) {
        var indexes = [parts[0],parts[1]].map(function(e) { return tickers.indexOf(e); });
        var pc = $('#PCAResult').DataTable().data();
        var pc = pc[1];
        var weight = [1, pc[2+indexes[1]]/pc[2+indexes[0]]].map(function(e) { return Math.abs(Math.round(parseFloat(e*10000))/10000); });
        $('#PCAWeights').text(weight.join('/'));
    } else {
        $('#PCAWeights').text('');
    }
}
