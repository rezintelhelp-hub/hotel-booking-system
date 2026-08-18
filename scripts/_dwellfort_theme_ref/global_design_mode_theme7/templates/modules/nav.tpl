<div data-position="{$pos}" class="{$pos} module {if $middle_logo}with-middle-logo{/if} {if !$skipclearfix}clearfix{/if} nav {if $logo}logo-{$logo}{/if} {if $search}search-{$search}{/if} {if $basket}basket-{$basket}{/if}  {if $align}align-{$align}{/if} {if !$width}{if $valign}valign-{$valign}{if $valign} valign{/if}{/if}{/if} {if $clear}clear-{$clear}{/if} {if $style}style-{$style}{/if} {if $width}width width-{$width} width-valign-{$valign}{/if}">
	<ul class="flexibreak-container contains-text {if !$skipclearfix&&$style==""}clearfix{/if}">
		{if $logo=="first"}
		<li id="nav-logo"><a href=""><img src="/graphics/logo.png"></a></li>
		{/if}

		{if $search=="first"}
		<li id="nav-search" class="search-module nav-search nav-search-first nav-search-style-{$search_style} display-popdown-widget">
	<form action="/actions/searchForward/">
		<input type="hidden" name="language" value="{$content.language}"/>
		<input class="search-input" type="search" maxlength="60" title="{$langs.Search}" name="string" value="" required="true" placeholder="{$langs.Search}" />
		<input type="submit" value="{$langs.Search}" class="search-form-hide-with-js"/>
		<p class="submit_form"><a href="#">{$langs.Search}</a></p>
	 </form>
	{*		<a href="#navSearch" data-target="search-form-popdown">{if $search_style!="icon"}{$langs.Search}{/if}</a>*}
		</li>
		{/if}
		
		{if $basket=="first"}
		<li id="nav-basket"><a href="/{$content.basket_link}">{$langs.Checkout} <span class="chekoutcount"></span></a></li>
		{/if}
		

		{assign var=half value=$mainNav|@count}
		{assign var=half value=$half/2}
		{foreach from=$mainNav item=item key=key name=loop1}

		{if
			($split=="left" && $smarty.foreach.loop1.iteration <= $half) ||
			($split=="right" && $smarty.foreach.loop1.iteration > $half) ||
			(!$split||$split=="")
		}

		{if $smarty.foreach.loop1.iteration > $half && !$nologoyet && $middle_logo}
			<li id="nav-logo" {if $theme_vars_main_logo_fixed}data-logo-fixed-img="/images/themegraphics/{$theme_vars_main_logo_fixed}"{/if}  {if $middle_logo_fixed}data-logo-fixed-img="/images/themegraphics/{$middle_logo_fixed}" data-logo-normal-img="{if $middle_logo}/images/themegraphics/{$middle_logo}{else}{if $theme_vars_main_logo}/images/themegraphics/{$theme_vars_main_logo}{else}/graphics/logo.png{/if}{/if}"{/if} class="{if $middle_logo_fixed||$theme_vars_main_logo_fixed}with-fixed-logo-version{/if}">
				<a href="{if $middle_link!=""}{$middle_link}{else}/{/if}" {if $middle_link!=""}target="_blank"{/if}><img src="{if $middle_logo}{base64img img="/images/themegraphics/`$middle_logo`"}{else}{if $theme_vars_main_logo}{base64img img="/images/themegraphics/`$theme_vars_main_logo`"}{else}{base64img img="/graphics/logo.png"}{/if}{/if}" alt="{$sitetitle}" 
		width="{if $middle_logo}{imgwidth img="/images/themegraphics/`$middle_logo`" retina=$middle_logo_retina}{else}{if $theme_vars_main_logo}{imgwidth img="/images/themegraphics/`$theme_vars_main_logo`" retina=$theme_vars_main_logo_retina}{else}{imgwidth img="/graphics/logo.png" retina=1}{/if}{/if}"
		height="{if $middle_logo}{imgheight img="/images/themegraphics/`$middle_logo`" retina=$middle_retina}{else}{if $theme_vars_main_logo}{imgheight img="/images/themegraphics/`$theme_vars_main_logo`" retina=$theme_vars_main_logo_retina}{else}{imgheight img="/graphics/logo.png" retina=1}{/if}{/if}"/></a>
