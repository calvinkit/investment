var curr_indicator = null;
var curr_security = null;

$(document).ready(function(){
    $('#ResearchAccordion').accordion({active:0, heightStyle: 'content'});

    if ($('#security').length>0) {
        $('#security').dataTable({
            "bPaginate": false,
            "bInfo": false,
            "bProcessing": true,
            "bFilter": false,
            "bSort": false,
            "sDom": 'irtlp',
            "aoColumnDefs": [{
                    "mRender": function (data, type, row) { return "<a href='https://www.google.com/finance?q="+(row[2]=="TSE"?"TSE:":"")+data+"' target=_blank>"+data+"</a>"; },
                    "aTargets": [0]
                    }]
        });
    }

    $('#ResearchHoldings').dataTable({
        "bPaginate": false,
        "bInfo": false,
        "bProcessing": true,
        "bFilter": false,
        "sDom": 'irtlp',
        "aaSorting": [[1,'desc']],
        "aoColumnDefs": [{
            "sType":"formatted-num", 
            "mRender": function (data, type, row) { return humanize.numberFormat(data,2); },
            "aTargets": [1,2,3,4,5]
            }],
        "rowCallback": function(row, data, index) {
            //$(row).children().css("text-align","right");
            $(row).children().eq(1).css("text-align","right")
            $(row).children().eq(2).css("color",data[2]>0.01?"green":"red").css("text-align","right")
            $(row).children().eq(3).css("color",data[3]<0.001?"red":"green").css("text-align","right");
            $(row).children().eq(4).css("color",data[4]<0.01?"red":"green").css("text-align","right");
            $(row).children().eq(5).css("color",data[5]<0.01?"red":"green").css("text-align","right");
        },
        "fnFooterCallback": function (aFoot, aData, iStart, iEnd, aiDisplay) { 
            var total = 0;
            for (var i=iStart; i<iEnd; ++i) {
                total += aData[aiDisplay[i]][1];
            }
            $(aFoot).find('th').eq(1).text(humanize.numberFormat(total,0));
        }
    });
    $('#ResearchPlotStyle').chosen({ disable_search:true, width: '70px', inherit_select_classes: true});
    $('#ResearchComparison').chosen({ disable_search:true, width: '100px', inherit_select_classes: true});
    $('#ResearchPlotStyle').on('change', function(e, params) { research_onchangestyle(); });
    $('#ResearchTechnical').chosen({ width: '230px' });
    $('#ResearchTechnical').on('change', function(e, params) { research_updateAxis(); research_addFibonacci(); });
    $('#FinancialsTabView').tabs({ active:1, heightStyle: "content" });
});

function search_security(ticker, yticker, country) {
    loading.show(); 
    $.getJSON('quotes/security', {ticker: ticker, yticker: yticker, country: country, action: 'financials'}, onsecurity);
}

function get_quotes(ticker, yticker, country) {
    loading.show(); 
    $.getJSON('quotes/security', {ticker: ticker, yticker: yticker, country: country, action: 'quotes'}, onsecurity);
}

function onsecurity(security) {
    tabview.switchTo('Research');
    if ($('#ResearchComparison').val()!="No" && $('#security').length) $("#security").DataTable().clear().draw();
    if (onerror(security)) return true;
    if ($('#ResearchComparison').val()=="No") {
        curr_indicator = new Indicator(security.quotes);
        curr_security = security;
    }
    if ($('#security').length) {
        var row = $('#security').DataTable().row.add([security.ticker,
                                                   security.name,
                                                   security.exchange,
                                                   security.sector,
                                                   security.price]).draw().node();
    }
    $('#GoogleTicker').val(security.ticker);
    $('#YahooTicker').val(security.yticker);
    $('#Country').val(security.country);
    // Save the data to the download button
    var data = security.quotes.map(function(e) { return [new Date(e.date).toExcelDate(), e.price].join(",") }).join("\r\n");
    $('#ResearchDownload').attr('data',data);
    $('#ResearchDownload')[0].onclick = function() { download('data.csv', $(this).attr('data')); };
    onchartplotting(security);
    research_onmacd(security);
    onfinancials(security);
    onholdings(security);
    loading.hide();
}

