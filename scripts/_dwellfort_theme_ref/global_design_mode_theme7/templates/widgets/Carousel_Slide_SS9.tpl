{* @@@
{
	"widget_info":{
		"title":"Carousel Slide"
		,"title_info":"Enter a name for this instance of the widget. This is just used for reference."
		,"category":"text"
		,"include_js":"owl.carousel.min.js,carousel.ready.js"
	},
	"meta_data":[{
		"name":"Autoscroll speed"
		,"type": "text"
        ,"info":"Enter a number in seconds for the autoscroll speed. You only need to configure this on the first of a set of consecutive widgets. Use 0 for no autoscrolling."
		,"var": "speed"
        ,"default":"3"
	},{
		"name":"Number of items"
		,"type": "text"
        ,"info":"Enter a number of items to show per slide. You only need to configure this on the first of a set of consecutive widgets."
		,"var": "items"
        ,"default":"1"
	},{
		"name":"Show side buttons"
		,"type": "tick"
		,"var": "showbuttons"
		,"default":"1"
	},{
		"name":"Show pagination dots"
		,"type": "tick"
		,"var": "showdots"
		,"default":"1"
	}],
	"inner_templates":{}
}
@@@ *}
<div class="carousel_slide_multi {if $metadata.showdots}with_dots{/if} {if $metadata.showbuttons}with_side_buttons{/if} carousel_slide_autoscroll" data-speed="{$metadata.speed}000" data-items="{$metadata.items}">
	{$editable.slide_content}
</div>
