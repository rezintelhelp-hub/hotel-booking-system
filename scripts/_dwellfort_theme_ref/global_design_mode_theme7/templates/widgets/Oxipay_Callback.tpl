{* @@@
{
	"widget_info":{
		"title":"Oxipay Callback"
		,"category":"setup"
	}
}
@@@ *}
{if $smarty.request.callbackoxipay=="1"}

	{if $smarty.request.x_result=="completed"}
	
	{checkout_oxipay 
		checksig=$smarty.request.x_signature
		merchantnumber=$content.merchant6_1 
		apikey=$content.merchant6_2
		code_and_name=$content.merchant6_3
	}

	{if $sigok} 
		{internal_api 
			path="/api/invoicelink/`$smarty.request.buyerid`/"
			api_key=$localhost_api_key
			name="result"
			method="GET"
			domain="127.0.0.1"
			output="output"
		}
	
		{assign var=mc_gross value=$smarty.request.x_amount}
	
		{internal_api 
			path="/api/ordernotify/"
			api_key=$localhost_api_key
			name="result"
			method="PUT"
			domain="127.0.0.1"
			body="coupon=`$smarty.request.coupon`&discount=`$smarty.request.discount`&tax=`$smarty.request.tax`&shipping=`$smarty.request.shipping`&shipping_orig=`$smarty.request.shipping_orig`&buyerId=`$smarty.request.buyerid`&item_name=&item_number=&payment_status=Oxipay&mc_gross=`$mc_gross`&mc_currency=`$currency_code`&txn_id=`$swishid`&parent_txn_id=-&receiver_email=-&contact_phone=`$smarty.request.phone`&first_name=`$smarty.request.first_name`&last_name=`$smarty.request.last_name`&address_city=`$smarty.request.city`&address_country=`$smarty.request.country`&address_state=`$smarty.request.state`&address_street=`$smarty.request.street` `$smarty.request.town`&address_zip=`$smarty.request.zip`&payer_business_name=&payer_email=`$smarty.request.email`&payer_id="
		}
{literal}{{/literal}"x_reference": "{$smarty.request.buyerid}",
"x_result": "completed"{literal}}{/literal}
	{else}
{literal}{{/literal}"x_reference": "{$smarty.request.buyerid}",
"x_result": "failed"{literal}}{/literal}
	
	{/if}
		
	{else}
{literal}{{/literal}"x_reference": "{$smarty.request.buyerid}",
"x_result": "failed"{literal}}{/literal}
		
	{/if}
{/if}