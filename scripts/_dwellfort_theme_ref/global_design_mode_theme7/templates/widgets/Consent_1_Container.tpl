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
<div class="consent-container {if $theme_vars_consent_1_enable}consent-container-require-consent{/if} consent-container-1" data-consent-purpose="1" data-content="{$editable.content|htmlspecialchars}">

{if $theme_vars_consent_1_enable}

<h4>{$theme_vars_consent_1_title}</h4>
<button class="consent_button consent-item consent-1" data-consent-purpose="1">Allow</button>
<p>{$theme_vars_consent_1_explanation}</p>

{else}
{$editable.content}
{/if}

</div>