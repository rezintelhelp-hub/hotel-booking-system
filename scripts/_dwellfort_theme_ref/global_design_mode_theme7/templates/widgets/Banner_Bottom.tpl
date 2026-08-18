{* @@@
{
	"widget_info":{
		"title":""
		,"title_info":""
		,"legacy":"true"
		,"include_js":"backstretch.js,owl.carousel.min.js,backstretch.ready.js,carousel.ready.js"
	},
	"meta_data":[],
	"inner_templates":{
	}
}
@@@ *}
{if $accessibility_mode}
<div class="banner-accessible">
{$editable.background_image}
{$editable.content}
</div>
{else}
<div class="banner-feature inverted" data-backgrounds="{$editable.background_image|images_to_json:true|htmlspecialchars}">
	<div class="banner-feature-inner banner-feature-content-bottom">
		<div class="banner-feature-content">	
			{$editable.content}
		</div>
	</div>
</div>
{/if}
