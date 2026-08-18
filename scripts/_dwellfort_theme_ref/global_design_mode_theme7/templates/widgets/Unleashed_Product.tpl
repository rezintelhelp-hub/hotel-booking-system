{* @@@
{
        "widget_info":{
                "title":"Unleashed Product"
                ,"title_info":"Enter a name for this instance of the Unleashed Product widget."
		,"show_in_search":"true"
                ,"category":"products" 
                ,"legacy":"true" 
        },
       "meta_data":[{
                "name":"Product Code"
                ,"type": "text"
                ,"info": "Enter the Unleashed product code for the product to display here"
                ,"var": "product_id"
                ,"default":""
        },{
                "name":"Product code"
                ,"type": "hidden"
                ,"var": "product_guid"
                ,"default":""
        },{
                "name":"Default tier"
                ,"type": "text"
                ,"info":"Use 0 to use the default selling price from Unleashed or 1 - 10 to use one of the price tiers."
                ,"var": "default_price"
                ,"default":"0"
        }],
        "inner_templates":{
        }
}
@@@ *}
{if $metadata.product_id!=""&&$metadata.product_guid==""}
{unleashed 
	action="getGuid"
	id=$metadata.product_id
	api_id=$theme_vars_unleashed_id
	api_key=$theme_vars_unleashed_key
}
{add_widget_meta name=product_guid value=$guid instance_id=$metadata.instance_id}
{/if}
{if $metadata.product_guid!=""}
	{unleashed 
		action="getProduct"
		guid=$metadata.product_guid
		api_id=$theme_vars_unleashed_id
		api_key=$theme_vars_unleashed_key
	}
	<div class="unleashed-product">
	{capture name="content_snippet"}
	<h4>{$product.ProductDescription}</h4>
	<p class="product-code">{$metadata.product_id}<p>
	<p class="notes">{$product.Notes}</p>
	{/capture}
	{$smarty.capture.content_snippet}
	{add_page_search_data weight0=$product.Notes weight4=$product.Description pageid=$content.id content_snippet=$smarty.capture.content_snippet}
	{assign var="tier" value=0}
	{assign var="discount" value=0}
	{assign var="tax_rate" value=$content.basket_tax_amount}
	{if $smarty.cookies.output_cursymv3}
	{assign var="cur" value=$smarty.cookies.output_cursymv3}
	{get_widget_meta 
	widget_id=$smarty.cookies.output_cursym_idv3
	}
	{assign var="curlower" value=$cur|strtolower}
	{foreach from=$widget_metadata item="data" key="meta"}
		{if $meta=="`$curlower`_tax"}
		{assign var="tax_rate" value=$data}
		{/if}
	{/foreach}
	{/if}
	{if $content.logged_in_user}
		{foreach from=$content.logged_in_user.custom_with_names item=custom} 
			{if $custom.name=="Unleashed Tier"}
				{if $custom.value!=''}
					{assign var="tier" value="Tier"|explode:$custom.value}
					{assign var="tier" value=$tier.1}
				{/if}
			{/if}
			{if $custom.name=="Unleashed Discount"}
				{if $custom.value!=''}
					{assign var="discount" value=$custom.value}
				{/if}
			{/if}
		{/foreach}
		{if $tier==1}
		{assign var="cursym" value=$theme_vars_tier1cur}
		{/if}
		{if $tier==2}
		{assign var="cursym" value=$theme_vars_tier2cur}
		{/if}
		{if $tier==3}
		{assign var="cursym" value=$theme_vars_tier3cur}
		{/if}
		{if $tier==4}
		{assign var="cursym" value=$theme_vars_tier4cur}
		{/if}
		{if $tier==5}
		{assign var="cursym" value=$theme_vars_tier5cur}
		{/if}
		{if $tier==6}
		{assign var="cursym" value=$theme_vars_tier6cur}
		{/if}
		{if $tier==7}
		{assign var="cursym" value=$theme_vars_tier7cur}
		{/if}
		{if $tier==8}
		{assign var="cursym" value=$theme_vars_tier8cur}
		{/if}
		{if $tier==9}
		{assign var="cursym" value=$theme_vars_tier9cur}
		{/if}
		{if $tier==10}
		{assign var="cursym" value=$theme_vars_tier10cur}
		{/if}
		{assign var="cursymout" value=$cursym}
		{assign var="curlower" value=$cursym|strtolower}
		{foreach from=$widget_metadata item="data" key="meta"}
			{if $meta=="`$curlower`_tax"}
			{assign var="tax_rate" value=$data}
			{/if}
		{/foreach}
		{if $cursym=="GBP"}
		{assign var="cursym" value="£"}
		{/if}
		{if $cursym=="USD"||$cursym=="NZD"||$cursym=="AUD"}
		{assign var="cursym" value="&dollar;"}
		{/if}
		{if $cursym=="EUR"}
		{assign var="cursym" value="€"}
		{/if}
	{else}
		{assign var="tier" value=$metadata.default_price}
		{assign var="cursym" value=$content.currency_sym}
		{assign var="cursymout" value=$content.currency_code}
		{if $smarty.cookies.output_cursymv3=="gbp"}
		{assign var="tier" value=$theme_vars_default_gbp}
		{assign var="cursym" value="£"}
		{assign var="cursymout" value="GBP"}
		{/if}
		{if $smarty.cookies.output_cursymv3=="usd"}
		{assign var="tier" value=$theme_vars_default_usd}
		{assign var="cursymout" value="USD"}
		{/if}
		{if $smarty.cookies.output_cursymv3=="aud"}
		{assign var="tier" value=$theme_vars_default_aud}
		{assign var="cursymout" value="AUD"}
		{/if}
		{if $smarty.cookies.output_cursymv3=="nzd"}
		{assign var="tier" value=$theme_vars_default_nzd}
		{assign var="cursymout" value="NZD"}
		{/if}
		{if $smarty.cookies.output_cursymv3=="usd"||$smarty.cookies.output_cursymv3=="nzd"||$smarty.cookies.output_cursymv3=="aud"}
		{assign var="cursym" value="&dollar;"}
		{/if}
		{if $smarty.cookies.output_cursymv3=="eur"}
		{assign var="tier" value=$theme_vars_default_eur}
		{assign var="cursym" value="€"}
		{assign var="cursymout" value="EUR"}
		{/if}
	{/if}
	<p class="unleashed-price">
	{assign var="origprice" value=""}
	{strip}
	{/strip}{if $tier=="0"||$tier==""}{assign var=price value=$product.DefaultSellPrice}{/if}{strip}
	{/strip}{if $tier=="1"}{assign var=price value=$product.SellPriceTier1.Value}{/if}{strip}
	{/strip}{if $tier=="2"}{assign var=price value=$product.SellPriceTier2.Value}{/if}{strip}
	{/strip}{if $tier=="3"}{assign var=price value=$product.SellPriceTier3.Value}{/if}{strip}
	{/strip}{if $tier=="4"}{assign var=price value=$product.SellPriceTier4.Value}{/if}{strip}
	{/strip}{if $tier=="5"}{assign var=price value=$product.SellPriceTier5.Value}{/if}{strip}
	{/strip}{if $tier=="6"}{assign var=price value=$product.SellPriceTier6.Value}{/if}{strip}
	{/strip}{if $tier=="7"}{assign var=price value=$product.SellPriceTier7.Value}{/if}{strip}
	{/strip}{if $tier=="8"}{assign var=price value=$product.SellPriceTier8.Value}{/if}{strip}
	{/strip}{if $tier=="9"}{assign var=price value=$product.SellPriceTier9.Value}{/if}{strip}
	{/strip}{if $tier=="10"}{assign var=price value=$product.SellPriceTier10.Value}{/if}{strip}
	{/strip}{if $discount>0}<strike>{$cursym}{assign var="origprice" value=$price}{if $tax_rate!=0}{math equation="x * y / 100 + y" x=$tax_rate y=$price assign="incl"}{else}{assign var="incl" value=$price}{/if}{$incl|string_format:'%.2f'} </strike> {strip}
	{$strip}{math equation="(1 - x) * y" x=$discount y=$price assign=price}{strip}
	{/strip}{/if}{$cursym}{strip}
	{/strip}{if $tax_rate!=0}{math equation="x * y / 100 + y" x=$tax_rate y=$price assign="incl"}{else}{assign var="incl" value=$price}{/if}{$incl|string_format:'%.2f'} <span class="cursym">{$cursymout}</span>
	</p>
	<form action="" method="post">
	<input type="hidden" name="addtobasket" value="true"/>
	<input type="hidden" name="nocache" value="1"/>
	<label class="label product-quantity-label"><span>{$langs.Quantity}: </span>
		<input type="text" maxlength="4" title="{$langs.Quantity}" name="quantity" class="input product-quantity-input" value="1"/>
		<span class="product-quantity-plus">+</span>
		<span class="product-quantity-minus">-</span>
	</label>
	<div class="clear"></div>
	<p class="Button_Large submit_form"><a href="#">Add to basket</a></p>
	</form>
	{if $smarty.request.addtobasket}
		{assign var="cur" value=$content.currency_code}
		{if $smarty.cookies.output_cursymv3}
		{assign var="cur" value=$smarty.cookies.output_cursymv3}
		{/if}
		{if $content.logged_in_user}
		{assign var="cur" value=$cursymout}
		{/if}
		{assign var="product_name" value="`$product.ProductDescription` (`$metadata.product_id`)"}
		{add_to_basket
			name=$product_name
			price=$price
			original_price=$origprice
			quantity=$smarty.request.quantity
			currency=$cur
			custom_tax_rate=$tax_rate
			pic_url=$pic_url
			url_str=$url_str
		}
		{if $added}
		<p class="Icon_Info">Added to basket. <a href="/{$content.basket_link}">Go to checkout.</a></p>
		{/if}
	{/if}
	</div>
{/if}
