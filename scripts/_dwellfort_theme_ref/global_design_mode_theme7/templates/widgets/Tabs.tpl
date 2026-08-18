{* @@@
{
	"widget_info":{
		"title":"Tabs"
		,"title_info":"Enter a name for this instance of the Tabs widget. This is just used for reference."
		,"category":"setup"
		,"include_js":"tabs.ready.js"
	},
	"meta_data":[{
		"name":"Title",
		"type":"text",
		"info":"Enter the button text to display for this tab",
		"var":"title",
		"default":""
	}],
	"inner_templates":{
	}
}
@@@ *}
<div data-tab-id="{$metadata.title|css_safe}" data-title="{$metadata.title}" class="tabs-widget tab-{$metadata.title|css_safe}">
{$editable.content}
</div>
