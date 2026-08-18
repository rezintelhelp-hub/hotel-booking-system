<div id="pbIndex" class="clearfix">
	<div id="pbSearch" class="clearfix">
		<div id="hideWhenContact">
			<label>{$editable.Search_Title|strip_tags}</label>
			<div id="pbSearchWrap">
			<p id="pbSearchEg">{$editable.Search_Example|strip_tags}</p>
			<input type="text" id="pbSearchInput" />
			<div id="clearPBSearch"></div>
			</div>
		</div>
	</div>

{pages_by_id ids=","|implode:$content.subPageIndex assign=pages}
{foreach from=$pages item=item key=key name=loop1}
	<div class="pbItem {if $editable.Button_Text!=""}withBottomSpace{/if}" data-keywords="{$item.keywords}"><div class="clearfix">{$item.page_preview}</div>{if $editable.Button_Text!=""}<p class="Button_Large"><a href="{$item.fullUrl}">{$editable.Button_Text|strip_tags}</a></p>{/if}</div>
{/foreach}

</div>
