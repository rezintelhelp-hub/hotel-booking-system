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
<meta name="twitter:title" content="{if $content.longtitle==""||$content.longtitle==$content.title}{strip}
	{if $h1==""&&$h2==""}
		{/strip}{$content.longtitle}{if $metatitleappend!=""} - {/if}{$metatitleappend}{strip}
	{else}
		{/strip}{if $h1==""}{$h2}{else}{$h1}{/if}{if $metatitleappend} - {/if}{$metatitleappend}{strip}
	{/if}
{else}
	{/strip}{$content.longtitle}{strip}
{/if}
{/strip}" />
	<meta name="twitter:description" content="{if $content.description!=""}{$content.description}{else}{$h1}{if $h2!=""} - {$h2}{/if}{if $h2==""} - {$p}{/if}{if $p==""} - {$li}{/if}{/if}" />
{if $templateSections.Poster_Image!=""}
	{assign var=images value=$templateSections.Poster_Image|images_from_content:true:$siteurl}
	<meta name="twitter:image" content="{$images[0]}" />
{else}
	{if $content.imgUrl!=""&&$content.imgUrl!="/images"}<meta property="twitter:image" content="{$siteurl}{$content.imgUrl}" />
	{else}<meta property="twitter:image" content="/images/themegraphics/{$theme_vars_placeholder_image}" />{/if}
{/if}
