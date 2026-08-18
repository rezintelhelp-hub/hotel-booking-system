{* @@@
{
	"widget_info":{
		"title":"YouTube Channel Feed"
		,"title_info":"Enter a name for this instance of the  widget. This is just used for reference."
	},
	"meta_data":[{
		"name":"YouTube Channel ID"
		,"info":"Enter the ID of the YouTube channel you'd like to embed here."
		,"type": "text"
		,"default": ""
		,"var": "channelid"
	},{
		"name":"Number of videos to display"
		,"info":"Enter the number of videos you'd like to display in the feed."
		,"type": "text"
		,"default": "10"
		,"var": "display"
	},{
		"name":"Grid"
		,"type": "tick"
		,"var": "grid"
		,"default": "1"
	}]
}
@@@ *}
	
{* Logic *}
{rss url="https://www.youtube.com/feeds/videos.xml?channel_id=`$metadata.channelid`"}
<div class="youtube-channel {if $metadata.grid}youtube-grid{/if}" data-feed="{$templateRSS|@json_encode|htmlentities}" data-show="{$metadata.display}">
</div>
