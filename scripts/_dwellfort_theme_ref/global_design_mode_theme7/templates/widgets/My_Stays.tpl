{* @@@
{
        "widget_info":{
                "title":"My Stays"
                ,"title_info":"Enter a name for this instance of the my stays widget. Important: This must be the first item on the page."
                ,"category":"setup"
        },
        "meta_data":[
	{
		"name":"Lodgify API Key"
		,"type":"text"
		,"design":"true"
		,"default":""
		,"var":"lodgify_apikey"
	},{
		"name":"Beds24 API v2 Invite Code"
		,"type":"text"
		,"design":"true"
		,"default":""
		,"var":"invitecode"
	},{
		"name":"Beds24 API v2 Long Token"
		,"type":"text"
		,"info":"This should only be changed for debugging purposes. It will be managed internally normally."
		,"design":"true"
		,"default":""
		,"var":"longtoken"
	},{
		"name":"Beds24 API v2 Refresh Token"
		,"type":"text"
		,"info":"This should only be changed for debugging purposes. It will be managed internally normally."
		,"design":"true"
		,"default":""
		,"var":"refreshtoken"
	},{
		"name":"Only one in basket"
		,"type":"tick"
		,"var":"onlyone"
		,"default":"0"
	},{
		"name":"Date Format"
		,"type":"text"
		,"info":"Display format for dates"
		,"var":"date_format"
		,"design":"true"
		,"default":"%A, %B %e, %Y"
        },{
		"name":"Auto Translate Dates"
		,"type":"tick"
		,"info":"Automatically translate dates based on content language"
		,"var":"auto_translate_dates"
		,"default":"1"
        },{
		"name":"Spanish Date Format"
		,"type":"text"
		,"info":"Date format for Spanish language (es)"
		,"var":"date_format_es"
		,"design":"true"
		,"default":"%A, %e de %B de %Y"
        },{
		"name":"French Date Format"
		,"type":"text"
		,"info":"Date format for French language (fr)"
		,"var":"date_format_fr"
		,"design":"true"
		,"default":"%A %e %B %Y"
        },{
		"name":"German Date Format"
		,"type":"text"
		,"info":"Date format for German language (de)"
		,"var":"date_format_de"
		,"design":"true"
		,"default":"%A, %e. %B %Y"
        },{
		"name":"Italian Date Format"
		,"type":"text"
		,"info":"Date format for Italian language (it)"
		,"var":"date_format_it"
		,"design":"true"
		,"default":"%A %e %B %Y"
        },{
		"name":"Enable Hostvana"
		,"type":"tick"
		,"var":"hostvana"
		,"default":"0"
        },{
		"name":"Enable B24 Direct Payment"
		,"type":"tick"
		,"var":"b24pay"
		,"default":"0"
	},{
		"name":"Direct Payment Custom URL"
		,"type":"text"
		,"info":"Override the B24 Payment URL if needed"
		,"var":"b24payurl"
		,"default":"beds24.rezintel.net"
        },{
		"name":"Above cart text"
		,"type":"text"
		,"info":"Show text and optional link above cart in multi-property mode"
		,"var":"above_cart_text"
		,"default":"You can [go back]({book_now_url}) and add additional stays to your booking if needed."
        },{
		"name":"'Please check' text"
		,"type":"text"
		,"info":"Logged in message above cart"
		,"var":"please_check_text"
		,"default":"Please check these details are correct before continuing to payment. You can [go back]({book_now_url}) and add additional stays to your booking if needed."
        },{
		"name":"Error text"
		,"type":"text"
		,"info":"Error with booking text"
		,"var":"error_text"
		,"default":"There was an error with your payment. Your booking is provisionally made but please contact us as soon as possible to ensure it remains available to you."
        },{
		"name":"Contact us error button"
		,"type":"text"
		,"info":"Contact us button text when there's an error"
		,"var":"error_button_text"
		,"default":"Contact us to arrange alternative payment"
        },{
                "name":"Beds24 Status"
                ,"type": "dropdown"
                ,"var": "status"
                ,"default":"1"
                ,"options":[
                        {
                                "label":"Confirmed"
                                ,"value":"1"
                        },
                        {
                                "label":"Cancelled"
                                ,"value":"0"
                        },
                        {
                                "label":"Inquiry"
                                ,"value":"5"
                        },
                        {
                                "label":"Request"
                                ,"value":"3"
                        }
                ]
        },{
		"name":"Cart Title"
		,"type":"text"
		,"info":"Title displayed for the cart"
		,"var":"cart_title"
		,"default":"Your Cart"
        },{
		"name":"Cart Title with Count"
		,"type":"text"
		,"info":"Cart title with item count placeholder {items}"
		,"var":"cart_title_count"
		,"default":"Your Cart ({items})"
        },{
		"name":"Single Booking Text"
		,"type":"text"
		,"info":"Text shown for single booking"
		,"var":"single_booking_text"
		,"default":"Your booking"
        },{
		"name":"Multiple Bookings Text"
		,"type":"text"
		,"info":"Text shown for multiple bookings"
		,"var":"multiple_bookings_text"
		,"default":"Your bookings"
        },{
		"name":"Remove from Booking Text"
		,"type":"text"
		,"info":"Link text to remove item from booking"
		,"var":"remove_booking_text"
		,"default":"Remove from booking"
        },{
		"name":"Remove from Account Text"
		,"type":"text"
		,"info":"Link text to remove item from account"
		,"var":"remove_account_text"
		,"default":"Remove from my account"
        },{
		"name":"Single Booking Warning"
		,"type":"text"
		,"info":"Warning shown when only one booking allowed"
		,"var":"single_booking_warning"
		,"default":"You can only add a single booking at once"
        },{
		"name":"No Property Selected Text"
		,"type":"text"
		,"info":"Message when no property is selected"
		,"var":"no_property_text"
		,"default":"You haven't selected a property yet. Please go to the Book Now page to start."
        },{
		"name":"Go Back Text"
		,"type":"text"
		,"info":"Go back link text"
		,"var":"go_back_text"
		,"default":"Go back"
        },{
		"name":"Property Available Text"
		,"type":"text"
		,"info":"Message when property is available"
		,"var":"property_available_text"
		,"default":"This property is available."
        },{
		"name":"Property Unavailable Text"
		,"type":"text"
		,"info":"Message when property is unavailable"
		,"var":"property_unavailable_text"
		,"default":"Unfortunately this property is no longer available."
        },{
		"name":"Booking Processing Text"
		,"type":"text"
		,"info":"Message during booking processing with {bookid} placeholder"
		,"var":"booking_processing_text"
		,"default":"You booking is being processed. Your booking id is: {bookid}"
        },{
		"name":"Thank You Text"
		,"type":"text"
		,"info":"Thank you message"
		,"var":"thank_you_text"
		,"default":"Many thanks"
        },{
		"name":"Arrive Label"
		,"type":"text"
		,"info":"Arrival date label"
		,"var":"arrive_label"
		,"default":"Arrive:"
        },{
		"name":"Depart Label"
		,"type":"text"
		,"info":"Departure date label"
		,"var":"depart_label"
		,"default":"Depart:"
        },{
		"name":"Adults Label"
		,"type":"text"
		,"info":"Adults count label"
		,"var":"adults_label"
		,"default":"Adults:"
        },{
		"name":"Children Label"
		,"type":"text"
		,"info":"Children count label"
		,"var":"children_label"
		,"default":"Children:"
        },{
		"name":"Accommodation Price Label"
		,"type":"text"
		,"info":"Accommodation price label"
		,"var":"accommodation_price_label"
		,"default":"Accommodation price:"
        },{
		"name":"Total Label"
		,"type":"text"
		,"info":"Total amount label"
		,"var":"total_label"
		,"default":"Total:"
        },{
		"name":"Discount Label"
		,"type":"text"
		,"info":"Discount amount label"
		,"var":"discount_label"
		,"default":"Discount:"
        },{
		"name":"Grand Total Label"
		,"type":"text"
		,"info":"Grand total label"
		,"var":"grand_total_label"
		,"default":"Grand total:"
        },{
		"name":"Total Due Authorized Label"
		,"type":"text"
		,"info":"Total due once authorized label"
		,"var":"total_due_authorized_label"
		,"default":"Total due once authorized:"
        },{
		"name":"Total Due Today Label"
		,"type":"text"
		,"info":"Total due today label"
		,"var":"total_due_today_label"
		,"default":"Total due today:"
        },{
		"name":"Booking ID Label"
		,"type":"text"
		,"info":"Booking ID label"
		,"var":"booking_id_label"
		,"default":"Booking ID:"
        },{
		"name":"Property Label"
		,"type":"text"
		,"info":"Property name label"
		,"var":"property_label"
		,"default":"Property:"
        },{
		"name":"Status Label"
		,"type":"text"
		,"info":"Status label"
		,"var":"status_label"
		,"default":"Status:"
        },{
		"name":"Amount Outstanding Label"
		,"type":"text"
		,"info":"Amount outstanding label"
		,"var":"amount_outstanding_label"
		,"default":"Amount outstanding:"
        },{
		"name":"Included Label"
		,"type":"text"
		,"info":"Included items label"
		,"var":"included_label"
		,"default":"Included:"
        },{
		"name":"First Night Deposit Text"
		,"type":"text"
		,"info":"First night's fee as deposit message"
		,"var":"first_night_deposit_text"
		,"default":"First night's fee as deposit due now, balance will be due subject to terms and conditions"
        },{
		"name":"Percentage Deposit Text"
		,"type":"text"
		,"info":"Percentage deposit message with {deposit} placeholder"
		,"var":"percentage_deposit_text"
		,"default":"{deposit}% deposit due now, balance will be due subject to terms and conditions"
        },{
		"name":"Card Authorization Text"
		,"type":"text"
		,"info":"Card authorization message"
		,"var":"card_authorization_text"
		,"default":"To make this booking your card will be authorised, payment will be taken in the time specified within our Terms and conditions."
        },{
		"name":"No Payment Text"
		,"type":"text"
		,"info":"No payment taken message"
		,"var":"no_payment_text"
		,"default":"No payment taken, card pre-authorized."
        },{
		"name":"Deposit Taken Text"
		,"type":"text"
		,"info":"Deposit taken message with placeholders"
		,"var":"deposit_taken_text"
		,"default":"{deposit}% deposit ({currency}{amount}) has been taken, balance will be due subject to terms and conditions"
        },{
		"name":"Have Voucher Text"
		,"type":"text"
		,"info":"Have a voucher prompt"
		,"var":"have_voucher_text"
		,"default":"Have a voucher?"
        },{
		"name":"Enter Coupon Text"
		,"type":"text"
		,"info":"Enter coupon label"
		,"var":"enter_coupon_text"
		,"default":"Enter coupon:"
        },{
		"name":"Valid Text"
		,"type":"text"
		,"info":"Valid voucher text"
		,"var":"valid_text"
		,"default":"Valid"
        },{
		"name":"Voucher Invalid Text"
		,"type":"text"
		,"info":"Invalid voucher message"
		,"var":"voucher_invalid_text"
		,"default":"Voucher not valid"
        },{
		"name":"Apply Button Text"
		,"type":"text"
		,"info":"Apply button text"
		,"var":"apply_button_text"
		,"default":"Apply"
        },{
		"name":"Continue Payment Text"
		,"type":"text"
		,"info":"Continue to payment button text"
		,"var":"continue_payment_text"
		,"default":"Continue to Payment"
        },{
		"name":"Change Cancel Text"
		,"type":"text"
		,"info":"{$metadata.change_cancel_text} link text"
		,"var":"change_cancel_text"
		,"default":"{$metadata.change_cancel_text}"
        },{
		"name":"Terms Agreement Text"
		,"type":"text"
		,"info":"Terms and conditions agreement text"
		,"var":"terms_agreement_text"
		,"default":"I agree to the terms and conditions."
        },{
		"name":"Agent Online Chat Text"
		,"type":"text"
		,"info":"Agent online chat now text"
		,"var":"agent_online_chat_text"
		,"default":"Agent Online: Chat Now"
        },{
		"name":"Submit Button Text"
		,"type":"text"
		,"info":"Submit button text"
		,"var":"submit_button_text"
		,"default":"Submit"
        },{
		"name":"Error Title"
		,"type":"text"
		,"info":"Error title text"
		,"var":"error_title"
		,"default":"Error"
        },{
		"name":"Payment Error Text"
		,"type":"text"
		,"info":"Payment unsuccessful error message"
		,"var":"payment_error_text"
		,"default":"Your payment wasn't successful. Please contact us to complete your booking."
        },{
		"name":"General Error Text"
		,"type":"text"
		,"info":"General error message"
		,"var":"general_error_text"
		,"default":"An error has occurred. You may need to login again. Please contact us for further help if needed."
        },{
		"name":"Accept Terms Error"
		,"type":"text"
		,"info":"Accept terms error message"
		,"var":"accept_terms_error"
		,"default":"Please accept the terms and conditions"
        },{
		"name":"Agent Online Text"
		,"type":"text"
		,"info":"Agent online status text"
		,"var":"agent_online_text"
		,"default":"Agent Online"
        },{
		"name":"Agent Intro Text"
		,"type":"text"
		,"info":"Agent introduction message"
		,"var":"agent_intro_text"
		,"default":"I'm here to answer any listing questions"
        },{
		"name":"Chat Placeholder Text"
		,"type":"text"
		,"info":"Chat input placeholder"
		,"var":"chat_placeholder_text"
		,"default":"Type your question here"
        },{
		"name":"Interest Message Template"
		,"type":"text"
		,"info":"Interest message template with placeholders"
		,"var":"interest_message_template"
		,"default":"I'm interested in: {property} ({dates}) Adults: {adults} Children: {children} Amount: {currency}{amount}"
        },{
		"name":"Book Now Page URL"
		,"type":"text"
		,"info":"URL to the book now page"
		,"var":"book_now_url"
		,"default":"/book-now/"
        },{
		"name":"Terms Page URL"
		,"type":"text"
		,"info":"URL to the terms and conditions page"
		,"var":"terms_url"
		,"default":"/terms/"
        },{
		"name":"My Stays Page URL"
		,"type":"text"
		,"info":"URL to the my stays page"
		,"var":"my_stays_url"
		,"default":"/my-stays/"
        },{
		"name":"Request Change Page URL"
		,"type":"text"
		,"info":"URL to the request change page"
		,"var":"request_change_url"
		,"default":"/request-to-change/"
        },{
		"name":"Phone Label"
		,"type":"text"
		,"info":"Phone field label"
		,"var":"phone_label"
		,"default":"Phone:"
        },{
		"name":"Time of Arrival Label"
		,"type":"text"
		,"info":"Time of arrival field label"
		,"var":"arrival_time_label"
		,"default":"Time of arrival:"
        },{
		"name":"Guest Comments Label"
		,"type":"text"
		,"info":"Guest comments field label"
		,"var":"guest_comments_label"
		,"default":"Guest comments"
        },{
		"name":"Remove Unavailable Error"
		,"type":"text"
		,"info":"Error message for unavailable items in cart"
		,"var":"remove_unavailable_error"
		,"default":"Please remove unavailable items from your cart before continuing"
        },{
		"name":"Dates Expired Text"
		,"type":"text"
		,"info":"Message when booking dates are in the past"
		,"var":"dates_expired_text"
		,"default":"Your selected dates have passed. Please remove this item and search for new dates."
        }],
        "inner_templates":{
        }
}
@@@ *}
{* Set dynamic date format based on content language *}
{if $metadata.auto_translate_dates}
	{if $content.language == "es"}
		{assign var="active_date_format" value=$metadata.date_format_es}
	{elseif $content.language == "fr"}  
		{assign var="active_date_format" value=$metadata.date_format_fr}
	{elseif $content.language == "de"}
		{assign var="active_date_format" value=$metadata.date_format_de}
	{elseif $content.language == "it"}
		{assign var="active_date_format" value=$metadata.date_format_it}
	{else}
		{assign var="active_date_format" value=$metadata.date_format}
	{/if}
{else}
	{assign var="active_date_format" value=$metadata.date_format}
{/if}