function onchartplotting(security) {
    var indicator = new Indicator(security.quotes);
    var closes = indicator.series;
    var sma20 = indicator.sma(20);
    var stddev = statistics.StripTimeSeries(closes).map(function(e,i,a) { return i<20?0:statistics.stdev(a.slice(i-20,i)); });

    if (!chart || $('#ResearchComparison').val()=="No") {
        $('#myChart').highcharts('StockChart', {
            title: { text: security.name },
            chart: { height: 800, zoomType: 'x' },
            rangeSelector: { selected: 2, inputEnabled: false, buttons: [
                {type: 'month', count: 1, text: '1m' },
                {type: 'month', count: 3, text: '3m' },
                {type: 'month', count: 6, text: '6m' },
                {type: 'ytd', text: 'YTD' },
                {type: 'year', count: 1, text: '1y' },
                {type: 'year', count: 3, text: '3y' },
                {type: 'all', text: 'All' }
            ]},
            legend: {
                enabled: true,
                layout: 'vertical',
                align: 'right',
                verticalAlign: 'middle',
                borderWidth: 0,
                itemHoverStyle: { color: '#cccccc' },
                itemStyle: { color: 'white' },
                itemHiddenStyle: { color: '#999999' }
            },
            xAxis: { ordinal: true,                 
                     events: { 
                        afterSetExtremes: function(event) { research_addFibonacci(); }
                     }
                   },
            yAxis: [ { top: 0, opposite: false, labels: { align: 'right' }, title: { text: 'Price' }, offset: 0, startOnTick: false, endOnTick: false, minPadding: 0 }, 
                     { top: 0, opposite: true, labels: { align: 'right' }, title: { text: 'Compare' }, offset: 0, startOnTick: false, endOnTick: false, minPadding: 0 }, 
                     { opposite: true,  labels: { align: 'right' }, title: { text: 'Volumn' }, offset: 0 },
                     { 
                         top: "70%", opposite:false, labels: { align:'right' }, title: {text:'MACD'}, offset:0, startOnTick: false, endOnTick: false, gridLineWidth: 0,
                        plotLines:[ { value:0, color:'#cccccc', dashStyle:'solid', width:1 } ]
                     },
                     { 
                         top: "85%",opposite: false, labels: { align: 'right' }, title: { text: 'RSI (14-day)'}, min: 10, max: 90, offset: 0, gridLineWidth: 0,
                        plotLines: [ { value: 70, color: 'red', dashStyle: 'shortdash', width: 2 },{ value: 30, color: 'green', dashStyle: 'shortdash', width: 2 } ], 
                     },
            ],
            tooltip: { crosshairs: [true, true] },
            navigator: { 
                series: { fillColor: { 
                    linearGradient: { x1:0, y1:0, x2:0, y2: 1 } ,
                    stops: [
                        [0, Highcharts.getOptions().colors[0]],
                        [1, Highcharts.Color(Highcharts.getOptions().colors[0]).setOpacity(0).get('rgba')]
                    ]
                } }
            },
            series: [
            {
                type: 'line',
                name: security.ticker,
                data: closes,
                yAxis: 0,
                tooltip: { valueDecimals: 2, valueSuffix: '' },
            }
            ,{
                type: 'column',
                name: security.ticker+' vol',
                data: security.quotes.map(function(e) { return [e.date, e.vol] }),
                yAxis: 2,
                tooltip: { valueDecimals: 0, valueSuffix: '' },
                linkedTo: ':previous',
            }
            ,{
                type: 'spline',
                name: security.ticker+' RSI',
                data: curr_indicator.rsi(14),
                yAxis: 4,
                tooltip: { valueDecimals: 2, valueSuffix: '' },
                linkedTo: ':previous',
            }
            ]
        });
        chart = $('#myChart').highcharts();
    } else if (chart) {
        chart.addSeries({
            type: 'line',
            name: security.ticker,
            data: closes,
            yAxis: $('#ResearchComparison').val()=="Same"?0:1,
            tooltip: { valueDecimals: 2, valueSuffix: '%' }

        }); 
        //$('#ResearchPlotStyle').prop('checked', true);
    }
    research_updateAxis();
    research_onchangestyle();
}

