{* @@@
{
	"widget_info":{
		"title":"Featured Property"
		,"title_info":"Enter a name for this featured property."
	},
	"meta_data":[{
		"name":"Property Page"
		,"type":"linkpageonly"
		,"info":"Choose the page where your Properties widget is set up"
		,"var":"destination"
		,"default":"/properties/"
	},{
		"name":"Tag"
		,"type": "pagetagmulti"
		,"var": "tagids"
	},{
		"name":"Offset"
		,"type": "text"
		,"info": "Enter the offset here. This lets you omit the first n items in the list, where n is the value entered."
		,"var": "offset"
		,"default": "0"
	},{
		"name":"Limit"
		,"type": "text"
		,"info": "Enter the limit here."
		,"var": "limit"
		,"default": "1"
	}],
        "inner_templates":{
        }
}
@@@ *}
{pages_by_tag tags=$metadata.tagids assign=pages direction=asc start=$metadata.offset limit=$metadata.limit}
{foreach from=$pages item=page name=pagesloop}
{assign var="images" value=$page.meta.images_json|json_decode:true}
{if $room.property_type=="Hotel"||$room.property_type=="Guesthouse"||$room.property_type=="Heritage Hotel"||$room.property_type=="Aparthotel"||$room.property_type=="Bed and Breakfast"||$room.property_type=="Boutique Hotel"}
{capture assign="link"}{$metadata.destination}/{$page.url_str}{/capture}
{else}
{capture assign="link"}{$metadata.destination}/{$page.url_str}{/capture}
{/if}
<div class="featured-image" style="background-position:50% 50%;background-image:url({$images[0][0]});background-position:cover;"><a href="{$link}"><img src="/graphics/x.gif" width="600" height="400" /></a></div>
<div class="callout">
<h1><a href="{$link}">{$page.pagetitle}</a></h1>
<p>{$page.meta.bedrooms} Bedrooms</p>
<p>{$page.meta.bathrooms} Bathrooms</p>
</div>
{/foreach}