{if $smarty.request.stripe_callback}
{beds24 action="confirmBooking" propkey=$smarty.request.metadata.propid bookid=$smarty.request.metadata.bookid}
CONFIRMED
{/if}
{if $smarty.request.fail}
<h2>{$metadata.error_title}</h2>
<p>{$metadata.payment_error_text}</p>
{/if}
{if $smarty.cookies.bookname_1}
{assign var=found value=true}
{/if}
{assign var=item value=1}
{while $found}

{assign var="bookid_$item" value=$smarty.cookies.{"bookid_$item"}}
{assign var="bookname_$item" value=$smarty.cookies.{"bookname_$item"}}
{assign var="currency_$item" value=$smarty.cookies.{"currency_$item"}}
{assign var="amount_$item" value=$smarty.cookies.{"amount_$item"}}
{assign var="start_$item" value=$smarty.cookies.{"start_$item"}}
{assign var="end_$item" value=$smarty.cookies.{"end_$item"}}
{assign var="roomid_$item" value=$smarty.cookies.{"roomid_$item"}}
{assign var="propkey_$item" value=$smarty.cookies.{"propkey_$item"}}
{assign var="numAdult_$item" value=$smarty.cookies.{"numAdult_$item"}}
{assign var="numChild_$item" value=$smarty.cookies.{"numChild_$item"}}
{assign var="offer_$item" value=$smarty.cookies.{"offer_$item"}}
{assign var="deposit_$item" value=$smarty.cookies.{"deposit_$item"}}
{assign var="upsells_$item" value=$smarty.cookies.{"upsells_$item"}}
{assign var="optional_$item" value=$smarty.cookies.{"optional_$item"}}
{assign var="coupon_$item" value=$smarty.cookies.{"coupon_$item"}}
{assign var="total_topay_$item" value=$smarty.cookies.{"total_topay_$item"}}
{assign var="deposit_topay_$item" value=$smarty.cookies.{"deposit_topay_$item"}}
{assign var="linksrez_code_$item" value=$smarty.cookies.{"linksrez_code_$item"}}
{assign var="linksrez_rate_$item" value=$smarty.cookies.{"linksrez_rate_$item"}}
{assign var="linksrez_hotel_$item" value=$smarty.cookies.{"linksrez_hotel_$item"}}
{assign var="lodgify_houseid_$item" value=$smarty.cookies.{"lodgify_houseid_$item"}}
{assign var="lodgify_roomtypeid_$item" value=$smarty.cookies.{"lodgify_roomtypeid_$item"}}
{assign var="item" value=$item + 1}
{if !$smarty.cookies.{"bookname_$item"}}
{assign var=found value=false}
{/if}
{/while}
{assign var=last value=$item-1}
{if $smarty.request.propertyname && $metadata.onlyone && $item>1 && !$smarty.request.ajax}
<p class="Icon_Alert">{$metadata.single_booking_warning}</p>
{/if}
{if $smarty.request.propertyname && ($bookname_{$last}!=$smarty.request.propertyname || $start_{$last}!=$smarty.request.start || $end_{$last}!=$smarty.request.end) 
&& (!$metadata.onlyone || $item==1 && $metadata.onlyone)
}
{* if coming from book button, add to booking *}
{assign var="bookname_$item" value=$smarty.request.propertyname}
{assign var="currency_$item" value=$smarty.request.currency}
{assign var="amount_$item" value=$smarty.request.amount}
{assign var="start_$item" value=$smarty.request.start}
{assign var="end_$item" value=$smarty.request.end}
{assign var="roomid_$item" value=$smarty.request.roomid}
{assign var="propkey_$item" value=$smarty.request.propertyid}
{assign var="deposit_$item" value=$smarty.request.deposit}
{assign var="linksrez_code_$item" value=$smarty.request.linksrez_code}
{assign var="linksrez_hotel_$item" value=$smarty.request.linksrez_hotel}
{assign var="linksrez_rate_$item" value=$smarty.request.linksrez_rate}
{assign var="lodgify_houseid_$item" value=$smarty.request.lodgify_houseid}
{assign var="lodgify_roomtypeid_$item" value=$smarty.request.lodgify_roomtypeid}
{assign var="numAdult_$item" value=$smarty.request.adults}
{assign var="numChild_$item" value=$smarty.request.children}
{assign var="offer_$item" value=$smarty.request.offers}
{assign var="upsells_$item" value=$smarty.request.upsells}
{assign var="optional_$item" value=$smarty.request.optional|json_encode:true}
{assign var="coupon_$item" value=$smarty.request.coupon}
{assign var="bookid_$item" value=$smarty.request.bookid}
{/if}
{if $smarty.request.changeoptional}
{assign var="optional_{$smarty.request.changeoptional}" value=$smarty.request.optional|json_encode:true}
{/if}
{if $smarty.request.propertyname&&$smarty.request.ajax&&!$smarty.request.hvq}
	{if $metadata.invitecode!=""}
	{beds24 ajax=true action="getAvailabilities" start=$smarty.request.start|strtotime end=$smarty.request.end|strtotime adults=$smarty.request.adults kids=$smarty.request.children roomid=$smarty.request.roomid propkey=$smarty.request.propertyid  vouchercode=$smarty.request.coupon findfirstoffer=$smarty.request.findfirstoffer refreshtoken=$metadata.refreshtoken longtoken=$metadata.longtoken invitecode=$metadata.invitecode get_offer_pos=1}
		{if $refreshtoken}
			{add_widget_meta
				instance_id=$metadata.instance_id
				name="refreshtoken"
				value=$refreshtoken
			}
		{/if}
		{if $longtoken}
			{add_widget_meta
				instance_id=$metadata.instance_id
				name="longtoken"
				value=$longtoken
			}
		{/if}
	{else}
	{beds24 ajax=true action="getAvailabilities" start=$smarty.request.start|strtotime end=$smarty.request.end|strtotime adults=$smarty.request.adults kids=$smarty.request.children roomid=$smarty.request.roomid propkey=$smarty.request.propertyid  vouchercode=$smarty.request.coupon findfirstoffer=$smarty.request.findfirstoffer}
	{/if}

