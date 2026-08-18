
{*
{if $smarty.get.ngan_luong_pay}
{checkout_ngan_luong action="checkout" url="https://www.nganluong.vn/checkout.php" merchant_pass=$theme_vars_merchant_pass merchant_id=$merchant_id receiver=$paypal_email order_code=$buyerId cancel_url=$return_fail return_url="`$basket_link`/?ngan_luong_success=1" total=$smarty.post.total discount=$smarty.post.discount shipping=$smarty.post.shipping name=$smarty.post.name email=$smarty.post.email phone=$smarty.post.phone}
{/if}
{if $smarty.get.ngan_luong_success}
	{checkout_ngan_luong action="success" merchant_pass=$theme_vars_merchant_pass merchant_id=$merchant_id }
	{if $ngan_luong_success}
		{internal_api 
			path="/api/ordernotify/"
			api_key=$localhost_api_key
			name="result"
			method="PUT"
			domain="127.0.0.1"
			body="buyerId=`$smarty.get.order_code`&item_name=&item_number=&payment_status=&mc_gross=`$smarty.get.price`&mc_currency=vnd&txn_id=`$smarty.get.payment_id`&parent_txn_id=-&receiver_email=`$paypal_email`&first_name=&last_name=&address_city=&address_country=&address_state=&address_street=&address_zip=&payer_business_name=&payer_email=&payer_id="
		}
	{else}
	<h1>An error has occurred</h1>
	{/if}
{/if}*}

{if $smarty.post.admin_place_order && $admin_logged_in}
	{internal_api 
		path="/api/invoicelink/`$buyerId`/"
		api_key=$localhost_api_key
		name="result"
		method="GET"
		domain="127.0.0.1"
		output="output"
	}
	{if $smarty.post.paid}
	{assign var=mc_gross value=$smarty.post.ototalsgross}
	{else}
	{assign var=mc_gross value="0.00"}
	{/if}
	{internal_api 
		path="/api/ordernotify/"
		api_key=$localhost_api_key
		name="result"
		method="PUT"
		domain="127.0.0.1"
		body="shipping_tax=`$smarty.request.shipping_tax|urlencode`&shipping_orig=`$smarty.request.shipping_orig|urlencode`&coupon=`$smarty.request.coupon|urlencode`&discount=`$smarty.request.discount|urlencode`&tax=`$smarty.request.tax|urlencode`&shipping=`$smarty.request.shipping|urlencode`&buyerId=`$buyerId`&item_name=&item_number=&payment_status=ADMIN_PLACED_ORDER&mc_gross=`$mc_gross`&mc_currency=`$currency_code`&txn_id=`$smarty.now`&parent_txn_id=-&receiver_email=-&contact_phone=`$smarty.post.admin_order_phone|urlencode`&first_name=`$smarty.post.admin_order_first_name|urlencode`&last_name=`$smarty.post.admin_order_last_name|urlencode`&address_city=`$smarty.post.admin_order_city|urlencode`&address_country=`$smarty.post.admin_order_country|urlencode`&address_state=`$smarty.post.admin_order_state|urlencode`&address_street=`$smarty.post.admin_order_street|urlencode` `$smarty.post.admin_order_address2|urlencode`&address_zip=`$smarty.post.admin_order_zip|urlencode`&payer_business_name=&payer_email=`$smarty.post.admin_order_email|urlencode`&payer_id=&paymethod=Admin%20Order&shipping_name=`$smarty.post.shipping_name|urlencode`"
	}

	<h4>{$admin_langs.Order_Saved}</h4>
	{if $output.invoice_link}
	<p class="Button_Medium"><a href="{$output.invoice_link}">{$admin_langs.Show_Invoice}</a></p>
	{/if}

