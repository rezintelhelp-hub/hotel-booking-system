<div data-position="{$pos}" class="{$pos} module clearfix icon-style-{$icon_style} social-links {if $align}align-{$align}{/if} {if !$width}{if $valign}valign-{$valign}{if $valign} valign{/if}{/if}{/if} {if $clear}clear-{$clear}{/if} {if $style}style-{$style}{/if} {if $size}size-{$size}{/if} {if $width}width width-{$width} width-valign-{$valign}{/if}">
	<div {*class="flexibreak-container"*}>
		<p>
		{if $theme_vars_include_livechat}
		<span id="livechat" style="display:none"><a href="/livechat/convo.php?language={$content.language}" class="social-link-livechat social-link" id="startConvo">{$langs.Livechat}</a></span>
		{/if}
		{if $theme_vars_email_link}
		
		{capture name=email_link}<a href="mailto:{$theme_vars_email_link}" title="Email: {$theme_vars_email_link}" class="social-link-email social-link" target="_blank">{$theme_vars_email_link}</a>{/capture}

		<script type="text/javascript">document.write(
		'{$smarty.capture.email_link|str_rot13}'.replace(/[a-zA-Z]/g, function(c){literal}{return String.fromCharCode((c<="Z"?90:122)>=(c=c.charCodeAt(0)+13)?c:c-26);}));{/literal}
		</script>
		
		{/if}
		{if $theme_vars_facebook_link}
		<a rel="nofollow" href="{$theme_vars_facebook_link}" title="Facebook (Opens new window)" class="social-link-facebook social-link" target="_blank">Facebook</a>
		{/if}
		{if $theme_vars_instagram_link}
		<a rel="nofollow" href="{$theme_vars_instagram_link}" title="Instagram (Opens new window)" class="social-link-instagram social-link" target="_blank">Instagram</a>
		{/if}
		{if $theme_vars_twitter_link}
		<a rel="nofollow" href="{$theme_vars_twitter_link}" title="Twitter (Opens new window)" class="social-link-twitter social-link" target="_blank">Twitter</a>
		{/if}
		{if $theme_vars_linkedin_link}
		<a rel="nofollow" href="{$theme_vars_linkedin_link}" title="LinkedIn (Opens new window)" class="social-link-linkedin social-link" target="_blank">LinkedIn</a>
		{/if}
		{if $theme_vars_pinterest_link}
		<a rel="nofollow" href="{$theme_vars_pinterest_link}" title="Pinterest (Opens new window)" class="social-link-pinterest social-link" target="_blank">Pinterest</a>
		{/if}
		{if $theme_vars_youtube_link}
		<a rel="nofollow" href="{$theme_vars_youtube_link}" title="YouTube (Opens new window)" class="social-link-youtube social-link" target="_blank">YouTube</a>
		{/if}
		{if $theme_vars_vimeo_link}
		<a rel="nofollow" href="{$theme_vars_vimeo_link}" title="Vimeo (Opens new window)" class="social-link-vimeo social-link" target="_blank">Vimeo</a>
		{/if}
		{if $theme_vars_flikr_link}
		<a rel="nofollow" href="{$theme_vars_flikr_link}" title="Flikr (Opens new window)" class="social-link-flikr social-link" target="_blank">Flikr</a>
		{/if}
		{if $theme_vars_tumblr_link}
		<a rel="nofollow" href="{$theme_vars_tumblr_link}" title="Tumblr (Opens new window)" class="social-link-tumblr social-link" target="_blank">Tumblr</a>
		{/if}
		{if $theme_vars_yelp_link}
		<a rel="nofollow" href="{$theme_vars_yelp_link}" title="Yelp (Opens new window)" class="social-link-yelp social-link" target="_blank">Yelp</a>
		{/if}
		{if $theme_vars_tripadvisor_link}
		<a rel="nofollow" href="{$theme_vars_tripadvisor_link}" title="Trip Advisor (Opens new window)" class="social-link-tripadvisor social-link" target="_blank">Trip Advisor</a>
		{/if}
		{if $theme_vars_blogger_link}
		<a rel="nofollow" href="{$theme_vars_blogger_link}" title="Blogger (Opens new window)" class="social-link-blogger social-link" target="_blank">Blogger</a>
		{/if}
		{if $theme_vars_houzz_link}
		<a rel="nofollow" href="{$theme_vars_houzz_link}" title="Houzz (Opens new window)" class="social-link-houzz social-link" target="_blank">Houzz</a>
		{/if}
		{if $theme_vars_phone_number}
		<a href="tel:{$theme_vars_phone_number}" title="{$theme_vars_phone_number}" class="social-link-phone social-link">{$theme_vars_phone_number}</a>
		{/if}
		{if $theme_vars_whatsapp_number}
		<a href="https://wa.me/{$theme_vars_whatsapp_number}" title="{$theme_vars_whatsapp_number}" class="social-link-whatsapp social-link">WhatsApp</a>
		{/if}
		
		</p>
	</div>
</div>

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
	style:	none/default (Shows icon and text)
			icon (only icons)
			text (only text)
	size:	small/default (small icons)
					large (large icons)

*}