{/if}
{if $smarty.request.checkvoucher&&$smarty.request.ajax}
{$smarty.request.checkvoucher}{$theme_vars_discount_1_codes}
{if $smarty.request.checkvoucher|strtolower==$theme_vars_discount_1_codes|strtolower}
CODERETSTART1CODERETEND
{/if}
{if $smarty.request.checkvoucher|strtolower==$theme_vars_discount_2_codes|strtolower}
CODERETSTART2CODERETEND
{/if}
{if $smarty.request.checkvoucher|strtolower==$theme_vars_discount_3_codes|strtolower}
CODERETSTART3CODERETEND
{/if}
{if $smarty.request.checkvoucher|strtolower==$theme_vars_discount_4_codes|strtolower}
CODERETSTART4CODERETEND
{/if}
{if $smarty.request.checkvoucher|strtolower==$theme_vars_discount_5_codes|strtolower}
CODERETSTART5CODERETEND
{/if}
{if $smarty.request.checkvoucher|strtolower==$theme_vars_discount_6_codes|strtolower}
CODERETSTART6CODERETEND
{/if}
{/if}
{if $smarty.request.propertyid_1&&$smarty.request.ajax&&$smarty.request.hvq}

		{assign var="fakecookies" value=[
		    'start_1' => $smarty.request.start_1,
		    'end_1' => $smarty.request.end_1,
		    'numAdult_1' => $smarty.request.adults,
		    'numChild_1' => $smarty.request.children,
		    'roomid_1' => $smarty.request.roomid_1,
		    'propkey_1' => $smarty.request.propertyid_1,
		    'available_1' => true
		]}
		{if $smarty.request.bookid_1==""}
			{if $smarty.request.q!=""}
				{* initial message, create booking *}
				{beds24 action="createBooking"
				guestFirstName="Hostvana Question"
				guestLastName=""
				cookies=$fakecookies
				status=5
				}
				{if $bookid!=""}
				{beds24 action="createMessage"
				bookingid=$bookid
				propid=$smarty.request.propertyid_1
				message=$smarty.request.q
				}
				HVQBOOKID:{$bookid}ENDHVQ
				{/if}
			{/if}
		{else}
			{assign var="bookid" value=$smarty.request.bookid_1}
			{* Update booking incase dates have changed *}
			{assign var="test" value=$smarty.cookies.{"hvq_`$smarty.request.propertyid_1`_`$smarty.request.roomid_1`_dates"}}
			{if "`$smarty.request.start_1``$smarty.request.end_1`" != $test}
			UPDATED BOOKING {$bookid}
			{beds24 action="createBooking"
			guestFirstName="Hostvana Question"
			guestLastName=""
			updatebooking=$bookid
			cookies=$fakecookies
			status=5
			}
			{/if}
			{if $smarty.request.q!=""}
			{beds24 action="createMessage"
			bookingid=$bookid
			propid=$smarty.request.propertyid_1
			message=$smarty.request.q
			}
			{/if}
			{beds24 action="getMessages"
			bookingid=$bookid
			propid=$smarty.request.propertyid_1
			}
			HVQMESSAGE:{$messages|json_encode}:ENDHVQMESSAGE
		{/if}
		{if $refreshtoken}
			{add_widget_meta
				instance_id=$metadata.instance_id
				name="refreshtoken"
				value=$refreshtoken
			}
		{/if}
		{if $longtoken}
			{add_widget_meta
				instance_id=$metadata.instance_id
				name="longtoken"
				value=$longtoken
			}
		{/if}
{/if}
{if !$content.logged_in_user.id}
<!-- LOGGEDOUT -->
	{if $bookname_1}
	{assign var=item value=1}
	{assign var=found value=true}
	{while $found}
	{assign var=items value=$item}
	{assign var=item value=$item+1}
	{if !$bookname_{$item}}
	{assign var=found value=false}
	{/if}
	{/while}
	<h2>{$metadata.cart_title_count|replace:'{items}':$items}</h2>
	<script type="text/javascript">
	{literal}
	$(document).ready(function(){
		if ($(".textarea_Details_of_your_EnquiryReservation").val()==""){
		$(".textarea_Details_of_your_EnquiryReservation").val("{/literal}{$metadata.interest_message_template|replace:'{property}':$bookname_1|replace:'{dates}':($start_1|cat:' - '|cat:$end_1)|replace:'{adults}':$numAdult_1|replace:'{children}':$numChild_1|replace:'{currency}':$currency_1|replace:'{amount}':($amount_1|money_format)|escape:'javascript'}{literal}");
		}
		if ({/literal}{$items}{literal}!=1){
		$(".twoThirds.last form .input-wrapper-type-checkbox label").each(function(){
		$(this).html($(this).html().replace("***","<strong>{/literal}{$items} booking{if $items!=1}s{/if}{literal}</strong>"));
		});
		} else {
		$(".twoThirds.last form .input-wrapper-type-checkbox input").prop("checked",true).parents(".input-wrapper").hide();


		}
		});
	{/literal}
	</script>
{*	<p class="Icon_Info">Your cart contains {$items} booking{if $items!=1}s{/if}. Please review carefully before continuing to payment.</p>  *}
{if !$metadata.onlyone}
	<p>{$metadata.above_cart_text|bpe_to_html}</p>
{/if}
	{assign var=found value=true}
	{/if}
	{assign var=item value=1}
	{while $found}
	{if $bookname_{$item} && !$smarty.cookies.goneToPay}
		{* Check if booking dates are in the past *}
		{assign var="start_ts" value=$start_{$item}|strtotime}
		{assign var="end_ts" value=$end_{$item}|strtotime}
		{if $end_ts < $smarty.now || $start_ts < $smarty.now - 86400}
			<a href="#" class="removeFromBasket" data-item-id="{$item}">{$metadata.remove_booking_text}</a>
			<h4>{$bookname_{$item}}</h4>
			<p class="Icon_Alert">{$metadata.dates_expired_text}</p>
			<p class="Button_Medium"><a href="{$metadata.book_now_url}">{$metadata.go_back_text}</a></p>
		{else}
		{if $metadata.longtoken!=""}
			{beds24
			action="getAvailabilities"
			start=$start_{$item}|strtotime
			end=$end_{$item}|strtotime
			adults=$numAdult_{$item}
			kids=$numChild_{$item}
			roomid=$roomid_{$item}
			propkey=$propkey_{$item}
			offerid=$offer_{$item}
			vouchercode=$coupon_{$item}
			refreshtoken=$metadata.refreshtoken
			longtoken=$metadata.longtoken
			invitecode=$metadata.invitecode
			get_v2=1}
			{if $longtoken}
				{add_widget_meta
					instance_id=$metadata.instance_id
					name="longtoken"
					value=$longtoken
				}
			{/if}
		{else}
			{beds24 action="getAvailabilities" start=$start_{$item}|strtotime end=$end_{$item}|strtotime adults=$numAdult_{$item} kids=$numChild_{$item} roomid=$roomid_{$item} propkey=$propkey_{$item} offerid=$offer_{$item} vouchercode=$coupon_{$item}}
		{/if}
		{if $avail.roomsavail>=1&&$avail.price||$linksrez_code_{$item}!=""}
		<div class="propBasket">
		<a href="#" class="removeFromBasket" data-item-id="{$item}">{$metadata.remove_booking_text}</a>
		<h4>{$bookname_{$item}}</h4>
			<p class="Icon_Info">{$metadata.property_available_text}</p>
			<p><strong>{$metadata.arrive_label}</strong> {$start_{$item}|date_format:$active_date_format}<br/>
			<strong>{$metadata.depart_label}</strong> {$end_{$item}|date_format:$active_date_format}</p>
				<strong>{$metadata.adults_label}</strong> {$numAdult_{$item}}<br/>
				<strong>{$metadata.children_label}</strong> {$numChild_{$item}}<br/>
				{if $linksrez_code_{$item}!=""}
			<p><strong>{$metadata.accommodation_price_label}</strong> {if $currency_{$item}=="EUR"}€{elseif $currency_{$item}=="GBP"}£{else}&dollar;{/if}{$amount_{$item}|money_format}<br/>
			{else}
			<p><strong>{$metadata.accommodation_price_label}</strong> {*{if $avail.price!=$avail.orig}<strike>{if $currency_{$item}=="EUR"}€{elseif $currency_{$item}=="GBP"}£{else}&dollar;{/if}{$avail.orig|number_format}</strike>{/if}*} {if $currency_{$item}=="EUR"}€{elseif $currency_{$item}=="GBP"}£{else}&dollar;{/if}{$avail.price|money_format}<br/>
			{/if}
			{assign var=discount_elligible_room value=$avail.price}
				{assign var="upsells" value=$upsells_{$item}|json_decode:true}
				{assign var="optional" value=$optional_{$item}|json_decode:true}
				{assign var="topay" value=$avail.price}
				{assign var=discount_elligible_extras value=0}
				{if $linksrez_code_{$item}!=""}
				{assign var="topay" value=$amount_{$item}}
				{/if}
				{foreach from=$upsells item=$upsell key=index}
					{if !$valid_upsells || ($valid_upsells && $valid_upsells[$index]=='1')}
						{if $upsell.type=="2"||$upsell.type=="7"||$upsell.type=="8"}
							{* Obligatory fixed *}
							{if ($upsell.unit==0||$upsell.unit==4)&&$upsell.period==0}
							{* Per booking or room,one time *}
							{math assign="topay" x=$topay y=$upsell.price equation="x + y"}
							{math assign="discount_elligible_extras" x=$discount_elligible_extras y=$upsell.price equation="x + y"}
							<strong>{$upsell.description.EN}:</strong>
							{if $currency_{$item}=="EUR"}€{elseif $currency_{$item}=="GBP"}£{else}&dollar;{/if}{$upsell.price|string_format:"%.2f"}<br/>
							{/if}
							{if ($upsell.unit==0||$upsell.unit==4)&&$upsell.period==1}
							{* Per booking or room , daily *}
							{math assign="topay" x=$topay y=$upsell.price z=$qty_days equation="x + y * z"}
							{math assign="discount_elligible_extras" x=$discount_elligible_extras y=$upsell.price z=$qty_days equation="x + y * z"}
							<strong>{$upsell.description.EN}:</strong>
							{if $currency_{$item}=="EUR"}€{elseif $currency_{$item}=="GBP"}£{else}&dollar;{/if}{$upsell.price|string_format:"%.2f"}/day<br/>
							{/if}
							{if ($upsell.unit==0||$upsell.unit==4)&&$upsell.period==2}
							{* Per booking or room , weekly *}
							{math assign="weeks" days=$qty_days equation="days / 7"}
							{if $weeks>1}
							{assign var="weeks" value=$weeks|floor}
							{else}
							{assign var="weeks" value=1}
							{/if}
							{math assign="topay" x=$topay y=$upsell.price z=$weeks equation="x + y * z"}
							{math assign="discount_elligible_extras" x=$discount_elligible_extras y=$upsell.price z=$weeks|floor equation="x + y * z"}
							<strong>{$upsell.description.EN}:</strong>
							{if $currency_{$item}=="EUR"}€{elseif $currency_{$item}=="GBP"}£{else}&dollar;{/if}{$upsell.price|string_format:"%.2f"}/week<br/>
							{/if}
							{if ($upsell.unit==1||$upsell.unit==2)&&$upsell.period==1}
							{* Per person or adult, daily *}
							{math assign="topay" x=$topay y=$upsell.price z=$qty_days a=$numAdult_{$item} equation="x + y * z * a"}
							{math assign="discount_elligible_extras" x=$discount_elligible_extras y=$upsell.price z=$qty_days a=$numAdult_{$item} equation="x + y * z * a"}
							<strong>{$upsell.description.EN}:</strong>
							{if $currency_{$item}=="EUR"}€{elseif $currency_{$item}=="GBP"}£{else}&dollar;{/if}{$upsell.price|string_format:"%.2f"}/person/day<br/>
							{/if}
							{if $upsell.unit==1&&$upsell.period==2}
							{math assign="weeks" days=$qty_days equation="days / 7"}
							{if $weeks>1}
							{assign var="weeks" value=$weeks|floor}
							{else}
							{assign var="weeks" value=1}
							{/if}
							{math assign="topay" x=$topay y=$upsell.price z=$weeks|floor a=$numAdult_{$item} equation="x + y * z * a"}
							{math assign="discount_elligible_extras" x=$discount_elligible_extras y=$upsell.price z=$weeks|floor a=$numAdult_{$item} equation="x + y * z * a"}
							{* Per person, weekly *}
							<strong>{$upsell.description.EN}:</strong>
							{if $currency_{$item}=="EUR"}€{elseif $currency_{$item}=="GBP"}£{else}&dollar;{/if}{$upsell.price|string_format:"%.2f"}/person/week<br/>
							{/if}
							{if $upsell.unit==1&&$upsell.period==0}
							{* Per person, one time *}
							{math assign="topay" x=$topay y=$upsell.price a=$numAdult_{$item} equation="x + y * a"}
							{math assign="discount_elligible_extras" x=$discount_elligible_extras y=$upsell.price a=$numAdult_{$item} equation="x + y * a"}
							<strong>{$upsell.description.EN}:</strong>
							{if $currency_{$item}=="EUR"}€{elseif $currency_{$item}=="GBP"}£{else}&dollar;{/if}{$upsell.price|string_format:"%.2f"}/person<br/>
							{/if}
						{/if}
						{if $upsell.type=="6"||$upsell.type=="4"}
							{* Obligatory % *}
							{math assign="tax" x=$upsell.price y=$avail.price equation="x * y / 100"}
							{math assign="topay" x=$topay y=$tax equation="x + y"}
							{math assign="discount_elligible_extras" x=$discount_elligible_extras y=$tax equation="x + y"}
							<strong>{$upsell.description.EN}:</strong>
							{if $currency_{$item}=="EUR"}€{elseif $currency_{$item}=="GBP"}£{else}&dollar;{/if}{$tax|money_format}<br/>
						{/if}
					{/if}
				{/foreach}
				</p>
				{foreach from=$upsells item=$upsell key=index}
					{if !$valid_upsells || ($valid_upsells && $valid_upsells[$index])}
						{if $upsell.type=="1"||$upsell.type=="5"||$upsell.type=="3"}
						{assign var="hasoptional" value=true}
						{/if}
					{/if}
				{/foreach}
				{if $hasoptional}
				<form action="" method="post">
				<input type="hidden" name="changeoptional" value="{$item}"/>
				{foreach from=$upsells item="upsell" key=index}
					{if !$valid_upsells || ($valid_upsells && $valid_upsells[$index])}
						{assign var="lineamount" value=""}
						{assign var="linetotal" value=""}
						{assign var="append" value=""}
						{if $upsell.type=="5"}
							{* % optional *}
							<br/>
							<input class="optional_cb" type="checkbox" value="{$upsell.description.EN}" name="optional[]" 
								{if $upsell.unit=="0"}
								{* calc % based on room plus upsells so far (booking) *}
								{math assign="lineamount" y=$upsell.price z=$discount_elligible_extras a=$discount_elligible_room equation="(y * (z + a)) / 100"}
								{/if}
								{if $upsell.unit=="4"}
								{* calc % based on room *}
								{math assign="lineamount" y=$upsell.price a=$discount_elligible_room equation="(y * a) / 100"}
								{/if}

								{foreach from=$optional item="checked"}
									{if $checked==$upsell.description.EN}
									{math assign="topay" x=$topay y=$lineamount equation="x + y"}
									{math assign="discount_elligible_extras" x=$discount_elligible_extras y=$lineamount equation="x + y"}
									checked="checked"
									{/if}
								{/foreach}
							/> <strong>{$upsell.description.EN}:</strong>
							{if $currency_{$item}=="EUR"}€{elseif $currency_{$item}=="GBP"}£{else}&dollar;{/if}{$lineamount|string_format:"%.2f"}
						{/if}
						{if $upsell.type=="1"||$upsell.type=="3"}
							{* fixed optional *}
							<br/>
							<input class="optional_cb" type="checkbox" value="{$upsell.description.EN}" name="optional[]" 

							{if ($upsell.unit=="0"||$upsell.unit=="4")&&$upsell.period=="0"}
								{* per booking or room one time*}
								{math assign="lineamount" y=$upsell.price equation="y"}
								{capture assign="linetotal"}{if $currency_{$item}=="EUR"}€{elseif $currency_{$item}=="GBP"}£{else}&dollar;{/if}{$lineamount|string_format:"%.2f"}{/capture}
							{/if}
							{if ($upsell.unit=="0"||$upsell.unit=="4")&&$upsell.period=="1"}
								{* per booking or room per pay, essentially just a per day fee *}
								{assign var="append" value="/day"}
								{math assign="lineamount" y=$upsell.price z=$qty_days equation="y * z"}
								{capture assign="linetotal"}{if $currency_{$item}=="EUR"}€{elseif $currency_{$item}=="GBP"}£{else}&dollar;{/if}{$lineamount|string_format:"%.2f"} ({/capture}
							{/if}
							{if ($upsell.unit=="0"||$upsell.unit=="4")&&$upsell.period=="2"}
								{* Per booking or room , weekly *}
								{assign var="append" value="/person/week"}
								{math assign="weeks" days=$qty_days equation="days / 7"}
								{if $weeks>1}
								{assign var="weeks" value=$weeks|floor}
								{else}
								{assign var="weeks" value=1}
								{/if}
								{math assign="lineamount" y=$upsell.price z=$weeks|floor equation=" y * z"}
								{capture assign="linetotal"}{if $currency_{$item}=="EUR"}€{elseif $currency_{$item}=="GBP"}£{else}&dollar;{/if}{$lineamount|string_format:"%.2f"}{/capture}
							{/if}


							{if $upsell.unit=="3"||$upsell.unit=="2"||$upsell.unit=="1"}

								{* Per person (1) /adult (2)/child (3) *}
								{* Calc noun *}
								{if $upsell.unit=="1"}
									{* Person *}
									{assign var="append" value="/person"}
									{math assign="person" x=$numAdult_{$item} y=$numChild_{$item} equation="x + y"}
								{/if}
								{if $upsell.unit=="2"}
									{* Adult *}
									{assign var="append" value="/adult"}
									{assign var="person" value=$numAdult_{$item}}

								{/if}
								{if $upsell.unit=="3"}
									{* Child *}
									{assign var="append" value="/child"}
									{assign var="person" value=$numChild_{$item}}
								{/if}


								{* Calc time *}
								{if $upsell.period=="1"}
									{* Daily *}
									{assign var="append" value="$append/day"}
									{assign var="multiplier" value=$qty_days}
								{/if}
								{if $upsell.period=="2"}
									{* Weekly *}
									{assign var="append" value="$append/week"}
									{math assign="weeks" days=$qty_days equation="days / 7"}
									{if $weeks>1}
									{assign var="weeks" value=$weeks|floor}
									{else}
									{assign var="weeks" value=1}
									{/if}
									{assign var="multiplier" value=$weeks}
								{/if}
								{if $upsell.period=="0"}
									{* One time, no need to append an time unit *}
								{/if}

								{if $upsell.period=="0"}
									{* one time *}
									{math assign="lineamount" y=$upsell.price a=$person equation="y * a"}
								{else}
									{* daily or weekly *}
									{math assign="lineamount" y=$upsell.price z=$multiplier a=$person equation="y * z * a"}
								{/if}


								{capture assign="linetotal"}{if $currency_{$item}=="EUR"}€{elseif $currency_{$item}=="GBP"}£{else}&dollar;{/if}{$lineamount|string_format:"%.2f"}{/capture}
							{/if}
							{if $lineamount!=""}
							{foreach from=$optional item="checked"}
								{if $checked==$upsell.description.EN}
									checked="checked"
									{math assign="topay" x=$topay y=$lineamount equation="x + y"}
									{math assign="discount_elligible_extras" x=$discount_elligible_extras y=$lineamount equation="x + y"}
								{/if}
							{/foreach}
							{/if}

							/> <strong>{$upsell.description.EN}:</strong>
							{$linetotal}
						{/if}

					{/if}
				{/foreach}
				</form>
				{/if}
				{capture assign="totals"}
				<p class="myStayTotal"><strong>{$metadata.total_label}</strong> 
				 {if $currency_{$item}=="EUR"}€{elseif $currency_{$item}=="GBP"}£{else}&dollar;{/if}{$topay|money_format}
				 <br/>
				{/capture}
				{assign var=discount_elligible_both value=$discount_elligible_extras + $discount_elligible_room}

				{$totals}
				{if $valid_voucher}
					{if $valid_voucher_type=="roomPercent"}
						{math assign="discount" x=$valid_voucher_value y=$discount_elligible_room equation="x * y / 100"}
					{/if}
					{if $valid_voucher_type=="fixedValue"}
						{assign var=discount value=$valid_voucher_value}
					{/if}
					{if $valid_voucher_type=="percent"}
						{math assign="discount" x=$valid_voucher_value y=$discount_elligible_both equation="x * y / 100"}
					{/if}
					{if $valid_voucher_type=="extrasPercent"}
						{math assign="discount" x=$valid_voucher_value y=$discount_elligible_extras equation="x * y / 100"}
					{/if}
					{if $valid_voucher_type=="perNight"}
						{math assign="discount" x=$valid_voucher_value y=$qty_days equation="x * y"}
					{/if}
					{if $discount}
					<p><strong>{$metadata.discount_label}</strong>
					{if $currency_{$item}=="EUR"}€{elseif $currency_{$item}=="GBP"}£{else}&dollar;{/if}{$discount|money_format}
					</p>
					{/if}
					<p><strong>{$metadata.grand_total_label}</strong>
					{assign var="discount_$item" value=$discount}
					{math assign="topay" x=$topay y=$discount equation="x - y"}
					{if $currency_{$item}=="EUR"}€{elseif $currency_{$item}=="GBP"}£{else}&dollar;{/if}{$topay|money_format}
					</p>
				{/if}
				{if $deposit_{$item}!="0"}
					{if $deposit_{$item}=="101"}
						{math assign="deposit_topay" x=$qty_days_{$item} y=$topay equation="y / x "}
						<p>{$metadata.first_night_deposit_text}</p>
					{else}
						{math assign="deposit_topay" x=$deposit_{$item} y=$topay equation="x * y / 100"}
						<p>{$metadata.percentage_deposit_text|replace:'{deposit}':$deposit_{$item}}</p>
					{/if}
				{/if}

				{if $deposit_{$item}=="0"}
					<strong>{$metadata.total_due_authorized_label}</strong>
				{else}
					<strong>{$metadata.total_due_today_label}</strong>
				{/if}
				{if $currency_{$item}=="EUR"}€{elseif $currency_{$item}=="GBP"}£{else}&dollar;{/if}{$deposit_topay|money_format}
				</p>
				{if $deposit_{$item}=="0"}
					<p>{$metadata.card_authorization_text}</p>
				{/if}
				{if $coupon_{$item}==""}
				<p class="discountButton"><a href="#">{$metadata.have_voucher_text}</a></p>
				{/if}
				<form action="" method="post" class="discount_form"{if $coupon_{$item}!=""} style="display:block"{/if}>
					<label>{$metadata.enter_coupon_text} {if $valid_voucher}<span class="voucher_valid">{$metadata.valid_text}</span>{else}{if $coupon_{$item}!=""}<span class="voucher_not_valid">{$metadata.voucher_invalid_text}</span>{/if}{/if}<br/>
					<input type ="text" name="coupon_{$item}" value="{$coupon_{$item}}"/></label>
					<input type="submit" value="{$metadata.apply_button_text}"/>
				</form>
			</div>
		{else}
			<a href="#" class="removeFromBasket" data-item-id="{$item}">{$metadata.remove_booking_text}</a>
			<h4>{$bookname_{$item}}</h4>
			<p class="Icon_Alert">{$metadata.property_unavailable_text}</p>
			<p class="Button_Medium"><a href="{$metadata.book_now_url}">{$metadata.go_back_text}</a></p>
		{/if}
		{/if}{* /dates check *}
		<script type="text/javascript">
		{literal}
		$(document).ready(function(){

			createCookie('bookname_{/literal}{$item}{literal}',{/literal}"{$bookname_{$item}}"{literal});
			createCookie('discount_{/literal}{$item}{literal}',{/literal}"{$discount_{$item}}"{literal});
			createCookie('roomid_{/literal}{$item}{literal}',{/literal}"{$roomid_{$item}}"{literal});
			createCookie('propkey_{/literal}{$item}{literal}',{/literal}"{$propkey_{$item}}"{literal});
			createCookie('currency_{/literal}{$item}{literal}',{/literal}"{$currency_{$item}}"{literal});
			createCookie('amount_{/literal}{$item}{literal}',{/literal}"{if $linksrez_code_{$item}!=''}{$amount_{$item}}{else}{$avail.price}{/if}"{literal});
			createCookie('numAdult_{/literal}{$item}{literal}',{/literal}"{$numAdult_{$item}}"{literal});
			createCookie('numChild_{/literal}{$item}{literal}',{/literal}"{$numChild_{$item}}"{literal});
			createCookie('offer_{/literal}{$item}{literal}',{/literal}"{$offer_{$item}}"{literal});
			createCookie('upsells_{/literal}{$item}{literal}',{/literal}'{$upsells_{$item}}'{literal});
			createCookie('optional_{/literal}{$item}{literal}',{/literal}'{$optional_{$item}}'{literal});
			createCookie('deposit_{/literal}{$item}{literal}',{/literal}"{$deposit_{$item}}"{literal});
			createCookie('linksrez_code_{/literal}{$item}{literal}',{/literal}"{$linksrez_code_{$item}}"{literal});
			createCookie('linksrez_rate_{/literal}{$item}{literal}',{/literal}"{$linksrez_rate_{$item}}"{literal});
			createCookie('linksrez_hotel_{/literal}{$item}{literal}',{/literal}"{$linksrez_hotel_{$item}}"{literal});
			createCookie('lodgify_houseid_{/literal}{$item}{literal}',{/literal}"{$lodgify_houseid_{$item}}"{literal});
			createCookie('lodgify_roomtypeid_{/literal}{$item}{literal}',{/literal}"{$lodgify_roomtypeid_{$item}}"{literal});
			createCookie('coupon_{/literal}{$item}{literal}',{/literal}"{$coupon_{$item}}"{literal});
			createCookie('start_{/literal}{$item}{literal}',{/literal}"{$start_{$item}}"{literal});
			createCookie('end_{/literal}{$item}{literal}',{/literal}"{$end_{$item}}"{literal});
			createCookie('topay_{/literal}{$item}{literal}',{/literal}"{$topay}"{literal});
			createCookie('deposit_topay_{/literal}{$item}{literal}',{/literal}"{$deposit_topay}"{literal});
		});
		{/literal}
		</script>
	{else}
		<p class="Icon_Alert">{$metadata.no_property_text|replace:'Book Now':"<a href=\"`$metadata.book_now_url`\">Book Now</a>"|bpe_to_html}</p>
	{/if}
	{assign var=item value=$item+1}

	{if !$bookname_{$item}}
	{assign var=found value=false}
	{/if}
	{/while}

{/if}
{if $content.logged_in_user.id}
	{if $smarty.request.removefromaccount}
			{delete_user_child_data
				id=$smarty.request.removefromaccount
				userid=$content.logged_in_user.id
			}
			{redirect location="/my-stay/"}
	{/if}
	{if $smarty.request.createcheckoutsession}
		{assign var="firstName" value=$content.logged_in_user.first_name}
		{assign var="lastName" value=$content.logged_in_user.last_name}
		{assign var="invoicee" value=""}
		{foreach from=$content.logged_in_user.custom_with_names item=custom}
			 {if $custom.name=="Invoicees"}
				 {if $custom.value!=''}
					 {assign var="invoicee" value=$custom.value}
				 {/if}
			 {/if}
		 {/foreach}
		 {assign var=cont value=true}
		{if $smarty.cookies.linksrez_code_1!=""}
			{beds24 action="createBookingLinksrez"
			guestFirstName=$firstName
			guestLastName=$lastName
			guestEmail=$content.logged_in_user.email
			guestPhone=$smarty.request.phone
			guestArrivalTime=$smarty.request.arrival
			guestAddress=$smarty.request.address
			guestCity=$smarty.request.city
			guestPostcode=$smarty.request.postcode
			guestCountry=$smarty.request.country
			guestComments=$smarty.request.comments
			guestCompany=$council
			invoicee=$invoicee
			cookies=$smarty.cookies
			}
			{if !$linksrez_res}
			 {assign var=cont value=false}
			{/if}
		{/if}
		{if $smarty.cookies.lodgify_houseid_1!=""}
			{beds24 action="createBookingLodgify"
			apikey=$metadata.lodgify_apikey
			guestFirstName=$firstName
			guestLastName=$lastName
			guestEmail=$content.logged_in_user.email
			guestPhone=$smarty.request.phone
			guestArrivalTime=$smarty.request.arrival
			guestAddress=$smarty.request.address
			guestCity=$smarty.request.city
			guestPostcode=$smarty.request.postcode
			guestCountry=$smarty.request.country
			guestComments=$smarty.request.comments
			guestCompany=$council
			invoicee=$invoicee
			cookies=$smarty.cookies
			}
			{if !$lodgify_res}
			 {assign var=cont value=false}
			{/if}
		{/if}
		{if $cont}
		{* Check for existing hostvana booking ID for the first property in cart *}
		{assign var="hvq_cookie_name" value="hvq_`$smarty.cookies.propkey_1`_`$smarty.cookies.roomid_1`_book_id"}
		{assign var="existing_hvq_bookid" value=$smarty.cookies.$hvq_cookie_name}
		
		{beds24 action="createBooking"
		guestFirstName=$firstName
		guestLastName=$lastName
		guestEmail=$content.logged_in_user.email
		guestPhone=$smarty.request.phone
		guestArrivalTime=$smarty.request.arrival
		guestAddress=$smarty.request.address
		guestCity=$smarty.request.city
		guestPostcode=$smarty.request.postcode
		guestCountry=$smarty.request.country
		guestComments=$smarty.request.comments
		guestCompany=$council
		invoicee=$invoicee
		cookies=$smarty.cookies
		status=$metadata.status
		bookId=$existing_hvq_bookid
		}
		{assign var=found value=false}
		{if $bookname_1}
		{assign var=found value=true}
		{/if}
		{assign var=item value=1}
		{while $found}
			{add_user_child_data
			userid=$content.logged_in_user.id
			type="booking"
			more_data_bookid=$bookid
			more_data_propkey=$propkey_{$item}
			more_data_roomid=$roomid_{$item}
			more_data_qty_days=$qty_days
			more_data_real_first_name=$firstName
			more_data_real_last_name=$lastName
			more_data_avg_per_day=$avg_per_day
			more_data_status="Waiting for payment"
			more_data_property_name=$bookname_{$item}
			more_data_firstNight=$start_{$item}
			more_data_lastNight=$end_{$item}
			more_data_optional=$optional_{$item}
			more_data_upsells=$upsells_{$item}
			more_data_deposit=$deposit_{$item}
			more_data_linksrez_code=$linksrez_code_{$item}
			more_data_linksrez_rate=$linksrez_rate_{$item}
			more_data_linksrez_hotel=$linksrez_hotel_{$item}
			more_data_lodgify_houseid=$lodgify_houseid_{$item}
			more_data_lodgify_roomtypeid=$lodgify_roomtypeid_{$item}
			more_data_adults=$numAdult_{$item}
			more_data_children=$numChild_{$item}
			more_data_amount=$amount_{$item}
			more_data_topay=$topay_{$item}
			more_data_total_topay=$total_topay_{$item}
			more_data_deposit_topay=$deposit_topay_{$item}
			more_data_currency=$currency_{$item}
			data=$smarty.request
			}
			{assign var=item value=$item+1}
			{if !$bookname_{$item}}
			{assign var=found value=false}
			{/if}
		{/while}
		{else}
		{* Linksrez error *}
		{/if}
		{if $metadata.b24pay}
			{if $bookid}
			{literal}
			!!!{"bookid":"{/literal}{$bookid}{literal}"}!!!
			{/literal}
			{else}
			<!-- BOOKERROR -->
			{/if}
		{else}
			{if $bookid}
				{beds24 
				action="createStripeCheckout" 
				propkey=$smarty.cookies.propkey_1 
				currency=$smarty.request.currency_1
				success_url="`$content.protocol``$content.http_host``$content.fullUrl`?callback=1&bookid=`$bookid`&property_name=`$smarty.request.property_name|htmlspecialchars`" 
				cancel_url="`$content.protocol``$content.http_host``$content.fullUrl`?fail=1" 
				bookid=$bookid 
				email=$content.logged_in_user.email
				cookies=$smarty.cookies
				}
			{else}
			<!-- BOOKERROR -->
			{/if}
		{/if}
	{/if}
	{if $smarty.request.callback}
		{assign var=found value=false}
		{if $bookname_1}
		{assign var=found value=true}
		{/if}
		{assign var=item value=1}
		{while $found}
		<script type="text/javascript">
		{literal}
			eraseCookie('bookname_{/literal}{$item}{literal}');
			eraseCookie('available_{/literal}{$item}{literal}');
			eraseCookie('roomid_{/literal}{$item}{literal}');
			eraseCookie('propkey_{/literal}{$item}{literal}');
			eraseCookie('currency_{/literal}{$item}{literal}');
			eraseCookie('amount_{/literal}{$item}{literal}');
			eraseCookie('numAdult_{/literal}{$item}{literal}');
			eraseCookie('numChild_{/literal}{$item}{literal}');
			eraseCookie('offer_{/literal}{$item}{literal}');
			eraseCookie('upsells_{/literal}{$item}{literal}');
			eraseCookie('optional_{/literal}{$item}{literal}');
			eraseCookie('deposit_{/literal}{$item}{literal}');
			eraseCookie('linksrez_rate_{/literal}{$item}{literal}');
			eraseCookie('linksrez_hotel_{/literal}{$item}{literal}');
			eraseCookie('linksrez_code_{/literal}{$item}{literal}');
			eraseCookie('lodgify_houseid_{/literal}{$item}{literal}');
			eraseCookie('lodgify_roomtypeid_{/literal}{$item}{literal}');
			eraseCookie('coupon_{/literal}{$item}{literal}');
			eraseCookie('start_{/literal}{$item}{literal}');
			eraseCookie('end_{/literal}{$item}{literal}');
			eraseCookie('topay_{/literal}{$item}{literal}');
			eraseCookie('total_topay_{/literal}{$item}{literal}');
			eraseCookie('deposit_topay_{/literal}{$item}{literal}');

		{/literal}
		</script>
		{assign var=item value=$item+1}

		{if !$bookname_{$item}}
		{assign var=found value=false}
		{/if}
		{/while}
		<h2>{$metadata.thank_you_text}</h2>
		<p class="Icon_Info">{$metadata.booking_processing_text|replace:'{bookid}':$smarty.get.bookid}</p>

		{get_user_child_data
		userid=$content.logged_in_user.id
		type="booking"
		}
		{foreach from=$user_child_data item=data}
			{if $data.bookid==$smarty.get.bookid}
			{assign var=firstNight value=$data.firstNight}
			{assign var=lastNight value=$data.lastNight}
			{assign var=propName value=$data.property_name}
			{assign var=firstName value=$data.real_first_name}
			{assign var=lastName value=$data.real_last_name}
			{assign var=avg_per_day value=$data.avg_per_day}
			{assign var=qty_days value=$data.qty_days}
			{assign var=upsells value=$data.upsells}
			{assign var=optional value=$data.optional}
			{assign var=adults value=$data.adults}
			{assign var=children value=$data.children}
			{assign var=deposit value=$data.deposit}
			{assign var=linksrez_code value=$data.linksrez_code}
			{assign var=linksrez_rate value=$data.linksrez_rate}
			{assign var=linksrez_hotel value=$data.linksrez_hotel}
			{assign var=lodgify_houseid value=$data.lodgify_houseid}
			{assign var=lodgify_roomtypeid value=$data.lodgify_roomtypeid}
			{assign var=total_topay value=$data.total_topay}
			{assign var=deposit_topay value=$data.deposit_topay}
			{assign var=currency value=$data.currency}
			{delete_user_child_data
				id=$data.id
				userid=$content.logged_in_user.id
			}
			{/if}
		{/foreach}

		{add_user_child_data
		userid=$content.logged_in_user.id
		type="booking"
		data=$smarty.request
		more_data_status="Paid"
		more_data_firstNight=$firstNight
		more_data_lastNight=$lastNight
		more_data_property_name=$propName
		more_data_bookid=$smarty.request.bookid
		more_data_avg_per_day=$avg_per_day
		more_data_qty_days=$qty_days
		more_data_real_first_name=$firstName
		more_data_real_last_name=$lastName
		more_data_upsells=$upsells
		more_data_optional=$optional
		more_data_deposit=$deposit
		more_data_currency=$currency
		more_data_linksrez_code=$linksrez_code
		more_data_linksrez_hotel=$linksrez_hotel
		more_data_linksrez_rate=$linksrez_rate
		more_data_lodgify_houseid=$lodgify_houseid
		more_data_lodgify_roomtypeid=$lodgify_roomtypeid
		more_data_adults=$adults
		more_data_children=$children
		more_data_total_topay=$total_topay
		more_data_deposit_topay=$deposit_topay
		}
	{/if}

	{if $smarty.request.delete}
		{delete_user_child_data
		userid=$content.logged_in_user.id
		id=$smarty.request.delete
		}
	{/if}
	{if !$smarty.get.bookings&&!$smarty.cookies.goneToPay}
	<h2>{$metadata.cart_title}</h2>
	<p class="Button_Medium">{$metadata.please_check_text|bpe_to_html}</p>
	<div class="styleBox">
	{assign var=found value=false}
	{if $bookname_1}
	{assign var=found value=true}
	{/if}
	{assign var=item value=1}
	{while $found}
	{if ($smarty.post.propertyid||$smarty.cookies.bookname_1)&&!$smarty.request.callback&&!$smarty.cookies.goneToPay}
		{* Check if booking dates are in the past *}
		{assign var="start_ts" value=$start_{$item}|strtotime}
		{assign var="end_ts" value=$end_{$item}|strtotime}
		{if $end_ts < $smarty.now || $start_ts < $smarty.now - 86400}
			<a href="#" class="removeFromBasket" data-item-id="{$item}">{$metadata.remove_booking_text}</a>
			<h4>{$bookname_{$item}}</h4>
			<p class="Icon_Alert">{$metadata.dates_expired_text}</p>
			<p class="Button_Medium"><a href="{$metadata.book_now_url}">{$metadata.go_back_text}</a></p>
		{else}
		{if $metadata.longtoken!=""}
			{beds24
			action="getAvailabilities"
			start=$start_{$item}|strtotime
			end=$end_{$item}|strtotime
			adults=$numAdult_{$item}
			kids=$numChild_{$item}
			roomid=$roomid_{$item}
			propkey=$propkey_{$item}
			offerid=$offer_{$item}
			vouchercode=$coupon_{$item}
			refreshtoken=$metadata.refreshtoken
			longtoken=$metadata.longtoken
			invitecode=$metadata.invitecode
			get_v2=1}
			{if $longtoken}
				{add_widget_meta
					instance_id=$metadata.instance_id
					name="longtoken"
					value=$longtoken
				}
			{/if}
		{else}
		{beds24 action="getAvailabilities" start=$start_{$item}|strtotime end=$end_{$item}|strtotime adults=$numAdult_{$item} kids=$numChild_{$item} roomid=$roomid_{$item} propkey=$propkey_{$item} offerid=$offer_{$item} vouchercode=$coupon_{$item}}
		{/if}
	{if $avail.roomsavail>=1&&$avail.price||$linksrez_code_{$item}!=""}
				<div class="propBasketLoggedIn">
				<a href="#" class="removeFromBasket" data-item-id="{$item}">{$metadata.remove_booking_text}</a>
				<h4>{$bookname_{$item}} </h4>
				<p><strong>{$metadata.arrive_label}</strong> {$start_{$item}|date_format:$active_date_format}<br/>
				<strong>{$metadata.depart_label}</strong> {$end_{$item}|date_format:$active_date_format}</p>
				<strong>{$metadata.adults_label}</strong> {$numAdult_{$item}}<br/>
				<strong>{$metadata.children_label}</strong> {$numChild_{$item}}<br/>
				{if $linksrez_code_{$item}!=""}
				<p><strong>{$metadata.accommodation_price_label}</strong> {if $currency_{$item}=="EUR"}€{elseif $currency_{$item}=="GBP"}£{else}&dollar;{/if}{$amount_{$item}|money_format}<br/>
				{else}
				<p><strong>{$metadata.accommodation_price_label}</strong> {if $avail.price!=$avail.orig}<strike>{if $currency_{$item}=="EUR"}€{elseif $currency_{$item}=="GBP"}£{else}&dollar;{/if}{$avail.orig|money_format}</strike>{/if} {if $currency_{$item}=="EUR"}€{elseif $currency_{$item}=="GBP"}£{else}&dollar;{/if}{$avail.price|money_format}<br/>
				{/if}
			{assign var=discount_elligible_room value=$avail.price}
				{assign var="upsells" value=$upsells_{$item}|json_decode:true}
				{assign var="optional" value=$optional_{$item}|json_decode:true}
				{assign var="topay" value=$avail.price}
				{assign var=discount_elligible_extras value=0}
				{if $linksrez_code_{$item}!=""}
				{assign var="topay" value=$amount_{$item}}
				{/if}
				{foreach from=$upsells item=$upsell key=index}
					{if !$valid_upsells || ($valid_upsells && $valid_upsells[$index]=='1')}
						{if $upsell.type=="2"||$upsell.type=="7"||$upsell.type=="8"}
							{* Obligatory fixed *}
							{if ($upsell.unit==0||$upsell.unit==4)&&$upsell.period==0}
							{* Per booking or room,one time *}
							{math assign="topay" x=$topay y=$upsell.price equation="x + y"}
							{math assign="discount_elligible_extras" x=$discount_elligible_extras y=$upsell.price equation="x + y"}
							<strong>{$upsell.description.EN}:</strong>
							{if $currency_{$item}=="EUR"}€{elseif $currency_{$item}=="GBP"}£{else}&dollar;{/if}{$upsell.price|string_format:"%.2f"}<br/>
							{/if}
							{if ($upsell.unit==0||$upsell.unit==4)&&$upsell.period==1}
							{* Per booking or room , daily *}
							{math assign="topay" x=$topay y=$upsell.price z=$qty_days equation="x + y * z"}
							{math assign="discount_elligible_extras" x=$discount_elligible_extras y=$upsell.price z=$qty_days equation="x + y * z"}
							<strong>{$upsell.description.EN}:</strong>
							{if $currency_{$item}=="EUR"}€{elseif $currency_{$item}=="GBP"}£{else}&dollar;{/if}{$upsell.price|string_format:"%.2f"}/day<br/>
							{/if}
							{if ($upsell.unit==0||$upsell.unit==4)&&$upsell.period==2}
							{* Per booking or room , weekly *}
							{math assign="weeks" days=$qty_days equation="days / 7"}
							{if $weeks>1}
							{assign var="weeks" value=$weeks|floor}
							{else}
							{assign var="weeks" value=1}
							{/if}
							{math assign="topay" x=$topay y=$upsell.price z=$weeks|floor equation="x + y * z"}
							{math assign="discount_elligible_extras" x=$discount_elligible_extras y=$upsell.price z=$weeks|floor equation="x + y * z"}
							<strong>{$upsell.description.EN}:</strong>
							{if $currency_{$item}=="EUR"}€{elseif $currency_{$item}=="GBP"}£{else}&dollar;{/if}{$upsell.price|string_format:"%.2f"}/week<br/>
							{/if}
							{if ($upsell.unit==1||$upsell.unit==2)&&$upsell.period==1}
							{* Per person or adult, daily *}
							{math assign="topay" x=$topay y=$upsell.price z=$qty_days a=$numAdult_{$item} equation="x + y * z * a"}
							{math assign="discount_elligible_extras" x=$discount_elligible_extras y=$upsell.price z=$qty_days a=$numAdult_{$item} equation="x + y * z * a"}
							<strong>{$upsell.description.EN}:</strong>
							{if $currency_{$item}=="EUR"}€{elseif $currency_{$item}=="GBP"}£{else}&dollar;{/if}{$upsell.price|string_format:"%.2f"}/person/day<br/>
							{/if}
							{if $upsell.unit==1&&$upsell.period==2}
							{math assign="weeks" days=$qty_days equation="days / 7"}
							{if $weeks>1}
							{assign var="weeks" value=$weeks|floor}
							{else}
							{assign var="weeks" value=1}
							{/if}
							{math assign="topay" x=$topay y=$upsell.price z=$weeks|floor a=$numAdult_{$item} equation="x + y * z * a"}
							{math assign="discount_elligible_extras" x=$discount_elligible_extras y=$upsell.price z=$weeks|floor a=$numAdult_{$item} equation="x + y * z * a"}
							{* Per person, weekly *}
							<strong>{$upsell.description.EN}:</strong>
							{if $currency_{$item}=="EUR"}€{elseif $currency_{$item}=="GBP"}£{else}&dollar;{/if}{$upsell.price|string_format:"%.2f"}/person/week<br/>
							{/if}
							{if $upsell.unit==1&&$upsell.period==0}
							{* Per person, one time *}
							{math assign="topay" x=$topay y=$upsell.price a=$numAdult_{$item} equation="x + y * a"}
							{math assign="discount_elligible_extras" x=$discount_elligible_extras y=$upsell.price a=$numAdult_{$item} equation="x + y * a"}
							<strong>{$upsell.description.EN}:</strong>
							{if $currency_{$item}=="EUR"}€{elseif $currency_{$item}=="GBP"}£{else}&dollar;{/if}{$upsell.price|string_format:"%.2f"}/person<br/>
							{/if}
						{/if}
						{if $upsell.type=="6"||$upsell.type=="4"}
							{* Obligatory % *}
							{math assign="tax" x=$upsell.price y=$avail.price equation="x * y / 100"}
							{math assign="topay" x=$topay y=$tax equation="x + y"}
							{math assign="discount_elligible_extras" x=$discount_elligible_extras y=$tax equation="x + y"}
							<strong>{$upsell.description.EN}:</strong>
							{if $currency_{$item}=="EUR"}€{elseif $currency_{$item}=="GBP"}£{else}&dollar;{/if}{$tax|money_format}<br/>
						{/if}
					{/if}
				{/foreach}
				</p>
				{foreach from=$upsells item=$upsell key=index}
					{if !$valid_upsells || ($valid_upsells && $valid_upsells[$index])}
						{if $upsell.type=="1"||$upsell.type=="5"||$upsell.type=="3"}
						{assign var="hasoptional" value=true}
						{/if}
					{/if}
				{/foreach}
				{if $hasoptional}
				<form action="" method="post">
				<input type="hidden" name="changeoptional" value="{$item}"/>
				{foreach from=$upsells item="upsell" key=index}
					{if !$valid_upsells || ($valid_upsells && $valid_upsells[$index])}
						{assign var="lineamount" value=""}
						{assign var="linetotal" value=""}
						{assign var="append" value=""}
						{if $upsell.type=="5"}
							{* % optional *}
							<br/>
							<input class="optional_cb" type="checkbox" value="{$upsell.description.EN}" name="optional[]" 
								{if $upsell.unit=="0"}
								{* calc % based on room plus upsells so far (booking) *}
								{math assign="lineamount" y=$upsell.price z=$discount_elligible_extras a=$discount_elligible_room equation="(y * (z + a)) / 100"}
								{/if}
								{if $upsell.unit=="4"}
								{* calc % based on room *}
								{math assign="lineamount" y=$upsell.price a=$discount_elligible_room equation="(y * a) / 100"}
								{/if}

								{foreach from=$optional item="checked"}
									{if $checked==$upsell.description.EN}
									{math assign="topay" x=$topay y=$lineamount equation="x + y"}
									{math assign="discount_elligible_extras" x=$discount_elligible_extras y=$lineamount equation="x + y"}
									checked="checked"
									{/if}
								{/foreach}
							/> <strong>{$upsell.description.EN}:</strong>
							{if $currency_{$item}=="EUR"}€{elseif $currency_{$item}=="GBP"}£{else}&dollar;{/if}{$lineamount|string_format:"%.2f"}
						{/if}
						{if $upsell.type=="1"||$upsell.type=="3"}
							{* fixed optional *}
							<br/>
							<input class="optional_cb" type="checkbox" value="{$upsell.description.EN}" name="optional[]" 

							{if ($upsell.unit=="0"||$upsell.unit=="4")&&$upsell.period=="0"}
								{* per booking or room one time*}
								{math assign="lineamount" y=$upsell.price equation="y"}
								{capture assign="linetotal"}{if $currency_{$item}=="EUR"}€{elseif $currency_{$item}=="GBP"}£{else}&dollar;{/if}{$lineamount|string_format:"%.2f"}{/capture}
							{/if}
							{if ($upsell.unit=="0"||$upsell.unit=="4")&&$upsell.period=="1"}
								{* per booking or room per pay, essentially just a per day fee *}
								{assign var="append" value="/day"}
								{math assign="lineamount" y=$upsell.price z=$qty_days equation="y * z"}
								{capture assign="linetotal"}{if $currency_{$item}=="EUR"}€{elseif $currency_{$item}=="GBP"}£{else}&dollar;{/if}{$lineamount|string_format:"%.2f"} ({/capture}
							{/if}
							{if ($upsell.unit=="0"||$upsell.unit=="4")&&$upsell.period=="2"}
								{* Per booking or room , weekly *}
								{assign var="append" value="/person/week"}
								{math assign="weeks" days=$qty_days equation="days / 7"}
								{if $weeks>1}
								{assign var="weeks" value=$weeks|floor}
								{else}
								{assign var="weeks" value=1}
								{/if}
								{math assign="lineamount" y=$upsell.price z=$weeks|floor equation=" y * z"}
								{capture assign="linetotal"}{if $currency_{$item}=="EUR"}€{elseif $currency_{$item}=="GBP"}£{else}&dollar;{/if}{$lineamount|string_format:"%.2f"}{/capture}
							{/if}


							{if $upsell.unit=="3"||$upsell.unit=="2"||$upsell.unit=="1"}

								{* Per person (1) /adult (2)/child (3) *}
								{* Calc noun *}
								{if $upsell.unit=="1"}
									{* Person *}
									{assign var="append" value="/person"}
									{math assign="person" x=$numAdult_{$item} y=$numChild_{$item} equation="x + y"}
								{/if}
								{if $upsell.unit=="2"}
									{* Adult *}
									{assign var="append" value="/adult"}
									{assign var="person" value=$numAdult_{$item}}

								{/if}
								{if $upsell.unit=="3"}
									{* Child *}
									{assign var="append" value="/child"}
									{assign var="person" value=$numChild_{$item}}
								{/if}


								{* Calc time *}
								{if $upsell.period=="1"}
									{* Daily *}
									{assign var="append" value="$append/day"}
									{assign var="multiplier" value=$qty_days}
								{/if}
								{if $upsell.period=="2"}
									{* Weekly *}
									{assign var="append" value="$append/week"}
									{math assign="weeks" days=$qty_days equation="days / 7"}
									{if $weeks>1}
									{assign var="weeks" value=$weeks|floor}
									{else}
									{assign var="weeks" value=1}
									{/if}
									{assign var="multiplier" value=$weeks}
								{/if}
								{if $upsell.period=="0"}
									{* One time, no need to append an time unit *}
								{/if}

								{if $upsell.period=="0"}
									{* one time *}
									{math assign="lineamount" y=$upsell.price a=$person equation="y * a"}
								{else}
									{* daily or weekly *}
									{math assign="lineamount" y=$upsell.price z=$multiplier a=$person equation="y * z * a"}
								{/if}


								{capture assign="linetotal"}{if $currency_{$item}=="EUR"}€{elseif $currency_{$item}=="GBP"}£{else}&dollar;{/if}{$lineamount|string_format:"%.2f"}{/capture}
							{/if}
							{if $lineamount!=""}
							{foreach from=$optional item="checked"}
								{if $checked==$upsell.description.EN}
									checked="checked"
									{math assign="topay" x=$topay y=$lineamount equation="x + y"}
									{math assign="discount_elligible_extras" x=$discount_elligible_extras y=$lineamount equation="x + y"}
								{/if}
							{/foreach}
							{/if}

							/> <strong>{$upsell.description.EN}:</strong>
							{$linetotal}
						{/if}

					{/if}
				{/foreach}
				</form>
				{/if}
				{capture assign="totals"}
				<p class="myStayTotal"><strong>{$metadata.total_label}</strong> 
				 {if $currency_{$item}=="EUR"}€{elseif $currency_{$item}=="GBP"}£{else}&dollar;{/if}{$topay|money_format}
				 <br/>
				{/capture}
				{assign var=discount_elligible_both value=$discount_elligible_extras + $discount_elligible_room}

				{$totals}
				{if $valid_voucher}
					{if $valid_voucher_type=="roomPercent"}
						{math assign="discount" x=$valid_voucher_value y=$discount_elligible_room equation="x * y / 100"}
					{/if}
					{if $valid_voucher_type=="fixedValue"}
						{assign var=discount value=$valid_voucher_value}
					{/if}
					{if $valid_voucher_type=="percent"}
						{math assign="discount" x=$valid_voucher_value y=$discount_elligible_both equation="x * y / 100"}
					{/if}
					{if $valid_voucher_type=="extrasPercent"}
						{math assign="discount" x=$valid_voucher_value y=$discount_elligible_extras equation="x * y / 100"}
					{/if}
					{if $valid_voucher_type=="perNight"}
						{math assign="discount" x=$valid_voucher_value y=$qty_days equation="x * y"}
					{/if}
					<p><strong>{$metadata.discount_label}</strong>
					{if $currency_{$item}=="EUR"}€{elseif $currency_{$item}=="GBP"}£{else}&dollar;{/if}{$discount|money_format}
					</p>
					<p><strong>{$metadata.grand_total_label}</strong>
					{assign var="discount_$item" value=$discount}
					{math assign="topay" x=$topay y=$discount equation="x - y"}
					{if $currency_{$item}=="EUR"}€{elseif $currency_{$item}=="GBP"}£{else}&dollar;{/if}{$topay|money_format}
					</p>
				{/if}
				{if $deposit_{$item}!="0"}
					{if $deposit_{$item}=="101"}
						{math assign="deposit_topay" x=$qty_days_{$item} y=$topay equation="y / x "}
						<p>{$metadata.first_night_deposit_text}</p>
					{else}
						{math assign="deposit_topay" x=$deposit_{$item} y=$topay equation="x * y / 100"}
						<p>{$metadata.percentage_deposit_text|replace:'{deposit}':$deposit_{$item}}</p>
					{/if}
				{/if}

				{if $deposit_{$item}=="0"}
					<strong>{$metadata.total_due_authorized_label}</strong>
				{else}
					<strong>{$metadata.total_due_today_label}</strong>
				{/if}
				{if $currency_{$item}=="EUR"}€{elseif $currency_{$item}=="GBP"}£{else}&dollar;{/if}{$deposit_topay|money_format}
				</p>
				{if $deposit_{$item}=="0"}
					<p>{$metadata.card_authorization_text}</p>
				{/if}
				{if $coupon_{$item}==""}
				<p class="discountButton"><a href="#">{$metadata.have_voucher_text}</a></p>
				{/if}
				<form action="" method="post" class="discount_form"{if $coupon_{$item}!=""} style="display:block"{/if}>
					<label>{$metadata.enter_coupon_text} {if $valid_voucher}<span class="voucher_valid">{$metadata.valid_text}</span>{else}{if $coupon_{$item}!=""}<span class="voucher_not_valid">{$metadata.voucher_invalid_text}</span>{/if}{/if}<br/>
					<input type ="text" name="coupon_{$item}" value="{$coupon_{$item}}"/></label>
					<input type="submit" value="{$metadata.apply_button_text}"/>
				</form>
{*
			</div>
		</div>
		<div class='column threeThirdsCol magic-heights'>
		*}

			{foreach from=$content.logged_in_user.custom_with_names item="custom"}
			{if $custom.name|strtolower=="address"}
			{assign var="address" value=$custom.value}
			{/if}
			{if $custom.name|strtolower=="comments"}
			{assign var="comments" value=$custom.value}
			{/if}
			{if $custom.name|strtolower=="city"}
			{assign var="city" value=$custom.value}
			{/if}
			{if $custom.name|strtolower=="postcode"||$custom.name|strtolower=="post code"}
			{assign var="postcode" value=$custom.value}
			{/if}
			{if $custom.name|strtolower=="country"}
			{assign var="country" value=$custom.value}
			{/if}
			{if $custom.name|strtolower=="phone"}
			{assign var="phone" value=$custom.value}
			{/if}
			{if $custom.name|strtolower=="time of arrival"}
			{assign var="arrival" value=$custom.value}
			{/if}
			{/foreach}
			<input type="hidden" name="address" value="{$address}">
			<input type="hidden" name="city" value="{$city}">
			<input type="hidden" name="postcode" value="{$postcode}">
			<input type="hidden" name="country" value="{$country}">
			<input type="hidden" name="phone" value="{$phone}">
			{*
			<div class="magic-heights-inner">
				<label>Your address:<span style="color:#f00;">*</span><br/>
				<textarea class="book-textarea" name="address">{$address}</textarea></label>
				<label>City:<span style="color:#f00;">*</span><br/>
				<input name="city" class="book-input" value="{$city}"/></label>
				<label>Postcode/Zip Code:<span style="color:#f00;">*</span><br/>
				<input name="postcode" class="book-input" value="{$postcode}"/></label>
				<label>Country:<span style="color:#f00;">*</span><br/>
				<input name="country" class="book-input" value="{$country}"></label>

			</div>
		</div>

		<div class='column  threeThirdsCol last magic-heights'>

			<div class="magic-heights-inner">
				<label>{$metadata.phone_label}<span style="color:#f00;">*</span><br/>
				<input name="phone" class="book-input" value="{$phone}"/></label>
				<label>{$metadata.arrival_time_label}<span style="color:#f00;">*</span><br/>
				<input name="arrival" class="book-input" value="{$arrival}"/></label>
				<label>{$metadata.guest_comments_label}<br/>
				<textarea name="comments" class="book-textarea">{$comments}</textarea></label>

			</div>
		</div>

	</div>
		*}
	</div>
	{assign var="showbutton" value=true}
		{else}
			<a href="#" class="removeFromBasket" data-item-id="{$item}">{$metadata.remove_booking_text}</a>
			<h4>{$bookname_{$item}}</h4>
			<p class="Icon_Alert unavailable-item" >{$metadata.property_unavailable_text}</p>
			<p class="Button_Medium"><a href="{$metadata.book_now_url}">{$metadata.go_back_text}</a></p>
		{/if}
		{/if}{* /dates check *}
		<script type="text/javascript">
		{literal}
		$(document).ready(function(){

			createCookie('bookname_{/literal}{$item}{literal}',{/literal}"{$bookname_{$item}}"{literal});
			createCookie('discount_{/literal}{$item}{literal}',{/literal}"{$discount_{$item}}"{literal});
			createCookie('roomid_{/literal}{$item}{literal}',{/literal}"{$roomid_{$item}}"{literal});
			createCookie('propkey_{/literal}{$item}{literal}',{/literal}"{$propkey_{$item}}"{literal});
			createCookie('currency_{/literal}{$item}{literal}',{/literal}"{$currency_{$item}}"{literal});
			createCookie('amount_{/literal}{$item}{literal}',{/literal}"{if $linksrez_code_{$item}!=''}{$amount_{$item}}{else}{$avail.price}{/if}"{literal});
			createCookie('numAdult_{/literal}{$item}{literal}',{/literal}"{$numAdult_{$item}}"{literal});
			createCookie('numChild_{/literal}{$item}{literal}',{/literal}"{$numChild_{$item}}"{literal});
			createCookie('offer_{/literal}{$item}{literal}',{/literal}"{$offer_{$item}}"{literal});
			createCookie('upsells_{/literal}{$item}{literal}','{/literal}{$upsells_{$item}}{literal}');
			createCookie('available_{/literal}{$item}{literal}','{/literal}{$showbutton}{literal}');
			var optional = {/literal}{$optional_{$item}}{literal};
			createCookie('optional_{/literal}{$item}{literal}',JSON.stringify(optional));
			createCookie('deposit_{/literal}{$item}{literal}',{/literal}"{$deposit_{$item}}"{literal});
			createCookie('coupon_{/literal}{$item}{literal}',{/literal}"{$coupon_{$item}}"{literal});
			createCookie('linksrez_code_{/literal}{$item}{literal}',{/literal}"{$linksrez_code_{$item}}"{literal});
			createCookie('linksrez_hotel_{/literal}{$item}{literal}',{/literal}"{$linksrez_hotel_{$item}}"{literal});
			createCookie('linksrez_rate_{/literal}{$item}{literal}',{/literal}"{$linksrez_rate_{$item}}"{literal});
			createCookie('start_{/literal}{$item}{literal}',{/literal}"{$start_{$item}}"{literal});
			createCookie('end_{/literal}{$item}{literal}',{/literal}"{$end_{$item}}"{literal});
			createCookie('topay_{/literal}{$item}{literal}',{/literal}"{$topay}"{literal});
			createCookie('total_topay_{/literal}{$item}{literal}',{/literal}"{$topay}"{literal});
			createCookie('deposit_topay_{/literal}{$item}{literal}',{/literal}"{$deposit_topay}"{literal});
		});
		{/literal}
		</script>

	{/if}
	{assign var=item value=$item+1}
	{if !$bookname_{$item}}
	{assign var=found value=false}
	{/if}
{/while}
{if $showbutton}
	<p id="pay-with-stripe" class="Button_Medium"><a href="#">{$metadata.continue_payment_text}</a></p>
	<label><input type="checkbox" name=""  id="termsCheck" /> {$metadata.terms_agreement_text|replace:'terms and conditions':"<a href=\"`$metadata.terms_url`\" target=\"_blank\">terms and conditions</a>"} </label>
{/if}
{/if}
{literal}
 <script type="text/javascript">
      // Create an instance of the Stripe object with your publishable API key
      //var checkoutButton = document.getElementById('pay-with-stripe');

      //checkoutButton.addEventListener('click', function() {
        // Create a new Checkout Session using the server-side endpoint you
        // created in step 3.

      $('#pay-with-stripe').click(function(){
        if ($(".unavailable-item").length){
		alert("{/literal}{$metadata.remove_unavailable_error|escape:'javascript'}{literal}");
		return false;
	}
        if (!$("#termsCheck").is(":checked")){
		alert("{/literal}{$metadata.accept_terms_error|escape:'javascript'}{literal}");
		return false;
	}
	if ($(this).hasClass('unavailable')){return false;}
	var address = $('input[name="address"]').val();
	var city = $('input[name="city"]').val();
	var postcode = $('input[name="postcode"]').val();
	var country = $('input[name="country"]').val();
	var phone = $('input[name="phone"]').val();
	var arrival = $('input[name="arrival"]').val();
	var comments = $('input[name="comments"]').val();
	var first_name="";
	var last_name="";
	var council="";
	if ($('input[name="first_name"]')){
	var first_name = $('input[name="first_name"]').val();
	var last_name = $('input[name="last_name"]').val();
	}
	if (address==""
	|| city == ""
	|| postcode == ""
	|| country == ""
	|| phone == ""
	|| arrival == ""
	)
	{
		//alert('Please fill out all required fields before continuing');
		//return false;
	}
	$(this).addClass('unavailable');
	createCookie("goneToPay","true");
	dataLayer.push({"event":"Continue To Payment"});
	$('#bigloader').show();
	setTimeout(function(){
		{/literal}
		fetch('?createcheckoutsession=true&app=true&nocache=1{strip}
		{/strip}&address='+address+'{strip}
		{/strip}&city='+city+'{strip}
		{/strip}&postcode='+postcode+'{strip}
		{/strip}&country='+country+'{strip}
		{/strip}&phone='+phone+'{strip}
		{/strip}&arrival='+arrival+'{strip}
		{/strip}&comments='+comments+'{strip}
		{/strip}&first_name='+first_name+'{strip}
		{/strip}&last_name='+last_name+'{strip}
		{/strip}{literal}', {
		  method: 'POST',
		})
		{/literal}
		{if $metadata.b24pay}
		.then(function(response) {
		  // First convert the response to text
		  return response.text();
		})
		{/if}
		{literal}
		.then(function(response) {
			function extractJson(htmlString) {
			  // Split the string by the !!! markers
			  const parts = htmlString.split("!!!");
			  
			  // If we have at least 3 parts (before the first !!!, the JSON, after the last !!!)
			  if (parts.length >= 3) {
			    // The JSON will be in the second position (index 1)
			    const jsonString = parts[1];
			    
			    try {
			      // Parse the JSON string to ensure it's valid
			      const jsonData = JSON.parse(jsonString);
			      return jsonData;
			    } catch (error) {
			      console.error("Failed to parse JSON:", error);
			      return null;
			    }
			  }
			  
			  return null;
			}
			{/literal}
			{if $metadata.b24pay}
				return extractJson(response);
			{else}
			  return response.json();
			{/if}
			{literal}
		})
		.then(function(session) {
		//return false;
//		console.log("About to redirect");
	{/literal}
{*
{if $smarty.cookies.bookname_1}
{assign var=found value=true}
{/if}
{assign var=item value=1}
{while $found}
*}
{literal}
//console.log("About to empty cart");
    var item = 1;
    var found = false;
if (readCookie('bookname_1')) {
    found = true;
}
while (found) {
    //console.log("Erasing "+item);
    eraseCookie('bookname_' + item);
eraseCookie('available_' + item);
eraseCookie('roomid_' + item);
eraseCookie('propkey_' + item);
eraseCookie('currency_' + item);
eraseCookie('amount_' + item);
eraseCookie('numAdult_' + item);
eraseCookie('numChild_' + item);
eraseCookie('offer_' + item);
eraseCookie('upsells_' + item);
eraseCookie('optional_' + item);
eraseCookie('deposit_' + item);
eraseCookie('linksrez_rate_' + item);
eraseCookie('linksrez_hotel_' + item);
eraseCookie('linksrez_code_' + item);
eraseCookie('lodgify_houseid_' + item);
eraseCookie('lodgify_roomtypeid_' + item);
eraseCookie('coupon_' + item);
eraseCookie('start_' + item);
eraseCookie('end_' + item);
eraseCookie('topay_' + item);
eraseCookie('total_topay_' + item);
eraseCookie('deposit_topay_' + item);
item += 1;
if (!readCookie('bookname_')+item) {
found=false
}
}
			{/literal}
{* 
{assign var="item" value=$item + 1}
{if !$smarty.cookies.{"bookname_$item"}}
{assign var=found value=false}
{/if}
{/while}
*}
{if $metadata.b24pay}
	window.location.href="https://{$metadata.b24payurl}/bookpay.php?bookid="+session.bookid+"&g=cc";
	return false;
{else}
		{literal}
		      var stripe = Stripe('pk_live_zWSW2ykzZoq4mYcKg9c8jmHS',{
			  stripeAccount: session.stripe_account
			});
		  return stripe.redirectToCheckout({ sessionId: session.id});
		  {/literal}
  {/if}
		  {literal}
		})
		{/literal}
		{if !$metadata.b24pay}
		{literal}
		.then(function(result) {
		  // If `redirectToCheckout` fails due to a browser or network
		  // error, you should display the localized error message to your
		  // customer using `error.message`.
		  if (result.error) {
		    alert(result.error.message);
		  }
		})
		.catch(function(error) {
		//return false;
		alert("{/literal}{$metadata.general_error_text|escape:'javascript'}{literal}");
		eraseCookie("goneToPay");
		location.reload();
		 // console.error('Error:', error);
		})
		{/literal}
		{/if}
		{literal}
		;
	},50);
	return false;
      });
    </script>
	{/literal}
	{if ($smarty.get.bookings && !$smarty.post.amount&&!$smarty.cookies.bookname)||$smarty.cookies.goneToPay}
	<script type="text/javascript">{literal}
	$(document).ready(function(){
		eraseCookie("goneToPay");
	});
	{/literal}</script>
		{get_user_child_data
		userid=$content.logged_in_user.id
		type="booking"
		}
		{foreach from=$user_child_data item=data}
			{if $data.bookid!=""}
			{assign var="createdtime" value=$data.created|strtotime}
			{assign var="timecheck" value=time()-60*60*24}
			{if $createdtime>$timecheck}
			{assign var="hasbookings" value=true}
			{/if}
			{/if}
		{/foreach}
		{if $hasbookings}
		<h2>{if $user_child_data|count!=1}{$metadata.multiple_bookings_text}{else}{$metadata.single_booking_text}{/if}</h2>
		{/if}
		{foreach from=$user_child_data item=data}
			{if $data.bookid!=""}
			{assign var="createdtime" value=$data.created|strtotime}
			{assign var="timecheck" value=time()-60*60*24}
			{if $createdtime>$timecheck}
				<div class="mybooking styleBox

					{assign var="test" value="`$data.lastNight` - 1 day"|date_format:"Y-m-d"}
					{if $data.status=="Paid"}
					paid
					{/if}
				"
					{if $data.status!="Paid"}
					style="border:3px solid #f00;border-radius:5px"
					{/if}
					{if $test<$smarty.now|date_format:"%Y-%m-%d"&& $data.status=="Paid"}
					style="border:3px solid #0f0;border-radius:5px"
					{/if}
				>
				<a href="?removefromaccount={$data.id}" class="removeFromMyStays" data-item-id="{$data.id}">{$metadata.remove_account_text}</a>
				{if $data.status!="Paid"}
				<p class="Icon_Alert">
					{$metadata.error_text}				</p>
				{/if}
				<p><strong>{$metadata.booking_id_label}</strong> {$data.bookid}<br/>
				<strong>{$metadata.property_label}</strong> {$data.property_name}<br/>
				<strong>{$metadata.status_label}</strong> {$data.status}<br/>
				{if $data.status=="Paid"}
				{if $data.deposit!="0"}
				{assign var="currency_symbol" value="$"}
				{if $data.currency=="EUR"}{assign var="currency_symbol" value="€"}{/if}
				{if $data.currency=="GBP"}{assign var="currency_symbol" value="£"}{/if}
				{$metadata.deposit_taken_text|replace:'{deposit}':$data.deposit|replace:'{currency}':$currency_symbol|replace:'{amount}':($data.deposit_topay|string_format:"%.2f")}<br/>
				{/if}
				{if $data.deposit=="0"}
					{$metadata.no_payment_text}
				{/if}
				{/if}
				<strong>{$metadata.total_label}</strong> {if $data.currency=="EUR"}€{elseif $data.currency=="GBP"}£{else}&dollar;{/if}{$data.total_topay|string_format:"%.2f"}<br/>
				{if $data.total_topay!=$data.deposit_topay&&$data.status=="Paid"}
				{math assign="outstanding" equation="a - b" a=$data.total_topay b=$data.deposit_topay}
				<strong>{$metadata.amount_outstanding_label}</strong> {if $data.currency=="EUR"}€{elseif $data.currency=="GBP"}£{else}&dollar;{/if}{$outstanding|string_format:"%.2f"}<br/>
				{/if}
				{if $data.status!="Paid"}
				<strong>{$metadata.amount_outstanding_label}</strong> {if $data.currency=="EUR"}€{elseif $data.currency=="GBP"}£{else}&dollar;{/if}{$data.total_topay|string_format:"%.2f"}<br/>
				{/if}

				<strong>{$metadata.arrive_label}</strong> {$data.firstNight|date_format:$active_date_format}<br/>
				<strong>{$metadata.depart_label}</strong> {$data.lastNight|date_format:$active_date_format}<br/>
				<strong>{$metadata.adults_label}</strong> {$data.adults}<br/>
				<strong>{$metadata.children_label}</strong> {$data.children}<br/>
				{assign var=upsells value=$data.upsells|json_decode:true}
				{assign var=optional value=$data.optional|json_decode:true}
				<br/>
				{foreach from=$upsells item=$upsell}
				{if $upsell.type=="2"||$upsell.type=="6"}
				{assign var="hasupsells" value="true"}
				{/if}
				{/foreach}
				{foreach from=$upsells item=$upsell}
					{if $upsell.type=="1"}
					{foreach from=$optional item="checked"}
					{if $checked==$upsell.description.EN}
					{assign var="hasupsells" value="true"}
					{/if}
					{/foreach}
					{/if}
				{/foreach}
				{if $hasupsells}
				<strong>{$metadata.included_label}</strong><br/>
				{/if}
				{foreach from=$upsells item=$upsell}
				{if $upsell.type=="2"||$upsell.type=="6"}
				{$upsell.description.EN}:
				{if $currency_{$item}=="EUR"}€{elseif $currency_{$item}=="GBP"}£{else}&dollar;{/if}{$upsell.price|string_format:"%.2f"}<br/>
				{/if}
				{/foreach}
				{foreach from=$upsells item=$upsell}
					{if $upsell.type=="1"}
					{foreach from=$optional item="checked"}
					{if $checked==$upsell.description.EN}
					<strong>{$upsell.description.EN}:</strong>
					{if $currency_{$item}=="EUR"}€{elseif $currency_{$item}=="GBP"}£{else}&dollar;{/if}{$upsell.price|string_format:"%.2f"}<br/>
					{/if}
					{/foreach}

					{/if}
				{/foreach}

				</p>
				<p class="Button_Small"><a href="{$metadata.request_change_url}?form[1]={$content.logged_in_user.first_name|urlencode}%20{$content.logged_in_user.last_name|urlencode}&form[2]={$content.logged_in_user.email|urlencode}&form[3]={$data.bookid}" target="_blank">
				{if $data.status=="Paid"}
				{$metadata.change_cancel_text}{else}

				{$metadata.error_button_text}
				{/if}</a></p>
				</div>
			{/if}
			{/if}
		{/foreach}
	{/if}
	{/if}

{* Hostvana Chat Popup *}
{if $metadata.hostvana}
<!-- Chat Badge Button -->
<div id="hv-chat-badge" class="hv-chat-badge">
	<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
		<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
	</svg>
</div>

<!-- Chat Popup Modal -->
<div id="hv-chat-popup" class="hv-chat-popup">
	<div class="hv-chat-header">
		<div class="hv-chat-title">
			<strong>{$metadata.agent}</strong>
			<span class="hv-status">{if $metadata.agent_online_status}{$metadata.agent_online_status}{else}Online{/if}</span>
		</div>
		<button class="hv-close-btn" id="hv-close-chat">&times;</button>
	</div>
	<div class="hv-chat-body">
		<div class="hv-greeting">
			<p>{if $metadata.agent_greeting}{$metadata.agent_greeting}{else}I'm here to answer any listing questions{/if}</p>
		</div>
		<div id="hvqmsgs"></div>
		<div id="hvqthinking"></div>
	</div>
	<div class="hv-chat-footer">
		<form action="/my-stay/" method="POST" id="hvq" data-agent="{$metadata.agent}">
			<input type="hidden" name="propertyid_1" value="{$page.meta.propkey}" />
			<input type="hidden" name="roomid_1" value="{$page.meta.roomid}" />
			<input type="hidden" name="bookid_1" id="hvq_book_id" value="" />
			<input type="text" id="booking-question" name="q" placeholder="{if $metadata.chat_placeholder}{$metadata.chat_placeholder}{else}Type your question here{/if}" />
			<button type="submit">{if $metadata.chat_submit_button}{$metadata.chat_submit_button}{else}Submit{/if}</button>
		</form>
	</div>
</div>

<style>
{literal}
/* Chat Badge */
.hv-chat-badge {
	position: fixed;
	bottom: 60px;
	right: 20px;
	width: 60px;
	height: 60px;
	background: #007bff;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	cursor: pointer;
	box-shadow: 0 4px 12px rgba(0,0,0,0.15);
	z-index: 9998;
	transition: all 0.3s ease;
	color: white;
}

.hv-chat-badge:hover {
	transform: scale(1.1);
	box-shadow: 0 6px 16px rgba(0,0,0,0.2);
}

/* Chat Popup */
.hv-chat-popup {
	position: fixed;
	bottom: 90px;
	right: 20px;
	width: 380px;
	max-width: calc(100vw - 40px);
	height: 500px;
	max-height: calc(100vh - 120px);
	background: white;
	border-radius: 12px;
	box-shadow: 0 8px 24px rgba(0,0,0,0.2);
	z-index: 9999;
	display: none;
	flex-direction: column;
	overflow: hidden;
}

.hv-chat-popup.active {
	display: flex;
}

.hv-chat-header {
	background: #007bff;
	color: white;
	padding: 16px 20px;
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.hv-chat-title {
	display: flex;
	flex-direction: column;
}

.hv-chat-title strong {
	color: white;
}

.hv-status {
	font-size: 12px;
	opacity: 0.9;
	color: white;
}

.hv-close-btn {
	background: none;
	border: none;
	color: white;
	font-size: 28px;
	cursor: pointer;
	line-height: 1;
	padding: 0;
	width: 30px;
	height: 30px;
	display: flex;
	align-items: center;
	justify-content: center;
}

.hv-close-btn:hover {
	opacity: 0.8;
}

.hv-chat-body {
	flex: 1;
	overflow-y: auto;
	padding: 20px;
	background: #f5f5f5;
}

.hv-greeting {
	background: white;
	padding: 12px 16px;
	border-radius: 8px;
	margin-bottom: 16px;
	box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.hv-greeting p {
	margin: 0;
	color: #333;
}

#hvqmsgs {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

#hvqthinking {
	margin-top: 12px;
}

.hvqmsg {
	padding: 12px 16px;
	border-radius: 12px;
	max-width: 70%;
	word-wrap: break-word;
	box-shadow: 0 2px 6px rgba(0,0,0,0.1);
	width: fit-content;
}

.hvqsourcehost {
	background: white;
	align-self: flex-start;
	border: 1px solid #e0e0e0;
	margin-right: auto;
}

.hvqsourceuser {
	background: #007bff;
	color: white;
	align-self: flex-end;
	border: 1px solid #0056b3;
	box-shadow: 0 2px 6px rgba(0,123,255,0.3);
	margin-left: auto;
}

.hv-chat-footer {
	padding: 16px;
	background: white;
	border-top: 1px solid #e0e0e0;
}

.hv-chat-footer form {
	display: flex;
	gap: 8px;
}

.hv-chat-footer input[type="text"] {
	flex: 1;
	padding: 10px 14px;
	border: 1px solid #ddd;
	border-radius: 6px;
	font-size: 14px;
	height: 40px;
	box-sizing: border-box;
}

.hv-chat-footer input[type="text"]:focus {
	outline: none;
	border-color: #007bff;
}

.hv-chat-footer button {
	padding: 10px 20px;
	background: #007bff;
	color: white;
	border: none;
	border-radius: 6px;
	cursor: pointer;
	font-size: 14px;
	font-weight: 500;
	transition: background 0.3s ease;
	height: 40px;
	box-sizing: border-box;
}

.hv-chat-footer button:hover {
	background: #0056b3;
}

/* Mobile Responsive */
@media (max-width: 480px) {
	.hv-chat-popup {
		bottom: 80px;
		right: 10px;
		left: 10px;
		width: auto;
		max-width: none;
	}

	.hv-chat-badge {
		bottom: 50px;
		right: 10px;
	}
}
{/literal}
</style>

<script>
{literal}
$(document).ready(function() {
	// Open chat popup
	$('#hv-chat-badge').on('click', function() {
		$('#hv-chat-popup').addClass('active');
		$('#booking-question').focus();
	});

	// Close chat popup
	$('#hv-close-chat').on('click', function() {
		$('#hv-chat-popup').removeClass('active');
	});

	// Close on outside click
	$(document).on('click', function(e) {
		if (!$(e.target).closest('#hv-chat-popup, #hv-chat-badge').length) {
			$('#hv-chat-popup').removeClass('active');
		}
	});
});
{/literal}
</script>
{/if}
