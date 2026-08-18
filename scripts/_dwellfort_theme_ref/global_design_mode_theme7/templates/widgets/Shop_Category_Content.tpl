{* @@@
{
	"widget_info":{
		"title":"Shop Catergory Content"
		,"title_info":"Enter a name for this instance of the widget."
		,"category":"setup"
		,"include_js":"backstretch.js,owl.carousel.min.js,backstretch.ready.js"
	},
	"meta_data":[{
		"name":"Category"
		,"type": "text"
		,"info": "Enter the category name. The content will only show when this category is being used"
		,"var": "category"
		,"default":""
	}],
	"inner_templates":{
	}
}
@@@ *}
{if $metadata.category|css_safe==$smarty.request.category}
{$editable.content}
{/if}

