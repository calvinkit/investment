var curr_indicator = null;

$(document).ready(function(){
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
    $('#ResearchTechnical').chosen({ width: '230px' });
    $('#ResearchTechnical').on('change', function(e, params) { research_updateAxis(); });
    $('#FinancialsTabView').tabs({ active:1, heightStyle: "content" });

    socket.on('security', onsecurity);
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
    $('#TabView').tabs('option','active',1);
    if (!$('#ResearchCompare').prop('checked')) $("#security").DataTable().clear().draw();
    if (onerror(security)) return true;
    var indicators = curr_indicator = new Indicator(security.quotes);
    var row = $('#security').DataTable().row.add([security.ticker,
                                               security.name,
                                               security.exchange,
                                               security.sector,
                                               security.price]).draw().node();
    $('#GoogleTicker').val(security.ticker);
    $('#YahooTicker').val(security.yticker);
    $('#Country').val(security.country);
    // Save the data to the download button
    var data = security.quotes.map(function(e) { return [new Date(e.date).toExcelDate(), e.price].join(",") }).join("\r\n");
    $('#ResearchDownload').attr('data',data);
    $('#ResearchDownload')[0].onclick = function() { download('data.csv', $(this).attr('data')); };
    plot_charts(security);
    onfinancials(security);
    onholdings(security);
    loading.hide();
}

function plot_charts(security) {
    var ohlc = security.quotes.map(function(e) { return [e.date, e.open, e.hi, e.lo, e.price] });
    var closes = curr_indicator.series;
    var sma20 = curr_indicator.sma(20);
    var stddev = statistics.StripTimeSeries(closes).map(function(e,i,a) { return i<20?0:statistics.stdev(a.slice(i-20,i)); });
    var macd = curr_indicator.macd(12,26,9);

    if (!chart || !$('#ResearchComparison').prop('checked')) {
        $('#myChart').highcharts('StockChart', {
            title: { text: security.ticker },
            chart: { height: 600, zoomType: 'x' },
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
                borderWidth: 0
            },
            xAxis: { ordinal: true },
            yAxis: [ { opposite: false, labels: { align: 'right' }, title: { text: 'Price' }, offset: 0, startOnTick: false, endOnTick: false, minPadding: 0 }, 
                     { opposite: true, labels: { align: 'right' }, title: { text: 'Sharpe' }, offset: 0, startOnTick: false, endOnTick: false, minPadding: 0 }, 
                     { opposite: true,  labels: { align: 'right' }, title: { text: 'Volumn' }, offset: 0 },
                     { 
                        opposite: false, labels: { align: 'right' }, title: { text: 'RSI (14-day)'}, min: 0, max: 100, offset: 0,
                        plotLines: [ { value: 70, color: 'red', dashStyle: 'shortdash', width: 4 },{ value: 30, color: 'green', dashStyle: 'shortdash', width: 4 } ], 
                     },
                     { opposite:false,labels:{align:'right'},title:{text:'MACD'},offset:0,top:'85%',height:'15%',tickPixelInterval:10,plotLines:[{value:0,color:'black',dashStyle:'solid',width:1}]},
            ],
            tooltip: { crosshairs: [true, true] },
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
                yAxis: 3,
                tooltip: { valueDecimals: 2, valueSuffix: '' },
                linkedTo: ':previous',
            }
            ,{
                type: 'line',
                name: security.ticker+' 30d sharpe',
                data: curr_indicator.sharpe(statistics, 30,0),
                yAxis: 1,
                tooltip: { valueDecimals: 2, valueSuffix: '' },
            }
            ,{
                //type: 'line',
                name: security.ticker+' MACD',
                data: macd.macd,
                step: true,
                yAxis: 4,
                tooltip: { valueDecimals: 2, valueSuffix: '' },
            }
            ,{
                //type: 'line',
                name: security.ticker+' MACD signal',
                data: macd.signal,
                step: true,
                yAxis: 4,
                tooltip: { valueDecimals: 2, valueSuffix: '' },
                linkedTo: ':previous',
            }
            ]
        });
        chart = $('#myChart').highcharts();
    } else if (chart && $('#ResearchComparison').prop('checked')) {
        chart.addSeries({
            type: 'line',
            name: security.ticker,
            data: closes,
            yAxis: 0,
            tooltip: { valueDecimals: 2, valueSuffix: '%' }

        }); 
        chart.addSeries({
            type: 'line',
            name: security.ticker+' 30d sharpe',
            data: curr_indicator.sharpe(statistics, 30, 0),
            yAxis: 1,
            tooltip: { valueDecimals: 2, valueSuffix: '' }

        }); 
        $('#ResearchPercent').prop('checked', true);
    }
    research_updateAxis();
    research_toggle_percent();
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
    if (security.financials) {
        var financials = security.financials;
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
            var section = financials[divs[div.selector]];
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

function research_toggle_percent() {
    if (chart && chart.yAxis[0]) chart.yAxis[0].setCompare($('#ResearchPercent').prop('checked')?'percent':null,true);
}

function research_updateAxis() {
    var bMACD = $('#ResearchTechnical')[0][0].selected;
    chart.yAxis[0].update({ top: '0%', height: '70%'});  // Price
    chart.yAxis[1].update({ top: '0%', height: '70%'});  // Sharpe
    chart.yAxis[2].update({ top: '70%', height: '10%'}); // Vol
    chart.yAxis[3].update({ top: '80%', height: bMACD?'10%':'20%'}); // RSI
    chart.yAxis[4].update({ top: '90%', height: bMACD?'10%':'0%', visible: bMACD}); // MACD
}

function research_addtrend(value) {
    if (chart) {
        chart.yAxis[0].addPlotLine({ value: value, dashStyle: 'shortdash', color: 'red', width: 2 });
    }
}

function research_addMA() {
    var ma = $('#ResearchMA').val();
    var name = $('#GoogleTicker').val()+' '+ma+'d sma';
    var bBollinger = $('#ResearchTechnical')[0][1].selected;
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
    if (chart) {
        var isSpread = rate_recentData.length>1;
        var forwradVol = false; //forwrad looking vol?
        var days = parseInt($('#ResearchHistVolPeriod').val());
        var data = rate_recentData[0].map(function(e,i,a) { return [e[0], e[1]*(isSpread?1:100)]; });
        var histvol = statistics.histvolatility(data, days, forwradVol);
        chart.addSeries({
            name: $('#Tenor').val()+' hist '+days+'-d vol',
            data: histvol,
            yAxis: 3,
        });
        $('#ResearchHistVolPeriod').val('');
    }
}
