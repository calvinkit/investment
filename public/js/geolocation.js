var GOOGLE_API='AIzaSyDh1je8-dys7Ux-bEtYDlAZyaSZ_Qv3JpQ';
var DRIVING = 'DRIVING';
var WALKING = 'WALKING';

function getLocation() {
    $.post( "https://www.googleapis.com/geolocation/v1/geolocate?key="+GOOGLE_API, 
    function(success) {
        mapLocation('#Map',success.location);
    }).fail(
    function(err) {
        alert("API Geolocation error! \n\n"+err);
    });
};

function mapLocation(div, location) {
    $(div)[0].style.display ='block';
    var map = new google.maps.Map($(div)[0], { center: location, zoom: 17 });
    var marker = new google.maps.Marker({ position: location, map: map });
    var directions = new google.maps.DirectionsService;
    directions.route({ 
        origin: 'Markham, ON',
        destination: location,
        travelMode: WALKING,
    }, function(response, status) {
        if (status == 'OK') {
            var legs = response.routes[0].legs;
            var distance = legs.reduce( function(sum, leg) { return sum+leg.distance.value; }, 0); //in meters
        } else {
            alert(JSON.stringify(status));
        }
    });
};

var calcDistance = function(p1, p2) {
    var rad = function(x) {
          return x * Math.PI / 180;
    };

    var R = 6378137; // Earth.s mean radius in meter
    var dLat = rad(p2.lat - p1.lat);
    var dLong = rad(p2.lng - p1.lng);
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(rad(p1.lat)) * Math.cos(rad(p2.lat)) *
        Math.sin(dLong / 2) * Math.sin(dLong / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c;
    return d; // returns the distance in meter
};
