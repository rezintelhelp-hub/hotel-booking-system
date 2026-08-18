{* @@@
{
	"widget_info":{
		"title":"Consent Container"
		,"title_info":"This container will request consent before its contents are displayed. The message and title describing its contents can be set in Website Settings."
		,"category":"setup"
	},
	"meta_data":[{
		"name":"Consent purpose"
		,"type": "dropdown"
		,"var": "purpose"
		,"default":"1"
		,"options":[
			{
				"label":"Functional"
				,"value":"functional"
			},
			{
				"label":"Performance"
				,"value":"performance"
			},
			{
				"label":"Advertising"
				,"value":"advertising"
			}
		]
	}],
	"inner_templates":{
	}
}
@@@ *}
<div class="consent-container {if $theme_vars_consent_mode}consent-container-require-consent{/if} consent-container-{$metadata.purpose}" data-consent-purpose="{$metadata.purpose}" data-content="{$editable.content|htmlspecialchars}">

{if $theme_vars_consent_mode}
<p class="Icon_Alert">Please enable {$metadata.purpose|ucfirst} cookies to view this content</p>
<p class="Button_Medium"><a class="show-cookie-banner">Show cookie preferences</a></p>
{else}
{$editable.content}
{/if}

</div>
