{if $content.languages_in_use}
<div data-position="{$pos}" class="{$pos} clearfix module languages align-{$align}  {if $width}width width-{$width} width-valign-{$valign}{/if} {if !$width}valign-{$valign}{if $valign} valign{/if}{/if} {if $clear}clear-{$clear}{/if}">
	<div>
		<ul id="languages">
			{foreach from=$content.languages_in_use item=lang}
			<li class="lang_{$lang.0}"><a href="{$lang.1}" class="{if $content.language==$lang.0}current_lang{/if}">{$lang.3}</a></li>
			{/foreach}
		</ul>
	</div>
</div>
{/if}
{*

	How to use this module:
	
	Add a code block like this to your ~/templates/main.tpl inside a section.row element:
	
		{include file=modules/languages.tpl
			property=value
			...
		}
	
	You can use the following properties and values:
	align: left (default)|center|right|justify
	valign: top (default)|bottom|middle
	clear: none (default)|left|right
	width: auto (default) | one_half | three_quarters | four_fifths | three_fifths | two_fifths | one_fifth | one_quarter | two_thirds | one_third
	
*}
