function search_quandl(ticker) {
    $.getJSON('quotes/security', {ticker: ticker, yticker: ticker, action: 'quandl'}, onquandl);
}

function onquandl(result) {
    var series = Object.keys(result).slice(-1).map(function(e) {
        return {
            type: 'line',
            name: e,
            data: result[e],
            yAxis: 0,
            tooltip: { valueDecimals: 2, valueSuffix: '' },
        }
    });
    $('#QUANDLChart').highcharts('StockChart', {
        title: { text: '' },
        chart: { height: 600, zoomType: 'x' },
        rangeSelector: { selected: 2, inputEnabled: false, buttons: [
            {type: 'month', count: 6, text: '6m' },
            {type: 'ytd', text: 'YTD' },
            {type: 'year', count: 1, text: '1y' },
            {type: 'year', count: 3, text: '3y' },
            {type: 'year', count: 5, text: '5y' },
            {type: 'all', text: 'All' }
        ]},
        legend: {
            enabled: true,
            layout: 'vertical',
            align: 'right',
            verticalAlign: 'middle',
            borderWidth: 0
        },
        //xAxis: { ordinal: true },
        xAxis: {
              type: 'datetime',
              dateTimeLabelFormates: { day: '%d-%M' },
              crosshair: true,
              ordinal: false,
        },

        yAxis: [ { opposite: false, labels: { align: 'right' }, title: { text: 'Price' }, offset: 0, startOnTick: false, endOnTick: false, minPadding: 0 }, 
        ],
        tooltip: { crosshairs: [true, true] },
        series: series,
    });

    loading.hide();
}
