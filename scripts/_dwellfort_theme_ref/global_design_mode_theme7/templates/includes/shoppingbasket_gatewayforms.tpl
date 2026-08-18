{* Debug:
Authnet: {$ototals}<br/>
PayPal: {$totaltax} + {$shipping} - {$discount}
*}
{* If you are integrating a custom gateway please ensure the form that goes to the gateway has the id of paymentGatewayForm to ensure contact forms added to the checkout are submitted before the gateway form *}

{if $admin_logged_in}

	{if !$smarty.post.admin_place_order}
		<div class="styleBox clearfix">
		<h4>{$admin_langs.Welcome_Admin}</h4>
		<p>{$admin_langs.Complete_Checkout}<p>
			<form action="" method="post" id="paymentGatewayForm" class="form">
				<input type="hidden" name="admin_place_order" value="1" />
				<input type="hidden" name="total" value="{$ototals}">
				<input type="hidden" name="discount" value="{$discount_net}">
				<input type="hidden" name="shipping_orig" value="{$shipping_orig}">
				<input type="hidden" name="shipping_tax" value="{$shipping_tax}">
				<input type="hidden" name="shipping" value="{$shipping}">
				<input type="hidden" name="shipping_name" value="{$smarty.request.shipping_name|replace:"$":"&dollar;"}">
				<input type="hidden" name="coupon" value="{$smarty.request.coupon}">
				<input type="hidden" name="tax" value="{"%i"|money_format:$totaltax}">
				<input type="hidden" name="ototalsgross" value="{$grand}">
				<div class="input-wrapper input-wrapper-width-25 input-wrapper-type-short" >
					<label class="">{$admin_langs.First_Name}</label>
					<input type="text" maxlength="256" name="admin_order_first_name" class="input" />
				</div>
				<div class="input-wrapper input-wrapper-width-25 input-wrapper-type-short" >
					<label class="">{$admin_langs.Last_Name}</label>
					<input type="text" maxlength="256" name="admin_order_last_name" class="input" />
				</div>
				<div class="input-wrapper input-wrapper-width-25 input-wrapper-type-short" >
					<label class="">{$admin_langs.Email}</label>
					<input type="text" maxlength="256" name="admin_order_email" class="input" />
				</div>
				<div class="input-wrapper input-wrapper-width-25 input-wrapper-type-short" >
					<label class="">{$admin_langs.Phone}</label>
					<input type="text" maxlength="256" name="admin_order_phone" class="input" />
				</div>
				<div class="clear"></div>
				<div class="input-wrapper input-wrapper-width-25 input-wrapper-type-short" >
					<label class="">{$admin_langs.Street}</label>
					<input type="text" maxlength="256" name="admin_order_street" class="ss_autocomplete_street input" autocomplete="off"/>
				</div>
				<div class="input-wrapper input-wrapper-width-25 input-wrapper-type-short" >
					<label class="">Town</label>
					<input type="text" maxlength="256" name="admin_order_town" class="input ss_autocomplete_town" />
				</div>
				<div class="input-wrapper input-wrapper-width-25 input-wrapper-type-short" >
					<label class="">{$admin_langs.City}</label>
					<input type="text" maxlength="256" name="admin_order_city" class="input ss_autocomplete_city" />
				</div>
				<div class="input-wrapper input-wrapper-width-25 input-wrapper-type-short" >
					<label class="">{$admin_langs.State}</label>
					<input type="text" maxlength="256" name="admin_order_state" class="input ss_autocomplete_state" />
				</div>
				<div class="input-wrapper input-wrapper-width-25 input-wrapper-type-short" >
					<label class="">{$admin_langs.Zip}</label>
					<input type="text" maxlength="256" name="admin_order_zip" class="input ss_autocomplete_zip" />
				</div>
				<div class="clear"></div>
				<div class="input-wrapper input-wrapper-width-25 input-wrapper-type-short" >
					<label class=""><input type="checkbox" checked="checked" value="1" name="paid"/> {$admin_langs.Paid}</label>

				</div>
				<div class="clear"></div>
				<p class="Icon_Alert cf_contains_errors" >* Please fill out all required fields</p>
				<p class="button submit_form hide_if_no_js">
					<a href="#" class=''>{$langs.Submit}</a>
				</p>
		
				<input type="submit" value="{$langs.Submit}" class="contact-form-hide-with-js"/>
			</form>
		</div>
	{/if}

