{* Fourth level sub navs *}
{if $subSubSubs|@count>0}
	<ul>
	{foreach from=$subSubSubs item=sub key=key2 name=loop2}
		<li{if $sub.id==$content.id} class="current"{/if}><a href="/{$sub.topParentUrl}/{$sub.subParentUrl}/{$sub.parentUrl}/{$sub.url}/">{$sub.pagetitle}</a></li>
	{/foreach}
	</ul>
{/if} 
