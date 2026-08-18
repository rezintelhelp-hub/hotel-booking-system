{include file="includes/shoppingbasket_gatewayposts.tpl"}
{include file="includes/shoppingbasket_gatewaycallbacks.tpl"}
{if $nocookie=="true"}
<p class="Icon_Alert" id="status">
	{$langs.Cookie_Error}
</p>
{/if}
{if $empty}
<p class="Icon_Alert" id="status">
	{$langs.Basket_Empty}
</p>
{/if}
{if $smarty.get.stocklimited}
<p class="Icon_Alert" id="status">
	{$langs.Stock_Limited}
</p>
{/if}
{if $smarty.post}
{if !$smarty.post.admin_place_order && !$smarty.post.gatewaypost && !$smarty.get.callbackswish && !$smarty.get.callbackeway && !$smarty.get.callbackpaymentexpress && !$smarty.request.callbackoxipay && !$smarty.request.backfromoxipay}
	{if $smarty.post.agree_terms}
		{agree_checkout_terms agree_terms="1"}
		{assign var="agree_terms" value="1"}
	{else}
		{agree_checkout_terms agree_terms="0"}
		{assign var="agree_terms" value="0"}
	{/if}
	{if $smarty.post.add_to_list}
		{agree_checkout_marketing add_to_list="1"}
		{assign var="add_to_list" value="1"}
	{else}
		{agree_checkout_marketing add_to_list="0"}
		{assign var="add_to_list" value="0"}
	{/if}
{/if}
{/if}
{if $google_maps_api_key&&$theme_vars_enable_autocomplete}
<script async
    src="https://maps.googleapis.com/maps/api/js?key={$google_maps_api_key}&libraries=places&callback=ss_initAutocomplete">
