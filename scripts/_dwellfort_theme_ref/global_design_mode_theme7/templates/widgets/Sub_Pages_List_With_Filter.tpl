<div id="subPageIndexProducts" class="withFilterBox clearfix">
	<div id="filterBox" class="styleBox clearfix"></div>
	<div id="subPageIndexProductsList" class="magic-heights-wrap">
{pages_by_id ids=","|implode:$content.subPageIndex assign=pages fullcontent="true"}
{foreach from=$pages item=item key=key name=loop1}
	<div class="styleBox magic-heights subPageProducts clearfix{if $smarty.foreach.loop1.iteration is div by 3} last{/if}">
		{if $item.content.contentSplit.Page_Preview==""}
		<div class="magic-heights-inner">
		{if $item.imgUrl}<a href="{$item.fullUrl}"><div class="subPageThumb"><img class="index-async-load" src='/graphics/x.gif' data-async-src="{$item.imgUrl}?width=150&height=150"></div></a>{else}<div class="subPageThumb" style="width:1px;"></div>{/if}
		<a href="{$item.fullUrl}"><span class="title">{$item.title}</span></a>
		</div>
		{else}
		<div class="magic-heights-inner">
		{$item.content.contentSplit.Page_Preview|replace:"img src=\"/":"img src='/graphics/x.gif' class='index-async-load' data-async-src=\"/"|replace:" srcset=":" srcset-off="}
		</div>
		{/if}
		<div class="productMeta">
			{$item.meta.ss_page_keywords}
		</div> <!-- end #name -->
		</div>
{/foreach}
	</div>
</div>
