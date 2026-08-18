{*
	Default Gallery Style (Lightbox)
*}
{if $style==""||$style=="showcaptions"}
	<div id="galId{$galleryId}gallery" class="galleryWrapper magic-heights-wrap">

		{foreach from=$gallery item=item key=key name=loop1}

			<div class='galleryThumb magic-heights'>
				{if $style=="showcaptions"}
				<div class="showcaptionwrap">
				{/if}
				<div class='thumbInner magic-heights-inner'>
					<div class='thumbInnerInner'>
						<a href="{if $item.external}{$item.external_path}{else}/images/galleries/{$item.filename}?width=800&amp;height=600&amp;shrink=true&g={$galleryId}{/if}" data-retina="{if $item.external}{$item.external_path}{else}/images/galleries/{$item.filename}?width=1600&amp;height=1200&amp;shrink=true&g={$galleryId}{/if}" class='responsive_lightbox {if $item.external}external_image{/if} galleryitem{$item.id}' title="{$item.caption|htmlspecialchars}">
							<img srcset="{if $item.external}{$item.external_path}{else}/images/galleries/{$item.filename}?width=500&amp;height=500&amp;shrink=true&g={$galleryId}{/if} 2x" src="{if $item.external}{$item.external_path}{else}/images/galleries/{$item.filename}?width=250&amp;height=250&amp;shrink=true&g={$galleryId}{/if}" alt="{$item.caption|htmlspecialchars}"/>
						</a>
					</div>
				</div>
				{if $style=="showcaptions"}
				</div>
				<div class="gallery_caption magic-heights-inner-2">
				<a href="/images/galleries/{$item.filename}?width=800&amp;height=600&amp;shrink=true&g={$galleryId}" title="{$item.caption|htmlspecialchars}">
				{$item.caption}
				</a>
				</div>
				{/if}
			</div>

		{/foreach}
	</div>
	<div class="clear"><!-- --></div>
{/if}

{*
	Montage Gallery Style
*}

