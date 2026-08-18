{* @@@
{
	"widget_info":{
		"title":"Google Maps Marker"
		,"title_info":"Enter a name for this instance of the Google Maps Marker widget."
		,"show_in_search":"true"
		,"include_js":"maps.ready.js"
	},
	"meta_data":[{
		"name":"Address"
		,"type": "text"
		,"info":"Enter an address here to show a map centered at this location."
		,"var": "address"
		,"default":""
	},{
		"name":"Marker Co-ordinates"
		,"type": "text"
		,"info":"Enter co-ordinates if the address location doesn't place the marker in the right place."
		,"var": "coords"
		,"default":""
	},{
		"name":"Google Maps Link"
		,"type": "text"
		,"info":"Optional. Link to a specific Google Maps listing by providing the share link here. If omitted will link to the marker location or address (if used)."
		,"var": "link"
		,"default":""
	},{
		"name":"Marker Icon (80x80)"
		,"type": "image"
		,"var": "icon"
	},{
		"name":"Center Co-ordinates"
		,"type": "text"
		,"info":"Only needed for the first instance of this widget pre page. Enter co-ordinates to center the initial map view on."
		,"var": "center_coords"
		,"default":""
	},{
		"name":"Show list menu"
		,"type": "tick"
		,"var": "showmenu"
		,"default":0
	},{
		"name":"List title"
		,"type": "text"
		,"info":"Only needed if list menu is enabled. Enter a title for the location to show in the menu."
		,"var": "title"
		,"default":""
	},{
		"name":"Google Map ID"
		,"type": "text"
		,"info":"Only needed for the first instance of this widget per page. Optionlly setup a Google Map ID to enable smooth panning between markers."
		,"var": "mapid"
		,"default":""
	},{
		"name":"Zoom level"
		,"type": "text"
		,"info":"Only needed for the first instance of this widget per page."
		,"var": "zoom"
		,"default":"10"
	},{
		"name":"Zoom level on navigate"
		,"type": "text"
		,"info":"Only needed for the first instance of this widget per page."
		,"var": "zoomto"
		,"default":"6"
	},{
		"name":"Group"
		,"type": "text"
		,"info":"Enter a name for the group for this marker. Other markers added to the same group will have the same colour icon and can be toggled on the map together. Do not use commas in the group name."
		,"var": "group"
        ,"default":""
	},{
		"name":"Custom Google Maps API Key"
		,"type": "text"
		,"info":"If you want to use your own Google Maps account please enter it here."
		,"var": "google_maps_api_key"
		,"default":""
	}],
	"inner_templates":{
	}
}
@@@ *}
<div class="interactive-map-marker {if $metadata.showmenu}with-menu{/if}" data-id="{$metadata.mapid}" data-name="{$metadata.title|htmlspecialchars}" data-zoom="{$metadata.zoom}" data-group="{$metadata.group}" data-address="{$metadata.address}" data-center-coords="{if $metadata.center_coords==""}35.689488,-94.405537{else}{$metadata.center_coords}{/if}" data-coords="{$metadata.coords}" data-api-key="{if $metadata.google_maps_api_key!=""}{$metadata.google_maps_api_key}{else}{$google_maps_api_key}{/if}" data-icon="{if $metadata.icon!=""}https://{$content.http_host}{$metadata.icon}{/if}" data-zoomto="{$metadata.zoomto}">
{$editable.popup_details}
<p><a href="{if $metadata.link!=""}{$metadata.link}{else}https://www.google.com/maps/place/{if $metadata.address}{$metadata.address|urlencode}{else}{$metadata.coords}{/if}{/if}" target="_blank">View on Google Maps</a></p>
</div>
{if $theme_vars_consent_mode}
	<div class="styleBox marker-maps-cookies">
	<p class="Icon_Alert">Please allow Functional cookies to use this map</p>
	<p class="Button_Medium"><a class="show-cookie-banner">Show cookie preferences</a></p>
	</div>
{/if}
{*
	You can link to a specific group, center and zoom level like this):
	#map-center:52.991462,-5.164819&zoom:6&groups:Club,Dealer
*}
