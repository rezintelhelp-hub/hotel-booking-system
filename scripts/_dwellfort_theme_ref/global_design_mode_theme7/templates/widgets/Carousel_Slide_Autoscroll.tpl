{* @@@
{
	"widget_info":{
		"title":""
		,"title_info":""
		,"legacy":"true"
		,"include_js":"owl.carousel.min.js,carousel.ready.js"
	},
	"meta_data":[],
	"inner_templates":{
	}
}
@@@ *}
<div class="carousel_slide carousel_slide_autoscroll" data-speed="{if $theme_vars_slide_autoscroll_speed}{$theme_vars_slide_autoscroll_speed}{else}5{/if}000">
	{$editable.slide_content}
</div>
