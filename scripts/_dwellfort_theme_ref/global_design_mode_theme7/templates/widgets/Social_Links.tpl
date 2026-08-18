{* @@@
{
	"widget_info":{
		"title":"Social Links"
		,"title_info":"Enter a name for this instance of the social links widget"
		,"works_in_email":"both"
	},
	"meta_data":[{
		"name":"Align"
		,"type": "dropdown"
		,"var": "align"
		,"default":"center"
		,"options":[
			{
				"label":"Left"
				,"value":"left"
			},
			{
				"label":"Center"
				,"value":"center"
			},
			{
				"label":"Right"
				,"value":"right"
			}
		]
	},{
		"name":"Style"
		,"type": "dropdown"
		,"var": "style"
		,"default":""
		,"options":[
			{
				"label":"Normal"
				,"value":""
			},
			{
				"label":"No Background"
				,"value":"-Transparent"
			}
			,{
				"label":"White on Black"
				,"value":"-Black-Mon"
			}
			,{
				"label":"Black on White"
				,"value":"-White-Mon"
			}
			,{
				"label":"White, No Background"
				,"value":"-Transparent-White"
			}
			,{
				"label":"Black, No Background"
				,"value":"-Transparent-Black"
			}
			,{
				"label":"Circles"
				,"value":"-Circ"
			}
			,{
				"label":"Circles Grey"
				,"value":"-Circ-Grey"
			}
		]
	},{
		"name":"Size"
		,"type": "dropdown"
		,"var": "size"
		,"default":"large"
		,"options":[
			{
				"label":"Small"
				,"value":"small"
			},
			{
				"label":"Large"
				,"value":"large"
			}
		]
	},{
		"name":"Show phone"
		,"type": "tick"
		,"default":"1"
		,"var": "phone"
	},{
		"name":"Show email"
		,"type": "tick"
		,"default":"1"
		,"var": "email"
	},{
		"name":"Allow wrapping"
		,"type": "tick"
		,"default":"1"
		,"var": "allowrap"
	}]
}
@@@ *}
	
	{if $content.sentAsEmail}
	{if $metadata.size=="large"} 
	{assign var=size value="med"}
	{else}
	{assign var=size value="small"}	
	{/if}
		<p class="social-links size-{$metadata.size} style-icons align-{$metadata.align} clearfix">
			{if $theme_vars_facebook_link}
			<a rel="nofollow" href="{$theme_vars_facebook_link}" title="Facebook (Opens new window)" class="social-link-facebook social-link" target="_blank"><img src="/graphics/social/Facebook{$metadata.style}{$size}.png" alt="Facebook Logo" width="{if $size=="med"}42{else}21{/if}" height="{if $size=="med"}42{else}21{/if}"/></a>
			{/if}
			{if $theme_vars_linkedin_link}
			<a rel="nofollow" href="{$theme_vars_linkedin_link}" title="LinkedIn (Opens new window)" class="social-link-linkedin social-link" target="_blank"><img src="/graphics/social/LinkedIn{$metadata.style}{$size}.png" alt="LinkedIn Logo" width="{if $size=="med"}42{else}21{/if}" height="{if $size=="med"}42{else}21{/if}"/></a>
			{/if}
			{if $theme_vars_pinterest_link}
			<a rel="nofollow" href="{$theme_vars_pinterest_link}" title="Pinterest (Opens new window)" class="social-link-pinterest social-link" target="_blank"><img src="/graphics/social/Pinterest{$metadata.style}{$size}.png" alt="Pinterest Logo" width="{if $size=="med"}42{else}21{/if}" height="{if $size=="med"}42{else}21{/if}"/></a>
			{/if}
			{if $theme_vars_twitter_link}
			<a rel="nofollow" href="{$theme_vars_twitter_link}" title="Twitter (Opens new window)" class="social-link-twitter social-link" target="_blank"><img src="/graphics/social/Twitter{$metadata.style}{$size}.png" alt="Twitter Logo" width="{if $size=="med"}42{else}21{/if}" height="{if $size=="med"}42{else}21{/if}"/></a>
			{/if}
			{if $theme_vars_youtube_link}
			<a rel="nofollow" href="{$theme_vars_youtube_link}" title="YouTube (Opens new window)" class="social-link-youtube social-link" target="_blank"><img src="/graphics/social/YouTube{$metadata.style}{$size}.png" alt="YouTube Logo" width="{if $size=="med"}42{else}21{/if}" height="{if $size=="med"}42{else}21{/if}"/></a>
			{/if}
			{if $theme_vars_instagram_link}
			<a rel="nofollow" href="{$theme_vars_instagram_link}" title="Instagram (Opens new window)" class="social-link-instagram social-link" target="_blank"><img src="/graphics/social/Instagram{$metadata.style}{$size}.png" alt="Instagram Logo" width="{if $size=="med"}42{else}21{/if}" height="{if $size=="med"}42{else}21{/if}"/></a>
			{/if}
			{if $theme_vars_vimeo_link}
			<a rel="nofollow" href="{$theme_vars_vimeo_link}" title="Vimeo (Opens new window)" class="social-link-vimeo social-link" target="_blank"><img src="/graphics/social/Vimeo{$metadata.style}{$size}.png" alt="Vimeo Logo" width="{if $size=="med"}42{else}21{/if}" height="{if $size=="med"}42{else}21{/if}"/></a>
			{/if}
			{if $theme_vars_flikr_link}
			<a rel="nofollow" href="{$theme_vars_flikr_link}" title="Flickr (Opens new window)" class="social-link-flickr social-link" target="_blank"><img src="/graphics/social/Flickr{$metadata.style}{$size}.png" alt="Flickr Logo" width="{if $size=="med"}42{else}21{/if}" height="{if $size=="med"}42{else}21{/if}"/></a>
			{/if}
			{if $theme_vars_tumblr_link}
			<a rel="nofollow" href="{$theme_vars_tumblr_link}" title="Tumblr (Opens new window)" class="social-link-tumblr social-link" target="_blank"><img src="/graphics/social/Tumblr{$metadata.style}{$size}.png" alt="Tumblr Logo" width="{if $size=="med"}42{else}21{/if}" height="{if $size=="med"}42{else}21{/if}"/></a>
			{/if}
			{if $theme_vars_yelp_link}
			<a rel="nofollow" href="{$theme_vars_yelp_link}" title="Yelp (Opens new window)" class="social-link-yelp social-link" target="_blank"><img src="/graphics/social/Yelp{$metadata.style}{$size}.png" alt="Yelp Logo" width="{if $size=="med"}42{else}21{/if}" height="{if $size=="med"}42{else}21{/if}"/></a>
			{/if}
			{if $theme_vars_tripadvisor_link}
			<a rel="nofollow" href="{$theme_vars_tripadvisor_link}" title="Trip Advisor (Opens new window)" class="social-link-trip-advisor social-link" target="_blank"><img src="/graphics/social/TripAdvisor{$metadata.style}{$size}.png" alt="Trip Advisor Logo" width="{if $size=="med"}42{else}21{/if}" height="{if $size=="med"}42{else}21{/if}"/></a>
			{/if}
			{if $theme_vars_houzz_link}
			<a rel="nofollow" href="{$theme_vars_instagram_link}" title="Houzz (Opens new window)" class="social-link-houzz social-link" target="_blank"><img src="/graphics/social/Houzz{$metadata.style}{$size}.png" alt="Houzz Logo" width="{if $size=="med"}42{else}21{/if}" height="{if $size=="med"}42{else}21{/if}"/></a>
			{/if}
			{if $theme_vars_email_link&&$metadata.email}

			<a href="mailto:{$theme_vars_email_link}" title="Email: {$theme_vars_email_link}" class="social-link-email social-link" target="_blank"><img src="/graphics/social/Email{$metadata.style}{$size}.png" alt="Email Icon" width="{if $size=="med"}42{else}21{/if}" height="{if $size=="med"}42{else}21{/if}"/></a>

			{/if}
			{if $theme_vars_phone_number&&$metadata.phone}
			<a href="tel:{$theme_vars_phone_number}" title="{$theme_vars_phone_number}" class="social-link-phone social-link"><img src="/graphics/social/Phone{$metadata.style}{$size}.png" alt="Phone Icon" width="{if $size=="med"}42{else}21{/if}" height="{if $size=="med"}42{else}21{/if}"/></a>
			{/if}
			{if $theme_vars_whatsapp_number}
	                <a href="https://wa.me/{$theme_vars_whatsapp_number}" title="{$theme_vars_whatsapp_number}" class="social-link-whatsapp social-link">WhatsApp</a>
	                {/if}
		</p>
	{else}
	
	<p class="social-links size-{$metadata.size} icon-style-{$metadata.style} style-icons align-{$metadata.align} clearfix">

			{if $theme_vars_include_livechat}
			<span id="livechat" style="display:none"><a href="/livechat/convo.php?language={$content.language}" class="social-link-livechat social-link" id="startConvo">{$langs.Livechat}</a></span>
			{/if}
			{if $theme_vars_facebook_link}
			<a rel="nofollow" href="{$theme_vars_facebook_link}" title="Facebook (Opens new window)" class="social-link-facebook social-link" target="_blank">Facebook</a>
			{/if}

			{if $theme_vars_linkedin_link}
			<a rel="nofollow" href="{$theme_vars_linkedin_link}" title="LinkedIn (Opens new window)" class="social-link-linkedin social-link" target="_blank">LinkedIn</a>
			{/if}
			{if $theme_vars_pinterest_link}
			<a rel="nofollow" href="{$theme_vars_pinterest_link}" title="Pinterest (Opens new window)" class="social-link-pinterest social-link" target="_blank">Pinterest</a>
			{/if}
			{if $theme_vars_twitter_link}
			<a rel="nofollow" href="{$theme_vars_twitter_link}" title="Twitter (Opens new window)" class="social-link-twitter social-link" target="_blank">Twitter</a>
			{/if}
			{if $theme_vars_youtube_link}
			<a rel="nofollow" href="{$theme_vars_youtube_link}" title="YouTube (Opens new window)" class="social-link-youtube social-link" target="_blank">YouTube</a>
			{/if}
			{if $theme_vars_instagram_link}
			<a rel="nofollow" href="{$theme_vars_instagram_link}" title="Instagram (Opens new window)" class="social-link-instagram social-link" target="_blank">Instagram</a>
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
			{if $theme_vars_houzz_link}
			<a rel="nofollow" href="{$theme_vars_houzz_link}" title="Houzz (Opens new window)" class="social-link-houzz social-link" target="_blank">Houzzs</a>
			{/if}
			{if $theme_vars_email_link&&$metadata.email}

			{capture name=email_link}<a href="mailto:{$theme_vars_email_link}" title="Email: {$theme_vars_email_link}" class="social-link-email social-link" target="_blank">{$theme_vars_email_link}</a>{/capture}

			<script type="text/javascript">document.write(
			'{$smarty.capture.email_link|str_rot13}'.replace(/[a-zA-Z]/g, function(c){literal}{return String.fromCharCode((c<="Z"?90:122)>=(c=c.charCodeAt(0)+13)?c:c-26);}));{/literal}
			</script>
	
			{/if}
			{if $theme_vars_phone_number&&$metadata.phone}
			<a href="tel:{$theme_vars_phone_number}" title="{$theme_vars_phone_number}" class="social-link-phone social-link">{$theme_vars_phone_number}</a>
			{/if}
			{if $theme_vars_whatsapp_number}
	                <a href="https://wa.me/{$theme_vars_whatsapp_number}" title="{$theme_vars_whatsapp_number}" class="social-link-whatsapp social-link">WhatsApp</a>
	                {/if}
	</p>
	{/if}
	
{if $metadata.allowrap==0}
<div class="clear"></div>
{/if}
