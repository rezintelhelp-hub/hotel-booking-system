{* Third level sub navs *}
{if $subSubs && $subSubs|@count>0}
	<ul>
	{foreach from=$subSubs item=sub key=key2 name=loop3}
		<li class="{if $sub.id==$content.id}currentSubSub{/if} {if $smarty.foreach.loop3.iteration=="1"}firstSubSub{/if}"><a href="/{$sub.topParentUrl}/{$sub.parentUrl}/{$sub.url}/" {if $sub.newWindow}target="_blank"{/if}>{$sub.pagetitle}</a>
		{if $content.id == $sub.id || $content.parent == $sub.id}
		{include file="nav/fourth-level-menu.tpl" subSubSubs=$sub.subSubSubs}
		{/if}
		</li>
	{/foreach}
	</ul>
{/if} 
