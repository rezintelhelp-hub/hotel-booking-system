{* @@@
{
	"widget_info":{
		"title":"Video Gate"
		,"title_info":"Enter a name for this instance of the Video Gate widget."
		,"category":"setup"
		,"works_in_email":"false"
	},
	"meta_data":[{
		"name":"Video to track"
		,"type": "video"
		,"var": "video"
	}
	],
	"inner_templates":{
	}
}
@@@ *}
{assign var="seen" value=false}
{if $content.logged_in_user.id}
	{get_user_child_data
		userid=$content.logged_in_user.id
		type="seenvid`$metadata.video_id`"
	}
	{if $user_child_data}
		{assign var="seen" value=true}
	{/if}
{/if}
{if $seen}
	{$editable.content}
{/if}