{/if}
{if $smarty.post.gatewaypost=="paylater"}

	{assign var="paylaterok" value=true}

	{if $merchant3_4}
		{assign var="customerid" value=false}
		{foreach $logged_in_user.custom_with_names as $custom}
			{if $custom.name=="Xero Customer ID"}
				{assign var="customerid" value=$custom.value}
			{/if}
		{/foreach}
		{if $customerid===false}
			<p class="Icon_Error">
				Error: No Customer ID Found.
			</p>
			{assign var="paylaterok" value=false}

		{/if}

	{/if}
	{if $paylaterok}

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
		body="shipping_tax=`$smarty.request.shipping_tax|urlencode`&shipping_orig=`$smarty.request.shipping_orig|urlencode`&coupon=`$smarty.request.coupon|urlencode`&discount=`$smarty.request.discount|urlencode`&tax=`$smarty.request.tax|urlencode`&shipping=`$smarty.request.shipping|urlencode`&buyerId=`$buyerId`&item_name=&item_number=&payment_status=PAYLATER&mc_gross=0.00&mc_currency=`$currency_code`&txn_id=`$smarty.now`&parent_txn_id=-&receiver_email=-&contact_phone=`$smarty.post.admin_order_phone|urlencode`&first_name=`$smarty.post.admin_order_first_name|urlencode`&last_name=`$smarty.post.admin_order_last_name|urlencode`&address_city=`$smarty.post.admin_order_city|urlencode`&address_country=`$smarty.post.admin_order_country|urlencode`&address_state=`$smarty.post.admin_order_state|urlencode`&address_street=`$smarty.post.admin_order_street|urlencode` `$smarty.post.admin_order_town|urlencode`&address_zip=`$smarty.post.admin_order_zip|urlencode`&payer_business_name=&payer_email=`$smarty.post.admin_order_email|urlencode`&payer_id=&paymethod=Pay%20Later&shipping_name=`$smarty.post.shipping_name|urlencode`"
	}
	{if $merchant3_3!=""}
	<p class="Icon_Tick">{$merchant3_3}</p>
	<p><strong>Redirecting. Please wait.</strong></p>
	{/if}

	<script type="text/javascript">window.location="{$return}";</script>

	{if $merchant3_4}
		{checkout_xero
			total=$smarty.post.total
			discount=$smarty.post.discount
			shipping=$smarty.post.shipping
			tax=$smarty.post.tax
			address=$smarty.post.street
			city=$smarty.post.city
			state=$smarty.post.state
			zip=$smarty.post.zip
			contactid=$customerid
			country=$smarty.post.country
			email=$smarty.post.email
			userid=$buyerId
		}
	{/if}
	{if $output.invoice_link && $merchant3_2=="1"}
	<p class="Button_Medium"><a href="{$output.invoice_link}">{$admin_langs.Show_Invoice}</a></p>
	{/if}
	{/if}

