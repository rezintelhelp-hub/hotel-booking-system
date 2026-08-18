{assign var=hide_stock_threshold value=1000}
{assign var=warning_stock_threshold value=10}
{if $type=="simple"}
<div class="simpleProduct clearfix" data-datalayer-price="{$price}" data-datalayer-name="{$name}" data-datalayer-productid="{$code}">
	
	<div class="productInner">
	<p class="stockAndPrice">
	<span class="price">{$curSym}{$price}{if $checkout_tax && $add_tax && $indicate_net&&!$tax_exempt} <span class="salestax">+ {$sales_tax_name}</span>{/if}
	{if $theme_vars_show_oxipay_prices}
	<script id="oxipay-price-info" src="https://widgets.oxipay.co.nz/content/scripts/payments.js?productPrice={$price}"></script>
	{/if}
	</span> 
	{if !$digital}
	{if $in_stock<$hide_stock_threshold && $theme_vars_hide_stock_levels==0}
	<span class="stock {if $in_stock<$warning_stock_threshold}warning{/if}">{$langs.In_Stock}: <strong>{$in_stock}</strong></span>
	{/if}
	{/if}
	</p>
	{if $theme_vars_show_qty_inputs}
	<label class="label product-quantity-label"><span>{$langs.Quantity}: </span>
		<input type="text" maxlength="4" {if $only_sell_if_in_stock}data-max="{$in_stock}"{/if} title="{$langs.Quantity}" name="quantity" class="input product-quantity-input" value="1"/>
		<span class="product-quantity-plus">+</span>
		<span class="product-quantity-minus">-</span>
	</label>
	<div class="clear"></div>
	{/if}
	{if $only_sell_if_in_stock && $in_stock==0}
		{if $theme_vars_hide_stock_levels==1}
		<p class="Icon_Alert">{if $sold_out_message==""}{$langs.Currently_Unavailable}{else}{$sold_out_message}{/if}</p>
		{/if}
	{else}
		<p class="button">
			<a href="/actions/AddToBasket/?id={$code}{if $pic_url!=""}&amp;pic_url={$pic_url|htmlspecialchars}{/if}{if $url_str!=""}&amp;url_str={$url_str|htmlspecialchars}{/if}" class='addToBasketLink'>{$langs.Add_To_Basket}</a>
		</p>
	{/if}
	
	</div>
