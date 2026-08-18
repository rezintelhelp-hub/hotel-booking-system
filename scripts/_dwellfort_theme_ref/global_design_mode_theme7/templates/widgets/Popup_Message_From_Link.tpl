{* @@@
{
	"widget_info":{
		"title":""
		,"title_info":""
		,"legacy":"true"
	},
	"meta_data":[],
	"inner_templates":{
	}
}
@@@ *}
{*
{$editable.link_text}
*}
{if $editable.link_text}
<div id="popupMessageOnClick">
        {$editable.link_text}
</div>
<div id="popupMessageOnClickContent">
{$editable.message_content}
</div>
{else}
<div id="popupMessageBox" class="autoshow">
        
        {$editable.message_content}
        
</div>
{/if}
