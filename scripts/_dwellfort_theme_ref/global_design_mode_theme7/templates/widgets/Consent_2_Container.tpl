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
<div class="consent-container {if $theme_vars_consent_2_enable}consent-container-require-consent{/if} consent-container-2" data-consent-purpose="2" data-content="{$editable.content|htmlspecialchars}">

{if $theme_vars_consent_2_enable}

<h4>{$theme_vars_consent_2_title}</h4>
<button class="consent_button consent-item consent-2" data-consent-purpose="2">Allow</button>
<p>{$theme_vars_consent_2_explanation}</p>

{else}
{$editable.content}
{/if}

</div>