</li>
			{assign var=nologoyet value=true}
		{/if}
		<li class="{if $item.url == $content.url || $item.id == $content.parent || $item.id == $content.topParent}current{assign var=current value="true"}{/if} {if $item.subs}has-subs{/if} {if $smarty.foreach.loop1.iteration>$half}second-half{/if} {if $theme_vars_enabled_page_preview_dropdown && $item.page_preview!=""}show-preview{/if}" data-page-id="{$item.id}"><a href="{if $item.homepage == "yes"}/{elseif $item.custom_url!=""}{$item.custom_url}{else}/{$item.url}/{/if}" title="{$item.longtitle}" {if $item.newWindow}target="_blank"{/if}>{if $item.subs}<span>{/if}{$item.title|replace:"Media Page":"Media"}{if $item.subs}</span>{/if}</a>
			{if !$theme_vars_enabled_page_preview_dropdown}{include file="nav/drop-down-menu.tpl" subs=$item.subs}{/if}</li>
		{/if}
		{/foreach}

		{if $basket=="last"}
		<li id="nav-basket"><a href="/{$content.basket_link}">{$langs.Checkout} <span class="chekoutcount"></span></a></li>
		{/if}

		{if $search=="last"}
		<li id="nav-search" class="nav-search nav-search-last nav-search-style-{$search_style} display-popdown-widget">
			<a data-target="search-form-popdown" href="#navSearch">{if $search_style!="icon"}{$langs.Search}{/if}</a>
		</li>
		{/if}

		{if $logo=="last"}
		<li id="nav-logo"><a href=""><img src="/graphics/logo.png"></a></li>
		{/if}
		
	</ul>
</div>

		
		{if $theme_vars_enabled_page_preview_dropdown}
			{foreach from=$mainNav item=item key=key name=loop1}

			{if
				($split=="left" && $smarty.foreach.loop1.iteration <= $half) ||
				($split=="right" && $smarty.foreach.loop1.iteration > $half) ||
				(!$split||$split=="")
			}
		
				
				{if $item.page_preview}		
					<div class="page-preview" id="page-preview-id-{$item.id}">
						<div class="page-preview-inner">
							{$item.page_preview}
						</div>
					</div>
				{/if}
			

			{/if}
			{/foreach}
		{/if}

{*

	How to use this module:

	Add a code block like this to your ~/templates/main.tpl inside a section.row element:

		{include file=modules/social_links.tpl
			property=value
			...
		}

	You can use the following properties and values:
	align: left (default)|center|right|justify
	valign: top (default)|bottom|middle
	clear: none (default)|left|right
	width: auto (default) | one_half | three_quarters | four_fifths | three_fifths | two_fifths | one_fifth | one_quarter | two_thirds | one_third
	style:	none (default) (if align:justify is used, items fill available space by applying equal padding ot each item. If align left, right or center padding is taken from CSS and surrounding space will remain empty)
			space (only works with align:justify, width is filled by equally distributing the space between the items. Padding of each item remains as set by CSS.)
			equal (only works with align:justify, width is filled by setting each item to the same width to use all the space available)
	logo: 	none (default)
			left (first item in menu is logo)
			right (last item in menu is logo)
	split:	none (default)
			left (shows first half of items only)
			right (shows second half of items only)
	search:	none (default)
			first (first item of menu is search)
			last (last item of menu is search)
	basket: none (default)
			first (first item of menu is basket link)
			last (last item of menu is basket link)


*}
