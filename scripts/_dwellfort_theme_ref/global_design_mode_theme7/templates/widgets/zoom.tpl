{* @@@
{
	"widget_info":{
		"title":"Zoom Controls"
		,"title_info":"Enter a name for the instance of the Zoom controls. Please note the page you add this widget to will need to have caching disabled."
		,"category":"setup"
	},
	"meta_data":[{
		"name":"Client ID"
		,"type": "text"
		,"default":""
		,"var": "clientid"
		,"info": "Enter your Zoom ‘Client ID’ here"
	},{
		"name":"Client Secret"
		,"type": "text"
		,"default":""
		,"var": "clientsecret"
		,"info": "Enter your Zoom ‘Client Secret’ here"
	}],
	"inner_templates":{
	}
}
@@@ *}
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
<h3>Available meetings to join</h3>

{get_page_child_data pageid=$content.id type="zoommeeting"}
{if !$page_child_data}<p>There are currently no active meetings.</p>{/if}
{foreach from=$page_child_data item="meeting"}
	<div class="styleBox">
	{if $meeting.owner==$content.logged_in_user.id}<p class="Button_Medium endmeeting"><a href="?removemymeeting=1">End meeting</a></p>{/if}
	<p class="meetingname">{$meeting.name} {if $meeting.owner==$content.logged_in_user.id}(My meeting){/if}</p><p class="Button_Medium joinzoom"><a target="_blank" href="{$meeting.link}">{if $meeting.owner==$content.logged_in_user.id}Open{else}Join{/if} in Zoom</a></p></div>
{/foreach}

</div>
