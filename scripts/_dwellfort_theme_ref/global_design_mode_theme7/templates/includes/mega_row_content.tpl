<style type="text/css" media="screen">
{if $fill && $height!="auto"} 
{if $height!="window"&&!$scale_prop}
#{$mrc_id} .banner-feature {literal}{{/literal}
	min-height:{$height}px;
{literal}}{/literal}
{/if}
{if $height!="window"&&$scale_prop}
#{$mrc_id} .banner-feature {literal}{{/literal}
	min-height:0px;
{literal}}{/literal}
{/if}
{/if}
#{$mrc_id} {literal}{{/literal}
	background-color:{$bg_color};
	{if $bg_mode=="tile"}
	background-image:url(/images/themegraphics/{$background1});
	background-repeat:repeat;
	{/if}
{literal}}{/literal}
</style>

<div class="container content {if $scale_prop}with-scale-prop-widgets{/if} {if $disclosure}disclose{/if} {if $inverted}inverted{/if} {if $fill}nopadding{/if} {if $fill && $height=="window" && $widgets}widget-banner-window-height{/if}"

	id="{$mrc_id}"
	{if $bg_mode!="tile" && (($background_video==""&&!$background_video_ts_enabled)||($background_video_ts==""&&$background_video_ts_enabled))}
		{if $bg_enabled&&$Backgrounds}
			data-backgrounds="{$Backgrounds|images_to_json:true|htmlspecialchars}"
		{else}
			{if $background1}
				data-backgrounds="[&quot;/images/themegraphics/{$background1}&quot;{if $background2},&quot;/images/themegraphics/{$background2}&quot;{/if}{if $background3},&quot;/images/themegraphics/{$background3}&quot;{/if}{if $background4},&quot;/images/themegraphics/{$background4}&quot;{/if}{if $background5},&quot;/images/themegraphics/{$background5}&quot;{/if}]"
			{/if}
		{/if}
	{/if}
	data-background-fade="1000"
	data-background-align="{$bg_align}"
	data-background-panzoom="{$panzoom}"
	data-background-duration="5000"
	data-background-color="{$bg_color}"
	data-background-opacity="{$bg_opacity}"
	{if $bg_mode=="parallax_slow"}
	data-scroll-decay="0.1"
	{/if}
	{if $bg_mode=="parallax_norm"}
	data-scroll-decay="0.5"
	{/if}
	{if $bg_mode=="parallax_fast"}
	data-scroll-decay="0.9"
	{/if}
	{if $bg_mode=="parallax_infini"}
	data-scroll-decay="1"
	{/if}
	{if $bg_mode=="parallax_combined"}
	data-parallax-combined="1"
	{/if}
	{if $slideshow_speed}
	data-slideshow-speed="{$slideshow_speed}"
	{/if}
	{if $slideshow_dots}
	data-slideshow-dots="{$slideshow_dots}"
	{/if}
	{if $slideshow_arrows}
	data-slideshow-arrows="{$slideshow_arrows}"
	{/if}
	{if $slideshow_style}
	data-slideshow-style="{$slideshow_style}"
	{/if}
	{if $background_video_ts_enabled&&$background_video_ts!=""}
		{assign var=videostr value="href=\"/media"|explode:$background_video_ts}
		{assign var=videostr2 value="\""|explode:$videostr[1]}
		{if !$bg_enabled||!$Backgrounds}
			{assign var=imgstr value="src=\""|explode:$background_video_ts}
			{assign var=imgstr2 value="\""|explode:$imgstr[1]}
			{assign var=imgstr3 value=$imgstr2[0]}
		{else}
			{assign var=imgstr value="src=\""|explode:$Backgrounds}
			{assign var=imgstr2 value="\""|explode:$imgstr[1]}
			{assign var=imgstr3t value="?"|explode:$imgstr2[0]}
			{assign var=imgstr3 value=$imgstr3t[0]}
		{/if}
		data-vide-bg="mp4: /media{$videostr2[0]}, poster: {$imgstr3}"
		data-vide-options="loop: true, muted: {if $theme_vars_mute_bg_video}true{else}false{/if}, position: 50% 50%, opacity: {$bg_opacity}"
	{elseif $background_video}
		data-vide-bg="mp4: /media/{$background_video}, poster: /images/themegraphics/{$background1}"
		data-vide-options="loop: true, muted: {if $theme_vars_mute_bg_video}true{else}false{/if}, position: 50% 50%, opacity: {$bg_opacity}"
	{/if}
	{if $widgets}
	{if $height!="auto"}data-min-height="{$height}"{/if} data-scale-prop="{$scale_prop}"
	{/if}
>
{if !$fill}
<section class="row clearfix" {if $height!="auto"}data-min-height="{$height}"{/if} data-scale-prop="{$scale_prop}">
{else}
<section class="fill-row clearfix" {if $height!="auto"}data-min-height="{$height}"{/if} data-scale-prop="{$scale_prop}">
{/if}
	{include file="modules/content_block.tpl"
		c=$c
	}
</section>
</div>
