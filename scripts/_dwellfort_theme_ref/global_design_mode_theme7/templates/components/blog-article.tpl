	<article>
	<h1 class='blogTitle'>{$title}</h1>
	<div class="blogArticleDate">

		<p>{$timestamp|date_format_locale:"%A, %B %e, %Y":$language} </p>


		{foreach from=$authors item=aut} {* Loop through all authors in the system...*}
			{if $aut.id == $author && $author!=""} {* ... if the author matches we can use the author information. *}
			<p>
				{$langs.Written_By} <a href="#author">{$aut.name}</a>
			</p>
			{/if}
		{/foreach}
		
		
		{if $in_categories|@count>=1}
			<p>{$langs.Categories}:
			{foreach from=$cats item=cat} {* Loop through each category in the system... *}
				{foreach from=$in_categories item=in_cat} {* ... Then loop through all categories that this blog article is assigned to ...*}
					{if $in_cat == $cat.id}<a href="/{$contentUrl}/category/{$cat.url}/">{$cat.name}</a>{/if} {* ... if we have a match, we can use the data from the category. *}
				{/foreach}
			{/foreach}
			</p>
		{/if}
		{if $tags}
			<p class="clearfix"><span class='blog-tag-title'>{$langs.Tags} </span>
			{foreach from=$tags item=tag key=key name=loop1}
				<a href="/{$contentUrl}/tag/{$tag.url}/" class="tag">{$tag.name}{if !$smarty.foreach.loop1.last}{/if}</a>
			{/foreach}
			</p>
		{/if}
		{if $theme_vars_show_blog_comments}
		<p><a href="#comments">{$langs.Comments}: {$comments|@count}</a></p>
		{/if}
	</div>
	
	<div class="hr"></div>
	
	{$blog_content}

	<div class="clear"><!-- --></div> {* Add a clear div just in case there is any floated overflowing content (images etc) in the post *}

	{foreach from=$authors item=aut} {* Loop through all authors in the system...*}
		{if $aut.id == $author && $aut.details!=""} {* ... if the author matches we can use the author information. *}
	<a name="author"></a>
	<p class="blogAuthor">
		{$aut.details}
	</p>
		{/if}
	{/foreach}
	</article>
	{if $theme_vars_show_blog_comments}
	<a name="comments"></a>
	<p>{$langs.Comments} <a href="/rss/{$url}/" title="{$langs.Comments_RSS}"><img src="/graphics/rss.png" alt="{$langs.Comments_RSS}"/></a></p>

	{include file=components/blog-comments.tpl}
	
	<div class="clear"><!-- --></div>
	<div id="commentForm"> {* this is where the ajax comment form gets inserted on page load *}

	</div>
	{/if}
	<input type="hidden" name="blogId" value="{$blogId}" id="blogId"/> {* Don't delete this! *}

	
	{$sitewideContent.Blog_Article_Sidebar}

	