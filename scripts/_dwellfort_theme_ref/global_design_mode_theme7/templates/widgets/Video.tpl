{* @@@
{
	"widget_info":{
		"title":"Video"
		,"title_info":"Enter a name for this instance of the Video widget. This is just used for your reference."
		,"category":"media"
		,"works_in_email":"false"
	},
	"meta_data":[{
		"name":"Video"
		,"type": "video"
		,"var": "video"
	},{
		"name":"Size"
		,"type": "imagesize"
		,"var": "size"
		,"default":"Medium"
        },{
		"name":"Hide video once seen"
		,"type": "tick"
		,"var": "hideonceseen"
		,"default":"0"
        },{
		"name":"Allow play again"
		,"type": "tick"
		,"var": "playagain"
		,"default":"0"
        },
	{
                "name":"Alignment"
                ,"type": "dropdown"
                ,"var": "align"
                ,"default":""
                ,"options":[
                        {
                                "label":"Default"
                                ,"value":""
                        },
                        {
                                "label":"Left"
                                ,"value":"Left_Image"
                        },
                        {
                                "label":"Center"
                                ,"value":"Centered"
                        },
                        {
                                "label":"Right"
                                ,"value":"Right_Image"
                        }
                ]
        },{
		"name":"Logged in only"
		,"type": "pagetagmulti"
		,"var": "loggedinonly"
		,"default":""
	}],
	"inner_templates":{
	}
}
@@@ *}
{assign var="seen" value=false}
{if $smarty.get.seen_vid==$metadata.video_id}
	{if $content.logged_in_user.id}
		{delete_user_child_data
		userid=$content.logged_in_user.id
		type="seenvid`$metadata.video_id`"
		}
		{add_user_child_data
		userid=$content.logged_in_user.id
		more_data_seen="yes"
		type="seenvid`$metadata.video_id`"
		}
	{/if}
	{assign var="seen" value=true}
{/if}
{if $content.logged_in_user.id}
	{if $smarty.get.playagain}
		{delete_user_child_data
		userid=$content.logged_in_user.id
		type="seenvid`$metadata.video_id`"
		}
		{assign var="seen" value=false}
	{/if}
	{get_user_child_data
		userid=$content.logged_in_user.id
		type="seenvid`$metadata.video_id`"
	}
	{if $user_child_data}
		{assign var="seen" value=true}
	{/if}
{/if}
{if $metadata.video!=""}
	{if $metadata.hideonceseen&&$seen}{else}
	<div class="bpe_video bpe_image {$metadata.style} {$metadata.align}" data-asset-id="{$metadata.video_id}">
	<a href="{$metadata.video}">
	<img src="{if $metadata.video_thumbnail==""}/graphics/play.jpg{else}{$metadata.video_thumbnail}{/if}{if $metadata.size_height!="auto"||$metadata.size_width!="auto"}?width={$metadata.size_width}&height={$metadata.size_height}&shrink={$metadata.size_shrink}{/if}"/>
	</a>
	</div>
	{/if}
	{if $seen}
		{$editable.show_after_seen}
		{if $metadata.playagain && $content.logged_in_user}
		<p class="video-play-again Button_Medium"><a href="?playagain=1">Play again</a><p>

		{/if}
	{/if}
{else}
<p class="Icon_Alert">Video not selected yet.</p>
{/if}
