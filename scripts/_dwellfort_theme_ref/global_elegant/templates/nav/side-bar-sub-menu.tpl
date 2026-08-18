{*STATIC SUB NAVS *}
{if $staticSubs|@count>0}
	<nav id="sidebarNav">
		<div id="sidebarInner">
		{* remove the following foreach to stop the parent top level page showing as first item in the left nav*}
		{foreach from=$mainNav item=item key=key name=loop1}
		{if $item.url == $content.url}
		<h4 class="current"><a href="/{$item.url}/"><strong>{$item.title}</strong></a></h4>
		{elseif $item.id == $content.parent || $item.id == $content.topParent}
		<h4><a href="/{$item.url}/"><strong>{$item.title}</strong></a></h4>
		{/if}
		{/foreach}
		{* *}


		<ul>
		{foreach from=$staticSubs item=sub key=key2 name=loop2}
		{strip}
		<li class="
		{if $content.parent==$sub.subSubs[0].parent && $content.type!="topLevel"}
			currentParent	
		{/if}		
		{if $sub.url == $content.url} current{/if}	
		{if $smarty.foreach.loop2.last} last{/if}
		"><a href="/{$sub.parentUrl}/{$sub.url}/">{$sub.pagetitle}</a>
		{if $content.id==$sub.subSubs[0].parent || $content.parent==$sub.subSubs[0].parent || $content.subParent==$sub.subSubs[0].parent}
			{if $theme_vars_sidebar_menu=="2level" || $theme_vars_sidebar_menu=="3level"}
			{include file=nav/third-level-menu.tpl subSubs=$sub.subSubs}
			{/if}
		{/if}
		</li>
		{/strip}
		{/foreach}
		</ul>
		</div>
</nav>
{/if} 
{* END SUB NAV *}
