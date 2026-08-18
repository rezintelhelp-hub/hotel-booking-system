{* @@@
{
	"widget_info":{
		"title":"Image"
		,"title_info":"Enter a name for this instance of the Image widget. This is just used for your reference."
		,"category":"media"
		,"works_in_email":"true"
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
		,"type": "imagesize_email"
		,"var": "size"
		,"default":"Full"
        },{
		"name":"Style"
		,"type": "imagestyle_email"
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
		,"info":"Enter descriptive text for your image. This will help users with diabilities to understand the image."
		,"default":""
	},{
		"name":"Retina support"
		,"type": "tick"
		,"var": "retina"
		,"default":"1"
	}
	],
	"inner_templates":{
	}
}
@@@ *}
<div class="bpe_image {$metadata.style} {$metadata.align}">
{if $metadata.style=="Circular"}<span class="circularwrap">{/if}
{if $metadata.size_width=="auto"}
{assign var = reth value=auto}
{else}
{assign var = retw value=$metadata.size_width*2}
{/if}
{if $metadata.size_width=="auto"}
{assign var = retw value=auto}
{/if}
{if $metadata.size_height=="auto"}
{assign var = reth value=auto}
{else}
{assign var = reth value=$metadata.size_height*2}
{/if}
{if $metadata.size_height=="auto"}
{assign var = reth value=auto}
{/if}
{if $metadata.link!=""}
<a href="{$metadata.link}" {if $metadata.caption!=""}title="{$metadata.caption}"{/if} {if $metadata.link_ext}target="_blank"{/if}>
{/if}
{if $content.sentAsEmail}
{capture assign="pathdisp"}
{if $metadata.image==""}{if $theme_vars_placeholder_image}/images/themegraphics/{$theme_vars_placeholder_image}{/if}{else}{$metadata.image}{/if}?{if $metadata.size_height!="auto"||$metadata.size_width!="auto"}width={$metadata.size_width}&height={$metadata.size_height}&shrink={$metadata.size_shrink}{/if}
{/capture}
{capture assign="path"}
{if $metadata.image==""}{if $theme_vars_placeholder_image}/images/themegraphics/{$theme_vars_placeholder_image}{/if}{else}{$metadata.image}{/if}?{if $metadata.size_height!="auto"||$metadata.size_width!="auto"}width={if $metadata.retina}{$retw}{else}{$metadata.size_width}{/if}&height={if $metadata.retina}{$reth}{else}{$metadata.size_height}{/if}&shrink={$metadata.size_shrink}{/if}
{/capture}
<img src="{$path}" alt="{$metadata.alt}" {if $metadata.caption!=""}title="{$metadata.caption}"{/if} {get_image_sizes path=$pathdisp} {$image_sizes}/>
{else}
<img src="{if $metadata.image==""}{if $theme_vars_placeholder_image}/images/themegraphics/{$theme_vars_placeholder_image}{/if}{else}{$metadata.image}{/if}{if $metadata.size_height!="auto"||$metadata.size_width!="auto"}?width={$metadata.size_width}&height={$metadata.size_height}&shrink={$metadata.size_shrink}{/if}" {if $metadata.retina}srcset="{if $metadata.image==""}{if $theme_vars_placeholder_image}/images/themegraphics/{$theme_vars_placeholder_image}{/if}{else}{$metadata.image}{/if}{if $metadata.size_width!='auto'||$metadata.size_height!='auto'}?width={$retw}&height={$reth}&shrink={$metadata.size_shrink} 2x{/if}"{/if} {if $metadata.size_width!='auto'}width="{$metadata.size_width}"{/if} {if $metadata.size_height!='auto'}height="{$metadata.size_height}"{/if} alt="{$metadata.alt}" {if $metadata.caption!=""}title="{$metadata.caption}"{/if}/>
{/if}
{if $metadata.link!=""}
</a>
{/if}
{if $metadata.style=="Circular"}</span>{/if}
</div>