{if $style=="montage"}
	<div class="clearfix montageSlideshow imagesInMontage{if $gallery|@count>4}4{else}{$gallery|@count}{/if}" id="galId{$galleryId}gallery">
	{if $gallery|@count==1}
		{foreach from=$gallery item=item key=key name=loop1}
			<div class='item{$smarty.foreach.loop1.iteration} montage-pic'>
				<img src="/images/galleries/{$item.filename}?width=1400&amp;height=auto&g={$galleryId}" alt="{$item.caption|htmlspecialchars}"/>
			</div>
		{/foreach}
	{/if}
	{if $gallery|@count==2}
		{foreach from=$gallery item=item key=key name=loop1}
			{if $smarty.foreach.loop1.iteration==1}
				<div class='item{$smarty.foreach.loop1.iteration} montage-pic'>
					<img src="/images/galleries/{$item.filename}?width=460&amp;height=460&shrink=false&g={$galleryId}" alt="{$item.caption|htmlspecialchars}"/>
				</div>
			{/if}
			{if $smarty.foreach.loop1.iteration==2}
				<div class='item{$smarty.foreach.loop1.iteration} montage-pic'>
					<img src="/images/galleries/{$item.filename}?width=610&amp;height=460&shrink=false&g={$galleryId}" alt="{$item.caption|htmlspecialchars}"/>
				</div>
			{/if}
		{/foreach}
	{/if}
	{if $gallery|@count==3}
		{foreach from=$gallery item=item key=key name=loop1}
			{if $smarty.foreach.loop1.iteration==1}
				<div class='item{$smarty.foreach.loop1.iteration} montage-pic'>
					<img src="/images/galleries/{$item.filename}?width=652&amp;height=652&shrink=false&g={$galleryId}" alt="{$item.caption|htmlspecialchars}"/>
				</div>
			{/if}
			{if $smarty.foreach.loop1.iteration==2}
				<div class='item{$smarty.foreach.loop1.iteration} montage-pic'>
					<img src="/images/galleries/{$item.filename}?width=406&amp;height=304&shrink=false&g={$galleryId}" alt="{$item.caption|htmlspecialchars}"/>
				</div>
			{/if}
			{if $smarty.foreach.loop1.iteration==3}
				<div class='item{$smarty.foreach.loop1.iteration} montage-pic'>
					<img src="/images/galleries/{$item.filename}?width=406&amp;height=304&shrink=false&g={$galleryId}" alt="{$item.caption|htmlspecialchars}"/>
				</div>
			{/if}
		{/foreach}
	{/if}
	{if $gallery|@count==4}
		{foreach from=$gallery item=item key=key name=loop1}
			{if $smarty.foreach.loop1.iteration==1}
				<div class='item{$smarty.foreach.loop1.iteration} montage-pic'>
					<img src="/images/galleries/{$item.filename}?width=460&amp;height=460&shrink=false&g={$galleryId}" alt="{$item.caption|htmlspecialchars}"/>
				</div>
			{/if}
			{if $smarty.foreach.loop1.iteration==2}
				<div class='item{$smarty.foreach.loop1.iteration} montage-pic'>
					<img src="/images/galleries/{$item.filename}?width=610&amp;height=460&shrink=false&g={$galleryId}" alt="{$item.caption|htmlspecialchars}"/>
				</div>
			{/if}
			{if $smarty.foreach.loop1.iteration==3}
				<div class='item{$smarty.foreach.loop1.iteration} for-margin montage-pic'>
					<img src="/images/galleries/{$item.filename}?width=610&amp;height=460&shrink=false&g={$galleryId}" alt="{$item.caption|htmlspecialchars}"/>
				</div>
			{/if}
			{if $smarty.foreach.loop1.iteration==4}
				<div class='item{$smarty.foreach.loop1.iteration} for-margin montage-pic'>
					<img src="/images/galleries/{$item.filename}?width=460&amp;height=460&shrink=false&g={$galleryId}" alt="{$item.caption|htmlspecialchars}"/>
				</div>
			{/if}
		{/foreach}
	{/if}
	{if $gallery|@count>4}
	{foreach from=$gallery item=item key=key name=loop1}

			{if $smarty.foreach.loop1.iteration % 4 == 1}
				<div class='item1 {if $smarty.foreach.loop1.iteration==$smarty.foreach.loop1.total}last{/if} {if $smarty.foreach.loop1.iteration>2}for-margin{/if} montage-pic'>
					<img src="/images/galleries/{$item.filename}?width={if $smarty.foreach.loop1.iteration==$smarty.foreach.loop1.total}1400{else}460{/if}&amp;height=460&shrink=false&g={$galleryId}" alt="{$item.caption|htmlspecialchars}"/>
				</div>
			{/if}
			{if $smarty.foreach.loop1.iteration % 4 == 2}
			<div class='item2 {if $smarty.foreach.loop1.iteration>2}for-margin{/if} montage-pic'>
				<img src="/images/galleries/{$item.filename}?width=610&amp;height=460&shrink=false&g={$galleryId}" alt="{$item.caption|htmlspecialchars}"/>
			</div>
			{/if}
			{if $smarty.foreach.loop1.iteration % 4 == 3}
			<div class='item3 {if $smarty.foreach.loop1.iteration==$smarty.foreach.loop1.total}last{/if} {if $smarty.foreach.loop1.iteration>2}for-margin{/if} montage-pic'>
				<img src="/images/galleries/{$item.filename}?width={if $smarty.foreach.loop1.iteration==$smarty.foreach.loop1.total}1400{else}610{/if}&amp;height=460&shrink=false&g={$galleryId}" alt="{$item.caption|htmlspecialchars}"/>
			</div>
			{/if}
			{if $smarty.foreach.loop1.iteration % 4 == 0}
				<div class='item4 {if $smarty.foreach.loop1.iteration>2}for-margin{/if} montage-pic'>
					<img src="/images/galleries/{$item.filename}?width=460&amp;height=460&shrink=false&g={$galleryId}" alt="{$item.caption|htmlspecialchars}"/>
				</div>
			{/if}

	{/foreach}
	{/if}
	</div>
{/if}

{*
	Slideshow Single
*}

{if $style=="single_slideshow"||$style=="single_slideshow_crop"}
	<div class="owl-slideshow-single" id="galId{$galleryId}gallery" data-speed="{$theme_vars_slide_autoscroll_speed}000">
		{foreach from=$gallery item=item key=key name=loop1}
			<div class="item">
			<img src="/images/galleries/{$item.filename}?width=1400&amp;height={if $style=="single_slideshow_crop"}700&shrink=false{else}auto{/if}&g={$galleryId}" srcset="/images/galleries/{$item.filename}?width=2800&amp;height={if $style=="single_slides        how_crop"}1400&shrink=false{else}auto{/if}&g={$galleryId} 2x" alt="{$item.caption|htmlspecialchars}" />
			</div>
		{/foreach}
	</div>
{/if}

