var nOptionsReports = 0;

function showOptionsReports(date) {
    date=(date==""?new Date().toTimestamp():date.replace(/-/g,''));
    if ($('#OptionsReportsTabView').tabs()) $('#OptionsReportsTabView').tabs('destroy')
    $('#OptionsReportWrapper').text('');
    nOptionsReports++;$('#OptionsReportWrapper').load('reports/options.html', setupOptionsReports.bind($('#OptionsReportWrapper')));
    loading.show();
}

function setupOptionsReports() {
    var tables = this.find("table[id=OptionsReport]");
    for (var i=0; i<tables.length; i++) setupOptionsReportTable(tables[i]);
    if (--nOptionsReports <= 0) {
        $('#OptionsReportsTabView').tabs({ active:0, heightStyle: "content" });
        loading.hide();
    } 
}

function setupOptionsReportTable(table) {
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
