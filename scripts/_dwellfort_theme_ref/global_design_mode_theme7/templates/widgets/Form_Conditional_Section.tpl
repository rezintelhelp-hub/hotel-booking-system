{* @@@
{
	"widget_info":{
		"title":"Conditional Form Toggle"
		,"title_info":"Enter a name for this section. This is just used for your reference."
		,"category":"forms"
	},
	"meta_data":[{
		"name":	"Rules"
		,"type": "text"
		,"info": "Enter a json formatted string of rules. [{''ID'':''10'',''operator'':''=='',''Value'':''Red''}]"
		,"default": ""
		,"var":  "rules"
		},{
		"name":"Visible when rules are met"
		,"type": "dropdown"
		,"var": "visible"
		,"default":"all"
		,"options":[
			{
				"label":"All"
				,"value":"all"
			},
			{
				"label":"Any" 
				,"value":"any"
			}
		]
	}]
}
@@@ *}
<div class="form_conditional_section" data-rules="{$metadata.rules|htmlspecialchars}" data-visible="{$metadata.visible}">
{$editable.Fields}
</div>

