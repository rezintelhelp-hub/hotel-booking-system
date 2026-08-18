{* @@@
{
        "widget_info":{
                "title":"Intranet Homepage"
                ,"title_info":"Enter a name for this instance of the Intranet Homepage widget."
                ,"category":"setup" 
        },
	"meta_data":[
	{
		"name":"Link 1 Icon"
		,"type":"icon_pool"
		,"var":"big_link_icon1"
		,"default":""
	},
	{
		"name":"Link 2 Icon"
		,"type":"icon_pool"
		,"var":"big_link_icon2"
		,"default":""
	},
	{
		"name":"Link 3 Icon"
		,"type":"icon_pool"
		,"var":"big_link_icon3"
		,"default":""
	},
	{
		"name":"Link 4 Icon"
		,"type":"icon_pool"
		,"var":"big_link_icon4"
		,"default":""
	},
	{
		"name":"Link 5 Icon"
		,"type":"icon_pool"
		,"var":"link_icon5"
		,"default":""
	},
	{
		"name":"Link 6 Icon"
		,"type":"icon_pool"
		,"var":"link_icon6"
		,"default":""
	},
	{
		"name":"Link 7 Icon"
		,"type":"icon_pool"
		,"var":"link_icon7"
		,"default":""
	},
	{
		"name":"Link 8 Icon"
		,"type":"icon_pool"
		,"var":"link_icon8"
		,"default":""
	},
	{
		"name":"Link 9 Icon"
		,"type":"icon_pool"
		,"var":"link_icon9"
		,"default":""
	},
	{
		"name":"Link 10 Icon"
		,"type":"icon_pool"
		,"var":"link_icon10"
		,"default":""
	},
	{
		"name":"News Tag"
		,"type": "pagetagmulti"
		,"var": "tag"
	},{
		"name":"News Index Page"
		,"info":"In some situations the pages widget won't generate the full page address. If this happens you can enter the first part of the page addresses here."
		,"type": "text"
		,"default":""
		,"var": "index"
		,"design":"true"
	},{
		"name":"Forum Tag"
		,"type": "pagetagmulti"
		,"var": "forumtag"
	},{
		"name":"Forum Index Page"
		,"info":"In some situations the pages widget won't generate the full page address. If this happens you can enter the first part of the page addresses here."
		,"type": "text"
		,"default":""
		,"var": "forumindex"
		,"design":"true"
	},
	{
		"name":"Zoom Client ID"
		,"type": "text"
		,"default":""
		,"var": "clientid"
		,"info": "Enter your Zoom ‘Client ID’ here. Leave blank to omit zoom widget from Intranet Homepage"
	},{
		"name":"Zoom Client Secret"
		,"type": "text"
		,"default":""
		,"var": "clientsecret"
		,"info": "Enter your Zoom ‘Client Secret’ here"
	}
	],
        "inner_templates":{
        }
}
@@@ *}

{* News loops and clever capture system to get first and subsequent in separate output *}
{assign var="index" value=$metadata.index}
{if $metadata.index|substr:0:1=="/"}
{assign var="index" value=$metadata.index|substr:1}
{/if}
{if $index|substr:-1:1!="/"&&$index!=""}
{assign var="index" value="`$index`/"}
{/if}
{pages_by_tag tags=$metadata.tag assign=pages limit=5 sortbymeta=date}
{capture assign="news_feed"}
{foreach from=$pages item=page name=pages}
{if $smarty.foreach.pages.first}
{capture assign="first_news"}
{/if}
{if $smarty.foreach.pages.first}
{assign var = "w" value=400}
{assign var = "h" value=400}
{else}
{assign var = "w" value=256}
{assign var = "h" value=156}
{/if}
{assign var = "retw" value=$w*2}
{assign var = "reth" value=$h*2}
{capture assign="path"}
{if $page.pic_url==""||$page.pic_url=="/images"}{if $theme_vars_placeholder_image}/images/themegraphics/{$theme_vars_placeholder_image}{else}/graphics/placeholder.jpg{/if}{else}{$page.pic_url}{/if}?width={$w}&height={$h}&shrink=false
{/capture}
{assign var="link" value=$page.url_str_full}
{if $link|substr:0:1=="/"}
{assign var="link" value=$link|substr:1}
{/if}

{if !$smarty.foreach.pages.first}
{cycle values='odd,even' assign='class'}
<div class="styleBox intranet_item_{$class} recent-pages-feed-item magic-heights recent-pages-feed-item-{$smarty.foreach.pages.iteration} clearfix align-image-text 
	{foreach from=$page.tags_array item=tag name=loop1}
	tag-{$tag|css_safe}
	{/foreach}
