{* @@@
{
        "widget_info":{
                "title":"Breadcrumb"
                ,"title_info":"Enter a name for this instance of the breadcrumb widget."
                ,"category":"features" 
        },
        "meta_data":[{
                "name":"Include 'Home' link"
                ,"type": "tick"
                ,"var": "home"
                ,"default":"0"
        },{
		"name":"Intro text",
		"var":"intro",
		"default":"You are here:",
		"type":"text"	
	}],
        "inner_templates":{
        }
}
@@@ *}
<p id="breadcrumb">
{strip}
	{$metadata.intro}{if $metadata.intro!=""}&nbsp;{/if}
	{if $metadata.home}
		<a href="/" class="breadcrumbHomepage">
		{foreach from=$mainNav item=page}
			{if $page.homepage}
			{$page.title}
			{/if}
		{/foreach}
		</a> 
	{/if}
	{foreach from=$content.breadcrumb item=page name=main}
		{if $smarty.foreach.main.last}
		<span class="breadcrumbCurrent">{$page.title}</span>
		{else}
		<a href="{$page.fullUrl}" class="{if !$smarty.foreach.main.last}breadcrumbSubLevel{/if}">{$page.title}</a> 
		{/if}
	{/foreach}
	
{/strip}
</p>
