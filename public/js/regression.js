var rChart = null;

$(document).ready(function(){
    $('#RegressionAccordion').accordion({active:0, heightStyle: 'content'});
    $("#RegressionResult").dataTable({ 
        "bPaginate": false, 
        "bInfo": false, 
        "bFilter": false,
        "bSort": false,
        "bProcessing": true,
        "sDom": "irtflp",
        "aoColumnDefs": [{
                "sType":"formatted-num",
                "mRender": function (data, type, row) { return humanize.numberFormat(data,4); },
                "aTargets": [1]
                 }]
    });
    $("#RegressionOutput").dataTable({ 
        "bPaginate": false, 
        "bInfo": false, 
        "bFilter": false,
        "bSort": false,
        "bProcessing": true,
        "sDom": "irtflp",
        "aoColumnDefs": [{
                "sType":"formatted-num",
                "mRender": function (data, type, row) { return humanize.numberFormat(data,4); },
                "aTargets": [1,2,3,4,5,6,7,8,9]
                 }]
    });
});


function regressionasof_onchange() {
    var regressAsOf = new Date().parseInput($('#RegressionAsOf').val());
    var regressDate = new Date().parseInput($('#RegressionDate').val());
    $('#RegressionDate').attr('max',this.value);
    if (!regressDate || (regressAsOf && regressAsOf < regressDate)) $('#RegressionDate').val(this.value);
}

function run_regress() {
    var RegressionAsOf = $('#RegressionAsOf').val();
    var RegressionDate = $('#RegressionDate').val();
    $.getJSON('regression', {
        RegressionTarget: $('#RegressionTarget').val(), 
        RegressionTargetCountry: $('#RegressionTargetCountry').val(), 
        RegressionRegressor:$('#RegressionRegressor').val(), 
        RegressionRegressorCountry:$('#RegressionRegressorCountry').val(), 
        RegressionDays: $('#RegressionDays').val(), 
        RegressionAsOf: RegressionAsOf, 
        RegressionDate: RegressionDate 
    }, onregress);
    $('#RegressionResult').dataTable().fnClearTable(); 
    loading.show();
}

