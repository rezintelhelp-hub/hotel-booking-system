{* @@@
{
	"widget_info":{
		"title":"Stripe Subscription Product"
		,"title_info":"Enter a name for this subscription product. This is used for your reference only. You can confirm the customer-facing product in the widget properties once you've added it to your page."
		,"category":"products"
		,"show_in_search":"true"
	},
	"meta_data":[{
			"name":"Product name"
			,"type": "text"
	        ,"info":"Enter a name for your product."
			,"var": "stripe_name"
	        ,"default":""
		},{
			"name":"Subscription interval"
			,"type": "dropdown"
			,"var": "interval"
			,"default":"month"
			,"options":[
				{
					"label":"Day"
					,"value":"day"
				},
				{
					"label":"Month"
					,"value":"month"
				},
				{
					"label":"Week"
					,"value":"week"
				},
				{
					"label":"Year"
					,"value":"year"
				}
			]
		},{
			"name":"Interval count"
			,"type": "text"
			,"info":"If you want to charge on certain frequencies of the interval, enter a different number in here. For example, enter '2' and choose 'week' in 'Subscription interval' to charge every other week. Yearly intervals can only be set to 1."
			,"var": "count"
			,"default":"1"
		},{
			"name":"Start date"
			,"type": "text"
			,"info":"Start date for the first full subscription charge. Leave empty to start as soon as the customer subscribes. If you enter a future date, you can choose to enable a prorated charge when the customer first signs up using the option below. Use MM-DD as the format for date entry for 'Year' intervals and DD for 'Month' intervals. 'Week' and 'Day' intervals are not supported for future start dates. Note: Changing this setting only affects new subscribers - existing subscribers are not updated. To change billing dates for existing subscriptions, you must do this manually in the Stripe dashboard."
			,"var": "start_date"
			,"default":""
		},{
			"name":"Enable prorated pricing"
			,"type": "tick"
			,"var": "prorated"
			,"default":"1"
			,"info": "When enabled and start date is set, user will pay a prorated amount as soon as they subscribe to cover the period until the start date. This option is also used to control behaviour when the price is changed for current subscribers when the ‘Everyone uses latest price’ option below is enabled."
		},{
			"name":"Everyone uses latest price"
			,"type": "tick"
			,"var": "updateprices"
			,"default":"0"
			,"info": "When this option is enabled and the price is changed, all existing subscribers will be moved onto the new price. "
		},{
			"name":"Prorated explanation text"
			,"type": "text"
			,"info":"This text is shown with the 'Subscribe' button to explain that the customer will be immediately charged for the prorated amount. Only shown when 'Enable prorated first charge' is enabled along with the 'Start date' being set with a monthly or yearly 'Subscription interval'"
			,"var": "prorated_explanation"
			,"default":"a prorated amount"
		},{
			"name":"No payment method warning"
			,"type": "text"
			,"info":"This text is shown to users who haven't added a payment method yet. Change if requried."
			,"var": "no_payment_method_warning"
			,"default":"You haven't added a payment method yet. Please add one to subscribe to this product."
		},{
			"name":"Price"
			,"type": "text"
			,"info":"Enter the charge for each interval payment. This must be in the lowest currency unit. i.e for $9.99 you'd enter 999 in this field. Must be a whole number without currency symbol. Important: if you enable ‘Everyone uses latest price’ above and you make a change to the price, all existing subscribers will be changed to the new price. You will need to make sure you give subscribers sufficient notice for such changes according to applicable laws and policies."
			,"var": "price"
			,"default":"0"
		},{
			"name":"Use Stripe Automatatic Tax"
			,"type": "tick"
			,"var": "autotax"
			,"default":"0"
			,"info": "Use Automatic Tax settings from your Stripe account. Make sure the price added for this product is excluding tax and 'Settings > Tax > Include tax in prices' in your Stripe account is set to No."
		},{
			"name":"Tax price append"
			,"type": "text"
			,"info":"Enter text to show after the price to indicate tax, e.g., '+ GST'"
			,"var": "taxappend"
			,"default":""
		},{
			"name":"Setup fee"
			,"type": "text"
			,"info":"Enter an optional setup fee to be charge when a subscription is first subscribed to."
			,"var": "setupfee"
			,"default":"0"
		},{
			"name":"Setup fee description"
			,"type": "text"
			,"info":"Enter text to describe the initial setup fee"
			,"var": "setupfeedesc"
			,"default":"one-time setup fee"
		},{
			"name":"Customer reminder email"
			,"type": "choose_email"
			,"info":"Choose an email template to use for an email that will be sent 7 days before the subscription is set to renew."
			,"var": "reminder_email"
			,"default":""
		},{
			"name":"Customer welcome email"
			,"type": "choose_email"
			,"info":"Choose an email template to use for an email that will be sent as soon as the user subscribes to a product."
			,"var": "subscribe_email"
			,"default":""
		},{
			"name":"Customer cancel email"
			,"type": "choose_email"
			,"info":"Choose an email template to use for an email that will be sent as soon as the user stops their subsciption to a product."
			,"var": "stop_email"
			,"default":""
		},{
			"name":"Admin notification"
			,"type": "text"
			,"info":"Enter one or more emails (separated by commas) to be notified when new new subscriptions are created or cancelled."
			,"var": "notify_email"
			,"default":""
		},{
			"name":"Dormant mode"
			,"type": "tick"
			,"var": "dormant"
			,"default":"0"
			,"info": "When enabled, no new signups will be allowed. Existing subscribers will be unaffected and will still see their subscription details and cancel options."
		}


	],
	"inner_templates":{
	},
	"user_child_data_labels":{
		"stripe_subscription":{
			"sub_end":{"type":"text","label":"Expires"},
			"sub_id":{"type":"text","label":"Stripe subscription ID"}
			,"plan_id":{"type":"text","label":"Plan ID"}
			,"sub_id":{"type":"text","label":"ID"}
			,"sub_end":{"type":"text","label":"End"}
			,"sub_name":{"type":"text","label":"Name"}
			,"instance_id":{"type":"text","label":"Instance ID"}
			,"scheduled_campaign":{"type":"hidden","label":"Scheduled Campaign"}
			,"status":{"type":"text","label":"Status"}
		}
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
{capture name="feedback"}{/capture}
{assign var=planchanged value=false}
{assign var=assigned value=false}
<div class="subscription-product styleBox clearfix">
	{if $metadata.stripe_name=="" || $metadata.price=="0"}
		<p class="Icon_Alert">Product is currently missing some required properties.</p>
	{/if}

	{if $metadata.instance_id_check && $metadata.instance_id_check != $metadata.instance_id}
		{* item has been duplicated *} 
		{assign var=planchanged value=true}
		{add_widget_meta name=instance_id_check value=$metadata.instance_id instance_id=$metadata.instance_id}
		{if $metadata.stripe_name!="" && $metadata.price!="0"}
			{* If not product added, create it *}

			{stripe api_secret=$theme_vars_stripe_key_secret action="create_subscription_product" name=$metadata.stripe_name}
			{flush_cache}
		{/if}
	{else}

		{if !$metadata.stripe_prod_id && $metadata.stripe_name!="" && $metadata.price!="0"}
			{* If not product added, create it *}

			{stripe api_secret=$theme_vars_stripe_key_secret action="create_subscription_product" name=$metadata.stripe_name}
			{flush_cache}
		{/if}
		{if $metadata.stripe_prod_id!=""}
			{assign var=stripe_product_id value=$metadata.stripe_prod_id}
		{/if}
		{if $metadata.stripe_name != $metadata.stripe_active_prod_name && $metadata.stripe_prod_id!=""}

			{stripe api_secret=$theme_vars_stripe_key_secret action="rename_subscription_product" plan_id=$stripe_product_id name=$metadata.stripe_name}
			{add_widget_meta name=stripe_active_prod_name value=$metadata.stripe_name instance_id=$metadata.instance_id}
		{/if}

		{if ($metadata.price != $metadata.stripe_active_prod_price
			|| $metadata.count != $metadata.stripe_active_prod_count
			|| $metadata.interval != $metadata.stripe_active_prod_interval)
			&& $metadata.stripe_plan_id!=""
		}
			{add_widget_meta name=legacy_prices value="`$metadata.legacy_prices`|`$metadata.stripe_plan_id`" instance_id=$metadata.instance_id}
			{* edit: we are no longer deleting old plans, they stay there for anyone still on them. *}
			{*{stripe api_secret=$theme_vars_stripe_key_secret action="delete_subscription_plan" plan_id=$metadata.stripe_plan_id}*}
			{assign var=planchanged value=true}

		{/if}
	{/if}
	{if (!$metadata.stripe_plan_id||$planchanged) && $metadata.stripe_name!="" && $metadata.price!="0"} 
		{* If no plan or plan changed*}
		{if $metadata.interval =="year"}
		{assign var=count value=1}
		{else}
		{assign var=count value=$metadata.count}
		{/if}
		{stripe api_secret=$theme_vars_stripe_key_secret action="create_subscription_plan"
		name=$metadata.stripe_name
		price=$metadata.price|intval 
		interval=$metadata.interval 
		count=$count 
		currency=$content.currency_code|strtolower 
		product_id=$stripe_product_id}
		{if $metadata.updateprices&&$metadata.stripe_plan_id!=""}
			{stripe api_secret=$theme_vars_stripe_key_secret action="change_price_for_subcribers"
				old_price=$metadata.stripe_plan_id
				new_price=$stripe_plan_id
				proration=$metadata.prorated
			}
			{assign var="legacy_prices" value="|"|explode:$metadata.legacy_prices}
			{foreach from=$legacy_prices item=legacy key=key name=loop1}
			{if $legacy!=""}
			{stripe api_secret=$theme_vars_stripe_key_secret action="change_price_for_subcribers"
				old_price=$legacy
				new_price=$stripe_plan_id
				proration=$metadata.prorated
				}
			{/if}
			{/foreach}
		{/if}

		{add_widget_meta name=stripe_prod_id value=$stripe_product_id instance_id=$metadata.instance_id}
		{add_widget_meta name=stripe_plan_id value=$stripe_plan_id instance_id=$metadata.instance_id}

		{add_widget_meta name=instance_id_check value=$metadata.instance_id instance_id=$metadata.instance_id}

		{add_widget_meta name=stripe_active_prod_price value=$metadata.price instance_id=$metadata.instance_id}
		{add_widget_meta name=stripe_active_prod_interval value=$metadata.interval instance_id=$metadata.instance_id}
		{add_widget_meta name=stripe_active_prod_count value=$count instance_id=$metadata.instance_id}
		{add_widget_meta name=count value=$count instance_id=$metadata.instance_id}
		{flush_cache}
		<p class="Icon_Alert">Product configured within Stripe. Page will now reload. </p>
		<script type="text/javascript">window.location.reload();</script>

	{/if}

	{if $metadata.stripe_plan_id && $metadata.stripe_prod_id}

		<p class="subscription-product-title"><strong>{$metadata.stripe_name}</strong></p>
		{assign var=sub_id value=""}

		<div class="subscription-product-price-button">
			<span class="subscription-product-price">
			{if $metadata.start_date=="" && ($metadata.setupfee==0 || $metadata.setupfee=="") }
			{* start now without setup fee *} 
			You will pay {$content.currency_sym}{$metadata.price/100} {$metadata.taxappend} {if $metadata.count>1}every {$metadata.count} {$metadata.interval}s{else} each {$metadata.interval}{/if} with your first payment due straight away.
			{/if}
			{if $metadata.start_date!="" && ($metadata.setupfee==0 || $metadata.setupfee=="") && $metadata.prorated==1}
			{* deferred start date without setup fee with prorated *} 
			You will pay {$metadata.prorated_explanation} now then {$content.currency_sym}{$metadata.price/100} {$metadata.taxappend} {if $metadata.count>1}every {$metadata.count} {$metadata.interval}s{else} each {$metadata.interval}{/if} starting {if $metadata.interval=="month"} on the {""|date_format:"jS":"2000-01-`$metadata.start_date`"}{else} on the {""|date_format:"jS F":"2000-`$metadata.start_date`"}{/if}.
			{/if}
			{if $metadata.start_date!="" && ($metadata.setupfee==0 || $metadata.setupfee=="") && $metadata.prorated==0}
			{* deferred start date without setup fee but no prorated *} 
			You will pay {$content.currency_sym}{$metadata.price/100} {$metadata.taxappend} {if $metadata.count>1}every {$metadata.count} {$metadata.interval}s{else} each {$metadata.interval}{/if} with your first payment starting {if $metadata.interval=="month"} on the {""|date_format:"jS":"2000-01-`$metadata.start_date`"}{else} on the {""|date_format:"jS F":"2000-`$metadata.start_date`"}{/if}.
			{/if}
			{if $metadata.start_date!="" && $metadata.setupfee!=0 && $metadata.setupfee!="" && $metadata.prorated==0}
			{* deferred start date with setup fee but no prorated *} 

			You will pay a {$content.currency_sym}{$metadata.setupfee/100} {$metadata.setupfeedesc} now then {$content.currency_sym}{$metadata.price/100} {$metadata.taxappend} {if $metadata.count>1}every {$metadata.count} {$metadata.interval}s{else} each {$metadata.interval}{/if} starting {if $metadata.interval=="month"} on the {""|date_format:"jS":"2000-01-`$metadata.start_date`"}{else} on the {""|date_format:"jS F":"2000-`$metadata.start_date`"}{/if}.

			{/if}
			{if $metadata.start_date!="" && $metadata.setupfee!=0 && $metadata.setupfee!="" && $metadata.prorated==1}
			{* deferred start date with setup fee and prorated *} 
			You will pay {$metadata.prorated_explanation} and a {$content.currency_sym}{$metadata.setupfee/100} {$metadata.setupfeedesc} now then {$content.currency_sym}{$metadata.price/100} {$metadata.taxappend} {if $metadata.count>1}every {$metadata.count} {$metadata.interval}s{else} each {$metadata.interval}{/if} starting {if $metadata.interval=="month"} on the {""|date_format:"jS":"2000-01-`$metadata.start_date`"}{else} on the {""|date_format:"jS F":"2000-`$metadata.start_date`"}{/if}.
			{/if}
			{if $metadata.start_date=="" && $metadata.setupfee!=0 && $metadata.setupfee!=""}
			{* with setup fee and starting today *} 
			You will pay {$content.currency_sym}{$metadata.price/100} {$metadata.taxappend} {if $metadata.count>1}every {$metadata.count} {$metadata.interval}s{else} each {$metadata.interval}{/if}  with your first payment straight away. A {$content.currency_sym}{$metadata.setupfee/100} {$metadata.setupfeedesc} will also be included with your first payment.
			{/if}
			</span>
		{if $content.logged_in_user.id!=""}
			{assign var=subscription_name value="stripe_subscription_plan_`$metadata.stripe_plan_id`"}
			{foreach from=$content.logged_in_user.custom_with_names item=item}
			{if $item.name=="Stripe Customer ID"}
			{assign var=stripe_user_id value=$item.value}
			{/if}
			{/foreach}

			{get_user_child_data
				userid=$content.logged_in_user.id 
				type=$subscription_name
			}
			{foreach from=$user_child_data item=value key=key name=loop1}
				{if $user_child_data.$key.plan_id==$metadata.stripe_plan_id}
					{assign var=sub_id value=$user_child_data.$key.sub_id}
					{assign var=user_plan_id value=$user_child_data.$key.plan_id}
				{/if}
			{/foreach}
			{if !$smarty.get.subscribe}
			{assign var="legacy_prices" value="|"|explode:$metadata.legacy_prices}
			{foreach from=$legacy_prices item=legacy key=key name=loop1}
				{assign var=legacy_subscription_name value="stripe_subscription_plan_`$legacy`"}
				{get_user_child_data
					userid=$content.logged_in_user.id 
					type=$legacy_subscription_name
				}
				{foreach from=$user_child_data item=value key=key name=loop1}
					{if $user_child_data.$key.plan_id==$legacy&&$legacy!=""}
					{assign var=sub_id value=$user_child_data.$key.sub_id}
					{assign var=found_subscription_name value="stripe_subscription_plan_`$legacy`"}
					{assign var=user_plan_id value=$legacy}
					{assign var=is_legacy value=$legacy}
					{/if}
				{/foreach}
			{/foreach}
			{if $found_subscription_name }
				{assign var=subscription_name value=$found_subscription_name}
			{/if}
			{/if}
			{if $smarty.get.cancel==$user_plan_id && $sub_id}
				{stripe api_secret=$theme_vars_stripe_key_secret action="cancel_subscription" 
				sub_id=$sub_id
				}
				{get_user_child_data
					userid=$content.logged_in_user.id 
					type=$subscription_name
				}

				{add_user_custom_fields userid=$content.logged_in_user.id name="Subscription to: `$metadata.stripe_name`" value="Cancelled (expires: `$stripe_sub_end`)" hint="Cancelled"}
				{flush_cache}
						{capture name="feedback"}
						<p class="Icon_Info">Your plan is being cancelled. This page will reload in 10 seconds.</p>
						{/capture}

						{assign var=assigned value=true}
				<script type="text/javascript">{literal}setTimeout (function() {window.location.href="?nocache=1"; },10000);{/literal}</script>

			{/if}
			{get_user_child_data
				userid=$content.logged_in_user.id 
			}
			{get_user_child_data
				userid=$content.logged_in_user.id 
				type="payment_method"
			}
			{foreach from=$user_child_data item=value key=key name=loop1}
			{if $user_child_data.$key.payment_method}{assign var=paymenttoken value=$user_child_data.$key.payment_method}{/if}
			{/foreach}
			{if $paymenttoken}

				{get_user_child_data
					userid=$content.logged_in_user.id 
					type=$subscription_name
				}
				{foreach from=$user_child_data item=value key=key name=loop1}
				{if $user_child_data.$key.plan_id==$user_plan_id && $user_child_data.$key.sub_end|strtotime > $smarty.now}
					{if $user_child_data.$key.status=="init"}
						{capture name="feedback"}
						<p class="Icon_Info">Your plan is being setup. This page will reload in 10 seconds.</p>
						{/capture}
						{flush_cache}
						<script type="text/javascript">{literal}setTimeout (function() {window.location.href="?nocache=1"; },10000);{/literal}</script>
						{assign var=assigned value=true}
					{/if}
					{if $user_child_data.$key.status=="deleted" && !$smarty.get.subscribe}
						{capture name="feedback"}
						<p class="Icon_Info">Your subscription has been cancelled.</p>
						{/capture}
					{/if}
					{if $user_child_data.$key.status=="cancelled" && !$smarty.get.subscribe}
						{capture name="feedback"}
						<p class="Icon_Info">Your subscription will cancel at the end of the billing period. {if !$metadata.dormant}Clicking Re-subscribe above will resume billing at the end of the current billing period.
						{if $is_legacy}
						<br/><strong>Important:</strong> This plan’s price has changed. If you re-subscribe before your billing period you will keep your original price.
						{/if}
						{/if}
						</p>
						{/capture}
						{assign var=cancelling value=true}
					{/if}
					{if $user_child_data.$key.status=="failed" && !$smarty.get.subscribe}
						{capture name="feedback"}
						<p class="Icon_Info">Your payment has been declined. Please try adding a different payment method and re-subscribing.</p>
						{/capture}
					{/if}
					{if ($user_child_data.$key.status=="paid"||$user_child_data.$key.status=="active")&&!$smarty.get.cancel&&!$smarty.get.subscribe}
						<div class="subscription-cancel-button">
						<a href="?nocache=1&cancel={$user_plan_id}">Stop subscription</a>
						</div>
						{capture name="feedback"}
						<p class="Icon_Tick">You are currently subscribed to this plan. 
						{if $is_legacy}
						<br/><strong>Important:</strong> This plan’s price has changed. If you cancel you will only be able to re-subscribe at the new price.
						{/if}
						</p>
						{/capture}
						{assign var=assigned value=true}
					{/if}
					{if $user_child_data.$key.status=="incomplete"||$user_child_data.$key.status=="open"}
						<div class="subscription-cancel-button">
							<a href="?nocache=1&cancel={$user_child_data}">Stop subscription</a>
						</div>
						{capture name="feedback"}
						<p class="Icon_Tick">You are currently subscribed to this plan. </p>
						<p class="Icon_Alert">Your payment requires authentication. Your subscription will expire in 24 hours if you do not authenticate.</p>
						{/capture}
						<p class="Button_Medium"><a href="#" class="auth-payment" data-intent="{$user_child_data.$key.intent}">Authenticate payment</a></p>
						{assign var=assigned value=true}
					{/if}
				{/if}
				{/foreach}


				{if $smarty.get.subscribe==$metadata.instance_id}
					{if !$assigned}
						
						{get_user_child_data
							userid=$content.logged_in_user.id 
							type=$subscription_name
						}
						{foreach from=$user_child_data item=value key=key name=loop1}
						{if $user_child_data.$key.plan_id==$metadata.stripe_plan_id}
							{delete_user_child_data id=$key userid=$content.logged_in_user.id}
						{/if}
						{/foreach}

						{stripe api_secret=$theme_vars_stripe_key_secret action="create_subscription" 
						customer=$stripe_user_id
						plan_id=$metadata.stripe_plan_id
						setupfee=$metadata.setupfee
						setupfeedesc=$metadata.setupfeedesc
						currency=$content.currency_code|strtolower 
						billing_cycle_anchor=$metadata.start_date
						prorated=$metadata.prorated
						payment_method=$paymenttoken
						interval=$metadata.interval
						autotax=$metadata.autotax
						}
						{add_user_child_data
							show_in_activity=0
							activity_name="Init Subscription to: `$metadata.stripe_name`"
							userid=$content.logged_in_user.id 
							more_data_plan_id=$metadata.stripe_plan_id
							more_data_sub_name=$metadata.stripe_name
							more_data_sub_id=$stripe_sub_id
							more_data_sub_end=$stripe_sub_end
							more_data_instance_id=$metadata.instance_id
							more_data_status="init"
							more_data_notify=$metadata.notify_email
							type=$subscription_name
						}
						
						{flush_cache}
						<script type="text/javascript">{literal}setTimeout (function() {window.location.href="?nocache=1"; },10000);{/literal}</script>
						{capture name="feedback"}
						<p class="Icon_Info">Your plan is being set up. This page will reload in 10 seconds.</p>
						{/capture}
					{/if}
				{elseif $smarty.get.resubscribe==$metadata.instance_id}
					{if !$assigned}
						
						{get_user_child_data
							userid=$content.logged_in_user.id 
							type=$subscription_name
						}

						{stripe api_secret=$theme_vars_stripe_key_secret action="resubscribe" 
						sub_id=$sub_id
						}
						{* re add reminder email in webhook*}
						{flush_cache}
						{capture name="feedback"}
						<p class="Icon_Info">Your subscription is being set up. This page will refresh in 10 seconds.</p>
						{/capture}

						{assign var=assigned value=true}
						<script type="text/javascript">{literal}setTimeout (function() {window.location.href="?nocache=1"; },10000);{/literal}</script>
					{/if}
				{else}

					{if !$assigned}
					{if $cancelling}
					{if !$metadata.dormant}
					<p class="Button_Medium"><a class="subscription-resubscribe" href="?nocache=1&resubscribe={$metadata.instance_id}">Re-Subscribe</a></p>
					{/if}
					{else}
					{if !$metadata.dormant}
					<p class="Button_Medium"><a class="subscription-subscribe" href="?nocache=1&subscribe={$metadata.instance_id}">Subscribe</a></p>
					{else}
					<p class="Icon_Info">Currently unavailable</p>
					{/if}
					{/if}
					{/if}
				{/if}
			{else}
				{*<p>{$metadata.no_payment_method_warning}</p>*}
				{assign var=no_payment_method value=true}
				<p class="Button_Medium Greyed_Out_Button"><a href="#" title="{$metadata.no_payment_method_warning}">Subscribe</a></p>
			{/if}
	

		{else}
			{assign var=no_payment_method value=true}	
			<p class="Button_Medium Greyed_Out_Button"><a href="#" title="{$metadata.no_payment_method_warning}">Subscribe</a></p>
		{*	<p>{$metadata.no_payment_method_warning}</p>*}
		{/if}
		</div>
		{$smarty.capture.feedback}
		
	{/if}
</div>	

	{if $theme_vars_stripe_key_secret!=""}
		<input type="hidden" name="" id="stripe_key" value="{$theme_vars_stripe_key_publishable}"/>
	{/if}
