{* @@@
{
        "widget_info":{
                "title":"User List Chat"
                ,"title_info":"Enter a name for this instance of the User List Chat widget. This widget lets users view and start charts with one or more members of the same User List to which they belong, as long as that User List is enabled in the settings for this instance of the widget."
                ,"category":"setup" 
        },
        "meta_data":[{
                "name":"Eligible User Lists"
                ,"type": "user_list"
                ,"var": "userlists"
                ,"default":""
        }],
        "inner_templates":{
        }
}
@@@ *}
{if $smarty.request.sse}
{ob_end_flush}
{assign var=c value=1}
{assign var=lastid value=$smarty.request.last_id}
{if $smarty.server.HTTP_LAST_EVENT_ID}
{assign var=lastid value=$smarty.server.HTTP_LAST_EVENT_ID}
{/if}
{section name=checker loop=500}
{obflush}
{sleep time="1"}
{if $smarty.request.id!=-1}
{assign var=message value="message_`$smarty.request.message_id`"}
{assign var=unreads value="unread_in_chat_`$smarty.request.message_id`"}
{delete_user_child_data userid=$content.logged_in_user.id type=$unreads}
{get_page_child_data type=$message use_as_key=created pageid=$content.id assign=messages reverse=true}
{assign var=authorgroup value=""}
{foreach from = $messages item=message}
{assign var=firstingroup value=""}
{if $message.owner.id!=$authorgroup}
{assign var=authorgroup value=$message.owner.id}
{assign var=firstingroup value="firstingroup"}
{/if}
{obflush}
{if $message.id>$lastid}
{assign var=lastid value=$message.id}
id: {$message.id}
data: {strip}
			{/strip}<div class="clearfix user_chat_message {$firstingroup} {if $message.owner.id==$content.logged_in_user.id}user_chat_mine{/if}" data-id="{$message.id}">{strip}
			{/strip}<p class="user_chat_author">{$message.owner.name}</p>{strip}
			{/strip}<div class="user_chat_avatar">{strip}
				{/strip}{if $message.owner.avatar!=""}<img src="/images/{$message.owner.avatar}?width=100&height=100&shrink=false" alt="{$message.owner.name}" class="avatar"/>{strip}
				{/strip}{else}	{strip}
				{/strip}	<img src="/graphics/person.png" class="avatar" title="{$message.owner.name}"/>{strip}
				{/strip}{/if}{strip}
			{/strip}</div>{strip}
			{/strip}<p class="user_chat_message_body">{$message.message}</p> {strip}
			{/strip}</div>
{obflush}
{/if}
{/foreach}
{obflush}
{/if}
{get_page_child_data type="conversation" pageid=$content.id}
{foreach from=$page_child_data item=convo key=convoid}
{get_user_child_data type="unread_in_chat_`$convoid`" userid=$content.logged_in_user.id}
{if $user_child_data}
data: unread|{$convoid}
{/if}
{/foreach}
{assign var=c value=$c+1}
{/section}
{die}
{/if}
{if $smarty.request.create_chat}
{if $smarty.request.editing_chat!=0}
	{add_page_child_data type="message_`$smarty.request.editing_chat`" userid=$content.logged_in_user.id pageid=$content.id data=$smarty.request.message}
	{get_user_child_data type="belongs_to_chat_`$smarty.request.editing_chat`" assign="allconvousers"}
	{foreach from=$allconvousers item=user}
		{if $user.owner.id!=0}
			{if $user.owner.id!=$content.logged_in_user.id}
			{add_user_child_data userid=$user.owner.id type="unread_in_chat_`$smarty.request.editing_chat`"}
			{/if}
		{/if}
	{/foreach}
	{get_page_child_data type="conversation" pageid=$content.id}
	{foreach from=$page_child_data item=convo key=convoid}
	{if $convoid==$smarty.request.editing_chat}
	{add_user_child_data userid=$convo.owner.id type="unread_in_chat_`$smarty.request.editing_chat`"}
	{/if}
	{/foreach}

