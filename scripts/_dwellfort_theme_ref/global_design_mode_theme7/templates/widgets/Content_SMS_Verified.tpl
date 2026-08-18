{* @@@
{
	"widget_info":{
		"title":"SMS Verified Content"
		,"title_info":"Enter a name for this instance of this widget."
		,"category":"setup"
	},
	"meta_data":[{
		"name":"Valid country phone codes"
		,"info":"Enter a comma separated list of phone country codes to restrict this widget to."
		,"type": "text"
		,"var": "codes"
		,"default":"44,1"
	}]
}
@@@ *}
{if $content.logged_in_user}
	{if $content.logged_in_user.sms_verified}
		{verify_sms action="checkregion" codes=$metadata.codes number=$content.logged_in_user.sms_number}
		{if $ok}
			{$editable.verified_content}
		{else}
			{$editable.not_verified_content}
		{/if}
	{else}
		{$editable.not_verified_content}
	{/if}
{/if}