function research_onmacd(security) {
    var argu = $('#ResearchMACD').val().split(',');
    var macd = curr_indicator.macd(argu[0], argu[1], argu[2]);
    if (chart) {
        chart.series.filter(function(s) { return s.name.indexOf(curr_security.ticker+' MACD') > -1; }).forEach(function(e) { e.remove(false); });
        chart.addSeries({
            type: 'spline',
            name: curr_security.ticker+' MACD',
            data: macd.macd,
            color: 'white',
            step: true,
            yAxis: 3,
            tooltip: { valueDecimals: 2, valueSuffix: '' },
        });
        chart.addSeries({
            type: 'spline',
            name: curr_security.ticker+' MACD signal',
            data: macd.signal,
            color: 'red',
            step: true,
            yAxis: 3,
            tooltip: { valueDecimals: 2, valueSuffix: '' },
            linkedTo: ':previous',
        });
    }
}

function onholdings(security) {
    $('#ResearchHoldings').DataTable().clear().draw();
    for (var i=0; i<security.holdings.length; i++) {
        var ticker = security.holdings[i].t
        $.getJSON('quotes/security', {ticker:ticker,yticker:ticker, country:'',action:'quotes'}, (function(security) {
            var weighting = this.weighting;
            var chg1 = 0;
            var row = $('#ResearchHoldings').DataTable().row.add(
                [security.name,
                 weighting,
                 security.returns['1d'].pop()[1]*100,
                 security.returns['10d'].pop()[1]*100,
                 security.returns['20d'].pop()[1]*100,
                 security.returns['100d'].pop()[1]*100]
            ).draw().node();
        }).bind({weighting:parseFloat(security.holdings[i].weighting)}));
    }
}

