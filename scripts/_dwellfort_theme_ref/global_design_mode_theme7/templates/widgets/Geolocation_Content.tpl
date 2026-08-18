{* @@@
{
	"widget_info":{
		"title":"Geoloction Content"
		,"title_info":"Enter a name for this instance of the widget. This is just used for reference. Please make sure you are using this on a page with caching disabled or a page that can only be viewed by someone who is logged in."
		 ,"category":"setup"
	},
	"meta_data":[{
		"name":"Valid country codes"
		,"info":"Enter a comma separated list of two-letter  country codes to restrict this widget to."
		,"type": "text"
		,"var": "codes"
		,"default":""
	}]
}
@@@ *}
{geolocate}
{assign var="valid" value=','|explode:$metadata.codes}
{assign var="isvalid" value=false}
{foreach from=$valid item=code}
{if $code|strtolower==$country|strtolower}
{assign var="isvalid" value=true}
{/if}
{/foreach}
{if $isvalid}
{$editable.valid_content}
{else}
{$editable.invalid_content}
{/if}
