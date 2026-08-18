
{if $smarty.get.callbackpaymentexpress=="1"}
	{checkout_paymentexpress
		userid=$merchant5_1 
		apikey=$merchant5_2

	}
	{if $pxsuccess}
		{internal_api 
			path="/api/invoicelink/`$smarty.get.buyerid`/"
			api_key=$localhost_api_key
			name="result"
			method="GET"
			domain="127.0.0.1"
			output="output"
		}
		{internal_api 
			path="/api/ordernotify/"
			api_key=$localhost_api_key
			name="result"
			method="PUT"
			domain="127.0.0.1"
			body="coupon=`$smarty.request.coupon`&discount=`$smarty.request.discount`&tax=`$smarty.request.tax`&shipping=`$smarty.request.shipping`&shipping_orig=`$smarty.request.shipping_orig`&buyerId=`$smarty.request.buyerid`&item_name=&item_number=&payment_status=Payment-Express&mc_gross=`$gatewayreturn_paid`&mc_currency=`$currency_code`&txn_id=`$gatewayreturnid`&parent_txn_id=-&receiver_email=-&contact_phone=`$gatewayreturn_phone`&first_name=`$smarty.request.first_name`&last_name=`$smarty.request.last_name`&address_city=`$gatewayreturn_city`&address_country=`$gatewayreturn_country`&address_state=`$gatewayreturn_state`&address_street=`$gatewayreturn_street` `$gatewayreturn_town`&address_zip=`$gatewayreturn_zip`&payer_business_name=&payer_email=`$gatewayreturn_email`&payer_id=&paymethod=Payment%20Express"
		}
		<h4>{$admin_langs.Order_Saved}</h4>
{*		{if $output.invoice_link}
		<p class="Button_Medium"><a href="{$output.invoice_link}">{$admin_langs.Show_Invoice}</a></p>
		{else}*}
		<p><strong>Redirecting. Please wait.</strong></p>
		<script>
		window.location.href="{$return}";</script>
{*		{/if}*}
	{else}
		<h2>{$langs.Gateway_Error}</h2>
		<p class="Icon_Alert">{$pxerror}</p>
		<p>{$langs.Gateway_Error_More}</p>

	{/if}
{/if}
{if $smarty.get.callbackeway=="1"}
	{* Callback *}
	{checkout_eway 
		callback=1
		apikey=$merchant4_1
                password=$merchant4_2
	}
	{if $ewaypaid}
		{internal_api 
			path="/api/invoicelink/`$buyerId`/"
			api_key=$localhost_api_key
			name="result"
			method="GET"
			domain="127.0.0.1"
			output="output"
		}
		{internal_api 
			path="/api/ordernotify/"
			api_key=$localhost_api_key
			name="result"
			method="PUT"
			domain="127.0.0.1"
			body="coupon=`$smarty.request.coupon`&discount=`$smarty.request.discount`&tax=`$smarty.request.tax`&shipping=`$smarty.request.shipping`&shipping_orig=`$smarty.request.shipping_orig`&buyerId=`$buyerId`&item_name=&item_number=&payment_status=EWAY&mc_gross=`$gatewayreturn_paid`&mc_currency=`$currency_code`&txn_id=`$gatewayreturnid`&parent_txn_id=-&receiver_email=-&contact_phone=`$gatewayreturnphone`&first_name=`$gatewayreturnfirst_name`&last_name=`$gatewayreturnlast_name`&address_city=`$gatewayreturn_city`&address_country=`$gatewayreturn_country`&address_state=`$gatewayreturn_state`&address_street=`$gatewayreturn_street` `$gatewayreturn_town`&address_zip=`$gatewayreturn_zip`&payer_business_name=&payer_email=`$gatewayreturn_email`&payer_id=&paymethod=eWay&shipping_name=`$smarty.request.shipping_name`"
		}

		<h4>{$admin_langs.Order_Saved}</h4>
		{*{if $output.invoice_link}
		<p class="Button_Medium"><a href="{$output.invoice_link}">{$admin_langs.Show_Invoice}</a></p>
		{else}*}
		<p><strong>Redirecting. Please wait.</strong></p>
		<script>
		window.location.href="{$return}";</script>
		{*{/if}*}
	{else}
		<h2>{$langs.Gateway_Error}</h2>
		<p class="Icon_Alert">{$ewayfail}</p>
		<p>{$langs.Gateway_Error_More}</p>

	{/if}
{/if}
{if $smarty.get.callbackswish=="1"}
	{* Callback *}
	{checkout_swish callback=true}
	{if $swishpaid}
		{internal_api 
			path="/api/invoicelink/`$smarty.get.buyerid`/"
			api_key=$localhost_api_key
			name="result"
			method="GET"
			domain="127.0.0.1"
			output="output"
		}
		{internal_api 
			path="/api/ordernotify/"
			api_key=$localhost_api_key
			name="result"
			method="PUT"
			domain="127.0.0.1"
			body="coupon=`$smarty.request.coupon`&discount=`$smarty.request.discount`&tax=`$smarty.request.tax`&shipping=`$smarty.request.shipping`&shipping_orig=`$smarty.request.shipping_orig`&buyerId=`$smarty.get.buyerid`&item_name=&item_number=&payment_status=Swish&mc_gross=`$smarty.get.mc_gross`&mc_currency=`$currency_code`&txn_id=`$swishid`&parent_txn_id=-&receiver_email=-&contact_phone=`$smarty.get.phone`&first_name=`$smarty.get.first_name`&last_name=`$smarty.get.last_name`&address_city=`$smarty.get.city`&address_country=`$smarty.get.country`&address_state=`$smarty.get.state`&address_street=`$smarty.get.street` `$smarty.get.town`&address_zip=`$smarty.get.zip`&payer_business_name=&payer_email=`$smarty.get.email`&payer_id=&paymethod=Swish"
		}

		<h4>{$admin_langs.Order_Saved}</h4>
		{*{if $output.invoice_link}
		<p class="Button_Medium"><a href="{$output.invoice_link}">{$admin_langs.Show_Invoice}</a></p>
		{/if}*}
	{else}
		<h2>{$langs.Gateway_Error}</h2>
		<p class="Icon_Alert">{$ewayfail}</p>
		<p>{$langs.Gateway_Error_More}</p>
	{/if}
{/if}