">
	<div class="clearfix ">
	<div class="bpe_image magic-heights-inner Left_Image">{/if}<a href="/{$index}{$link}"><img src='{$path}' srcset="{if $page.pic_url==""||$page.pic_url=="/images"}{if $theme_vars_placeholder_image}/images/themegraphics/{$theme_vars_placeholder_image}{else}/graphics/placeholder.jpg{/if}{else}{$page.pic_url}{/if}?width={$retw}&height={$reth}&shrink=false 2x" {get_image_sizes path=$path} {$image_sizes}/></a>
{if !$smarty.foreach.pages.first}
	</div>
	{/if}
	<h4 ><a class="magic-heights-inner-2" href="/{$index}{$link}">{$page.pagetitle}</a>
	<span class="recent-pages-date">{$page.meta.date|date_format:$metadata.date_format}</span>
	</h4>
	{if !$smarty.foreach.pages.first}
	{if $metadata.showsummary}{if $page.meta.ss_page_desc!=""}<p>{$page.meta.ss_page_desc}</p>{else}
	{assign var=p value=$page.content|strip_tags_exclude:"<p>"}
	{assign var=p value="<p"|explode:$p}
	{assign var=p value=">"|explode:$p[1]}
	{assign var=p value="<"|explode:$p[1]}
	{assign var=p value=$p[0]}
	{$p}
	{/if}{/if}
	{if $metadata.showbutton}
	<p class="Button_Small"><a href="/{$index}{$link}">Read more</a></p>
	{/if}
	</div>
{/if}
{if $smarty.foreach.pages.first}
{/capture}
{else}
</div>
{/if}
{/foreach}
{/capture}

{* Main output *} 
<div id="auto_intranet">
{$editable.header_area}
<div class="clearfix" id="intranet_first_row">
	<div id="intranet_first_news">
		{$first_news}
	</div>
	<div id="intranet_first_links">
		<div id="intranet_pic_1" class="intranet_pic_big intranet_icon_{$metadata.big_link_icon1}">
		{$editable.link_image_1}
		</div>
		<div id="intranet_pic_2" class="intranet_pic_big intranet_icon_{$metadata.big_link_icon2}">
		{$editable.link_image_2}
		</div>
		<div id="intranet_pic_3" class="intranet_pic_big intranet_icon_{$metadata.big_link_icon3}">
		{$editable.link_image_3}
		</div>
		<div id="intranet_pic_4" class="intranet_pic_big intranet_icon_{$metadata.big_link_icon4}">
		{$editable.link_image_4}
		</div>
	</div>
</div>

<div class="clearfix" id="intranet_second_row">
	<div id="intranet_second_articles" class="recent-pages-feed magic-heights-wrap">
		{$news_feed}
		<div class="clear"></div>
	</div>
	<div id="intranet_second_links">
		<div id="intranet_pic_5" class="intranet_pic_small intranet_icon_{$metadata.link_icon5}">
		{$editable.link_image_5}
		</div>
		<div id="intranet_pic_6" class="intranet_pic_small intranet_icon_{$metadata.link_icon6}">
		{$editable.link_image_6}
		</div>
		<div id="intranet_pic_7" class="intranet_pic_small intranet_icon_{$metadata.link_icon7}">
		{$editable.link_image_7}
		</div>
		<div id="intranet_pic_8" class="intranet_pic_small intranet_icon_{$metadata.link_icon8}">
		{$editable.link_image_8}
		</div>
		<div id="intranet_pic_9" class="intranet_pic_small intranet_icon_{$metadata.link_icon9}">
		{$editable.link_image_9}
		</div>
		<div id="intranet_pic_10" class="intranet_pic_small intranet_icon_{$metadata.link_icon10}">
		{$editable.link_image_10}
		</div>
	</div>
	<div id="intranet_second_third">
<h2>Forum</h2>
{pages_by_tag tags=$metadata.forumtag assign=pages sortbymeta=created limit=5 direction=desc}
<div class="recent-forum-feed">
{foreach from=$pages item=page name=pages}
<div class="styleBox 
{foreach from=$page.tags_array item=tag name=loop1}
{if $tag!=0}
recent-forum-tag-id-{$tag}
{/if}
{/foreach}
">
<p class="forum-post-mini clearfix {if $page.owner.avatar}with-avatar{/if}">
	{if $page.owner.avatar}<a href="{$page.url_str_full}"><img src="/images/{$page.owner.avatar}?width=100&height=100&shrink=false" alt="{$page.owner.name}" class="avatar" title="{$page.owner.name}"/></a>
	{else}	
		<img src="/graphics/person.png" class="avatar" title="Upload new avatar"/>
	{/if}
    <span class="forum-post-mini-meta forum-post-mini-title"><a href="{$page.url_str_full}">{$page.pagetitle}</a></span>
    <span class="intranet-forum-post-mini-meta">Replies: {$page.page_child_data.forumcomment|@count}</br>
    Last updated: {$page.meta.lastupdated|date_format:"%b %e, %Y %H:%M"} </span>
</p>
</div>
{/foreach}
</div>

