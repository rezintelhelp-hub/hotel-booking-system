{* @@@
{
        "widget_info":{
                "title":"User List"
                ,"title_info":"Enter a name for this instance of the User List widget. This widget shows all users from a specified list and displays their names, avatars and bios."
                ,"category":"setup" 
        },
        "meta_data":[{
                "name":"Eligible User List"
                ,"type": "user_list"
                ,"var": "userlists"
                ,"default":""
        },{
                "name":"Two columns"
                ,"type": "tick"
                ,"var": "cols"
                ,"default":"1"
        }],
        "inner_templates":{
        }
}
@@@ *}
{if $metadata.userlists}
{if $metadata.cols}
<div class="magic-heights-wrap">
{/if}
{users_from_lists ids=$metadata.userlists}
{foreach from=$users item=user}
{get_user_custom_fields userid=$user.id}
{foreach from=$user_custom_fields item=$field}
	{if $field.name=="Bio"}
		{assign var="bio" value=$field.value}
	{/if}
{/foreach}
	<div class="{if $metadata.cols}magic-heights{/if} styleBox user_{$user.id} user_list">
		<div class="user_list_name_pic ">
			<div class="img">
			{if $user.avatar==""}
				<img src="/graphics/person.png" />
			{else}
				<img src="/images/{$user.avatar}?width=152&height=152&shrink=false" width="76" height="76"/>
			{/if}
			</div>
		</div>
		<h4>{$user.name}</h4>
		<div class="user_list_bio {if $metadata.cols}magic-heights-inner{/if}">
		{$bio|parsedown}
		</div>
	</div>
{/foreach}
{if $metadata.cols}
</div>
{/if}
{/if}
