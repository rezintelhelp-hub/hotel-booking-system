{assign var=h1 value=$content.content|strip_tags_exclude:"<h1>"}
{assign var=h1 value="<h1"|explode:$h1}
{assign var=h1 value=">"|explode:$h1[1]}
{assign var=h1 value="<"|explode:$h1[1]}
{assign var=h1 value=$h1[0]}
{assign var=h2 value=$content.content|strip_tags_exclude:"<h2>"}
{assign var=h2 value="<h2"|explode:$h2}
{assign var=h2 value=">"|explode:$h2[1]}
{assign var=h2 value="<"|explode:$h2[1]}
{assign var=h2 value=$h2[0]}
<meta property="og:title" content="{if $content.longtitle==""||$content.longtitle==$content.title}{strip}
	{if $h1==""&&$h2==""}
		{/strip}{$content.longtitle}{if $metatitleappend!=""} - {/if}{$metatitleappend}{strip}
	{else}
		{/strip}{if $h1==""}{$h2}{else}{$h1}{/if}{if $metatitleappend} - {/if}{$metatitleappend}{strip}
	{/if}
{else}
	{/strip}{$content.longtitle}{strip}
{/if}
{/strip}" />
	<meta property="og:type" content="article" />
	<meta property="og:description" content="{if $content.description!=""}{$content.description}{else}{$h1}{if $h2!=""} - {$h2}{/if}{if $h2==""} - {$p}{/if}{if $p==""} - {$li}{/if}{/if}" />
	<meta property="og:site_name" content="{$sitetitle}"/>
	{if $content.overridden_poster}
		<meta property="og:image" content="{$content.overridden_poster}" />
	{else}
	{if $templateSections.Poster_Image|trim!=""}
		{assign var=images value=$templateSections.Poster_Image|images_from_content:true:$siteurl}
		{foreach from=$images item=image key=key name=loop1}
		<meta property="og:image" content="{$image}" />		
		{/foreach}

	{else}
		{if $content.imgUrl!=""&&$content.imgUrl!="/images"}<meta property="og:image" content="{$siteurl}{$content.imgUrl}" />
		{else}<meta property="og:image" content="/images/themegraphics/{$theme_vars_placeholder_image}" />{/if}
	{/if}
{/if}
