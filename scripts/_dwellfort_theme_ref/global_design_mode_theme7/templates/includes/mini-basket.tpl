{assign var=hasorders value=false}
{assign var=minicount value=0}

{foreach from=$content.orders item=item key=key name=loop1}
{if $item.product_code!="TAX"&&$item.product_code!="SHIPPING"}
{assign var=hasorders value=true}
{math assign=minicount equation="x+z" x=$minicount z=$item.quantity}
{/if}
{/foreach}
{if $hasorders}
	{if $smarty.request.count}
	<span class="order-count-brackets">(</span>{$minicount}<span class="order-count-brackets">)</span>
	{else}
	<form action="/actions/UpdateQuantities/?silent=true" method="post" id="miniBasketForm">
		{foreach from=$content.orders item=item key=key name=loop1}
		{if $item.product_code!="TAX"&&$item.product_code!="SHIPPING"}
		<div class="miniBasketItem clearfix">
			{if $item.pic_url}
			{if $item.url_str}<a href="{$item.url_str}">{/if}
			<img src="{$item.pic_url}?width=30&height=30&shrink=false" />
			{if $item.url_str}</a>{/if}
			{/if}

			<p class="removeCell"><a href="/actions/removeFromBasket/?ordersId={$item.id}&silent=true" title="{$langs.Remove_From_Basket}"></a></p>

			<p class="product_name">{if $item.url_str}<a href="{$item.url_str}">{/if}<strong>{$item.name}</strong>{if $item.url_str}</a>{/if}<br/>
				{if $item.variant!=""}<span class="variantsBasket">{$item.variant|replace:"[CHECKED]":"✔"}</span><br/>{/if}
				<span class="price">{$content.currency_sym}{$item.price}</span> {if $item.allow_one=="no"}<span class="quantityWrapper">{$langs.Qty}: <input type="text" name="{$item.id}" value="{$item.quantity}" class="quantity" /></span>{/if}
			</p>

		</div>
		{/if}
		{/foreach}
		<p class="Button_Small" id="miniUpdateQuantities"><a href="#" id="updateQuantities">{$langs.Update_Quantities}</a></p>
	
		<p id="miniTotals">
			{if $content.show_tax_in_mini}
				{if $content.basket_tax_enabled}
				{$content.basket_tax_name}: {$content.currency_sym}{"%i"|money_format:$content.basket_tax}<br/>
				{/if}
		
				{$langs.Total}: <strong>{$content.currency_sym}{$content.totals}</strong></p>
			{else}
				{$langs.Total}: <strong>{$content.currency_sym}{$content.net_totals}</strong></p>
			{/if}
		


	</form>
	<p class="Button_Large" id="miniCheckoutButton"><a href="/{$content.basket_link}">{$langs.Checkout}</a></p>
	<div class="clear"><!-- --></div>
	{/if}
{else}
	{if $smarty.request.count}
	<span class="order-count-brackets">(</span>0<span class="order-count-brackets">)</span>
	{else}
	<p>{$langs.Basket_Empty}</p>
	{/if}
{/if}
