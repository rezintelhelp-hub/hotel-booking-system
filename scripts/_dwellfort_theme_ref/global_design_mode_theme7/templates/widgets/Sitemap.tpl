<ul>
{foreach from=$mainNav item=item key=key name=loop1}

<li data-page-id="{$item.id}"><a href="{if $item.homepage == "yes"}/{elseif $item.custom_url!=""}{$item.custom_url}{else}/{$item.url}/{/if}" title="{$item.longtitle}" {if $item.newWindow}target="_blank"{/if}>{if $item.subs}<span>{/if}{$item.title|replace:"Media Page":"Media"}{if $item.subs}</span>{/if}</a>
	{include file="nav/drop-down-menu.tpl" subs=$item.subs}</li>
{/foreach}
</ul>
