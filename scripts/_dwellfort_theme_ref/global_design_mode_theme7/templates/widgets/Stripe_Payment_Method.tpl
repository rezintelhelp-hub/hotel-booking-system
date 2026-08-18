{* @@@
{
	"widget_info":{
		"title":"Stripe Payment Method"
		,"category":"setup"
		,"head_append":"<script src=\"https://js.stripe.com/v3/\"></script> "
	},
        "meta_data":[{
                "name":"No payment method text"
                ,"type": "text"
                ,"var": "need_payment_method"
                ,"default":"Please add your payment method"
        },{
                "name":"Has payment method text"
                ,"type": "text"
                ,"var": "has_payment_method"
                ,"default":"You currently have a payment method set up."
        },{
                "name":"Require address"
                ,"type": "tick"
                ,"info": "If you use Stripe Automatic Tax this option should be enabled."
                ,"var": "reqaddress"
                ,"default":"0"
        }],
        "inner_templates":{
        }
}
@@@ *}
<script type="text/javascript">
	{literal}
	var style = {
	  base: {
	    color: '#32325d',
	    fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
	    fontSmoothing: 'antialiased',
	    fontSize: '16px',
	    '::placeholder': {
	      color: '#aab7c4'
	    }
	  },
	  invalid: {
	    color: '#fa755a',
	    iconColor: '#fa755a'
	  }
	};
	{/literal}
</script>
<div id="stripe_payment_method" class="styleBox">
{if $content.logged_in_user.id!=""}
	{assign var="existing_stripe_customer" value=""}
	{foreach from=$content.logged_in_user.custom_with_names item="custom"}
		{if $custom.name=="Stripe Customer ID" &&  $custom.value!=""}
			{assign var="existing_stripe_customer" value=$custom.value}
		{/if}
	{/foreach}
	{if $smarty.request.charge}



		{get_user_child_data
			userid=$content.logged_in_user.id 
			type="payment_method"
		}
		{foreach from=$user_child_data item=value key=key name=loop1}
		{delete_user_child_data id=$key userid=$content.logged_in_user.id}
		{/foreach}

		{add_user_child_data 
			show_in_activity=0
			userid=$content.logged_in_user.id 
			more_data_payment_method=$smarty.request.payment_method
			type="payment_method"
		}
		


		{if $existing_stripe_customer!=""}

			{stripe api_secret=$theme_vars_stripe_key_secret action="update_payment" customer_id=$existing_stripe_customer payment_method=$smarty.request.payment_method
			city=$smarty.request.city
			country=$smarty.request.country
			line1=$smarty.request.line1
			line2=$smarty.request.line2
			state=$smarty.request.state
			postal_code=$smarty.request.postal_code
			}
		{else}
			{stripe api_secret=$theme_vars_stripe_key_secret action="create_user" email=$content.logged_in_user.email id=$content.logged_in_user.id payment_method=$smarty.request.payment_method
			city=$smarty.request.city
			country=$smarty.request.country
			line1=$smarty.request.line1
			line2=$smarty.request.line2
			state=$smarty.request.state
			postal_code=$smarty.request.postal_code
			}

			{add_user_custom_fields userid=$content.logged_in_user.id name="Stripe Customer ID" value=$stripe_user_id}

		{/if}

		<p class="Icon_Tick">Thanks. Your payment method has been created. This page will now reload.</p>
		{literal}
		<script type="text/javascript">
			$(document).ready(function(){
			window.location.href=window.location.href.replace("&replace=1","");
			});
		</script>
		{/literal}
	{else}


		{get_user_child_data
			userid=$content.logged_in_user.id 
			type="payment_method"
		}
		{foreach from=$user_child_data item=value key=key name=loop1}
		{if $user_child_data.$key.payment_method}{assign var=paymenttoken value=$user_child_data.$key.payment_method}{/if}
		{/foreach}
		{if !$paymenttoken || $smarty.get.replace}


		{stripe api_secret=$theme_vars_stripe_key_secret action="setup_intent" customer=$existing_stripe_customer}

		
		{get_user_child_data
			userid=$content.logged_in_user.id 
			type="stripe_subscription_setup_intent"
		}
		{foreach from=$user_child_data item=value key=key name=loop1}
		{delete_user_child_data id=$key userid=$content.logged_in_user.id}
		{/foreach}
		
		{add_user_child_data 
			show_in_activity=0
			userid=$content.logged_in_user.id 
			more_data_setup_intent=$setup_intent
			type="stripe_subscription_setup_intent"
		}
		
		<p>{$metadata.need_payment_method}</p>
		<form action="" method="post" id="payment-form" class="form-legacy">
			<input type="hidden" name='charge' value="1"/>
		  <div class="form-row">
		<label>Cardholder name</label>
		<input id="cardholder-name" type="text">
		    <label for="card-element">
		      Credit or debit card
		    </label>
		    <div id="card-element">
		      <!-- A Stripe Element will be inserted here. -->
		    </div>

		    <!-- Used to display Element errors. -->
		    <div class="Icon_Alert" id="card-errors" role="alert" style="display:none"></div>
		  </div>
		  {if $metadata.reqaddress}
		<label>{$langs.Billing_Address}</label>

				<div class="input-wrapper input-wrapper-width-50 input-wrapper-type-short" >
					<label for="px_street" class="required_label">Address</label>
					<input type="text" maxlength="256" name="line1" class="input required ss_autocomplete_street" id="px_street"/>
				</div>
				<div class="input-wrapper input-wrapper-width-50 input-wrapper-type-short" >
					<label data-orig="{$langs.Town}" data-nz="{$langs.Suburb}" class="country-switch required_label" for="px_town">{$langs.Town}</label>
					<input type="text" maxlength="256" name="line2" class="input required ss_autocomplete_town" id="px_town"/>
				</div>
				
				<div class="clear"></div>

				
				<div class="input-wrapper input-wrapper-width-25 input-wrapper-type-short" >
					<label class="required_label" for="px_city">{$langs.City}</label>
					<input type="text" maxlength="256" name="city" class="input required ss_autocomplete_city" id="px_city"/>
				</div>
				<div class="input-wrapper input-wrapper-width-25 input-wrapper-type-short" >
					<label data-orig="{$langs.State}" data-gb="{$langs.County}" class="country-switch required_label unhide-country-switch hide-if-nz" for="px_state">{$langs.State}</label>
					<input type="text" maxlength="256" name="state" class="input required unhide-country-switch ss_autocomplete_state hide-if-nz" id="px_state"/>
				</div>

				<div class="input-wrapper input-wrapper-width-25 input-wrapper-type-short" >
					<label data-orig="{$langs.Zip}" data-nz="{$langs.Postal_Code}" data-gb="{$langs.Postal_Code}" class="country-switch required_label" for="px_zip">{$langs.Zip}</label>
					<input type="text" maxlength="256" name="postal_code" class="input required ss_autocomplete_zip" id="px_zip"/>
				</div>
				<div class="input-wrapper input-wrapper-width-25 input-wrapper-type-short" >
					<label class="required_label" for="country">{$langs.Country}</label>
					<select name="country" class="required select ss_autocomplete_country" id="country" >

							{include file="includes/countries_two_letter.tpl"}
					</select>
				</div>
			<div class="clear"></div>

		{/if}


		<p class="Icon_Alert cf_contains_errors" >* Please fill out all required fields</p>
		  <button id="card-button" data-secret="{$setup_intent}">Save Payment Method</button>
		</form>
	{if $theme_vars_stripe_key_secret!=""}{literal}
		<script type="text/javascript">if (typeof window.stripe == "undefined") {window.stripe = Stripe("{/literal}{$theme_vars_stripe_key_publishable}{literal}"); var elements = stripe.elements();} </script>
		{/literal}
	{/if}
	<script type="text/javascript">
	{literal}

	// Create an instance of the card Element.
	var card = elements.create('card', {style: style});

	// Add an instance of the card Element into the `card-element` <div>.
	card.mount('#card-element');

	// Handle real-time validation errors from the card Element.
	card.addEventListener('change', function(event) {
	  var displayError = document.getElementById('card-errors');
	  if (event.error) {
	    displayError.textContent = event.error.message;
	  } else {
	    displayError.textContent = '';
	  }
	});

	var cardholderName = document.getElementById('cardholder-name');
