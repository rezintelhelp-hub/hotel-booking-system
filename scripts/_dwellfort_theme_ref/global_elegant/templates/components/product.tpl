{if $type=="simple"}
<div class="simpleProduct clearfix">
	<div class="productInner">
	<p class="stockAndPrice">
	<span class="price">{$curSym}{$price}</span>
	{if $in_stock<$theme_vars_hide_stock_threshold}
	<span class="stock {if $in_stock<$theme_vars_warning_stock_threshold}warning{/if}">{$langs.In_Stock}: <strong>{$in_stock}</strong></span>
	{/if}
	</p>
	<p class="button">
		<a href="/actions/AddToBasket/?id={$code}{if $pic_url!=""}&amp;pic_url={$pic_url}{/if}{if $url_str!=""}&amp;url_str={$url_str}{/if}" class='addToBasketLink'>{$langs.Add_To_Basket}</a>
	</p>
	</div>
</div>
{/if}
{if $type=="simple_multi"}
<form action="/actions/AddToBasket/" method="post" class="addToBasketForm clearfix multi">
	<div class="productInner">

	<select name="variant_price" {if $separate_stock_for_options}class="separateOptionStock" data-product-code="{$code}"{/if}>
	{foreach from=$variants item=variant key=key name=loop1}
		<option value="{$variant.name|htmlspecialchars}" {if $separate_stock_for_options}data-stock="{$variant.stock}"{/if}>{$variant.name} ({$curSym}{$variant.price})</option>
	{/foreach}
	</select>
	
	{if (!$separate_stock_for_options && $in_stock<$theme_vars_hide_stock_threshold) || ($separate_stock_for_options && $variants[0].stock<$theme_vars_hide_stock_threshold)}
	<p class="stockAndPrice" data-warning-threshold="{$theme_vars_warning_stock_threshold}"><span class="stock {if $separate_stock_for_options}{if $variants[0].stock<$theme_vars_warning_stock_threshold}warning{/if}{else}{if $in_stock<$theme_vars_warning_stock_threshold}warning{/if}{/if}">{$langs.In_Stock}: <strong class="updateWithOptionStock" id="updateWithOptionStock{$code}">{if $separate_stock_for_options}{$variants[0].stock}{else}{$in_stock}{/if}</strong></span></p>
	{/if}

	<p class="button submit_form hide_if_no_js">
		<a href="#" class=''>{$langs.Add_To_Basket}</a>
	</p>

	<input type="hidden" name="id" value="{$code}"/> 
	{if $pic_url!=""}<input type="hidden" name="pic_url" value="{$pic_url}"/>{/if}
	{if $url_str!=""}<input type="hidden" name="url_str" value="{$url_str}"/>{/if}

	<noscript><input type="submit" value="{$langs.Add_To_Basket}" /></noscript>

	</div>
</form>
{/if}
{if $type=="donation"}
<form action="/actions/AddToBasket/" method="post" class="addToBasketForm clearfix donation">
	{if $pic_url!=""}
	<input type="hidden" name="pic_url" value="{$pic_url}" />
	{/if}
	{if $url_str!=""}
	<input type="hidden" name="url_str" value="{$url_str}" />	
	{/if}
	<div class="productInner">	
		<input type='text' name='donation_price' class='donationInput' value='{$curSym}{$price}'/>
	
	<p class="button submit_form"><a href="#" class='addToBasketLink'>{$langs.Add_To_Basket}</a></p>
	</div>

	<input type="hidden" name="id" value="{$code}"/></form>
{/if}
{if $type=="gallery"}
<form action="/actions/AddToBasket/" method="post" class="clearfix shopGalleryVariant addToBasketForm" name="galId{$gal_id}"><span class="galId{$gal_id}title" style="display:none;"></span>{if $url_str!=""}<input type="hidden" name="url_str" value="{$url_str}"/>{/if}<input type="hidden" class="galId{$gal_id}input" name="variant"/><input type="hidden" name="id" value="{$code}"/>
<div class="productInner">
	<p class="stockAndPrice">
	<span class="price">{$curSym}{$price}</span>
	{if $in_stock<$theme_vars_hide_stock_threshold}
	<span class="stock {if $in_stock<$theme_vars_warning_stock_threshold}warning{/if}">{$langs.In_Stock}: <strong>{$in_stock}</strong></span>
	{/if}
	</p>
	<p class="button submit_form"><a href="#" class='addToBasketLink'>{$langs.Add_To_Basket}</a></p>
</div>
<noscript>{$langs.Javascript_Warning}</noscript></form>
{/if}
{if $type=="gallery_multi"}
<form action="/actions/AddToBasket/" method="post" class="clearfix shopGalleryVariant addToBasketForm" name="galId{$gal_id}">
	<span class="galId{$gal_id}title" style="display:none;"></span>
	{if $url_str!=""}<input type="hidden" name="url_str" value="{$url_str}"/>{/if}
	<input type="hidden" class="galId{$gal_id}input" name="variant"/>
	<input type="hidden" name="id" value="{$code}"/>
	<select name="variant_price" {if $separate_stock_for_options}class="separateOptionStock" data-product-code="{$code}"{/if}>
	{foreach from=$variants item=variant key=key name=loop1}
		<option value="{$variant.name|htmlspecialchars}" {if $separate_stock_for_options}data-stock="{$variant.stock}"{/if}>{$variant.name} ({$curSym}{$variant.price})</option>
	{/foreach}
	</select>
	
	{if (!$separate_stock_for_options && $in_stock<$theme_vars_hide_stock_threshold) || ($separate_stock_for_options && $variants[0].stock<$theme_vars_hide_stock_threshold)}
	<p class="stockAndPrice" data-warning-threshold="{$theme_vars_warning_stock_threshold}"><span class="stock {if $separate_stock_for_options}{if $variants[0].stock<$theme_vars_warning_stock_threshold}warning{/if}{else}{if $in_stock<$theme_vars_warning_stock_threshold}warning{/if}{/if}">{$langs.In_Stock}: <strong class="updateWithOptionStock" id="updateWithOptionStock{$code}">{if $separate_stock_for_options}{$variants[0].stock}{else}{$in_stock}{/if}</strong></span></p>
	{/if}

	<p class="button submit_form"><a href="#" class='addToBasketLink'>{$langs.Add_To_Basket}</a>
</p><noscript>{$langs.Javascript_Warning}</noscript></form>
{/if}
