{* @@@
{
	"widget_info":{
		"title":"Banner"
		,"title_info":"Enter a name for this instance of the banner widget."
		,"category":"media"
		,"include_js":"backstretch.js,owl.carousel.min.js,backstretch.ready.js,carousel.ready.js"
	},
	"meta_data":[{
		"name":"Text position"
		,"type": "dropdown"
		,"var": "position"
		,"default":"middle"
		,"options":[
			{
				"label":"Top"
				,"value":"top"
			},
			{
				"label":"Middle"
				,"value":"middle"
			},
			{
				"label":"Bottom"
				,"value":"bottom"
			}
		]
	}],
	"inner_templates":{
	}
}
@@@ *}
{*
{$editable.background_image}
*}
<div class="banner-feature inverted" data-backgrounds="{$editable.background_image|images_to_json:true|htmlspecialchars}">
	<div class="banner-feature-inner banner-feature-content-{$metadata.position}">
		<div class="banner-feature-content">	
			{$editable.content}
		</div>
	</div>
</div>
