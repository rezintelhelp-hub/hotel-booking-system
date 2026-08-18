{* @@@
{
	"widget_info":{
		"title":"Stripe No Payment Method Message"
		,"category":"setup"
	},
        "meta_data":[],
        "inner_templates":{
        }
}
@@@ *}
{if $content.logged_in_user.id}
{get_user_child_data
	userid=$content.logged_in_user.id 
	type="payment_method"
}
{foreach from=$user_child_data item=value key=key name=loop1}
{if $user_child_data.$key.payment_method}{assign var=paymenttoken value=$user_child_data.$key.payment_method}{/if}
{/foreach}
{if !$paymenttoken}
{$editable.content}
{/if}
{/if}
