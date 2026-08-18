{* @@@
{
        "widget_info":{
                "title":"Unleashed Customer Account"
                ,"title_info":"Enter a name for this instance of the Unleashed Choose Currency widget."
                ,"category":"setup" 
        },
        "meta_data":[],
        "inner_templates":{
        }
}
@@@ *}
{if $content.logged_in_user}
	{foreach from=$content.logged_in_user.custom_with_names item=custom} 
		{if $custom.name=="Unleashed Discount"}
			{if $custom.value!=''}
				{assign var="discount" value=$custom.value}
				{math assign="discount" equation="x * 100" x=$custom.value}
			{/if}
		{/if}
		{if $custom.name=="Unleashed Code"}
			{if $custom.value!=''}
				{assign var="code" value=$custom.value}
			{/if}
		{/if}
	{/foreach}
	{if $discount>0}
	<p class="Icon_Tick">Your discount of {$discount}% has been applied to eligible products in the store.</p>
	{else}
	<p class="Icon_Info">You don't currently have a store discount.</p>
	{/if}
	{*
	{unleashed 
	customer_code=$code action="getAddress"
	api_id=$theme_vars_unleashed_id
	api_key=$theme_vars_unleashed_key
	}
	*}
{/if}