</script>
<input type="hidden" id="autocomplete_countries" value="[{$theme_vars_autocomplete_countries|htmlspecialchars}]"/>
{/if}
{if $orders}
{if !$smarty.post.admin_place_order && !$smarty.post.gatewaypost && !$smarty.get.callbackswish && !$smarty.get.callbackeway && !$smarty.get.callbackpaymentexpress && !$smarty.request.callbackoxipay && !$smarty.request.backfromoxipay}
{assign var=showqtys value=false}
{foreach from=$orders item=order key=key name=loop1}
	{if $order.allow_one=="no"}
	{assign var=showqtys value=true}
	{/if}
	{if $smarty.get.product_added==$order.product_code}
		<script>
			{if $order.variant}
			{literal}
				 if (typeof dataLayer != 'undefined'){
				dataLayer.push({"event":"addToBasket","productID":"{/literal}{$order.product_code}{literal}","productPrice":"{/literal}{$order.price}{literal}","productName":"{/literal}{$order.name|htmlspecialchars}{literal}","variantName":"{/literal}{$order.variant|htmlspecialchars}{literal}"});
				}
			{/literal}
			{else}
			{literal}
				 if (typeof dataLayer != 'undefined'){
				dataLayer.push({"event":"addToBasket","productID":"{/literal}{$order.product_code}{literal}","productPrice":"{/literal}{$order.price}{literal}","productName":"{/literal}{$order.name|htmlspecialchars}{literal}"});
				}
			{/literal}
			{/if}
			{literal}
			$(document).ready(function(){
				var url = window.location.pathname;
			window.history.pushState("",document.title, url);					
			});
			{/literal}

			
		</script>
	{/if}
{/foreach}
{assign var=coupon_in_use value=$smarty.request.coupon}
{assign var=shipping_in_use value=$smarty.request.chb_sh}
{if $smarty.post.step2}
	<p class="Icon_Back"><a href="">Back to basket</a></p>
{/if}
<div id="basketWrapper" {if $smarty.post.step2}class="step2"{/if}>
	<form action="/actions/UpdateQuantities/" method="post" id="quantityForm">
	{*
		{if !$smarty.post.step2}
		<div class="checkoutPsudoTable header">
			<div class="basketName checkoutTableCell">
				{$langs.Product_Name}
			</div>
			<div class="basketQuantity checkoutTableCell">
				{if $showqtys}{$langs.Quantity}{/if}
			</div>
			<div class="basketPrice checkoutTableCell">
				{$langs.Price}
			</div>
		</div>
		{/if}
		*}
		{assign var=ototalsgross value=$totals}
		{assign var=ototals value=$net_totals}
		{assign var=discount value=$basketdiscount}
		{assign var=discount_net value=$basketdiscount / (1 + ($basket_tax_amount / 100))}
		{if $basketdiscount!=0}
		{assign var=discount_restrict_fixed value=$basketdiscount}
		{/if}
		{if $theme_vars_enabled_coupons&&$basketdiscount==0}


			{if $coupon_in_use}

				{assign var=found value=false}
				{assign var=discounttotals value=$net_totals}
			
				{* Code 1 *}
				{assign var=codes value=","|explode:$theme_vars_discount_1_codes}
				{foreach from=$codes item=code name=codes}
					{if $code==$coupon_in_use && ($theme_vars_coupon_1_expire==""||($theme_vars_coupon_1_expire!="" && $theme_vars_coupon_1_expire|strtotime > $smarty.now-86400 ))}
						{assign var=discount_restrict_to_cats value=","|explode:$theme_vars_percentage_1_restrict}
						{assign var=discount_restrict_pc value=$theme_vars_percentage_1_discount}
						{assign var=discount_restrict_fixed value=$theme_vars_fixed_1_discount}
						{assign var=found value=true}
					{/if}
				{/foreach}
			
				{* Code 2 *}
				{assign var=codes value=","|explode:$theme_vars_discount_2_codes}
				{foreach from=$codes item=code name=codes}
					{if $code==$coupon_in_use && ($theme_vars_coupon_2_expire==""||($theme_vars_coupon_2_expire!="" && $theme_vars_coupon_2_expire|strtotime > $smarty.now-86400 ))}
						{assign var=discount_restrict_to_cats value=","|explode:$theme_vars_percentage_2_restrict}
						{assign var=discount_restrict_pc value=$theme_vars_percentage_2_discount}
						{assign var=discount_restrict_fixed value=$theme_vars_fixed_2_discount}
						{assign var=found value=true}
					{/if}
				{/foreach}
			
				{* Code 3 *}
				{assign var=codes value=","|explode:$theme_vars_discount_3_codes}
				{foreach from=$codes item=code name=codes}
					{if $code==$coupon_in_use && ($theme_vars_coupon_3_expire==""||($theme_vars_coupon_3_expire!="" && $theme_vars_coupon_3_expire|strtotime > $smarty.now-86400) )}

						
						{assign var=discount_restrict_to_cats value=","|explode:$theme_vars_percentage_3_restrict}
						{assign var=discount_restrict_pc value=$theme_vars_percentage_3_discount}
						{assign var=discount_restrict_fixed value=$theme_vars_fixed_3_discount}
						{assign var=found value=true}
					{/if}
				{/foreach}
			
				{* Code 4 *}		
				{assign var=codes value=","|explode:$theme_vars_discount_4_codes}
				{foreach from=$codes item=code name=codes}
					{if $code==$coupon_in_use && ($theme_vars_coupon_4_expire==""||($theme_vars_coupon_4_expire!="" && $theme_vars_coupon_4_expire|strtotime > $smarty.now-86400) )}



						{assign var=discount_restrict_to_cats value=","|explode:$theme_vars_percentage_4_restrict}
						{assign var=discount_restrict_pc value=$theme_vars_percentage_4_discount}
						{assign var=discount_restrict_fixed value=$theme_vars_fixed_4_discount}
						{assign var=found value=true}
					{/if}
				{/foreach}
			
				{* Code 5 *}		
				{assign var=codes value=","|explode:$theme_vars_discount_5_codes}
				{foreach from=$codes item=code name=codes}
					{if $code==$coupon_in_use && ($theme_vars_coupon_5_expire==""||($theme_vars_coupon_5_expire!="" && $theme_vars_coupon_5_expire|strtotime > $smarty.now-86400) )}

						
						{assign var=discount_restrict_to_cats value=","|explode:$theme_vars_percentage_5_restrict}
						{assign var=discount_restrict_pc value=$theme_vars_percentage_5_discount}
						{assign var=discount_restrict_fixed value=$theme_vars_fixed_5_discount}
						{assign var=found value=true}
					{/if}
				{/foreach}
				
				{* Code 6 *}
				{assign var=codes value=","|explode:$theme_vars_discount_6_codes}
				{foreach from=$codes item=code name=codes}
					{if $code==$coupon_in_use && ($theme_vars_coupon_6_expire==""||($theme_vars_coupon_6_expire!="" && $theme_vars_coupon_6_expire|strtotime > $smarty.now-86400 ))}
						{assign var=discount_restrict_to_cats value=","|explode:$theme_vars_percentage_6_restrict}
						{assign var=discount_restrict_pc value=$theme_vars_percentage_6_discount}
						{assign var=discount_restrict_fixed value=$theme_vars_fixed_6_discount}						
						{assign var=found value=true}
					{/if}
				{/foreach}
			
				{* Code 7 *}
				{assign var=codes value=","|explode:$theme_vars_discount_7_codes}
				{foreach from=$codes item=code name=codes}
					{if $code==$coupon_in_use && ($theme_vars_coupon_7_expire==""||($theme_vars_coupon_7_expire!="" && $theme_vars_coupon_7_expire|strtotime > $smarty.now-86400) )}
						{assign var=discount_restrict_to_cats value=","|explode:$theme_vars_percentage_7_restrict}
						{assign var=discount_restrict_pc value=$theme_vars_percentage_7_discount}
						{assign var=discount_restrict_fixed value=$theme_vars_fixed_7_discount}
						{assign var=found value=true}
					{/if}
				{/foreach}
			
				{* Code 8 *}		
				{assign var=codes value=","|explode:$theme_vars_discount_8_codes}
				{foreach from=$codes item=code name=codes}
					{if $code==$coupon_in_use && ($theme_vars_coupon_8_expire==""||($theme_vars_coupon_8_expire!="" && $theme_vars_coupon_8_expire|strtotime > $smarty.now-86400) )}

						
						{assign var=discount_restrict_to_cats value=","|explode:$theme_vars_percentage_8_restrict}
						{assign var=discount_restrict_pc value=$theme_vars_percentage_8_discount}
						{assign var=discount_restrict_fixed value=$theme_vars_fixed_8_discount}
						{assign var=found value=true}
					{/if}
				{/foreach}
			
				{* Code 9 *}		
				{assign var=codes value=","|explode:$theme_vars_discount_9_codes}
				{foreach from=$codes item=code name=codes}
					{if $code==$coupon_in_use && ($theme_vars_coupon_9_expire==""||($theme_vars_coupon_9_expire!="" && $theme_vars_coupon_9_expire|strtotime > $smarty.now-86900) )}

						
						
						{assign var=discount_restrict_to_cats value=","|explode:$theme_vars_percentage_9_restrict}
						{assign var=discount_restrict_pc value=$theme_vars_percentage_9_discount}
						{assign var=discount_restrict_fixed value=$theme_vars_fixed_9_discount}
						{assign var=found value=true}
					{/if}
				{/foreach}

				{* Code 10 *}		
				{assign var=codes value=","|explode:$theme_vars_discount_10_codes}
				{foreach from=$codes item=code name=codes}
					{if $code==$coupon_in_use && ($theme_vars_coupon_10_expire==""||($theme_vars_coupon_10_expire!="" && $theme_vars_coupon_10_expire|strtotime > $smarty.now-86400 ))}

						
						{assign var=discount_restrict_to_cats value=","|explode:$theme_vars_percentage_10_restrict}
						{assign var=discount_restrict_pc value=$theme_vars_percentage_10_discount}
						{assign var=discount_restrict_fixed value=$theme_vars_fixed_10_discount}
						{assign var=found value=true}
					{/if}
				{/foreach}
				


			{/if}
		{/if}
		{assign var=elligableonlydiscounts value=0}
		{assign var=elligableonlyfixeddiscounttotal value=0}
		{assign var=taxableafterdiscounts value=0}
		
		{foreach from=$orders item=item key=key name=loop1}
		{if $item.product_code!="TAX"&&$item.product_code!="SHIPPING"}

		<div class="checkoutPsudoTable">
			<div class="basketName checkoutTableCell">
				{if $item.pic_url}
				{if $item.url_str}<a href="{$item.url_str}">{/if}
				<img src="{$item.pic_url}?width=120&height=120&shrink=false" class="basketThumb" />

				{if $item.url_str}</a>{/if}
				{/if}
				{if $smarty.post.step2}{$item.quantity} x {/if}
				{if $item.url_str}<a href="{$item.url_str}">{/if}<strong>{$item.name}</strong>{if $item.url_str}</a>{/if}<br/>
				{if $item.variant!=""}{$item.variant}<br/>{/if}
				{if $item.dates}
				<div class="clearfix">{foreach from=$item.dates item=date key=key name=loop1}
							<div class="checkoutBookingProductDate" >{$date|date_format}</div>
				{/foreach}</div>

				{foreach from=$item.people item=person}
					<div class="checkoutBookingPerson">
						{foreach from=$person item=field}
							<strong>{$field.0}</strong> {$field.1}<br/>
						{/foreach}
					</div>
				{/foreach}
				{/if}
			</div>
			{if !$smarty.post.step2}
			<div class="basketQuantity checkoutTableCell">
				{if $item.basket_limit>1||$item.basket_limit==0}
				<span class="quantityDropdown"><span class="dropdownDisp">{$item.quantity}</span> <span class="down-arrow">M</span><select name="" data-update="lineitem_qty_{$item.id}">
				<option {if $item.quantity=="1"}selected{/if}>1</option>
				{if $item.basket_limit>=2||$item.basket_limit==0}<option {if $item.quantity=="2"}selected{/if}>2</option>{/if}
				{if $item.basket_limit>=3||$item.basket_limit==0}<option {if $item.quantity=="3"}selected{/if}>3</option>{/if}
				{if $item.basket_limit>=4||$item.basket_limit==0}<option {if $item.quantity=="4"}selected{/if}>4</option>{/if}
				{if $item.basket_limit>=5||$item.basket_limit==0}<option {if $item.quantity=="5"}selected{/if}>5</option>{/if}
				{if $item.basket_limit>=6||$item.basket_limit==0}<option {if $item.quantity=="6"}selected{/if}>6</option>{/if}
				{if $item.basket_limit>=7||$item.basket_limit==0}<option {if $item.quantity=="7"}selected{/if}>7</option>{/if}
				{if $item.basket_limit>=8||$item.basket_limit==0}<option {if $item.quantity=="8"}selected{/if}>8</option>{/if}
				{if $item.basket_limit>=9||$item.basket_limit==0}<option {if $item.quantity=="9"}selected{/if}>9</option>{/if}
				{if $item.basket_limit>=10||$item.basket_limit==0}<option {if $item.quantity>10}selected{/if}>10+</option>{/if}
				</select>
				</span>
				<span class="quantityWrapper">{*<label class="narrowQty" for="lineitem_qty_{$item.id}">{$langs.Quantity}:</label>*}<input id="lineitem_qty_{$item.id}" type="text" name="{$item.id}" value="{$item.quantity}" class="quantity" /></span>
				{else}
				<input id="lineitem_qty_{$item.id}" type="hidden" name="{$item.id}" value="{$item.quantity}" class="quantity" />
				{/if}
			</div>
			{/if}
			<div class="basketPrice checkoutTableCell">
				{if $found||$basketdiscount!=0}

					{assign var=elligblefordiscount value=false}
					{assign var=elligblefordiscountfixed value=false}
					{if $basketdiscount!=0}
						{assign var=elligblefordiscountfixed value=$basketdiscount}
					{/if}
					{foreach from=$discount_restrict_to_cats item=restrictcat}
						{assign var="incattags" value=","|explode:$item.product_in_categories_tags}
						{foreach from=$incattags item=cattag}
							{if $cattag==$restrictcat|trim || $restrictcat|trim==""}
								{if $discount_restrict_fixed!=0}
									{assign var=elligblefordiscountfixed value=$discount_restrict_fixed}
								{else}
									{assign var=elligblefordiscount value=$discount_restrict_pc}
								{/if}
							{/if}
						{/foreach}
						{foreach from=$item.product_in_categories item=incat}
							{if $product_categories[$incat].name==$restrictcat|trim || $restrictcat|trim==""}
								{if $discount_restrict_fixed!=0}
									{assign var=elligblefordiscountfixed value=$discount_restrict_fixed}
								{else}
									{assign var=elligblefordiscount value=$discount_restrict_pc}
								{/if}
							{/if}
						{/foreach}
						{if $item.product_in_categories|@count==0 && $restrictcat|trim==""} 
							{if $discount_restrict_fixed!=0&&$discount_restrict_fixed!=""}
								{assign var=elligblefordiscountfixed value=$discount_restrict_fixed}
							{else}
								{assign var=elligblefordiscount value=$discount_restrict_pc}
							{/if}
						{/if}
					{/foreach}
					

					{if $elligblefordiscount}

						{*{if $include_tax_in_lists}{math assign="discount" equation="p * d / 100" p=$elligblefordiscount d=$item.oprice}{else}*}{math assign="discount" equation="p * d / 100" p=$elligblefordiscount d=$item.price}{*{/if}*}
						{math assign=elligableonlydiscounts equation="x+y*z" x=$elligableonlydiscounts y=$discount z=$item.quantity}
						{if $item.original_price!="0.00"}<strike>{$currency_sym}
						{if $include_tax_in_lists}
							{if $basket_tax_add&&(!$non_default_currency||$basket_tax_amount!=0)}{* if we are adding tax to prices in lists and baske currency is ok for tax *}
							{"%i"|money_format:$item.original_price_inctax}
							{else}
							{"%i"|money_format:$item.original_price}
							{/if}
						{else}
							{"%i"|money_format:$item.original_price_net} {*list original price without tax *}
						{/if}
						</strike>{/if}
						{$currency_sym}
						{if $include_tax_in_lists}
							{if $basket_tax_add&&(!$non_default_currency||$basket_tax_amount!=0)} {* adding tax to value *}
								{assign var=price value=$item.inctax-$discount}
								{"%i"|money_format:$item.inctax}
							{else}
								{assign var=price value=$item.oprice-$discount}
								{"%i"|money_format:$item.oprice} {* gross price, original value *}
							{/if}
						{else}
							{assign var=price value=$item.price-$discount}
							{"%i"|money_format:$item.price} {* net price *}
						{/if}
						{if $item.tax_exempt==0}
							{math assign=taxableafterdiscounts equation="x+(b-y)*z" x=$taxableafterdiscounts y=$discount b=$item.price z=$item.quantity}
						{/if}
					{elseif $elligblefordiscountfixed}

						{* {$currency_sym}{if $include_tax_in_lists}{if $basket_tax_add}{"%i"|money_format:$item.inctax}{else}{"%i"|money_format:$item.oprice}{/if}{else}{"%i"|money_format:$item.price}{/if} *}
						{if $item.original_price!="0.00"}<strike>{$currency_sym}
						{if $include_tax_in_lists}
							{if $basket_tax_add&&(!$non_default_currency||$basket_tax_amount!=0)}{* if we are adding tax to prices in lists and baske currency is ok for tax *}
							{"%i"|money_format:$item.original_price_inctax}
							{else}
							{"%i"|money_format:$item.original_price}
							{/if}
						{else}
							{"%i"|money_format:$item.original_price_net} {*list original price without tax *}
						{/if}
						</strike>{/if}
						{$currency_sym}{strip}
						{/strip}{if $include_tax_in_lists}{strip}
							{/strip}{if $basket_tax_add&&(!$non_default_currency||$basket_tax_amount!=0)}{* adding tax to value *}{strip}
								{/strip}{"%i"|money_format:$item.inctax}
							{else}{strip}
								{/strip}{"%i"|money_format:$item.oprice} {* gross price, original value *}
							{/if}
						{else}{strip}
							{/strip}{"%i"|money_format:$item.price} {* net price *}
						{/if}{strip}
						{/strip}{math assign=elligableonlyfixeddiscounttotal equation="x+y*z" x=$elligableonlyfixeddiscounttotal y=$item.price z=$item.quantity}{strip}

						{/strip}
						{if $item.tax_exempt==0}
							{math assign=taxableafterdiscounts equation="x+b*z" x=$taxableafterdiscounts b=$item.price z=$item.quantity}
							{*{math assign=taxableafterdiscounts equation="x+(b-y)*z" x=$taxableafterdiscounts y=$elligblefordiscountfixed b=$item.oprice z=$item.quantity}*}
						{/if}
					{else}
						{* {$currency_sym}{if $include_tax_in_lists}{if $basket_tax_add}{"%i"|money_format:$item.inctax}{else}{"%i"|money_format:$item.oprice}{/if}{else}{"%i"|money_format:$item.price}{/if} *}
						{if $item.original_price!="0.00"}<strike>{$currency_sym}
						{if $include_tax_in_lists}
							{if $basket_tax_add&&(!$non_default_currency||$basket_tax_amount!=0)}{* if we are adding tax to prices in lists and baske currency is ok for tax *}
							{"%i"|money_format:$item.original_price_inctax}
							{else}
							{"%i"|money_format:$item.original_price}
							{/if}
						{else}
							{"%i"|money_format:$item.original_price_net} {*list original price without tax *}
						{/if}
						</strike>{/if}
						{$currency_sym}
						{if $include_tax_in_lists}
							{if $basket_tax_add&&(!$non_default_currency||$basket_tax_amount!=0)}{* adding tax to value *}
							{"%i"|money_format:$item.inctax}
							{else}
							{"%i"|money_format:$item.oprice} {* gross price, original value *}
							{/if}
						{else}
							{"%i"|money_format:$item.price} {* net price *}
						{/if}
						{if $item.tax_exempt==0}
							{math assign=taxableafterdiscounts equation="x+b*z" x=$taxableafterdiscounts b=$item.price z=$item.quantity}
						{/if}
					{/if}
				
				

				{else}
				{*<span class="narrowPrice">{$langs.Price}:</span>*}{if $item.original_price!="0.00"}<strike>{$currency_sym}{if $include_tax_in_lists}{if $basket_tax_add&&(!$non_default_currency||$basket_tax_amount!=0)}{"%i"|money_format:$item.original_price_inctax}{else}{"%i"|money_format:$item.original_price}{/if}{else}{"%i"|money_format:$item.original_price_net}{/if}</strike> {/if}{$currency_sym}{if $include_tax_in_lists}{if $basket_tax_add&&(!$non_default_currency||$basket_tax_amount!=0)}{"%i"|money_format:$item.inctax}{else}{"%i"|money_format:$item.oprice}{/if}{else}{"%i"|money_format:$item.price}{/if}
				{if $item.tax_exempt==0&&(!$non_default_currency||$basket_tax_amount!=0)}
					{math assign=taxableafterdiscounts equation="x+b*z" x=$taxableafterdiscounts b=$item.price z=$item.quantity}
				{/if}
				{/if}
				{if !$smarty.post.step2}
					<br/><a href="/actions/removeFromBasket/?ordersId={$item.id}" title="{$langs.Remove_From_Basket}">Remove</a>
				{/if}


			</div>
		</div>
		{/if}
		{/foreach}
		{if $elligableonlydiscounts}
			{assign var=discount value=$elligableonlydiscounts}
		{/if}
		{if $elligableonlyfixeddiscounttotal>0}
			{assign var=discount value=$discount_restrict_fixed}
		{/if}
		{if !$smarty.post.step2}
	<div class="checkoutPsudoTable">
		<div class="basketName checkoutTableCell">&nbsp;</div>
		<div class="basketQuantity checkoutTableCell">
		{if !$smarty.post.step2}
		<noscript><input type="submit" value="{$langs.Update_Quantities}"/></noscript>
		{/if}
			{*
			{if $showqtys}<p class="Button_Small" id="updateQuantitiesP"><a href="#" id="updateQuantities">{$langs.Update_Quantities}</a></p>{/if}
			*}
		</div>
		{/if}

		<div class="basketPrice checkoutTableCell">
		{if $elligableonlyfixeddiscounttotal>0||$basketdiscount!=0}
			<p><strong>Discount:</strong> {$currency_sym}-{"%i"|money_format:$discount}
		{/if}
		{if $elligableonlydiscounts>0}
			{if $include_tax_in_lists}
			{assign var="gross_price" value=$elligableonlydiscounts* (1 + ($basket_tax_amount / 100))}
			<p><strong>Discount:</strong> {$currency_sym}-{"%i"|money_format:$gross_price}
			{else}
			<p><strong>Discount:</strong> {$currency_sym}-{"%i"|money_format:$elligableonlydiscounts}
			{/if}
		{/if}
		{if $discount==""}
		{assign var=discount value=0}
		{assign var=discount_net value=0}
		{/if}
		{*{math assign=grossminusdiscount equation="x-y" x=$totalsinctax y=$discount}*}
		{if $include_tax_in_lists}
		{* this should be discount net value - discnout assumed to be gross figure *}
		{if $elligableonlydiscounts>0}
		{* if pc based discount , $discount is already net*}
		{assign var="discount_net" value=$discount}
		{else}
		{* otherwise its gross *}
		{assign var="discount_net" value=$discount / (1 + ($basket_tax_amount / 100))}
		{/if}
		{math assign=netminusdiscount equation="x-y" x=$totalsnet y=$discount_net}
		{else}
		{* everything is net until the end - discounts assumed to be net figure *}
		{assign var=discount_net value=$discount}
		{math assign=netminusdiscount equation="x-y" x=$totalsnet y=$discount_net}
		{/if}
		{*
		{if !$omit_tax && $basket_tax_enabled && !$non_default_currency}
		{if $include_tax_in_lists}
			<p><strong>{$langs.Sub_Total}:</strong> {if $discount}<strike>{$currency_sym}{"%i"|money_format:$totalsinctax}</strike>{/if} {$currency_sym}{"%i"|money_format:$grossminusdiscount}</p>
		{else}
		<p><strong>{$langs.Sub_Total}:</strong> {if $discount}<strike>{$currency_sym}{"%i"|money_format:$totalsnet}</strike>{/if} {$currency_sym}{"%i"|money_format:$netminusdiscount}</p>
		{/if}
		{/if}

		*}

		{if !$smarty.post.step2}
		</div>
		{/if}
			
	</div>
	</form>
	{capture assign="checkoutNext"}
	<div class="clearfix checkoutNext {if 
	(!$theme_vars_enable_shipping)
	||
	($theme_vars_enable_shipping&&$theme_vars_enable_shipping_explicit&&!$currency_explicit)
	||
	($non_default_currency)
	}no-shipping{/if}

			{if ($terms_enabled=="1"&&$terms_page!="0")||
				  ($shop_to_user_list&&$agree_text)
				}
				{else} no-consent
			{/if}
	">

		{if $theme_vars_enabled_coupons&&$basketdiscount==0}
		<div id="coupons" class="clearfix">
			<div id="discountCode" class="clearfix">

		
			{if $coupon_in_use}
			
				{if ($theme_vars_enable_shipping=="1"&&!$non_default_currency&&!$theme_vars_enable_shipping_explicit)||
				($theme_vars_enable_shipping=="1"&&!$non_default_currency&&$currency_explicit&&$theme_vars_enable_shipping_explicit)}
				
					{assign var=freetier1option1 value=false}
					{assign var=freetier1option2 value=false}
					{assign var=freetier1option3 value=false}
					{assign var=freetier1option4 value=false}
					{assign var=freetier1option5 value=false}
					{assign var=freetier1option6 value=false}
					{assign var=freetier1option7 value=false}
					{assign var=freetier1option8 value=false}
					{assign var=freetier1option9 value=false}
					{assign var=freetier1option10 value=false}
					
					{assign var=freetier2option1 value=false}
					{assign var=freetier2option2 value=false}
					{assign var=freetier2option3 value=false}
					{assign var=freetier2option4 value=false}
					{assign var=freetier2option5 value=false}
					{assign var=freetier2option6 value=false}
					{assign var=freetier2option7 value=false}
					{assign var=freetier2option8 value=false}
					{assign var=freetier2option9 value=false}
					{assign var=freetier2option10 value=false}

					{assign var=freetier3option1 value=false}
					{assign var=freetier3option2 value=false}
					{assign var=freetier3option3 value=false}
					{assign var=freetier3option4 value=false}
					{assign var=freetier3option5 value=false}
					{assign var=freetier3option6 value=false}
					{assign var=freetier3option7 value=false}
					{assign var=freetier3option8 value=false}
					{assign var=freetier3option9 value=false}
					{assign var=freetier3option10 value=false}
					
					{assign var=freetier4option1 value=false}
					{assign var=freetier4option2 value=false}
					{assign var=freetier4option3 value=false}
					{assign var=freetier4option4 value=false}
					{assign var=freetier4option5 value=false}
					{assign var=freetier4option6 value=false}
					{assign var=freetier4option7 value=false}
					{assign var=freetier4option8 value=false}
					{assign var=freetier4option9 value=false}
					{assign var=freetier4option10 value=false}
					
					{assign var=freetier5option1 value=false}
					{assign var=freetier5option2 value=false}
					{assign var=freetier5option3 value=false}
					{assign var=freetier5option4 value=false}
					{assign var=freetier5option5 value=false}
					{assign var=freetier5option6 value=false}
					{assign var=freetier5option7 value=false}
					{assign var=freetier5option8 value=false}
					{assign var=freetier5option9 value=false}
					{assign var=freetier5option10 value=false}
					
					{assign var=foundfreeshipping value=false}
									
					{if $coupon_in_use==$theme_vars_shipping_tier_1_option_1_free_code}
						{assign var=foundfreeshipping value=true}
						{assign var=freetier1option1 value=true}
					{/if}
					{if $coupon_in_use==$theme_vars_shipping_tier_1_option_2_free_code}
						{assign var=foundfreeshipping value=true}
						{assign var=freetier1option2 value=true}
					{/if}
					{if $coupon_in_use==$theme_vars_shipping_tier_1_option_3_free_code}
						{assign var=foundfreeshipping value=true}
						{assign var=freetier1option3 value=true}
					{/if}
					{if $coupon_in_use==$theme_vars_shipping_tier_1_option_4_free_code}
						{assign var=foundfreeshipping value=true}
						{assign var=freetier1option4 value=true}
					{/if}
					{if $coupon_in_use==$theme_vars_shipping_tier_1_option_5_free_code}
						{assign var=foundfreeshipping value=true}
						{assign var=freetier1option5 value=true}
					{/if}
					{if $coupon_in_use==$theme_vars_shipping_tier_1_option_6_free_code}
						{assign var=foundfreeshipping value=true}
						{assign var=freetier1option6 value=true}
					{/if}
					{if $coupon_in_use==$theme_vars_shipping_tier_1_option_7_free_code}
						{assign var=foundfreeshipping value=true}
						{assign var=freetier1option7 value=true}
					{/if}
					{if $coupon_in_use==$theme_vars_shipping_tier_1_option_8_free_code}
						{assign var=foundfreeshipping value=true}
						{assign var=freetier1option8 value=true}
					{/if}
					{if $coupon_in_use==$theme_vars_shipping_tier_1_option_9_free_code}
						{assign var=foundfreeshipping value=true}
						{assign var=freetier1option9 value=true}
					{/if}
					{if $coupon_in_use==$theme_vars_shipping_tier_1_option_10_free_code}
						{assign var=foundfreeshipping value=true}
						{assign var=freetier1option10 value=true}
					{/if}
					
					{if $coupon_in_use==$theme_vars_shipping_tier_2_option_1_free_code}
						{assign var=foundfreeshipping value=true}
						{assign var=freetier2option1 value=true}
					{/if}
					{if $coupon_in_use==$theme_vars_shipping_tier_2_option_2_free_code}
						{assign var=foundfreeshipping value=true}
						{assign var=freetier2option2 value=true}
					{/if}
					{if $coupon_in_use==$theme_vars_shipping_tier_2_option_3_free_code}
						{assign var=foundfreeshipping value=true}
						{assign var=freetier2option3 value=true}
					{/if}
					{if $coupon_in_use==$theme_vars_shipping_tier_2_option_4_free_code}
						{assign var=foundfreeshipping value=true}
						{assign var=freetier2option4 value=true}
					{/if}
					{if $coupon_in_use==$theme_vars_shipping_tier_2_option_5_free_code}
						{assign var=foundfreeshipping value=true}
						{assign var=freetier2option5 value=true}
					{/if}
					{if $coupon_in_use==$theme_vars_shipping_tier_2_option_6_free_code}
						{assign var=foundfreeshipping value=true}
						{assign var=freetier2option6 value=true}
					{/if}
					{if $coupon_in_use==$theme_vars_shipping_tier_2_option_7_free_code}
						{assign var=foundfreeshipping value=true}
						{assign var=freetier2option7 value=true}
					{/if}
					{if $coupon_in_use==$theme_vars_shipping_tier_2_option_8_free_code}
						{assign var=foundfreeshipping value=true}
						{assign var=freetier2option8 value=true}
					{/if}
					{if $coupon_in_use==$theme_vars_shipping_tier_2_option_9_free_code}
						{assign var=foundfreeshipping value=true}
						{assign var=freetier2option9 value=true}
					{/if}
					{if $coupon_in_use==$theme_vars_shipping_tier_2_option_10_free_code}
						{assign var=foundfreeshipping value=true}
						{assign var=freetier2option10 value=true}
					{/if}
					
					{if $coupon_in_use==$theme_vars_shipping_tier_3_option_1_free_code}
						{assign var=foundfreeshipping value=true}
						{assign var=freetier3option1 value=true}
					{/if}
					{if $coupon_in_use==$theme_vars_shipping_tier_3_option_2_free_code}
						{assign var=foundfreeshipping value=true}
						{assign var=freetier3option2 value=true}
					{/if}
					{if $coupon_in_use==$theme_vars_shipping_tier_3_option_3_free_code}
						{assign var=foundfreeshipping value=true}
						{assign var=freetier3option3 value=true}
					{/if}
					{if $coupon_in_use==$theme_vars_shipping_tier_2_option_4_free_code}
						{assign var=foundfreeshipping value=true}
						{assign var=freetier3option4 value=true}
					{/if}
					{if $coupon_in_use==$theme_vars_shipping_tier_3_option_5_free_code}
						{assign var=foundfreeshipping value=true}
						{assign var=freetier3option5 value=true}
					{/if}
					{if $coupon_in_use==$theme_vars_shipping_tier_3_option_6_free_code}
						{assign var=foundfreeshipping value=true}
						{assign var=freetier3option6 value=true}
					{/if}
					{if $coupon_in_use==$theme_vars_shipping_tier_3_option_7_free_code}
						{assign var=foundfreeshipping value=true}
						{assign var=freetier3option7 value=true}
					{/if}
					{if $coupon_in_use==$theme_vars_shipping_tier_3_option_8_free_code}
						{assign var=foundfreeshipping value=true}
						{assign var=freetier3option8 value=true}
					{/if}
					{if $coupon_in_use==$theme_vars_shipping_tier_3_option_9_free_code}
						{assign var=foundfreeshipping value=true}
						{assign var=freetier3option9 value=true}
					{/if}
					{if $coupon_in_use==$theme_vars_shipping_tier_3_option_10_free_code}
						{assign var=foundfreeshipping value=true}
						{assign var=freetier3option10 value=true}
					{/if}
					
					{if $coupon_in_use==$theme_vars_shipping_tier_4_option_1_free_code}
						{assign var=foundfreeshipping value=true}
						{assign var=freetier4option1 value=true}
					{/if}
					{if $coupon_in_use==$theme_vars_shipping_tier_4_option_2_free_code}
						{assign var=foundfreeshipping value=true}
						{assign var=freetier4option2 value=true}
					{/if}
					{if $coupon_in_use==$theme_vars_shipping_tier_4_option_3_free_code}
						{assign var=foundfreeshipping value=true}
						{assign var=freetier4option3 value=true}
					{/if}
					{if $coupon_in_use==$theme_vars_shipping_tier_2_option_4_free_code}
						{assign var=foundfreeshipping value=true}
						{assign var=freetier4option4 value=true}
					{/if}
					{if $coupon_in_use==$theme_vars_shipping_tier_4_option_5_free_code}
						{assign var=foundfreeshipping value=true}
						{assign var=freetier4option5 value=true}
					{/if}
					{if $coupon_in_use==$theme_vars_shipping_tier_4_option_6_free_code}
						{assign var=foundfreeshipping value=true}
						{assign var=freetier4option6 value=true}
					{/if}
					{if $coupon_in_use==$theme_vars_shipping_tier_4_option_7_free_code}
						{assign var=foundfreeshipping value=true}
						{assign var=freetier4option7 value=true}
					{/if}
					{if $coupon_in_use==$theme_vars_shipping_tier_4_option_8_free_code}
						{assign var=foundfreeshipping value=true}
						{assign var=freetier4option8 value=true}
					{/if}
					{if $coupon_in_use==$theme_vars_shipping_tier_4_option_9_free_code}
						{assign var=foundfreeshipping value=true}
						{assign var=freetier4option9 value=true}
					{/if}
					{if $coupon_in_use==$theme_vars_shipping_tier_4_option_10_free_code}
						{assign var=foundfreeshipping value=true}
						{assign var=freetier4option10 value=true}
					{/if}
					
					{if $coupon_in_use==$theme_vars_shipping_tier_5_option_1_free_code}
						{assign var=foundfreeshipping value=true}
						{assign var=freetier5option1 value=true}
					{/if}
					{if $coupon_in_use==$theme_vars_shipping_tier_5_option_2_free_code}
						{assign var=foundfreeshipping value=true}
						{assign var=freetier5option2 value=true}
					{/if}
					{if $coupon_in_use==$theme_vars_shipping_tier_5_option_3_free_code}
						{assign var=foundfreeshipping value=true}
						{assign var=freetier5option3 value=true}
					{/if}
					{if $coupon_in_use==$theme_vars_shipping_tier_2_option_4_free_code}
						{assign var=foundfreeshipping value=true}
						{assign var=freetier5option4 value=true}
					{/if}
					{if $coupon_in_use==$theme_vars_shipping_tier_5_option_5_free_code}
						{assign var=foundfreeshipping value=true}
						{assign var=freetier5option5 value=true}
					{/if}
					{if $coupon_in_use==$theme_vars_shipping_tier_5_option_6_free_code}
						{assign var=foundfreeshipping value=true}
						{assign var=freetier5option6 value=true}
					{/if}
					{if $coupon_in_use==$theme_vars_shipping_tier_5_option_7_free_code}
						{assign var=foundfreeshipping value=true}
						{assign var=freetier5option7 value=true}
					{/if}
					{if $coupon_in_use==$theme_vars_shipping_tier_5_option_8_free_code}
						{assign var=foundfreeshipping value=true}
						{assign var=freetier5option8 value=true}
					{/if}
					{if $coupon_in_use==$theme_vars_shipping_tier_5_option_9_free_code}
						{assign var=foundfreeshipping value=true}
						{assign var=freetier5option9 value=true}
					{/if}
					{if $coupon_in_use==$theme_vars_shipping_tier_5_option_10_free_code}
						{assign var=foundfreeshipping value=true}
						{assign var=freetier5option10 value=true}
					{/if}
				{/if}
				
				{if !$found && !$foundfreeshipping}
					<p class="Icon_Alert">Your coupon code is invalid.</p>

				{else}
					{if $foundfreeshipping}
					<p class="Icon_Tick">Success. You have enabled a free shipping coupon.</p>
					{else}
					<p class="Icon_Tick">Success. A discount has been applied to eligible items in your order.</p>
					{/if}
				{/if}
			{/if}
			{*<p><a href="#" id="showCouponCode">Have a coupon code?</a></p>*}
				{if !$found && !$foundfreeshipping}
			<form action="" method="request" id="couponForm" class="disnone-off">
				<input type='hidden' name='chb_sh' value="{$shipping_in_use}"/>
				<h4>Coupon code:</h4>
				<input type="text" id="coupondcodeinput" name="coupon" class="input" value="{$coupon_in_use}"/>
					<p class="Button_Medium submit_form hide_if_no_js" >
						<a href="#" class='' >Go</a>
					</p>
					<noscript><input type="submit" value="Apply code"/></noscript>
			</form>
			{/if}

			</div>

			</div>
		<form action="" method="post" class="checkoutStep2Form withCoupons">
		{else}
		<form action="" method="post" class="checkoutStep2Form">
		{/if}
		<input type="hidden" name="coupon" value="{$coupon_in_use}">
		<input type="hidden" name="agree_terms" value="{$agree_terms}">
		<input type="hidden" name="add_to_list" value="{$add_to_list}">
			<div class="checkoutFirstCol">
		<div class="clearfix checkoutShipping">

			{assign var=shipping value=0.00}
			{assign var=shipping_orig value=0.00}
			{assign var=totaltax value=0.00}
			{assign var=omit_tax value=false}

			{if $theme_vars_shipping_tier_1_option_1_price==""}{assign var=theme_vars_shipping_tier_1_option_1_price value=0}{/if}
			{if $theme_vars_shipping_tier_1_option_2_price==""}{assign var=theme_vars_shipping_tier_1_option_2_price value=0}{/if}
			{if $theme_vars_shipping_tier_1_option_3_price==""}{assign var=theme_vars_shipping_tier_1_option_3_price value=0}{/if}
			{if $theme_vars_shipping_tier_1_option_4_price==""}{assign var=theme_vars_shipping_tier_1_option_4_price value=0}{/if}
			{if $theme_vars_shipping_tier_1_option_5_price==""}{assign var=theme_vars_shipping_tier_1_option_5_price value=0}{/if}
			{if $theme_vars_shipping_tier_1_option_6_price==""}{assign var=theme_vars_shipping_tier_1_option_6_price value=0}{/if}
			{if $theme_vars_shipping_tier_1_option_7_price==""}{assign var=theme_vars_shipping_tier_1_option_7_price value=0}{/if}
			{if $theme_vars_shipping_tier_1_option_8_price==""}{assign var=theme_vars_shipping_tier_1_option_8_price value=0}{/if}
			{if $theme_vars_shipping_tier_1_option_9_price==""}{assign var=theme_vars_shipping_tier_1_option_9_price value=0}{/if}
			{if $theme_vars_shipping_tier_1_option_10_price==""}{assign var=theme_vars_shipping_tier_1_option_10_price value=0}{/if}

			{if $theme_vars_shipping_tier_2_option_1_price==""}{assign var=theme_vars_shipping_tier_2_option_1_price value=0}{/if}
			{if $theme_vars_shipping_tier_2_option_2_price==""}{assign var=theme_vars_shipping_tier_2_option_2_price value=0}{/if}
			{if $theme_vars_shipping_tier_2_option_3_price==""}{assign var=theme_vars_shipping_tier_2_option_3_price value=0}{/if}
			{if $theme_vars_shipping_tier_2_option_4_price==""}{assign var=theme_vars_shipping_tier_2_option_4_price value=0}{/if}
			{if $theme_vars_shipping_tier_2_option_5_price==""}{assign var=theme_vars_shipping_tier_2_option_5_price value=0}{/if}
			{if $theme_vars_shipping_tier_2_option_6_price==""}{assign var=theme_vars_shipping_tier_2_option_6_price value=0}{/if}
			{if $theme_vars_shipping_tier_2_option_7_price==""}{assign var=theme_vars_shipping_tier_2_option_7_price value=0}{/if}
			{if $theme_vars_shipping_tier_2_option_8_price==""}{assign var=theme_vars_shipping_tier_2_option_8_price value=0}{/if}
			{if $theme_vars_shipping_tier_2_option_9_price==""}{assign var=theme_vars_shipping_tier_2_option_9_price value=0}{/if}
			{if $theme_vars_shipping_tier_2_option_10_price==""}{assign var=theme_vars_shipping_tier_2_option_10_price value=0}{/if}

			{if $theme_vars_shipping_tier_3_option_1_price==""}{assign var=theme_vars_shipping_tier_3_option_1_price value=0}{/if}
			{if $theme_vars_shipping_tier_3_option_2_price==""}{assign var=theme_vars_shipping_tier_3_option_2_price value=0}{/if}
			{if $theme_vars_shipping_tier_3_option_3_price==""}{assign var=theme_vars_shipping_tier_3_option_3_price value=0}{/if}
			{if $theme_vars_shipping_tier_3_option_4_price==""}{assign var=theme_vars_shipping_tier_3_option_4_price value=0}{/if}
			{if $theme_vars_shipping_tier_3_option_5_price==""}{assign var=theme_vars_shipping_tier_3_option_5_price value=0}{/if}
			{if $theme_vars_shipping_tier_3_option_6_price==""}{assign var=theme_vars_shipping_tier_3_option_6_price value=0}{/if}
			{if $theme_vars_shipping_tier_3_option_7_price==""}{assign var=theme_vars_shipping_tier_3_option_7_price value=0}{/if}
			{if $theme_vars_shipping_tier_3_option_8_price==""}{assign var=theme_vars_shipping_tier_3_option_8_price value=0}{/if}
			{if $theme_vars_shipping_tier_3_option_9_price==""}{assign var=theme_vars_shipping_tier_3_option_9_price value=0}{/if}
			{if $theme_vars_shipping_tier_3_option_10_price==""}{assign var=theme_vars_shipping_tier_3_option_10_price value=0}{/if}

			{if $theme_vars_shipping_tier_4_option_1_price==""}{assign var=theme_vars_shipping_tier_4_option_1_price value=0}{/if}
			{if $theme_vars_shipping_tier_4_option_2_price==""}{assign var=theme_vars_shipping_tier_4_option_2_price value=0}{/if}
			{if $theme_vars_shipping_tier_4_option_3_price==""}{assign var=theme_vars_shipping_tier_4_option_3_price value=0}{/if}
			{if $theme_vars_shipping_tier_4_option_4_price==""}{assign var=theme_vars_shipping_tier_4_option_4_price value=0}{/if}
			{if $theme_vars_shipping_tier_4_option_5_price==""}{assign var=theme_vars_shipping_tier_4_option_5_price value=0}{/if}
			{if $theme_vars_shipping_tier_4_option_6_price==""}{assign var=theme_vars_shipping_tier_4_option_6_price value=0}{/if}
			{if $theme_vars_shipping_tier_4_option_7_price==""}{assign var=theme_vars_shipping_tier_4_option_7_price value=0}{/if}
			{if $theme_vars_shipping_tier_4_option_8_price==""}{assign var=theme_vars_shipping_tier_4_option_8_price value=0}{/if}
			{if $theme_vars_shipping_tier_4_option_9_price==""}{assign var=theme_vars_shipping_tier_4_option_9_price value=0}{/if}
			{if $theme_vars_shipping_tier_4_option_10_price==""}{assign var=theme_vars_shipping_tier_4_option_10_price value=0}{/if}

			{if $theme_vars_shipping_tier_5_option_1_price==""}{assign var=theme_vars_shipping_tier_5_option_1_price value=0}{/if}
			{if $theme_vars_shipping_tier_5_option_2_price==""}{assign var=theme_vars_shipping_tier_5_option_2_price value=0}{/if}
			{if $theme_vars_shipping_tier_5_option_3_price==""}{assign var=theme_vars_shipping_tier_5_option_3_price value=0}{/if}
			{if $theme_vars_shipping_tier_5_option_4_price==""}{assign var=theme_vars_shipping_tier_5_option_4_price value=0}{/if}
			{if $theme_vars_shipping_tier_5_option_5_price==""}{assign var=theme_vars_shipping_tier_5_option_5_price value=0}{/if}
			{if $theme_vars_shipping_tier_5_option_6_price==""}{assign var=theme_vars_shipping_tier_5_option_6_price value=0}{/if}
			{if $theme_vars_shipping_tier_5_option_7_price==""}{assign var=theme_vars_shipping_tier_5_option_7_price value=0}{/if}
			{if $theme_vars_shipping_tier_5_option_8_price==""}{assign var=theme_vars_shipping_tier_5_option_8_price value=0}{/if}
			{if $theme_vars_shipping_tier_5_option_9_price==""}{assign var=theme_vars_shipping_tier_5_option_9_price value=0}{/if}
			{if $theme_vars_shipping_tier_5_option_10_price==""}{assign var=theme_vars_shipping_tier_5_option_10_price value=0}{/if}

			{if ($theme_vars_enable_shipping=="1"&&!$non_default_currency&&!$theme_vars_enable_shipping_explicit)||
			($theme_vars_enable_shipping=="1"&&!$non_default_currency&&$currency_explicit&&$theme_vars_enable_shipping_explicit)}
				{if $basket_tax_enabled}
					{if $basket_tax_add}

						{math assign=shipping_tier_1_option_1_tax equation="((pc/100) * p)" p=$theme_vars_shipping_tier_1_option_1_price pc=$basket_tax_amount}
						{assign var=shipping_tier_1_option_1_net value=$theme_vars_shipping_tier_1_option_1_price+$cms_shipping_total}

						{math assign=shipping_tier_1_option_2_tax equation="((pc/100) * p)" p=$theme_vars_shipping_tier_1_option_2_price pc=$basket_tax_amount}
						{assign var=shipping_tier_1_option_2_net value=$theme_vars_shipping_tier_1_option_2_price+$cms_shipping_total}

						{math assign=shipping_tier_1_option_3_tax equation="((pc/100) * p)" p=$theme_vars_shipping_tier_1_option_3_price pc=$basket_tax_amount}
						{assign var=shipping_tier_1_option_3_net value=$theme_vars_shipping_tier_1_option_3_price+$cms_shipping_total}

						{math assign=shipping_tier_1_option_4_tax equation="((pc/100) * p)" p=$theme_vars_shipping_tier_1_option_4_price pc=$basket_tax_amount}
						{assign var=shipping_tier_1_option_4_net value=$theme_vars_shipping_tier_1_option_4_price+$cms_shipping_total}
						
						{math assign=shipping_tier_1_option_5_tax equation="((pc/100) * p)" p=$theme_vars_shipping_tier_1_option_5_price pc=$basket_tax_amount}
						{assign var=shipping_tier_1_option_5_net value=$theme_vars_shipping_tier_1_option_5_price+$cms_shipping_total}
						
						{math assign=shipping_tier_1_option_6_tax equation="((pc/100) * p)" p=$theme_vars_shipping_tier_1_option_6_price pc=$basket_tax_amount}
						{assign var=shipping_tier_1_option_6_net value=$theme_vars_shipping_tier_1_option_6_price+$cms_shipping_total}

						{math assign=shipping_tier_1_option_7_tax equation="((pc/100) * p)" p=$theme_vars_shipping_tier_1_option_7_price pc=$basket_tax_amount}
						{assign var=shipping_tier_1_option_7_net value=$theme_vars_shipping_tier_1_option_7_price+$cms_shipping_total}
						
						{math assign=shipping_tier_1_option_8_tax equation="((pc/100) * p)" p=$theme_vars_shipping_tier_1_option_8_price pc=$basket_tax_amount}
						{assign var=shipping_tier_1_option_8_net value=$theme_vars_shipping_tier_1_option_8_price+$cms_shipping_total}
						
						{math assign=shipping_tier_1_option_9_tax equation="((pc/100) * p)" p=$theme_vars_shipping_tier_1_option_9_price pc=$basket_tax_amount}
						{assign var=shipping_tier_1_option_9_net value=$theme_vars_shipping_tier_1_option_9_price+$cms_shipping_total}
						
						{math assign=shipping_tier_1_option_10_tax equation="((pc/100) * p)" p=$theme_vars_shipping_tier_1_option_10_price pc=$basket_tax_amount}
						{assign var=shipping_tier_1_option_10_net value=$theme_vars_shipping_tier_1_option_10_price+$cms_shipping_total}
						
						{math assign=shipping_tier_2_option_1_tax equation="((pc/100) * p)" p=$theme_vars_shipping_tier_2_option_1_price pc=$basket_tax_amount}
						{assign var=shipping_tier_2_option_1_net value=$theme_vars_shipping_tier_2_option_1_price+$cms_shipping_total}
						
						{math assign=shipping_tier_2_option_2_tax equation="((pc/100) * p)" p=$theme_vars_shipping_tier_2_option_2_price pc=$basket_tax_amount}
						{assign var=shipping_tier_2_option_2_net value=$theme_vars_shipping_tier_2_option_2_price+$cms_shipping_total}
						
						{math assign=shipping_tier_2_option_3_tax equation="((pc/100) * p)" p=$theme_vars_shipping_tier_2_option_3_price pc=$basket_tax_amount}
						{assign var=shipping_tier_2_option_3_net value=$theme_vars_shipping_tier_2_option_3_price+$cms_shipping_total}
						
						{math assign=shipping_tier_2_option_4_tax equation="((pc/100) * p)" p=$theme_vars_shipping_tier_2_option_4_price pc=$basket_tax_amount}
						{assign var=shipping_tier_2_option_4_net value=$theme_vars_shipping_tier_2_option_4_price+$cms_shipping_total}

						{math assign=shipping_tier_2_option_5_tax equation="((pc/100) * p)" p=$theme_vars_shipping_tier_2_option_5_price pc=$basket_tax_amount}
						{assign var=shipping_tier_2_option_5_net value=$theme_vars_shipping_tier_2_option_5_price+$cms_shipping_total}
						
						{math assign=shipping_tier_2_option_6_tax equation="((pc/100) * p)" p=$theme_vars_shipping_tier_2_option_6_price pc=$basket_tax_amount}
						{assign var=shipping_tier_2_option_6_net value=$theme_vars_shipping_tier_2_option_6_price+$cms_shipping_total}
						
						{math assign=shipping_tier_2_option_7_tax equation="((pc/100) * p)" p=$theme_vars_shipping_tier_2_option_7_price pc=$basket_tax_amount}
						{assign var=shipping_tier_2_option_7_net value=$theme_vars_shipping_tier_2_option_7_price+$cms_shipping_total}
						
						{math assign=shipping_tier_2_option_8_tax equation="((pc/100) * p)" p=$theme_vars_shipping_tier_2_option_8_price pc=$basket_tax_amount}
						{assign var=shipping_tier_2_option_8_net value=$theme_vars_shipping_tier_2_option_8_price+$cms_shipping_total}
						
						{math assign=shipping_tier_2_option_9_tax equation="((pc/100) * p)" p=$theme_vars_shipping_tier_2_option_9_price pc=$basket_tax_amount}
						{assign var=shipping_tier_2_option_9_net value=$theme_vars_shipping_tier_2_option_9_price+$cms_shipping_total}
						
						{math assign=shipping_tier_2_option_10_tax equation="((pc/100) * p)" p=$theme_vars_shipping_tier_2_option_10_price pc=$basket_tax_amount}
						{assign var=shipping_tier_2_option_10_net value=$theme_vars_shipping_tier_2_option_10_price+$cms_shipping_total}
						
						{math assign=shipping_tier_3_option_1_tax equation="((pc/100) * p)" p=$theme_vars_shipping_tier_3_option_1_price pc=$basket_tax_amount}
						{assign var=shipping_tier_3_option_1_net value=$theme_vars_shipping_tier_3_option_1_price+$cms_shipping_total}
						
						{math assign=shipping_tier_3_option_2_tax equation="((pc/100) * p)" p=$theme_vars_shipping_tier_3_option_2_price pc=$basket_tax_amount}
						{assign var=shipping_tier_3_option_2_net value=$theme_vars_shipping_tier_3_option_2_price+$cms_shipping_total}
						
						{math assign=shipping_tier_3_option_3_tax equation="((pc/100) * p)" p=$theme_vars_shipping_tier_3_option_3_price pc=$basket_tax_amount}
						{assign var=shipping_tier_3_option_3_net value=$theme_vars_shipping_tier_3_option_3_price+$cms_shipping_total}
						
						{math assign=shipping_tier_3_option_4_tax equation="((pc/100) * p)" p=$theme_vars_shipping_tier_3_option_4_price pc=$basket_tax_amount}
						{assign var=shipping_tier_3_option_4_net value=$theme_vars_shipping_tier_3_option_4_price+$cms_shipping_total}
						
						{math assign=shipping_tier_3_option_5_tax equation="((pc/100) * p)" p=$theme_vars_shipping_tier_3_option_5_price pc=$basket_tax_amount}
						{assign var=shipping_tier_3_option_5_net value=$theme_vars_shipping_tier_3_option_5_price+$cms_shipping_total}
						
						{math assign=shipping_tier_3_option_6_tax equation="((pc/100) * p)" p=$theme_vars_shipping_tier_3_option_6_price pc=$basket_tax_amount}
						{assign var=shipping_tier_3_option_6_net value=$theme_vars_shipping_tier_3_option_6_price+$cms_shipping_total}
						
						{math assign=shipping_tier_3_option_7_tax equation="((pc/100) * p)" p=$theme_vars_shipping_tier_3_option_7_price pc=$basket_tax_amount}
						{assign var=shipping_tier_3_option_7_net value=$theme_vars_shipping_tier_3_option_7_price+$cms_shipping_total}
						
						{math assign=shipping_tier_3_option_8_tax equation="((pc/100) * p)" p=$theme_vars_shipping_tier_3_option_8_price pc=$basket_tax_amount}
						{assign var=shipping_tier_3_option_8_net value=$theme_vars_shipping_tier_3_option_8_price+$cms_shipping_total}
						
						{math assign=shipping_tier_3_option_9_tax equation="((pc/100) * p)" p=$theme_vars_shipping_tier_3_option_9_price pc=$basket_tax_amount}
						{assign var=shipping_tier_3_option_9_net value=$theme_vars_shipping_tier_3_option_9_price+$cms_shipping_total}
						
						{math assign=shipping_tier_3_option_10_tax equation="((pc/100) * p)" p=$theme_vars_shipping_tier_3_option_10_price pc=$basket_tax_amount}
						{assign var=shipping_tier_3_option_10_net value=$theme_vars_shipping_tier_3_option_10_price+$cms_shipping_total}
						
						{math assign=shipping_tier_4_option_1_tax equation="((pc/100) * p)" p=$theme_vars_shipping_tier_4_option_1_price pc=$basket_tax_amount}
						{assign var=shipping_tier_4_option_1_net value=$theme_vars_shipping_tier_4_option_1_price+$cms_shipping_total}
						
						{math assign=shipping_tier_4_option_2_tax equation="((pc/100) * p)" p=$theme_vars_shipping_tier_4_option_2_price pc=$basket_tax_amount}
						{assign var=shipping_tier_4_option_2_net value=$theme_vars_shipping_tier_4_option_2_price+$cms_shipping_total}
						
						{math assign=shipping_tier_4_option_3_tax equation="((pc/100) * p)" p=$theme_vars_shipping_tier_4_option_3_price pc=$basket_tax_amount}
						{assign var=shipping_tier_4_option_3_net value=$theme_vars_shipping_tier_4_option_3_price+$cms_shipping_total}
						
						{math assign=shipping_tier_4_option_4_tax equation="((pc/100) * p)" p=$theme_vars_shipping_tier_4_option_4_price pc=$basket_tax_amount}
						{assign var=shipping_tier_4_option_4_net value=$theme_vars_shipping_tier_4_option_4_price+$cms_shipping_total}
						
						{math assign=shipping_tier_4_option_5_tax equation="((pc/100) * p)" p=$theme_vars_shipping_tier_4_option_5_price pc=$basket_tax_amount}
						{assign var=shipping_tier_4_option_5_net value=$theme_vars_shipping_tier_4_option_5_price+$cms_shipping_total}
						
						{math assign=shipping_tier_4_option_6_tax equation="((pc/100) * p)" p=$theme_vars_shipping_tier_4_option_6_price pc=$basket_tax_amount}
						{assign var=shipping_tier_4_option_6_net value=$theme_vars_shipping_tier_4_option_6_price+$cms_shipping_total}
						
						{math assign=shipping_tier_4_option_7_tax equation="((pc/100) * p)" p=$theme_vars_shipping_tier_4_option_7_price pc=$basket_tax_amount}
						{assign var=shipping_tier_4_option_7_net value=$theme_vars_shipping_tier_4_option_7_price+$cms_shipping_total}
						
						{math assign=shipping_tier_4_option_8_tax equation="((pc/100) * p)" p=$theme_vars_shipping_tier_4_option_8_price pc=$basket_tax_amount}
						{assign var=shipping_tier_4_option_8_net value=$theme_vars_shipping_tier_4_option_8_price+$cms_shipping_total}
						
						{math assign=shipping_tier_4_option_9_tax equation="((pc/100) * p)" p=$theme_vars_shipping_tier_4_option_9_price pc=$basket_tax_amount}
						{assign var=shipping_tier_4_option_9_net value=$theme_vars_shipping_tier_4_option_9_price+$cms_shipping_total}
						
						{math assign=shipping_tier_4_option_10_tax equation="((pc/100) * p)" p=$theme_vars_shipping_tier_4_option_10_price pc=$basket_tax_amount}
						{assign var=shipping_tier_4_option_10_net value=$theme_vars_shipping_tier_4_option_10_price+$cms_shipping_total}
						
						{math assign=shipping_tier_5_option_1_tax equation="((pc/100) * p)" p=$theme_vars_shipping_tier_5_option_1_price pc=$basket_tax_amount}
						{assign var=shipping_tier_5_option_1_net value=$theme_vars_shipping_tier_5_option_1_price+$cms_shipping_total}
						
						{math assign=shipping_tier_5_option_2_tax equation="((pc/100) * p)" p=$theme_vars_shipping_tier_5_option_2_price pc=$basket_tax_amount}
						{assign var=shipping_tier_5_option_2_net value=$theme_vars_shipping_tier_5_option_2_price+$cms_shipping_total}
						
						{math assign=shipping_tier_5_option_3_tax equation="((pc/100) * p)" p=$theme_vars_shipping_tier_5_option_3_price pc=$basket_tax_amount}
						{assign var=shipping_tier_5_option_3_net value=$theme_vars_shipping_tier_5_option_3_price+$cms_shipping_total}
						
						{math assign=shipping_tier_5_option_4_tax equation="((pc/100) * p)" p=$theme_vars_shipping_tier_5_option_4_price pc=$basket_tax_amount}
						{assign var=shipping_tier_5_option_4_net value=$theme_vars_shipping_tier_5_option_4_price+$cms_shipping_total}
						
						{math assign=shipping_tier_5_option_5_tax equation="((pc/100) * p)" p=$theme_vars_shipping_tier_5_option_5_price pc=$basket_tax_amount}
						{assign var=shipping_tier_5_option_5_net value=$theme_vars_shipping_tier_5_option_5_price+$cms_shipping_total}
						
						{math assign=shipping_tier_5_option_6_tax equation="((pc/100) * p)" p=$theme_vars_shipping_tier_5_option_6_price pc=$basket_tax_amount}
						{assign var=shipping_tier_5_option_6_net value=$theme_vars_shipping_tier_5_option_6_price+$cms_shipping_total}
						
						{math assign=shipping_tier_5_option_7_tax equation="((pc/100) * p)" p=$theme_vars_shipping_tier_5_option_7_price pc=$basket_tax_amount}
						{assign var=shipping_tier_5_option_7_net value=$theme_vars_shipping_tier_5_option_7_price+$cms_shipping_total}
						
						{math assign=shipping_tier_5_option_8_tax equation="((pc/100) * p)" p=$theme_vars_shipping_tier_5_option_8_price pc=$basket_tax_amount}
						{assign var=shipping_tier_5_option_8_net value=$theme_vars_shipping_tier_5_option_8_price+$cms_shipping_total}

						{math assign=shipping_tier_5_option_9_tax equation="((pc/100) * p)" p=$theme_vars_shipping_tier_5_option_9_price pc=$basket_tax_amount}
						{assign var=shipping_tier_5_option_9_net value=$theme_vars_shipping_tier_5_option_9_price+$cms_shipping_total}
						
						{math assign=shipping_tier_5_option_10_tax equation="((pc/100) * p)" p=$theme_vars_shipping_tier_5_option_10_price pc=$basket_tax_amount}
						{assign var=shipping_tier_5_option_10_net value=$theme_vars_shipping_tier_5_option_10_price+$cms_shipping_total}
					
					{else}
					
						{math assign=basket_tax_amount_m equation="t / 100" t=$basket_tax_amount}

						{assign var=fac value=$basket_tax_amount_m+1}

						{math assign=shipping_tier_1_option_1_net equation="p / f" p=$theme_vars_shipping_tier_1_option_1_price f=$fac}
						{math assign=shipping_tier_1_option_1_tax equation="p - t" p=$theme_vars_shipping_tier_1_option_1_price t=$shipping_tier_1_option_1_net}
						{if $tax_on_shipping==0}
						{assign var=shipping_tier_1_option_1_net value=$theme_vars_shipping_tier_1_option_1_price+$cms_shipping_total}
						{else}
						{assign var=shipping_tier_1_option_1_net value=$shipping_tier_1_option_1_net+$cms_shipping_total}
						{/if}

						{math assign=shipping_tier_1_option_2_net equation="p / f" p=$theme_vars_shipping_tier_1_option_2_price f=$fac}
						{math assign=shipping_tier_1_option_2_tax equation="p - t" p=$theme_vars_shipping_tier_1_option_2_price t=$shipping_tier_1_option_2_net}
						{if $tax_on_shipping==0}
						{assign var=shipping_tier_1_option_2_net value=$theme_vars_shipping_tier_1_option_2_price+$cms_shipping_total}
						{else}
						{assign var=shipping_tier_1_option_2_net value=$shipping_tier_1_option_2_net+$cms_shipping_total}
						{/if}
						
						
						{math assign=shipping_tier_1_option_3_net equation="p / f" p=$theme_vars_shipping_tier_1_option_3_price f=$fac}
						{math assign=shipping_tier_1_option_3_tax equation="p - t" p=$theme_vars_shipping_tier_1_option_3_price t=$shipping_tier_1_option_3_net}
						{if $tax_on_shipping==0}
						{assign var=shipping_tier_1_option_3_net value=$theme_vars_shipping_tier_1_option_3_price+$cms_shipping_total}
						{else}
						{assign var=shipping_tier_1_option_3_net value=$shipping_tier_1_option_3_net+$cms_shipping_total}
						{/if}
						
						{math assign=shipping_tier_1_option_4_net equation="p / f" p=$theme_vars_shipping_tier_1_option_4_price f=$fac}
						{math assign=shipping_tier_1_option_4_tax equation="p - t" p=$theme_vars_shipping_tier_1_option_4_price t=$shipping_tier_1_option_4_net}
						{if $tax_on_shipping==0}
						{assign var=shipping_tier_1_option_4_net value=$theme_vars_shipping_tier_1_option_4_price+$cms_shipping_total}
						{else}
						{assign var=shipping_tier_1_option_4_net value=$shipping_tier_1_option_4_net+$cms_shipping_total}
						{/if}
						
						{math assign=shipping_tier_1_option_5_net equation="p / f" p=$theme_vars_shipping_tier_1_option_5_price f=$fac}
						{math assign=shipping_tier_1_option_5_tax equation="p - t" p=$theme_vars_shipping_tier_1_option_5_price t=$shipping_tier_1_option_5_net}
						{if $tax_on_shipping==0}
						{assign var=shipping_tier_1_option_5_net value=$theme_vars_shipping_tier_1_option_5_price+$cms_shipping_total}
						{else}
						{assign var=shipping_tier_1_option_5_net value=$shipping_tier_1_option_5_net+$cms_shipping_total}
						{/if}
						
						{math assign=shipping_tier_1_option_6_net equation="p / f" p=$theme_vars_shipping_tier_1_option_6_price f=$fac}
						{math assign=shipping_tier_1_option_6_tax equation="p - t" p=$theme_vars_shipping_tier_1_option_6_price t=$shipping_tier_1_option_6_net}
						{if $tax_on_shipping==0}
						{assign var=shipping_tier_1_option_6_net value=$theme_vars_shipping_tier_1_option_6_price+$cms_shipping_total}
						{else}
						{assign var=shipping_tier_1_option_6_net value=$shipping_tier_1_option_6_net+$cms_shipping_total}
						{/if}
						
						{math assign=shipping_tier_1_option_7_net equation="p / f" p=$theme_vars_shipping_tier_1_option_7_price f=$fac}
						{math assign=shipping_tier_1_option_7_tax equation="p - t" p=$theme_vars_shipping_tier_1_option_7_price t=$shipping_tier_1_option_7_net}
						{if $tax_on_shipping==0}
						{assign var=shipping_tier_1_option_7_net value=$theme_vars_shipping_tier_1_option_7_price+$cms_shipping_total}
						{else}
						{assign var=shipping_tier_1_option_7_net value=$shipping_tier_1_option_7_net+$cms_shipping_total}
						{/if}
						
						{math assign=shipping_tier_1_option_8_net equation="p / f" p=$theme_vars_shipping_tier_1_option_8_price f=$fac}
						{math assign=shipping_tier_1_option_8_tax equation="p - t" p=$theme_vars_shipping_tier_1_option_8_price t=$shipping_tier_1_option_8_net}
						{if $tax_on_shipping==0}
						{assign var=shipping_tier_1_option_8_net value=$theme_vars_shipping_tier_1_option_8_price+$cms_shipping_total}
						{else}
						{assign var=shipping_tier_1_option_8_net value=$shipping_tier_1_option_8_net+$cms_shipping_total}
						{/if}
						
						{math assign=shipping_tier_1_option_9_net equation="p / f" p=$theme_vars_shipping_tier_1_option_9_price f=$fac}
						{math assign=shipping_tier_1_option_9_tax equation="p - t" p=$theme_vars_shipping_tier_1_option_9_price t=$shipping_tier_1_option_9_net}
						{if $tax_on_shipping==0}
						{assign var=shipping_tier_1_option_9_net value=$theme_vars_shipping_tier_1_option_9_price+$cms_shipping_total}
						{else}
						{assign var=shipping_tier_1_option_9_net value=$shipping_tier_1_option_9_net+$cms_shipping_total}
						{/if}
						
						{math assign=shipping_tier_1_option_10_net equation="p / f" p=$theme_vars_shipping_tier_1_option_4_price f=$fac}
						{math assign=shipping_tier_1_option_10_tax equation="p - t" p=$theme_vars_shipping_tier_1_option_4_price t=$shipping_tier_1_option_10_net}
						{if $tax_on_shipping==0}
						{assign var=shipping_tier_1_option_10_net value=$theme_vars_shipping_tier_1_option_4_price+$cms_shipping_total}
						{else}
						{assign var=shipping_tier_1_option_10_net value=$shipping_tier_1_option_10_net+$cms_shipping_total}
						{/if}

						
						{math assign=shipping_tier_2_option_1_net equation="p / f" p=$theme_vars_shipping_tier_2_option_1_price f=$fac}
						{math assign=shipping_tier_2_option_1_tax equation="p - t" p=$theme_vars_shipping_tier_2_option_1_price t=$shipping_tier_2_option_1_net}
						{if $tax_on_shipping==0}
						{assign var=shipping_tier_2_option_1_net value=$theme_vars_shipping_tier_2_option_1_price+$cms_shipping_total}
						{else}
						{assign var=shipping_tier_2_option_1_net value=$shipping_tier_2_option_1_net+$cms_shipping_total}
						{/if}
						
						{math assign=shipping_tier_2_option_2_net equation="p / f" p=$theme_vars_shipping_tier_2_option_2_price f=$fac}
						{math assign=shipping_tier_2_option_2_tax equation="p - t" p=$theme_vars_shipping_tier_2_option_2_price t=$shipping_tier_2_option_2_net}
						{if $tax_on_shipping==0}
						{assign var=shipping_tier_2_option_2_net value=$theme_vars_shipping_tier_2_option_2_price+$cms_shipping_total}
						{else}
						{assign var=shipping_tier_2_option_2_net value=$shipping_tier_2_option_2_net+$cms_shipping_total}
						{/if}
						
						{math assign=shipping_tier_2_option_3_net equation="p / f" p=$theme_vars_shipping_tier_2_option_3_price f=$fac}
						{math assign=shipping_tier_2_option_3_tax equation="p - t" p=$theme_vars_shipping_tier_2_option_3_price t=$shipping_tier_2_option_3_net}
						{if $tax_on_shipping==0}
						{assign var=shipping_tier_2_option_3_net value=$theme_vars_shipping_tier_2_option_3_price+$cms_shipping_total}
						{else}
						{assign var=shipping_tier_2_option_3_net value=$shipping_tier_2_option_3_net+$cms_shipping_total}
						{/if}
						
						{math assign=shipping_tier_2_option_4_net equation="p / f" p=$theme_vars_shipping_tier_2_option_4_price f=$fac}
						{math assign=shipping_tier_2_option_4_tax equation="p - t" p=$theme_vars_shipping_tier_2_option_4_price t=$shipping_tier_2_option_4_net}
						{if $tax_on_shipping==0}
						{assign var=shipping_tier_2_option_4_net value=$theme_vars_shipping_tier_2_option_4_price+$cms_shipping_total}
						{else}
						{assign var=shipping_tier_2_option_4_net value=$shipping_tier_2_option_4_net+$cms_shipping_total}
						{/if}
						
						{math assign=shipping_tier_2_option_5_net equation="p / f" p=$theme_vars_shipping_tier_2_option_5_price f=$fac}
						{math assign=shipping_tier_2_option_5_tax equation="p - t" p=$theme_vars_shipping_tier_2_option_5_price t=$shipping_tier_2_option_5_net}
						{if $tax_on_shipping==0}
						{assign var=shipping_tier_2_option_5_net value=$theme_vars_shipping_tier_2_option_5_price+$cms_shipping_total}
						{else}
						{assign var=shipping_tier_2_option_5_net value=$shipping_tier_2_option_5_net+$cms_shipping_total}
						{/if}
						
						{math assign=shipping_tier_2_option_6_net equation="p / f" p=$theme_vars_shipping_tier_2_option_6_price f=$fac}
						{math assign=shipping_tier_2_option_6_tax equation="p - t" p=$theme_vars_shipping_tier_2_option_6_price t=$shipping_tier_2_option_6_net}
						{if $tax_on_shipping==0}
						{assign var=shipping_tier_2_option_6_net value=$theme_vars_shipping_tier_2_option_6_price+$cms_shipping_total}
						{else}
						{assign var=shipping_tier_2_option_6_net value=$shipping_tier_2_option_6_net+$cms_shipping_total}
						{/if}
						
						{math assign=shipping_tier_2_option_7_net equation="p / f" p=$theme_vars_shipping_tier_2_option_7_price f=$fac}
						{math assign=shipping_tier_2_option_7_tax equation="p - t" p=$theme_vars_shipping_tier_2_option_7_price t=$shipping_tier_2_option_7_net}
						{if $tax_on_shipping==0}
						{assign var=shipping_tier_2_option_7_net value=$theme_vars_shipping_tier_2_option_7_price+$cms_shipping_total}
						{else}
						{assign var=shipping_tier_2_option_7_net value=$shipping_tier_2_option_7_net+$cms_shipping_total}
						{/if}
						
						{math assign=shipping_tier_2_option_8_net equation="p / f" p=$theme_vars_shipping_tier_2_option_8_price f=$fac}
						{math assign=shipping_tier_2_option_8_tax equation="p - t" p=$theme_vars_shipping_tier_2_option_8_price t=$shipping_tier_2_option_8_net}
						{if $tax_on_shipping==0}
						{assign var=shipping_tier_2_option_8_net value=$theme_vars_shipping_tier_2_option_8_price+$cms_shipping_total}
						{else}
						{assign var=shipping_tier_2_option_8_net value=$shipping_tier_2_option_8_net+$cms_shipping_total}
						{/if}
						
						{math assign=shipping_tier_2_option_9_net equation="p / f" p=$theme_vars_shipping_tier_2_option_9_price f=$fac}
						{math assign=shipping_tier_2_option_9_tax equation="p - t" p=$theme_vars_shipping_tier_2_option_9_price t=$shipping_tier_2_option_9_net}
						{if $tax_on_shipping==0}
						{assign var=shipping_tier_2_option_9_net value=$theme_vars_shipping_tier_2_option_9_price+$cms_shipping_total}						
						{else}
						{assign var=shipping_tier_2_option_9_net value=$shipping_tier_2_option_9_net+$cms_shipping_total}
						{/if}
						
						{math assign=shipping_tier_2_option_10_net equation="p / f" p=$theme_vars_shipping_tier_2_option_10_price f=$fac}
						{math assign=shipping_tier_2_option_10_tax equation="p - t" p=$theme_vars_shipping_tier_2_option_10_price t=$shipping_tier_2_option_10_net}
						{if $tax_on_shipping==0}
						{assign var=shipping_tier_2_option_10_net value=$theme_vars_shipping_tier_2_option_10_price+$cms_shipping_total}
						{else}
						{assign var=shipping_tier_2_option_10_net value=$shipping_tier_2_option_10_net+$cms_shipping_total}
						{/if}
						
						
						{math assign=shipping_tier_3_option_1_net equation="p / f" p=$theme_vars_shipping_tier_3_option_1_price f=$fac}
						{math assign=shipping_tier_3_option_1_tax equation="p - t" p=$theme_vars_shipping_tier_3_option_1_price t=$shipping_tier_3_option_1_net}
						{if $tax_on_shipping==0}
						{assign var=shipping_tier_3_option_1_net value=$theme_vars_shipping_tier_3_option_1_price+$cms_shipping_total}						
						{else}
						{assign var=shipping_tier_3_option_1_net value=$shipping_tier_3_option_1_net+$cms_shipping_total}
						{/if}
						
						{math assign=shipping_tier_3_option_2_net equation="p / f" p=$theme_vars_shipping_tier_3_option_2_price f=$fac}
						{math assign=shipping_tier_3_option_2_tax equation="p - t" p=$theme_vars_shipping_tier_3_option_2_price t=$shipping_tier_3_option_2_net}
						{if $tax_on_shipping==0}
						{assign var=shipping_tier_3_option_2_net value=$theme_vars_shipping_tier_3_option_2_price+$cms_shipping_total}
						{else}
						{assign var=shipping_tier_3_option_2_net value=$shipping_tier_3_option_2_net+$cms_shipping_total}
						{/if}
						
						{math assign=shipping_tier_3_option_3_net equation="p / f" p=$theme_vars_shipping_tier_3_option_3_price f=$fac}
						{math assign=shipping_tier_3_option_3_tax equation="p - t" p=$theme_vars_shipping_tier_3_option_3_price t=$shipping_tier_3_option_3_net}
						{if $tax_on_shipping==0}
						{assign var=shipping_tier_3_option_3_net value=$theme_vars_shipping_tier_3_option_3_price+$cms_shipping_total}
						{else}
						{assign var=shipping_tier_3_option_3_net value=$shipping_tier_3_option_3_net+$cms_shipping_total}
						{/if}
						
						{math assign=shipping_tier_3_option_4_net equation="p / f" p=$theme_vars_shipping_tier_3_option_4_price f=$fac}
						{math assign=shipping_tier_3_option_4_tax equation="p - t" p=$theme_vars_shipping_tier_3_option_4_price t=$shipping_tier_3_option_4_net}
						{if $tax_on_shipping==0}
						{assign var=shipping_tier_3_option_4_net value=$theme_vars_shipping_tier_3_option_4_price+$cms_shipping_total}						
						{else}
						{assign var=shipping_tier_3_option_4_net value=$shipping_tier_3_option_4_net+$cms_shipping_total}
						{/if}
						
						{math assign=shipping_tier_3_option_5_net equation="p / f" p=$theme_vars_shipping_tier_3_option_5_price f=$fac}
						{math assign=shipping_tier_3_option_5_tax equation="p - t" p=$theme_vars_shipping_tier_3_option_5_price t=$shipping_tier_3_option_5_net}
						{if $tax_on_shipping==0}
						{assign var=shipping_tier_3_option_5_net value=$theme_vars_shipping_tier_3_option_5_price+$cms_shipping_total}
						{else}
						{assign var=shipping_tier_3_option_5_net value=$shipping_tier_3_option_5_net+$cms_shipping_total}
						{/if}
						
						{math assign=shipping_tier_3_option_6_net equation="p / f" p=$theme_vars_shipping_tier_3_option_6_price f=$fac}
						{math assign=shipping_tier_3_option_6_tax equation="p - t" p=$theme_vars_shipping_tier_3_option_6_price t=$shipping_tier_3_option_6_net}
						{if $tax_on_shipping==0}
						{assign var=shipping_tier_3_option_6_net value=$theme_vars_shipping_tier_3_option_6_price+$cms_shipping_total}
						{else}
						{assign var=shipping_tier_3_option_6_net value=$shipping_tier_3_option_6_net+$cms_shipping_total}
						{/if}
						
						{math assign=shipping_tier_3_option_7_net equation="p / f" p=$theme_vars_shipping_tier_3_option_7_price f=$fac}
						{math assign=shipping_tier_3_option_7_tax equation="p - t" p=$theme_vars_shipping_tier_3_option_7_price t=$shipping_tier_3_option_7_net}
						{if $tax_on_shipping==0}
						{assign var=shipping_tier_3_option_7_net value=$theme_vars_shipping_tier_3_option_7_price+$cms_shipping_total}
						{else}
						{assign var=shipping_tier_3_option_7_net value=$shipping_tier_3_option_7_net+$cms_shipping_total}						
						{/if}
						
						{math assign=shipping_tier_3_option_8_net equation="p / f" p=$theme_vars_shipping_tier_3_option_8_price f=$fac}
						{math assign=shipping_tier_3_option_8_tax equation="p - t" p=$theme_vars_shipping_tier_3_option_8_price t=$shipping_tier_3_option_8_net}
						{if $tax_on_shipping==0}
						{assign var=shipping_tier_3_option_8_net value=$theme_vars_shipping_tier_3_option_8_price+$cms_shipping_total}
						{else}
						{assign var=shipping_tier_3_option_8_net value=$shipping_tier_3_option_8_net+$cms_shipping_total}
						{/if}
						
						{math assign=shipping_tier_3_option_9_net equation="p / f" p=$theme_vars_shipping_tier_3_option_9_price f=$fac}
						{math assign=shipping_tier_3_option_9_tax equation="p - t" p=$theme_vars_shipping_tier_3_option_9_price t=$shipping_tier_3_option_9_net}
						{if $tax_on_shipping==0}
						{assign var=shipping_tier_3_option_9_net value=$theme_vars_shipping_tier_3_option_9_price+$cms_shipping_total}
						{else}
						{assign var=shipping_tier_3_option_9_net value=$shipping_tier_3_option_9_net+$cms_shipping_total}
						{/if}
						
						{math assign=shipping_tier_3_option_10_net equation="p / f" p=$theme_vars_shipping_tier_3_option_10_price f=$fac}
						{math assign=shipping_tier_3_option_10_tax equation="p - t" p=$theme_vars_shipping_tier_3_option_10_price t=$shipping_tier_3_option_10_net}
						{if $tax_on_shipping==0}
						{assign var=shipping_tier_3_option_10_net value=$theme_vars_shipping_tier_3_option_10_price+$cms_shipping_total}
						{else}
						{assign var=shipping_tier_3_option_10_net value=$shipping_tier_3_option_10_net+$cms_shipping_total}						
						{/if}
						
						
						{math assign=shipping_tier_4_option_1_net equation="p / f" p=$theme_vars_shipping_tier_4_option_1_price f=$fac}
						{math assign=shipping_tier_4_option_1_tax equation="p - t" p=$theme_vars_shipping_tier_4_option_1_price t=$shipping_tier_4_option_1_net}
						{if $tax_on_shipping==0}
						{assign var=shipping_tier_4_option_1_net value=$theme_vars_shipping_tier_4_option_1_price+$cms_shipping_total}
						{else}
						{assign var=shipping_tier_4_option_1_net value=$shipping_tier_4_option_1_net+$cms_shipping_total}
						{/if}
						
						{math assign=shipping_tier_4_option_2_net equation="p / f" p=$theme_vars_shipping_tier_4_option_2_price f=$fac}
						{math assign=shipping_tier_4_option_2_tax equation="p - t" p=$theme_vars_shipping_tier_4_option_2_price t=$shipping_tier_4_option_2_net}
						{if $tax_on_shipping==0}
						{assign var=shipping_tier_4_option_2_net value=$theme_vars_shipping_tier_4_option_2_price+$cms_shipping_total}
						{else}
						{assign var=shipping_tier_4_option_2_net value=$shipping_tier_4_option_2_net+$cms_shipping_total}
						{/if}
						
						{math assign=shipping_tier_4_option_3_net equation="p / f" p=$theme_vars_shipping_tier_4_option_3_price f=$fac}
						{math assign=shipping_tier_4_option_3_tax equation="p - t" p=$theme_vars_shipping_tier_4_option_3_price t=$shipping_tier_4_option_3_net}
						{if $tax_on_shipping==0}
						{assign var=shipping_tier_4_option_3_net value=$theme_vars_shipping_tier_4_option_3_price+$cms_shipping_total}
						{else}
						{assign var=shipping_tier_4_option_3_net value=$shipping_tier_4_option_3_net+$cms_shipping_total}
						{/if}
						
						{math assign=shipping_tier_4_option_4_net equation="p / f" p=$theme_vars_shipping_tier_4_option_4_price f=$fac}
						{math assign=shipping_tier_4_option_4_tax equation="p - t" p=$theme_vars_shipping_tier_4_option_4_price t=$shipping_tier_4_option_4_net}
						{if $tax_on_shipping==0}
						{assign var=shipping_tier_4_option_4_net value=$theme_vars_shipping_tier_4_option_4_price+$cms_shipping_total}
						{else}
						{assign var=shipping_tier_4_option_4_net value=$shipping_tier_4_option_4_net+$cms_shipping_total}						
						{/if}
						
						{math assign=shipping_tier_4_option_5_net equation="p / f" p=$theme_vars_shipping_tier_4_option_5_price f=$fac}
						{math assign=shipping_tier_4_option_5_tax equation="p - t" p=$theme_vars_shipping_tier_4_option_5_price t=$shipping_tier_4_option_5_net}
						{if $tax_on_shipping==0}
						{assign var=shipping_tier_4_option_5_net value=$theme_vars_shipping_tier_4_option_5_price+$cms_shipping_total}
						{else}
						{assign var=shipping_tier_4_option_5_net value=$shipping_tier_4_option_5_net+$cms_shipping_total}						
						{/if}
						
						{math assign=shipping_tier_4_option_6_net equation="p / f" p=$theme_vars_shipping_tier_4_option_6_price f=$fac}
						{math assign=shipping_tier_4_option_6_tax equation="p - t" p=$theme_vars_shipping_tier_4_option_6_price t=$shipping_tier_4_option_6_net}
						{if $tax_on_shipping==0}
						{assign var=shipping_tier_4_option_6_net value=$theme_vars_shipping_tier_4_option_6_price+$cms_shipping_total}
						{else}
						{assign var=shipping_tier_4_option_6_net value=$shipping_tier_4_option_6_net+$cms_shipping_total}						
						{/if}
						
						{math assign=shipping_tier_4_option_7_net equation="p / f" p=$theme_vars_shipping_tier_4_option_7_price f=$fac}
						{math assign=shipping_tier_4_option_7_tax equation="p - t" p=$theme_vars_shipping_tier_4_option_7_price t=$shipping_tier_4_option_7_net}
						{if $tax_on_shipping==0}
						{assign var=shipping_tier_4_option_7_net value=$theme_vars_shipping_tier_4_option_7_price+$cms_shipping_total}
						{else}
						{assign var=shipping_tier_4_option_7_net value=$shipping_tier_4_option_7_net+$cms_shipping_total}
						{/if}
						
						{math assign=shipping_tier_4_option_8_net equation="p / f" p=$theme_vars_shipping_tier_4_option_8_price f=$fac}
						{math assign=shipping_tier_4_option_8_tax equation="p - t" p=$theme_vars_shipping_tier_4_option_8_price t=$shipping_tier_4_option_8_net}
						{if $tax_on_shipping==0}
						{assign var=shipping_tier_4_option_8_net value=$theme_vars_shipping_tier_4_option_8_price+$cms_shipping_total}
						{else}
						{assign var=shipping_tier_4_option_8_net value=$shipping_tier_4_option_8_net+$cms_shipping_total}
						{/if}
						
						{math assign=shipping_tier_4_option_9_net equation="p / f" p=$theme_vars_shipping_tier_4_option_9_price f=$fac}
						{math assign=shipping_tier_4_option_9_tax equation="p - t" p=$theme_vars_shipping_tier_4_option_9_price t=$shipping_tier_4_option_9_net}
						{if $tax_on_shipping==0}
						{assign var=shipping_tier_4_option_9_net value=$theme_vars_shipping_tier_4_option_9_price+$cms_shipping_total}
						{else}
						{assign var=shipping_tier_4_option_9_net value=$shipping_tier_4_option_9_net+$cms_shipping_total}
						{/if}
						
						{math assign=shipping_tier_4_option_10_net equation="p / f" p=$theme_vars_shipping_tier_4_option_10_price f=$fac}
						{math assign=shipping_tier_4_option_10_tax equation="p - t" p=$theme_vars_shipping_tier_4_option_10_price t=$shipping_tier_4_option_10_net}
						{if $tax_on_shipping==0}
						{assign var=shipping_tier_4_option_10_net value=$theme_vars_shipping_tier_4_option_10_price+$cms_shipping_total}
						{else}
						{assign var=shipping_tier_4_option_10_net value=$shipping_tier_4_option_10_net+$cms_shipping_total}
						{/if}
						
						
						{math assign=shipping_tier_5_option_1_net equation="p / f" p=$theme_vars_shipping_tier_5_option_1_price f=$fac}
						{math assign=shipping_tier_5_option_1_tax equation="p - t" p=$theme_vars_shipping_tier_5_option_1_price t=$shipping_tier_5_option_1_net}
						{if $tax_on_shipping==0}						
						{assign var=shipping_tier_5_option_1_net value=$theme_vars_shipping_tier_5_option_1_price+$cms_shipping_total}
						{else}
						{assign var=shipping_tier_5_option_1_net value=$shipping_tier_5_option_1_net+$cms_shipping_total}
						{/if}

						{math assign=shipping_tier_5_option_2_net equation="p / f" p=$theme_vars_shipping_tier_5_option_2_price f=$fac}
						{math assign=shipping_tier_5_option_2_tax equation="p - t" p=$theme_vars_shipping_tier_5_option_2_price t=$shipping_tier_5_option_2_net}
						{if $tax_on_shipping==0}				
						{assign var=shipping_tier_5_option_2_net value=$theme_vars_shipping_tier_5_option_2_price+$cms_shipping_total}
						{else}
						{assign var=shipping_tier_5_option_2_net value=$shipping_tier_5_option_2_net+$cms_shipping_total}
						{/if}
						
						{math assign=shipping_tier_5_option_3_net equation="p / f" p=$theme_vars_shipping_tier_5_option_3_price f=$fac}
						{math assign=shipping_tier_5_option_3_tax equation="p - t" p=$theme_vars_shipping_tier_5_option_3_price t=$shipping_tier_5_option_3_net}
						{if $tax_on_shipping==0}
						{assign var=shipping_tier_5_option_3_net value=$theme_vars_shipping_tier_5_option_3_price+$cms_shipping_total}
						{else}
						{assign var=shipping_tier_5_option_3_net value=$shipping_tier_5_option_3_net+$cms_shipping_total}						
						{/if}
						
						{math assign=shipping_tier_5_option_4_net equation="p / f" p=$theme_vars_shipping_tier_5_option_4_price f=$fac}
						{math assign=shipping_tier_5_option_4_tax equation="p - t" p=$theme_vars_shipping_tier_5_option_4_price t=$shipping_tier_5_option_4_net}
						{if $tax_on_shipping==0}
						{assign var=shipping_tier_5_option_4_net value=$theme_vars_shipping_tier_5_option_4_price+$cms_shipping_total}
						{else}
						{assign var=shipping_tier_5_option_4_net value=$shipping_tier_5_option_4_net+$cms_shipping_total}
						{/if}
						
						{math assign=shipping_tier_5_option_5_net equation="p / f" p=$theme_vars_shipping_tier_5_option_5_price f=$fac}
						{math assign=shipping_tier_5_option_5_tax equation="p - t" p=$theme_vars_shipping_tier_5_option_5_price t=$shipping_tier_5_option_5_net}
						{if $tax_on_shipping==0}
						{assign var=shipping_tier_5_option_5_net value=$theme_vars_shipping_tier_5_option_5_price+$cms_shipping_total}
						{else}
						{assign var=shipping_tier_5_option_5_net value=$shipping_tier_5_option_5_net+$cms_shipping_total}
						{/if}
						
						{math assign=shipping_tier_5_option_6_net equation="p / f" p=$theme_vars_shipping_tier_5_option_6_price f=$fac}
						{math assign=shipping_tier_5_option_6_tax equation="p - t" p=$theme_vars_shipping_tier_5_option_6_price t=$shipping_tier_5_option_6_net}
						{if $tax_on_shipping==0}
						{assign var=shipping_tier_5_option_6_net value=$theme_vars_shipping_tier_5_option_6_price+$cms_shipping_total}
						{else}
						{assign var=shipping_tier_5_option_6_net value=$shipping_tier_5_option_6_net+$cms_shipping_total}
						{/if}
						
						{math assign=shipping_tier_5_option_7_net equation="p / f" p=$theme_vars_shipping_tier_5_option_7_price f=$fac}
						{math assign=shipping_tier_5_option_7_tax equation="p - t" p=$theme_vars_shipping_tier_5_option_7_price t=$shipping_tier_5_option_7_net}
						{if $tax_on_shipping==0}
						{assign var=shipping_tier_5_option_7_net value=$theme_vars_shipping_tier_5_option_7_price+$cms_shipping_total}
						{else}
						{assign var=shipping_tier_5_option_7_net value=$shipping_tier_5_option_7_net+$cms_shipping_total}
						{/if}
						
						{math assign=shipping_tier_5_option_8_net equation="p / f" p=$theme_vars_shipping_tier_5_option_8_price f=$fac}
						{math assign=shipping_tier_5_option_8_tax equation="p - t" p=$theme_vars_shipping_tier_5_option_8_price t=$shipping_tier_5_option_8_net}
						{if $tax_on_shipping==0}
						{assign var=shipping_tier_5_option_8_net value=$theme_vars_shipping_tier_5_option_8_price+$cms_shipping_total}
						{else}
						{assign var=shipping_tier_5_option_8_net value=$shipping_tier_5_option_8_net+$cms_shipping_total}
						{/if}
						
						{math assign=shipping_tier_5_option_9_net equation="p / f" p=$theme_vars_shipping_tier_5_option_9_price f=$fac}
						{math assign=shipping_tier_5_option_9_tax equation="p - t" p=$theme_vars_shipping_tier_5_option_9_price t=$shipping_tier_5_option_9_net}
						{if $tax_on_shipping==0}
						{assign var=shipping_tier_5_option_9_net value=$theme_vars_shipping_tier_5_option_9_price+$cms_shipping_total}
						{else}
						{assign var=shipping_tier_5_option_9_net value=$shipping_tier_5_option_9_net+$cms_shipping_total}						
						{/if}
						
						{math assign=shipping_tier_5_option_10_net equation="p / f" p=$theme_vars_shipping_tier_5_option_10_price f=$fac}
						{math assign=shipping_tier_5_option_10_tax equation="p - t" p=$theme_vars_shipping_tier_5_option_10_price t=$shipping_tier_5_option_10_net}
						{if $tax_on_shipping==0}
						{assign var=shipping_tier_5_option_10_net value=$theme_vars_shipping_tier_5_option_10_price+$cms_shipping_total}
						{else}
						{assign var=shipping_tier_5_option_10_net value=$shipping_tier_5_option_10_net+$cms_shipping_total}
						{/if}
						
						

					{/if}
				{else}
					{assign var=shipping_tier_1_option_1_net value=$theme_vars_shipping_tier_1_option_1_price+$cms_shipping_total}
					{assign var=shipping_tier_1_option_2_net value=$theme_vars_shipping_tier_1_option_2_price+$cms_shipping_total}
					{assign var=shipping_tier_1_option_3_net value=$theme_vars_shipping_tier_1_option_3_price+$cms_shipping_total}
					{assign var=shipping_tier_1_option_4_net value=$theme_vars_shipping_tier_1_option_4_price+$cms_shipping_total}
					{assign var=shipping_tier_1_option_5_net value=$theme_vars_shipping_tier_1_option_5_price+$cms_shipping_total}
					{assign var=shipping_tier_1_option_6_net value=$theme_vars_shipping_tier_1_option_6_price+$cms_shipping_total}
					{assign var=shipping_tier_1_option_7_net value=$theme_vars_shipping_tier_1_option_7_price+$cms_shipping_total}
					{assign var=shipping_tier_1_option_8_net value=$theme_vars_shipping_tier_1_option_8_price+$cms_shipping_total}
					{assign var=shipping_tier_1_option_9_net value=$theme_vars_shipping_tier_1_option_9_price+$cms_shipping_total}
					{assign var=shipping_tier_1_option_10_net value=$theme_vars_shipping_tier_1_option_10_price+$cms_shipping_total}
				
					{assign var=shipping_tier_2_option_1_net value=$theme_vars_shipping_tier_2_option_1_price+$cms_shipping_total}
					{assign var=shipping_tier_2_option_2_net value=$theme_vars_shipping_tier_2_option_2_price+$cms_shipping_total}
					{assign var=shipping_tier_2_option_3_net value=$theme_vars_shipping_tier_2_option_3_price+$cms_shipping_total}
					{assign var=shipping_tier_2_option_4_net value=$theme_vars_shipping_tier_2_option_4_price+$cms_shipping_total}
					{assign var=shipping_tier_2_option_5_net value=$theme_vars_shipping_tier_2_option_5_price+$cms_shipping_total}
					{assign var=shipping_tier_2_option_6_net value=$theme_vars_shipping_tier_2_option_6_price+$cms_shipping_total}
					{assign var=shipping_tier_2_option_7_net value=$theme_vars_shipping_tier_2_option_7_price+$cms_shipping_total}
					{assign var=shipping_tier_2_option_8_net value=$theme_vars_shipping_tier_2_option_8_price+$cms_shipping_total}
					{assign var=shipping_tier_2_option_9_net value=$theme_vars_shipping_tier_2_option_9_price+$cms_shipping_total}
					{assign var=shipping_tier_2_option_10_net value=$theme_vars_shipping_tier_2_option_10_price+$cms_shipping_total}
					
				
					{assign var=shipping_tier_3_option_1_net value=$theme_vars_shipping_tier_3_option_1_price+$cms_shipping_total}
					{assign var=shipping_tier_3_option_2_net value=$theme_vars_shipping_tier_3_option_2_price+$cms_shipping_total}
					{assign var=shipping_tier_3_option_3_net value=$theme_vars_shipping_tier_3_option_3_price+$cms_shipping_total}
					{assign var=shipping_tier_3_option_4_net value=$theme_vars_shipping_tier_3_option_4_price+$cms_shipping_total}
					{assign var=shipping_tier_3_option_5_net value=$theme_vars_shipping_tier_3_option_5_price+$cms_shipping_total}
					{assign var=shipping_tier_3_option_6_net value=$theme_vars_shipping_tier_3_option_6_price+$cms_shipping_total}
					{assign var=shipping_tier_3_option_7_net value=$theme_vars_shipping_tier_3_option_7_price+$cms_shipping_total}
					{assign var=shipping_tier_3_option_8_net value=$theme_vars_shipping_tier_3_option_8_price+$cms_shipping_total}
					{assign var=shipping_tier_3_option_9_net value=$theme_vars_shipping_tier_3_option_9_price+$cms_shipping_total}
					{assign var=shipping_tier_3_option_10_net value=$theme_vars_shipping_tier_3_option_10_price+$cms_shipping_total}
					
					{assign var=shipping_tier_4_option_1_net value=$theme_vars_shipping_tier_4_option_1_price+$cms_shipping_total}
					{assign var=shipping_tier_4_option_2_net value=$theme_vars_shipping_tier_4_option_2_price+$cms_shipping_total}
					{assign var=shipping_tier_4_option_3_net value=$theme_vars_shipping_tier_4_option_3_price+$cms_shipping_total}
					{assign var=shipping_tier_4_option_4_net value=$theme_vars_shipping_tier_4_option_4_price+$cms_shipping_total}
					{assign var=shipping_tier_4_option_5_net value=$theme_vars_shipping_tier_4_option_5_price+$cms_shipping_total}
					{assign var=shipping_tier_4_option_6_net value=$theme_vars_shipping_tier_4_option_6_price+$cms_shipping_total}
					{assign var=shipping_tier_4_option_7_net value=$theme_vars_shipping_tier_4_option_7_price+$cms_shipping_total}
					{assign var=shipping_tier_4_option_8_net value=$theme_vars_shipping_tier_4_option_8_price+$cms_shipping_total}
					{assign var=shipping_tier_4_option_9_net value=$theme_vars_shipping_tier_4_option_9_price+$cms_shipping_total}
					{assign var=shipping_tier_4_option_10_net value=$theme_vars_shipping_tier_4_option_10_price+$cms_shipping_total}
					
					{assign var=shipping_tier_5_option_1_net value=$theme_vars_shipping_tier_5_option_1_price+$cms_shipping_total}
					{assign var=shipping_tier_5_option_2_net value=$theme_vars_shipping_tier_5_option_2_price+$cms_shipping_total}
					{assign var=shipping_tier_5_option_3_net value=$theme_vars_shipping_tier_5_option_3_price+$cms_shipping_total}
					{assign var=shipping_tier_5_option_4_net value=$theme_vars_shipping_tier_5_option_4_price+$cms_shipping_total}
					{assign var=shipping_tier_5_option_5_net value=$theme_vars_shipping_tier_5_option_5_price+$cms_shipping_total}
					{assign var=shipping_tier_5_option_6_net value=$theme_vars_shipping_tier_5_option_6_price+$cms_shipping_total}
					{assign var=shipping_tier_5_option_7_net value=$theme_vars_shipping_tier_5_option_7_price+$cms_shipping_total}
					{assign var=shipping_tier_5_option_8_net value=$theme_vars_shipping_tier_5_option_8_price+$cms_shipping_total}
					{assign var=shipping_tier_5_option_9_net value=$theme_vars_shipping_tier_5_option_9_price+$cms_shipping_total}
					{assign var=shipping_tier_5_option_10_net value=$theme_vars_shipping_tier_5_option_10_price+$cms_shipping_total}
					
					
					{assign var=shipping_tier_1_option_1_tax value=0.00}
					{assign var=shipping_tier_1_option_2_tax value=0.00}
					{assign var=shipping_tier_1_option_3_tax value=0.00}
					{assign var=shipping_tier_1_option_4_tax value=0.00}
					{assign var=shipping_tier_1_option_5_tax value=0.00}
					{assign var=shipping_tier_1_option_6_tax value=0.00}
					{assign var=shipping_tier_1_option_7_tax value=0.00}
					{assign var=shipping_tier_1_option_8_tax value=0.00}
					{assign var=shipping_tier_1_option_9_tax value=0.00}
					{assign var=shipping_tier_1_option_10_tax value=0.00}
					
				
					{assign var=shipping_tier_2_option_1_tax value=0.00}
					{assign var=shipping_tier_2_option_2_tax value=0.00}
					{assign var=shipping_tier_2_option_3_tax value=0.00}
					{assign var=shipping_tier_2_option_4_tax value=0.00}
					{assign var=shipping_tier_2_option_5_tax value=0.00}
					{assign var=shipping_tier_2_option_6_tax value=0.00}
					{assign var=shipping_tier_2_option_7_tax value=0.00}
					{assign var=shipping_tier_2_option_8_tax value=0.00}
					{assign var=shipping_tier_2_option_9_tax value=0.00}
					{assign var=shipping_tier_2_option_10_tax value=0.00}
				
					{assign var=shipping_tier_3_option_1_tax value=0.00}
					{assign var=shipping_tier_3_option_2_tax value=0.00}
					{assign var=shipping_tier_3_option_3_tax value=0.00}
					{assign var=shipping_tier_3_option_4_tax value=0.00}
					{assign var=shipping_tier_3_option_5_tax value=0.00}
					{assign var=shipping_tier_3_option_6_tax value=0.00}
					{assign var=shipping_tier_3_option_7_tax value=0.00}
					{assign var=shipping_tier_3_option_8_tax value=0.00}
					{assign var=shipping_tier_3_option_9_tax value=0.00}
					{assign var=shipping_tier_3_option_10_tax value=0.00}
					
					{assign var=shipping_tier_4_option_1_tax value=0.00}
					{assign var=shipping_tier_4_option_2_tax value=0.00}
					{assign var=shipping_tier_4_option_3_tax value=0.00}
					{assign var=shipping_tier_4_option_4_tax value=0.00}
					{assign var=shipping_tier_4_option_5_tax value=0.00}
					{assign var=shipping_tier_4_option_6_tax value=0.00}
					{assign var=shipping_tier_4_option_7_tax value=0.00}
					{assign var=shipping_tier_4_option_8_tax value=0.00}
					{assign var=shipping_tier_4_option_9_tax value=0.00}
					{assign var=shipping_tier_4_option_10_tax value=0.00}
					
					{assign var=shipping_tier_4_option_1_tax value=0.00}
					{assign var=shipping_tier_4_option_2_tax value=0.00}
					{assign var=shipping_tier_4_option_3_tax value=0.00}
					{assign var=shipping_tier_4_option_4_tax value=0.00}
					{assign var=shipping_tier_4_option_5_tax value=0.00}
					{assign var=shipping_tier_4_option_6_tax value=0.00}
					{assign var=shipping_tier_4_option_7_tax value=0.00}
					{assign var=shipping_tier_4_option_8_tax value=0.00}
					{assign var=shipping_tier_4_option_9_tax value=0.00}
					{assign var=shipping_tier_4_option_10_tax value=0.00}
				{/if}
				{*
				{if $elligableonlydiscounts}

				<p><strong>{$langs.Sub_Total}:</strong> {if $elligableonlydiscounts > 0}<strike>{$currency_sym}{$ototals}</strike>{/if} {$currency_sym}{"%i"|money_format:$net_totals}</p>
				{else}	
				<p><strong>{$langs.Sub_Total}:</strong> {if $ototals != $net_totals && $ototals!=""}<strike>{$currency_sym}{$ototals}</strike>{/if} {$currency_sym}{"%i"|money_format:$net_totals}</p>
				{/if}*}
				{math assign=netminusdiscount equation="x-y+s" x=$net_totals y=$discount_net s=$shipping}

				{math assign=netplusshipping equation="x+z" x=$net_totals z=$shipping}

				<h4>{$theme_vars_shipping_name}:</h4>
				<p class="shippingDropdownWrap">

				<span class="shippingDisp"><span></span>
				{if $theme_vars_enable_shipping_tier_5 && ( 
				($net_totals>=$theme_vars_shipping_tier_5_threshold&&$theme_vars_shipping_tier_5_threshold!="") ||
				($weights>=$theme_vars_shipping_tier_5_threshold_weight&&$theme_vars_shipping_tier_5_threshold_weight!="") ||
				($volumes>=$theme_vars_shipping_tier_5_threshold_volume&&$theme_vars_shipping_tier_5_threshold_volume!="")
				)}

					{if (($shipping_in_use=="5_1" && $theme_vars_shipping_tier_5_option_2_name!="") || $theme_vars_shipping_tier_5_option_2_name=="") || $smarty.request.step2}
						{if $freetier5option1}
							{assign var=shipping value=0.00}
							{assign var=shipping_tax value=0.00}
						{else}
							{assign var=shipping value=$shipping_tier_5_option_1_net}
							{assign var=shipping_orig value=$theme_vars_shipping_tier_5_option_1_price}
							{assign var=shipping_tax value=$shipping_tier_5_option_1_tax}
						{/if}
						{if !$theme_vars_enable_shipping_tier_5_option_1_sales_tax}
							{assign var=omit_tax value=true}
						{/if}
					{/if}
					
					{if $shipping_in_use=="5_2"}
						{if $freetier5option2}
							{assign var=shipping value=0.00}
							{assign var=shipping_tax value=0.00}
						{else}
							{assign var=shipping value=$shipping_tier_5_option_2_net}
						{assign var=shipping_orig value=$theme_vars_shipping_tier_5_option_2_price}
							{assign var=shipping_tax value=$shipping_tier_5_option_2_tax}
						{/if}
						{if !$theme_vars_enable_shipping_tier_5_option_2_sales_tax}
							{assign var=omit_tax value=true}
						{else}
							{assign var=omit_tax value=false}
						{/if}			
					
					{/if}
					{if $shipping_in_use=="5_3"}
						{if $freetier5option3}
							{assign var=shipping value=0.00}
							{assign var=shipping_tax value=0.00}
						{else}
							{assign var=shipping value=$shipping_tier_5_option_3_net}
						{assign var=shipping_orig value=$theme_vars_shipping_tier_5_option_3_price}
							{assign var=shipping_tax value=$shipping_tier_5_option_3_tax}
						{/if}
						{if !$theme_vars_enable_shipping_tier_5_option_3_sales_tax}
							{assign var=omit_tax value=true}
						{else}
							{assign var=omit_tax value=false}
						{/if}			
					{/if}
					{if $shipping_in_use=="5_4"}
						{if $freetier5option4}
							{assign var=shipping value=0.00}
							{assign var=shipping_tax value=0.00}
						{else}
							{assign var=shipping value=$shipping_tier_5_option_4_net}
						{assign var=shipping_orig value=$theme_vars_shipping_tier_5_option_4_price}
							{assign var=shipping_tax value=$shipping_tier_5_option_4_tax}
						{/if}
						{if !$theme_vars_enable_shipping_tier_5_option_4_sales_tax}
							{assign var=omit_tax value=true}
						{else}
							{assign var=omit_tax value=false}
						{/if}			
					{/if}
					{if $shipping_in_use=="5_5"}
						{if $freetier5option5}
							{assign var=shipping value=0.00}
							{assign var=shipping_tax value=0.00}
						{else}
							{assign var=shipping value=$shipping_tier_5_option_5_net}
						{assign var=shipping_orig value=$theme_vars_shipping_tier_5_option_5_price}
							{assign var=shipping_tax value=$shipping_tier_5_option_5_tax}
						{/if}
						{if !$theme_vars_enable_shipping_tier_5_option_5_sales_tax}
							{assign var=omit_tax value=true}
						{else}
							{assign var=omit_tax value=false}
						{/if}			
					{/if}
					{if $shipping_in_use=="5_6"}
						{if $freetier5option6}
							{assign var=shipping value=0.00}
							{assign var=shipping_tax value=0.00}
						{else}
							{assign var=shipping value=$shipping_tier_5_option_6_net}
						{assign var=shipping_orig value=$theme_vars_shipping_tier_5_option_6_price}
							{assign var=shipping_tax value=$shipping_tier_5_option_6_tax}
						{/if}
						{if !$theme_vars_enable_shipping_tier_5_option_6_sales_tax}
							{assign var=omit_tax value=true}
						{else}
							{assign var=omit_tax value=false}
						{/if}			
					{/if}
					{if $shipping_in_use=="5_7"}
						{if $freetier5option7}
							{assign var=shipping value=0.00}
							{assign var=shipping_tax value=0.00}
						{else}
							{assign var=shipping value=$shipping_tier_5_option_7_net}
						{assign var=shipping_orig value=$theme_vars_shipping_tier_5_option_7_price}
							{assign var=shipping_tax value=$shipping_tier_5_option_7_tax}
						{/if}
						{if !$theme_vars_enable_shipping_tier_5_option_7_sales_tax}
							{assign var=omit_tax value=true}
						{else}
							{assign var=omit_tax value=false}
						{/if}			
					{/if}
					{if $shipping_in_use=="5_8"}
						{if $freetier5option8}
							{assign var=shipping value=0.00}
							{assign var=shipping_tax value=0.00}
						{else}
							{assign var=shipping value=$shipping_tier_5_option_8_net}
						{assign var=shipping_orig value=$theme_vars_shipping_tier_5_option_8_price}
							{assign var=shipping_tax value=$shipping_tier_5_option_8_tax}
						{/if}
						{if !$theme_vars_enable_shipping_tier_5_option_8_sales_tax}
							{assign var=omit_tax value=true}
						{else}
							{assign var=omit_tax value=false}
						{/if}			
					{/if}
					{if $shipping_in_use=="5_9"}
						{if $freetier5option9}
							{assign var=shipping value=0.00}
							{assign var=shipping_tax value=0.00}
						{else}
							{assign var=shipping value=$shipping_tier_5_option_9_net}
						{assign var=shipping_orig value=$theme_vars_shipping_tier_5_option_9_price}
							{assign var=shipping_tax value=$shipping_tier_5_option_9_tax}
						{/if}
						{if !$theme_vars_enable_shipping_tier_5_option_9_sales_tax}
							{assign var=omit_tax value=true}
						{else}
							{assign var=omit_tax value=false}
						{/if}			
					{/if}
					{if $shipping_in_use=="5_10"}
						{if $freetier5option10}
							{assign var=shipping value=0.00}
							{assign var=shipping_tax value=0.00}
						{else}
							{assign var=shipping value=$shipping_tier_5_option_10_net}
						{assign var=shipping_orig value=$theme_vars_shipping_tier_5_option_10_price}
							{assign var=shipping_tax value=$shipping_tier_5_option_10_tax}
						{/if}
						{if !$theme_vars_enable_shipping_tier_5_option_10_sales_tax}
							{assign var=omit_tax value=true}
						{else}
							{assign var=omit_tax value=false}
						{/if}
					{/if}
					
					{if $theme_vars_shipping_tier_5_option_2_name!=""}
						<select name="chb_sh">
							<option value="">Please choose</option>

							<option value="5_1" {if $shipping_in_use=="5_1"}selected="selected"{/if}>{$theme_vars_shipping_tier_5_option_1_name}: {if $theme_vars_shipping_tier_5_option_1_price=="0" || $freetier5option1}{$langs.Free}{else}{$currency_sym}{if $include_tax_in_lists && $tax_on_shipping}{if $basket_tax_add}{assign var="si" value=$shipping_tier_5_option_1_net+$shipping_tier_5_option_1_tax+$cms_shipping_total+$cms_shipping_tax}{else}{assign var="si" value=$theme_vars_shipping_tier_5_option_1_price+$cms_shipping_total}{/if}{else}{assign var="si" value=$shipping_tier_5_option_1_net}{/if}{"%i"|money_format:$si}{/if}</option>
							<option value="5_2" {if $shipping_in_use=="5_2"}selected="selected"{/if}>{$theme_vars_shipping_tier_5_option_2_name}: {if $theme_vars_shipping_tier_5_option_2_price=="0" || $freetier5option2}{$langs.Free}{else}{$currency_sym}{if $include_tax_in_lists && $tax_on_shipping}{if $basket_tax_add}{assign var="si" value=$shipping_tier_5_option_2_net+$shipping_tier_5_option_2_tax+$cms_shipping_total+$cms_shipping_tax}{else}{assign var="si" value=$theme_vars_shipping_tier_5_option_2_price+$cms_shipping_total}{/if}{else}{assign var="si" value=$shipping_tier_5_option_2_net}{/if}{"%i"|money_format:$si}{/if}</option>
							{if $theme_vars_shipping_tier_5_option_3_name!=""}
							<option value="5_3" {if $shipping_in_use=="5_3"}selected="selected"{/if}>{$theme_vars_shipping_tier_5_option_3_name}: {if $theme_vars_shipping_tier_5_option_3_price=="0" || $freetier5option3}{$langs.Free}{else}{$currency_sym}{if $include_tax_in_lists && $tax_on_shipping}{if $basket_tax_add}{assign var="si" value=$shipping_tier_5_option_3_net+$shipping_tier_5_option_3_tax+$cms_shipping_total+$cms_shipping_tax}{else}{assign var="si" value=$theme_vars_shipping_tier_5_option_3_price+$cms_shipping_total}{/if}{else}{assign var="si" value=$shipping_tier_5_option_3_net}{/if}{"%i"|money_format:$si}{/if}</option>
							{/if}
							{if $theme_vars_shipping_tier_5_option_4_name!=""}
							<option value="5_4" {if $shipping_in_use=="5_4"}selected="selected"{/if}>{$theme_vars_shipping_tier_5_option_4_name}: {if $theme_vars_shipping_tier_5_option_4_price=="0" || $freetier5option4}{$langs.Free}{else}{$currency_sym}{if $include_tax_in_lists && $tax_on_shipping}{if $basket_tax_add}{assign var="si" value=$shipping_tier_5_option_4_net+$shipping_tier_5_option_4_tax+$cms_shipping_total+$cms_shipping_tax}{else}{assign var="si" value=$theme_vars_shipping_tier_5_option_4_price+$cms_shipping_total}{/if}{else}{assign var="si" value=$shipping_tier_5_option_4_net}{/if}{"%i"|money_format:$si}{/if}</option>
							{/if}
							{if $theme_vars_shipping_tier_5_option_5_name!=""}
							<option value="5_5" {if $shipping_in_use=="5_5"}selected="selected"{/if}>{$theme_vars_shipping_tier_5_option_5_name}: {if $theme_vars_shipping_tier_5_option_5_price=="0" || $freetier5option5}{$langs.Free}{else}{$currency_sym}{if $include_tax_in_lists && $tax_on_shipping}{if $basket_tax_add}{assign var="si" value=$shipping_tier_5_option_5_net+$shipping_tier_5_option_5_tax+$cms_shipping_total+$cms_shipping_tax}{else}{assign var="si" value=$theme_vars_shipping_tier_5_option_5_price+$cms_shipping_total}{/if}{else}{assign var="si" value=$shipping_tier_5_option_5_net}{/if}{"%i"|money_format:$si}{/if}</option>
							{/if}
							{if $theme_vars_shipping_tier_5_option_6_name!=""}
							<option value="5_6" {if $shipping_in_use=="5_6"}selected="selected"{/if}>{$theme_vars_shipping_tier_5_option_6_name}: {if $theme_vars_shipping_tier_5_option_6_price=="0" || $freetier5option6}{$langs.Free}{else}{$currency_sym}{if $include_tax_in_lists && $tax_on_shipping}{if $basket_tax_add}{assign var="si" value=$shipping_tier_5_option_6_net+$shipping_tier_5_option_6_tax+$cms_shipping_total+$cms_shipping_tax}{else}{assign var="si" value=$theme_vars_shipping_tier_5_option_6_price+$cms_shipping_total}{/if}{else}{assign var="si" value=$shipping_tier_5_option_6_net}{/if}{"%i"|money_format:$si}{/if}</option>
							{/if}
							{if $theme_vars_shipping_tier_5_option_7_name!=""}
							<option value="5_7" {if $shipping_in_use=="5_7"}selected="selected"{/if}>{$theme_vars_shipping_tier_5_option_7_name}: {if $theme_vars_shipping_tier_5_option_7_price=="0" || $freetier5option7}{$langs.Free}{else}{$currency_sym}{if $include_tax_in_lists && $tax_on_shipping}{if $basket_tax_add}{assign var="si" value=$shipping_tier_5_option_7_net+$shipping_tier_5_option_7_tax+$cms_shipping_total+$cms_shipping_tax}{else}{assign var="si" value=$theme_vars_shipping_tier_5_option_7_price+$cms_shipping_total}{/if}{else}{assign var="si" value=$shipping_tier_5_option_7_net}{/if}{"%i"|money_format:$si}{/if}</option>
							{/if}
							{if $theme_vars_shipping_tier_5_option_8_name!=""}
							<option value="5_8" {if $shipping_in_use=="5_8"}selected="selected"{/if}>{$theme_vars_shipping_tier_5_option_8_name}: {if $theme_vars_shipping_tier_5_option_8_price=="0" || $freetier5option8}{$langs.Free}{else}{$currency_sym}{if $include_tax_in_lists && $tax_on_shipping}{if $basket_tax_add}{assign var="si" value=$shipping_tier_5_option_8_net+$shipping_tier_5_option_8_tax+$cms_shipping_total+$cms_shipping_tax}{else}{assign var="si" value=$theme_vars_shipping_tier_5_option_8_price+$cms_shipping_total}{/if}{else}{assign var="si" value=$shipping_tier_5_option_8_net}{/if}{"%i"|money_format:$si}{/if}</option>
							{/if}
							{if $theme_vars_shipping_tier_5_option_9_name!=""}
							<option value="5_9" {if $shipping_in_use=="5_9"}selected="selected"{/if}>{$theme_vars_shipping_tier_5_option_9_name}: {if $theme_vars_shipping_tier_5_option_9_price=="0" || $freetier5option9}{$langs.Free}{else}{$currency_sym}{if $include_tax_in_lists && $tax_on_shipping}{if $basket_tax_add}{assign var="si" value=$shipping_tier_5_option_9_net+$shipping_tier_5_option_9_tax+$cms_shipping_total+$cms_shipping_tax}{else}{assign var="si" value=$theme_vars_shipping_tier_5_option_9_price+$cms_shipping_total}{/if}{else}{assign var="si" value=$shipping_tier_5_option_9_net}{/if}{"%i"|money_format:$si}{/if}</option>
							{/if}
							{if $theme_vars_shipping_tier_5_option_10_name!=""}
							<option value="5_10" {if $shipping_in_use=="5_10"}selected="selected"{/if}>{$theme_vars_shipping_tier_5_option_10_name}: {if $theme_vars_shipping_tier_5_option_10_price=="0" || $freetier5option10}{$langs.Free}{else}{$currency_sym}{if $include_tax_in_lists && $tax_on_shipping}{if $basket_tax_add}{assign var="si" value=$shipping_tier_5_option_10_net+$shipping_tier_5_option_10_tax+$cms_shipping_total+$cms_shipping_tax}{else}{assign var="si" value=$theme_vars_shipping_tier_5_option_10_price+$cms_shipping_total}{/if}{else}{assign var="si" value=$shipping_tier_5_option_10_net}{/if}{"%i"|money_format:$si}{/if}</option>
							{/if}
						</select>
					{else}
						<p>{if $theme_vars_shipping_tier_5_option_1_price=="0" || $freetier5option1}{$langs.Free}{else}{$theme_vars_shipping_tier_5_option_1_name}: {$currency_sym}{if $include_tax_in_lists && $tax_on_shipping}{if $basket_tax_add}{assign var="si" value=$shipping_tier_5_option_1_net+$shipping_tier_5_option_1_tax}{else}{assign var="si" value=$theme_vars_shipping_tier_5_option_1_price}{/if}{else}{assign var="si" value=$shipping_tier_5_option_1_net}{/if}{"%i"|money_format:$si}{/if}</p>
					{/if}
				{elseif $theme_vars_enable_shipping_tier_4 && ( 
				($net_totals>=$theme_vars_shipping_tier_4_threshold&&$theme_vars_shipping_tier_4_threshold!="") ||
				($weights>=$theme_vars_shipping_tier_4_threshold_weight&&$theme_vars_shipping_tier_4_threshold_weight!="") ||
				($volumes>=$theme_vars_shipping_tier_4_threshold_volume&&$theme_vars_shipping_tier_4_threshold_volume!="")
				)}
					
					{if (($shipping_in_use=="4_1" && $theme_vars_shipping_tier_4_option_2_name!="") || $theme_vars_shipping_tier_4_option_2_name=="") || $smarty.request.step2}
						{if $freetier4option1}
							{assign var=shipping value=0.00}
							{assign var=shipping_tax value=0.00}
						{else}
							{assign var=shipping value=$shipping_tier_4_option_1_net}
							{assign var=shipping_orig value=$theme_vars_shipping_tier_4_option_1_price}
							{assign var=shipping_tax value=$shipping_tier_4_option_1_tax}
						{/if}
						{if !$theme_vars_enable_shipping_tier_4_option_1_sales_tax}
							{assign var=omit_tax value=true}
						{/if}
					{/if}
					
					{if $shipping_in_use=="4_2"}
						{if $freetier4option2}
							{assign var=shipping value=0.00}
							{assign var=shipping_tax value=0.00}
						{else}
							{assign var=shipping value=$shipping_tier_4_option_2_net}
						{assign var=shipping_orig value=$theme_vars_shipping_tier_4_option_2_price}
							{assign var=shipping_tax value=$shipping_tier_4_option_2_tax}
						{/if}
						{if !$theme_vars_enable_shipping_tier_4_option_2_sales_tax}
							{assign var=omit_tax value=true}
						{else}
							{assign var=omit_tax value=false}
						{/if}			
					
					{/if}
					{if $shipping_in_use=="4_3"}
						{if $freetier4option3}
							{assign var=shipping value=0.00}
							{assign var=shipping_tax value=0.00}
						{else}
							{assign var=shipping value=$shipping_tier_4_option_3_net}
						{assign var=shipping_orig value=$theme_vars_shipping_tier_4_option_3_price}
							{assign var=shipping_tax value=$shipping_tier_4_option_3_tax}
						{/if}
						{if !$theme_vars_enable_shipping_tier_4_option_3_sales_tax}
							{assign var=omit_tax value=true}
						{else}
							{assign var=omit_tax value=false}
						{/if}			
					{/if}
					{if $shipping_in_use=="4_4"}
						{if $freetier4option4}
							{assign var=shipping value=0.00}
							{assign var=shipping_tax value=0.00}
						{else}
							{assign var=shipping value=$shipping_tier_4_option_4_net}
						{assign var=shipping_orig value=$theme_vars_shipping_tier_4_option_4_price}
							{assign var=shipping_tax value=$shipping_tier_4_option_4_tax}
						{/if}
						{if !$theme_vars_enable_shipping_tier_4_option_4_sales_tax}
							{assign var=omit_tax value=true}
						{else}
							{assign var=omit_tax value=false}
						{/if}			
					{/if}
					{if $shipping_in_use=="4_5"}
						{if $freetier4option5}
							{assign var=shipping value=0.00}
							{assign var=shipping_tax value=0.00}
						{else}
							{assign var=shipping value=$shipping_tier_4_option_5_net}
						{assign var=shipping_orig value=$theme_vars_shipping_tier_4_option_5_price}
							{assign var=shipping_tax value=$shipping_tier_4_option_5_tax}
						{/if}
						{if !$theme_vars_enable_shipping_tier_4_option_5_sales_tax}
							{assign var=omit_tax value=true}
						{else}
							{assign var=omit_tax value=false}
						{/if}			
					{/if}
					{if $shipping_in_use=="4_6"}
						{if $freetier4option6}
							{assign var=shipping value=0.00}
							{assign var=shipping_tax value=0.00}
						{else}
							{assign var=shipping value=$shipping_tier_4_option_6_net}
						{assign var=shipping_orig value=$theme_vars_shipping_tier_4_option_6_price}
							{assign var=shipping_tax value=$shipping_tier_4_option_6_tax}
						{/if}
						{if !$theme_vars_enable_shipping_tier_4_option_6_sales_tax}
							{assign var=omit_tax value=true}
						{else}
							{assign var=omit_tax value=false}
						{/if}			
					{/if}
					{if $shipping_in_use=="4_7"}
						{if $freetier4option7}
							{assign var=shipping value=0.00}
							{assign var=shipping_tax value=0.00}
						{else}
							{assign var=shipping value=$shipping_tier_4_option_7_net}
						{assign var=shipping_orig value=$theme_vars_shipping_tier_4_option_7_price}
							{assign var=shipping_tax value=$shipping_tier_4_option_7_tax}
						{/if}
						{if !$theme_vars_enable_shipping_tier_4_option_7_sales_tax}
							{assign var=omit_tax value=true}
						{else}
							{assign var=omit_tax value=false}
						{/if}			
					{/if}
					{if $shipping_in_use=="4_8"}
						{if $freetier4option8}
							{assign var=shipping value=0.00}
							{assign var=shipping_tax value=0.00}
						{else}
							{assign var=shipping value=$shipping_tier_4_option_8_net}
						{assign var=shipping_orig value=$theme_vars_shipping_tier_4_option_8_price}
							{assign var=shipping_tax value=$shipping_tier_4_option_8_tax}
						{/if}
						{if !$theme_vars_enable_shipping_tier_4_option_8_sales_tax}
							{assign var=omit_tax value=true}
						{else}
							{assign var=omit_tax value=false}
						{/if}			
					{/if}
					{if $shipping_in_use=="4_9"}
						{if $freetier4option9}
							{assign var=shipping value=0.00}
							{assign var=shipping_tax value=0.00}
						{else}
							{assign var=shipping value=$shipping_tier_4_option_9_net}
						{assign var=shipping_orig value=$theme_vars_shipping_tier_4_option_9_price}
							{assign var=shipping_tax value=$shipping_tier_4_option_9_tax}
						{/if}
						{if !$theme_vars_enable_shipping_tier_4_option_9_sales_tax}
							{assign var=omit_tax value=true}
						{else}
							{assign var=omit_tax value=false}
						{/if}			
					{/if}
					{if $shipping_in_use=="4_10"}
						{if $freetier4option10}
							{assign var=shipping value=0.00}
							{assign var=shipping_tax value=0.00}
						{else}
							{assign var=shipping value=$shipping_tier_4_option_10_net}
						{assign var=shipping_orig value=$theme_vars_shipping_tier_4_option_10_price}
							{assign var=shipping_tax value=$shipping_tier_4_option_10_tax}
						{/if}
						{if !$theme_vars_enable_shipping_tier_4_option_10_sales_tax}
							{assign var=omit_tax value=true}
						{else}
							{assign var=omit_tax value=false}
						{/if}			
					{/if}
					
					{if $theme_vars_shipping_tier_4_option_2_name!=""}
						<select name="chb_sh">
							<option value="">Please choose</option>

							<option value="4_1" {if $shipping_in_use=="4_1"}selected="selected"{/if}>{$theme_vars_shipping_tier_4_option_1_name}: {if $theme_vars_shipping_tier_4_option_1_price=="0" || $freetier4option1}{$langs.Free}{else}{$currency_sym}{if $include_tax_in_lists && $tax_on_shipping}{if $basket_tax_add}{assign var="si" value=$shipping_tier_4_option_1_net+$shipping_tier_4_option_1_tax+$cms_shipping_total+$cms_shipping_tax}{else}{assign var="si" value=$theme_vars_shipping_tier_4_option_1_price+$cms_shipping_total}{/if}{else}{assign var="si" value=$shipping_tier_4_option_1_net}{/if}{"%i"|money_format:$si}{/if}</option>
							<option value="4_2" {if $shipping_in_use=="4_2"}selected="selected"{/if}>{$theme_vars_shipping_tier_4_option_2_name}: {if $theme_vars_shipping_tier_4_option_2_price=="0" || $freetier4option2}{$langs.Free}{else}{$currency_sym}{if $include_tax_in_lists && $tax_on_shipping}{if $basket_tax_add}{assign var="si" value=$shipping_tier_4_option_2_net+$shipping_tier_4_option_2_tax+$cms_shipping_total+$cms_shipping_tax}{else}{assign var="si" value=$theme_vars_shipping_tier_4_option_2_price+$cms_shipping_total}{/if}{else}{assign var="si" value=$shipping_tier_4_option_2_net}{/if}{"%i"|money_format:$si}{/if}</option>
							{if $theme_vars_shipping_tier_4_option_3_name!=""}
							<option value="4_3" {if $shipping_in_use=="4_3"}selected="selected"{/if}>{$theme_vars_shipping_tier_4_option_3_name}: {if $theme_vars_shipping_tier_4_option_3_price=="0" || $freetier4option3}{$langs.Free}{else}{$currency_sym}{if $include_tax_in_lists && $tax_on_shipping}{if $basket_tax_add}{assign var="si" value=$shipping_tier_4_option_3_net+$shipping_tier_4_option_3_tax+$cms_shipping_total+$cms_shipping_tax}{else}{assign var="si" value=$theme_vars_shipping_tier_4_option_3_price+$cms_shipping_total}{/if}{else}{assign var="si" value=$shipping_tier_4_option_3_net}{/if}{"%i"|money_format:$si}{/if}</option>
							{/if}
							{if $theme_vars_shipping_tier_4_option_4_name!=""}
							<option value="4_4" {if $shipping_in_use=="4_4"}selected="selected"{/if}>{$theme_vars_shipping_tier_4_option_4_name}: {if $theme_vars_shipping_tier_4_option_4_price=="0" || $freetier4option4}{$langs.Free}{else}{$currency_sym}{if $include_tax_in_lists && $tax_on_shipping}{if $basket_tax_add}{assign var="si" value=$shipping_tier_4_option_4_net+$shipping_tier_4_option_4_tax+$cms_shipping_total+$cms_shipping_tax}{else}{assign var="si" value=$theme_vars_shipping_tier_4_option_4_price+$cms_shipping_total}{/if}{else}{assign var="si" value=$shipping_tier_4_option_4_net}{/if}{"%i"|money_format:$si}{/if}</option>
							{/if}
							{if $theme_vars_shipping_tier_4_option_5_name!=""}
							<option value="4_5" {if $shipping_in_use=="4_5"}selected="selected"{/if}>{$theme_vars_shipping_tier_4_option_5_name}: {if $theme_vars_shipping_tier_4_option_5_price=="0" || $freetier4option5}{$langs.Free}{else}{$currency_sym}{if $include_tax_in_lists && $tax_on_shipping}{if $basket_tax_add}{assign var="si" value=$shipping_tier_4_option_5_net+$shipping_tier_4_option_5_tax+$cms_shipping_total+$cms_shipping_tax}{else}{assign var="si" value=$theme_vars_shipping_tier_4_option_5_price+$cms_shipping_total}{/if}{else}{assign var="si" value=$shipping_tier_4_option_5_net}{/if}{"%i"|money_format:$si}{/if}</option>
							{/if}
							{if $theme_vars_shipping_tier_4_option_6_name!=""}
							<option value="4_6" {if $shipping_in_use=="4_6"}selected="selected"{/if}>{$theme_vars_shipping_tier_4_option_6_name}: {if $theme_vars_shipping_tier_4_option_6_price=="0" || $freetier4option6}{$langs.Free}{else}{$currency_sym}{if $include_tax_in_lists && $tax_on_shipping}{if $basket_tax_add}{assign var="si" value=$shipping_tier_4_option_6_net+$shipping_tier_4_option_6_tax+$cms_shipping_total+$cms_shipping_tax}{else}{assign var="si" value=$theme_vars_shipping_tier_4_option_6_price+$cms_shipping_total}{/if}{else}{assign var="si" value=$shipping_tier_4_option_6_net}{/if}{"%i"|money_format:$si}{/if}</option>
							{/if}
							{if $theme_vars_shipping_tier_4_option_7_name!=""}
							<option value="4_7" {if $shipping_in_use=="4_7"}selected="selected"{/if}>{$theme_vars_shipping_tier_4_option_7_name}: {if $theme_vars_shipping_tier_4_option_7_price=="0" || $freetier4option7}{$langs.Free}{else}{$currency_sym}{if $include_tax_in_lists && $tax_on_shipping}{if $basket_tax_add}{assign var="si" value=$shipping_tier_4_option_7_net+$shipping_tier_4_option_7_tax+$cms_shipping_total+$cms_shipping_tax}{else}{assign var="si" value=$theme_vars_shipping_tier_4_option_7_price+$cms_shipping_total}{/if}{else}{assign var="si" value=$shipping_tier_4_option_7_net}{/if}{"%i"|money_format:$si}{/if}</option>
							{/if}
							{if $theme_vars_shipping_tier_4_option_8_name!=""}
							<option value="4_8" {if $shipping_in_use=="4_8"}selected="selected"{/if}>{$theme_vars_shipping_tier_4_option_8_name}: {if $theme_vars_shipping_tier_4_option_8_price=="0" || $freetier4option8}{$langs.Free}{else}{$currency_sym}{if $include_tax_in_lists && $tax_on_shipping}{if $basket_tax_add}{assign var="si" value=$shipping_tier_4_option_8_net+$shipping_tier_4_option_8_tax+$cms_shipping_total+$cms_shipping_tax}{else}{assign var="si" value=$theme_vars_shipping_tier_4_option_8_price+$cms_shipping_total}{/if}{else}{assign var="si" value=$shipping_tier_4_option_8_net}{/if}{"%i"|money_format:$si}{/if}</option>
							{/if}
							{if $theme_vars_shipping_tier_4_option_9_name!=""}
							<option value="4_9" {if $shipping_in_use=="4_9"}selected="selected"{/if}>{$theme_vars_shipping_tier_4_option_9_name}: {if $theme_vars_shipping_tier_4_option_9_price=="0" || $freetier4option9}{$langs.Free}{else}{$currency_sym}{if $include_tax_in_lists && $tax_on_shipping}{if $basket_tax_add}{assign var="si" value=$shipping_tier_4_option_9_net+$shipping_tier_4_option_9_tax+$cms_shipping_total+$cms_shipping_tax}{else}{assign var="si" value=$theme_vars_shipping_tier_4_option_9_price+$cms_shipping_total}{/if}{else}{assign var="si" value=$shipping_tier_4_option_9_net}{/if}{"%i"|money_format:$si}{/if}</option>
							{/if}
							{if $theme_vars_shipping_tier_4_option_10_name!=""}
							<option value="4_10" {if $shipping_in_use=="4_10"}selected="selected"{/if}>{$theme_vars_shipping_tier_4_option_10_name}: {if $theme_vars_shipping_tier_4_option_10_price=="0" || $freetier4option10}{$langs.Free}{else}{$currency_sym}{if $include_tax_in_lists && $tax_on_shipping}{if $basket_tax_add}{assign var="si" value=$shipping_tier_4_option_10_net+$shipping_tier_4_option_10_tax+$cms_shipping_total+$cms_shipping_tax}{else}{assign var="si" value=$theme_vars_shipping_tier_4_option_10_price+$cms_shipping_total}{/if}{else}{assign var="si" value=$shipping_tier_4_option_10_net}{/if}{"%i"|money_format:$si}{/if}</option>
							{/if}
						</select>
					{else}
						<p>{if $theme_vars_shipping_tier_4_option_1_price=="0" || $freetier4option1}{$langs.Free}{else}{$theme_vars_shipping_tier_4_option_1_name}: {$currency_sym}{if $include_tax_in_lists && $tax_on_shipping}{if $basket_tax_add}{assign var="si" value=$shipping_tier_4_option_1_net+$shipping_tier_4_option_1_tax}{else}{assign var="si" value=$theme_vars_shipping_tier_4_option_1_price}{/if}{else}{assign var="si" value=$shipping_tier_4_option_1_net}{/if}{"%i"|money_format:$si}{/if}</p>
					{/if}
				{elseif $theme_vars_enable_shipping_tier_3 && ( 
				($net_totals>=$theme_vars_shipping_tier_3_threshold&&$theme_vars_shipping_tier_3_threshold!="") ||
				($weights>=$theme_vars_shipping_tier_3_threshold_weight&&$theme_vars_shipping_tier_3_threshold_weight!="") ||
				($volumes>=$theme_vars_shipping_tier_3_threshold_volume&&$theme_vars_shipping_tier_3_threshold_volume!="")
				)}

					{if (($shipping_in_use=="3_1" && $theme_vars_shipping_tier_3_option_2_name!="") || $theme_vars_shipping_tier_3_option_2_name=="") || $smarty.request.step2}
						{if $freetier3option1}
							{assign var=shipping value=0.00}
							{assign var=shipping_tax value=0.00}
						{else}
							{assign var=shipping value=$shipping_tier_3_option_1_net}
							{assign var=shipping_orig value=$theme_vars_shipping_tier_3_option_1_price}
							{assign var=shipping_tax value=$shipping_tier_3_option_1_tax}
						{/if}
						{if !$theme_vars_enable_shipping_tier_3_option_1_sales_tax}
							{assign var=omit_tax value=true}
						{/if}
					{/if}

					{if $shipping_in_use=="3_2"}
						{if $freetier3option2}
							{assign var=shipping value=0.00}
							{assign var=shipping_tax value=0.00}
						{else}
							{assign var=shipping value=$shipping_tier_3_option_2_net}
						{assign var=shipping_orig value=$theme_vars_shipping_tier_3_option_2_price}
							{assign var=shipping_tax value=$shipping_tier_3_option_2_tax}
						{/if}
						{if !$theme_vars_enable_shipping_tier_3_option_2_sales_tax}
							{assign var=omit_tax value=true}
						{else}
							{assign var=omit_tax value=false}
						{/if}			
					
					{/if}
					{if $shipping_in_use=="3_3"}
						{if $freetier3option3}
							{assign var=shipping value=0.00}
							{assign var=shipping_tax value=0.00}
						{else}
							{assign var=shipping value=$shipping_tier_3_option_3_net}
						{assign var=shipping_orig value=$theme_vars_shipping_tier_3_option_3_price}
							{assign var=shipping_tax value=$shipping_tier_3_option_3_tax}
						{/if}
						{if !$theme_vars_enable_shipping_tier_3_option_3_sales_tax}
							{assign var=omit_tax value=true}
						{else}
							{assign var=omit_tax value=false}
						{/if}			
					{/if}
					{if $shipping_in_use=="3_4"}
						{if $freetier3option4}
							{assign var=shipping value=0.00}
							{assign var=shipping_tax value=0.00}
						{else}
							{assign var=shipping value=$shipping_tier_3_option_4_net}
						{assign var=shipping_orig value=$theme_vars_shipping_tier_3_option_4_price}
							{assign var=shipping_tax value=$shipping_tier_3_option_4_tax}
						{/if}
						{if !$theme_vars_enable_shipping_tier_3_option_4_sales_tax}
							{assign var=omit_tax value=true}
						{else}
							{assign var=omit_tax value=false}
						{/if}			
					{/if}
					{if $shipping_in_use=="3_5"}
						{if $freetier3option5}
							{assign var=shipping value=0.00}
							{assign var=shipping_tax value=0.00}
						{else}
							{assign var=shipping value=$shipping_tier_3_option_5_net}
						{assign var=shipping_orig value=$theme_vars_shipping_tier_3_option_5_price}
							{assign var=shipping_tax value=$shipping_tier_3_option_5_tax}
						{/if}
						{if !$theme_vars_enable_shipping_tier_3_option_5_sales_tax}
							{assign var=omit_tax value=true}
						{else}
							{assign var=omit_tax value=false}
						{/if}			
					{/if}
					{if $shipping_in_use=="3_6"}
						{if $freetier3option6}
							{assign var=shipping value=0.00}
							{assign var=shipping_tax value=0.00}
						{else}
							{assign var=shipping value=$shipping_tier_3_option_6_net}
						{assign var=shipping_orig value=$theme_vars_shipping_tier_3_option_6_price}
							{assign var=shipping_tax value=$shipping_tier_3_option_6_tax}
						{/if}
						{if !$theme_vars_enable_shipping_tier_3_option_6_sales_tax}
							{assign var=omit_tax value=true}
						{else}
							{assign var=omit_tax value=false}
						{/if}			
					{/if}
					{if $shipping_in_use=="3_7"}
						{if $freetier3option7}
							{assign var=shipping value=0.00}
							{assign var=shipping_tax value=0.00}
						{else}
							{assign var=shipping value=$shipping_tier_3_option_7_net}
						{assign var=shipping_orig value=$theme_vars_shipping_tier_3_option_7_price}
							{assign var=shipping_tax value=$shipping_tier_3_option_7_tax}
						{/if}
						{if !$theme_vars_enable_shipping_tier_3_option_7_sales_tax}
							{assign var=omit_tax value=true}
						{else}
							{assign var=omit_tax value=false}
						{/if}			
					{/if}
					{if $shipping_in_use=="3_8"}
						{if $freetier3option8}
							{assign var=shipping value=0.00}
							{assign var=shipping_tax value=0.00}
						{else}
							{assign var=shipping value=$shipping_tier_3_option_8_net}
						{assign var=shipping_orig value=$theme_vars_shipping_tier_3_option_8_price}
							{assign var=shipping_tax value=$shipping_tier_3_option_8_tax}
						{/if}
						{if !$theme_vars_enable_shipping_tier_3_option_8_sales_tax}
							{assign var=omit_tax value=true}
						{else}
							{assign var=omit_tax value=false}
						{/if}
					{/if}
					{if $shipping_in_use=="3_9"}
						{if $freetier3option9}
							{assign var=shipping value=0.00}
							{assign var=shipping_tax value=0.00}
						{else}
							{assign var=shipping value=$shipping_tier_3_option_9_net}
						{assign var=shipping_orig value=$theme_vars_shipping_tier_3_option_9_price}
							{assign var=shipping_tax value=$shipping_tier_3_option_9_tax}
						{/if}
						{if !$theme_vars_enable_shipping_tier_3_option_9_sales_tax}
							{assign var=omit_tax value=true}
						{else}
							{assign var=omit_tax value=false}
						{/if}			
					{/if}
					{if $shipping_in_use=="3_10"}
						{if $freetier3option10}
							{assign var=shipping value=0.00}
							{assign var=shipping_tax value=0.00}
						{else}
							{assign var=shipping value=$shipping_tier_3_option_10_net}
						{assign var=shipping_orig value=$theme_vars_shipping_tier_3_option_10_price}
							{assign var=shipping_tax value=$shipping_tier_3_option_10_tax}
						{/if}
						{if !$theme_vars_enable_shipping_tier_3_option_10_sales_tax}
							{assign var=omit_tax value=true}
						{else}
							{assign var=omit_tax value=false}
						{/if}			
					{/if}

					{if $theme_vars_shipping_tier_3_option_2_name!=""}
						<select name="chb_sh">
							<option value="">Please choose</option>

							<option value="3_1" {if $shipping_in_use=="3_1"}selected="selected"{/if}>{$theme_vars_shipping_tier_3_option_1_name}: {if $theme_vars_shipping_tier_3_option_1_price=="0" || $freetier3option1}{$langs.Free}{else}{$currency_sym}{if $include_tax_in_lists && $tax_on_shipping}{if $basket_tax_add}{assign var="si" value=$shipping_tier_3_option_1_net+$shipping_tier_3_option_1_tax+$cms_shipping_total+$cms_shipping_tax}{else}{assign var="si" value=$theme_vars_shipping_tier_3_option_1_price+$cms_shipping_total}{/if}{else}{assign var="si" value=$shipping_tier_3_option_1_net}{/if}{"%i"|money_format:$si}{/if}</option>
							<option value="3_2" {if $shipping_in_use=="3_2"}selected="selected"{/if}>{$theme_vars_shipping_tier_3_option_2_name}: {if $theme_vars_shipping_tier_3_option_2_price=="0" || $freetier3option2}{$langs.Free}{else}{$currency_sym}{if $include_tax_in_lists && $tax_on_shipping}{if $basket_tax_add}{assign var="si" value=$shipping_tier_3_option_2_net+$shipping_tier_3_option_2_tax+$cms_shipping_total+$cms_shipping_tax}{else}{assign var="si" value=$theme_vars_shipping_tier_3_option_2_price+$cms_shipping_total}{/if}{else}{assign var="si" value=$shipping_tier_3_option_2_net}{/if}{"%i"|money_format:$si}{/if}</option>
							{if $theme_vars_shipping_tier_3_option_3_name!=""}
							<option value="3_3" {if $shipping_in_use=="3_3"}selected="selected"{/if}>{$theme_vars_shipping_tier_3_option_3_name}: {if $theme_vars_shipping_tier_3_option_3_price=="0" || $freetier3option3}{$langs.Free}{else}{$currency_sym}{if $include_tax_in_lists && $tax_on_shipping}{if $basket_tax_add}{assign var="si" value=$shipping_tier_3_option_3_net+$shipping_tier_3_option_3_tax+$cms_shipping_total+$cms_shipping_tax}{else}{assign var="si" value=$theme_vars_shipping_tier_3_option_3_price+$cms_shipping_total}{/if}{else}{assign var="si" value=$shipping_tier_3_option_3_net}{/if}{"%i"|money_format:$si}{/if}</option>
							{/if}
							{if $theme_vars_shipping_tier_3_option_4_name!=""}
							<option value="3_4" {if $shipping_in_use=="3_4"}selected="selected"{/if}>{$theme_vars_shipping_tier_3_option_4_name}: {if $theme_vars_shipping_tier_3_option_4_price=="0" || $freetier3option4}{$langs.Free}{else}{$currency_sym}{if $include_tax_in_lists && $tax_on_shipping}{if $basket_tax_add}{assign var="si" value=$shipping_tier_3_option_4_net+$shipping_tier_3_option_4_tax+$cms_shipping_total+$cms_shipping_tax}{else}{assign var="si" value=$theme_vars_shipping_tier_3_option_4_price+$cms_shipping_total}{/if}{else}{assign var="si" value=$shipping_tier_3_option_4_net}{/if}{"%i"|money_format:$si}{/if}</option>
							{/if}
							{if $theme_vars_shipping_tier_3_option_5_name!=""}
							<option value="3_5" {if $shipping_in_use=="3_5"}selected="selected"{/if}>{$theme_vars_shipping_tier_3_option_5_name}: {if $theme_vars_shipping_tier_3_option_5_price=="0" || $freetier3option5}{$langs.Free}{else}{$currency_sym}{if $include_tax_in_lists && $tax_on_shipping}{if $basket_tax_add}{assign var="si" value=$shipping_tier_3_option_5_net+$shipping_tier_3_option_5_tax+$cms_shipping_total+$cms_shipping_tax}{else}{assign var="si" value=$theme_vars_shipping_tier_3_option_5_price+$cms_shipping_total}{/if}{else}{assign var="si" value=$shipping_tier_3_option_5_net}{/if}{"%i"|money_format:$si}{/if}</option>
							{/if}
							{if $theme_vars_shipping_tier_3_option_6_name!=""}
							<option value="3_6" {if $shipping_in_use=="3_6"}selected="selected"{/if}>{$theme_vars_shipping_tier_3_option_6_name}: {if $theme_vars_shipping_tier_3_option_6_price=="0" || $freetier3option6}{$langs.Free}{else}{$currency_sym}{if $include_tax_in_lists && $tax_on_shipping}{if $basket_tax_add}{assign var="si" value=$shipping_tier_3_option_6_net+$shipping_tier_3_option_6_tax+$cms_shipping_total+$cms_shipping_tax}{else}{assign var="si" value=$theme_vars_shipping_tier_3_option_6_price+$cms_shipping_total}{/if}{else}{assign var="si" value=$shipping_tier_3_option_6_net}{/if}{"%i"|money_format:$si}{/if}</option>
							{/if}
							{if $theme_vars_shipping_tier_3_option_7_name!=""}
							<option value="3_7" {if $shipping_in_use=="3_7"}selected="selected"{/if}>{$theme_vars_shipping_tier_3_option_7_name}: {if $theme_vars_shipping_tier_3_option_7_price=="0" || $freetier3option7}{$langs.Free}{else}{$currency_sym}{if $include_tax_in_lists && $tax_on_shipping}{if $basket_tax_add}{assign var="si" value=$shipping_tier_3_option_7_net+$shipping_tier_3_option_7_tax+$cms_shipping_total+$cms_shipping_tax}{else}{assign var="si" value=$theme_vars_shipping_tier_3_option_7_price+$cms_shipping_total}{/if}{else}{assign var="si" value=$shipping_tier_3_option_7_net}{/if}{"%i"|money_format:$si}{/if}</option>
							{/if}
							{if $theme_vars_shipping_tier_3_option_8_name!=""}
							<option value="3_8" {if $shipping_in_use=="3_8"}selected="selected"{/if}>{$theme_vars_shipping_tier_3_option_8_name}: {if $theme_vars_shipping_tier_3_option_8_price=="0" || $freetier3option8}{$langs.Free}{else}{$currency_sym}{if $include_tax_in_lists && $tax_on_shipping}{if $basket_tax_add}{assign var="si" value=$shipping_tier_3_option_8_net+$shipping_tier_3_option_8_tax+$cms_shipping_total+$cms_shipping_tax}{else}{assign var="si" value=$theme_vars_shipping_tier_3_option_8_price+$cms_shipping_total}{/if}{else}{assign var="si" value=$shipping_tier_3_option_8_net}{/if}{"%i"|money_format:$si}{/if}</option>
							{/if}
							{if $theme_vars_shipping_tier_3_option_9_name!=""}
							<option value="3_9" {if $shipping_in_use=="3_9"}selected="selected"{/if}>{$theme_vars_shipping_tier_3_option_9_name}: {if $theme_vars_shipping_tier_3_option_9_price=="0" || $freetier3option9}{$langs.Free}{else}{$currency_sym}{if $include_tax_in_lists && $tax_on_shipping}{if $basket_tax_add}{assign var="si" value=$shipping_tier_3_option_9_net+$shipping_tier_3_option_9_tax+$cms_shipping_total+$cms_shipping_tax}{else}{assign var="si" value=$theme_vars_shipping_tier_3_option_9_price+$cms_shipping_total}{/if}{else}{assign var="si" value=$shipping_tier_3_option_9_net}{/if}{"%i"|money_format:$si}{/if}</option>
							{/if}
							{if $theme_vars_shipping_tier_3_option_10_name!=""}
							<option value="3_10" {if $shipping_in_use=="3_10"}selected="selected"{/if}>{$theme_vars_shipping_tier_3_option_10_name}: {if $theme_vars_shipping_tier_3_option_10_price=="0" || $freetier3option10}{$langs.Free}{else}{$currency_sym}{if $include_tax_in_lists && $tax_on_shipping}{if $basket_tax_add}{assign var="si" value=$shipping_tier_3_option_10_net+$shipping_tier_3_option_10_tax+$cms_shipping_total+$cms_shipping_tax}{else}{assign var="si" value=$theme_vars_shipping_tier_3_option_10_price+$cms_shipping_total}{/if}{else}{assign var="si" value=$shipping_tier_3_option_10_net}{/if}{"%i"|money_format:$si}{/if}</option>
							{/if}
						</select>
					{else}
						<p>{if $theme_vars_shipping_tier_3_option_1_price=="0" || $freetier3option1}{$langs.Free}{else}{$theme_vars_shipping_tier_3_option_1_name}: {$currency_sym}{if $include_tax_in_lists && $tax_on_shipping}{if $basket_tax_add}{assign var="si" value=$shipping_tier_3_option_1_net+$shipping_tier_3_option_1_tax}{else}{assign var="si" value=$theme_vars_shipping_tier_3_option_1_price}{/if}{else}{assign var="si" value=$shipping_tier_3_option_1_net}{/if}{"%i"|money_format:$si}{/if}</p>
					{/if}
				{elseif $theme_vars_enable_shipping_tier_2 && ( 
				($net_totals>=$theme_vars_shipping_tier_2_threshold&&$theme_vars_shipping_tier_2_threshold!="") ||
				($weights>=$theme_vars_shipping_tier_2_threshold_weight&&$theme_vars_shipping_tier_2_threshold_weight!="") ||
				($volumes>=$theme_vars_shipping_tier_2_threshold_volume&&$theme_vars_shipping_tier_2_threshold_volume!="")
				)}
					
					{if (($shipping_in_use=="2_1" && $theme_vars_shipping_tier_2_option_2_name!="") || $theme_vars_shipping_tier_2_option_2_name=="") || $smarty.request.step2}
						{if $freetier2option1}
							{assign var=shipping value=0.00}
							{assign var=shipping_tax value=0.00}
						{else}
							{assign var=shipping value=$shipping_tier_2_option_1_net}
							{assign var=shipping_orig value=$theme_vars_shipping_tier_2_option_1_price}
							{assign var=shipping_tax value=$shipping_tier_2_option_1_tax}
						{/if}
						{if !$theme_vars_enable_shipping_tier_2_option_1_sales_tax}
							{assign var=omit_tax value=true}
						{/if}
					{/if}
					
					{if $shipping_in_use=="2_2"}
						{if $freetier2option2}
							{assign var=shipping value=0.00}
							{assign var=shipping_tax value=0.00}
						{else}
							{assign var=shipping value=$shipping_tier_2_option_2_net}
						{assign var=shipping_orig value=$theme_vars_shipping_tier_2_option_2_price}
							{assign var=shipping_tax value=$shipping_tier_2_option_2_tax}
						{/if}
						{if !$theme_vars_enable_shipping_tier_2_option_2_sales_tax}
							{assign var=omit_tax value=true}
						{else}
							{assign var=omit_tax value=false}
						{/if}			
					
					{/if}
					{if $shipping_in_use=="2_3"}
						{if $freetier2option3}
							{assign var=shipping value=0.00}
							{assign var=shipping_tax value=0.00}
						{else}
							{assign var=shipping value=$shipping_tier_2_option_3_net}
						{assign var=shipping_orig value=$theme_vars_shipping_tier_2_option_3_price}
							{assign var=shipping_tax value=$shipping_tier_2_option_3_tax}
						{/if}
						{if !$theme_vars_enable_shipping_tier_2_option_3_sales_tax}
							{assign var=omit_tax value=true}
						{else}
							{assign var=omit_tax value=false}
						{/if}			
					{/if}
					{if $shipping_in_use=="2_4"}
						{if $freetier2option4}
							{assign var=shipping value=0.00}
							{assign var=shipping_tax value=0.00}
						{else}
							{assign var=shipping value=$shipping_tier_2_option_4_net}
						{assign var=shipping_orig value=$theme_vars_shipping_tier_2_option_4_price}
							{assign var=shipping_tax value=$shipping_tier_2_option_4_tax}
						{/if}
						{if !$theme_vars_enable_shipping_tier_2_option_4_sales_tax}
							{assign var=omit_tax value=true}
						{else}
							{assign var=omit_tax value=false}
						{/if}			
					{/if}
					{if $shipping_in_use=="2_5"}
						{if $freetier2option5}
							{assign var=shipping value=0.00}
							{assign var=shipping_tax value=0.00}
						{else}
							{assign var=shipping value=$shipping_tier_2_option_5_net}
						{assign var=shipping_orig value=$theme_vars_shipping_tier_2_option_5_price}
							{assign var=shipping_tax value=$shipping_tier_2_option_5_tax}
						{/if}
						{if !$theme_vars_enable_shipping_tier_2_option_5_sales_tax}
							{assign var=omit_tax value=true}
						{else}
							{assign var=omit_tax value=false}
						{/if}			
					{/if}
					{if $shipping_in_use=="2_6"}
						{if $freetier2option6}
							{assign var=shipping value=0.00}
							{assign var=shipping_tax value=0.00}
						{else}
							{assign var=shipping value=$shipping_tier_2_option_6_net}
						{assign var=shipping_orig value=$theme_vars_shipping_tier_2_option_6_price}
							{assign var=shipping_tax value=$shipping_tier_2_option_6_tax}
						{/if}
						{if !$theme_vars_enable_shipping_tier_2_option_6_sales_tax}
							{assign var=omit_tax value=true}
						{else}
							{assign var=omit_tax value=false}
						{/if}			
					{/if}
					{if $shipping_in_use=="2_7"}
						{if $freetier2option7}
							{assign var=shipping value=0.00}
							{assign var=shipping_tax value=0.00}
						{else}
							{assign var=shipping value=$shipping_tier_2_option_7_net}
						{assign var=shipping_orig value=$theme_vars_shipping_tier_2_option_7_price}
							{assign var=shipping_tax value=$shipping_tier_2_option_7_tax}
						{/if}
						{if !$theme_vars_enable_shipping_tier_2_option_7_sales_tax}
							{assign var=omit_tax value=true}
						{else}
							{assign var=omit_tax value=false}
						{/if}			
					{/if}
					{if $shipping_in_use=="2_8"}
						{if $freetier2option8}
							{assign var=shipping value=0.00}
							{assign var=shipping_tax value=0.00}
						{else}
							{assign var=shipping value=$shipping_tier_2_option_8_net}
						{assign var=shipping_orig value=$theme_vars_shipping_tier_2_option_8_price}
							{assign var=shipping_tax value=$shipping_tier_2_option_8_tax}
						{/if}
						{if !$theme_vars_enable_shipping_tier_2_option_8_sales_tax}
							{assign var=omit_tax value=true}
						{else}
							{assign var=omit_tax value=false}
						{/if}			
					{/if}
					{if $shipping_in_use=="2_9"}
						{if $freetier2option9}
							{assign var=shipping value=0.00}
							{assign var=shipping_tax value=0.00}
						{else}
							{assign var=shipping value=$shipping_tier_2_option_9_net}
						{assign var=shipping_orig value=$theme_vars_shipping_tier_2_option_9_price}
							{assign var=shipping_tax value=$shipping_tier_2_option_9_tax}
						{/if}
						{if !$theme_vars_enable_shipping_tier_2_option_9_sales_tax}
							{assign var=omit_tax value=true}
						{else}
							{assign var=omit_tax value=false}
						{/if}
					{/if}
					{if $shipping_in_use=="2_10"}
						{if $freetier2option10}
							{assign var=shipping value=0.00}
							{assign var=shipping_tax value=0.00}
						{else}
							{assign var=shipping value=$shipping_tier_2_option_10_net}
						{assign var=shipping_orig value=$theme_vars_shipping_tier_2_option_10_price}
							{assign var=shipping_tax value=$shipping_tier_2_option_10_tax}
						{/if}
						{if !$theme_vars_enable_shipping_tier_2_option_10_sales_tax}
							{assign var=omit_tax value=true}
						{else}
							{assign var=omit_tax value=false}
						{/if}
					{/if}
					
					{if $theme_vars_shipping_tier_2_option_2_name!=""}
						<select name="chb_sh">
							<option value="">Please choose</option>

							<option value="2_1" {if $shipping_in_use=="2_1"}selected="selected"{/if}>{$theme_vars_shipping_tier_2_option_1_name}: {if $theme_vars_shipping_tier_2_option_1_price=="0" || $freetier2option1}{$langs.Free}{else}{$currency_sym}{if $include_tax_in_lists && $tax_on_shipping}{if $basket_tax_add}{assign var="si" value=$shipping_tier_2_option_1_net+$shipping_tier_2_option_1_tax+$cms_shipping_total+$cms_shipping_tax}{else}{assign var="si" value=$theme_vars_shipping_tier_2_option_1_price+$cms_shipping_total}{/if}{else}{assign var="si" value=$shipping_tier_2_option_1_net}{/if}{"%i"|money_format:$si}{/if}</option>
							<option value="2_2" {if $shipping_in_use=="2_2"}selected="selected"{/if}>{$theme_vars_shipping_tier_2_option_2_name}: {if $theme_vars_shipping_tier_2_option_2_price=="0" || $freetier2option2}{$langs.Free}{else}{$currency_sym}{if $include_tax_in_lists && $tax_on_shipping}{if $basket_tax_add}{assign var="si" value=$shipping_tier_2_option_2_net+$shipping_tier_2_option_2_tax+$cms_shipping_total+$cms_shipping_tax}{else}{assign var="si" value=$theme_vars_shipping_tier_2_option_2_price+$cms_shipping_total}{/if}{else}{assign var="si" value=$shipping_tier_2_option_2_net}{/if}{"%i"|money_format:$si}{/if}</option>
							{if $theme_vars_shipping_tier_2_option_3_name!=""}
							<option value="2_3" {if $shipping_in_use=="2_3"}selected="selected"{/if}>{$theme_vars_shipping_tier_2_option_3_name}: {if $theme_vars_shipping_tier_2_option_3_price=="0" || $freetier2option3}{$langs.Free}{else}{$currency_sym}{if $include_tax_in_lists && $tax_on_shipping}{if $basket_tax_add}{assign var="si" value=$shipping_tier_2_option_3_net+$shipping_tier_2_option_3_tax+$cms_shipping_total+$cms_shipping_tax}{else}{assign var="si" value=$theme_vars_shipping_tier_2_option_3_price+$cms_shipping_total}{/if}{else}{assign var="si" value=$shipping_tier_2_option_3_net}{/if}{"%i"|money_format:$si}{/if}</option>
							{/if}
							{if $theme_vars_shipping_tier_2_option_4_name!=""}
							<option value="2_4" {if $shipping_in_use=="2_4"}selected="selected"{/if}>{$theme_vars_shipping_tier_2_option_4_name}: {if $theme_vars_shipping_tier_2_option_4_price=="0" || $freetier2option4}{$langs.Free}{else}{$currency_sym}{if $include_tax_in_lists && $tax_on_shipping}{if $basket_tax_add}{assign var="si" value=$shipping_tier_2_option_4_net+$shipping_tier_2_option_4_tax+$cms_shipping_total+$cms_shipping_tax}{else}{assign var="si" value=$theme_vars_shipping_tier_2_option_4_price+$cms_shipping_total}{/if}{else}{assign var="si" value=$shipping_tier_2_option_4_net}{/if}{"%i"|money_format:$si}{/if}</option>
							{/if}
							{if $theme_vars_shipping_tier_2_option_5_name!=""}
							<option value="2_5" {if $shipping_in_use=="2_5"}selected="selected"{/if}>{$theme_vars_shipping_tier_2_option_5_name}: {if $theme_vars_shipping_tier_2_option_5_price=="0" || $freetier2option5}{$langs.Free}{else}{$currency_sym}{if $include_tax_in_lists && $tax_on_shipping}{if $basket_tax_add}{assign var="si" value=$shipping_tier_2_option_5_net+$shipping_tier_2_option_5_tax+$cms_shipping_total+$cms_shipping_tax}{else}{assign var="si" value=$theme_vars_shipping_tier_2_option_5_price+$cms_shipping_total}{/if}{else}{assign var="si" value=$shipping_tier_2_option_5_net}{/if}{"%i"|money_format:$si}{/if}</option>
							{/if}
							{if $theme_vars_shipping_tier_2_option_6_name!=""}
							<option value="2_6" {if $shipping_in_use=="2_6"}selected="selected"{/if}>{$theme_vars_shipping_tier_2_option_6_name}: {if $theme_vars_shipping_tier_2_option_6_price=="0" || $freetier2option6}{$langs.Free}{else}{$currency_sym}{if $include_tax_in_lists && $tax_on_shipping}{if $basket_tax_add}{assign var="si" value=$shipping_tier_2_option_6_net+$shipping_tier_2_option_6_tax+$cms_shipping_total+$cms_shipping_tax}{else}{assign var="si" value=$theme_vars_shipping_tier_2_option_6_price+$cms_shipping_total}{/if}{else}{assign var="si" value=$shipping_tier_2_option_6_net}{/if}{"%i"|money_format:$si}{/if}</option>
							{/if}
							{if $theme_vars_shipping_tier_2_option_7_name!=""}
							<option value="2_7" {if $shipping_in_use=="2_7"}selected="selected"{/if}>{$theme_vars_shipping_tier_2_option_7_name}: {if $theme_vars_shipping_tier_2_option_7_price=="0" || $freetier2option7}{$langs.Free}{else}{$currency_sym}{if $include_tax_in_lists && $tax_on_shipping}{if $basket_tax_add}{assign var="si" value=$shipping_tier_2_option_7_net+$shipping_tier_2_option_7_tax+$cms_shipping_total+$cms_shipping_tax}{else}{assign var="si" value=$theme_vars_shipping_tier_2_option_7_price+$cms_shipping_total}{/if}{else}{assign var="si" value=$shipping_tier_2_option_7_net}{/if}{"%i"|money_format:$si}{/if}</option>
							{/if}
							{if $theme_vars_shipping_tier_2_option_8_name!=""}
							<option value="2_8" {if $shipping_in_use=="2_8"}selected="selected"{/if}>{$theme_vars_shipping_tier_2_option_8_name}: {if $theme_vars_shipping_tier_2_option_8_price=="0" || $freetier2option8}{$langs.Free}{else}{$currency_sym}{if $include_tax_in_lists && $tax_on_shipping}{if $basket_tax_add}{assign var="si" value=$shipping_tier_2_option_8_net+$shipping_tier_2_option_8_tax+$cms_shipping_total+$cms_shipping_tax}{else}{assign var="si" value=$theme_vars_shipping_tier_2_option_8_price+$cms_shipping_total}{/if}{else}{assign var="si" value=$shipping_tier_2_option_8_net}{/if}{"%i"|money_format:$si}{/if}</option>
							{/if}
							{if $theme_vars_shipping_tier_2_option_9_name!=""}
							<option value="2_9" {if $shipping_in_use=="2_9"}selected="selected"{/if}>{$theme_vars_shipping_tier_2_option_9_name}: {if $theme_vars_shipping_tier_2_option_9_price=="0" || $freetier2option9}{$langs.Free}{else}{$currency_sym}{if $include_tax_in_lists && $tax_on_shipping}{if $basket_tax_add}{assign var="si" value=$shipping_tier_2_option_9_net+$shipping_tier_2_option_9_tax+$cms_shipping_total+$cms_shipping_tax}{else}{assign var="si" value=$theme_vars_shipping_tier_2_option_9_price+$cms_shipping_total}{/if}{else}{assign var="si" value=$shipping_tier_2_option_9_net}{/if}{"%i"|money_format:$si}{/if}</option>
							{/if}
							{if $theme_vars_shipping_tier_2_option_10_name!=""}
							<option value="2_10" {if $shipping_in_use=="2_10"}selected="selected"{/if}>{$theme_vars_shipping_tier_2_option_10_name}: {if $theme_vars_shipping_tier_2_option_10_price=="0" || $freetier2option10}{$langs.Free}{else}{$currency_sym}{if $include_tax_in_lists && $tax_on_shipping}{if $basket_tax_add}{assign var="si" value=$shipping_tier_2_option_10_net+$shipping_tier_2_option_10_tax+$cms_shipping_total+$cms_shipping_tax}{else}{assign var="si" value=$theme_vars_shipping_tier_2_option_10_price+$cms_shipping_total}{/if}{else}{assign var="si" value=$shipping_tier_2_option_10_net}{/if}{"%i"|money_format:$si}{/if}</option>
							{/if}
						</select>
					{else}
						<p>{if $theme_vars_shipping_tier_2_option_1_price=="0" || $freetier2option1}{$langs.Free}{else}{$theme_vars_shipping_tier_2_option_1_name}: {$currency_sym}{if $include_tax_in_lists && $tax_on_shipping}{if $basket_tax_add}{assign var="si" value=$shipping_tier_2_option_1_net+$shipping_tier_2_option_1_tax}{else}{assign var="si" value=$theme_vars_shipping_tier_2_option_1_price}{/if}{else}{assign var="si" value=$shipping_tier_2_option_1_net}{/if}{"%i"|money_format:$si}{/if}</p>
					{/if}
				{else}
					{if (($shipping_in_use=="1_1" && $theme_vars_shipping_tier_1_option_2_name!="") || $theme_vars_shipping_tier_1_option_2_name=="") || $smarty.request.step2}
						{if $freetier1option1}
							{assign var=shipping value=0.00}
							{assign var=shipping_tax value=0.00}
						{else}
							{assign var=shipping value=$shipping_tier_1_option_1_net}
							{assign var=shipping_orig value=$theme_vars_shipping_tier_1_option_1_price}
							{assign var=shipping_tax value=$shipping_tier_1_option_1_tax}
						{/if}

						{if !$theme_vars_enable_shipping_tier_1_option_1_sales_tax}
							{assign var=omit_tax value=true}
						{/if}
					{/if}
					
					{if $shipping_in_use=="1_2"}
						{if $freetier1option2}
							{assign var=shipping value=0.00}
							{assign var=shipping_tax value=0.00}
						{else}
							{assign var=shipping value=$shipping_tier_1_option_2_net}
						{assign var=shipping_orig value=$theme_vars_shipping_tier_1_option_2_price}
							{assign var=shipping_tax value=$shipping_tier_1_option_2_tax}
						{/if}		

						{if !$theme_vars_enable_shipping_tier_1_option_2_sales_tax}
							{assign var=omit_tax value=true}
						{else}
							{assign var=omit_tax value=false}
						{/if}			
					{/if}
					{if $shipping_in_use=="1_3"}
						{if $freetier1option3}
							{assign var=shipping value=0.00}
							{assign var=shipping_tax value=0.00}
						{else}
							{assign var=shipping value=$shipping_tier_1_option_3_net}
						{assign var=shipping_orig value=$theme_vars_shipping_tier_1_option_3_price}
							{assign var=shipping_tax value=$shipping_tier_1_option_3_tax}
						{/if}
						{if !$theme_vars_enable_shipping_tier_1_option_3_sales_tax}
							{assign var=omit_tax value=true}
						{else}
							{assign var=omit_tax value=false}
						{/if}			
					{/if}
					{if $shipping_in_use=="1_4"}
						{if $freetier1option4}
							{assign var=shipping value=0.00}
							{assign var=shipping_tax value=0.00}
						{else}
							{assign var=shipping value=$shipping_tier_1_option_4_net}
						{assign var=shipping_orig value=$theme_vars_shipping_tier_1_option_4_price}
							{assign var=shipping_tax value=$shipping_tier_1_option_4_tax}
						{/if}
						{if !$theme_vars_enable_shipping_tier_1_option_4_sales_tax}
							{assign var=omit_tax value=true}
						{else}
							{assign var=omit_tax value=false}
						{/if}			
					{/if}
					{if $shipping_in_use=="1_5"}
						{if $freetier1option5}
							{assign var=shipping value=0.00}
							{assign var=shipping_tax value=0.00}
						{else}
							{assign var=shipping value=$shipping_tier_1_option_5_net}
						{assign var=shipping_orig value=$theme_vars_shipping_tier_1_option_5_price}
							{assign var=shipping_tax value=$shipping_tier_1_option_5_tax}
						{/if}
						{if !$theme_vars_enable_shipping_tier_1_option_5_sales_tax}
							{assign var=omit_tax value=true}
						{else}
							{assign var=omit_tax value=false}
						{/if}			
					{/if}
					{if $shipping_in_use=="1_6"}
						{if $freetier1option6}
							{assign var=shipping value=0.00}
							{assign var=shipping_tax value=0.00}
						{else}
							{assign var=shipping value=$shipping_tier_1_option_6_net}
						{assign var=shipping_orig value=$theme_vars_shipping_tier_1_option_6_price}
							{assign var=shipping_tax value=$shipping_tier_1_option_6_tax}
						{/if}
						{if !$theme_vars_enable_shipping_tier_1_option_6_sales_tax}
							{assign var=omit_tax value=true}
						{else}
							{assign var=omit_tax value=false}
						{/if}			
					{/if}
					{if $shipping_in_use=="1_7"}
						{if $freetier1option7}
							{assign var=shipping value=0.00}
							{assign var=shipping_tax value=0.00}
						{else}
							{assign var=shipping value=$shipping_tier_1_option_7_net}
						{assign var=shipping_orig value=$theme_vars_shipping_tier_1_option_7_price}
							{assign var=shipping_tax value=$shipping_tier_1_option_7_tax}
						{/if}
						{if !$theme_vars_enable_shipping_tier_1_option_7_sales_tax}
							{assign var=omit_tax value=true}
						{else}
							{assign var=omit_tax value=false}
						{/if}
					{/if}
					{if $shipping_in_use=="1_8"}
						{if $freetier1option8}
							{assign var=shipping value=0.00}
							{assign var=shipping_tax value=0.00}
						{else}
							{assign var=shipping value=$shipping_tier_1_option_8_net}
						{assign var=shipping_orig value=$theme_vars_shipping_tier_1_option_8_price}
							{assign var=shipping_tax value=$shipping_tier_1_option_8_tax}
						{/if}
						{if !$theme_vars_enable_shipping_tier_1_option_8_sales_tax}
							{assign var=omit_tax value=true}
						{else}
							{assign var=omit_tax value=false}
						{/if}			
					{/if}
					{if $shipping_in_use=="1_9"}
						{if $freetier1option9}
							{assign var=shipping value=0.00}
							{assign var=shipping_tax value=0.00}
						{else}
							{assign var=shipping value=$shipping_tier_1_option_9_net}
						{assign var=shipping_orig value=$theme_vars_shipping_tier_1_option_9_price}
							{assign var=shipping_tax value=$shipping_tier_1_option_9_tax}
						{/if}
						{if !$theme_vars_enable_shipping_tier_1_option_9_sales_tax}
							{assign var=omit_tax value=true}
						{else}
							{assign var=omit_tax value=false}
						{/if}			
					{/if}
					{if $shipping_in_use=="1_10"}
						{if $freetier1option10}
							{assign var=shipping value=0.00}
							{assign var=shipping_tax value=0.00}
						{else}
							{assign var=shipping value=$shipping_tier_1_option_10_net}
						{assign var=shipping_orig value=$theme_vars_shipping_tier_1_option_10_price}
							{assign var=shipping_tax value=$shipping_tier_1_option_10_tax}
						{/if}
						{if !$theme_vars_enable_shipping_tier_1_option_10_sales_tax}
							{assign var=omit_tax value=true}
						{else}
							{assign var=omit_tax value=false}
						{/if}			
					{/if}
					{if $theme_vars_shipping_tier_1_option_2_name!=""}
						<select name="chb_sh">
							<option value="">Please choose</option>
							<option value="1_1" {if $shipping_in_use=="1_1"}selected="selected"{/if}>{$theme_vars_shipping_tier_1_option_1_name}: {if $theme_vars_shipping_tier_1_option_1_price=="0" || $freetier1option1}{$langs.Free}{else}{$currency_sym}{if $include_tax_in_lists && $tax_on_shipping}{if $basket_tax_add}{assign var="si" value=$shipping_tier_1_option_1_net+$shipping_tier_1_option_1_tax+$cms_shipping_total}{else}{assign var="si" $theme_vars_shipping_tier_1_option_1_price+$cms_shipping_total+$cms_shipping_tax}{/if}{else}{assign var="si" value=$shipping_tier_1_option_1_net}{/if}{"%i"|money_format:$si}{/if}</option>
							<option value="1_2" {if $shipping_in_use=="1_2"}selected="selected"{/if}>{$theme_vars_shipping_tier_1_option_2_name}: {if $theme_vars_shipping_tier_1_option_2_price=="0" || $freetier1option2}{$langs.Free}{else}{$currency_sym}{if $include_tax_in_lists && $tax_on_shipping}{if $basket_tax_add}{assign var="si" value=$shipping_tier_1_option_2_net+$shipping_tier_1_option_2_tax+$cms_shipping_total+$cms_shipping_tax}{else}{assign var="si" value=$theme_vars_shipping_tier_1_option_2_price+$cms_shipping_total+$cms_shipping_tax}{/if}{else}{assign var="si" value=$shipping_tier_1_option_2_net}{/if}{"%i"|money_format:$si}{/if}</option>
							{if $theme_vars_shipping_tier_1_option_3_name!=""}
							<option value="1_3" {if $shipping_in_use=="1_3"}selected="selected"{/if}>{$theme_vars_shipping_tier_1_option_3_name}: {if $theme_vars_shipping_tier_1_option_3_price=="0" || $freetier1option3}{$langs.Free}{else}{$currency_sym}{if $include_tax_in_lists && $tax_on_shipping}{if $basket_tax_add}{assign var="si" value=$shipping_tier_1_option_3_net+$shipping_tier_1_option_3_tax+$cms_shipping_total+$cms_shipping_tax}{else}{assign var="si" value=$theme_vars_shipping_tier_1_option_3_price+$cms_shipping_total+$cms_shipping_tax}{/if}{else}{assign var="si" value=$shipping_tier_1_option_3_net}{/if}{"%i"|money_format:$si}{/if}</option>
							{/if}
							{if $theme_vars_shipping_tier_1_option_4_name!=""}
							<option value="1_4" {if $shipping_in_use=="1_4"}selected="selected"{/if}>{$theme_vars_shipping_tier_1_option_4_name}: {if $theme_vars_shipping_tier_1_option_4_price=="0" || $freetier1option4}{$langs.Free}{else}{$currency_sym}{if $include_tax_in_lists && $tax_on_shipping}{if $basket_tax_add}{assign var="si" value=$shipping_tier_1_option_4_net+$shipping_tier_1_option_4_tax+$cms_shipping_total+$cms_shipping_tax}{else}{assign var="si" value=$theme_vars_shipping_tier_1_option_4_price+$cms_shipping_total+$cms_shipping_tax}{/if}{else}{assign var="si" value=$shipping_tier_1_option_4_net}{/if}{"%i"|money_format:$si}{/if}</option>
							{/if}
							{if $theme_vars_shipping_tier_1_option_5_name!=""}
							<option value="1_5" {if $shipping_in_use=="1_5"}selected="selected"{/if}>{$theme_vars_shipping_tier_1_option_5_name}: {if $theme_vars_shipping_tier_1_option_5_price=="0" || $freetier1option5}{$langs.Free}{else}{$currency_sym}{if $include_tax_in_lists && $tax_on_shipping}{if $basket_tax_add}{assign var="si" value=$shipping_tier_1_option_5_net+$shipping_tier_1_option_5_tax+$cms_shipping_total+$cms_shipping_tax}{else}{assign var="si" value=$theme_vars_shipping_tier_1_option_5_price+$cms_shipping_total+$cms_shipping_tax}{/if}{else}{assign var="si" value=$shipping_tier_1_option_5_net}{/if}{"%i"|money_format:$si}{/if}</option>
							{/if}
							{if $theme_vars_shipping_tier_1_option_6_name!=""}
							<option value="1_6" {if $shipping_in_use=="1_6"}selected="selected"{/if}>{$theme_vars_shipping_tier_1_option_6_name}: {if $theme_vars_shipping_tier_1_option_6_price=="0" || $freetier1option6}{$langs.Free}{else}{$currency_sym}{if $include_tax_in_lists && $tax_on_shipping}{if $basket_tax_add}{assign var="si" value=$shipping_tier_1_option_6_net+$shipping_tier_1_option_6_tax+$cms_shipping_total+$cms_shipping_tax}{else}{assign var="si" value=$theme_vars_shipping_tier_1_option_6_price+$cms_shipping_total+$cms_shipping_tax}{/if}{else}{assign var="si" value=$shipping_tier_1_option_6_net}{/if}{"%i"|money_format:$si}{/if}</option>
							{/if}
							{if $theme_vars_shipping_tier_1_option_7_name!=""}
							<option value="1_7" {if $shipping_in_use=="1_7"}selected="selected"{/if}>{$theme_vars_shipping_tier_1_option_7_name}: {if $theme_vars_shipping_tier_1_option_7_price=="0" || $freetier1option7}{$langs.Free}{else}{$currency_sym}{if $include_tax_in_lists && $tax_on_shipping}{if $basket_tax_add}{assign var="si" value=$shipping_tier_1_option_7_net+$shipping_tier_1_option_7_tax+$cms_shipping_total+$cms_shipping_tax}{else}{assign var="si" value=$theme_vars_shipping_tier_1_option_7_price+$cms_shipping_total+$cms_shipping_tax}{/if}{else}{assign var="si" value=$shipping_tier_1_option_7_net}{/if}{"%i"|money_format:$si}{/if}</option>
							{/if}
							{if $theme_vars_shipping_tier_1_option_8_name!=""}
							<option value="1_8" {if $shipping_in_use=="1_8"}selected="selected"{/if}>{$theme_vars_shipping_tier_1_option_8_name}: {if $theme_vars_shipping_tier_1_option_8_price=="0" || $freetier1option8}{$langs.Free}{else}{$currency_sym}{if $include_tax_in_lists && $tax_on_shipping}{if $basket_tax_add}{assign var="si" value=$shipping_tier_1_option_8_net+$shipping_tier_1_option_8_tax+$cms_shipping_total+$cms_shipping_tax}{else}{assign var="si" value=$theme_vars_shipping_tier_1_option_8_price+$cms_shipping_total+$cms_shipping_tax}{/if}{else}{assign var="si" value=$shipping_tier_1_option_8_net}{/if}{"%i"|money_format:$si}{/if}</option>
							{/if}
							{if $theme_vars_shipping_tier_1_option_9_name!=""}
							<option value="1_9" {if $shipping_in_use=="1_9"}selected="selected"{/if}>{$theme_vars_shipping_tier_1_option_9_name}: {if $theme_vars_shipping_tier_1_option_9_price=="0" || $freetier1option9}{$langs.Free}{else}{$currency_sym}{if $include_tax_in_lists && $tax_on_shipping}{if $basket_tax_add}{assign var="si" value=$shipping_tier_1_option_9_net+$shipping_tier_1_option_9_tax+$cms_shipping_total+$cms_shipping_tax}{else}{assign var="si" value=$theme_vars_shipping_tier_1_option_9_price+$cms_shipping_total+$cms_shipping_tax}{/if}{else}{assign var="si" value=$shipping_tier_1_option_9_net}{/if}{"%i"|money_format:$si}{/if}</option>
							{/if}
							{if $theme_vars_shipping_tier_1_option_10_name!=""}
							<option value="1_10" {if $shipping_in_use=="1_10"}selected="selected"{/if}>{$theme_vars_shipping_tier_1_option_10_name}: {if $theme_vars_shipping_tier_1_option_10_price=="0" || $freetier1option10}{$langs.Free}{else}{$currency_sym}{if $include_tax_in_lists && $tax_on_shipping}{if $basket_tax_add}{assign var="si" value=$shipping_tier_1_option_10_net+$shipping_tier_1_option_10_tax+$cms_shipping_total+$cms_shipping_tax}{else}{assign var="si" value=$theme_vars_shipping_tier_1_option_10_price+$cms_shipping_total+$cms_shipping_tax}{/if}{else}{assign var="si" value=$shipping_tier_1_option_10_net}{/if}{"%i"|money_format:$si}{/if}</option>
							{/if}
						</select>
					{else}
						<p>{if $theme_vars_shipping_tier_1_option_1_price=="0" || $freetier1option1}{$langs.Free}{else}{$theme_vars_shipping_tier_1_option_1_name}: {$currency_sym}{if $include_tax_in_lists && $tax_on_shipping}{if $basket_tax_add}{assign var="si" value=$shipping_tier_1_option_1_net+$shipping_tier_1_option_1_tax}{else}{assign var="si" value=$theme_vars_shipping_tier_1_option_1_price}{/if}{else}{assign var="si" value=$shipping_tier_1_option_1_net}{/if}{"%i"|money_format:$si}{/if}</p>
					{/if}
					{if $tax_on_shipping==0}
						{assign var=shipping_tax value=0.00}
					{/if}
				{/if}


			{/if}
			</span>
				</p>
				{if !$theme_vars_enable_shipping}
					{if $cms_shipping_total>0}
						<h4>{if $theme_vars_shipping_name}{$theme_vars_shipping_name}{else}{$langs.Shipping}{/if}:</h4>
						<p>{$currency_sym}{"%i"|money_format:$cms_shipping_total}</p>
						{assign var=shipping value=$cms_shipping_total}

					{/if}
				{/if}
				</div>
				{capture assign="totals"}
				{if !$smarty.request.step2}
				<h4>{$langs.Total}:</h4>
				{/if}
				{if $omit_tax || !$basket_tax_enabled}
					{assign var=totaltax value=0}
				{else}


						{if $elligableonlyfixeddiscounttotal>0}
						{if $discount_net>$taxableafterdiscounts}
						{* Make sure discount is not more than elligible item total*}
						{assign var="discount_net" value=$taxableafterdiscounts}
						{/if}
						{math assign=netminusdiscount equation="a - b" a=$taxableafterdiscounts b=$discount_net}
						{else}
						{assign var=netminusdiscount value=$taxableafterdiscounts }
						{/if}

						{if $netminusdiscount<0} 
						{assign var=netminusdiscount value=0}
						{/if}

						{math assign=new_basket_tax equation="((pc/100) * p)" p=$netminusdiscount pc=$basket_tax_amount}

						{assign var=newtaxplusshiptax value=$new_basket_tax+$cms_shipping_tax+$shipping_tax}

						{assign var=totaltax value=$newtaxplusshiptax}


						{assign var=newtaxplusshiptax value=$newtaxplusshiptax}
					{if $include_tax_in_lists==0 &&$basket_tax_amount >0 &&(!$non_default_currency||$basket_tax_amount>0)}
						<p><strong>{$basket_tax_name}:</strong> {$currency_sym}{"%i"|money_format:$newtaxplusshiptax}</p>
					{/if}
				{/if}
				{math assign=grand equation="(x-y) + z + a" x=$net_totals y=$discount_net z=$totaltax a=$shipping}
				{if $grand<0}{assign var=grand value=0}{/if}
				{if $smarty.request.step2}
				<p><strong>{$langs.Total}:</strong> {$currency_sym}{"%i"|money_format:$grand}{if $non_default_currency}<span class="curhint">{$currency_code}</span>{/if}</p>
				{else}
				<p class="bigPrice">{$currency_sym}{"%i"|money_format:$grand}{if $non_default_currency}<span class="curhint">{$currency_code}</span>{/if}</p>
				{/if}
				
				{if $include_tax_in_lists && $basket_tax_amount >0 && (!$non_default_currency||$basket_tax_amount>0)}
					<p class="checkoutIncTax"><strong>{$langs.Includes_Tax_Of|replace:"***":$basket_tax_name}:</strong> {$currency_sym}{"%i"|money_format:$newtaxplusshiptax}</p>
				{/if}
				{/capture}
			{assign var=gateways value=0}
			{if $merchant1_enabled}
			{assign var=gateways value=$gateways+1}
			{if $gateways==1}{assign var=firstgateway value=1}{/if}
			{/if}
			{if $merchant2_enabled}
			{assign var=gateways value=$gateways+1}
			{if $gateways==1}{assign var=firstgateway value=2}{/if}
			{/if}
			{if $merchant4_enabled}
			{assign var=gateways value=$gateways+1}
			{if $gateways==1}{assign var=firstgateway value=4}{/if}
			{/if}
			{if $merchant5_enabled}
			{assign var=gateways value=$gateways+1}
			{if $gateways==1}{assign var=firstgateway value=5}{/if}
			{/if}
			{if $merchant6_enabled}
			{assign var=gateways value=$gateways+1}
			{if $gateways==1}{assign var=firstgateway value=6}{/if}
			{/if}
			{if $merchant7_enabled}
			{assign var=gateways value=$gateways+1}
			{if $gateways==1}{assign var=firstgateway value=7}{/if}
			{/if}
			{if $theme_vars_stripe_key_secret!=""}
			{assign var=gateways value=$gateways+1}
			{if $gateways==1}{assign var=firstgateway value=100}{/if}
			{/if}
			{* Pay Later last.*}
			{if $merchant3_enabled}
			{assign var=gateways value=$gateways+1}
			{if $gateways==1}{assign var=firstgateway value=3}{/if}
			{/if}
			</div>
			<noscript><input type='submit' value="Continue"></noscript>
			</form>
			<div class="checkoutSecondCol {if $theme_vars_enabled_coupons&&$basketdiscount==0}withCoupons{/if}">
			
				<form action="" method="post" class="" id="goToStep2">
				<input type="hidden" name="coupon" value="{$coupon_in_use}">
				<input type="hidden" name="chb_sh" value="{$shipping_in_use}">
				<input type="hidden" name="gateway" value="{$gateway}">
				<input type="hidden" name="step2" value="true">
				<input type="hidden" name="shipping_name" value="" id="shipping_name">
			<div class="checkoutCheckout">
			{if ($terms_enabled=="1"&&$terms_page!="0")||
				  ($shop_to_user_list&&$agree_text)
				}
				<div class="checkoutConsent">
				{if $terms_enabled=="1"&&$terms_page!="0"}
					{*<form action="/actions/AgreeShop/" method="post">*}
					<label><input type="checkbox" name="agree_terms" {if $agree_terms==="1"}checked="checked"{/if}  value="1"/> I agree to the <a href="{$terms_page}">terms and conditions</a></label>
					{*
					</form>
					*}
				{/if}
				{if $shop_to_user_list&&$agree_text}
					{*
					<form action="/actions/AgreeMarketing/" method="post">
					*}
					<label><input type="checkbox" name="add_to_list" {if $add_to_list==="1"}checked="checked"{/if}  value="1"/> {$agree_text}</label>
					{*</form>*}
				{/if}
				</div>
			{/if}
				<p class="hide_if_no_js submit_form Button_Large"><a href="">{$langs.Checkout}</a></p>
				{if $gateways>1}
					<div class="checkoutGateways">
					<p><span class="gatewayLabel">Using:</span><span class="gatewayDisp">

						<span>
						{if $merchant1_enabled}
						{if $smarty.request.gateway=="paypal" || $firstgateway==1}PayPal{/if}
						{/if}
						{if $merchant2_enabled}
						{if $smarty.request.gateway=="authnet"|| $firstgateway==2}Card Payment (Powered by Authnet){/if}
						{/if}
						{if $merchant4_enabled}
						{if $smarty.request.gateway=="eway"|| $firstgateway==4}Card Payment (Powered by eWAY){/if}
						{/if}
						{if $merchant5_enabled}
						{if $smarty.request.gateway=="paymentexpress"|| $firstgateway==5}Card Payment (Powered by Payment Express){/if}
						{/if}
						{if $merchant6_enabled}
						{if $smarty.request.gateway=="oxipay"|| $firstgateway==6}Humm{/if}
						{/if}
						{if $merchant7_enabled}
						{if $smarty.request.gateway=="Paystation"|| $firstgateway==7}Paystation{/if}
						{/if}
						{if $theme_vars_stripe_key_secret}
						{if $smarty.request.gateway=="stripe"|| $firstgateway==100}Stripe{/if}
						{/if}
						{* Pay later last*}
						{if $merchant3_enabled}
						{if $smarty.request.gateway=="paylater"|| $firstgateway==3}{$merchant3_1}{/if}
						{/if}
						</span>
						<select name="gateway" class="gatewaychange">
						{if $merchant1_enabled}
						<option value="paypal" {if $smarty.request.gateway=="paypal" || $firstgateway==1}selected{/if}>PayPal</option>
						{/if}
						{if $merchant2_enabled}
						<option value="authnet" {if $smarty.request.gateway=="authnet"|| $firstgateway==2}selected{/if}>Card Payment (Powered by Authnet)</option>
						{/if}
						{if $merchant4_enabled}
							<option value="eway" {if $smarty.request.gateway=="eway"|| $firstgateway==4}selected{/if}>Card Payment (Powered by eWAY)</option>
						{/if}
						{if $merchant5_enabled}
							<option value="paymentexpress" {if $smarty.request.gateway=="paymentexpress"|| $firstgateway==5}selected{/if}>Card Payment (Powered by Payment Express)</option>
						{/if}
						{if $merchant6_enabled}
							<option value="oxipay" {if $smarty.request.gateway=="oxipay"|| $firstgateway==6}selected{/if}>Humm</option>
						{/if}
						{if $merchant7_enabled}
							<option value="paystation" {if $smarty.request.gateway=="paystation"|| $firstgateway==7}selected{/if}>Paystation</option>
						{/if}
						{if $theme_vars_stripe_key_secret}
							<option value="stripe" {if $smarty.request.gateway=="stripe"|| $firstgateway==100}selected{/if}>Stripe</option>
						{/if}
						{if $merchant3_enabled}
							<option value="paylater" {if $smarty.request.gateway=="paylater"|| $firstgateway==3}selected{/if}>{$merchant3_1}</option>
						{/if}
						</select>
					</span>
					</p>
				</div>
				{/if}
				<noscript><input type='submit' value="Continue"></noscript>
			</div>
			</form>
			</div>
				{if !$smarty.post.step2}
				<div class="checkoutTotals">
				{$totals}
				</div>
				{/if}

	</div>
	{/capture}
	{if !$smarty.post.step2}
	{$checkoutNext}
	{else}
	<div class="step2Summary">
	{if $theme_vars_enable_shipping=="1"&&!$non_default_currency}
	<p><strong>{$langs.Shipping}:</strong> 
	{assign var="ship" value=$shipping+$shipping_tax+$cms_shipping_total}
	{assign var="shiporig" value=$shipping_orig+$cms_shipping_total+$cms_shipping_tax}
	{if $shipping=="0"}{$langs.Free}{else}{$currency_sym}{if $include_tax_in_lists && $tax_on_shipping}{if $basket_tax_add}{"%i"|money_format:$ship}{else}{"%i"|money_format:$shiporig}{/if}{else}{"%i"|money_format:$shipping}{/if}{/if}
	</p>
	{/if}
	{$totals}
	</div>
	{/if}
</div>
{if $smarty.post.step2}
<div id="checkoutStep2">
{$formOnCheckout}
{if $terms_enabled!="1"||($terms_enabled=="1"&&$agree_terms)}
{include file="includes/shoppingbasket_gatewayforms.tpl" gateways=$gateways firstgateway=$firstgateway}
{else}
<p class="Icon_Alert">Please go back and agree to the terms and conditions to continue.</p>
{/if}
</div>
{/if}
{/if}




<div class="clear"><!-- --></div>
{/if}

