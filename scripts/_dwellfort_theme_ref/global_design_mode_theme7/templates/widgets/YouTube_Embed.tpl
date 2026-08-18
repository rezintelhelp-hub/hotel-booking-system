{* @@@
{
	"widget_info":{
		"title":"YouTube Embed"
		,"title_info":"Enter a name for this instance of the Blog widget. This is just used for reference."
		,"show_in_search":"true"
	},
	"meta_data":[{
		"name":"YouTube Link"
		,"info":"Paste in the link to your YouTube video here."
		,"type": "text"
		,"var": "youtubelink"
		,"default":"https://www.youtube.com/watch?v=cnMa-Sm9H4k"
	},{
		"name":"Title"
		,"info":"Enter a title for this video. This is used for accessibility."
		,"type": "text"
		,"var": "title"
		,"default":""
	}]
}
@@@ *}
{if $editable.YouTube_Page!=""}
{assign var=link value=$editable.YouTube_Page|strip_tags|trim|replace:'https://youtu.be/':'https://www.youtube.com/embed/'|strip_tags|trim|replace:'https://www.youtube.com/watch?v=':'https://www.youtube.com/embed/'|replace:'http://www.youtube.com/watch?v=':'https://www.youtube.com/embed/'}
{else}
{assign var=link value=$metadata.youtubelink|trim|replace:'https://www.youtube.com/shorts/':'https://www.youtube.com/embed/'|replace:'https://youtu.be/':'https://www.youtube.com/embed/'|strip_tags|trim|replace:'https://www.youtube.com/watch?v=':'https://www.youtube.com/embed/'|replace:'http://www.youtube.com/watch?v=':'https://www.youtube.com/embed/'}
{/if}
{if $link!=""}
{assign var=link2 value="?"|explode:$link}
{assign var=yt value=$link2[0]}
{assign var=time value=""}
{if $link2[1]|strpos:"t="===0||$link2[1]|strpos:"amp;t="===0}
{assign var=time value=$link2[1]|replace:"amp;t=":""|replace:"t=":""}

{assign var=time value=$time|convert_youtube_time_to_seconds}
{assign var=time value="?html5=1&start=`$time`&rel=0"}
{else}
{assign var=time value="?html5=1&rel=0"}
{/if}

{literal}<style>.embed-container { position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%; } .embed-container iframe, .embed-container object, .embed-container embed { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }</style>{/literal}
<div class='embed-container yt-{$link|css_safe} {if $theme_vars_consent_mode}functional-iframe-check-consent styleBox{/if}' {if $theme_vars_consent_mode}data-iframe-src="{$yt}{$time}"{/if}>
	{if $theme_vars_consent_mode}
	<div class="yt-consent-in-player">
	<p class="Icon_Alert">Please allow Functional cookies to use the YouTube player</p>
	<p class="Button_Medium"><a class="show-cookie-banner">Show cookie preferences</a></p>
	</div>
	{else}
	<iframe src='{$yt}{$time}' frameborder='0' alt="{$metadata.title|trim}" title="{$metadata.title|trim}" allowfullscreen></iframe>
	{/if}
</div>
{/if}
