var nReports = 0;
var nBondReports = 0;

function showReports(date) {
    nReports = 0;
    date=(date==""?new Date().toTimestamp():date).replace(/-/g,'');
    $('#CurveReportWrapper').text('');
    $('#PCADailyReportWrapper').text('');
    $('#PCAWeeklyReportWrapper').text('');
    $('#PCAMonthlyReportWrapper').text('');
    $('#RegressionDailyReportWrapper').text('');
    $('#RegressionWeeklyReportWrapper').text('');
    $('#RegressionMonthlyReportWrapper').text('');

    $('#CurveReportWrapper').load('reports/curve.'+date+'.html', setupReports.bind($('#CurveReportWrapper')));nReports++;
    //$('#PCADailyReportWrapper').load('reports/daily.pca.'+date+'.html', setupReports.bind($('#PCADailyReportTab')));nReports++;
    //$('#PCAWeeklyReportWrapper').load('reports/weekly.pca.'+date+'.html', setupReports.bind($('#PCAWeeklyReportTab')));nReports++;
    //$('#PCAMonthlyReportWrapper').load('reports/monthly.pca.'+date+'.html', setupReports.bind($('#PCAMonthlyReportTab')));nReports++;
    $('#RegressionDailyReportWrapper').load('reports/daily.regression.'+date+'.html', setupReports.bind($('#RegressionDailyReportTab')));nReports++;
    $('#RegressionWeeklyReportWrapper').load('reports/weekly.regression.'+date+'.html', setupReports.bind($('#RegressionWeeklyReportTab')));nReports++;
    $('#RegressionMonthlyReportWrapper').load('reports/monthly.regression.'+date+'.html', setupReports.bind($('#RegressionMonthlyReportTab')));nReports++;
    //tabview.switchTo('Reports');
    loading.show();
}

function reload_bond_reports(date) {
    date=(date==""?new Date().toTimestamp():date.replace(/-/g,''));
    nBondReports = 3;
    if ($('#BondRegressionReportsView').tabs()) $('#BondRegressionReportsView').tabs('destroy')
    $('#BondRegressionDailyReportWrapper').text('');
    $('#BondRegressionWeeklyReportWrapper').text('');
    $('#BondRegressionMonthlyReportWrapper').text('');
    $('#BondRegressionDailyReportWrapper').load('reports/daily.bondregression.'+date+'.html', setupBondReports.bind($('#BondRegressionDailyReportTab')));
    $('#BondRegressionWeeklyReportWrapper').load('reports/weekly.bondregression.'+date+'.html', setupBondReports.bind($('#BondRegressionWeeklyReportTab')));
    $('#BondRegressionMonthlyReportWrapper').load('reports/monthly.bondregression.'+date+'.html', setupBondReports.bind($('#BondRegressionMonthlyReportTab')));
    tabview.switchTo('BondReportTab');
    loading.show();
}

function setupReports() {
    setupSparkline(this);
    var tables = this.find("table");
    for (var i=0; i<tables.length; i++) setupReport(tables[i]);
    if (--nReports == 0) {
        $('#CurveTabView').tabs({ active:0, heightStyle: "content" });
        //$('#PCAReportsView').tabs({ active:0, heightStyle: "content" });
        $('#RegressionReportsView').tabs({ active:0, heightStyle: "content" });
        loading.hide();
    } 
}

function setupBondReports() {
    setupSparkline(this);
    var tables = this.find("table");
    for (var i=0; i<tables.length; i++) setupReport(tables[i]);
    if (--nBondReports == 0) {
        $('#BondRegressionReportsView').tabs({ active:0, heightStyle: "content" });
        loading.hide();
    } 
}