<h2>Events</h2>
		{$editable.events_calendar}
{if $metadata.clientid}
{*
<h2>Zoom</h2>
		<div class="zoom_container">
		{assign var=clientid value=$metadata.clientid}
		{assign var=clientsecret value=$metadata.clientsecret}
		{assign var="thispage" value="https://`$content.http_host``$smarty.server.REQUEST_URI`"}

		{if $smarty.get.code}
		{zoom action=gettoken code=$smarty.get.code clientid=$clientid clientsecret=$clientsecret redirect=$thispage}
		{if $zoom_token}
			{add_user_child_data 
				show_in_activity=0
				userid=$content.logged_in_user.id 
				more_data_zoomapi=$zoom_token
				more_data_zoomrefresh=$zoom_refresh_token
				type="zoomapi"
			}
			{flush_cache}	
		{/if}
		{/if}

		{get_user_child_data
			userid=$content.logged_in_user.id
			type="zoomapi"
			assign="zoomapiud"
		}

		{if $zoomapiud|@count == 0 && $content.logged_in_user.id!="" || $smarty.get.reconnect}
			<p class="Button_Medium"><a href="{zoom action=ssourl clientid=$clientid redirect=$thispage}">Connect Your Zoom Account</a></p>
		{/if}

		{if $zoomapiud|@count > 0 && $content.logged_in_user.id!=""}

			{foreach from=$zoomapiud item=item key=key name=loop1}
				{if $smarty.foreach.loop1.first}
				{zoom action=status token=$item.zoomapi}

				

				{if $zoom_code=="401"}
			
					{zoom action=refresh refresh=$item.zoomrefresh clientid=$clientid clientsecret=$clientsecret redirect=$thispage}			


					{if $new_zoom_token}


						{add_user_child_data 
							show_in_activity=0
							userid=$content.logged_in_user.id 
							more_data_zoomapi=$new_zoom_token
							more_data_zoomrefresh=$new_zoom_refresh_token
							type="zoomapi"
						}
						{flush_cache}
						<p>Your Zoom connection has been reloaded. <a href="?nocache=1">Click here to reload the page.</a></p>
						<script type="text/javascript">
						{literal}
						//window.location.reload();
						{/literal}
						</script>
					{else}
					<div class="styleBox">
						<p class="Icon_Alert">Your Zoom connection has expired</p>
						<p class="Button_Medium"><a href="{zoom action=ssourl clientid=$clientid redirect=$thispage}">Reconnect Your Zoom Account</a></p>
					</div>
					{/if}
					
				{else}
					<p>Your Zoom account ({$zoom_status.email}) is connected.</p>
					<div class="start-meeting">
					<h3>Create a new meeting</h3>
					<p>You can host one meeting at a time. Meetings use your persistent meeting code which means users can re-initiate meetings with you after you close the meeting in Zoom. Please remove the meeting below to prevent this happening after your meeting is finished.</p>
					{if $smarty.get.removemymeeting}
						{delete_page_child_data type="zoommeeting" pageid=$content.id userid=$content.logged_in_user.id}
						{flush_cache}

					{/if}
					{if $smarty.post.start_meeting}
					
						{delete_page_child_data type="zoommeeting" pageid=$content.id userid=$content.logged_in_user.id}

						
						{add_page_child_data
						pageid=$content.id 
						userid=$content.logged_in_user.id 
						more_data_link=$zoom_status.personal_meeting_url
						more_data_name=$smarty.request.meeting_name
						show_in_activity=0
						type="zoommeeting"}
						{flush_cache}	
						{redirect location=$zoom_status.personal_meeting_url}
						

					{/if}
					<form action="" method="post" target="_blank">
						<label>Meeeting name:</label>
						<input type="text" name="meeting_name" value=""/>
						<input type="hidden" name="start_meeting" value="1"/>
						<p class="Button_Medium submit_form"><a href="#" onclick="{literal}javascript:setTimeout(function(){window.location.reload();},1000);{/literal}">Start meeting</a></p>
					</form>
					</div>
					
					
				{/if}
				{/if}
			{/foreach}

			



			
		{/if}

		{get_page_child_data pageid=$content.id type="zoommeeting"}
		{if !$page_child_data}<div class="styleBox">There are currently no active meetings.</div>{/if}
		{foreach from=$page_child_data item="meeting"}
			<div class="styleBox">
			{if $meeting.owner==$content.logged_in_user.id}<p class="Button_Medium endmeeting"><a href="?removemymeeting=1">End meeting</a></p>{/if}
			<p class="meetingname">{$meeting.name} {if $meeting.owner==$content.logged_in_user.id}(My meeting){/if}</p><p class="Button_Medium joinzoom"><a target="_blank" href="{$meeting.link}">{if $meeting.owner==$content.logged_in_user.id}Open{else}Join{/if} in Zoom</a></p></div>
		{/foreach}

		</div>

*}
	{/if}
	</div>
</div>

