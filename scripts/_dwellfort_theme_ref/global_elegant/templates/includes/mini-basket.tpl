{if $content.orders}
<form action="/actions/UpdateQuantities/" method="post" id="miniBasketForm">

	{foreach from=$content.orders item=item key=key name=loop1}
	<div class="miniBasketItem clearfix">
		{if $item.pic_url}
		{if $item.url_str}<a href="{$item.url_str}">{/if}
		<img src="{$item.pic_url}?width=30&height=30&shrink=false" />
		{if $item.url_str}</a>{/if}		
		{/if}

		<p class="removeCell"><a href="/actions/removeFromBasket/?ordersId={$item.id}" title="{$langs.Remove_From_Basket}"></a></p>

		<p class="product_name">{if $item.url_str}<a href="{$item.url_str}">{/if}<strong>{$item.name}</strong>{if $item.url_str}</a>{/if}<br/>
			{if $item.variant!=""}<span class="variantsBasket">{$item.variant|replace:"[CHECKED]":"✔"}</span><br/>{/if}
			<span class="price">{$content.currency_sym}{$item.price}</span> {if $item.allow_one=="no"}<span class="quantityWrapper">{$langs.Qty}: <input type="text" name="{$item.id}" value="{$item.quantity}" class="quantity" /></span>{/if}
		</p>
		
	</div>
	{/foreach}

	<p class="Button_Small" id="miniUpdateQuantities"><a href="#" id="updateQuantities">{$langs.Update_Quantities}</a></p>
	<p id="miniTotals">{$langs.Total}: <strong>{$content.currency_sym}{$content.totals}</strong></p>
	

</form>
<p class="Button_Large" id="miniCheckoutButton"><a href="/{$content.basket_link}">{$langs.Checkout}</a></p>
<div class="clear"><!-- --></div>
{else}
<p>{$langs.Basket_Empty}</p>
{/if}
