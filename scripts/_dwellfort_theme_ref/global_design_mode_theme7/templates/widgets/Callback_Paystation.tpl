{* @@@
{
	"widget_info":{
		"title":"Paystation Callback"
		,"category":"setup"
	}
}
@@@ *}
		{checkout_paystation
			callback=true
			client_id=$content.merchant7_1
			client_secret=$content.merchant7_2
			gateway_id=$content.merchant7_3
			hmac_key=$content.merchant7_4
		}

		{if $ok}
			{*internal_api
				path="/api/invoicelink/`$buyerid`/"
				api_key=$localhost_api_key
				name="result"
				method="GET"
				domain="127.0.0.1"
				output="output"
			*}

			{internal_api
				path="/api/ordernotify/"
				api_key=$localhost_api_key
				name="result"
				method="PUT"
				domain="127.0.0.1"
				body="buyerId=`$buyerid`&payment_status=Paystation&mc_gross=`$mc_gross`&txn_id=`$paystationid`"
			}
	{/if}

