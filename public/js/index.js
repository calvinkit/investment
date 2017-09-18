var socket = null;
var loading = null;
var tabview = null;
var chart = null;
var bCompare = false;

$(document).ready(function(){
    socket = io.connect('http://'+window.location.host);
    $(document).tooltip();
    tabview = $('#TabView').tabs({ active:1, heightStyle: "content",
        activate: function(event, ui) {
            if (ui.newPanel.selector == '#Options') {
                getLocation(); 
            }
        }});
    tabview.switchTo = function(id) {
        var index = $('#TabView a[href="#'+id+'"]').parent().index();
        this.tabs("option", "active", index);
    };

    $('#ResearchAccordion').accordion({active:2, heightStyle: 'content'});
    loading = $('#Loading').dialog({ autoOpen: false, modal: true, draggable: false, autoOpen: false, closeOnEscape: true, width:90 });
    loading.show = function() { this.dialog('open'); }
    loading.hide = function() { this.dialog('close'); }

    $.extend( $.fn.dataTableExt.oSort, {
        "formatted-num-pre": function ( a ) {
        var negative = (a.search(/\)/) > -1);
        a = (a === "-" || a === "") ? 0 : a.replace( /[^\d\-\.]/g, "" );
        return negative?-parseFloat( a ) : parseFloat(a);
        },

        "formatted-num-asc": function ( a, b ) {
        return a - b;
        },

        "formatted-num-desc": function ( a, b ) {
        return b - a;
        }
    } );
    socket.on('connect', function () { loadPortfolio(); });
    socket.on('disconnect', function () { });
});

function search_sector(country, sector) {
    var indexedOnly = $('#IndexedOnly').prop('checked')
    $.getJSON('/sectoranalysis', { country: country, sector: sector, indexed: indexedOnly }, onsectoranalysis);
}

function onsectoranalysis(data) {
    var securities = data.securities;
    var correlation = data.corr;
    var header = new Array();
    for (var i=0; i<securities.length; i++) header.push({
        sTitle: securities[i].ticker,
        sType: 'formatted-num',
        mRender: function(data, type, row) { return humanize.numberFormat(data, 2); }
    });

    $('#SectorReturns').dataTable({
        destroy: true,
        scrollCollapse: true,
        scrollX: '800px',
        paging: false,
        sDom: 'rtlp',
        aoColumns: header
    });
    var table = $('#SectorReturns').DataTable();
    table.row.add(securities.map(function(e) { return parseFloat(e.trailing[20].pop()[1])*100; }));
    table.draw();

    var table = $('#SectorCorrelation').DataTable({
        destroy: true,
        scrollY: '500px',
        scrollCollapse: true,
        scrollX: '800px',
        paging: false,
        sDom: 'rtlp',
        aoColumns: [''].concat(header),
    });
    new $.fn.dataTable.FixedColumns(table);
    for (var i=0; i<correlation.length; i++) {
        var node = table.row.add([securities[i].ticker].concat(correlation[i])).node();
        $(node).attr('title', securities[i].name);
    }
    table.draw();
    loading.hide();
}

function arrayToTable(table, data, header, decimal) {
    table.children('tbody').empty();
    table.children('thead').empty();
    if (header) {
        var tr = $(document.createElement("tr"));
        table.children('thead').append(tr);
        for (var i=0; i<header.length; i++) tr.append('<th>'+header[i]+"</th>");
    }
    for (var i=0; i<data.length; i++) {
        var tr = $(document.createElement("tr"));
        table.children('tbody').append(tr);
        for (var j=0; j<data[i].length; j++) {
            if (j==0 && header && header[0] == "")
                tr.append('<th>'+(isNaN(data[i][j])?data[i][j]:humanize.numberFormat(data[i][j],(decimal==null?3:decimal)))+'</th>');
            else
                tr.append('<td>'+(isNaN(data[i][j])?data[i][j]:humanize.numberFormat(data[i][j],(decimal==null?3:decimal)))+'</td>');
        }
    }
}

function onerror(obj) {
    if (obj.error) {
        alert(obj.error);
        loading.hide();
        return true;
    }
    return false;
}

var oparseFloat = parseFloat;
parseFloat = function(s) {
    if (s=="") return 0;
    s = String(s).replace(/,/g,'');
    return oparseFloat(s);
};
