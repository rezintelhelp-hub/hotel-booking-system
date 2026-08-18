{if !$theme_vars_recent_blog_articles}
{assign var=theme_vars_recent_blog_articles value=3}
{/if}
<ul class="recent_blog_articles">
{foreach from=$content.recentArticles item=item key=key name=loop1}
{if $smarty.foreach.loop1.iteration<=$theme_vars_recent_blog_articles}
<li class="clearfix {if $item.picUrl}withThumb{/if}">
	{if $item.picUrl}
	<div class="blog_article_thumb"><a href="/{$content.blogUrl}/{$item.url}/"><img src="{$item.picUrl}?width=100&height=80&shrink=false" /></a></div>
	{/if}
	<p><a href="/{$content.blogUrl}/{$item.url}/">{$item.title}</a><br/>
		<span class="blog_date">{$item.timestamp|date_format:"%B %e %Y"}</span></p>
	{/if}
</li>
{/foreach}
</ul>