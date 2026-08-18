{* @@@
{
	"widget_info":{
		"title":"Logged In Only Container"
		,"title_info":"Enter a name for this instance of the widget. This widget lets you restrict portions of content on the page to users with access to certain tags only."
		,"category":"setup"
	},
	"meta_data":[{
		"name":"Tag(s)"
		,"type": "pagetagmulti"
		,"var": "tags"
	},{
		"name":"Restrict to category"
		,"type": "text"
		,"var": "cats"
		,"info":"Enter the category or categories (separate with commas) to restrict to. The content will only be visible if the user is in a matching category. This should match the category name exactly. Leave empty to allow all users that match the tag(s)."
		,"default":""
	}],
	"inner_templates":{}
}
@@@ *}
{assign var=tagsa value=","|explode:$metadata.tags}

{if $user_has_session}

	{assign var=catsa value=","|explode:$metadata.cats}
	{assign var=catsok value=true}
	{foreach from=$catsa item="cat"}
		{if $cat|trim!=""}
			{assign var=catsok value=false}
			{foreach from=$content.logged_in_user.in_categories item="incat"}
				{if $incat==$cat}
					{assign var=catsok value=true}
				{/if}
			{/foreach}
		{/if}
	{/foreach}
	{if $user_is_allowed_tags|@count==0 && $catsok}
		<div class="protected-content {foreach from=$tagsa item=tag}allowed-by-{$tag} {/foreach}">
		{$editable.protected_content}
		</div>
		{assign var=loggedin value=true}
	{/if}
	{assign var = shown value=false}
	{foreach from=$tagsa item=tag}
		{if $tag|in_array:$user_is_allowed_tags && !$shown && $catsok}
			<div class="protected-content {foreach from=$tagsa item=tag}allowed-by-{$tag} {/foreach}">
			{$editable.protected_content}
			</div>
			{assign var=loggedin value=true}
			{assign var=shown value=true}
		{/if}
	{/foreach}
{/if}

{if !$loggedin}
	{$editable.public_content}
{/if}
