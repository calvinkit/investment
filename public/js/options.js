var nReports = 0;
var nBondReports = 0;
var nOptionsReports = 0;
var regressStrategies = [];
var bondRegressStrategies = [];

function showOptionsReports(date) {
    nReports = 0;
    date=(date==""?new Date().toTimestamp():date.replace(/-/g,''));
    if ($('#OptionsReportsTabView').tabs()) $('#OptionsReportsTabView').tabs('destroy')
    $('#OptionsReportWrapper').text('');
    nOptionsReports++;$('#OptionsReportWrapper').load('reports/options.html', setupOptionsReports.bind($('#OptionsReportWrapper')));
    loading.show();
}

function setupOptionsReports() {
    var tables = this.find("table[id=OptionsReport]");
    for (var i=0; i<tables.length; i++) setupReport(tables[i]);
    if (--nOptionsReports <= 0) {
        $('#OptionsReportsTabView').tabs({ active:0, heightStyle: "content" });
        loading.hide();
    } 
}

function setupReport(table) {
    var option;
    switch (table.id) {
        case 'OptionsReport':
            var size = $(table).find("tr:first th").length;
            option = {
                "aaSorting": [],
                "bPaginate": false, 
                "bInfo": false, 
                "bSort": false,
                "sDom": 'irtlp',
                "bProcessing": true,
                "aoColumnDefs": [
                { 
                    "sType":"formatted2-num", 
                    "aTargets": Array.apply(null, Array(size-1)).map(function(k,i) { return i+1; }),
                    "mRender": function (data, type, row) { return humanize.numberFormat(data,3); }
                }]
            };
            break;
    }
    $(table).DataTable(option);
}