function setupReport(table) {
    var option;
    switch (table.id) {
        case 'DailyReport':
            option = { 
                "aaSorting": [[ 0, "asc" ]],
                "bPaginate": false, 
                "bInfo": false, 
                "bSort": true,
                "sDom": 'irtlp',
                "bProcessing": true,
                "aoColumnDefs": [
                {   "sType":"formatted-num", 
                    "aTargets": [1,3,9]
                },               
                { 
                    "sType":"formatted2-num", 
                    "aTargets": [2,4,5,6,7,8,10,11,12,13],
                    "mRender": function (data, type, row) { return humanize.numberFormat(data,3); },
                }]
            };
            break;
        case 'BondDailyReport':
            option = { 
                "aaSorting": [[ 0, "asc" ]],
                "bPaginate": false, 
                "bInfo": false, 
                "bSort": true,
                "sDom": 'irtlp',
                "bProcessing": true,
                "aoColumnDefs": [
                {   "sType":"formatted-num", 
                    "aTargets": [1,3,9]
                },               
                { 
                    "sType":"formatted2-num", 
                    "aTargets": [2,4,5,6,7,8,10,11,12,13],
                    "mRender": function (data, type, row) { return humanize.numberFormat(data,3); },
                }]
            };
            break;
        case 'CurveReport':
            option = { 
                "aaSorting": [],
                "bPaginate": false, 
                "bInfo": false, 
                "bSort": false,
                "sDom": 'irtlp',
                "bProcessing": true
            };
            break;
        default: //PCA
            var size = $(table).find("tr:first th").length;
            option = { 
                "aaSorting": [],
                "bPaginate": false, 
                "bInfo": false, 
                "bSort": true,
                "sDom": 'irtlp',
                "bProcessing": true,
                "aoColumnDefs": [{ 
                    "sType":"formatted-num", 
                    "aTargets": Array.apply(null, Array(size-1)).map(function(k,i) { return i+1; }),
                    "mRender": function (data, type, row) { return humanize.numberFormat(data,3); }
                }]

            };
            break;
    }
    $(table).DataTable(option);
}

function setupSparkline(wrapper) {
    var spans = wrapper.find('table[id=DailyReport] tr td:nth-child(4) span')
    for (var i=0; i<spans.length; i++) {
        $(spans[i]).sparkline('html',{width:'120px'});
    }
    var spans = wrapper.find('table[id=DailyReport] tr td:nth-child(10) span')
    for (var i=0; i<spans.length; i++) {
        $(spans[i]).sparkline('html',{type:'bar',barWidth:'2px',barSpacing:'0px'});
    }
    var spans = wrapper.find('table[id=BondDailyReport] tr td:nth-child(4) span')
    for (var i=0; i<spans.length; i++) {
        $(spans[i]).sparkline('html',{width:'120px'});
    }
    var spans = wrapper.find('table[id=BondDailyReport] tr td:nth-child(10) span')
    for (var i=0; i<spans.length; i++) {
        $(spans[i]).sparkline('html',{type:'bar',barWidth:'2px',barSpacing:'0px'});
    }
    var spans = wrapper.find('table[id=CurveReport] tr td span')
    for (var i=0; i<spans.length; i++) {
        $(spans[i]).sparkline('html',{width:'122',height:'25',drawNormalOnTop: true});
    }
}

function runregression_report(query) {
    $('#RegressionTarget').val(query.RegressionTarget);
    $('#RegressionRegressor').val(query.RegressionTenor);
    $('#RegressionDays').val(query.RegressionDays);
    $('#RegressionAsOf').val(query.RegressionAsOf);
    $('#RegressionDate').val(query.RegressionDate);
    $('#RegressionTargetCountry').val('K2');
    $('#RegressionRegressorCountry').val('K2');
    run_regress();
}

jQuery.extend( jQuery.fn.dataTableExt.oSort, {
    "custom-pre": function( data ) {
      var query = JSON.parse(data.toString().match(/{.*}/)[0].replace(/&quot;/g,'"'));
      var target = query.RegressionTarget;
      var tenor = query.RegressionTenor;
      var retval = 0;
      for (retval=0; retval < regressStrategies.length; retval++) {
        if (regressStrategies[retval][0] == target && regressStrategies[retval][1] == tenor) break;
      }
      return retval;
    },
    "custom-desc": function (a,b) {
      return ((a < b) ? 1 : ((a > b) ? -1 : 0));
    },
    "custom-asc": function (a,b) {
      return ((a < b) ? -1 : ((a > b) ? 1 : 0));
    }
});