{/if}
{if $smarty.post.gatewaypost=="authnet"}
	{checkout_authorizenet
		apilogin=$merchant2_1
		transkey=$merchant2_2
		card=$smarty.post.cardnumber
		cardname=$smarty.post.nameoncard
		expire=$smarty.post.expirydate
		ccv=$smarty.post.ccv
		total=$smarty.post.total
		discount=$smarty.post.discount
		shipping=$smarty.post.shipping
		tax=$smarty.post.tax
		address=$smarty.post.street
		city=$smarty.post.city
		state=$smarty.post.state
		zip=$smarty.post.zip
		country=$smarty.post.country
		email=$smarty.post.email
		userid=$buyerId
		sandbox=false
	}
	{if $authnetfail} 
		<h2>{$langs.Gateway_Error}</h2>
		<p class="Icon_Alert">{$authnetfail}</p>
		<p>{$langs.Gateway_Error_More}</p>
	{else}
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
			body="shipping_tax=`$smarty.request.shipping_tax|urlencode`&shipping_orig=`$smarty.request.shipping_orig|urlencode`&coupon=`$smarty.request.coupon|urlencode`&discount=`$smarty.request.discount|urlencode`&tax=`$smarty.request.tax|urlencode`&shipping=`$smarty.request.shipping|urlencode`&buyerId=`$buyerId`&item_name=&item_number=&payment_status=AUTHORIZE.NET&mc_gross=`$authnetcharge`&mc_currency=`$currency_code`&txn_id=`$authnetid`&parent_txn_id=-&receiver_email=-&contact_phone=`$smarty.post.phone|urlencode`&first_name=`$authnetfirst_name`&last_name=`$authnetlast_name`&address_city=`$smarty.post.city|urlencode`&address_country=`$smarty.post.country|urlencode`&address_state=`$smarty.post.state|urlencode`&address_street=`$smarty.post.street|urlencode` `$smarty.post.town|urlencode`&address_zip=`$smarty.post.zip|urlencode`&payer_business_name=&payer_email=`$smarty.post.email|urlencode`&payer_id=&paymethod=Authnet&shipping_name=`$smarty.post.shipping_name|urlencode`"
		}
		<h4>{$admin_langs.Order_Saved}</h4>
		{if $output.invoice_link}
		<p class="Button_Medium"><a href="{$output.invoice_link}">{$admin_langs.Show_Invoice}</a></p>
		{else}
		<p><strong>Redirecting. Please wait.</strong></p>
		<script type="text/javascript">window.location="{$return}";</script>
		{/if}
	{/if}
{/if}
{if $smarty.post.gatewaypost=="paystation"}
	{internal_api
		path="/api/ordernotify/"
		api_key=$localhost_api_key
		name="result"
		method="PUT"
		domain="http://127.0.0.1"
		body="soft=true&shipping_tax=`$smarty.request.shipping_tax|urlencode`&shipping_orig=`$smarty.request.shipping_orig|urlencode`&coupon=`$smarty.request.coupon|urlencode`&discount=`$smarty.request.discount|urlencode`&tax=`$smarty.request.tax|urlencode`&shipping=`$smarty.request.shipping|urlencode`&buyerId=`$buyerId`&item_name=&item_number=&payment_status=Paystation%20Incomplete&mc_currency=`$currency_code`&contact_phone=`$smarty.post.phone|urlencode`&first_name=`$smarty.post.first_name|urlencode`&last_name=`$smarty.post.last_name|urlencode`&address_city=`$smarty.post.city|urlencode`&address_country=`$smarty.post.country|urlencode`&address_state=`$smarty.post.state|urlencode`&address_street=`$smarty.post.street|urlencode`&address_zip=`$smarty.post.zip|urlencode`&payer_business_name=&payer_email=`$smarty.post.email|urlencode`&payer_id=&paymethod=Paystation%20Incomplete&shipping_name=`$smarty.post.shipping_name|urlencode`"
	}

	{assign var=callback value="`$protocol``$http_host`/paystation-callback/"}

	{checkout_paystation 
		client_id=$merchant7_1 
		client_secret=$merchant7_2
		gateway_id=$merchant7_3
		hmac_key=$merchant7_4
		total=$smarty.post.total
		discount=$smarty.post.discount
		shipping=$smarty.post.shipping
		tax=$smarty.post.tax
		first_name=$smarty.post.first_name
		last_name=$smarty.post.last_name
		address=$smarty.post.street
		address2=$smarty.post.street2
		city=$smarty.post.city
		state=$smarty.post.state
		zip=$smarty.post.zip
		country=$smarty.post.country
		email=$smarty.post.email
		userid=$buyerId
		currency=$currency_code
		returnurl="`$return`?backfrompaystation=1"
		error="`$return_fail`?backfrompaystation=1"
		webhook=$callback
		paysetup=true
	}
	{if $paystation_error} 
		<h2>{$langs.Gateway_Error}</h2>
		<p class="Icon_Alert">{$paystation_error|print_r}</p>
		<p>{$langs.Gateway_Error_More}</p>
	{else}
	<p class="Icon_Info">Redirecting, please wait.</p>
	<form method="post" action="{$paystation_url}" enctype="application/x-www-form-urlencoded" id="paystationform" style="visibility:hidden">
	<input type="submit" value="Continue to Paystation"/>
	</form>
	<script type="text/javascript">
	{literal}
	$(document).ready(function(){
		$("#paystationform").submit();
	});
	{/literal}
	</script>
	{/if}
{/if}
{if $smarty.post.gatewaypost=="oxipay"}

	{assign var=callback value="`$protocol``$http_host`/oxipay-callback/?callbackoxipay=1&app=1&shipping_tax=`$smarty.request.shipping_tax|urlencode`&shipping_orig=`$smarty.request.shipping_orig|urlencode`&coupon=`$smarty.request.coupon|urlencode`&discount=`$smarty.request.discount|urlencode`&tax=`$smarty.request.tax|urlencode`&shipping=`$smarty.request.shipping|urlencode`&buyerid=`$buyerId`&mc_gross=`$smarty.post.total|urlencode`&first_name=`$smarty.request.first_name|urlencode`&last_name=`$smarty.request.last_name|urlencode`&email=`$smarty.request.email|urlencode`&street=`$smarty.request.street|urlencode` `$smarty.request.street2|urlencode`&town=`$smarty.request.town|urlencode`&city=`$smarty.request.city|urlencode`&state=`$smarty.request.state|urlencode`&zip=`$smarty.request.zip|urlencode`&country=`$smarty.request.country|urlencode`"}


	{checkout_oxipay 
		merchantnumber=$merchant6_1 
		apikey=$merchant6_2
		code_and_name=$merchant6_3
		total=$smarty.post.total
		discount=$smarty.post.discount
		shipping=$smarty.post.shipping
		tax=$smarty.post.tax
		first_name=$smarty.post.first_name
		last_name=$smarty.post.last_name
		address=$smarty.post.street
		address2=$smarty.post.street2
		city=$smarty.post.city
		state=$smarty.post.state
		zip=$smarty.post.zip
		country=$smarty.post.country
		email=$smarty.post.email
		userid=$buyerId
		currency=$currency_code
		success="`$return`?backfromoxipay=1"
		error="`$return_fail`?backfromoxipay=1"
		callbackurl=$callback
	}
	{if $oxipayfail} 
		<h2>{$langs.Gateway_Error}</h2>
		<p class="Icon_Alert">{$oxipay}</p>
		<p>{$langs.Gateway_Error_More}</p>
	{else}
	<form method="post" action="{$oxiurl}" enctype="application/x-www-form-urlencoded" id="oxipayform">
	{foreach from=$vars item=item key=key name=loop1}
	<input type="hidden" name="{$key}" value="{$item}"/>
	{/foreach}
	<input type="submit" value="Continue to Oxipay"/>
	</form>
	<script type="text/javascript">
	{literal}
	$(document).ready(function(){
		$("#oxipayform").submit();
	});
	{/literal}
	</script>
	{/if}
{/if}
{if $smarty.post.gatewaypost=="eway"}
	{checkout_eway 
		apikey=$merchant4_1 
		password=$merchant4_2
		total=$smarty.post.total
		discount=$smarty.post.discount
		shipping=$smarty.post.shipping
		tax=$smarty.post.tax
		first_name=$smarty.post.first_name
		last_name=$smarty.post.last_name
		address=$smarty.post.street
		address2=$smarty.post.town
		city=$smarty.post.city
		state=$smarty.post.state
		zip=$smarty.post.zip
		country=$smarty.post.country
		email=$smarty.post.email
		callbackurl="`$protocol``$http_host`/`$basket_link`?callbackeway=1&shipping_tax=`$smarty.request.shipping_tax|urlencode`&shipping_orig=`$smarty.request.shipping_orig|urlencode`&coupon=`$smarty.request.coupon|urlencode`&discount=`$smarty.request.discount|urlencode`&tax=`$smarty.request.tax|urlencode`&shipping=`$smarty.request.shipping|urlencode`&shipping_name=`$smarty.post.shipping_name|urlencode`"
	}
	{if $ewayfail} 
		<h2>{$langs.Gateway_Error}</h2>
		<p class="Icon_Alert">{$ewayfail}</p>
		<p>{$langs.Gateway_Error_More}</p>
	{else}
		<p><strong>Redirecting. Please wait.</strong></p>
		<script type="text/javascript">window.location="{$return}";</script>
	{/if}

