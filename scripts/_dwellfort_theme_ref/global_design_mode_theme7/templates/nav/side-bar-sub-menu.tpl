{*STATIC SUB NAVS *}
{if $staticSubs && $staticSubs|@count>0}
	<nav id="sidebarNav">
		<div id="sidebarInner">
		{* remove the following foreach to stop the parent top level page showing as first item in the left nav*}
		{foreach from=$mainNav item=item key=key name=loop1}
		{if 
		 $item.url == $url 
		 || $item.id == $parent}
		<h4 class="current"><a href="/{$item.url}/"><strong>{$item.title}</strong></a></h4>
		{elseif $item.id == $parent || $item.id == $topParent}
		<h4><a href="/{$item.url}/"><strong>{$item.title}</strong></a></h4>
		{/if}
		{/foreach}
		{* *}
		<ul>
		{foreach from=$staticSubs item=sub key=key2 name=loop2}
		<li class="
		{if $parent==$sub.subSubs[0].parent && $type!="topLevel"}
			currentParent	
		{/if}		
		{if $sub.url == $url} current{/if}	
		{if $smarty.foreach.loop2.last} last{/if}
		"><a href="/{$sub.parentUrl}/{$sub.url}/" {if $sub.newWindow}target="_blank"{/if}>{$sub.pagetitle}</a>
		{if $id==$sub.subSubs[0].parent || $parent==$sub.subSubs[0].parent || $subParent==$sub.subSubs[0].parent}
			{include file="nav/third-level-menu.tpl" subSubs=$sub.subSubs}
		{/if}
		</li>
		{/foreach}
		</ul>
		</div>
</nav>
{/if} 
{* END SUB NAV *}
