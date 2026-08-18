{* drop down sub navs *}
{if $subs|@count>0}
	<ul>
	{foreach from=$subs item=sub key=key2 name=loop2}
		<li><a href="/{$sub.parentUrl}/{$sub.url}/">{$sub.pagetitle}</a></li>
	{/foreach}
	</ul>
{/if} 
