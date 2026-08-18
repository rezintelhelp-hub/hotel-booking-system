<ul class='main-pages-list-widget'>
	{foreach from=$mainNav item=item key=key name=loop1}
	
	<li class="{if $item.url == $content.url || $item.id == $content.parent || $item.id == $content.topParent}current{assign var=current value="true"}{/if} {if $item.subs}has-subs{/if}" data-page-id="{$item.id}"><a href="{if $item.homepage == "yes"}/{else}/{$item.url}/{/if}" title="{$item.title|replace:"Media Page":"Media"}" {if $item.newWindow}target="_blank"{/if}>{$item.title|replace:"Media Page":"Media"}</a></li>

	{/foreach}
</ul>