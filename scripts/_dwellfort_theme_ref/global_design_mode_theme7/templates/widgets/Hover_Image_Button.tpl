{*
{$editable.Main_Image_And_Link}
{$editable.Hover_Image}
*}
{assign var=hoverimg value="src=\""|explode:$editable.Hover_Image}
{assign var=hoverimg value="\""|explode:$hoverimg[1]}
{assign var=hoverimg2x value="srcset=\""|explode:$editable.Hover_Image}
{assign var=hoverimg2x value="\""|explode:$hoverimg2x[1]}
<div class="Hover_Image_Button" data-hover-src="{$hoverimg[0]}" data-hover-srcset="{$hoverimg2x[0]}">
	{$editable.Main_Image_And_Link}
</div>
