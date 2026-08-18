{* @@@
{
	"widget_info":{
		"title":"Expand / Collapse Section"
		,"category":"text"
	}
	,"meta_data":[{
                "name":"Open on page load"
                ,"type": "tick"
                ,"var": "open"
                ,"default":"0"
        }],
        "inner_templates":{
        }
}
@@@ *}
<div data-expand-id="{$editable.title|strip_tags|trim|css_safe}" class="expand-box {if $metadata.open==1}showing openonload{/if}">
	<div class="expand-box-title clearfix">
			{$editable.title}		
	</div>
	<div class="expand-box-content clearfix">
			{$editable.content}
	</div>
</div>