var cardButton = document.getElementById('card-button');
var clientSecret = cardButton.dataset.secret;
$('#payment-form').on('submit',function(){
return false;
});
cardButton.addEventListener('click', function(ev) {

	if ($("textarea.required,select.required,input.required[type!='checkbox'], .required[type='checkbox']:not(:checked)",$("#payment-form")).filter(function() {
			if ($(this).val()=='') {
			return true;
			} 

		 }).length > 0) {
			$("textarea.required,select.required,input.required[type!='checkbox'], .required[type='checkbox']:not(:checked)",$("#payment-form")).filter(function() {
				if ($(this).val()=='') {
				return true;
				} 
			 }).addClass('cf_error').first().each(function(){
				$(this).focus();
			});
			
			$(".submit_form",$("#payment-form")).show();
			$(".cf_contains_errors",$("#payment-form")).slideDown(300,function(){
				if (typeof moduleHeights == 'function') {
					magicHeights();
					moduleHeights();
				}
			});
			 return false;
	}
	if ($(ev.target).hasClass('done') ) {
	return false;
	}
	$(ev.target).addClass('done').fadeTo(200,0.5);
  stripe.confirmCardSetup(
    clientSecret,
    {
      payment_method: {
        card: card,
        billing_details: {name: cardholderName.value}
      }
    }
  ).then(function(result) {
    if (result.error) {
      // Display error.message in your UI.
	alert(result.error.message);
	$(cardButton).removeClass('done').fadeTo(200,1);
	$('#payment-form').on('submit',function(){
		return false;
	});
    } else {
	$('#payment-form').append('<input type="hidden" name="payment_method" value="'+result.setupIntent.payment_method+'"/>');
	$('#payment-form').unbind().submit();
      // The setup has succeeded. Display a success message.
    }
  });
});
	{/literal}
	</script>
		{else}
			<p class="Icon_Tick">{$metadata.has_payment_method}</p>
			<p class="payment-method-button"><a href="?nocache=1&replace=1">Edit/replace card</a></p>
		{/if}
		{if $smarty.get.replace}
		<p class="payment-method-button"><a href="?nocache=1">Cancel and keep existing payment method</a></p>
		{/if}
	{/if}
{else}
	<p>Please ensure you are logged in to add a payment method.</p>
{/if}
</div>