{*
	Slideshow Multi
*}

{if $style=="multi_slideshow"}
	<div class="owl-slideshow-multi" id="galId{$galleryId}gallery" data-speed="{$theme_vars_slide_autoscroll_speed}000">
		{foreach from=$gallery item=item key=key name=loop1}
			<div class="item">
			<img src="/images/galleries/{$item.filename}?width=550&amp;height=400&amp;shrink=false&g={$galleryId}" alt="{$item.caption|htmlspecialchars}" />
			</div>
		{/foreach}
	</div>
{/if}


{*
	Gallery Thumbs
*}

{if $style=="thumbs_gallery"||$style=="thumbs_gallery_landscape"||$style=="thumbs_gallery_crop"||$style=="thumbs_gallery_landscape_crop"}
	<div class="galleryWithThumbs" id="galId{$galleryId}gallery">
		<div class="enlarge">

		</div>
		<div class="owl-gallery-thumbs">
			{foreach from=$gallery item=item key=key name=loop1}

				<a class="item {if $item.external}external_image{/if} galleryitem{$item.id}" href="{if $item.external}{$item.external_path}{else}/images/galleries/{$item.filename}?width=1000&amp;height={if $style=="thumbs_gallery_crop"||$style=="thumbs_gallery_landscape_crop"}700&shrink=false{else}auto{/if}&g={$galleryId}{/if}">
				<img src="{if $item.external}{$item.external_path}{else}/images/galleries/{$item.filename}?width=220&amp;height={if $style=="thumbs_gallery_landscape"||$style=="thumbs_gallery_landscape_crop"}165{else}220{/if}&amp;shrink=false&g={$galleryId}{/if}" alt="{$item.caption|htmlspecialchars}" />

				</a>
			{/foreach}
		</div>
	</div>
{/if}

{* Folder of files *}
{if $style=="folder_list"||$style=="folder_grid"}
<div class="folder-filter" data-gallery-id="{$galleryId}">
<span class="folder-search">Search: <input type="search" /></span> <span class="folder-sort-by"><span class="folder-filter-label">Sort by:</span> <a href="#" class="folder-sort-name current" data-by="title">Name</a> <a href="#" class="folder-sort-created" data-by="data-created">Created date</a> <a href="#" class="folder-sort-modified" data-by="data-modified">Modified date</a>  </span><span class="folder-sort-direction"><span class="folder-filter-label">Direction:</span> <a href="#" class="folder-sort-asc current" data-direction="asc">Ascending</a> <a href="#" class='folder-sort-desc' data-direction="desc">Descending</a></span>
</div>
{/if}
{if $style=="folder_grid"}
<div class="gallery-folder-{$galleryId} clearfix folder folder-style-grid">
	{if !$gallery}
		<p class="Icon_Alert">There are no files to display</p>
	{/if}
	{foreach from=$gallery item=item key=key name=loop1}
		<a class="folder-item folder-icon-{$item.ext} folder-item-{$item.id}" data-for-search="{$item.filename|strtolower}" data-modified="{$item.modified_date}" data-created="{$item.created_date}" title="{$item.filename} | Created: {$item.created_date|date_format} | Modified: {$item.modified_date|date_format}" target="_blank" href="{if $item.external}{$item.external_path}{else}/downloads/{$item.filename}{/if}">
			{$item.filename|truncate:50:" &hellip;":false:true}
		</a>
	{/foreach}
</div>
{/if}

{* Folder of files *}
{if $style=="folder_list"}
<div class="gallery-folder-{$galleryId} clearfix folder folder-style-list">
	{if !$gallery}
		<p class="Icon_Alert">There are no files to display</p>
	{/if}
	{foreach from=$gallery item=item key=key name=loop1}
		<a class="folder-item styleBox folder-icon-{$item.ext} folder-item-{$item.id}" data-for-search="{$item.filename|strtolower}" data-modified="{$item.modified_date}" data-created="{$item.created_date}" target="_blank" title="{$item.filename} | Created: {$item.created_date|date_format} | Modified: {$item.modified_date|date_format}" href="{if $item.external}{$item.external_path}{else}/downloads/{$item.filename}{/if}">
			{$item.filename}
		</a>
	{/foreach}
</div>
{/if}
