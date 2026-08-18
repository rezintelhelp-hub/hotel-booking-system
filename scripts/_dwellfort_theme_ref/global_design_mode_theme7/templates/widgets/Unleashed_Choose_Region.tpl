{* @@@
{
        "widget_info":{
                "title":"Unleashed Choose Currency"
                ,"title_info":"Enter a name for this instance of the Unleashed Choose Currency widget."
                ,"category":"setup" 
        },
        "meta_data":[{
		"name":"Automatic mode"
		,"type": "tick"
		,"var": "automatic"
		,"default":0
        },{
		"name":"Enable GBP"
		,"type": "tick"
		,"var": "gbp"
		,"default":1
        },{
                "name":"GBP Sales Tax Rate"
                ,"type": "text"
                ,"info": "Enter the rate of sales tax for customers using the GBP currency"
                ,"var": "gbp_tax"
                ,"default":"0"
        },{
                "name":"GBP Alternative"
                ,"type": "text"
                ,"info": "Enter a csv list of countries that should use GBP instead of the default."
                ,"var": "gbp_alts"
                ,"default":""
        },{
		"name":"Enable USD"
		,"type": "tick"
		,"var": "usd"
		,"default":1
        },{
                "name":"USD Sales Tax Rate"
                ,"type": "text"
                ,"info": "Enter the rate of sales tax for customers using the USD currency"
                ,"var": "usd_tax"
                ,"default":"0"
        },{
                "name":"USD Alternative"
                ,"type": "text"
                ,"info": "Enter a csv list of countries that should use USD instead of the default."
                ,"var": "usd_alts"
                ,"default":""
        },{
		"name":"Enable EUR"
		,"type": "tick"
		,"var": "eur"
		,"default":1
        },{
                "name":"EUR Sales Tax Rate"
                ,"type": "text"
                ,"info": "Enter the rate of sales tax for customers using the EUR currency"
                ,"var": "eur_tax"
                ,"default":"0"
        },{
                "name":"EUR Alternative"
                ,"type": "text"
                ,"info": "Enter a csv list of countries that should use EUR instead of the default."
                ,"var": "eur_alts"
                ,"default":""
        },{
		"name":"Enable AUD"
		,"type": "tick"
		,"var": "aud"
		,"default":1
        },{
                "name":"AUD Sales Tax Rate"
                ,"type": "text"
                ,"info": "Enter the rate of sales tax for customers using the AUD currency"
                ,"var": "aud_tax"
                ,"default":"0"
        },{
                "name":"AUD Alternative"
                ,"type": "text"
                ,"info": "Enter a csv list of countries that should use AUD instead of the default."
                ,"var": "aud_alts"
                ,"default":""
        },{
		"name":"Enable NZD"
		,"type": "tick"
		,"var": "nzd"
		,"default":1
        },{
                "name":"NZD Sales Tax Rate"
                ,"type": "text"
                ,"info": "Enter the rate of sales tax for customers using the NZD currency"
                ,"var": "nzd_tax"
                ,"default":"0"
        },{
                "name":"NZD Alternative"
                ,"type": "text"
                ,"info": "Enter a csv list of countries that should use NZD instead of the default."
                ,"var": "nzd_alts"
                ,"default":""
        }],
        "inner_templates":{
        }
}
@@@ *}
{if $metadata.automatic}
	{if !$smarty.cookies.output_cursymv3}
		{if $smarty.request.choose_region}
			{geolocate}
			{if $country=="GB"&&$metadata.gbp}
			AJAX_REGIONgbpAJAX_REGION
			{elseif $country=="US"&&$metadata.usd}
			AJAX_REGIONusdAJAX_REGION
			{elseif ($country=="AT"||$country=="BE"||$country=="CY"||$country=="EE"||$country=="FI"||$country=="FR"||$country=="DE"||$country=="GR"||$country=="IE"||$country=="IT"||$country=="LT"||$country=="LV"||$country=="LU"||$country=="MT"||$country=="NL"||$country=="PT"||$country=="SL"||$country=="SK"||$country=="ES")&&$metadata.eur}
			AJAX_REGIONeurAJAX_REGION
			{elseif $country=="AU"&&$metadata.aud}
			AJAX_REGIONaudAJAX_REGION
			{elseif $country=="NZ"&&$metadata.nzd}
			AJAX_REGIONnzdAJAX_REGION
			{else}
				{assign var="nzd_alts" value=",`$metadata.nzd_alts`,"}
				{assign var="nzd_alts" value=$nzd_alts|replace:" ":""}
				{assign var="gbp_alts" value=",`$metadata.gbp_alts`,"}
				{assign var="gbp_alts" value=$gbp_alts|replace:" ":""}
				{assign var="usd_alts" value=",`$metadata.usd_alts`,"}
				{assign var="usd_alts" value=$usd_alts|replace:" ":""}
				{assign var="aud_alts" value=",`$metadata.aud_alts`,"}
				{assign var="aud_alts" value=$aud_alts|replace:" ":""}
				{assign var="eur_alts" value=",`$metadata.eur_alts`,"}
				{assign var="eur_alts" value=$eur_alts|replace:" ":""}
				{assign var="test" value=",`$country`,"}
				{if $gbp_alts|stristr:$test&&$metadata.gbp&&$metadata.gbp_alts!=""}
				AJAX_REGIONgbpAJAX_REGION
				{elseif $usd_alts|stristr:$test&&$metadata.usd&&$metadata.usd_alts!=""}
				AJAX_REGIONusdAJAX_REGION
				{elseif $eur_alts|stristr:$test&&$metadata.eur&&$metadata.eur_alts!=""}
				AJAX_REGIONeurAJAX_REGION
				{elseif $aud_alts|stristr:$test&&$metadata.aud&&$metadata.aud_alts!=""}
				AJAX_REGIONaudAJAX_REGION
				{elseif $nzd_alts|stristr:$test&&$metadata.nzd&&$metadata.nzd_alts!=""}
				AJAX_REGIONnzdAJAX_REGION
				{else}
				AJAX_REGIONdefaultAJAX_REGION
				{/if}
			{/if}
		{else}
			<input type="hidden" value="" data-instance-id="{$metadata.instance_id}" id="unleashed-automatic"/>
		{/if}
	{/if}
{/if}
	{geolocate}
	<div id="unleashed-region-chooser">
	{$editable.above_currency_choice}
	<form action="#" method="post">
	<select data-instance-id="{$metadata.instance_id}">
	<option value="">Please choose</option>
	{if $metadata.gbp}
	<option value="gbp" {if $country=="GB"}selected=selected{/if}>GBP</option>
	{/if}
	{if $metadata.usd}
	<option value="usd" {if $country=="US"}selected=selected{/if}>USD</option>
	{/if}
	{if $metadata.eur}
	<option value="eur" {if $country=="AT"||$country=="BE"||$country=="CY"||$country=="EE"||$country=="FI"||$country=="FR"||$country=="DE"||$country=="GR"||$country=="IE"||$country=="IT"||$country=="LT"||$country=="LV"||$country=="LU"||$country=="MT"||$country=="NL"||$country=="PT"||$country=="SL"||$country=="SK"||$country=="ES"}selected=selected{/if}>EUR</option>
	{/if}
	{if $metadata.aud}
	<option value="aud" {if $country=="AU"}selected=selected{/if}>AUD</option>
	{/if}
	{if $metadata.nzd}
	<option value="nzd" {if $country=="NZ"}selected=selected{/if}>NZD</option>
	{/if}
	<option value="default">Use default region</option>
	</select>
	</form>
	{$editable.below_currency_choice}
	</div>
