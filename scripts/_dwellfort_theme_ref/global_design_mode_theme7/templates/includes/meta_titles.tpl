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
<title>
{*{if $content.longtitle!=""&&$content.longtitle!=$content.title}{$content.longtitle}{else}{if $h1==""}{$h2}{else}{$h1}{/if}{if $h1!=""||$h2!=""} - {/if}{$metatitleappend}{/if}*}
{if $content.longtitle==""||$content.longtitle==$content.title}
	{if $h1==""&&$h2==""}
		{$content.longtitle}{if $metatitleappend!=""} - {/if}{$metatitleappend}
	{else}
		{if $h1==""}{$h2}{else}{$h1}{/if}{if $metatitleappend} - {/if}{$metatitleappend}
	{/if}
{else}
	{$content.longtitle}
{/if}
</title>
	<meta name="description" content="{if $content.description!=""}{$content.description}{else}{$h1}{if $h2!=""} - {$h2}{/if}{if $h2==""} - {$p}{/if}{if $p==""} - {$li}{/if}{/if}"/>
