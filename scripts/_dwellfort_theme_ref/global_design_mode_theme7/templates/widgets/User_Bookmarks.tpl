{* @@@
{
        "widget_info":{
                "title":"User Bookmarks"
                ,"title_info":"Enter a name for this instance of the user Bookmarks widget."
                ,"category":"setup"
        },
        "meta_data":[],
        "inner_templates":{
        }
}
@@@ *}
{if $content.logged_in_user.id}
{if $smarty.get.removebookmark}
	{delete_user_child_data
		userid=$content.logged_in_user.id
		id=$smarty.get.removebookmark	
	}
{/if}
{if $smarty.post.data[$metadata.instance_id]}
{if !$smarty.post.data[$metadata.instance_id].link|starts_with:"http"}
<p class="Icon_Error">Please ensure the link starts with https:// </p>
{else}
{add_user_child_data
userid=$content.logged_in_user.id
data=$smarty.post.data[$metadata.instance_id]
type="bookmark`$metadata.instance_id`"
show_in_activity=0
}
<p class="Icon_Tick">Bookmark added</p>
{/if}
{/if}
<div class="user-bookmarks-list">
{get_user_child_data
userid=$content.logged_in_user.id
type="bookmark`$metadata.instance_id`"
}
{if $user_child_data}
<ul class="user-bookmarks">
{foreach from=$user_child_data item=bookmark key=key}
<li class="user-bookmark"><a href="?removebookmark={$key}" class="remove-bookmark">Delete</a><a href="{$bookmark.link}" target="_blank">{$bookmark.name}</a></li>
{/foreach}
</ul>
{/if}
<p class="user-bookmark-show-add"><a href="#">Add bookmark</a></p>

<form action="" method="post" class="user-bookmarks-add">
<div class="styleBox">
<label>Link<br/><input name="data[{$metadata.instance_id}][link]" type="text" placeholder="https://www.example.com"/></label>
<label>Name<br/><input name="data[{$metadata.instance_id}][name]" type="text" placeholder="My great bookmark"/></label>
<p class="Button_Small submit_form"><a href="#">Add bookmark</a></p>
</div>
</form>
</div>
{else}
<p class="Icon_Alert">You need to be logged in to use this feature</p>
{/if}
