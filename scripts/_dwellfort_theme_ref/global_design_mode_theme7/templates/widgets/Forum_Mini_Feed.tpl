{* @@@
{
	"widget_info":{
		"title":"Forum Mini Feed"
		,"title_info":"Enter a name for this instance of the forum mini feed. This is just used for reference."
		 ,"category":"setup"
	},
	"meta_data":[{
		"name":"Tag"
		,"type": "pagetagmulti"
		,"var": "tags"
	},{
		"name":"Number of pages to show"
		,"type": "text"
		,"default":"3"
		,"var": "toshow"
	},{
		"name":"Show meta info"
		,"type": "tick"
		,"default":"1"
		,"var": "showmeta"
	}]
}
@@@ *}
{pages_by_tag tags=$metadata.tags assign=pages sortbymeta=created limit=$metadata.toshow direction=desc}
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
	{if $metadata.showmeta}
    <span class="forum-post-mini-meta forum-post-mini-comments">Replies: <br/>{$page.page_child_data.forumcomment|@count}</span> 
    <span class="forum-post-mini-meta forum-post-mini-last-update">Last updated: <br/>{$page.meta.lastupdated|date_format:"%b %e, %Y %H:%M"} </span>
    <span class="forum-post-mini-meta forum-post-mini-created">Created: <br/>{$page.meta.created|date_format:"%b %e, %Y %H:%M"}</span>
	{/if}
</p>
</div>
{/foreach}
</div>
