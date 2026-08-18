<div class="container">
	<h1 class='blogTitle'>{$title}</h1>
	<div class="hr"></div>
	<div class="row">
		<div class='column threeCol first'>
					

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

			<a name="comments"></a>
			<h4>{$langs.Comments} <a href="/rss/{$url}/" title="{$langs.Comments_RSS}"><img src="/graphics/rss.png" alt="{$langs.Comments_RSS}"/></a></h4>
			<ol id="commentsList">
			{include file=components/blog-comments.tpl}
			</ol>
					<div class="clear"><!-- --></div>
			<div id="commentForm"> {* this is where the ajax comment form gets inserted on page load *}
				<noscript>
					<h1>{$langs.Javascript_Warning}</h1>
				</noscript>
			</div>

			<input type="hidden" name="blogId" value="{$blogId}" id="blogId"/> {* Don't delete this! *}
		</div>
		<div class='column quartCol last'>
			<div class="blogArticleDate">

				<p>{$timestamp|date_format_locale:"%A, %B %e, %Y":$language} </p>


				{foreach from=$authors item=aut} {* Loop through all authors in the system...*}
					{if $aut.id == $author && $author!=""} {* ... if the author matches we can use the author information. *}
					<p>
						<strong>{$langs.Written_By}</strong> <a href="#author">{$aut.name}</a>
					</p>
					{/if}
				{/foreach}
				
				
				{if $in_categories|@count>1}
					<p><strong>{$langs.Categories}:</strong>
					{foreach from=$cats item=cat} {* Loop through each category in the system... *}
						{foreach from=$in_categories item=in_cat} {* ... Then loop through all categories that this blog article is assigned to ...*}
							{if $in_cat == $cat.id}<a href="/{$contentUrl}/category/{$cat.url}/">{$cat.name}</a>{/if} {* ... if we have a match, we can use the data from the category. *}
						{/foreach}
					{/foreach}
					</p>
				{/if}
				{if $tags}
					<p class="clearfix"><span style='float:left;margin-right:10px'><strong>{$langs.Tags}</strong></span> 
					{foreach from=$tags item=tag key=key name=loop1}
						<a href="/{$contentUrl}/tag/{$tag.url}/" class="tag">{$tag.name}{if !$smarty.foreach.loop1.last}{/if}</a>
					{/foreach}
					</p>
				{/if}
					
				<p><strong><a href="#comments">{$langs.Comments}</a></strong>: {$comments|@count} </p>
			</div>
			{$sitewideContent.Blog_Article_Sidebar}
		</div>
	</div>
</div>