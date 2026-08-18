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
<div class="consent-container {if $theme_vars_consent_4_enable}consent-container-require-consent{/if} consent-container-4" data-consent-purpose="4" data-content="{$editable.content|htmlspecialchars}">

{if $theme_vars_consent_4_enable}

<h4>{$theme_vars_consent_4_title}</h4>
<button class="consent_button consent-item consent-4" data-consent-purpose="4">Allow</button>
<p>{$theme_vars_consent_4_explanation}</p>

{else}
{$editable.content}
{/if}

</div>