</div>
{/if}
{if $type=="simple_multi"}
<form action="/actions/AddToBasket/" method="post" class="addToBasketForm clearfix multi {if $only_sell_if_in_stock}only-sell-if-in-stock{/if}" data-datalayer-price="{$price}" data-datalayer-name="{$name}" data-datalayer-productid="{$code}">
	<div class="productInner">

	<select name="variant_price" {if $separate_stock_for_options}class="separateOptionStock" data-product-code="{$code}"{/if}>
	
	{if $separate_stock_for_options}<option value="" selected>{$langs.Please_Choose|htmlspecialchars}</option>{/if}
	
	{foreach from=$variants item=variant key=key name=loop1}
		<option value="{$variant.name|htmlentities}" {if ($variant.stock==""||$variant.stock=="0") && $separate_stock_for_options && $only_sell_if_in_stock}disabled{/if} {if $separate_stock_for_options}data-stock="{if $variant.stock==""}0{else}{$variant.stock}{/if}"{/if} data-datalayer-price="{$variant.price}">{$variant.name} ({$curSym}{$variant.price}{if $checkout_tax && $add_tax && $indicate_net&&!$tax_exempt} + {$sales_tax_name}{/if}) {if ($variant.stock==""||$variant.stock=="0") && $separate_stock_for_options && $only_sell_if_in_stock} - {if $sold_out_message==""}{$langs.Currently_Unavailable}{else}{$sold_out_message}{/if}{/if}</option>
	{/foreach}
	</select>
	
	{if (!$separate_stock_for_options && $in_stock<$hide_stock_threshold) || ($separate_stock_for_options && $variants[0].stock<$hide_stock_threshold)}
	{if  $theme_vars_hide_stock_levels==0}
	<p class="stockAndPrice" data-warning-threshold="{$warning_stock_threshold}"><span class="stock {if $separate_stock_for_options}{if $variants[0].stock<$warning_stock_threshold}warning{/if}{else}{if $in_stock<$warning_stock_threshold}warning{/if}{/if}">{$langs.In_Stock}: <strong class="updateWithOptionStock" id="updateWithOptionStock{$code}">{if $separate_stock_for_options}{$variants[0].stock}{else}{$in_stock}{/if}</strong></span></p>
	{/if}
	{/if}
	{if $theme_vars_show_qty_inputs}
	<label class="label product-quantity-label"><span>{$langs.Quantity}: </span>
		<input type="text" maxlength="4" {if $only_sell_if_in_stock}data-max="{$in_stock}"{/if} title="{$langs.Quantity}" name="quantity" class="input product-quantity-input" value="1"/>
		<span class="product-quantity-plus">+</span>
		<span class="product-quantity-minus">-</span>
	</label>
	<div class="clear"></div>
	{/if}
	{if $only_sell_if_in_stock && $in_stock==0 && !$separate_stock_for_options}
		{if $theme_vars_hide_stock_levels==1}
		<p class="Icon_Alert">{if $sold_out_message==""}{$langs.Currently_Unavailable}{else}{$sold_out_message}{/if}</p>
		{/if}
	{else}
		<p class="button submit_form hide_if_no_js {if  $only_sell_if_in_stock && $separate_stock_for_options}hide-if-no-stock{/if}" {if $separate_stock_for_options}style="display:none"{/if}>
			<a href="#" class=''>{$langs.Add_To_Basket}</a>
		</p>
		{*{if $theme_vars_hide_stock_levels==1 && $only_sell_if_in_stock && $separate_stock_for_options}
		<p class="Icon_Alert out-of-stock currently-unavailable" style="display:none">{if $sold_out_message==""}{$langs.Currently_Unavailable}{else}{$sold_out_message}{/if}</p>
		{/if}*}
	{/if}

	<input type="hidden" name="id" value="{$code}"/> 
	{if $pic_url!=""}<input type="hidden" name="pic_url" value="{$pic_url}"/>{/if}
	{if $url_str!=""}<input type="hidden" name="url_str" value="{$url_str}"/>{/if}

	<input type="submit" value="{$langs.Add_To_Basket}" class="contact-form-hide-with-js"/>

	</div>
</form>
{/if}
{if $type=="donation"}
<form action="/actions/AddToBasket/" method="post" class="addToBasketForm clearfix donation" data-datalayer-name="{$name}" data-datalayer-productid="{$code}">
	{if $pic_url!=""}
	<input type="hidden" name="pic_url" value="{$pic_url}" />
	{/if}
	{if $url_str!=""}
	<input type="hidden" name="url_str" value="{$url_str}" />	
	{/if}
	<div class="productInner">	
		<input type='text' name='donation_price' class='donationInput' value='{$curSym}{$price}'/>
	
		<p class="button submit_form hide_if_no_js"><a href="#">{$langs.Add_To_Basket}</a></p>
		<input type="submit" value="{$langs.Add_To_Basket}" class="contact-form-hide-with-js"/>
	</div>

	<input type="hidden" name="id" value="{$code}"/></form>
{/if}
{if $type=="gallery"}
<form action="/actions/AddToBasket/" method="post" class="clearfix shopGalleryVariant addToBasketForm prodid{$code}" name="galId{$gal_id}" data-datalayer-price="{$price}" data-datalayer-name="{$name}" data-datalayer-productid="{$code}"><span class="galId{$gal_id}title" style="display:none;"></span>{if $url_str!=""}<input type="hidden" name="url_str" value="{$url_str}"/>{/if}<input type="hidden" class="galId{$gal_id}input" name="variant"/><input type="hidden" name="id" value="{$code}"/>
<div class="productInner">
	<p class="stockAndPrice">
	<span class="price">{$curSym}{$price} {if $checkout_tax && $add_tax && $indicate_net&&!$tax_exempt}<span class="salestax">+ {$sales_tax_name}</span>{/if}</span> 
	{if $in_stock<$hide_stock_threshold && $theme_vars_hide_stock_levels==0}
	<span class="stock {if $in_stock<$warning_stock_threshold}warning{/if}">{$langs.In_Stock}: <strong>{$in_stock}</strong></span>
	{/if}
	</p>
	{if $only_sell_if_in_stock && $in_stock==0}
		{if $theme_vars_hide_stock_levels==1}
		<p class="Icon_Alert">{if $sold_out_message==""}{$langs.Currently_Unavailable}{else}{$sold_out_message}{/if}</p>
		{/if}
	{else}
		<p class="button submit_form hide_if_no_js"><a href="#">{$langs.Add_To_Basket}</a></p>
	{/if}
	<input type="submit" value="{$langs.Add_To_Basket}" class="contact-form-hide-with-js"/>
