Date.prototype.nextBizDay = function() {
    var dayOfWeek = this.getDay();
    if (dayOfWeek == 5)
        this.setTime(this.getTime()+3*1000*60*60*24);
    else if (dayOfWeek == 6)
        this.setTime(this.getTime()+2*1000*60*60*24);
    else
        this.setTime(this.getTime()+1*1000*60*60*24);
    return this;
};

Date.prototype.prevBizDay = function() {
    var dayOfWeek = this.getDay();
    if (dayOfWeek == 1)
        this.setTime(this.getTime()-3*1000*60*60*24);
    else if (dayOfWeek == 0)
        this.setTime(this.getTime()-2*1000*60*60*24);
    else
        this.setTime(this.getTime()-1*1000*60*60*24);
    return this;
};

$(document).ready(function(){
    $('#VIXDate').datepicker({dateFormat: 'd-M-yy', onSelect: onchange_vixdate, beforeShowDay: $.datepicker.noWeekends });
    $('#VIXDate').datepicker("setDate", new Date());
    $('#VIXContango').dataTable({
        sDom: 'irtlp',
        bPaginate: false,
        bInfo: false,
        bFilter: false,
        bSort: false,
    });
    socket.on('vix term structure', onvixtermstrucure);
    socket.on('vix futures', onvixfutures);
});

function onvixfutures(data) {
    var series = data.map(function(e) { return [ new Date(e.Date).getTime(), e.Close ] });
    $('#VIXChart').highcharts('StockChart', {
        title: { text: 'VIX' },
        chart: { height: 400, zoomType: 'x' },
        rangeSelector: { selected: 4, inputEnabled: false },
        legend: {
            enabled: true,
            layout: 'vertical',
            align: 'right',
            verticalAlign: 'middle',
            borderWidth: 0
        },
        yAxis: [ { opposite: false, labels: { align: 'right' }, title: { text: 'Volatility' }, height: '100%', offset: 0 }], 
        series: [{
            type: 'line',
            name: data[0].Contract,
            data: series,
            yAxis: 0,
            tooltip: { valueDecimals: 2, valueSuffix: '' },
        }]
    });
}

function onchange_vixdate() {
    var vixdate = $('#VIXDate').datepicker("getDate");
    socket.emit('vix term structure', vixdate);
}

function onvixtermstrucure(data) {
    var series = data.map(function(e) { return {x:(e.ContractDate-e.Date)/(1000*60*60*24), y:e.Close, name:e.Contract} });;
    if (data.length < 1) return;
    var date = new Date(data[0].Date);
    if ($('#VIXFuturesChart').highcharts() && $('#VIXCompare').prop('checked')) {
        $('#VIXFuturesChart').highcharts().addSeries({
            type: 'line',
            name: date.toLocaleDateString(),
            data: series,
            yAxis: 0,
        }); 
    } else {
        $('#VIXFuturesChart').highcharts({
            title: { text: 'VIX Futures Term Structure' },
            chart: { height: 400, zoomType: 'x' },
            legend: {
                enabled: true,
                layout: 'vertical',
                align: 'right',
                verticalAlign: 'middle',
                borderWidth: 0
            },
            xAxis: { min: 0 },
            yAxis: [ { opposite: false, labels: { align: 'right' }, title: { text: 'Volatility' }, height: '100%', offset: 0 }], 
            tooltip: { formatter: function() { return this.point.name+"<br/>"+this.point.y; } },
            plotOptions: { series: { 
                cursor: 'pointer',
                dataLabels: { 
                    enabled: true,
                    formatter: function() { return this.point.name+"  "+this.y; },
                },
                point: { events: {
                    click: function() {
                        socket.emit('vix futures', this.name);
                    }
                } },
            } },
            series: [{
                type: 'line',
                name: date.toLocaleDateString(),
                data: series,
                yAxis: 0,
            }]
        });
    }

    if (!$('#VIXCompare').prop('checked')) $('#VIXContango').DataTable().clear().draw();
    var row = $('#VIXContango').DataTable().row.add([new Date(data[0].Date).toLocaleDateString(), 
                                                     Math.round((series[1].y-series[0].y)*100)/100,
                                                     Math.round((series[2].y-series[1].y)*100)/100,
                                                     Math.round((series[3].y-series[2].y)*100)/100]).draw().node();
}

function nextBizDay() {
    $('#VIXDate').datepicker('setDate', $('#VIXDate').datepicker('getDate').nextBizDay());
}

