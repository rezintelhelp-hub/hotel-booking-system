{* @@@
{
	"widget_info":{
		"title":"Image"
		,"title_info":"Enter a name for this instance of the Image widget. This is just used for your reference."
		,"category":"media"
		,"works_in_email":"false"
	},
	"meta_data":[{
		"name":"Image"
		,"type": "image"
		,"var": "image"
	},
	{
                "name":"Alignment"
                ,"type": "dropdown"
                ,"var": "align"
                ,"default":""
                ,"options":[
                        {
                                "label":"Default"
                                ,"value":""
                        },
                        {
                                "label":"Left"
                                ,"value":"Left_Image"
                        },
                        {
                                "label":"Center"
                                ,"value":"Centered"
                        },
                        {
                                "label":"Right"
                                ,"value":"Right_Image"
                        }
                ]
        },{
		"name":"Size"
		,"type": "imagesize"
		,"var": "size"
		,"default":"Medium"
        },{
		"name":"Style"
		,"type": "imagestyle"
		,"var": "style"
		,"default":""
	},{
		"name":"Link"
		,"type": "link"
		,"var": "link"
		,"info":"Choose a link for your image here."
		,"default":""
	},{
		"name":"Caption"
		,"type": "text"
		,"var": "caption"
		,"info":"Enter a caption for your image. This will be displayed as a tooltip or a caption if used with one of the visible caption styles."
		,"default":""
	},{
		"name":"Descriptive text"
		,"type": "text"
		,"var": "alt"
		,"info":"Enter descriptive text for your image. This will help users with disabilities to understand the image."
		,"default":""
	},{
		"name":"Retina support"
		,"type": "tick"
		,"var": "retina"
		,"default":"1"
	},{
		"name":"Logged in only"
		,"type": "pagetagmulti"
		,"var": "loggedinonly"
		,"default":""
	}
	],
	"inner_templates":{
	}
}
@@@ *}
{assign var=tagsa value=","|explode:$metadata.loggedinonly}

{if $user_has_session}
	{if $user_is_allowed_tags|@count==0}
		{assign var=loggedin value=true}
	{/if}
	{foreach from=$tagsa item=tag}
		{if $tag|in_array:$user_is_allowed_tags && !$shown}
			{assign var=loggedin value=true}
		{/if}
	{/foreach}
{/if}
{if $metdata.loggedinonly!=""&&$loggedin || $metadata.loggedionly==""}
<div class="bpe_image {$metadata.style} {$metadata.align}">
{if $metadata.style=="Circular"}<span class="circularwrap">{/if}
{if $metadata.size_width=="auto"}
{assign var = retw value=auto}
{else}
{assign var = retw value=$metadata.size_width*2}
{/if}
{if $metadata.size_height=="auto"}
{assign var = reth value=auto}
{else}
{assign var = reth value=$metadata.size_height*2}
{/if}
{if $metadata.link!=""}
<a href="{$metadata.link}" {if $metadata.caption!=""}title="{$metadata.caption}"{/if} {if $metadata.link_ext}target="_blank"{/if}>
{/if}
{if $content.sentAsEmail}
<img src="{if $metadata.image==""}{if $theme_vars_placeholder_image}/images/themegraphics/{$theme_vars_placeholder_image}{else}/graphics/placeholder.jpg{/if}{else}{$metadata.image}{/if}?{if $metadata.size_height!="auto"||$metadata.size_width!="auto"}width={if $metadata.retina}{$retw}{else}{$metadata.size_width}{/if}&height={if $metadata.retina}{$reth}{else}{$metadata.size_height}{/if}&shrink={$metadata.size_shrink}{/if}"  {if $metadata.size_width!='auto'}width="{$metadata.size_width}"{/if} {if $metadata.size_height!='auto'}height="{$metadata.size_height}"{/if} alt="{$metadata.alt}" {if $metadata.caption!=""}title="{$metadata.caption}"{/if}/>
{else}
{capture assign="path"}
{if $metadata.image==""}{if $theme_vars_placeholder_image}/images/themegraphics/{$theme_vars_placeholder_image}{else}/graphics/placeholder.jpg{/if}{else}{$metadata.image}{/if}{if $metadata.size_height!="auto"||$metadata.size_width!="auto"}?width={$metadata.size_width}&height={$metadata.size_height}&shrink={$metadata.size_shrink}{/if}
{/capture}
<img src="{$path}" {if $metadata.retina}srcset="{if $metadata.image==""}{if $theme_vars_placeholder_image}/images/themegraphics/{$theme_vars_placeholder_image}{else}/graphics/placeholder.jpg{/if}{else}{$metadata.image}{/if}{if $metadata.size_width!='auto'||$metadata.size_height!='auto'}?width={$retw}&height={$reth}&shrink={$metadata.size_shrink} 2x{/if}"{/if} {get_image_sizes path=$path} {$image_sizes} alt="{$metadata.alt}" {if $metadata.caption!=""}title="{$metadata.caption}"{/if}/>
{/if}
{if $metadata.link!=""}
</a>
{/if}
{if $metadata.style=="Circular"}</span>{/if}
</div>
{/if}
