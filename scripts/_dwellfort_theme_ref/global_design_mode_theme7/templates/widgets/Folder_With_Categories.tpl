{* @@@
{
	"widget_info":{
		"title":"Folder With Categories"
		,"title_info":"Enter a name for this instance of the folder widget."
		,"category":"media"
	},
	"meta_data":[{
		"name":"Show files with tag(s)"
		,"type":"imagetagmulti"
		,"var":"images"
		,"with_quick_add":"true"
	},{
		"name":"Sanitise filenames"
		,"type": "tick"
		,"var": "sani"
		,"default":"0"
	},{
		"name":"Category tags"
		,"type":"imagetagmulti"
		,"var":"cats"
		,"with_quick_add":"false"
	},{
		"name":"Style"
		,"type": "dropdown"
		,"var": "style"
		,"default":"grid"
		,"options":[
			{
				"label":"Grid"
				,"value":"grid"
			},
			{
				"label":"List"
				,"value":"list"
			}
		]
	}],
	"inner_templates":{
	}
}
@@@ *}

{storage_tags assign=cats langs=$langs assign_flat=flat_cats only_include_in_flat=$metadata.cats}
{if $smarty.request.cat&&$metadata.instance_id==$smarty.request.gal}
{storage_by_tag tags=$metadata.images assign="gallery" additionaltags=$smarty.request.cat}
{else}
{storage_by_tag tags=$metadata.images assign="gallery"}
{/if}

{* Folder of files *}
<div class="folder-filter" data-gallery-id="{$metadata.instance_id}">
<span class="folder-search">Search: <input type="search" /></span> <span class="folder-sort-by"><span class="folder-filter-label">Sort by:</span> <a href="#" class="folder-sort-name current" data-by="title">Name</a> <a href="#" class="folder-sort-created" data-by="data-created">Created date</a> <a href="#" class="folder-sort-modified" data-by="data-modified">Modified date</a>  </span><span class="folder-sort-direction"><span class="folder-filter-label">Direction:</span> <a href="#" class="folder-sort-asc current" data-direction="asc">Ascending</a> <a href="#" class='folder-sort-desc' data-direction="desc">Descending</a></span>
</div>
{if $flat_cats}<div class="folder-cat"><span>Categories: </span>
<a href="?" {if !$smarty.request.cat||($smarty.request.gal!=$metadata.instance_id)}class="current"{/if}>All</a>
{foreach from=$flat_cats item=all name=loop2}
<a href="{$content.fullUrl}?gal={$metadata.instance_id}&cat={$all.id|css_safe}" class="{if $smarty.request.cat==$all.id&&$smarty.request.gal==$metadata.instance_id}current{/if}">{$all.name}</a>
{/foreach}
{/if}
</div>
{if $metadata.style=="grid"}
<div class="gallery-folder-{$metadata.instance_id} clearfix folder folder-style-grid">
	{if !$gallery}
		<p class="Icon_Alert">There are no files to display</p>
	{/if}
	{foreach from=$gallery item=item key=key name=loop1}
		<a class="folder-item folder-icon-{$item.ext} folder-item-{$item.id}" data-for-search="{$item.filename|strtolower}" data-modified="{$item.last_modified}" data-created="{$item.created}" title="{$item.filename} | Created: {$item.created|date_format} | Modified: {$item.last_modified|date_format}" target="_blank" href="{if $item.external}{$item.external_path}{else}/downloads/{$item.filename}{/if}">
		{if $metadata.sani}
			{$item.filename|truncate:50:" &hellip;":false:true}
		{else}
			{$item.filename|replace:".`$item.ext`":""|replace:"_":" "|replace:"-":" "|truncate:50:" &hellip;":false:true}
		{/if}
		</a>
	{/foreach}
</div>
{/if}

{* Folder of files *}
{if $metadata.style=="list"}
<div class="gallery-folder-{$metadata.instance_id} clearfix folder folder-style-list">
	{if !$gallery}
		<p class="Icon_Alert">There are no files to display</p>
	{/if}
	{foreach from=$gallery item=item key=key name=loop1}
		<a class="folder-item styleBox folder-icon-{$item.ext} folder-item-{$item.id}" data-for-search="{$item.filename|strtolower}" data-modified="{$item.last_modified}" data-created="{$item.created}" target="_blank" title="{$item.filename} | Created: {$item.created|date_format} | Modified: {$item.last_modified|date_format}" href="{if $item.external}{$item.external_path}{else}/downloads/{$item.filename}{/if}">
			{$item.filename}
		</a>
	{/foreach}
</div>
{/if}
