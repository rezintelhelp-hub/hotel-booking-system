{* @@@
{
	"widget_info":{
		"title":"Blog Mini Feed"
		,"title_info":"Enter a name for this instance of the mini pages feed. This is just used for reference."
		,"category":"setup"
		,"legacy":"true"
	},
	"meta_data":[{
		"name":"Tag"
		,"type": "pagetagmulti"
		,"var": "tags"
	},{
		"name":"Number of articles to show"
		,"type": "text"
        ,"info":"Enter the number of articles to show"
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
		"name":"Show summary"
		,"type": "tick"
		,"default":"1"
		,"var": "showsummary"
	}]
}
@@@ *}
{pages_by_tag tags=$metadata.tagids assign=pages limit=$metadata.toshow sortbymeta=date}
<div class="mini-blog-feed">
{foreach from=$pages item=page name=pages}
<div class="styleBox mini-blog-feed-item mini-blog-feed-item-{$smarty.foreach.pages.iteration} clearfix align-image-text ">
	{if $metadata.showimage}<div class="bpe_image Left_Image"><a href="{$page.url_str_full}"><img src='{if $page.pic_url!=""&& $page.pic_url!="/images"}{$page.pic_url}?width=600&height=400&shrink=false{else}{if $theme_vars_placeholder_image}/images/themegraphics/{$theme_vars_placeholder_image}?width=1000&height=664&shrink=false{/if}{/if}' width="150"/></a></div><div class="mini-blog-feed-with-image">{/if}
	<h4 {if $metadata.showdate}class="with-date"{/if}><a href="{$page.url_str_full}">{$page.pagetitle}</a></h4>
    {if $metadata.showdate}<p class="mini-blog-feed-date"><a href="{$page.url_str_full}"><span class="recent-blog-date">{$page.meta.date|date_format:"%b %e, %Y %H:%M"}</span></a></p>{/if}
	{if $metadata.showsummary && $page.meta.ss_page_desc!=""}<p>{$page.meta.ss_page_desc}</p>{/if}
	<p class="blog-read-more"><a href="{$page.url_str_full}">Read more</a></p>
	{if $metadata.showimage}
	</div>
	{/if}
</div>
<div class="clear"></div>
{/foreach}
</div>
