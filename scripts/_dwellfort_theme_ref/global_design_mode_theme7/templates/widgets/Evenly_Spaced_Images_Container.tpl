{* @@@
{
	"widget_info":{
		"title":"Evenly Spaced Images Container"
		,"title_info":"Enter a name for this instance of this container."
		,"category":"media"
	},
	"meta_data":[{
		"name":"Size"
		,"type": "dropdown"
		,"var": "size"
		,"default":"medium"
		,"options":[
			{
				"label":"Small"
				,"value":"small"
			},
			{
				"label":"Medium"
				,"value":"medium"
			},
			{
				"label":"Large"
				,"value":"large"
			}
		]
	}],
	"inner_templates":{
	}
}
@@@ *}
<div id="logos" class="{$metadata.size}">
{$editable.Images}
</div>
