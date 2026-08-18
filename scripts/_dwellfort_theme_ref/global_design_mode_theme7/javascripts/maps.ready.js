window.gmlat;
window.gmlng;
window.map;
window.geocoder;
window.gmarkers=[];
window.clusterer;
window.gmzoom;
window.gmzoomto;
window.marker_cols = [
"red",
"green",
"blue",
"orange",
"purple",
"yellow",
"indego",
"violet"
];
window.marker_cols_temp=window.marker_cols.slice(0);
window.group_cols={};

function findLatLang(address,mgmlat,mgmlng,html,group,namepassthrough,icon) {
    return new Promise(function(resolve, reject) {
	    var safeGroup =group.replace(/[\W_]+/g,"_");
	    if (safeGroup in window.group_cols){
		    var col = window.group_cols[safeGroup];
	    } else {

		var col = window.marker_cols_temp.shift();
		    if (window.marker_cols_temp.length==0) {
			window.marker_cols_temp = window.marker_cols.slice(0);
		    }
		    window.group_cols[safeGroup]=col;
	    }
	    if (address!=""&&mgmlat==""){

		window.geocoder.geocode({'address': address}, function(results, status) {
		    if (status === 'OK') {
			resolve([results[0].geometry.location.lat(), results[0].geometry.location.lng(),html,group,col,namepassthrough,icon]);
		    } else {
			reject(new Error('Couldnt\'t find the location ' + address));
		    }
	    	});
	    }
		else {
			resolve([mgmlat, mgmlng,html,group,col,namepassthrough,icon]);
		}
    })
} 
function getLocs(){
	let locationData = [];
	let latValue;
	$('.interactive-map-marker').each(function(){
		var coords = $(this).data('coords').split(',');
		var address = $(this).data('address');
		var group = $(this).data('group');
		var icon = $(this).data('icon');
		var namepassthrough = $(this).data('name');
		var html = $(this).html();
		var mgmlat = Number(coords[0]);
		var mgmlng = Number(coords[1]);
		if (gmlat==""&&address=="") {
			return true;
		};

		locationData.push(findLatLang(address, mgmlat, mgmlng,html,group,namepassthrough,icon));
	});
	return locationData;
}
function initMap(){
	if (window.gmlat=="") {
		return false;
	};
	window.geocoder = new google.maps.Geocoder();
	window.map = new google.maps.Map(document.getElementById("marker-map"), {
	zoom: window.gmzoom,
	center: { lat: window.gmlat, lng: window.gmlng },
		tilt: 47.5,
		mapId: window.gmid
	});
	/*
	const buttons = [
    ["Rotate Left", "rotate", 20, google.maps.ControlPosition.LEFT_CENTER],
    ["Rotate Right", "rotate", -20, google.maps.ControlPosition.RIGHT_CENTER],
    ["Tilt Down", "tilt", 20, google.maps.ControlPosition.TOP_CENTER],
    ["Tilt Up", "tilt", -20, google.maps.ControlPosition.BOTTOM_CENTER],
  ];

  buttons.forEach(([text, mode, amount, position]) => {
    const controlDiv = document.createElement("div");
    const controlUI = document.createElement("button");

    controlUI.classList.add("ui-button");
    controlUI.innerText = `${text}`;
    controlUI.addEventListener("click", () => {
      adjustMap(mode, amount);
    });
    controlDiv.appendChild(controlUI);
    map.controls[position].push(controlDiv);
  });

  const adjustMap = function (mode, amount) {
    switch (mode) {
      case "tilt":
        window.map.setTilt(map.getTilt() + amount);
        break;
      case "rotate":
        window.map.setHeading(map.getHeading() + amount);
        break;
      default:
        break;
    }
  };
  */
	var locs = getLocs();
	Promise.all(locs)
	.then(function(returnVals){
		var checked=[];
		if(returnVals.length != 0) {
                    for (i=0; i < returnVals.length; i++) {
			var y = returnVals[i];
				for (x=0; x < checked.length; x++) {
					var e = checked[x];
					if (e[0]==y[0]&&e[1]==y[1]) {
						var offset = Math.random(0,1000)/10000;
						var offset2 = Math.random(0, 1000)/10000;
						 returnVals[i] = [y[0]+offset,y[1]+offset2,y[2],y[3],y[4]];
					}
				}
				checked.push([y[0],y[1]]);
                    }
                }
		var marki=0;
		const markers = returnVals.map((location, i) => {
			var ll = new google.maps.LatLng(location[0],location[1]);
			if (location[6]!=""){
				var icon = { url: location[6], scaledSize: new google.maps.Size(40, 40), anchor:  new google.maps.Point(20, 40)}
			} else {
			var icon = {
			    path:
			      "M10.453 14.016l6.563-6.609-1.406-1.406-5.156 5.203-2.063-2.109-1.406 1.406zM12 2.016q2.906 0 4.945 2.039t2.039 4.945q0 1.453-0.727 3.328t-1.758 3.516-2.039 3.070-1.711 2.273l-0.75 0.797q-0.281-0.328-0.75-0.867t-1.688-2.156-2.133-3.141-1.664-3.445-0.75-3.375q0-2.906 2.039-4.945t4.945-2.039z",
			    fillColor: location[4],
			    fillOpacity: 1,
			    strokeWeight: 0,
			    rotation: 0,
			    scale: 2,
			    anchor: new google.maps.Point(15, 30),
			  };
			}
		    const marker= new google.maps.Marker({
			    position: ll
			    ,icon:icon
		//      label: labels[i % labels.length],
		    });
			marker.addListener("click", () => {
				$('#marker-overlay-html').html(location[2]);
				$("#maps-menu").fadeOut();
				$('#marker-overlay').fadeIn();
				if (typeof markerMapHook != "undefined"){
					markerMapHook(location[2]);
				}
			});

			$("#maps-menu").append("<div class='"+location[3]+"' data-loc='"+marki+"'>"+location[5]+"</div>");
			marki++;
			window.gmarkers.push({'group':location[3],'marker': marker,'col':location[4],"name":location[5]});
			return marker;
		  });
				function animate(time) {
				    requestAnimationFrame(animate);
				    TWEEN.update(time);
				}

				requestAnimationFrame(animate);
		$("#maps-menu div").click(function(){
			google.maps.event.trigger(window.gmarkers[$(this).data("loc")].marker, 'click');
			if (window.gmid!=""){
				const cameraOptions= {
					lat: window.map.getCenter().lat(),lng: window.map.getCenter().lng()
				};

				const cameraZoom= 
					{ zoom: window.map.getZoom() }
				;
				new TWEEN.Tween(cameraOptions)
				    .to(
					    { lat:window.gmarkers[$(this).data("loc")].marker.position.lat(), lng: window.gmarkers[$(this).data("loc")].marker.position.lng()}
				    , 4000)
				    .easing(TWEEN.Easing.Quadratic.InOut)
				    .onUpdate(() => {
					window.map.moveCamera({zoom: cameraZoom.zoom, center: cameraOptions});
				    })
				    .start();
				var zoomin = new TWEEN.Tween(cameraZoom)
				    .to(
					    {zoom: window.gmzoomto }
				    , 2000)
				    .easing(TWEEN.Easing.Quadratic.InOut)
				    .onUpdate(() => {
					//window.map.moveCamera(cameraOptions);
					    console.log(cameraZoom.zoom);
				    });
				new TWEEN.Tween(cameraZoom)
				    .to(
					    {zoom: window.map.getZoom() - 1 }
				    , 2000)
				    .easing(TWEEN.Easing.Quadratic.InOut)
				    .onUpdate(() => {
					//window.map.moveCamera(cameraOptions);
				    })
				 .chain(zoomin).start();

			} else {
				window.map.panTo(window.gmarkers[$(this).data("loc")].marker.position);
				window.map.setZoom(window.gmzoomto);
			}
			return false;
		});

		var donemarkers = [];
		for (i = 0; i <window.gmarkers.length; i++) {
			if (donemarkers.indexOf(window.gmarkers[i]['group'])==-1&&window.gmarkers[i]['group']!=""){
				donemarkers.push(window.gmarkers[i]['group']);
				if (typeof window.groups!='undefined'){
					if (window.groups.indexOf(encodeURIComponent(window.gmarkers[i]['group']))!=-1){
						var checked = "checked=checked";
					}else{
						var checked = "";
					}
				}else{
					var checked = "checked=checked";
				}


				$('#marker-groups').append('<div class="marker-group"><span class="marker-col" style="background-color:'+window.gmarkers[i]['col']+'"></span><input type="checkbox" class="marker-check" name="" data-group="'+window.gmarkers[i]['group']+'" '+checked+'/> '+window.gmarkers[i]['group']+'</div>').show();
			}
		}
		$('.marker-check').on('change',function(){
			window.clusterer.clearMarkers();
			let  newmarkers = [];
			$("#maps-menu div").hide();
			for (i = 0; i <window.gmarkers.length; i++) {
				if ($('.marker-check[data-group="'+window.gmarkers[i]['group']+'"]:checked').length) {
				 newmarkers.push(window.gmarkers[i]['marker']);
				$("#maps-menu div."+window.gmarkers[i]['group']).show();
				}
			}
			window.clusterer = new MarkerClusterer(window.map, newmarkers, {
			    imagePath:
			      "https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/m",
			  });

		});
		window.clusterer = new MarkerClusterer(window.map, markers, {
		    imagePath:
		      "https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/m",
		  });
		setTimeout(function(){
		$('.marker-check').trigger('change');
			moduleHeights();
		},100);
	});
}
window.mapsloaded=false;
function mapsMarkersReady_core() {

	$(".marker-maps-cookies").hide().first().show();
	if (window.consent.functional){
		$(".marker-maps-cookies").hide();
		$('.interactive-map-marker').hide();
		if ($('.interactive-map-marker').length){
			var withmenu = "";
			var menu = "";
			if ($('.interactive-map-marker').first().hasClass("with-menu")){
				var withmenu = "with-menu";
				var menu = "<div id='maps-menu'></div>"; 
			}
			if (!$("#marker-map-wrap").length) {
			$('.interactive-map-marker').first().after('<div id="marker-map-wrap" class="'+withmenu+'"><div id="marker-map"></div>'+menu+'<div id="marker-groups"></div><div id="marker-overlay"><div id="close-overlay"></div><div id="marker-overlay-html"></div></div></div>'); 
			}
			$('#close-overlay').click(function(){
				$("#maps-menu").fadeIn();
				$('#marker-overlay').fadeOut();
			});
			var coords = $('.interactive-map-marker').first().data('center-coords').split(',');
			window.gmlat = Number(coords[0]);
			window.gmlng = Number(coords[1]);
			window.gmzoom = $('.interactive-map-marker').first().data('zoom');
			window.gmzoomto = $('.interactive-map-marker').first().data('zoomto');
			window.gmid = $('.interactive-map-marker').first().data('id');
			var hash = window.location.hash.split('#map-');
			if (typeof hash[1]!='undefined'){
				var parts = hash[1].split('&');
				for (i = 0; i <parts.length; i++) {
					var part = parts[i].split(':');
					var key = part[0];
					var value = part[1];
					if (key=="zoom"){
						window.gmzoom = Number(value);
					}
					if (key=="center"){
						var ll = value.split(",");
						window.gmlat = Number(ll[0]);
						window.gmlng = Number(ll[1]);
					}
					if (key=="groups"){
						window.groups = value.split(',');
					}
				}

			}
			if (!mapsloaded){
				window.mapsloaded=true;
				var script = document.createElement('script');
				script.type = 'text/javascript';
				script.src = 'https://cdnjs.cloudflare.com/ajax/libs/tween.js/16.7.0/Tween.js';
				document.getElementsByTagName('head')[0].appendChild(script);

				// Load the first script (MarkerClustererPlus)
				var script1 = document.createElement('script');
				script1.type = 'text/javascript';
				script1.src = 'https://unpkg.com/@googlemaps/markerclustererplus/dist/index.min.js';
				document.getElementsByTagName('head')[0].appendChild(script1);

				// When the first script is loaded, load the second script (Google Maps)
				script1.onload = function() {
				    var script2 = document.createElement('script');
				    script2.type = 'text/javascript';
				    script2.src = 'https://maps.googleapis.com/maps/api/js?key=' + $('.interactive-map-marker').data('api-key') + '&callback=initMap&libraries=&v=beta';
				    script2.defer = true;
				    document.getElementsByTagName('head')[0].appendChild(script2);
				};
			}

		}

	}
}

