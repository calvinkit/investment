$(document).ready(function(){
    $('#ScreenResult').DataTable({
        "bPaginate": false, 
        "bInfo": false, 
        "bProcessing": true,
        "sDom": 'irtlp',
        //"aaSorting": [[2,'desc'],[0,'asc']],
        "aoColumnDefs": [{
                "sType":"formatted-num", 
                "mRender": function (data, type, row) { return humanize.numberFormat(data,2); },
                "sClass": "css_right",
                "aTargets": [1,2,3,4],
                }],
    });
    for (var i=0; i<criterias.length; i++) $('#ScreenCriteria').append(new Option(criterias[i].description,i));

    $.fn.dataTableExt.afnFiltering.push (function( oSettings, aData, iDataIndex ) {
        if ( oSettings.nTable != document.getElementById('ScreenResult')) return true;
        return true;
    });
    var table = $('#ScreenResult').DataTable();

    socket.on('stock screen result', onscreenresult);
});

function run_stock_screen(exchanges, index, sector) {
    socket.emit("stock screen", exchanges, index, sector);
    $('#ScreenResult').DataTable().clear().draw();
    loading.show();
    return true;
}

function onscreenresult(security) {
    var table = $('#ScreenResult').DataTable();
    var row = $(table.row.add(['','',0,0,0,0,0,0,0]).node());
    table.row(row).data([security.ticker,
                         security.price,
                         security.indicators["ema50"].slice(-1)[0][1],
                         security.indicators["ema100"].slice(-1)[0][1],
                         security.indicators["rsi"].slice(-1)[0][1],
                         security.sector,
                         security.industry]).draw();
    row.data('security',security);
    row.children().eq(0).attr("title", security.name);
    row.children().eq(0).off('click').click(function() { var s = $(this).parent().data('security'); onsecurity(s); return true; });
    loading.hide();
    return true;
}

function run_criteria_filter(index) {
    if (index != "") {
    }
}