{else}

	{*paypal form*}
	{if ($smarty.post.gateway=="paypal"||($merchant1_enabled&&!$smarty.post.gateway&&$gateways==1)||($firstgateway==1&&!$smarty.post.gateway)) && !$smarty.post.gatewaypost}
		<div class="styleBox clearfix">
	<form action="https://www.paypal.com/cgi-bin/webscr" method="post" id="paymentGatewayForm" data-transid="{$buyerId}" data-datalayer-gateway="paypal" data-datalayer-total="{$ototals}" data-datalayer-discount="{"%i"|money_format:$discount_net}" data-datalayer-shipping="{$shipping}" data-datalayer-coupon="{$smarty.request.coupon}" data-datalayer-tax="{if !$omit_tax}{"%i"|money_format:$totaltax}{else}0.00{/if}" class="form">
		<input type="hidden" name="cmd" value="_cart" />
		<input type="hidden" name="upload" value="1" />
		<input type="hidden" name="business" value="{$merchant1_1}" />
		<input type="hidden" name="notify_url" value="{$ipn}?cms_coupon={$smarty.request.coupon}&cms_discount={$discount_net}&cms_shipping_orig={$shipping_orig}&cms_shipping_tax={$shipping_tax}&cms_tax={$totaltax}&cms_shipping_net={$shipping}" />
		<input type="hidden" name="custom" value="{$buyerId}" />
		<input type="hidden" name="rm" value="2" />
		<input type="hidden" name="return" value="{$return}" />
		<input type="hidden" name="cancel_return" value="{$return_fail}" />
		<input type="hidden" name="no_note" value="{$no_note}" />
		<input type="hidden" name="currency_code" value="{$currency_code}" />
		<input type="hidden" name="weight_unit" value="kgs" />
		<input type="hidden" name="bn" value="SSCMS_SP" />
		{*
		{if $found}
		<input type="hidden" name="discount_amount_cart" value="{"%i"|money_format:$discount_net}" />
		{/if}
		{if $shipping}
			<input type="hidden" name="handling_cart" value="{$shipping}" />
		{/if}
		{if !$omit_tax}
		<input type="hidden" name="tax_cart" value="{"%i"|money_format:$totaltax}" />
		{/if}
		*}

		{foreach from=$orders item=order name=ordersLoop}
		{if $order.product_code!="TAX"&&$order.product_code!="SHIPPING"}
		<input type="hidden" name="item_name_{$smarty.foreach.ordersLoop.iteration}" value="Payment" />
		<input type="hidden" name="amount_{$smarty.foreach.ordersLoop.iteration}" value="{$grand}" />
{*		<input type="hidden" name="quantity_{$smarty.foreach.ordersLoop.iteration}" value="{$order.quantity}" />
		<input type="hidden" name="weight_{$smarty.foreach.ordersLoop.iteration}" value="{$order.weight}" />*}
		{/if}
		{/foreach}
		<input type="image" src="https://www.paypalobjects.com/webstatic/en_US/i/buttons/checkout-logo-large.png" name="" value="{$langs.Checkout_Through_PayPal}"/>
	</form>
	</div>
	{/if}

	{*stripe form*}
	{if ($smarty.post.gateway=="stripe"||($theme_vars_stripe_key_secret&&!$smarty.post.gateway&&$gateways==1)||($firstgateway==100&&!$smarty.post.gateway)) && !$smarty.post.gatewaypost}
	<script src="https://js.stripe.com/v3/"></script>
		{if !$omit_tax}
			{assign var=stripe_tax value=$totaltax}
		    {math equation="x + y + z - a" x=$ototals y=$totaltax z=$shipping a=$discount_net assign="ototals"}
		{else}
		    {math equation="x  + z - a" x=$ototals z=$shipping a=$discount_net assign="ototals"}
			{assign var=stripe_tax value=0}
		{/if}
	{assign var=ototals value="%i"|money_format:$ototals}
	<script type="text/javascript">
	{literal}
	$(document).ready(function(){

		var stripe = Stripe('{/literal}{$theme_vars_stripe_key_publishable}{literal}');
		//var checkoutButton = document.getElementById('checkout-button');

		//checkoutButton.addEventListener('click', function() {
		$('#paymentGatewayFormStripe').on('click', function () {

			if (!$(this).hasClass('formInCheckoutOK')&&$('.formUsedInCheckout').length) {
				// extra form valid
				$(".form.formUsedInCheckout").trigger('submit');
				return false;
			}
		  stripe.redirectToCheckout({
		    // Make the id field from the Checkout Session creation API response
		    // available to this file, so you can provide it as argument here
		    // instead of the {{CHECKOUT_SESSION_ID}} placeholder.
		    sessionId: '{/literal}{stripe action="checkout"
api_secret=$theme_vars_stripe_key_secret 
success=$return 
currency=$currency_code
item_name="Basket"
fail=$return_fail 
amount=$ototals
client_reference_id=$buyerId
countries=$theme_vars_stripe_allowed_countries
coupon=$smarty.request.coupon
shipping=$shipping
shipping_tax=$shipping_tax
shipping_orig=$shipping_orig
tax=$stripe_tax
discount=$discount_net
	}{literal}'
		  }).then(function (result) {
		    // If `redirectToCheckout` fails due to a browser or network
		    // error, display the localized error message to your customer
		    // using `result.error.message`.
		  });
		});
	});
	{/literal}
	</script>
	<div class="styleBox">
	<p  class="Button_Large"><a href="#" id="paymentGatewayFormStripe">Checkout with Stripe</a></p>
	</div>
	{/if}

	{* Authnet *}

	
	{if ($smarty.post.gateway=="authnet"||($merchant2_enabled&&!$smarty.post.gateway&&$gateways==1)||($firstgateway==2&&!$smarty.post.gateway)) && !$smarty.post.gatewaypost}
	<form action="" method="post" id="paymentGatewayForm" class="form" data-transid="{$buyerId}" data-datalayer-gateway="authnet" data-datalayer-total="{$ototals}" data-datalayer-discount="{"%i"|money_format:$discount_net}" data-datalayer-shipping="{$shipping}" data-datalayer-coupon="{$smarty.request.coupon}" data-datalayer-tax="{if !$omit_tax}{"%i"|money_format:$totaltax}{else}0.00{/if}">
		<input type="hidden" name="gatewaypost" value="authnet" />
		<input type="hidden" name="total" value="{$ototals}">	
		<input type="hidden" name="discount" value="{$discount_net}">
		<input type="hidden" name="shipping" value="{$shipping}">
		<input type="hidden" name="shipping_name" value="{$smarty.request.shipping_name|replace:"$":"&dollar;"}">
		<input type="hidden" name="shipping_orig" value="{$shipping_orig}">
		<input type="hidden" name="shipping_tax" value="{$shipping_tax}">
		<input type="hidden" name="coupon" value="{$smarty.request.coupon}">
		<input type="hidden" name="tax" value="{"%i"|money_format:$totaltax}">
		<h2>{$langs.Contact_Details}</h2>
		<div class="styleBox clearfix">
			<div class="input-wrapper input-wrapper-width-50 input-wrapper-type-short" >
				<label class="required_label" for="an_email">{$langs.Email}</label>
				<input type="email" id="an_email" maxlength="256" name="email" class="input required" />
			</div>
			<div class="input-wrapper input-wrapper-width-25 input-wrapper-type-short" >
				<label class="" for="an_phone">{$langs.Phone}</label>
				<input type="text" id="an_phone" maxlength="256" name="phone" class="input" />
			</div>
		</div>

		<h2>{$langs.Card_Details}</h2>
		<div class="styleBox clearfix">
			<div class="input-wrapper input-wrapper-width-25 input-wrapper-type-short" >
				<label class="required_label" for="card">{$langs.Name_On_Card}</label>
				<input id="card" type="text" maxlength="19" placeholder="{$langs.First_Name} {$langs.Last_Name}" name="nameoncard" class="input required" />
			</div>
			<div class="input-wrapper input-wrapper-width-25 input-wrapper-type-short" >
				<label class="required_label" for="cardnumber">{$langs.Card_Number}</label>
				<input id="cardnumber" type="text" maxlength="19" placeholder="XXXX XXXX XXXX XXXX" name="cardnumber" class="input required" />
			</div>
			<div class="input-wrapper input-wrapper-width-25 input-wrapper-type-short" >
				<label class="required_label" for="expiry">{$langs.Card_Expiry}</label>
				<input id="expiry" type="text" maxlength="5" data-required-format="##/##" placeholder="MM/YY" name="expirydate" class="input required" />
			</div>
			<div class="input-wrapper input-wrapper-width-25 input-wrapper-type-short" >
				<label class="required_label" for="ccv">{$langs.CCV}</label>
				<input id="ccv" type="text" maxlength="4" placeholder="3 or 4 digit code" data-required-format="###*" name="ccv" class="input required" />
			</div>
		</div>
		
		<h2>{$langs.Billing_Address}</h2>
		<div class="styleBox clearfix">
			
			<div class="input-wrapper input-wrapper-width-25 input-wrapper-type-short" >
				<label class="required_label" for="an_street">{$langs.Street}</label>
				<input type="text" id="an_street" maxlength="256" name="street" class="input required ss_autocomplete_street" />
			</div>
			
			<div class="input-wrapper input-wrapper-width-25 input-wrapper-type-short" >
				<label class="required_label" for="an_city">{$langs.City}</label>
				<input type="text" id="an_city" maxlength="256" name="city" class="input required ss_autocomplete_city " />
			</div>
			<div class="input-wrapper input-wrapper-width-25 input-wrapper-type-short" >
				<label class="required_label" for="an_state">{$langs.State}</label>
				<input type="text" id="an_state" maxlength="256" name="state" class="input required ss_autocomplete_state" />
			</div>

			<div class="input-wrapper input-wrapper-width-25 input-wrapper-type-short" >
				<label class="required_label" for="an_zip">{$langs.Zip}</label>
				<input type="text" id="an_zip" maxlength="256" name="zip" class="input required ss_autocomplete_zip" />
			</div>
						<div class="clear"></div>
			<div class="input-wrapper input-wrapper-width-25 input-wrapper-type-short" >
				<label class="required_label" for="country">{$langs.Country}</label>
				<select name="country" class="required select ss_autocomplete_country" id="country" >

						{include file="includes/countries_three_letter.tpl"}
				</select>
			</div>

		</div>

		<p class="Icon_Alert cf_contains_errors" >* Please fill out all required fields</p>
		<p class="button submit_form hide_if_no_js">
			<a href="#" class=''>{$langs.Checkout}</a>
		</p>

		<input type="submit" value="{$langs.Checkout}" class="contact-form-hide-with-js"/>
	</form>
	{/if}

	{* Paystation *}

	
	{if ($smarty.post.gateway=="paystation"||($merchant7_enabled&&!$smarty.post.gateway&&$gateways==1)||($firstgateway==7&&!$smarty.post.gateway)) && !$smarty.post.gatewaypost}
	<form action="" method="post" id="paymentGatewayForm" class="form form-legacy" data-transid="{$buyerId}" data-datalayer-gateway="paystation" data-datalayer-total="{$ototals}" data-datalayer-discount="{"%i"|money_format:$discount_net}" data-datalayer-shipping="{$shipping}" data-datalayer-coupon="{$smarty.request.coupon}" data-datalayer-tax="{if !$omit_tax}{"%i"|money_format:$totaltax}{else}0.00{/if}">
		<input type="hidden" name="gatewaypost" value="paystation" />
		{assign var=ototals value="%i"|money_format:$ototals}
		<input type="hidden" name="total" value="{$ototals}">
		<input type="hidden" name="discount" value="{$discount_net}">
		<input type="hidden" name="shipping" value="{$shipping}">
		<input type="hidden" name="shipping_name" value="{$smarty.request.shipping_name|replace:"$":"&dollar;"}">
		<input type="hidden" name="shipping_orig" value="{$shipping_orig}">
		<input type="hidden" name="shipping_tax" value="{$shipping_tax}">
		<input type="hidden" name="coupon" value="{$smarty.request.coupon}">
		<input type="hidden" name="tax" value="{"%i"|money_format:$totaltax}">
		<h2>{$langs.Contact_Details}</h2>
		<div class="styleBox clearfix">
			<div class="input-wrapper input-wrapper-width-25 input-wrapper-type-short" >
				<label class="required_label" for="first_name">{$langs.First_Name}</label>
				<input type="text" id="first_name" maxlength="256" name="first_name" class="input required" />
			</div>
			<div class="input-wrapper input-wrapper-width-25 input-wrapper-type-short" >
				<label class="required_label" for="last_name">{$langs.Last_Name}</label>
				<input type="text" id="last_name" maxlength="256" name="last_name" class="input required" />
			</div>
			<div class="input-wrapper input-wrapper-width-50 input-wrapper-type-short" >
				<label class="required_label" for="email">{$langs.Email}</label>
				<input type="text" id="email" maxlength="256" name="email" class="input required" />
			</div>
			<div class="clear"></div>
			<div class="input-wrapper input-wrapper-width-25 input-wrapper-type-short" >
				<label class="" for="phone">{$langs.Phone}</label>
				<input type="text" id="phone" maxlength="256" name="phone" class="input" />
			</div>
		</div>

		<h2>{$langs.Billing_Address}</h2>
		<div class="styleBox clearfix">
			
			<div class="input-wrapper input-wrapper-width-25 input-wrapper-type-short" >
				<label class="required_label" for="an_street">{$langs.Street}</label>
				<input type="text" id="street" maxlength="256" name="street" class="input required ss_autocomplete_street" />
			</div>
			
			<div class="input-wrapper input-wrapper-width-25 input-wrapper-type-short" >
				<label class="required_label" for="an_city">{$langs.City}</label>
				<input type="text" id="city" maxlength="256" name="city" class="input required ss_autocomplete_city " />
			</div>
			<div class="input-wrapper input-wrapper-width-25 input-wrapper-type-short" >
				<label class="required_label" for="an_state">{$langs.State}</label>
				<input type="text" id="state" maxlength="256" name="state" class="input required ss_autocomplete_state" />
			</div>

			<div class="input-wrapper input-wrapper-width-25 input-wrapper-type-short" >
				<label class="required_label" for="an_zip">{$langs.Zip}</label>
				<input type="text" id="zip" maxlength="256" name="zip" class="input required ss_autocomplete_zip" />
			</div>
						<div class="clear"></div>
			<div class="input-wrapper input-wrapper-width-25 input-wrapper-type-short" >
				<label class="required_label" for="country">{$langs.Country}</label>
				<select name="country" class="required select ss_autocomplete_country" id="country" >

						{include file="includes/countries_three_letter.tpl"}
				</select>
			</div>

		</div>
		<p class="Icon_Alert cf_contains_errors" >* Please fill out all required fields</p>
		
		<p class="button submit_form hide_if_no_js">
			<a href="#" class=''>{$langs.Checkout}</a>
		</p>

		<input type="submit" value="{$langs.Checkout}" class="contact-form-hide-with-js"/>
	</form>
	{/if}
	{* Oxipay *}


	{if ($smarty.post.gateway=="oxipay"||($merchant6_enabled&&!$smarty.post.gateway&&$gateways==1)||($firstgateway==6&&!$smarty.post.gateway)) && !$smarty.post.gatewaypost}
	<form action="" method="post" id="paymentGatewayForm" class="form" data-transid="{$buyerId}" data-datalayer-gateway="oxipay" data-datalayer-total="{$ototals}" data-datalayer-discount="{"%i"|money_format:$discount_net}" data-datalayer-shipping="{$shipping}" data-datalayer-coupon="{$smarty.request.coupon}" data-datalayer-tax="{if !$omit_tax}{"%i"|money_format:$totaltax}{else}0.00{/if}">
		<input type="hidden" name="gatewaypost" value="oxipay" />
		<input type="hidden" name="total" value="{$ototals}">	
		<input type="hidden" name="discount" value="{$discount_net}">
		<input type="hidden" name="shipping" value="{$shipping}">
		<input type="hidden" name="shipping_name" value="{$smarty.request.shipping_name|replace:"$":"&dollar;"}">
		<input type="hidden" name="shipping_orig" value="{$shipping_orig}">
		<input type="hidden" name="shipping_tax" value="{$shipping_tax}">
		<input type="hidden" name="coupon" value="{$smarty.request.coupon}">
		<input type="hidden" name="tax" value="{"%i"|money_format:$totaltax}">
		<h2>{$langs.Contact_Details}</h2>
		<div class="styleBox clearfix">
			<div class="input-wrapper input-wrapper-width-25 input-wrapper-type-short" >
				<label class="required_label" for="first_name">{$langs.First_Name}</label>
				<input type="text" id="first_name" maxlength="256" name="first_name" class="input required" />
			</div>
			<div class="input-wrapper input-wrapper-width-25 input-wrapper-type-short" >
				<label class="required_label" for="last_name">{$langs.Last_Name}</label>
				<input type="text" id="last_name" maxlength="256" name="last_name" class="input required" />
			</div>
			<div class="input-wrapper input-wrapper-width-50 input-wrapper-type-short" >
				<label class="required_label" for="ox_email">{$langs.Email}</label>
				<input type="text" id="ox_email" maxlength="256" name="email" class="input required" />
			</div>
			<div class="clear"></div>
			<div class="input-wrapper input-wrapper-width-25 input-wrapper-type-short" >
				<label class="" for="ox_phone">{$langs.Phone}</label>
				<input type="text" id="ox_phone" maxlength="256" name="phone" class="input" />
			</div>
		</div>

		<h2>{$langs.Address}</h2>
		<div class="styleBox clearfix">
			
			<div class="input-wrapper input-wrapper-width-25 input-wrapper-type-short" >
				<label class="required_label" for="ox_street">{$langs.Street}</label>
				<input type="text" id="ox_street" maxlength="256" name="street" class="input required ss_autocomplete_street" />
			</div>
			<div class="input-wrapper input-wrapper-width-25 input-wrapper-type-short" >
				<label class="required_label" for="ox_street">{$langs.Address_2}</label>
				<input type="text" id="ox_street" maxlength="256" name="street2" class="input required ss_autocomplete_town" />
			</div>
			
			<div class="input-wrapper input-wrapper-width-25 input-wrapper-type-short" >
				<label class="required_label" for="ox_city">{$langs.City}</label>
				<input type="text" id="ox_city" maxlength="256" name="city" class="input required ss_autocomplete_city" />
			</div>
			<div class="input-wrapper input-wrapper-width-25 input-wrapper-type-short" >
				<label class="required_label" for="ox_state">{$langs.State}</label>
				<input type="text" id="ox_state" maxlength="256" name="state" class="input required ss_autocomplete_state" />
			</div>
			<div class="clear"></div>
			<div class="input-wrapper input-wrapper-width-25 input-wrapper-type-short" >
				<label class="required_label" for="ox_zip">{$langs.Zip}</label>
				<input type="text" id="ox_zip" maxlength="256" name="zip" class="input required ss_autocomplete_zip" />
			</div>

			<div class="input-wrapper input-wrapper-width-25 input-wrapper-type-short" >
				<label class="required_label" for="country">{$langs.Country}</label>
				<select name="country" class="required select" id="country" >
						
						{include file="includes/countries_two_letter.tpl"}
				</select>
			</div>

		</div>
		<p class="Icon_Alert cf_contains_errors" >* Please fill out all required fields</p>
		
		<p class="button submit_form hide_if_no_js">
			<a href="#" class=''>{$langs.Checkout}</a>
		</p>

		<input type="submit" value="{$langs.Checkout}" class="contact-form-hide-with-js"/>
	</form>
	{/if}
	

	{* eway *}

	{if ($smarty.post.gateway=="eway"||($merchant4_enabled&&!$smarty.post.gateway&&$gateways==1)||($firstgateway==4&&!$smarty.post.gateway)) && !$smarty.post.gatewaypost}
	<form action="" method="post" id="paymentGatewayForm" class="form" data-transid="{$buyerId}" data-datalayer-gateway="eway" data-datalayer-total="{$ototals}" data-datalayer-discount="{"%i"|money_format:$discount_net}" data-datalayer-shipping="{$shipping}" data-datalayer-coupon="{$smarty.request.coupon}" data-datalayer-tax="{if !$omit_tax}{"%i"|money_format:$totaltax}{else}0.00{/if}">
		<input type="hidden" name="gatewaypost" value="eway" />
		<input type="hidden" name="total" value="{"%i"|money_format:$ototals}">
		<input type="hidden" name="discount" value="{"%i"|money_format:$discount_net}">
		<input type="hidden" name="shipping" value="{"%i"|money_format:$shipping}">
		<input type="hidden" name="shipping_name" value="{$smarty.request.shipping_name|replace:"$":"&dollar;"}">
		<input type="hidden" name="shipping_orig" value="{$shipping_orig}">
		<input type="hidden" name="shipping_tax" value="{$shipping_tax}">
		<input type="hidden" name="coupon" value="{$smarty.request.coupon}">
		<input type="hidden" name="tax" value="{"%i"|money_format:$totaltax}">
		<h2>{$langs.Contact_Details}</h2>
		<div class="styleBox clearfix">
			<div class="input-wrapper input-wrapper-width-25 input-wrapper-type-short" >
				<label class="required_label" for="ew_first_name">{$langs.First_Name}</label>
				<input type="text" id="ew_first_name" maxlength="256" name="first_name" class="input required" />
			</div>
			<div class="input-wrapper input-wrapper-width-25 input-wrapper-type-short" >
				<label class="required_label" for="ew_last_name">{$langs.Last_Name}</label>
				<input type="text" id="ew_last_name" maxlength="256" name="last_name" class="input required" />
			</div>
			<div class="input-wrapper input-wrapper-width-25 input-wrapper-type-short" >
				<label class="required_label" for="ew_email">{$langs.Email}</label>
				<input type="text" id="ew_email" maxlength="256" name="email" class="input required" />
			</div>
			<div class="input-wrapper input-wrapper-width-25 input-wrapper-type-short" >
				<label class="" for="ew_phone">{$langs.Phone}</label>
				<input type="text" id="ew_phone" maxlength="256" name="phone" class="input" />
			</div>
		</div>
		
		
		<h2>{$langs.Address}</h2>
		<div class="styleBox clearfix">

			<div class="input-wrapper input-wrapper-width-50 input-wrapper-type-short" >
				<label class="required_label" for="ew_street">Address</label>
				<input type="text" id="ew_street" maxlength="256" name="street" class="input required ss_autocomplete_street" />
			</div>
			<div class="input-wrapper input-wrapper-width-50 input-wrapper-type-short" >
				<label class="label" for="ew_town">Address 2</label>
				<input type="text" id="ew_town" maxlength="256" name="town" class="input ss_autocomplete_town" />
			</div>
			
			<div class="clear"></div>

			
			<div class="input-wrapper input-wrapper-width-25 input-wrapper-type-short" >
				<label class="required_label" for="ew_city">{$langs.City}</label>
				<input type="text" id="ew_city" maxlength="256" name="city" class="ss_autocomplete_city input required" />
			</div>
			<div class="input-wrapper input-wrapper-width-25 input-wrapper-type-short" >
				<label class="required_label" for="ew_state">{$langs.State}</label>
				<input type="text" id="ew_state" maxlength="256" name="state" class="input required  ss_autocomplete_state" />
			</div>
			
			<div class="input-wrapper input-wrapper-width-25 input-wrapper-type-short" >
				<label class="required_label" for="ew_zip">{$langs.Zip}</label>
				<input type="text" id="ew_zip" maxlength="256" name="zip" class="input required ss_complete_zip" />
			</div>
			<div class="input-wrapper input-wrapper-width-25 input-wrapper-type-short" >
				<label class="required_label" for="country">{$langs.Country}</label>
				<select name="country" class="required select ss_autocomplete_country" id="country" >

					{include file="includes/countries_two_letter.tpl"}
				</select>
			</div>

		</div>
		
		<p class="Icon_Alert cf_contains_errors" >* Please fill out all required fields</p>
		<p class="button submit_form hide_if_no_js">
			<a href="#" class=''>{$langs.Checkout}</a>
		</p>

		<input type="submit" value="{$langs.Checkout}" class="contact-form-hide-with-js"/>
	</form>
	{/if}
	
	{* px *}

	{if ($smarty.post.gateway=="paymentexpress"||($merchant5_enabled&&!$smarty.post.gateway&&$gateways==1)||($firstgateway==5&&!$smarty.post.gateway)) && !$smarty.post.gatewaypost}
	<form action="" method="post" id="paymentGatewayForm" class="form" data-transid="{$buyerId}" data-datalayer-gateway="paymentexpress" data-datalayer-total="{$ototals}" data-datalayer-discount="{"%i"|money_format:$discount_net}" data-datalayer-shipping="{$shipping}" data-datalayer-coupon="{$smarty.request.coupon}" data-datalayer-tax="{if !$omit_tax}{"%i"|money_format:$totaltax}{else}0.00{/if}">
		<input type="hidden" name="gatewaypost" value="paymentexpress" />
		{*{math assign="lessdc" a=$ototals b=$discount equation="a - b"}
		<input type="hidden" name="total" value="{$lessdc}">*}
		<input type="hidden" name="total" value="{$grand}">
		{*<input type="hidden" name="total" value="{$ototals}">*}
		<input type="hidden" name="discount" value="{$discount_net}">
		<input type="hidden" name="shipping" value="{$shipping}">
		<input type="hidden" name="shipping_orig" value="{$shipping_orig}">
		<input type="hidden" name="shipping_name" value="{$smarty.request.shipping_name|replace:"$":"&dollar;"}">
		<input type="hidden" name="shipping_tax" value="{$shipping_tax}">
		<input type="hidden" name="tax" value="{"%i"|money_format:$totaltax}">
		<input type="hidden" name="coupon" value="{$smarty.request.coupon}">
		<h2>{$langs.Contact_Details}</h2>
		<div class="styleBox clearfix">
			<div class="input-wrapper input-wrapper-width-25 input-wrapper-type-short" >
				<label class="required_label" for="px_first_name">{$langs.First_Name}</label>
				<input type="text" id="px_first_name" maxlength="256" name="first_name" class="input required" />
			</div>
			<div class="input-wrapper input-wrapper-width-25 input-wrapper-type-short" >
				<label class="required_label" for="px_last_name">{$langs.Last_Name}</label>
				<input type="text" id="px_last_name" maxlength="256" name="last_name" class="input required" />
			</div>
			<div class="input-wrapper input-wrapper-width-25 input-wrapper-type-short" >
				<label class="required_label" for="px_email">{$langs.Email}</label>
				<input type="text" id="px_email" maxlength="256" name="email" class="input required" />
			</div>
			<div class="input-wrapper input-wrapper-width-25 input-wrapper-type-short" >
				<label class="" for="px_phone">{$langs.Phone}</label>
				<input type="text" id="px_phone" maxlength="256" name="phone" class="input" />
			</div>
		</div>
		
		
		<h2>{$langs.Address}</h2>
		<div class="styleBox clearfix">
		{*
			<div class="input-wrapper input-wrapper-width-50 input-wrapper-type-short" >
				<label class="required_label" for="px_street">{$langs.Street}</label>
				<input type="text" id="px_street" maxlength="256" name="street" class="input required" />
			</div>
			<div class="input-wrapper input-wrapper-width-50 input-wrapper-type-short" >
				<label class="required_label" for="px_town">{$langs.Town}</label>
				<input type="text" id="px_town" maxlength="256" name="town" class="input required" />
			</div>
			
			<div class="clear"></div>

			
			<div class="input-wrapper input-wrapper-width-25 input-wrapper-type-short" >
				<label class="required_label" for="px_city">{$langs.City}</label>
				<input type="text" id="px_city" maxlength="256" name="city" class="input required" />
			</div>
			<div class="input-wrapper input-wrapper-width-25 input-wrapper-type-short" >
				<label class="required_label" for="px_state">{$langs.State}</label>
				<input type="text" id="px_state" maxlength="256" name="state" class="input required" />
			</div>
			
			<div class="input-wrapper input-wrapper-width-25 input-wrapper-type-short" >
				<label class="required_label" for="px_zip">{$langs.Zip}</label>
				<input type="text" id="px_zip" maxlength="256" name="zip" class="input required" />
			</div>
			<div class="input-wrapper input-wrapper-width-25 input-wrapper-type-short" >
				<label class="required_label" for="country">{$langs.Country}</label>
				<select name="country" class="required select" id="country" >
					
						{include file="includes/countries_two_letter.tpl"}
						
				</select>
			</div>
		*}
				<div class="input-wrapper input-wrapper-width-50 input-wrapper-type-short" >
					<label for="px_street" class="required_label">Address</label>
					<input type="text" maxlength="256" name="street" class="input required ss_autocomplete_street" id="px_street"/>
				</div>
				<div class="input-wrapper input-wrapper-width-50 input-wrapper-type-short" >
					<label data-orig="{$langs.Town}" data-nzl="{$langs.Suburb}" class="country-switch required_label" for="px_town">{$langs.Town}</label>
					<input type="text" maxlength="256" name="town" class="input required ss_autocomplete_town" id="px_town"/>
				</div>
				
				<div class="clear"></div>

				
				<div class="input-wrapper input-wrapper-width-25 input-wrapper-type-short" >
					<label class="required_label" for="px_city">{$langs.City}</label>
					<input type="text" maxlength="256" name="city" class="input required ss_autocomplete_city" id="px_city"/>
				</div>
				<div class="input-wrapper input-wrapper-width-25 input-wrapper-type-short" >
					<label data-orig="{$langs.State}" data-gbr="{$langs.County}" class="country-switch required_label unhide-country-switch hide-if-nzl" for="px_state">{$langs.State}</label>
					<input type="text" maxlength="256" name="state" class="input required unhide-country-switch ss_autocomplete_state hide-if-nzl" id="px_state"/>
				</div>

				<div class="input-wrapper input-wrapper-width-25 input-wrapper-type-short" >
					<label data-orig="{$langs.Zip}" data-nzl="{$langs.Postal_Code}" data-gbr="{$langs.Postal_Code}" class="country-switch required_label" for="px_zip">{$langs.Zip}</label>
					<input type="text" maxlength="256" name="zip" class="input required ss_autocomplete_zip" id="px_zip"/>
				</div>
				<div class="input-wrapper input-wrapper-width-25 input-wrapper-type-short" >
					<label class="required_label" for="country">{$langs.Country}</label>
					<select name="country" class="required select ss_autocomplete_country" id="country" >
							
							{include file="includes/countries_three_letter.tpl"}
					</select>
				</div>
		</div>
		
		<p class="Icon_Alert cf_contains_errors" >* Please fill out all required fields</p>
		<p class="button submit_form hide_if_no_js">
			<a href="#" class=''>{$langs.Checkout}</a>
		</p>

		<input type="submit" value="{$langs.Checkout}" class="contact-form-hide-with-js"/>
	</form>
	{/if}
	
	
	
	{* swish *}
{*
	{if ($smarty.post.gateway=="swish"||($merchant7_enabled&&!$smarty.post.gateway&&$gateways==1)||($firstgateway==7&&!$smarty.post.gateway)) && !$smarty.post.gatewaypost}
	<form action="" method="post" id="paymentGatewayForm" class="form" data-transid="{$buyerId}" data-datalayer-gateway="swish" data-datalayer-total="{$ototals}" data-datalayer-discount="{"%i"|money_format:$discount_net}" data-datalayer-shipping="{$shipping}" data-datalayer-coupon="{$smarty.request.coupon}" data-datalayer-tax="{if !$omit_tax}{"%i"|money_format:$totaltax}{else}0.00{/if}">
		<input type="hidden" name="gatewaypost" value="swish" />
		<input type="hidden" name="total" value="{$ototals}">	
		<input type="hidden" name="discount" value="{$discount_net}">
		<input type="hidden" name="shipping" value="{$shipping}">
		<input type="hidden" name="shipping_name" value="{$smarty.request.shipping_name|replace:"$":"&dollar;"}">
		<input type="hidden" name="shipping_orig" value="{$shipping_orig}">
		<input type="hidden" name="shipping_tax" value="{$shipping_tax}">
		<input type="hidden" name="coupon" value="{$smarty.request.coupon}">
		<input type="hidden" name="tax" value="{"%i"|money_format:$totaltax}">

		<h2>{$langs.Contact_Details}</h2>
		<div class="styleBox clearfix">
			<div class="input-wrapper input-wrapper-width-25 input-wrapper-type-short" >
				<label class="required_label" for="sw_first_name">{$langs.First_Name}</label>
				<input type="text" id="sw_first_name" maxlength="256" name="first_name" class="input required" />
			</div>
			<div class="input-wrapper input-wrapper-width-25 input-wrapper-type-short" >
				<label class="" for="sw_last_name">{$langs.Last_Name}</label>
				<input type="text" id="sw_last_name" maxlength="256" name="last_name" class="input" />
			</div>
			<div class="input-wrapper input-wrapper-width-25 input-wrapper-type-short" >
				<label class="" for="sw_cell">{$langs.Cell}</label>
				<input type="text" id="sw_cell" maxlength="256" name="cell" class="input" />
			</div>
			<div class="clear"></div>

			<div class="input-wrapper input-wrapper-width-50 input-wrapper-type-short" >
				<label class="required" for="sw_email">{$langs.Email}</label>
				<input type="text" id="sw_email" maxlength="256" name="email" class="input required" />
			</div>
			
		</div>

		<h2>{$langs.Address}</h2>
		<div class="styleBox clearfix">
			
			<div class="input-wrapper input-wrapper-width-50 input-wrapper-type-short" >
				<label class="required_label" for="sw_street">{$langs.Street}</label>
				<input type="text" id="sw_" maxlength="256" name="street" class="input required" />
			</div>
			<div class="input-wrapper input-wrapper-width-50 input-wrapper-type-short" >
				<label class="required_label" for="sw_town">{$langs.Town}</label>
				<input type="text" id="sw_" maxlength="256" name="town" class="input required" />
			</div>
			
			<div class="clear"></div>

			
			<div class="input-wrapper input-wrapper-width-25 input-wrapper-type-short" >
				<label class="required_label" for="sw_city">{$langs.City}</label>
				<input type="text" id="sw_" maxlength="256" name="city" class="input required" />
			</div>
			<div class="input-wrapper input-wrapper-width-25 input-wrapper-type-short" >
				<label class="required_label" for="sw_state">{$langs.State}</label>
				<input type="text" id="sw_" maxlength="256" name="state" class="input required" />
			</div>
			
			<div class="input-wrapper input-wrapper-width-25 input-wrapper-type-short" >
				<label class="required_label" for="sw_zip">{$langs.Zip}</label>
				<input type="text" id="sw_" maxlength="256" name="zip" class="input required" />
			</div>
			<div class="input-wrapper input-wrapper-width-25 input-wrapper-type-short" >
				<label class="required_label" for="country">{$langs.Country}</label>
				<select name="country" class="required select" id="country" >
						
						{include file="includes/countries_three_letter.tpl"}
				</select>
			</div>
			
		</div>
		<p class="Icon_Alert cf_contains_errors" >* Please fill out all required fields</p>
		<p class="button submit_form hide_if_no_js" >
			<a href="#" class=''>{$langs.Checkout}</a>
		</p>

		<input type="submit" value="{$langs.Checkout}" class="contact-form-hide-with-js"/>
	</form>
	{/if}
	
	*}
	
	
	
	
	{* Later *}

	{if ($smarty.post.gateway=="paylater"||($merchant3_enabled&&!$smarty.post.gateway&&$gateways==1)||($firstgateway==3&&!$smarty.post.gateway)) && !$smarty.post.gatewaypost}
	<form action="" method="post" id="paymentGatewayForm" class="form-legacy form" data-transid="{$buyerId}" data-datalayer-gateway="paylater" data-datalayer-total="{$ototals}" data-datalayer-discount="{"%i"|money_format:$discount_net}" data-datalayer-shipping="{$shipping}" data-datalayer-coupon="{$smarty.request.coupon}" data-datalayer-tax="{if !$omit_tax}{"%i"|money_format:$totaltax}{else}0.00{/if}">
		<input type="hidden" name="gatewaypost" value="paylater" />
		<input type="hidden" name="total" value="{$ototals}">	
		<input type="hidden" name="discount" value="{$discount_net}">
		<input type="hidden" name="shipping" value="{$shipping}">
		<input type="hidden" name="shipping_name" value="{$smarty.request.shipping_name|replace:"$":"&dollar;"}">
		<input type="hidden" name="shipping_orig" value="{$shipping_orig}">
		<input type="hidden" name="shipping_tax" value="{$shipping_tax}">
		<input type="hidden" name="coupon" value="{$smarty.request.coupon}">
		<input type="hidden" name="tax" value="{"%i"|money_format:$totaltax}">
		<div class="paylater-gateway paylater-gateway-contact">
		<h2>{$langs.Contact_Details}</h2>
			<div class="styleBox clearfix">
				<div class="input-wrapper input-wrapper-width-25 input-wrapper-type-short" >
					<label class="required_label">{$langs.First_Name}</label>
					<input type="text" maxlength="256" name="admin_order_first_name" class="input required" />
				</div>
				<div class="input-wrapper input-wrapper-width-25 input-wrapper-type-short" >
					<label class="required_label">{$langs.Last_Name}</label>
					<input type="text" maxlength="256" name="admin_order_last_name" class="input required" />
				</div>

				<div class="input-wrapper input-wrapper-width-25 input-wrapper-type-short" >
					<label class="required_label">{$langs.Email}</label>
					<input type="text" maxlength="256" name="admin_order_email" class="input required" />
				</div>
				<div class="input-wrapper input-wrapper-width-25 input-wrapper-type-short" >
					<label class="">{$langs.Phone}</label>
					<input type="text" maxlength="256" name="admin_order_phone" class="input" />
				</div>
			</div>
		</div>
		<div class="paylater-gateway paylater-gateway-address">
			<h2>{$langs.Address}</h2>
			<div class="styleBox clearfix">
				
				<div class="input-wrapper input-wrapper-width-50 input-wrapper-type-short" >
					<label class="required_label">Address</label>
					<input type="text" maxlength="256" name="admin_order_street" class="input required ss_autocomplete_street" />
				</div>
				<div class="input-wrapper input-wrapper-width-50 input-wrapper-type-short" >
					<label data-orig="{$langs.Town}" data-nzl="{$langs.Suburb}" class="country-switch required_label">{$langs.Town}</label>
					<input type="text" maxlength="256" name="admin_order_town" class="input required ss_autocomplete_town" />
				</div>
				
				<div class="clear"></div>

				
				<div class="input-wrapper input-wrapper-width-25 input-wrapper-type-short" >
					<label class="required_label">{$langs.City}</label>
					<input type="text" maxlength="256" name="admin_order_city" class="input required ss_autocomplete_city" />
				</div>
				<div class="input-wrapper input-wrapper-width-25 input-wrapper-type-short" >
					<label data-orig="{$langs.State}" data-gbr="{$langs.County}" class="country-switch required_label unhide-country-switch hide-if-nzl">{$langs.State}</label>
					<input type="text" maxlength="256" name="admin_order_state" class="input required unhide-country-switch ss_autocomplete_state hide-if-nzl" />
				</div>

				<div class="input-wrapper input-wrapper-width-25 input-wrapper-type-short" >
					<label data-orig="{$langs.Zip}" data-nzl="{$langs.Postal_Code}" data-gbr="{$langs.Postal_Code}" class="country-switch required_label">{$langs.Zip}</label>
					<input type="text" maxlength="256" name="admin_order_zip" class="input required ss_autocomplete_zip" />
				</div>
				<div class="input-wrapper input-wrapper-width-25 input-wrapper-type-short" >
					<label class="required_label" for="country">{$langs.Country}</label>
					<select name="admin_order_country" class="required select ss_autocomplete_country" id="country" >
							
							{include file="includes/countries_three_letter.tpl"}
					</select>
				</div>
				
			</div>
		</div>
		
		<p class="Icon_Alert cf_contains_errors" >* Please fill out all required fields</p>
		<p style="text-align:right" class="button submit_form hide_if_no_js">
			<a href="#" class=''>{$langs.Send_order}</a>
		</p>

		<input type="submit" value="{$langs.Send_order}" class="contact-form-hide-with-js"/>
	</form>
	{/if} 

	{* Ngan Luong *}
		{*
		{if $found}
		{assign var=dc value=$ototals-$totals}
		{assign var=discount value="%i"|money_format:$dc}
		{else}
		{assign var=discount value=0}
		{/if}
		{if $shipping}
			{assign var=shipping value=$shipping}	
		{else}
			{assign var=shipping value=0}	
		{/if}
	<form method='post' action="?ngan_luong_pay=1" id="paymentGatewayForm">
		<input type="hidden" name="total" value="{$totals}">	
		<input type="hidden" name="discount" value="{$discount}">
		<input type="hidden" name="shipping" value="{$shipping}">
		<label for="your_name">Your Name</label><input type="text" name="name" value="" id="your_name">
		<label for="your_email">Your email</label><input type="text" name="email" value="" id="your_email">
		<label for="your_phone">Your phone</label><input type="text" name="phone" value="" id="your_phone">
		<input type="submit" value="Checkout">

	</form>
	*}
	
{/if}
