{* @@@
{
	"widget_info":{
		"title":"Sidebar Menu"
		,"title_info":"Enter a name for this instace of the widget. This is just used for your reference."
	},
	"meta_data":[],
	"inner_templates":{
	}
}
@@@ *}
{*STATIC SUB NAVS *}
{if $staticSubs|@count>0}
	<nav id="sidebarNav">
		<div id="sidebarInner">
		{* remove the following foreach to stop the parent top level page showing as first item in the left nav*}
		{foreach from=$mainNav item=item key=key name=loop1}
		{if 
		 $item.url == $content.url 
		 || $item.id == $content.parent}
		<h4 class="current"><a href="/{$item.url}/"><strong>{$item.title}</strong></a></h4>
		{elseif $item.id == $parent || $item.id == $content.topParent}
		<h4><a href="/{$item.url}/"><strong>{$item.title}</strong></a></h4>
		{/if}
		{/foreach}
		{* *}
		<ul>
		{foreach from=$staticSubs item=sub key=key2 name=loop2}

		<li class="
		{if $content.parent==$sub.subSubs[0].parent}
			currentParent
		{/if}
		{if $sub.url == $content.url} current{/if}
		{if $smarty.foreach.loop2.last} last{/if}
		"><a href="/{$sub.parentUrl}/{$sub.url}/" {if $sub.newWindow}target="_blank"{/if}>{$sub.pagetitle} </a>
		{if $content.id==$sub.subSubs[0].parent || $content.parent==$sub.subSubs[0].parent || $content.subParent==$sub.subSubs[0].parent || $content.breadcrumb[1].id==$sub.subSubs[0].parent}
			{include file="nav/third-level-menu.tpl" subSubs=$sub.subSubs}
		{/if}
		</li>
		{/foreach}
		</ul>
		</div>
</nav>
{/if} 
{* END SUB NAV *}
