<ul class="subPageIndexGrid">
{foreach from=$content.subPageIndex item=item key=key name=loop1}
	<li class="{if $smarty.foreach.loop1.iteration is div by 2}lastOf2 {/if} {if $smarty.foreach.loop1.iteration is div by 3} lastOf3{/if} {if $smarty.foreach.loop1.iteration is div by 4} lastOf4{/if}"><a href="{$item.fullUrl}">{if $item.imgUrl}<img src="{$item.imgUrl}?width=280&amp;height=280&amp;shrink=false" alt="{$item.title}" />{/if}<span class="title">{$item.title}</span></a></li>
{/foreach}
</ul>
<div class="clear"></div>