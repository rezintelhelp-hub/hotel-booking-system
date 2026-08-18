<div data-position="{$pos}" class="{$pos} clearfix module search-module align-{$align}  {if $width}width width-{$width} width-valign-{$valign}{/if} {if !$width}valign-{$valign}{if $valign} valign{/if}{/if} {if $clear}clear-{$clear}{/if}">
	<form action="/actions/searchForward/">
		<input type="hidden" name="language" value="{$content.language}"/>
		<input class="search-input" type="search" maxlength="60" title="{$langs.Search}" name="string" value="" required="true" placeholder="{$langs.Search}" />
		<input type="submit" value="{$langs.Search}" class="search-form-hide-with-js"/>
		<p class="submit_form"><a href="#">{$langs.Search}</a></p>
	 </form>
</div>

{*

	How to use this module:
	
	Add a code block like this to your ~/templates/main.tpl inside a section.row element:
	
		{include file=modules/search.tpl
			property=value
			...
		}
	
	You can use the following properties and values:
	align: left (default)|center|right|justify
	valign: top (default)|bottom|middle
	clear: none (default)|left|right
	width: auto (default) | one_half | three_quarters | four_fifths | three_fifths | two_fifths | one_fifth | one_quarter | two_thirds | one_third
	
*}
		
