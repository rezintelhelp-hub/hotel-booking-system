{* @@@
{
	"widget_info":{
		"title":"Guest Content"
		,"title_info":"Enter a name for this instance of the widget."
		 ,"category":"setup"
	},
	"meta_data":[]
}
@@@ *}
{if $content.logged_in_user}
{if $content.logged_in_user.guest}
<div class="guest-content">
{$editable.guest_account_content}
</div>
{else}
<div class="full-content">
{$editable.full_account_content}
</div>
{/if}
{/if}