{/if}
{if $smarty.post.gatewaypost=="paymentexpress"}
	{checkout_paymentexpress 
		userid=$merchant5_1 
		apikey=$merchant5_2
		total=$smarty.post.total
		first_name=$smarty.post.first_name
		currency=$currency_code
		id=$buyerId
		last_name=$smarty.post.last_name
		address=$smarty.post.street
		address2=$smarty.post.town
		city=$smarty.post.city
		state=$smarty.post.state
		zip=$smarty.post.zip
		country=$smarty.post.country
		email=$smarty.post.email
		fail=$return_fail
		callbackurl="`$protocol``$http_host`/`$basket_link`?callbackpaymentexpress=1&amp;shipping_tax=`$smarty.request.shipping_tax|urlencode`&amp;shipping_orig=`$smarty.request.shipping_orig|urlencode`&amp;coupon=`$smarty.request.coupon|urlencode`&amp;discount=`$smarty.request.discount|urlencode`&amp;tax=`$smarty.request.tax|urlencode`&amp;shipping=`$smarty.request.shipping|urlencode`&amp;buyerid=`$buyerId`&amp;first_name=`$smarty.post.first_name|urlencode`&amp;last_name=`$smarty.post.last_name|urlencode`&amp;phone=`$smarty.post.phone|urlencode`"
		success="`$protocol``$http_host`/`$basket_link`?callbackpaymentexpress=1&amp;shipping_tax=`$smarty.request.shipping_tax|urlencode`&amp;shipping_orig=`$smarty.request.shipping_orig|urlencode`&amp;coupon=`$smarty.request.coupon|urlencode`&amp;discount=`$smarty.request.discount|urlencode`&amp;tax=`$smarty.request.tax|urlencode`&amp;shipping=`$smarty.request.shipping|urlencode`&amp;buyerid=`$buyerId`&amp;first_name=`$smarty.post.first_name|urlencode`&amp;last_name=`$smarty.post.last_name|urlencode`&amp;phone=`$smarty.post.phone|urlencode`"
		redirect=true
	}