function onregress(result) {
    var slr = result.slr;
    var table = $('#RegressionResult').dataTable();
    table.fnClearTable();
    table.fnAddData(['Last', result.xy[result.xy.length-1][1]]);
    table.fnAddData(['Mean', result.mean]);
    table.fnAddData(['Stdd.', result.stdd]);
    //table.fnAddData(['Avg. Chg.', result.avgchg]);
    table.fnAddData(['High', result.high]);
    table.fnAddData(['Low', result.low]);
    //table.fnAddData(['AR1 corr', result.autocorr]);
    //table.fnAddData(['AR1 beta', result.autobeta]);
    //table.fnAddData(['AR1 corr (changes)', result.dautocorr]);
    //table.fnAddData(['AR1 beta (changes)', result.dautobeta]);
    if (slr) {
        table.fnAddData(['Beta', slr.beta]);
        table.fnAddData(['Alpha', slr.alpha]);
        table.fnAddData(['R (Corr).', slr.corr]);
        table.fnAddData(['Mean of Error', result.me]);
        table.fnAddData(['Stdd of Error', slr.smse]);
        table.fnAddData(['Stdd of Beta', slr.se]);
        table.fnAddData(['t-test', slr.tstat]);
        table.fnAddData(['z-score', result.zscore[result.zscore.length-1]]);
        table.fnAddData(['Residual auto correlation', result.error_autobeta]);
    }
    if (rChart) { rChart.destroy(); rChart = null; }
    $('#RegressionZScoreChart').empty();
    $('#RegressionHistoricalCorrelation').empty();
    if (slr) {
        var smse = slr.smse;
        var series = result.dxy;
        var yesterday = series.slice(-1);
        var fivedays = series.slice(-6,-1);
        var sorted = series.slice(0);
        sorted.sort(function(a,b) { return a[0]-b[0]; });
        $('#RegressionSlider').prop('max', series.length-1);
        $('#RegressionSlider').val(0);
        var s = sorted.slice(0,1)[0];
        var e = sorted.slice(-1)[0];
        var p1 = [s[0], s[0]*slr.beta+slr.alpha];
        var p2 = [e[0], e[0]*slr.beta+slr.alpha];
        var r1 = [p1[0], p1[1]-smse, p1[1]+smse];
        var r2 = [p2[0], p2[1]-smse, p2[1]+smse];
        var P1 = [s[0], result.mean];
        var P2 = [e[0], result.mean];
        var R1 = [s[0], P1[1]-result.stdd, P1[1]+result.stdd];
        var R2 = [e[0], P2[1]-result.stdd, P2[1]+result.stdd];
        $('#RegressionChart').highcharts({
            chart: { zoomType: 'xy' },
            title: { text: 'Regression' },
            subtite: { text: 'hello' },
            xAxis: { title: { text: $('#RegressionRegressor').val(), enable: true } },
            yAxis: { title: { text: $('#Target').val() } },
            plotOptions: {
                scatter: { 
                    animation: { duration: 2000 },
                    marker: { states: { hover: { enabled: true, lineColor: 'rgb(100,100,100)' } } },
                    states: { hover: { marker: { enabled: false } } },
                    tooltip: { headerFormat: '<b>{series.name}</b><br>', pointFormat: 'Strategy: {point.y}<br>Regressor: {point.x}' } 
                } 
            },
            legend: {
                enabled: true,
                layout: 'horizontal',
                align: 'center',
                verticalAlign: 'bottom',
                borderWidth: 0
            },
            series: [{
                type: 'scatter',
                name: $('#RegressionTarget').val()+" vs "+$('#RegressionRegressor').val(),
                data: series,
                marker: { symbol: 'diamond' },
                color: Highcharts.getOptions().colors[7]
            },{
                type: 'line',
                name: 'Regression Line',
                data: [p1, p2],
                marker: { enabled: false },
                states: { hover: { lineWidth: 0 } },
                enableMouseTracking: false
            },{
                type: 'arearange',
                data: [r1, r2],
                lineWidth: 0,
                linkedTo: ':previous',
                marker: { states: { hover: { enabled: false } } },
                color: Highcharts.getOptions().colors[0],
                fillOpacity: 0.3,
                zIndex: 0,
                enableMouseTracking: false
            },{
                type: 'scatter',
                name: 'Previous 5 days since last',
                data: fivedays,
                marker: { symbol: 'circle' },
                color: '#00FFFF'
            },{
                type: 'scatter',
                name: 'Last',
                data: yesterday,
                marker: { symbol: 'triangle' },
                color: '#FF0000'
            }],
            exporting: {
                sourceWidth: 1000,
                sourceHeight: 400,
                scale: 2
            }
        });
        rChart = $('#RegressionChart').highcharts();
        rChart.series[3].hide();

        // ZScore 
        $('#RegressionZScoreChart').highcharts({
            chart: { zoomType: 'x' },
            title: { text: 'Historical Z-Score' },
            xAxis: { title: { text: $('#RegressionRegressor').val(), enable: true  }, type: 'datetime' },
            yAxis: { title: { text: $('#RegressionTarget').val() } },
            tooltip: { crosshairs: true },
            legend: {
                enabled: false,
                layout: 'vertical',
                align: 'right',
                verticalAlign: 'middle',
                borderWidth: 0
            },
            series: [{
                type: 'line',
                name: 'Z-score',
                data: statistics.TimeSeries(result.dates, result.zscore),
                marker: { enabled: true },
                states: { hover: { lineWidth: 0 } },
                enableMouseTracking: true
            }],
            exporting: {
                sourceWidth: 1000,
                sourceHeight: 400,
                scale: 2
            }
        });

        // Historical Correlation
        $('#RegressionHistoricalCorrelation').highcharts('StockChart', {
            chart: { zoomType: 'x' },
            title: { text: 'Trailing '+$('#RegressionDays').val()+'-Days Historical correlation' },
            rangeSelector: { selected: 2, inputEnabled: false, buttons: [
                {type: 'month', count: 1, text: '1m' },
                {type: 'month', count: 3, text: '3m' },
                {type: 'month', count: 6, text: '6m' },
                {type: 'ytd', text: 'YTD' },
                {type: 'year', count: 1, text: '1y' },
                {type: 'year', count: 3, text: '3y' },
                {type: 'year', count: 5, text: '5y' },
                {type: 'all', text: 'All' }
            ]},
            plotOptions: { line: { cropThreshold: 0 } },
            xAxis: {
                type: 'datetime',
                dateTimeLabelFormates: { day: '%d-%M' },
                ordinal: false,
            },
            yAxis: { title: { text: 'Correlation' } },
            tooltip: { crosshairs: true },
            legend: {
                enabled: false,
                layout: 'vertical',
                align: 'right',
                verticalAlign: 'middle',
                borderWidth: 0
            },
            series: [{
                name: 'Correlation',
                data: result.histcorr,
                tooltip: { valueDecimals: 4 },
            }],
            exporting: {
                sourceWidth: 1000,
                sourceHeight: 400,
                scale: 2
            }
        });
    }
    // SMA ZScore 
    $('#RegressionSMAZScoreChart').highcharts('StockChart', {
        chart: { zoomType: 'x' },
        title: { text: 'Historical Z-Score Vs '+$('#RegressionDays').val()+' DMA' },
        rangeSelector: { selected: 2, inputEnabled: false },
        xAxis: { title: { text: 'Date', enable: true  }, type: 'datetime' },
        yAxis: { title: { text: 'zScore' }, plotLines: [{color:'green',value:-2,dashStyle:'solid',width:2}, {color:'red',value:2,dashStyle:'solid',width:2}] },
        tooltip: { crosshairs: true },
        legend: {
            enabled: false,
        },
        series: [{
            type: 'line',
            name: 'Z-score',
            data: new Indicator(result.y.map(function(e) { return { date: e[0], price: e[1] } })).zScore(statistics, $('#RegressionDays').val()),
            marker: { enabled: false },
            states: { hover: { lineWidth: 0 } },
            enableMouseTracking: true
        }],
        exporting: {
            sourceWidth: 1000,
            sourceHeight: 400,
            scale: 2
        }
    });
    //var table = $('#RegressionOutput').DataTable();
    //table.clear();
    //for (var i=0; i<result.y.length; i++) {
    //    var node = $(table.row.add([
    //        new Date(result.dates[i]).fromGMTDate().toString(),
    //        result.y[i], 
    //        slr?result.x[i]:0,
    //        slr?result.dy[i]:0,
    //        slr?result.dx[i]:0,
    //        slr?result.est[i]:0,
    //        slr?result.y[i]-result.x[i]:0,
    //        slr?slr.alpha-result.x[i]*(1-slr.beta):0,
    //        slr?result.dy[i]-result.dx[i]*slr.beta:0,
    //        slr?result.zscore[i]:0
    //    ]).node());
    //    node.children().css("text-align","right");
    //    if (slr && result.zscore[i] > 2) {
    //        node.css("background-color","pink");
    //    } else if (slr && result.zscore[i] < -2) {
    //        node.css("background-color","lightgreen");
    //    }
    //}
    //table.draw();
    tabview.switchTo('Regression');
    loading.hide();
}

function filter_data(num) {
    if (rChart) {
        if (!rChart.series[0].original) {
            rChart.series[0].original = new Array();
            rChart.series[0].data.forEach(function(p) { rChart.series[0].original.push([p.x, p.y]) });
        }
        var oldData = rChart.series[0].original;
        var newData = oldData.slice(0, oldData.length-num);
        rChart.series[0].setData(newData);
        $('#ObservationLag').val(num);
    }
}

