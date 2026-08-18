{* @@@
{
	"widget_info":{
		"title":"Stripe Webhook"
		,"title_info":"Enter a name for this instance of the Sripe Webhook widget. You only need one of these for your whole website."
		,"category":"setup"
	},
	"meta_data":[{
		"name":"Webhook saved"
		,"type": "hidden"
		,"var": "webhook_saved"
		,"default":0
	},{
		"name":"Webhook secret"
		,"type":"hidden"
		,"var":"webhook_secret"
		,"default":""
	}],
	"inner_templates":{
	}
}
@@@ *}
	{if !$metadata.webhook_saved&&!$content.background_load}
		{stripe api_secret=$theme_vars_stripe_key_secret action="expose_webhook"}
		<h2>Webhook saved:{$webhook_secret}</h2>
		{add_widget_meta name=webhook_saved value=true instance_id=$metadata.instance_id}
		{add_widget_meta name=webhook_secret value=$webhook_secret instance_id=$metadata.instance_id}

	{else}
		{stripe webhook_secret=$metadata.webhook_secret api_secret=$theme_vars_stripe_key_secret action="webhook"}

		{assign var=subscription_name value="stripe_subscription_plan_`$plan_id`"}
		{if $type=="checkout.session.completed"}

			{internal_api 
				path="/api/invoicelink/`$buyerid`/"
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
				body="coupon=`$coupon`&discount=`$discount`&tax=`$tax`&shipping=`$shipping`&shipping_tax=`$shipping_tax`&shipping_orig=`$shipping_orig`&buyerId=`$buyerid`&item_name=&item_number=&payment_status=Stripe&mc_gross=`$amount`&mc_currency=`$currency`&txn_id=`$id`&parent_txn_id=-&receiver_email=-&contact_phone=`$phone`&first_name=`$first_name`&last_name=`$last_name`&address_city=`$city`&address_country=`$country`&address_state=`$state`&address_street=`$line1` `$line2`&address_zip=`$zip`&payer_business_name=&payer_email=`$email`&payer_id="
			}
		{/if}
		{if $type=="invoice.payment_succeeded"||$type=="customer.subscription.created"}
			{get_user_from_custom var="Stripe Customer ID" value=$customer}
			{if $user_id}
				{get_user_child_data
					userid=$user_id
					type=$subscription_name
				}
				{foreach from=$user_child_data item=value key=key name=loop1}
				{if $user_child_data.$key.plan_id==$plan_id}
					{assign var=instance_id value=$user_child_data.$key.instance_id}
					{assign var=sub_name value=$user_child_data.$key.sub_name}
					{assign var=oldstatus value=$user_child_data.$key.status}
				{/if}
				{/foreach}
				{if $instance_id}


					{add_user_custom_fields userid=$user_id name="Subscription to: `$product_name`" value="Active (expires: `$stripe_sub_end`)" hint="Active"}
					{get_widget_meta widget_id=$instance_id}
					{if
						( 
						$type=="customer.subscription.created" && $oldstatus=="init" && 
							(  
								($widget_metadata.interval == "month" || $widget_metadata.interval == "year") 
								&& $widget_metadata.start_date!="" && $widget_metadata.prorated==0
							)
						) 
						||
						(
							$type=="invoice.payment_succeeded" && $oldstatus == "init" 
						)
					}
					{get_user_child_data
						userid=$user_id
					}
					instace id {$instance_id}
					{foreach from=$user_child_data item=value key=key name=loop1}
					{if $value.instance_id==$instance_id && $value.type|strpos:"stripe_subscription_plan"===0}
				trying to delete init data, might have new plan id since last subscribe, delete all based on instance id only {$value.id} {$user_id}
						{delete_user_child_data id=$value.id userid=$user_id}
					{/if}
					{/foreach}
					about to send reminder 
						{if $widget_metadata.reminder_email}
						{assign var=reminder_campaign_id  value=""}
						{email_send 
							send_date=$stripe_day_before_end 
							sendid="subscription_reminder_`$stripe_sub_id`_`$stripe_day_before_end`" 
							pageid=$widget_metadata.reminder_email
							subject=$widget_metadata.reminder_email_subject
							email=$user_email
							name=$user_name
						}
						{assign var=reminder_campaign_id  value=$campaign_id}
						{/if}
						if about to send subscribe
						{if $widget_metadata.subscribe_email}
							{assign var=date value=$smarty.now|date_format:"%Y-%m-%d %T"}
							{email_send 
								send_date=$date 
								sendid="subscription_created_`$stripe_sub_id`" 
								pageid=$widget_metadata.subscribe_email
								subject=$widget_metadata.subscribe_email_subject
								email=$user_email
								name=$user_name
							}
						{/if}
						about to send notifiy
						{if $widget_metadata.notify_email!=''}
							{assign var=customer_data value=""}
							{get_user_from_id userid=$user_id}
							{assign var=customer_data value="`$customer_data`<p><strong>Name</strong><br/>`$user_name`</p>"}
							{assign var=customer_data value="`$customer_data`<p><strong>Email</strong><br/>`$user_email`</p>"}
							{get_user_custom_fields userid=$user_id}
							{foreach from=$user_custom_fields item=custom_field}
								{if $custom_field.value!=""&&$custom_field.name!="Empty value"}
								{assign var=customer_data value="`$customer_data`<p><strong>`$custom_field.name`</strong><br/>`$custom_field.value`</p>"}
								{/if}

							{/foreach}
							{assign var=date value=$smarty.now|date_format:"%Y-%m-%d %T"}
							{email_send 
								send_date=$smarty.now|date_format:"%Y-%m-%d %T"
								sendid="subscription_pay_notif_`$stripe_sub_id`_`$date`" 
								pagecontent="<p>You have a new subscription payment for `$product_name`.</p><p><strong>Customer Data:</strong></p>`$customer_data`<p><strong>Date:</strong><br/>`$date`</p>"
								subject="Subscription payment made (`$stripe_sub_id`)"
								email=$widget_metadata.notify_email
								name=''
							}
						{/if}
						adding new child {$subscription_name} data {$status} {$product_name} plan id {$plan_id} user {$user_id}
						{add_user_child_data 
							show_in_activity=1
							activity_name="Subscription to: `$product_name`"
							userid=$user_id
							more_data_plan_id=$plan_id
							more_data_sub_id=$stripe_sub_id
							more_data_sub_item_id=$stripe_sub_item_id
							more_data_sub_item_id_varied=$stripe_sub_item_id_varied
							more_data_sub_end=$stripe_sub_end
							more_data_sub_name=$sub_name
							more_data_instance_id=$instance_id
							more_data_scheduled_campaign=$reminder_campaign_id
							more_data_status=$status
							type=$subscription_name
						}
					{/if}
					{flush_cache}
				{/if}
			{/if}
		{/if}
		{if $type=="invoice.payment_failed"}
			{get_user_from_custom var="Stripe Customer ID" value=$customer}
			{if $user_id}
				{get_user_child_data
					userid=$user_id
					type=$subscription_name
				}

				{foreach from=$user_child_data item=value key=key name=loop1}
				{if $user_child_data.$key.plan_id==$plan_id}
					{assign var=instance_id value=$user_child_data.$key.instance_id}
					{assign var=campaign_id value=$user_child_data.$key.scheduled_campaign}
					{if $user_child_data.$key.status!="init"}
					{* Second attempt *}
					{assign var=status value="failed"}
					{email_cancel campaign_id=$campaign_id}
					{/if}
					{delete_user_child_data id=$key userid=$user_id}
				{/if}
				{/foreach}

				{add_user_custom_fields userid=$user_id name="Subscription to: `$product_name`" value="Inactive (Payment Failed)" hint="Inactive"}
				{get_widget_meta widget_id=$instance_id}

				{if $widget_metadata.notify_email!=''}
					{assign var=customer_data value=""}
					{get_user_from_id userid=$user_id}
					{assign var=customer_data value="`$customer_data`<p><strong>Name</strong><br/>`$user_name`</p>"}
					{assign var=customer_data value="`$customer_data`<p><strong>Email</strong><br/>`$user_email`</p>"}
					{get_user_custom_fields userid=$user_id}
					{foreach from=$user_custom_fields item=custom_field}
						{if $custom_field.value!=""&&$custom_field.name!="Empty value"}
						{assign var=customer_data value="`$customer_data`<p><strong>`$custom_field.name`</strong><br/>`$custom_field.value`</p>"}
						{/if}
					{/foreach}
					{assign var=date value=$smarty.now|date_format:"%Y-%m-%d %T"}
					{email_send 
						send_date=$smarty.now|date_format:"%Y-%m-%d %T"
						sendid="subscription_fail_notif_`$stripe_sub_id`_`$smarty.now`" 
						pagecontent="<p>A subscription payment has failed for `$product_name`.</p><p><strong>Customer Data:</strong></p>`$customer_data`<p><strong>Date:</strong><br/>`$date`</p>"
						subject="Subscription failed payment (`$stripe_sub_id`)"
						email=$widget_metadata.notify_email
						name=''
					}
				{/if}
				{add_user_child_data
					show_in_activity=1
					activity_name="Subscription to: `$product_name`"
					userid=$user_id
					more_data_plan_id=$plan_id
					more_data_sub_id=$stripe_sub_id
						more_data_sub_item_id=$stripe_sub_item_id
						more_data_sub_item_id_varied=$stripe_sub_item_id_varied
					more_data_sub_end=$stripe_sub_end
					more_data_instance_id=$instance_id
					more_data_status=$status
					more_data_intent=$intent
					type=$subscription_name
				}
				{flush_cache}
			{/if}
		{/if}
		{if $type=="customer.subscription.deleted"||$type=="customer.subscription.updated"}
			{if $resubscribing}
				{get_user_from_custom var="Stripe Customer ID" value=$customer}
				{if $user_id}
				found user {$subscription_name} {$user_id}
					{get_user_child_data
						userid=$user_id
					}
				plan id {$plan_id} {$stripe_sub_id}

					{foreach from=$user_child_data item=value key=key name=loop1}
					{if $value.sub_id==$stripe_sub_id}
					found plan info
						{assign var=instance_id value=$value.instance_id}
						{assign var=old_scheduled_campaign value=$value.scheduled_campaign}
						{assign var=sub_name value=$value.sub_name}
						{* Cancel old reminder email before deleting the record *}
						{if $old_scheduled_campaign}
							{email_cancel campaign_id=$old_scheduled_campaign}
						{/if}
						{delete_user_child_data id=$value.id userid=$user_id}
					{/if}
					{/foreach}
					{get_user_child_data
						userid=$user_id
					}
					instace id {$instance_id}
					{foreach from=$user_child_data item=value key=key name=loop1}
					{if $value.instance_id==$instance_id && $value.type|strpos:"stripe_subscription_plan"===0}
						delete any lecacy connections {$value.id} {$user_id}
						{delete_user_child_data id=$value.id userid=$user_id}
					{/if}
					{/foreach}
					{assign var=date value=$smarty.now|date_format:"%Y-%m-%d %T"}
					{if $billing_anchor_changed}
						{add_user_custom_fields userid=$user_id name="Subscription to: `$product_name`" value="Active (expires: `$stripe_sub_end`)" hint="Active"}
					{else}
						{add_user_custom_fields userid=$user_id name="Subscription to: `$product_name`" value="Resubscribed on `$date`" hint="Resubscribed"}
					{/if}

					{get_widget_meta widget_id=$instance_id}
					{if $widget_metadata.reminder_email}
					send email date: {$stripe_day_before_end} id: {$widget_metadata.reminder_email} subject: {$widget_metadata.reminder_email_subject}
					{assign var=reminder_campaign_id  value=""}
					{email_send 
						send_date=$stripe_day_before_end 
						sendid="subscription_reminder_`$stripe_sub_id`_`$stripe_day_before_end`" 
						pageid=$widget_metadata.reminder_email
						subject=$widget_metadata.reminder_email_subject
						email=$user_email
						name=$user_name
					}
					{assign var=reminder_campaign_id  value=$campaign_id}
					{/if}
					{if $widget_metadata.notify_email!=''}
						{assign var=customer_data value=""}
						{get_user_from_id userid=$user_id}
						{assign var=customer_data value="`$customer_data`<p><strong>Name</strong><br/>`$user_name`</p>"}
						{assign var=customer_data value="`$customer_data`<p><strong>Email</strong><br/>`$user_email`</p>"}
						{get_user_custom_fields userid=$user_id}
						{foreach from=$user_custom_fields item=custom_field}
							{if $custom_field.value!=""&&$custom_field.name!="Empty value"}
							{assign var=customer_data value="`$customer_data`<p><strong>`$custom_field.name`</strong><br/>`$custom_field.value`</p>"}
							{/if}
						{/foreach}
						{assign var=date value=$smarty.now|date_format:"%Y-%m-%d %T"}
						{email_send 
							send_date=$smarty.now|date_format:"%Y-%m-%d %T"
							sendid="subscription_cancel_notif_`$stripe_sub_id`_`$smarty.now`" 
							pagecontent="<p>A customer has resubscribed `$sub_name`.</p><p><strong>Customer Data:</strong></p>`$customer_data`<p><strong>Date:</strong><br/>`$date`</p>"
							subject="Subscription resubscribed (`$stripe_sub_id`)"
							email=$widget_metadata.notify_email
							name=''
						}
					{/if}
					adding new data {$plan_id} {$stripe_sub_id} {$subscription_name} {$user_id}
					{add_user_child_data
						show_in_activity=1
						activity_name="Subscription to: `$product_name`"
						userid=$user_id
						more_data_plan_id=$plan_id
						more_data_sub_id=$stripe_sub_id
							more_data_sub_item_id=$stripe_sub_item_id
							more_data_sub_item_id_varied=$stripe_sub_item_id_varied
						more_data_sub_end=$stripe_sub_end
						more_data_instance_id=$instance_id
						more_data_status="active"
						more_data_intent=$intent
						more_data_scheduled_campaign =$reminder_campaign_id
						type=$subscription_name
					}
					{flush_cache}
				{/if}

			{/if}
			{if $cancelled||$deleted}
				{get_user_from_custom var="Stripe Customer ID" value=$customer}
				{if $user_id}
					{get_user_child_data
						userid=$user_id
						type=$subscription_name
					}
					cancelling {$subscription_name} {$user_id}
					{$user_child_data|print_r}
					{foreach from=$user_child_data item=value key=key name=loop1}
					{if $user_child_data.$key.plan_id==$plan_id}
						{assign var=instance_id value=$user_child_data.$key.instance_id}
						{assign var=campaign_id value=$user_child_data.$key.scheduled_campaign}
						{assign var=sub_name value=$user_child_data.$key.sub_name}
						{email_cancel campaign_id=$campaign_id}
						{delete_user_child_data id=$key userid=$user_id}
					{/if}
					{/foreach}
					{get_user_child_data
						userid=$user_id
					}
					instace id {$instance_id}
					{foreach from=$user_child_data item=value key=key name=loop1}
					{if $value.instance_id==$instance_id && $value.type|strpos:"stripe_subscription_plan"===0}
						delete any lecacy connections {$value.id} {$user_id}
						{delete_user_child_data id=$value.id userid=$user_id}
					{/if}
					{/foreach}

					{assign var=date value=$smarty.now|date_format:"%Y-%m-%d %T"}
					{add_user_custom_fields userid=$user_id name="Subscription to: `$product_name`" value="Cancelled on `$date`" hint="Cancelled"}

					{get_widget_meta widget_id=$instance_id}
					{$widget_metadata|print_r}
					{if $widget_metadata.notify_email!=''}
						{assign var=customer_data value=""}
						{get_user_from_id userid=$user_id}
						{assign var=customer_data value="`$customer_data`<p><strong>Name</strong><br/>`$user_name`</p>"}
						{assign var=customer_data value="`$customer_data`<p><strong>Email</strong><br/>`$user_email`</p>"}
						{get_user_custom_fields userid=$user_id}
						{foreach from=$user_custom_fields item=custom_field}
							{if $custom_field.value!=""&&$custom_field.name!="Empty value"}
							{assign var=customer_data value="`$customer_data`<p><strong>`$custom_field.name`</strong><br/>`$custom_field.value`</p>"}
							{/if}
						{/foreach}
						{assign var=date value=$smarty.now|date_format:"%Y-%m-%d %T"}
						{email_send 
							send_date=$smarty.now|date_format:"%Y-%m-%d %T"
							sendid="subscription_cancel_notif_`$stripe_sub_id`_`$smarty.now`" 
							pagecontent="<p>A subscription has been cancelled for `$sub_name`.</p><p><strong>Customer Data:</strong></p>`$customer_data`<p><strong>Date:</strong><br/>`$date`</p>"
							subject="Subscription cancelled (`$stripe_sub_id`)"
							email=$widget_metadata.notify_email
							name=''
						}
					{/if}
					{if $widget_metadata.stop_email!=""}
						{assign var=date value=$smarty.now|date_format:"%Y-%m-%d %T"}
						{email_send 
							send_date=$smarty.now|date_format:"%Y-%m-%d %T"
							sendid="subscription_stop_`$stripe_sub_id`_`$smarty.now`" 
							pageid=$widget_metadata.stop_email
							subject=$widget_metadata.stop_email_subject
							email=$user_email
							name=$user_name
						}
					{/if}
					{if $cancelled}
					{assign var=status value="cancelled"}
					{/if}
					{if $deleted}
					{assign var=status value="deleted"}
					{/if}
					{add_user_child_data
						show_in_activity=1
						activity_name="Subscription to: `$product_name`"
						userid=$user_id
						more_data_plan_id=$plan_id
						more_data_sub_id=$stripe_sub_id
							more_data_sub_item_id=$stripe_sub_item_id
							more_data_sub_item_id_varied=$stripe_sub_item_id_varied
						more_data_sub_end=$stripe_sub_end
						more_data_instance_id=$instance_id
						more_data_status=$status
						more_data_intent=$intent
						type=$subscription_name
					}
					{flush_cache}
				{/if}
			{/if}
		{/if}
	{/if}
