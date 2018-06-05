var monthcode = ['F','G','H','J','K','M','N','Q','U','V','X','Z'];

function getFuturesQuotes() {
    var day = new Date().getDay();
    var month = new Date().getMonth()+1+(day>18?1:0);
    var year = new Date().getFullYear()%100;
    $.getJSON('quotes/futures', {ticker: '@CL.1', yticker: 'CL'+monthcode[month]+year, country: 'NYM', action: 'futures'}, function(security) {
        $('#CL').text(security.price);
        $('#CL').append(' <span>'+security.pchange+'%</span>');
        $('#CL > span').css('color',parseFloat(security.change)<0?'red':'#259f26').attr('title',security.change);
    });

    $.getJSON('quotes/futures', {ticker: '@NG.1', yticker: 'NG'+monthcode[month]+year, country: 'NYM', action: 'futures'}, function(security) {
        $('#NG').text(security.price);
        $('#NG').append(' <span>'+security.pchange+'%</span>');
        $('#NG > span').css('color',parseFloat(security.change)<0?'red':'#259f26').attr('title',security.change);
    });

    var month = new Date().getMonth()+(day>25?1:0);
    $.getJSON('quotes/futures', {ticker: '@GC.1', yticker: 'GC'+monthcode[month]+year, country: 'CMX', action: 'futures'}, function(security) {
        $('#GC').text(security.price);
        $('#GC').append(' <span>'+security.pchange+'%</span>');
        $('#GC > span').css('color',parseFloat(security.change)<0?'red':'#259f26').attr('title',security.change);
    });

    $.getJSON('quotes/futures', {ticker: '@DJ.1', yticker: 'DJ'+monthcode[month]+year, country: '', action: 'futures'}, function(security) {
        $('#DJF').text(humanize.numberFormat(security.price,2));
        $('#DJF').append(' <span>'+security.pchange+'%</span>');
        $('#DJF > span').css('color',parseFloat(security.change)<0?'red':'#259f26').attr('title',security.change);
    });

    $.getJSON('quotes/futures', {ticker: '@SP.1', yticker: 'SP'+monthcode[month]+year, country: '', action: 'futures'}, function(security) {
        $('#SNPF').text(humanize.numberFormat(security.price,2));
        $('#SNPF').append(' <span>'+security.pchange+'%</span>');
        $('#SNPF > span').css('color',parseFloat(security.change)<0?'red':'#259f26').attr('title',security.change);
    });

    $.getJSON('quotes/futures', {ticker: '@ND.1', yticker: 'ND'+monthcode[month]+year, country: '', action: 'futures'}, function(security) {
        $('#NASDAQF').text(humanize.numberFormat(security.price,2));
        $('#NASDAQF').append(' <span>'+security.pchange+'%</span>');
        $('#NASDAQF > span').css('color',parseFloat(security.change)<0?'red':'#259f26').attr('title',security.change);
    });
}

function getIndexQuotes() {
    //$.getJSON('quotes/security', {ticker:'INDEXDJX:DJI', yticker:'', country:'', action:'quote'}, function(security) {
    //    $('#DJI').text(humanize.numberFormat(security.price,2));
    //    $('#DJI').append(' <span>'+security.pchange+'%</span>');
    //    $('#DJI > span').css('color',parseFloat(security.change)<0?'red':'#259f26').attr('title',security.change);
    //});

    //$.getJSON('quotes/security', {ticker:'INDEXTSI:OSPTX', yticker:'', country:'', action:'quote'}, function(security) {
    //    $('#TSX').text(humanize.numberFormat(security.price,2));
    //    $('#TSX').append(' <span>'+security.pchange+'%</span>');
    //    $('#TSX > span').css('color',parseFloat(security.change)<0?'red':'#259f26').attr('title',security.change);
    //});

    //$.getJSON('quotes/security', {ticker:'INDEXNASDAQ:.IXIC', yticker:'', country:'', action:'quote'}, function(security) {
    //    $('#NASDAQ').text(humanize.numberFormat(security.price,2));
    //    $('#NASDAQ').append(' <span>'+security.pchange+'%</span>');
    //    $('#NASDAQ > span').css('color',parseFloat(security.change)<0?'red':'#259f26').attr('title',security.change);
    //});

    //$.getJSON('quotes/security', {ticker:'INDEXSP:.INX', yticker:'', country:'', action:'quote'}, function(security) {
    //    $('#SNP').text(humanize.numberFormat(security.price,2));
    //    $('#SNP').append(' <span>'+security.pchange+'%</span>');
    //    $('#SNP > span').css('color',parseFloat(security.change)<0?'red':'#259f26').attr('title',security.change);
    //});

    //$.getJSON('quotes/security', {ticker:'INDEXCBOE:VIX', yticker:'', country:'', action:'quote'}, function(security) {
    //    $('#VIX').text(humanize.numberFormat(security.price,2));
    //    $('#VIX').append(' <span>'+security.pchange+'%</span>');
    //    $('#VIX > span').css('color',parseFloat(security.change)<0?'red':'#259f26').attr('title',security.change);
    //});
}

$(document).ready(function(){
    getFuturesQuotes();
    getIndexQuotes();

    setInterval(function() {
        getFuturesQuotes();
        getIndexQuotes();
    },1000*60*1);

});
