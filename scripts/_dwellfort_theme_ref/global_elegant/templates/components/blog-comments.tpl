{if $comments|@count==0}
<p>{$langs.No_Comments_Yet}</p>
{/if}
{foreach from=$comments item=comment}
<li  class="{if $comment.isauthor == "yes"}author{/if} clearfix">
	<img src="http://www.gravatar.com/avatar/{$comment.md5email}?s=30&d=http://predesigned.phototropic.co/graphics/comment.png" alt="{if $comment.isauthor!="yes"}{$comment.author}{/if}" class="gravatar"/>
	<span class="commentText">
	{if $comment.isauthor}
		<strong><a href="#author">{$langs.The_Author}</a></strong>	
	{else}
		{if $comment.website!=""}
		<strong><a href="http://{$comment.website}">{$comment.author}</a></strong>
		{else}
		<strong><a href="http://{$comment.website}">{$comment.author}</a></strong>			
		{/if}
	{/if}
	{$comment.content}
	<strong class="commentDate">{$comment.timestamp|date_format_locale:"%A, %B %e, %Y":$language}</strong>
	</span>
</li>
{/foreach}
{if $approval_notice}
<p class="status">{$langs.Comment_Thanks}</p>
{/if}
