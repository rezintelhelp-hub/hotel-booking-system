{if $nocookie=="true"}
<p id="status">
	{$langs.Cookie_Error}
</p>
{/if}
{if $empty}
<p id="status">
	{$langs.Basket_Empty}
</p>
{/if}
{if $orders}
<div id="basketWrapper"> 
	<form action="/actions/UpdateQuantities/" method="post" id="quantityForm">
		<div class="checkoutPsudoTable header">
			<div class="basketName checkoutTableCell">
				{$langs.Product_Name}
			</div>
			<div class="basketQuantity checkoutTableCell">
				{$langs.Quantity}
			</div>
			<div class="basketPrice checkoutTableCell">
				{$langs.Price}
			</div>
		</div>
		{foreach from=$orders item=item key=key name=loop1}
		<div class="checkoutPsudoTable">
			<div class="basketName checkoutTableCell">
				{if $item.pic_url}
				{if $item.url_str}<a href="{$item.url_str}">{/if}
				<img src="{$item.pic_url}?width=60&height=60&shrink=false" class="basketThumb" />
				{if $item.url_str}</a>{/if}		
				{/if}
				{if $item.url_str}<a href="{$item.url_str}">{/if}<strong>{$item.name}</strong>{if $item.url_str}</a>{/if}<br/>
				{if $item.variant!=""}{$item.variant}<br/>{/if}
			</div>
			<div class="basketQuantity checkoutTableCell">
				{if $item.allow_one=="no"}<span class="narrowQty">{$langs.Quantity}:</span><span class="quantityWrapper"><input type="text" name="{$item.id}" value="{$item.quantity}" class="quantity" /></span>{/if}
			</div>
			<div class="basketPrice checkoutTableCell">
				<span class="narrowPrice">{$langs.Price}:</span>{$currency_sym}{$item.price}
			</div>
			<div class="basketRemove checkoutTableCell">
				<a href="/actions/removeFromBasket/?ordersId={$item.id}" title="{$langs.Remove_From_Basket}"></a>
			</div>
		</div>
		{/foreach}
		<noscript><input type="submit" value="{$langs.Update_Quantities}"/></noscript>
	</form>
	<div class="checkoutPsudoTable">
		<div class="basketName checkoutTableCell empty">
			&nbsp;
		</div>
		<div class="basketQuantity checkoutTableCell">
			<p class="Button_Small" id="updateQuantitiesP"><a href="#" id="updateQuantities">{$langs.Update_Quantities}</a></p>
		</div>
		<div class="basketPrice checkoutTableCell">
			<p><strong>{$langs.Total}:</strong> {$currency_sym}{$totals}</p>	
		</div>
	</div>
</div>
{$formOnCheckout}
<form action="https://www.paypal.com/cgi-bin/webscr" method="post" style="float:right;">
	<input type="hidden" name="cmd" value="_cart" />
	<input type="hidden" name="upload" value="1" />
	<input type="hidden" name="business" value="{$paypal_email}" />
	<input type="hidden" name="notify_url" value="{$ipn}" />
	<input type="hidden" name="custom" value="{$buyerId}" />
	<input type="hidden" name="rm" value="2" />
	<input type="hidden" name="return" value="{$return}" />
	<input type="hidden" name="cancel_return" value="{$return_fail}" />
	<input type="hidden" name="no_note" value="{$no_note}" />
	<input type="hidden" name="currency_code" value="{$currency_code}" />
	<input type="hidden" name="weight_unit" value="kgs" />
	{foreach from=$orders item=order name=ordersLoop}
	<input type="hidden" name="item_name_{$smarty.foreach.ordersLoop.iteration}" value="{$order.name|@htmlspecialchars} - {$order.variant|@htmlspecialchars}" />
	<input type="hidden" name="amount_{$smarty.foreach.ordersLoop.iteration}" value="{$order.price}" />
	<input type="hidden" name="quantity_{$smarty.foreach.ordersLoop.iteration}" value="{$order.quantity}" />
	<input type="hidden" name="weight_{$smarty.foreach.ordersLoop.iteration}" value="{$order.weight}" />
	{/foreach}
	<input type="image" src="https://www.paypal.com/en_GB/i/btn/btn_xpressCheckout.gif" name="" value="{$langs.Checkout_Through_PayPal}"/>
</form>

<div class="clear"><!-- --></div>
{/if}
