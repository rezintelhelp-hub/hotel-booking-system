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
<div class="consent-container {if $theme_vars_consent_3_enable}consent-container-require-consent{/if} consent-container-3" data-consent-purpose="3" data-content="{$editable.content|htmlspecialchars}">

{if $theme_vars_consent_3_enable}

<h4>{$theme_vars_consent_3_title}</h4>
<button class="consent_button consent-item consent-3" data-consent-purpose="3">Allow</button>
<p>{$theme_vars_consent_3_explanation}</p>

{else}
{$editable.content}
{/if}

</div>