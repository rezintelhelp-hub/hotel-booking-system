{* @@@
{
	"widget_info":{
		"title":"Recent Pages Feed"
		,"title_info":"Enter a name for this instance of the Recent pages feed. This is just used for reference."
		,"category":"setup"
		,"works_in_email":"both"
		,"include_js":"owl.carousel.min.js"
	},
	"meta_data":[{
		"name":"Tag"
		,"type": "pagetagmulti"
		,"var": "tags"
	},{
		"name":"Number of pages to show"
		,"type": "text"
		,"info":"Enter the number of pages to show"
		,"default":"3"
		,"var": "toshow"
	},{
		"name":"Show image"
		,"type": "tick"
		,"default":"1"
		,"var": "showimage"
	},{
		"name":"Show date"
		,"type": "tick"
		,"default":"1"
		,"var": "showdate"
	},{
		"name":"Hide future dated articles"
		,"type": "tick"
		,"var": "hidefuture"
		,"default":0
	},{
	     "name":"Date Format"
             ,"type":"text"
             ,"info":"Display format for dates"
             ,"var":"date_format"
             ,"design":"true"
             ,"default":"%A, %B %e, %Y"
         },{
		"name":"Show summary"
		,"type": "tick"
		,"default":"1"
		,"var": "showsummary"
	},{
		"name":"Show button"
		,"type": "tick"
		,"default":"1"
		,"var": "showbutton"
	},{
		"name":"Sort by date"
		,"type": "tick"
		,"default":"1"
		,"var": "sort"
	},{
		"name":"Blog mode"
		,"type": "tick"
		,"default":"1"
		,"var": "blogmode"
	},{
		"name":"Omit first item"
		,"type": "tick"
		,"default":"0"
		,"var": "omitfirst"
	},{
		"name":"Grid mode"
		,"type": "tick"
		,"default":"0"
		,"var": "grid"
		,"design": "true"
	},{
		"name":"Image width"
		,"type": "text"
		,"info":"Enter a width for the images"
		,"default":"400"
		,"var": "width"
		,"design":"true"
	},{
		"name":"Image height"
		,"type": "text"
		,"info":"Enter a height for the images"
		,"default":"300"
		,"var": "height"
		,"design":"true"
	},{
		"name":"Retina support"
		,"type": "tick"
		,"var": "retina"
		,"default":"1"
		,"design":"true"
	},{
		"name":"Force index page"
		,"info":"In some situations the pages widget won't generate the full page address. If this happens you can enter the first part of the page addresses here."
		,"type": "text"
		,"default":""
		,"var": "index"
		,"design":"true"
	},{
		"name":"Carousel"
		,"type": "tick"
		,"default":"0"
		,"var": "scroll"
		,"design":"true"
	},{
		"name":"Autoscroll speed"
		,"type": "text"
		,"info":"Enter a number in seconds for the autoscroll speed. You only need to configure this on the first of a set of consecutive widgets. Use 0 for no autoscrolling."
		,"var": "speed"
		,"default":"3"
	},{
		"name":"Show side buttons"
		,"type": "tick"
		,"var": "showbuttons"
		,"default":"1"
	},{
		"name":"Show pagination dots"
		,"type": "tick"
		,"var": "showdots"
		,"default":"1"
	}]
}
@@@ *}
{assign var="index" value=$metadata.index}
{if $metadata.index|substr:0:1=="/"}
{assign var="index" value=$metadata.index|substr:1}
{/if}
{if $index|substr:-1:1!="/"&&$index!=""}
{assign var="index" value="`$index`/"}
{/if}
{if $metadata.hidefuture}
{assign var=onlyhistorical value=true}
{else}
{assign var=onlyhistorical value=false}
{/if}
{if $metadata.sort}
{if $metadata.blogmode}
{pages_by_tag tags=$metadata.tags assign=pages limit=$metadata.toshow sortbymeta=date onlyhistorical=$onlyhistorical}
{else}
{pages_by_tag tags=$metadata.tags assign=pages limit=$metadata.toshow sortbyupdated=true onlyhistorical=$onlyhistorical}
{/if}
{else}
{pages_by_tag tags=$metadata.tags assign=pages limit=$metadata.toshow direction='ASC' onlyhistorical=$onlyhistorical}
{/if}
<div class="recent-pages-feed {if $metadata.scroll}{if $metadata.showdots}with_dots{/if} {if $metadata.showbuttons}with_side_buttons{/if} recent-pages-scroll{else} magic-heights-wrap{if $metadata.grid} grid-mode{/if}{/if}"
{if $metadata.scroll}data-speed="{$metadata.speed}000"{/if}
>
{foreach from=$pages item=page name=pages}
{if $smarty.foreach.pages.first&&$metadata.omitfirst}
{continue}
{/if}
{if !$content.sentAsEmail}
<div class=" styleBox recent-pages-feed-item {if !$metadata.scroll}magic-heights{/if} recent-pages-feed-item-{$smarty.foreach.pages.iteration} clearfix align-image-text 
	 {if $smarty.foreach.pages.iteration % 2 == 1}odd{/if} {if $smarty.foreach.pages.iteration % 3 == 2}middle-of-three{/if}
	{foreach from=$page.tags_array item=tag name=loop1}
	tag-{$tag|css_safe}
	{/foreach}
