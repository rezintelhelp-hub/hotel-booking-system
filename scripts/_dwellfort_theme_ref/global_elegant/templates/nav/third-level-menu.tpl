{* Third level sub navs *}
{if $subSubs|@count>0}
	<ul>
	{foreach from=$subSubs item=sub key=key2 name=loop3}
		<li class="{if $sub.id==$content.id}currentSubSub{/if} {if $smarty.foreach.loop3.iteration=="1"}firstSubSub{/if}"><a href="/{$sub.topParentUrl}/{$sub.parentUrl}/{$sub.url}/">{$sub.pagetitle}</a>
		
		{if $content.id == $sub.id || $content.parent == $sub.id}
		{if $theme_vars_sidebar_menu=="3level"}
		{include file=nav/fourth-level-menu.tpl subSubSubs=$sub.subSubSubs}
		{/if}
		{/if}
		</li>
	{/foreach}
	</ul>
{/if} 