{else}
	{foreach from=","|explode:$smarty.request.data.toids item=recipient_id}
	{if $recipient_id==0}
	{assign var=everyone value=true}
	{/if}
	{/foreach}
	{if $everyone}
	{assign var=owner value=0}
	{else}
	{assign var=owner value=$content.logged_in_user.id}
	{/if}
	{add_page_child_data 
	pageid=$content.id
	userid=$owner
	data=$smarty.request.data
	type="conversation"
	}
	{foreach from=","|explode:$smarty.request.data.toids item=recipient_id}
	{add_user_child_data userid=$recipient_id type="belongs_to_chat_`$child_data_added`"}
	{add_user_child_data userid=$recipient_id type="unread_in_chat_`$child_data_added`"}
	{/foreach}
	{flush_cache}
	{add_page_child_data type="message_`$child_data_added`" userid=$content.logged_in_user.id pageid=$content.id data=$smarty.request.message}
{/if}
{/if}
<div id="user_list_chat" class="clearfix">
<div id="user_list_chat_sidebar">
	<div class="current_user_chat user_chat_sidebar_convo" id="user_list_chat_add_chat" data-id="0">
	Create new chat
		<div class="user_chat_messages">
		</div>
		<div class="user_chat_users">
		</div>
	</div>
	{get_page_child_data type="conversation" pageid=$content.id}
	{foreach from=$page_child_data item=convo key=convoid}
	{get_user_child_data type="belongs_to_chat_`$convoid`" userid=$content.logged_in_user.id assign=belongs_to_chat}
	{get_user_child_data type="belongs_to_chat_`$convoid`" assign="allconvousers"}
	{assign var=inboundchat value=false}
	{foreach from=$allconvousers item=inchat}
		{if $inchat.owner.id!=0 && $inchat.owner.id==$content.logged_in_user.id}
			{assign var=inboundchat value=true}
		{/if}
	{/foreach}
	{if $content.logged_in_user.id == $convo.owner.id || $inboundchat || !$convo.owner}
	<div class="user_chat_sidebar_convo" data-id="{$convoid}">
		<div class="user_chat_users">
			{assign var=iseveryone value=false}
			{foreach from=$allconvousers item=inchat}
			
				{if $inchat.owner.id!=0 && $inchat.owner.id!=$content.logged_in_user.id}
				<span data-name="{$user.owner.name}" data-id="{$user.owner.id}" class="user_chat_recipient">{$inchat.owner.name}</span>
			
				{/if}
				{if $inchat.owner.id==0}
					{assign var=iseveryone value=true}
				{/if}
			{/foreach}
			{if $iseveryone}
			<span data-name="Everyone" data-id="0" class="user_chat_recipient">Everyone</span>			
			{/if}
			{if $convo.owner.id!=$content.logged_in_user.id && !$iseveryone}
				<span data-name="{$convo.owner.name}" data-id="{$convo.owner.id}" class="user_chat_recipient">{$convo.owner.name}</span>
			{/if}
		</div>
		<div class="user_chat_name">
		</div>
		{assign var=message value="message_`$convoid`"}
		{get_page_child_data type=$message use_as_key=created pageid=$content.id assign=messages reverse=true}
		<div class="user_chat_messages">
			{assign var=authorgroup value=""}
			{foreach from=$messages item=message key=timestamp}
			{assign var=firstingroup value=""}
			{if $message.owner.id!=$authorgroup}
			{assign var=authorgroup value=$message.owner.id}
			{assign var=firstingroup value="firstingroup"}
			{/if}
			<div class="clearfix user_chat_message {$firstingroup} {if $message.owner.id==$content.logged_in_user.id}user_chat_mine{/if}" data-id="{$message.id}">
			<p class="user_chat_author">{$message.owner.name}</p>
			<div class="user_chat_avatar">
				{if $message.owner.avatar!=""}<img src="/images/{$message.owner.avatar}?width=100&height=100&shrink=false" alt="{$message.owner.name}" class="avatar"/>
				{else}
					<img src="/graphics/person.png" class="avatar" title="{$message.owner.name}"/>
				{/if}
			</div>
			<p class="user_chat_message_body">{$message.message}</p> 
			</div>
			{/foreach}
		</div>
	</div>
	{/if}
	{/foreach}

</div>
<div id="user_list_chat_convo">
		<div id="user_chat_add_new" class="clearfix">
			<p>Start new chat </p>
			<label>To:</label><span id="user_chat_recipient_list"></span><span id="user_chat_recipient_wrap"><input type="text" id="user_chat_recipient_search"/>
			{if $metadata.userlists}
			{users_from_lists ids=$metadata.userlists}
			<ul id="user_chat_user_list">
			{foreach from=$users item=user}
			{if $content.logged_in_user.id!=$user.id}
			<li class="user_{$user.id}" data-search="{$user.email|strtolower} {$user.name|htmlspecialchars|strtolower}"><a href="#" data-user-id="{$user.id}" data-name="{$user.name|htmlspecialchars}">{$user.name}</a></li>
			{/if}
			{/foreach}
			<li class="user_0" data-search="everyone all"><a href="#" data-user-id="0" data-name="Everyone">Everyone</a></li>
			</ul>
			{/if}
			</span>
		</div>
		<div id="user_chat_messages">
		</div>
		<div id="user_chat_type_message">
			<form action="" method="post">
				<input type="hidden" name="create_chat" value="1"/>
				<input type="hidden" name="editing_chat" id="editing_chat" value="0"/>
				<input type="hidden" name="data[tonames]" id="user_chat_recipient_names"/>
				<input type="hidden" name="data[toids]" id="user_chat_recipient_ids"/>
				<textarea disabled name="message[message]"></textarea>
				<button type="submit">Send</button>
			</form>
		</div>
	</div>
</div>
</div>