{/if}
{if $smarty.post.gatewaypost=="swish"}

	{assign var=callback value="`$protocol``$http_host`/`$basket_link`/?callbackswish=1&shipping_tax=`$smarty.request.shipping_tax|urlencode`&shipping_orig=`$smarty.request.shipping_orig|urlencode`&coupon=`$smarty.request.coupon|urlencode`&discount=`$smarty.request.discount|urlencode`&tax=`$smarty.request.tax|urlencode`&shipping=`$smarty.request.shipping|urlencode`&buyerid=`$buyerId`&mc_gross=`$smarty.post.total|urlencode`&first_name=`$smarty.request.first_name|urlencode`&last_name=`$smarty.request.last_name`&email=|urlencode`$smarty.request.email|urlencode`&street=`$smarty.request.street|urlencode`&town=`$smarty.request.town|urlencode`&city=`$smarty.request.city|urlencode`&state=`$smarty.request.state|urlencode`&zip=`$smarty.request.zip|urlencode`&country=`$smarty.request.country|urlencode`"}

	{checkout_swish 
		number=$merchant6_1 
		passphrase=$merchant6_2
		total=$smarty.post.total
		currency='SEK'
		cell=$smarty.post.cell
		id=$buyerId
		callbackurl=$callback
		paysetup=true
	}
	{if $swishcreated}
		<h2>{$langs.Swish_Check_Mobile}</h2>
		<p>{$langs.Swish_Check_Mobile_More}</p>
		<p class="Button_Large"><a href="{$callback}">Continue</a></p>
	{/if}
	{if $swisherror} 
		<h2>{$langs.Gateway_Error}</h2>
		<p class="Icon_Alert">{$ewayfail}</p>
		<p>{$langs.Gateway_Error_More}</p>
	{/if}
	
{/if}