function onfinancials(security) {
    var divs = {'#FinancialsOverviewChart': 'Overview',
                '#FinancialsProfitMarginChart': "Profit Margin % of Sales",
                '#FinancialsProfitabilityChart': "Profitability",
                //'#FinancialsGrowthChart': 'Revenue %',
                '#FinancialsCashflowChart': "Cashflow Ratios",
                '#FinancialsBalanceSheetChart': "BalanceSheet Ratios",
                '#FinancialsLiquidityChart': "Liqudity Ratios",
                '#FinancialsEfficiencyChart': "Efficiency Ratios" }
    if (onerror(security)) return true;
    if (security.financial) {
        var financial = security.financial;
        Object.keys(divs).forEach(function(div) {
            div = $(div);
            div.empty();
            div.highcharts('StockChart', {
                chart: { zoomType: 'x' },
                title: { text: '' },
                rangeSelector: { selected: 4, inputEnabled: false, buttons: [
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
                    dateTimeLabelFormates: { day: '%b-%Y' },
                    ordinal: false,
                },
                yAxis: [ { opposite: false, crosshair: true, labels: { align: 'right' }, title: { text: '' }, startOnTick: false, endOnTick:true, minPadding: 0 },],
                tooltip: { crosshairs: true },
                legend: {
                    enabled: true,
                    layout: 'vertical',
                    align: 'right',
                    verticalAlign: 'middle',
                    borderWidth: 0
                },
                series: [],
                exporting: {
                    sourceWidth: 1000,
                    sourceHeight: 400,
                    scale: 2
                }
            });
            var chart = div.highcharts();
            var section = financial[divs[div.selector]];
            if (section) {
                Object.keys(section).forEach(function(key) {
                    if (key != "dates") {
                        chart.addSeries({
                            name: key,
                            data: section.dates.map(function(e,i) { return [e, parseFloat(section[key][i])]; }),
                            //tooltip: { valueDecimals: 0 },
                            yAxis: 0,
                        });
                    }
                });
            }
        });
        $('#FinancialsTabView').tabs('refresh');
    }
}

function research_onchangestyle() {
    if (chart && chart.yAxis[0]) { 
        switch (parseInt($('#ResearchPlotStyle').val())) {
            case 1:
                chart.series[0].update({ data: curr_indicator.series, type: 'line' });
                chart.yAxis[0].setCompare(null,true);
                break;
            case 2:
                chart.series[0].update({ data: curr_indicator.series, type: 'line' });
                chart.yAxis[0].setCompare('percent');
                break;
            case 3:
                chart.yAxis[0].setCompare(null);
                chart.series[0].update({ data: curr_indicator.ohlc, type: 'candlestick' }, true);
                break;
        }
    }
}

function research_updateAxis() {
    chart.yAxis[0].update({ top: '0%', height: '60%'});  // Price
    chart.yAxis[1].update({ top: '0%', height: '60%'});  // Sharpe
    chart.yAxis[2].update({ top: '60%', height: '10%'}); // Vol
    chart.yAxis[3].update({ top: '70%', height: '15%'}); // MACD
    chart.yAxis[4].update({ top: '85%', height: '15%'}); // RSI
}

function research_addtrend(value) {
    if (chart) {
        chart.yAxis[0].addPlotLine({ value: value, dashStyle: 'shortdash', color: 'red', width: 2 });
    }
}

function research_addMA() {
    var ma = $('#ResearchMA').val();
    var name = $('#GoogleTicker').val()+' '+ma+'d sma';
    var bBollinger = ($('#ResearchTechnical').val()&&$('#ResearchTechnical').val().indexOf('Bollinger')>-1);
    var bExist = false;
    if (chart) {
        chart.series.filter(function(e) { return e.name == name; }).forEach(function(e) { bExist = true; e.show(); });
        if (!bExist) {
            var bollinger = curr_indicator.bollinger(statistics, ma, 2); 
            chart.addSeries({
                data: curr_indicator.sma(ma),
                name: name,
                yAxis: 0,
                tooltip: { valueDecimals: 4, valueSuffix: '' }
            });
            if (bBollinger) {
                chart.addSeries({
                    linkedTo: ':previous',
                    data: bollinger,
                    yAxis: 0,
                    type: 'arearange',
                    fillOpacity: 0.3,
                    zIndex: 0,
                    color: '#9fc7f4',
                    //tooltip: { valueDecimals: 4, valueSuffix: 'bp' },
                });
            }
        }
    }
    $('#ResearchMA').val('');
}

function research_addHistVol() 
{
    if (chart && curr_indicator) {
        var isSpread = true;
        var forwradVol = false; //forwrad looking vol?
        var days = parseInt($('#ResearchHistVolPeriod').val());
        var data = curr_indicator.series;
        var histvol = statistics.histvolatility(data, days, forwradVol);
        chart.addSeries({
            name: $('#GoogleTicker').val()+' hist '+days+'-d vol',
            data: histvol,
            yAxis: 1,
        });
        $('#ResearchHistVolPeriod').val('');
    }
}

function research_addFibonacci() 
{
    var bFibonacci = ($('#ResearchTechnical').val()&&$('#ResearchTechnical').val().indexOf('Fibonacci')>-1);
    if (chart) {
        var s = chart.series.filter(function(s) { return s.name.indexOf('Fibonacci') > -1; });
        s.forEach(function(e) { e.remove(false); });
    }
    if (bFibonacci && chart) {
        var fibonacci = new Indicator(chart.series[0].points.map((e) => ({ date:e.x,price:e.y,lo:e.y,hi:e.y,vol:0}))).fibonacci();
        chart.addSeries({data: fibonacci[5], name: 'Fibonacci', yAxis: 0});
        [-5,-4,-3,-2,-1,1,2,3,4,5].forEach(function(i) {
            chart.addSeries({data: fibonacci[5-i], name: 'Fibonacci'+i, yAxis: 0,linkedTo: ':previous'});
        });
    } 
    chart.redraw();
}