">
{/if}
{assign var = retw value=$metadata.width*2}
{if $metadata.width=="auto"}
{assign var = retw value=auto}
{/if}
{assign var = reth value=$metadata.height*2}
{if $metadata.height=="auto"}
{assign var = reth value=auto}
{/if}
{capture assign="path"}
{if $page.pic_url==""||$page.pic_url=="/images"}{if $theme_vars_placeholder_image}/images/themegraphics/{$theme_vars_placeholder_image}{else}/graphics/placeholder.jpg{/if}{else}{$page.pic_url}{/if}{if $metadata.height!="auto"||$metadata.width!="auto"}?width={$metadata.width}&height={$metadata.height}&shrink=false{/if}
{/capture}
{assign var="link" value=$page.url_str_full}
{if $link|substr:0:1=="/"}
{assign var="link" value=$link|substr:1}
{/if}

{if $content.sentAsEmail}
<table width="100%" class="colblock">
	<tr>
		{if $metadata.showimage}<td width="32.3%" valign="top">
	<a href="/{$index}{$link}"><img src='{$path}' {if $metadata.retina}srcset="{if $page.pic_url==""||$page.pic_url=="/images"}{if $theme_vars_placeholder_image}/images/themegraphics/{$theme_vars_placeholder_image}{else}/graphics/placeholder.jpg{/if}{else}{$page.pic_url}{/if}{if $metadata.width!='auto'||$metadata.height!='auto'}?width={$retw}&height={$reth}&shrink=false 2x{/if}"{/if} {get_image_sizes path=$path} {$image_sizes} /></a>
		&nbsp;
		</td>
		<td width="2%" class="colblock-divider">
		&nbsp;
		</td>{/if}
		<td width="{if $metadata.showimage}65.6%{/if}" valign="top">
		<h4><a href="/{$index}{$link}">{$page.pagetitle}</a></h4>
		{if $metadata.showdate}<p class="blog_date"><span class="recent-pages-date">{$page.meta.date|date_format:$metadata.date_format}</span></p>{/if}
		{if $metadata.showsummary}{if $page.meta.ss_page_desc!=""}<p>{$page.meta.ss_page_desc}</p>{else}
		{assign var=p value=$page.content|strip_tags_exclude:"<p>"}
		{assign var=p value="<p"|explode:$p}
		{assign var=p value=">"|explode:$p[1]}
		{assign var=p value="<"|explode:$p[1]}
		{assign var=p value=$p[0]}
		{$p}
		{/if}{/if}
		{if $metadata.showbutton}
		<p class="Button_Small"><a href="/{$index}{$link}">Read more</a></p>
		{/if}
		&nbsp;
		</td>
	</tr>
</table>
{else}
	<div class="clearfix {if !$metadata.scroll}magic-heights-inner{/if}">
	{if $metadata.showimage}<div class="bpe_image {if !$metadata.grid}Left_Image{/if}"><a href="/{$index}{$link}"><img src='{$path}' {if $metadata.retina}srcset="{if $page.pic_url==""||$page.pic_url=="/images"}{if $theme_vars_placeholder_image}/images/themegraphics/{$theme_vars_placeholder_image}{else}/graphics/placeholder.jpg{/if}{else}{$page.pic_url}{/if}{if $metadata.width!='auto'||$metadata.height!='auto'}?width={$retw}&height={$reth}&shrink=false 2x{/if}"{/if} {get_image_sizes path=$path} {$image_sizes}/></a></div>{/if}
	<h4><a href="/{$index}{$link}">{$page.pagetitle}</a></h4>
	{if $metadata.showdate}<p class="Smaller recent-pages-date"><a href="/{$index}{$link}">{$page.meta.date|date_format:$metadata.date_format}</a></p>{/if}
	{if $metadata.showsummary}{if $page.meta.ss_page_desc!=""}<p>{$page.meta.ss_page_desc}</p>{else}
	{assign var=p value=$page.content|strip_tags_exclude:"<p>"}
	{assign var=p value="<p"|explode:$p}
	{assign var=p value=">"|explode:$p[1]}
	{assign var=p value="<"|explode:$p[1]}
	{assign var=p value=$p[0]}
	{$p}
	{/if}{/if}
	{if $metadata.showbutton}
	<p class="Button_Small"><a href="/{$index}{$link}">Read more</a></p>
	{/if}
	</div>
</div>
{/if}
{/foreach}
{if !$metadata.scroll}
<div class="clear"></div>
{/if}
</div>
