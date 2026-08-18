<ul class="subPageIndexGrid">
{pages_by_id ids=","|implode:$content.subPageIndex assign=pages}
{foreach from=$pages item=item key=key name=loop1}

	<li class="{if $smarty.foreach.loop1.iteration is div by 2}lastOf2 {/if} {if $smarty.foreach.loop1.iteration is div by 3} lastOf3{/if} {if $smarty.foreach.loop1.iteration is div by 4} lastOf4{/if}"><a href="{$item.url_str}/"><img width="280" height="280" src="{if $item.pic_url!=""&& $item.pic_url!="/images"}{$item.pic_url}?width=560&height=560&shrink=false{else}{if $theme_vars_placeholder_image}/images/themegraphics/{$theme_vars_placeholder_image}?width=560&height=560&shrink=false{/if}{/if}" alt="{$item.pagetitle}" /><span class="title">{$item.pagetitle}</span></a></li>
{/foreach}
</ul>
<div class="clear"></div>
