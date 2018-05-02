$(document).ready(function(){
    $('#TransactionView').dialog({ 
        autoOpen: false, modal: true, draggable: true, closeOnEscape: true,
        ttile: 'Transactions History',
        width: 600,
        height: 'auto',
        show: { effect: 'slide', duration: 300 },
        hide: { effect: 'puff', duration: 300 },
        buttons: [ {text: 'Close', click: function() { $(this).dialog('close'); }} ]
    });

    $("#portfolio").DataTable({ 
        "bPaginate": false, 
        "bInfo": false, 
        "bProcessing": true,
        "sDom": 'irtlp',
        "aaSorting": [[7,'desc']],
        "columns": [ 
            { data:'security.ticker' },
            { data:'security.name' },
            { data:'transactions.pos' },
            { data:'value' },
            { data:'security.price' },
            { data:'transactions.avgCost' },
            { data:'yield' },
            { data:'dailyPnl' },
            { data:'transactions.pnl' },
            { data:'transactions.totalPnl' },
        ],
        "aoColumnDefs": [{
                "sType":"formatted-num", 
                "mRender": function (data, type, row) { return humanize.numberFormat(data,2); },
                "aTargets": [2,4,5,6] 
                },{
                "sType":"formatted-num", 
                "mRender": function (data, type, row) { return humanize.numberFormat(data,0); },
                "aTargets": [3,7,8,9] 
                },
                { "bVisible": false, "aTargets": [1]}],
        "rowCallback": function(row, investment, index) {
            $(row).data('investment',investment);
            $(row).children().css("text-align","right");
            $(row).children().eq(0).attr("title", investment.security.name);
            $(row).children().eq(0).off('click').click(function() { var s = $(this).parent().data('investment').security; search_security(s.ticker, s.yticker, s.country); return true; });
            $(row).children().eq(1).off('click').click(function() { show_transactions($(this).parent().data('investment')) });
            $(row).children().eq(3).addClass('tick').attr('title', investment.security.change+'/'+investment.security.pchange+'%');
            $(row).children().eq(5).css("color",investment.yield>0.01?"#00b909":"#c60606");
            $(row).children().eq(6).css("color",investment.dailyPnl<0.001?"#c60606":"#00b909");
            $(row).children().eq(7).css("color",investment.transactions.pnl<0.01?"#c60606":"#00b909");
            $(row).children().eq(8).css("color",investment.transactions.totalPnl<0.01?"#c60606":"#00b909");
            $(row).attr("id", investment.security.ticker.replace(".","_"));
        },
        "fnFooterCallback": function (aFoot, aData, iStart, iEnd, aiDisplay) { 
            var nTotal = [0,0,0,0];
            for (var i=iStart; i<iEnd; ++i) {
                nTotal[0] += aData[aiDisplay[i]].transactions.pnl;
                nTotal[1] += aData[aiDisplay[i]].dailyPnl;
                nTotal[2] += aData[aiDisplay[i]].transactions.totalPnl;
                nTotal[3] += aData[aiDisplay[i]].value;
            }
            $(aFoot).find('th').eq(6).text(humanize.numberFormat(nTotal[1],0));
            $(aFoot).find('th').eq(6).css("color",(nTotal[1]>=0?"#00b909":"#c60606"));
            $(aFoot).find('th').eq(7).text(humanize.numberFormat(nTotal[0],0));
            $(aFoot).find('th').eq(7).css("color",(nTotal[0]>=0?"#00b909":"#c60606"));
            $(aFoot).find('th').eq(8).text(humanize.numberFormat(nTotal[2],0));
            $(aFoot).find('th').eq(8).css("color",(nTotal[2]>=0?"#00b909":"#c60606"));
            $(aFoot).find('th').eq(2).text(humanize.numberFormat(nTotal[3],0));
            $(aFoot).find('th').eq(2).css("color",(nTotal[3]>=0?"#00b909":"#c60606"));
        }
    });

    $('#transactions').dataTable({
        "bPaginate": false,
        "bInfo": false,
        "bFilter": false,
        "bSort": false,
        "sDom": 'irtlp',
        "rowCallback": function(row, data, index) {
            $(row).children().css("text-align","right");
            $(row).children().eq(4).css("color",(data.pnl>=0?"#00b909":"#c60606"));
        },
        "columns": [{
            "render": function (data, type, row) { 
            return humanize.date('d-M-Y', new Date(data)); },
            "data": "date",
        },{
            "sType":"formatted-num", 
            "render": function (data, type, row) { return humanize.numberFormat(data,2); },
            "data": "qty",
        },{
            "sType":"formatted-num", 
            "render": function (data, type, row) { return humanize.numberFormat(data,2); },
            "data": "px",
        },{
            "sType":"formatted-num", 
            "render": function (data, type, row) { return humanize.numberFormat(data,0); },
            "data": "amount",
        },{
            "sType":"formatted-num", 
            "render": function (data, type, row) { return humanize.numberFormat(data,0); },
            "data": "pnl",
        }]
    });
    //editor = new $.fn.dataTable.Editor( {
    //    //ajax: "../php/staff.php",
    //    idSrc: 'date',
    //    table: "#transactions",
    //    fields: [ {
    //        label: "Date",
    //        name: "date"
    //        }, {
    //        label: "Qty:",
    //        name: "qty"
    //        }, {
    //        label: "Price:",
    //        name: "px"
    //        }, {
    //        label: "Amount:",
    //        name: "amount"
    //        }, {
    //        label: "PnL:",
    //        name: "pnl"
    //        }
    //    ],
    //});
    //$('#transactions').on( 'click', 'tbody td:not(:last-child)', function (e) {
    //    editor.inline( this, { onBlur:'close' });
    //});
    socket.on('investment', oninvestment);
});

function loadPortfolio() {
    var portfolioName = $("#portfolioName").val();
    var since = $('#PortfolioSince').val();
    $("#portfolio").DataTable().clear().draw();
    $.ajax({ type: "SUBSCRIBE", url: 'portfolio', data: { id: socket.id, portfolio: portfolioName, portfolioSince: since, closedPos: $('#ShowClosePos').prop('checked')?1:0 }, dataType: "json" });
    $('#msg').text('');
}

function oninvestment(portfolio, investment) {
    var curr_portfolio = $('#portfolioName').val();
    var table = $('#portfolio').DataTable();
    if (curr_portfolio == portfolio && ($('#ShowClosePos').prop('checked') || Math.abs(investment.transactions.pos)> 0.1)) {
        investment.value = investment.transactions.pos*investment.security.price;
        var row = $("#"+investment.security.ticker.replace(".","_"));
        if (row.length == 0) row = $(table.row.add(investment).node());
        var change = investment.security.price - table.row(row).data().price;
        table.row(row).data(investment).draw();
        if (Math.abs(investment.transactions.pos) < 0.01) row.attr("class","disabled");
        if (Math.abs(change) != 0) {
            row.children().eq(3).addClass(change>0?'uptick':'downtick');
            setTimeout((function() { this.removeClass('uptick downtick'); }).bind(row.children().eq(3)), 1000);
        }
    }
}

function show_transactions(investment) {
    $("#transactions").DataTable().clear();
    $('#transactions').DataTable().rows.add(investment.transactions.transactions).draw();
    $("#TransactionView").dialog("open");
    $("#btnClose").focus();
}

