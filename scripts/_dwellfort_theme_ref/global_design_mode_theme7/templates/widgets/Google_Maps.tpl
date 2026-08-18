{* @@@
{
	"widget_info":{
		"title":""
		,"title_info":""
		,"legacy":"true"
	},
	"meta_data":[],
	"inner_templates":{
	}
}
@@@ *}
{*{$editable.Address}*}
{if $accessibility_mode}
<p><a target="_blank" href="http://maps.google.com/?q={$editable.Address|strip_tags|trim|urlencode}" title="View on Google Maps (opens in new window)">View on Google Maps</a></p>
{else}
{capture assign=code}
<iframe
  width="450"
  height="250"
  frameborder="0" style="border:0"
  src="https://www.google.com/maps/embed/v1/search?key={$google_maps_api_key}&q={$editable.Address|strip_tags|trim|urlencode}" allowfullscreen>
</iframe>
{/capture}


<style>{literal}.embed-container { position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%; } .embed-container iframe, .embed-container object, .embed-container embed { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }{/literal}</style>
<div class='embed-container gm-{$editable.Address|strip_tags|trim|css_safe|urlencode} {if $theme_vars_consent_mode}functional-iframe-check-consent styleBox{/if}' {if $theme_vars_consent_mode}data-iframe-src="https://www.google.com/maps/embed/v1/search?key={$google_maps_api_key}&q={$editable.Address|strip_tags|trim|urlencode}"{/if}>
{if $theme_vars_consent_mode}
<div class="gm-consent-in-player">
	<p class="Icon_Alert">Please allow Functional cookies to use the YouTube player</p>
	<p class="Button_Medium"><a class="show-cookie-banner">Show cookie preferences</a></p>
</div>
{else}
{$code}
{/if}
</div>
{/if}
