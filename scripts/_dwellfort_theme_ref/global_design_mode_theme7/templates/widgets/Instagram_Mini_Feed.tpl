{* @@@
{
	"widget_info":{
		"title":"Instagram Mini Feed"
		,"title_info":"Enter a name for this instance of the Instagram Mini Feed widget. This is just used for reference."
		,"category":"setup"
	},
	"meta_data":[],
	"inner_templates":{
	}
}
@@@ *}
{instagram show=25}
<div class="social-mini-feed-wrap-outer">
<div class="social-mini-feed-wrap">
<div class="clearfix styleBox instagram-mini-feed">
<div class="instagram-column">
{foreach from=$posts item=post name=posts}
<div class="instagram-mini-feed-post">
<a href="{$post.link}"><img data-src="{$post.image}"/></a>
</div>
{if $posts|count < 16}
{assign var=low value=6}
{assign var=high value=12}
{else}
{assign var=low value=8}
{assign var=high value=16}
{/if}
{if $smarty.foreach.posts.iteration == $low||$smarty.foreach.posts.iteration==$high}
	</div>
	<div class="instagram-column">
{/if}
{/foreach}
</div>
{if $noconnection}
<p>Instagram feed not configured</p>
{/if}
</div>
</div>
</div>
