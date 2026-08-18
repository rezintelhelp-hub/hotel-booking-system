{* @@@
{
	"widget_info":{
		"title":"Google Maps"
		,"title_info":"Enter a name for this instance of the Google Maps widget. Once added to your page, you can enter an address in its properties to create your map."
	},
	"meta_data":[{
		"name":"Address"
		,"type": "text"
        ,"info":"Enter an address here to show a map centered at this location."
		,"var": "address"
        ,"default":""
	}],
	"inner_templates":{
	}
}
@@@ *}
{if $accessibility_mode}
<p><a target="_blank" href="http://maps.google.com/?q={$metadata.address|trim|urlencode}" title="View on Google Maps (opens in new window)">View on Google Maps</a></p>
{else}
{capture assign=code}
<iframe
  width="450"
  height="250"
  frameborder="0" style="border:0"
  src="https://www.google.com/maps/embed/v1/search?key={$google_maps_api_key}&q={$metadata.address|trim|urlencode}" allowfullscreen>
</iframe>
{/capture}


<style>{literal}.embed-container { position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%; } .embed-container iframe, .embed-container object, .embed-container embed { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }{/literal}</style>
<div class='embed-container gm-{$metadata.address|trim|css_safe|urlencode} {if $theme_vars_consent_mode}functional-iframe-check-consent{/if}' {if $theme_vars_consent_mode}data-iframe-src="https://www.google.com/maps/embed/v1/search?key={$google_maps_api_key}&q={$metadata.address|trim|urlencode}"{/if}>
{if $theme_vars_consent_mode}
	<div class="styleBox marker-maps-cookies">
	<p class="Icon_Alert">Please allow Functional cookies to use this map</p>
	<p class="Button_Medium"><a class="show-cookie-banner">Show cookie preferences</a></p>
	</div>
{else}
	{$code}
{/if}
</div>
{/if}