</div>
<noscript>{$langs.Javascript_Warning}</noscript></form>
{/if}
{if $type=="gallery_multi"}
<form accept-charset="utf-8" charset="utf-8"  action="/actions/AddToBasket/" method="post" class="clearfix shopGalleryVariant addToBasketForm prodid{$code}" name="galId{$gal_id}" data-datalayer-name="{$name}" data-datalayer-productid="{$code}">
	<span class="galId{$gal_id}title" style="display:none;"></span>
	{if $url_str!=""}<input type="hidden" name="url_str" value="{$url_str}"/>{/if}
	<input type="hidden" class="galId{$gal_id}input" name="variant"/>
	<input type="hidden" name="id" value="{$code}"/>
	<select name="variant_price" {if $separate_stock_for_options}class="separateOptionStock" data-product-code="{$code}"{/if}>
			{if $separate_stock_for_options}<option value="" selected>{$langs.Please_Choose|htmlspecialchars}</option>{/if}
	{foreach from=$variants item=variant key=key name=loop1}
		<option value="{$variant.name|htmlentities}" {if ($variant.stock==""||$variant.stock=="0") && $separate_stock_for_options && $only_sell_if_in_stock}disabled{/if} {if $separate_stock_for_options}data-stock="{$variant.stock}"{/if} data-datalayer-price="{$variant.price}">{$variant.name} ({$curSym}{$variant.price}{if $checkout_tax && $add_tax && $indicate_net&&!$tax_exempt} + {$sales_tax_name}{/if}){if ($variant.stock==""||$variant.stock=="0") && $separate_stock_for_options && $only_sell_if_in_stock} - {if $sold_out_message==""}{$langs.Currently_Unavailable}{else}{$sold_out_message}{/if}{/if}</option>
	{/foreach}
	</select>
	
	{if (!$separate_stock_for_options && $in_stock<$hide_stock_threshold) || ($separate_stock_for_options && $variants[0].stock<$hide_stock_threshold)}
	{if  $theme_vars_hide_stock_levels==0}<p class="stockAndPrice" data-warning-threshold="{$warning_stock_threshold}"><span class="stock {if $separate_stock_for_options}{if $variants[0].stock<$warning_stock_threshold}warning{/if}{else}{if $in_stock<$warning_stock_threshold}warning{/if}{/if}">{$langs.In_Stock}: <strong class="updateWithOptionStock" id="updateWithOptionStock{$code}">{if $separate_stock_for_options}{$variants[0].stock}{else}{$in_stock}{/if}</strong></span></p>{/if}
	{/if}
	

	{if $only_sell_if_in_stock && $in_stock==0 && !$separate_stock_for_options}
		{if $theme_vars_hide_stock_levels==1}
		<p class="Icon_Alert">{if $sold_out_message==""}{$langs.Currently_Unavailable}{else}{$sold_out_message}{/if}</p>
		{/if}
	{else}
		<p class="button submit_form hide_if_no_js {if  $only_sell_if_in_stock && $separate_stock_for_options}hide-if-no-stock{/if}" {if $separate_stock_for_options}style="display:none"{/if}>
			<a href="#" class=''>{$langs.Add_To_Basket}</a>
		</p>
		{*{if $theme_vars_hide_stock_levels==1 && $only_sell_if_in_stock && $separate_stock_for_options}
		<p class="Icon_Alert out-of-stock currently-unavailable" {if $only_sell_if_in_stock && $separate_stock_for_options && ($variants[0].stock==0||$variants[0].stock=="")}style="display:block"{else}style="display:none"{/if}>{if $sold_out_message==""}{$langs.Currently_Unavailable}{else}{$sold_out_message}{/if}</p>
		{/if}*}
	{/if}
	<input type="submit" value="{$langs.Add_To_Basket}" class="contact-form-hide-with-js"/>
	

</form>
{/if}
