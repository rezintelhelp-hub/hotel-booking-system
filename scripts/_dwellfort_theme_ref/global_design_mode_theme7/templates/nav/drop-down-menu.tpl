{* drop down sub navs *}
{if $subs && $subs|@count>0}
	<ul>
	{foreach from=$subs item=sub key=key2 name=loop2}
		<li class="{if $sub.id==$content.id}currentSub{/if}"><a href="{if $sub.custom_url!=""}{$sub.custom_url}{else}/{$sub.parentUrl}/{$sub.url}/{/if}" {if $sub.newWindow}target="_blank"{/if}>{$sub.pagetitle}</a>
			{if $sub.subSubs|@count>0}
				<ul>
				{foreach from=$sub.subSubs item=subSub key=key2 name=loop3}
					<li class="{if $subSub.id==$content.id}currentSubSub{/if} {if $smarty.foreach.loop3.iteration=="1"}firstSubSub{/if}"><a href="{if $subSub.custom_url!=""}{$subSub.custom_url}{else}/{$subSub.topParentUrl}/{$subSub.parentUrl}/{$subSub.url}/{/if}" {if $subSub.newWindow}target="_blank"{/if}>{$subSub.pagetitle}</a>
					</li>
				{/foreach}
				</ul>
			{/if}
		</li>
	{/foreach}
	</ul>
{/if} 
