{* 
	Default Gallery Style (Lightbox) 
*}
{if $style==""}
	<div id="galId{$galleryId}gallery" class="galleryWrapper">
		
		{foreach from=$gallery item=item key=key name=loop1}
		
			<div class='galleryThumb'>
				<div class='thumbInner'>
					<div class='thumbInnerInner'>
						<a href="/images/galleries/{$item.filename}?width=800&amp;height=600&amp;shrink=true" class='responsive_lightbox' title="{$item.caption}">
							<img src="/images/galleries/{$item.filename}?width=150&amp;height=150&amp;shrink=true" alt="{$item.caption}"/>
						</a>
					</div>
				</div>
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
				<img src="/images/galleries/{$item.filename}?width=1100&amp;height=auto" alt="{$item.caption}"/>
			</div>
		{/foreach}
	{/if}
	{if $gallery|@count==2}
		{foreach from=$gallery item=item key=key name=loop1}
			{if $smarty.foreach.loop1.iteration==1}
				<div class='item{$smarty.foreach.loop1.iteration} montage-pic'>
					<img src="/images/galleries/{$item.filename}?width=460&amp;height=460&shrink=false" alt="{$item.caption}"/>
				</div>
			{/if}
			{if $smarty.foreach.loop1.iteration==2}
				<div class='item{$smarty.foreach.loop1.iteration} montage-pic'>
					<img src="/images/galleries/{$item.filename}?width=610&amp;height=460&shrink=false" alt="{$item.caption}"/>
				</div>		
			{/if}
		{/foreach}
	{/if}
	{if $gallery|@count==3}
		{foreach from=$gallery item=item key=key name=loop1}
			{if $smarty.foreach.loop1.iteration==1}
				<div class='item{$smarty.foreach.loop1.iteration} montage-pic'>
					<img src="/images/galleries/{$item.filename}?width=652&amp;height=652&shrink=false" alt="{$item.caption}"/>
				</div>
			{/if}
			{if $smarty.foreach.loop1.iteration==2}
				<div class='item{$smarty.foreach.loop1.iteration} montage-pic'>
					<img src="/images/galleries/{$item.filename}?width=406&amp;height=304&shrink=false" alt="{$item.caption}"/>
				</div>		
			{/if}
			{if $smarty.foreach.loop1.iteration==3}
				<div class='item{$smarty.foreach.loop1.iteration} montage-pic'>
					<img src="/images/galleries/{$item.filename}?width=406&amp;height=304&shrink=false" alt="{$item.caption}"/>
				</div>		
			{/if}
		{/foreach}
	{/if}
	{if $gallery|@count==4}
		{foreach from=$gallery item=item key=key name=loop1}
			{if $smarty.foreach.loop1.iteration==1}
				<div class='item{$smarty.foreach.loop1.iteration} montage-pic'>
					<img src="/images/galleries/{$item.filename}?width=460&amp;height=460&shrink=false" alt="{$item.caption}"/>
				</div>
			{/if}
			{if $smarty.foreach.loop1.iteration==2}
				<div class='item{$smarty.foreach.loop1.iteration} montage-pic'>
					<img src="/images/galleries/{$item.filename}?width=610&amp;height=460&shrink=false" alt="{$item.caption}"/>
				</div>		
			{/if}
			{if $smarty.foreach.loop1.iteration==3}
				<div class='item{$smarty.foreach.loop1.iteration} for-margin montage-pic'>
					<img src="/images/galleries/{$item.filename}?width=610&amp;height=460&shrink=false" alt="{$item.caption}"/>
				</div>		
			{/if}
			{if $smarty.foreach.loop1.iteration==4}
				<div class='item{$smarty.foreach.loop1.iteration} for-margin montage-pic'>
					<img src="/images/galleries/{$item.filename}?width=460&amp;height=460&shrink=false" alt="{$item.caption}"/>
				</div>
			{/if}
		{/foreach}
	{/if}
	{if $gallery|@count>4}
	{foreach from=$gallery item=item key=key name=loop1}
			
			{if $smarty.foreach.loop1.iteration % 4 == 1}
				<div class='item1 {if $smarty.foreach.loop1.iteration==$smarty.foreach.loop1.total}last{/if} {if $smarty.foreach.loop1.iteration>2}for-margin{/if} montage-pic'>
					<img src="/images/galleries/{$item.filename}?width={if $smarty.foreach.loop1.iteration==$smarty.foreach.loop1.total}1100{else}460{/if}&amp;height=460&shrink=false" alt="{$item.caption}"/>
				</div>	
			{/if}
			{if $smarty.foreach.loop1.iteration % 4 == 2}
			<div class='item2 {if $smarty.foreach.loop1.iteration>2}for-margin{/if} montage-pic'>
				<img src="/images/galleries/{$item.filename}?width=610&amp;height=460&shrink=false" alt="{$item.caption}"/>
			</div>
			{/if}
			{if $smarty.foreach.loop1.iteration % 4 == 3}
			<div class='item3 {if $smarty.foreach.loop1.iteration==$smarty.foreach.loop1.total}last{/if} {if $smarty.foreach.loop1.iteration>2}for-margin{/if} montage-pic'>
				<img src="/images/galleries/{$item.filename}?width={if $smarty.foreach.loop1.iteration==$smarty.foreach.loop1.total}1100{else}610{/if}&amp;height=460&shrink=false" alt="{$item.caption}"/>
			</div>
			{/if}
			{if $smarty.foreach.loop1.iteration % 4 == 0}
				<div class='item4 {if $smarty.foreach.loop1.iteration>2}for-margin{/if} montage-pic'>
					<img src="/images/galleries/{$item.filename}?width=460&amp;height=460&shrink=false" alt="{$item.caption}"/>
				</div>
			{/if}

	{/foreach}
	{/if}
	</div>
{/if}

{* 
	Slideshow Single
*}

{if $style=="single_slideshow"}
	<div class="owl-slideshow-single" id="galId{$galleryId}gallery">
		{foreach from=$gallery item=item key=key name=loop1}
			<div class="item">
			<img src="/images/galleries/{$item.filename}?width=1100&amp;height=auto" alt="{$item.caption}" />
			</div>
		{/foreach}
	</div>
{/if}

{* 
	Slideshow Multi
*}

{if $style=="multi_slideshow"}
	<div class="owl-slideshow-multi" id="galId{$galleryId}gallery">
		{foreach from=$gallery item=item key=key name=loop1}
			<div class="item">
			<img src="/images/galleries/{$item.filename}?width=550&amp;height=400&amp;shrink=false" alt="{$item.caption}" />
			</div>
		{/foreach}
	</div>
{/if}


{* 
	Gallery Thumbs
*}

{if $style=="thumbs_gallery"}
	<div class="galleryWithThumbs" id="galId{$galleryId}gallery">
		<div class="enlarge">

		</div>
		<div class="owl-gallery-thumbs">
			{foreach from=$gallery item=item key=key name=loop1}
				<a class="item" href="/images/galleries/{$item.filename}?width=1100&amp;height=auto">
				<img src="/images/galleries/{$item.filename}?width=220&amp;height=220&amp;shrink=false" alt="{$item.caption}" />
				</a>
			{/foreach}
		</div>
	</div>
{/if}
