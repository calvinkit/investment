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
    loading.show = function() { 
        this.dialog('option','title','Loading...');
        this.data('start',new Date());
        this.dialog('open');
        this.data('timeout', setInterval(() => this.dialog('option','title', new Date(new Date().getTime()-this.data('start').getTime()).toTimeString().substr(4,100)), 1000));
    }
    loading.hide = function() { clearInterval(this.data('timeout')); this.dialog('close'); }


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

function download(filename, csv) {
    var data = 'data:application/csv;charset=utf-8,' + encodeURIComponent(csv);
    $('#Download').attr({ 'download': filename, 'href': data, 'target': '_blank' });
    $('#Download')[0].click();
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

Date.prototype.toString = function() {
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    var d = this.getDate()<10?"0"+this.getDate():this.getDate();
    var m = this.getMonth();
    var y = this.getFullYear();
    return d+"-"+months[m]+"-"+y;
};

Date.prototype.toTimestamp = function() {
    var year = this.getFullYear();
    var month = this.getMonth()+1;
    var date = this.getDate();
    return year+'-'+(month<10?"0":"")+month+"-"+(date<10?"0":"")+date;
};


Date.prototype.toTimeString = function() {
    var s = this.getSeconds()<10?"0"+this.getSeconds():this.getSeconds();
    var m = this.getMinutes(); m = m<10?"0"+m:m;
    var h = this.getHours(); h = h<10?"0"+h:h;
    return h+":"+m+":"+s;
};

Date.prototype.toGMTDate = function() {
    var a = new Date(this.getFullYear(), this.getMonth(), this.getDate()).getTime();
    var b = new Date(a).getTimezoneOffset()*60000;
    return new Date(a-b);
};

Date.prototype.fromGMTDate = function() {
    var b = this.getTimezoneOffset()*60000;
    var a = this.getTime();
    return new Date(a+b);
};

Date.prototype.parseInput = function(str) {
    return (str&&str!=""?new Date(str.replace("-","/")).toGMTDate():null);
};

Date.prototype.addBusinessDate = function(d) {
    var wks = d>0?Math.floor(d/5):Math.ceil(d/5);
    var dys = d%5
    var dy = this.getDay();
    if (dy === 6 && dys > -1) {
        if (dys === 0) {dys-=2; dy+=2;}
        dys++; dy -= 6;
    }
    if (dy === 0 && dys < 1) {
        if (dys === 0) {dys+=2; dy-=2;}
        dys--; dy += 6;
    }
    if (dy + dys > 5) dys += 2;
    if (dy + dys < 1) dys -= 2;
    this.setDate(this.getDate()+wks*7+dys);
    return this;
};

Date.prototype.toExcelDate = function() {
    return parseInt(this.getTime()/(1000*60*60*24)+25569);
};

Date.prototype.fromExcelDate = function(excel) {
    return new Date((excel-25569.0)*3600000*24);
};

Date.prototype.add = function(val, type) {
    return moment(this).add(val, type).toDate();

};

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js', {scope: '/service/'})
    .then(function(registration) {
        console.log('Registration successful. scope is:', registration.scope);
    })
    .catch(function(error) {
        console.log('Service worker registration failed, error:', error);
    });
}
