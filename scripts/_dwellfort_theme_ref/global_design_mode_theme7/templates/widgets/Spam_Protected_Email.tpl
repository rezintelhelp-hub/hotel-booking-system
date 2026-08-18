{* @@@
{
	"widget_info":{
		"title":"Spam Protected Email"
		,"title_info":"Enter a name for this instance of the widget"
		,"show_in_search":"true"
	},
	"meta_data":[{
		"name":"Email address to protect"
		,"type": "text"
        ,"info":"Enter the email address to protect. If empty your site's default email address will be used."
		,"default":""
		,"var": "email"
	},{
		"name":"Clickable text"
		,"type": "text"
        ,"info":"Enter the clickable text for the link. This is also protected so can also be the email address if you prefer (leave blank to automatically use the email address)."
		,"default":""
		,"var": "clickable"
	},{
		"name":"Text before link"
		,"type": "text"
        ,"info":"Enter text to show before the clickable email link."
		,"default":""
		,"var": "text_before"
	},{
		"name":"Text after link"
		,"type": "text"
        ,"info":"Enter text to show after the clickable email link."
		,"default":""
		,"var": "text_after"
	},{
		"name":"Subject"
		,"type": "text"
		,"info":"Enter the subject for the email."
		,"default":""
		,"var": "subject"
	},{
		"name":"Show icon"
		,"type": "tick"
		,"default":"1"
		,"var": "show_icon"
	}],
	"inner_templates":{}
}
@@@ *}
<p class="{if $metadata.show_icon}Icon_Email{/if} protect-email-{$metadata.instance_id}">
{if $metadata.clickable!=''}
{assign var=clickable value=$metadata.clickable}
{else}
{if $metadata.email|trim}
{assign var=clickable value=$metadata.email|trim}
{else}
{assign var=clickable value=$theme_var_email_link|trim}
{/if}
{/if}
	{capture assign='email_link'}{$metadata.text_before}<a href="mailto:{if $metadata.email}{$metadata.email|trim}{else}{$theme_vars_email_link|trim}{/if}{if $metadata.subject!=""}?subject={$metadata.subject}{/if}">{$clickable}</a>{$metadata.text_after}{/capture}

</p>
<script type="text/javascript" {$script_nonce}>
	{literal}$(document).ready(function() {{/literal}
		$(".protect-email-{$metadata.instance_id}").html(
			'{$email_link|str_rot13}'.replace(/[a-zA-Z]/g, function(c){literal}{return String.fromCharCode((c<="Z"?90:122)>=(c=c.charCodeAt(0)+13)?c:c-26);}){/literal}
		);
	{literal}});{/literal}
</script>
