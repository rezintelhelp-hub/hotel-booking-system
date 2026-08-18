{* @@@
{
        "widget_info":{
                "title":"Book Now"
                ,"title_info":"Enter a name for this instance of the book now widget."
                ,"category":"setup"
		,"head_append":"<script src=\"https://unpkg.com/@googlemaps/markerclustererplus/dist/index.min.js\"></script><script src=\"https://cdnjs.cloudflare.com/ajax/libs/tween.js/16.7.0/Tween.js\"></script>"                                                                        
		,"include_js":"maps.ready.js,owl.carousel.min.js" 
        },
        "meta_data":[{
		"name":"User ID"
		,"info":"User ID"
		,"type": "text"
		,"var": "userid"
		,"design":"true"
	},{
		"name":"Properties Page"
		,"type":"linkpageonly"
		,"info":"Choose the page where your Properties page is set up"
		,"var":"destination"
		,"default":"/properties/"
	},{
		"name":"Swipable index images"
		,"type":"tick"
		,"var":"swipe"
		,"default":"0"
	},{
		"name":"Trim title up to first hyphen"
		,"type":"tick"
		,"var":"trim"
		,"default":"0"
	},{
		"name":"Require Coupon Per Offer"
		,"type":"tick"
		,"var":"reqcoupon"
		,"default":"0"
	},{
		"name":"Require Coupon Per Offer Text"
		,"type":"text"
		,"var":"reqcoupontext"
		,"default":"Please enter your voucher code to verify. Once verified, click on any property to see your special offer."
	},{
		"name":"Max size"
		,"type":"text"
		,"info":"Enter the maximum number to display in room/apartment size"
		,"var":"max"
		,"default":"3"
	},{
		"name":"Max children"
		,"type":"text"
		,"info":"Enter the maximum number to display in room/apartment size"
		,"var":"maxkids"
		,"default":"3"
	},{
		"name":"Cutoff time"
		,"type":"text"
		,"info":"Enter the cutoff time for current day bookings"
		,"var":"cutoff"
		,"default":"15:00"
	},{
		"name":"Date Format"
		,"type":"text"
		,"info":"Display format for dates"
		,"var":"date_format"
		,"design":"true"
		,"default":"%A, %B %e, %Y"
	},{
		"name":"British terms"
		,"type":"tick"
		,"var":"british"
		,"default":"0"
	},{
		"name":"Grid"
		,"type":"tick"
		,"var":"grid"
		,"default":"1"
		,"design":"true"
	},{
		"name":"Show children field"
		,"type":"tick"
		,"var":"show_children"
		,"default":"1"
	},{
		"name":"Show location field"
		,"type":"tick"
		,"var":"show_location"
		,"default":"1"
	},{
		"name":"Show state field"
		,"type":"tick"
		,"var":"show_state"
		,"default":"1"
	},{
		"name":"Hide guests field"
		,"type":"tick"
		,"info":"Hide the number of guests field and show all properties regardless of capacity"
		,"var":"hide_guests"
		,"default":"0"
	},{
		"name":"Single property mode"
		,"type":"tick"
		,"var":"single_prop_mode"
		,"default":"0"
	},{
		"name":"Show type filter"
		,"type":"tick"
		,"var":"showtype"
		,"default":"0"
	},{
		"name":"Show aux text"
		,"type":"tick"
		,"var":"showaux"
		,"default":"1"
	},{
		"name":"Excluded rooms"
		,"type":"text"
		,"info":"Comma separated list of room ids to exclude from results"
		,"var":"excluded"
		,"default":""
	},{
		"name":"Properties Tag"
		,"type": "pagetagmulti"
		,"var": "proptagids"
	},{
		"name":"Custom Google Maps API Key"
		,"type":"text"
		,"info":"Enter a Google Maps API Key here"
		,"var":"google_maps_api_key"
		,"default":""
	},{
		"name":"Custom Zoom Level"
		,"type":"text"
		,"info":"Enter a custom zoom level here (default is 10)"
		,"var":"zoom"
		,"default":"10"
	},{
		"name":"Custom Center Coords"
		,"type":"text"
		,"info":"Enter custom center coordinates here - if blank first property coords will be used."
		,"var":"center"
		,"default":""
	},{
		"name":"Custom Price Text"
		,"type":"text"
		,"info":"Enter custom price text here"
		,"var":"pricetext"
		,"default":"Price from"
	},{
		"name":"Lodgify API Key"
		,"type":"text"
		,"design":"true"
		,"default":""
		,"var":"lodgify_apikey"
	},{
		"name":"Beds24 API v2 Token"
		,"type":"text"
		,"design":"true"
		,"default":""
		,"var":"longtoken"
	},{
                "name":"Default Sort"
                ,"type": "dropdown"
                ,"var": "defsort"
                ,"default":"def"
                ,"options":[
                        {
                                "label":"Default"
                                ,"value":"def"
                        },
                        {
                                "label":"Random"
                                ,"value":"ran"
                        },
                        {
                                "label":"Low to High"
                                ,"value":"low"
                        },
                        {
                                "label":"High to Low"
                                ,"value":"high"
                        }
                ]
        },{
		"name":"Where To Go Label"
		,"type":"text"
		,"info":"Location search field label"
		,"var":"where_to_go_label"
		,"default":"Where to go?"
	},{
		"name":"Location Any Option"
		,"type":"text"
		,"info":"Default option for location dropdown"
		,"var":"location_any_option"
		,"default":"Any"
	},{
		"name":"Type Filter Label"
		,"type":"text"
		,"info":"Accommodation type filter label"
		,"var":"type_filter_label"
		,"default":"Type:"
	},{
		"name":"Check In Date Label"
		,"type":"text"
		,"info":"Check-in date field label"
		,"var":"checkin_date_label"
		,"default":"Check in"
	},{
		"name":"Check Out Date Label"
		,"type":"text"
		,"info":"Check-out date field label"
		,"var":"checkout_date_label"
		,"default":"Check out"
	},{
		"name":"Guests Label"
		,"type":"text"
		,"info":"Guest selection field label"
		,"var":"guests_label"
		,"default":"Guests"
	},{
		"name":"Single Guest Text"
		,"type":"text"
		,"info":"Text for single guest option"
		,"var":"single_guest_text"
		,"default":"1 guest"
	},{
		"name":"Multiple Guests Text"
		,"type":"text"
		,"info":"Text for multiple guests with {count} placeholder"
		,"var":"multiple_guests_text"
		,"default":"Up to {count} guests"
	},{
		"name":"Guest Singular"
		,"type":"text"
		,"info":"Singular form of guest"
		,"var":"guest_singular"
		,"default":"guest"
	},{
		"name":"Guest Plural"
		,"type":"text"
		,"info":"Plural form of guest"
		,"var":"guest_plural"
		,"default":"guests"
	},{
		"name":"Single Adult Text"
		,"type":"text"
		,"info":"Text for single adult option"
		,"var":"single_adult_text"
		,"default":"1 adult"
	},{
		"name":"Multiple Adults Text"
		,"type":"text"
		,"info":"Text for multiple adults with {count} placeholder"
		,"var":"multiple_adults_text"
		,"default":"Up to {count} adults"
	},{
		"name":"No Children Text"
		,"type":"text"
		,"info":"Text for no children option"
		,"var":"no_children_text"
		,"default":"No children"
	},{
		"name":"Single Child Text"
		,"type":"text"
		,"info":"Text for single child option"
		,"var":"single_child_text"
		,"default":"1 child"
	},{
		"name":"Multiple Children Text"
		,"type":"text"
		,"info":"Text for multiple children with {count} placeholder"
		,"var":"multiple_children_text"
		,"default":"Up to {count} children"
	},{
		"name":"Update Results Button"
		,"type":"text"
		,"info":"Submit button text for search form"
		,"var":"update_results_button"
		,"default":"Update results"
	},{
		"name":"Property Guests Label"
		,"type":"text"
		,"info":"Guest count label in property display"
		,"var":"property_guests_label"
		,"default":"guests"
	},{
		"name":"Property Bedrooms Label"
		,"type":"text"
		,"info":"Bedroom count label in property display"
		,"var":"property_bedrooms_label"
		,"default":"Bedrooms"
	},{
		"name":"Property Bathrooms Label"
		,"type":"text"
		,"info":"Bathroom count label in property display"
		,"var":"property_bathrooms_label"
		,"default":"Bathrooms"
	},{
		"name":"Stay Unavailable Message"
		,"type":"text"
		,"info":"Message when stay is unavailable"
		,"var":"stay_unavailable_message"
		,"default":"Stay unavailable. Click to see availability."
	},{
		"name":"Minimum Stay Message"
		,"type":"text"
		,"info":"Minimum stay message with {nights} placeholder"
		,"var":"minimum_stay_message"
		,"default":"Minimum stay of {nights}"
	},{
		"name":"Sort By Label"
		,"type":"text"
		,"info":"Sort dropdown label"
		,"var":"sort_by_label"
		,"default":"Sort by:"
	},{
		"name":"Sort Default Option"
		,"type":"text"
		,"info":"Default sort option"
		,"var":"sort_default_option"
		,"default":"Default"
	},{
		"name":"Sort Random Option"
		,"type":"text"
		,"info":"Random sort option"
		,"var":"sort_random_option"
		,"default":"Random"
	},{
		"name":"Sort Price High Low"
		,"type":"text"
		,"info":"Price high to low sort option"
		,"var":"sort_price_high_low"
		,"default":"Price (High to low)"
	},{
		"name":"Sort Price Low High"
		,"type":"text"
		,"info":"Price low to high sort option"
		,"var":"sort_price_low_high"
		,"default":"Price (Low to high)"
	},{
		"name":"State Any Option"
		,"type":"text"
		,"info":"Any option for state/county filter"
		,"var":"state_any_option"
		,"default":"Any"
	},{
		"name":"Type Any Option"
		,"type":"text"
		,"info":"Any option for type filter"
		,"var":"type_any_option"
		,"default":"Any"
	},{
		"name":"Map Cookie Warning"
		,"type":"text"
		,"info":"Warning message for map when cookies disabled"
		,"var":"map_cookie_warning"
		,"default":"Please enable functional cookies to view the map"
	},{
		"name":"Map Filter Message"
		,"type":"text"
		,"info":"Message showing filtered properties on map"
		,"var":"map_filter_message"
		,"default":"Showing only selected properties. Click here to show all properties."
	},{
		"name":"No Availability Message"
		,"type":"text"
		,"info":"Message when no properties are available"
		,"var":"no_availability_message"
		,"default":"Unfortunately there is no availability for your search. Please try again with different dates."
	},{
		"name":"Coupon Use Code Button"
		,"type":"text"
		,"info":"Coupon submit button text"
		,"var":"coupon_use_code_button"
		,"default":"Use code"
	},{
		"name":"Coupon Cancel Button"
		,"type":"text"
		,"info":"Coupon cancel button text"
		,"var":"coupon_cancel_button"
		,"default":"Cancel"
	}],
        "inner_templates":{
        }
}
@@@ *}
{assign var="excluded" value=","|explode:$metadata.excluded}
{pages_by_tag tags=$metadata.proptagids assign=pages direction=asc}
{foreach from=$pages item=page}
{if $cities|is_array&&$page.meta.city|in_array:$cities}{else}
{append var='cities' value=$page.meta.city}
{/if}
{if $states|is_array&&$page.meta.state|in_array:$states}{else}
{append var='states' value=$page.meta.state}
{/if}
{if $bedrooms|is_array&&$page.meta.bedrooms|in_array:$bedrooms}{else}
{append var='bedrooms' value=$page.meta.bedrooms}
{/if}
{if $metadata.single_prop_mode}
	{get_page_child_data pageid=$content.id type="calendar"}
	{foreach from=$page_child_data item=room}
		{if $types|is_array&&$room.values.room_accommtype|in_array:$types}{else}
		{append var='types' value=$room.values.room_accommtype}
		{/if}
	{/foreach}
{else}
	{if $types|is_array&&$page.meta.type|in_array:$types}{else}
	{append var='types' value=$page.meta.type}
	{/if}
{/if}
{/foreach}
{if $types && $types|@sort eq 1}{/if}
{if $states && $states|@sort eq 1}{/if}
{if $cities && $cities|@sort eq 1}{/if}
{if $smarty.get.save}
{delete_page_child_data pageid=$content.id type="calendar"}
{delete_page_child_data pageid=$content.id type="property"}
{beds24 action="getProperties" userid=$metadata.userid}
{foreach from=$properties item=property}
	{beds24 action="getPropertyRooms" propkey=$property.propKey lang=$content.language}
	{if $metadata.longtoken!=""}
	{beds24 action="getPropertyContent" propkey=$property.propKey lang=$content.language longtoken=$metadata.longtoken get_offer_pos=1}
	{else}
	{beds24 action="getPropertyContent" propkey=$property.propKey lang=$content.language}
	{/if}
	{if $property.propTypeId=="Condo"||$property.propTypeId=="Hotel"||$property.propTypeId=="Guesthouse"||$property.propTypeId=="Heritage Hotel"||$property.propTypeId=="Aparthotel"||$property.propTypeId=="Bed and Breakfast"||$property.propTypeId=="Boutique Hotel"||$property.propTypeId=="Hostel"}
		{assign var=accommtype value=$property.propTypeId}
		{assign var="propname" value=$property.name}
	{else}
		{assign var=accommtype value=$propertyContents.type}
		{if $propertyContents.displayName!=""}
		{assign var="propname" value=$propertyContents.displayName}
		{else}
		{assign var="propname" value=$property.name}
		{/if}
	{/if}
	Adding property {$property.propKey}{$propname} 
	{add_page_child_data
		pageid=$content.id
		more_data_propkey=$property.propKey
		more_data_property_name=$propname
		more_data_property_lat=$property.latitude
		more_data_property_lng=$property.longitude
		more_data_property_type=$property.propTypeId
		more_data_property_currency=$property.currency
		more_data_property_description=$propertyContents.description
		more_data_property_city=$propertyContents.city
		more_data_property_address=$propertyContents.address
		more_data_property_state=$propertyContents.state
		more_data_property_accommtype=$accommtype
		type="property"
		show_in_activity=0
	}
	{foreach from=$propertyRooms item=propertyContents}
		{if $excluded|is_array&&!$propertyContents.roomId|in_array:$excluded}
			{if $propertyContents.displayName!=""}
			{assign var="roomname" value=$propertyContents.displayName}
			{else}
			{assign var="roomname" value=$propertyContents.name}
			{/if}
			Adding room
			{pages_by_tag tags=$metadata.proptagids assign=lrchecks direction=asc filter_meta_roomid=$propertyContents.roomId}
			{foreach from=$lrchecks item=lrcheck}
			{assign var="pagetest" value=$lrcheck.meta}
			{/foreach}
			{if $pagetest.linksrez_code!=""&&$pagetest.lodgify_houseid==""}
			{assign var="calendar" value=$pagetest.calendar}
			{/if}
			{if $pagetest.linksrez_code==""&&$pagetest.lodgify_houseid==""}
			{beds24 action="getCalendar" propkey=$property.propKey roomid=$propertyContents.roomId}
			{/if}
			{if $pagetest.lodgify_houseid!=""}
			{beds24 action="getCalendarLodgify" roomtypeid=$pagetest.lodgify_roomtypeid houseid=$pagetest.lodgify_houseid apikey=$metadata.lodgify_apikey}
			{/if}
			{assign var="child_data_added" value=false}
			{assign var="child_data_exists" value=false}
			{if $smarty.request.debug}
			{$roomname}
			{$calendar|print_r}
			{/if}
			{add_page_child_data
				pageid=$content.id
				more_data_propkey=$property.propKey
				more_data_roomid=$propertyContents.roomId
				more_data_linksrez_code=$pagetest.linksrez_code
				more_data_linksrez_rate=$pagetest.linksrez_rate
				more_data_linksrez_hotel=$pagetest.linksrez_hotel
				more_data_bedrooms=$propertyContents.bedrooms
				more_data_property_name=$propname
				more_data_property_lat=$property.latitude
				more_data_property_lng=$property.longitude
				more_data_room_name=$roomname
				more_data_room_description=$propertyContents.description
				more_data_property_type=$property.propTypeId
				more_data_room_accommtype=$propertyContents.type
				more_data_images_json=$propertyContents.images|json_encode
				more_data_property_currency=$propertyContents.currency
				more_data_property_price=$propertyContents.dailyrate
				more_data_min_stay=$propertyContents.minstay
				more_data_max_people=$propertyContents.maxPeople
				more_data_deposit=$propertyContents.deposit
				more_data_max_children=$propertyContents.maxChildren
				more_data_max_adults=$propertyContents.maxAdult
				more_data_auxtext=$propertyContents.auxtext
				more_data_offer1name=$propertyContents.offer1
				more_data_offer2name=$propertyContents.offer2
				more_data_offer3name=$propertyContents.offer3
				more_data_offer4name=$propertyContents.offer4
				more_data_offer5name=$propertyContents.offer5
				more_data_offer6name=$propertyContents.offer6
				more_data_offer7name=$propertyContents.offer7
				more_data_offer8name=$propertyContents.offer8
				more_data_offer9name=$propertyContents.offer9
				more_data_offer10name=$propertyContents.offer10
				more_data_offer1id=$propertyContents.offer1id
				more_data_offer2id=$propertyContents.offer2id
				more_data_offer3id=$propertyContents.offer3id
				more_data_offer4id=$propertyContents.offer4id
				more_data_offer5id=$propertyContents.offer5id
				more_data_offer6id=$propertyContents.offer6id
				more_data_offer7id=$propertyContents.offer7id
				more_data_offer8id=$propertyContents.offer8id
				more_data_offer9id=$propertyContents.offer9id
				more_data_offer10id=$propertyContents.offer10id
				more_data_offer1desc=$propertyContents.offer1desc
				more_data_offer2desc=$propertyContents.offer2desc
				more_data_offer3desc=$propertyContents.offer3desc
				more_data_offer4desc=$propertyContents.offer4desc
				more_data_offer5desc=$propertyContents.offer5desc
				more_data_offer6desc=$propertyContents.offer6desc
				more_data_offer7desc=$propertyContents.offer7desc
				more_data_offer8desc=$propertyContents.offer8desc
				more_data_offer9desc=$propertyContents.offer9desc
				more_data_offer10desc=$propertyContents.offer10desc
				more_data_offer16=$propertyContents.offer16desc
				more_data_upsells=$propertyContents.upsells
				more_data_data=$calendar
				type="calendar"
				show_in_activity=0
			}
			{if $child_data_exists}
			Exists
			{/if}
			{if $child_data_added}
			Added: {$propertyContents.roomId}
			{/if}
		{else}
		excluding {$propertyContents.roomId}
		{/if}
	{/foreach}
{/foreach}
{flush_cache}
{/if}

<div class="styleBox clearfix inline-mode{if $metadata.hide_guests} hide-guests-mode{/if}" id="bookpagesearch">
<div class="searchinner">
<form class="exitForm" action="" method="request">
{if $smarty.request.room}
<input type="hidden" name="room" value="{$smarty.request.room}" />
{/if}
{if $metadata.proptagids&&$metadata.show_location}
<div class="input-wrapper inline-search-hidden-select location-search clearfix input-wrapper-width-25 ">

		<label>{$metadata.where_to_go_label} 
		<select name="city">
		{if $cities|count > 1}
		<option value="false">{$metadata.location_any_option}</option>
		{/if}
		{foreach from=$cities item=city}
		{if $city!=""}
		<option>{$city}</option>
		{/if}
		{/foreach}
		</select><span>{if $cities|count==1}{$cities[0]}{else}{$metadata.location_any_option}{/if}</span></label>

</div>
{/if}
{*
{if $metadata.proptagids&&$metadata.show_state}
<div class="input-wrapper clearfix input-wrapper-width-100 ">


		<p>{if $metadata.british}County{else}State{/if}: 
		<select name="state">
		<option value="false">{$metadata.state_any_option}</option>
		{foreach from=$states item=state}
		{if $state!=""}
		<option>{$state}</option>
		{/if}
		{/foreach}
		</select></p>


</div>
{/if}
{if $metadata.showtype}
<div class="input-wrapper clearfix input-wrapper-width-100">


		<p>{$metadata.type_filter_label} 
		<select name="type">
		<option value="false">{$metadata.type_any_option}</option>
		{foreach from=$types item=type}
		{if $type!=""}
		<option>{$type}</option>
		{/if}
		{/foreach}
		</select></p>


</div>
{else}
*}
<input type="hidden" name="type" value="false" id="typehidden"/>
{*{/if}*}
<div class="formDaterange clearfix">
	<input type="hidden" class="startrange " name="start"/>
	<input type="hidden" class="endrange " name="end"/>
        <div class="formDaterangeStart"><p class="formDaterangeStartLabel prevent_past default_datepicker_double" data-cutoff="{$metadata.cutoff}" data-timezone="">{$metadata.checkin_date_label}<br/><span class="formDaterangeStartValue">&nbsp;</span></p></div><div class="formDaterangeEnd"><p class="formDaterangeEndLabel prevent_past default_datepicker_double" data-cutoff="{$metadata.cutoff}" data-timezone="">{$metadata.checkout_date_label}<br><span class="formDaterangeEndValue">&nbsp;</span></p></div></div>
<div class="input-wrapper">
</div>
{if !$metadata.hide_guests}
{if !$metadata.show_children}
<div class="input-wrapper inline-search-hidden-select guest-search clearfix input-wrapper-width-100 input-wrapper-type-date">
<label>{$metadata.guests_label}
	<select name="adults">
		<option value="1">{$metadata.single_guest_text}</option>
		{for $i=2 to 50}
		    {if $metadata.max >= $i}
			<option value="{$i}">{$metadata.multiple_guests_text|replace:'{count}':$i}</option>
		    {/if}
		{/for}
	</select><span>{if $smarty.request.adults}{$smarty.request.adults}{else}1{/if} {if $smarty.request.adults&&$smarty.request.adults!=1}{$metadata.guest_plural}{else}{$metadata.guest_singular}{/if}</span></label>
</div>
{else}

<div class="input-wrapper clearfix input-wrapper-width-50 input-wrapper-type-date">
	<select name="adults">
		<option value="1">{$metadata.single_adult_text}</option>
		{for $i=2 to 50}
		    {if $metadata.max >= $i}
			<option value="{$i}">{$metadata.multiple_adults_text|replace:'{count}':$i}</option>
		    {/if}
		{/for}

	</select>
</div>
<div class="input-wrapper clearfix input-wrapper-width-50 input-wrapper-type-date">
	<select name="children">
		<option value="0">{$metadata.no_children_text}</option>
		<option value="1">{$metadata.single_child_text}</option>
		{for $i=2 to 50}
		    {if $metadata.maxkids >= $i}
			<option value="{$i}">{$metadata.multiple_children_text|replace:'{count}':$i}</option>
		    {/if}
		{/for}
	</select>
</div>
{/if}
{/if}{* End hide_guests check *}
<div class="input-wrapper">
	<p class="Button_Medium submit_form"><a href="#">{$metadata.update_results_button}</a></p>
</div>

{if $smarty.request.property}
<input type="hidden" name="property" value="{$smarty.request.property}" />
{/if}
</form>
</div>
</div>

{get_page_child_data
pageid=$content.id
type="property"
assign="properties"
}
{get_page_child_data
pageid=$content.id
type="calendar"
assign="rooms"
reverse=true
}
{if !$smarty.request.start}
{assign var=start value="+ 1 day"|strtotime|date_format:"%Y-%m-%d"}
{else}
{assign var=start value=$smarty.request.start}
{/if}
{if !$smarty.request.end}
{assign var=end value="+ 2 days"|strtotime|date_format:"%Y-%m-%d"}
{else}
{assign var=end value=$smarty.request.end}
{/if}
{if !$smarty.request.adults}
{assign var=adults value=1}
{else}
{assign var=adults value=$smarty.request.adults}
{/if}
<div class="bookpage " id="marker-map-wrap" ><div id="marker-map"><p style="margin:40px;text-align:center" class="Icon_Info">{$metadata.map_cookie_warning}</p></div><div id="marker-groups"></div></div>
<div id="book-props-wrap" class="clearfix">
<script>
{literal}
createCookie("startdate","{/literal}{$start}{literal}",0);
createCookie("enddate","{/literal}{$end}{literal}",0);
createCookie("adults","{/literal}{$adults}{literal}",0);
{/literal}</script>
{assign var="found" value=false}
{assign var="first" value=true}
{if $content.logged_in_user.id}
{assign var="loggedin" value=true}
{else}
{assign var="loggedin" value=false}
{/if}
<p id="reshowall" class="Icon_Alert" style="display:none;">{$metadata.map_filter_message}</p>
<div id="sort">{$metadata.sort_by_label} <select>
	<option {if $metadata.defsort=="def"}selected{/if} value="default">{$metadata.sort_default_option}</option>
	<option {if $metadata.defsort=="ran"}selected{/if} value="random">{$metadata.sort_random_option}</option>
	<option {if $metadata.defsort=="high"}selected{/if} value="high">{$metadata.sort_price_high_low}</option>
	<option {if $metadata.defsort=="low"}selected{/if} value="low">{$metadata.sort_price_low_high}</option>
</select></div>
{if $metadata.proptagids&&$metadata.show_state}
<div id="state">


		<p>{if $metadata.british}County{else}State{/if}: 
		<select name="state">
		<option value="false">{$metadata.state_any_option}</option>
		{foreach from=$states item=state}
		{if $state!=""}
		<option {if $smarty.get.state==$state}selected{/if}>{$state}</option>
		{/if}
		{/foreach}
		</select></p>


</div>
{/if}
{if $metadata.showtype}
<div id="type">


		<p>{$metadata.type_filter_label} 
		<select name="type">
		<option value="false">{$metadata.type_any_option}</option>
		{foreach from=$types item=type}
		{if $type!=""}
		<option {if $smarty.request.type==$type}selected{/if}>{$type}</option>
		{/if}
		{/foreach}
		</select></p>


</div>
{/if}
<div class="{if !$metadata.grid}bookpage_list{/if} magic-heights-wrap" id="blocklist">
<div class="clearfix magic-heights book_stay_block">


{foreach from=$properties item="property"}
	{assign var=perprop value=true}
	{foreach from=$rooms item="room" name="loop"}
		{if $property.propkey==$room.propkey}
			{if $smarty.request.property }
				{if $smarty.request.property==$property.propkey}
					{assign var="ok" value=true}
				{else}
					{assign var="ok" value=false}
					{assign var="others" value=true}

				{/if}
			{else}
				{assign var="ok" value=true}
				{if $metadata.proptagids}
				{if $smarty.request.state!="false" && isset($smarty.request.state)}
					{if $smarty.request.state==$property.property_state}
						{assign var="ok" value=true}
					{else}
						{assign var="ok" value=false}
					{/if}
				{/if}
				{if $smarty.request.city!="false" && isset($smarty.request.city)}
					{if $smarty.request.city==$property.property_city}
						{assign var="ok" value=true}
					{else}
						{assign var="ok" value=false}
					{/if}
				{/if}
				{if !$metadata.single_prop_mode}
					{if $smarty.request.type!="false" && isset($smarty.request.type)}
						{if $smarty.request.type==$property.property_accommtype}
							{assign var="ok" value=true}
						{else}
							{assign var="ok" value=false}
						{/if}
					{/if}
				{else}

					{if $smarty.request.type!="false" && isset($smarty.request.type)}
						{if $smarty.request.type==$room.room_accommtype}
							{assign var="ok" value=true}
						{else}
							{assign var="ok" value=false}
						{/if}
					{/if}
				{/if}
			{/if}
			{/if}
			{if !$metadata.hide_guests}
			{if $adults>$room.max_people||$adults+$smarty.request.children>$room.max_people}
				{assign var="ok" value=false}
			{/if}
			{/if}
			{if $ok}

				{if ($smarty.request.roomid&&$smarty.request.roomid==$room.roomid)||!$smarty.request.roomid}

					{if !$first}
					</div>
					<div class="clearfix magic-heights book_stay_block">
				 	{/if}
					{if $perprop}
					<div class="interactive-map-marker" data-id="{$room.roomid}" data-name="{$room.property_name|css_safe}" data-group="" data-address="" data-zoom="{$metadata.zoom}" data-center-coords="{if $metadata.center!=''}{$metadata.center}{else}{$room.property_lat},{$room.property_lng}{/if}" data-coords="{$room.property_lat},{$room.property_lng}" data-api-key="{if $metadata.google_maps_api_key!=""}{$metadata.google_maps_api_key}{else}{$google_maps_api_key}{/if}">{$room.property_name|css_safe}</div>
					{else}
					<input class="fake-map-marker" type="hidden" data-name="{$room.property_name|css_safe}" />
					{/if}
					{assign var="first" value=false}
					{capture name="col2" assign="col2"}
						<div class="swipe-wrap">
						<div class="book-now-swipe">
						{assign var="images" value=$room.images_json|json_decode:true}
						{if $metadata.swipe}

						{foreach from=$images item="image" key=key}
						{if $key<=3}

						<div class="book-slide" load-style="background-image:url('{if $image[0]|stristr:"xmlcal"}{$image[0]|replace:".png":".500.png"|replace:".jpg":".500.jpg"}{else}{$image[0]}{/if}');background-size:cover;"></div>
						{/if}
						{/foreach}
						{else}
						{*
						{foreach from=$images item="image"}
						<div class="book-slide" style="background-image:url({$image[0]});background-size:cover;"></div>
						{/foreach}
						*}
						<div class="book-slide" load-style="background-image:url('{if $images[0][0]|stristr:"xmlcal"}{$images[0][0]|replace:".png":".500.png"|replace:".jpg":".500.jpg"}{else}{$images[0][0]}{/if}');background-size:cover;"></div>
						{/if}
						</div>
						</div>
						{*</div>*}
						{if $room.property_type=="Condo"||$room.property_type=="Hotel"||$room.property_type=="Guesthouse"||$room.property_type=="Heritage Hotel"||$room.property_type=="Aparthotel"||$room.property_type=="Bed and Breakfast"||$room.property_type=="Boutique Hotel"||$room.property_type=="Hostel"}
						{else}
						{/if}

					{/capture}
					<div class="magic-heights-inner">
				{$col2}
					{if !$metadata.single_prop_mode}
						{if $metadata.trim}

						<h3 style="margin-top:0px">{$room.property_name|regex_replace:"/^[^ ]+ - /":""}</h3>
						{else}
						<h3 style="margin-top:0px">{$room.property_name}</h3>
						{/if}
						<p class="locations">{$property.property_address}, {$property.property_city}, {$property.property_state}<br/><span class="maxpeep">{$room.max_people} {$metadata.property_guests_label}</span> {if $room.bedrooms}<span class="maxbeds">{$room.bedrooms} {$metadata.property_bedrooms_label}</span>{/if} {if $room.bathrooms}<span class="maxbaths">{$room.bathrooms} {$metadata.property_bathrooms_label}</span>{/if}</p>
					{/if}
					<br/>
					</div>
					<div class="magic-heights-inner-2">
				{/if}
				{assign var="showform" value=false}
				{if $room.property_type=="Condo"||$room.property_type=="Hotel"||$room.property_type=="Guesthouse"||$room.property_type=="Heritage Hotel"||$room.property_type=="Aparthotel"||$room.property_type=="Bed and Breakfast"||$room.property_type=="Boutique Hotel"||$room.property_type=="Hostel"}
				{* fast avail *}
				{*
						{if $avail}
							{if $smarty.request.roomid}
								{if $smarty.request.roomid==$room.roomid}
									<h3>{$room.room_name}</h3>
								<input type="hidden" value="{$metadata.destination}{$room.property_name|make_url}-{$room.room_name|make_url}" class="dest">
								{/if}
							{else}
							*}
								<h4>{$room.room_name}</h4>

								<input type="hidden" value="{$metadata.destination}{$room.property_name|make_url}-{$room.room_name|make_url}" class="dest">
								{*
								{if !$minstaypass}
								{else}
								*}

					{assign var="showform" value=true}
								{*{/if}*}
								{*
							{/if}
						{else}
						{/if}
						*}
				{else}
						<input type="hidden" value="{$metadata.destination}{$room.property_name|make_url}" class="dest">
						{*
					{if ($avail&&$perprop&&$smarty.request.roomid)||(!$smarty.request.roomid&&$avail)}
					{else}
					{/if}
					{if !$minstaypass}
					{else}
					{if ($avail&&$perprop&&$smarty.request.roomid)||(!$smarty.request.roomid&&$avail)}*}
					{assign var="showform" value=true}
				{*	{/if}
					{/if}*}
				{/if}
				</div>
				{if $showform}
				{if $metadata.hide_guests}
				{assign var="people" value=1}
				{else}
				{math assign="people" equation="x + y" x=$adults y=$smarty.request.children}
				{/if}
				{beds24 action="checkFastAvailability" calendar=$room.data start=$start end=$end number=$people}
				{if $avail}
				{*	{beds24 action="getAvailabilities" start=$smarty.request.start|strtotime end=$smarty.request.end|strtotime adults=$smarty.request.adults kids=$smarty.request.children roomid=$room.roomid propkey=$property.propkey findfirstoffer="yes"}
				*}
					{if $avail}
						{assign var="sym" value="&dollar;"}
						{if $room.property_currency=="GBP"}
						{assign var="sym" value="&pound;"}
						{/if}
						{if $room.property_currency=="EUR"}
						{assign var="sym" value="&euro;"}
						{/if}
						{if $room.property_type=="Condo"||$room.property_type=="Hotel"||$room.property_type=="Guesthouse"||$room.property_type=="Heritage Hotel"||$room.property_type=="Aparthotel"||$room.property_type=="Bed and Breakfast"||$room.property_type=="Boutique Hotel"||$room.property_type=="Hostel"}
						<p>{$metadata.pricetext}: <span class="bookingPrice">{$sym}{$price|number_format:"2"}</span></p>
						{else}
						<p>{$metadata.pricetext}: <span class="bookingPrice">{$sym}{$price|number_format:"2"}</span></p>

						{/if}
					{else}
						<p>{$metadata.stay_unavailable_message}</p>
					{/if}
				{else}
					{if !$minstaypass}
					<p>{$metadata.minimum_stay_message|replace:'{nights}':$minstays}</p>
					{else}
					<p>{$metadata.stay_unavailable_message}</p>
					{/if}

				{/if}
				<div class="propdata" data-sort-order="{$smarty.foreach.loop.iteration}" data-sort-price="{$price}" data-sort-location="{$property.property_city}" data-sort-state="{$property.property_state}" data-sort-type="{$room.property_type}"></div>
					{*

									<form class="propSearchForm" action="/my-stay/" method="post">
									<input type="hidden" name="propertyid" value="{$property.propkey}" />
									<input type="hidden" name="roomid" value="{$room.roomid}" />
									<input type="hidden" name="propertyname" value="{$room.property_name} - {$room.room_name}" />
									<input type="hidden" name="start" value="{$smarty.request.start}" />
									<input type="hidden" name="amount" value="{$room.property_price}" />
									<input type="hidden" name="currency" value="{$room.property_currency}" />
									<input type="hidden" name="end" value="{$smarty.request.end}" />
								{if $room.max_adults==0}
									{assign var="adults" value=$room.max_people}
								{else}
									{assign var="adults" value=$room.max_adults}
								{/if}
								<input type="hidden" name="adults" value="{$smarty.request.adults}" />
								{if $metadata.show_children}
									<input type="hidden" name="children" value="{$smarty.request.children}" />
								{/if}
								<input type="hidden" name="findfirstoffer" value="yes"/>

								<input type="hidden" name="deposit" value="{$room.deposit}"/>
						{if $room.property_type=="Hotel"||$room.property_type=="Guesthouse"||$room.property_type=="Heritage Hotel"||$room.property_type=="Aparthotel"||$room.property_type=="Bed and Breakfast"||$room.property_type=="Boutique Hotel"}
								<p>Room Price: <span class="bookingPrice">Getting latest price</span></p>
								{else}
								<p>Accommodation Price: <span class="bookingPrice">Getting latest price</span></p>

								{/if}
									</form>
									*}
				{/if}
				{assign var="found" value=true}
				{assign var=perprop value=false}
			{/if}
		{/if}
	{/foreach}
{/foreach}
</div>
</div>
{if $others}
{*
<div class="styleBox">
<p class="Icon_Info">There are other rooms/properties available. <a href="?start={$smarty.request.start}&end={$smarty.request.end}&adults={$smarty.request.adults}">Click here to search all available.</a></p>
</div>
*}
{/if}
{if !$found}
<div class="styleBox">
<p class="Icon_Info">{$metadata.no_availability_message}</p>
</div>
{else}
{/if}
</div>

<script type="text/javascript">
	{literal}
	var startdate = readCookie("startdate");
	var enddate = readCookie("enddate");
	var adults = readCookie("adults");
	if (startdate){
		//$(".startrange").val(startdate).parents("form").find(".submit_form a").text("Continue Booking");
		$(".startrange").val(startdate);
		$(".formDaterangeStartValue").text(startdate);
		$(".endrange").val(enddate);
		$(".formDaterangeEndValue").text(enddate);
		$("select[name='adults']").val(adults);
	}
	$(".book-now-swipe").each(function(){
		$(this).owlCarousel({
		slideSpeed : 0,
		itemsScaleUp : false,
		singleItem : true,
		paginationSpeed : 400,
		navigationText : ["&lt;","&gt;"],
		navigation:false,
   		});
	});
	$("#reshowall a").click(function(){
	$(".book_stay_block").removeClass("highlightMap").removeClass("mapHidden");
	$("#reshowall").hide();
	return false;
	});
	function markerMapHook(loc){
	$("#reshowall").show();
	setTimeout(function(){
	$(".book_stay_block").removeClass("highlightMap").addClass("mapHidden");
	$(".fake-map-marker[data-name='"+loc+"'],.interactive-map-marker[data-name='"+loc+"']").each(function(){ 
	$(this).parent().addClass("highlightMap").removeClass("mapHidden");
	magicHeights();
	//$("body,html").animate({
	        $("body,html").scrollTop(0);
	//}, 2000);
	});
	},10);
	}
	function calcMapHeight() {
	if (window.innerWidth<=850){
	return false;
	}
	if ($("#mobileheader:visible").length){
		$header = $("#mobileheader");
	} else {
		$header = $("#header");
	}
		$("#bookpagesearch").css("top",$header.outerHeight()+parseInt($("body").css("padding-top"))+"px");
		var offsetcalc = $header.outerHeight()+$("#bookpagesearch").outerHeight()+parseInt($("body").css("padding-top"));
		var h = $(window).height()-offsetcalc;
		$("#marker-map-wrap").css("height",h+"px").css("top",offsetcalc);
		if ($("#mobileheader:visible").length){
		var pt = offsetcalc - 50; 
		} else {
		var pt = $("#bookpagesearch").height() + 50; 
		}
		$("#book-props-wrap").css("padding-top",pt+"px");
		var ft = $("#footer").offset().top;
		var st = $(document).scrollTop();
		if (st+$(window).height()>ft){
			var footeroffset = st+$(window).height()-ft;
			var nh = offsetcalc-footeroffset;
			$("#marker-map-wrap").css("top",nh);
		}
		if (st<0){
			var pos = Math.abs(st);
			$("#marker-map-wrap").css("top",offsetcalc+pos);
		}
	}
	$(document).ready(function(){
		$(".book_stay_block").each(function(){
			$(this).data("sort-order",$('.propdata',$(this)).data("sort-order"));
			$(this).data("sort-price",$('.propdata',$(this)).data("sort-price"));
			$(this).data("sort-location",$('.propdata',$(this)).data("sort-location"));
			$(this).data("sort-state",$('.propdata',$(this)).data("sort-state"));
			$(this).data("sort-type",$('.propdata',$(this)).data("sort-type"));
		});
		$("#state select").change(function(){
			$("#bookpagesearch form").append("<input type='hidden' name='state' value='"+$(this).val()+"'>").submit();
		});
		$("#type select").change(function(){
			$("#bookpagesearch form #typehidden").val($(this).val()).parents("form").submit();
		});

		$("#sort select").change(function(){
		    if ($(this).val()=="low"){
			$(".book_stay_block")
			    .sort((a,b) => $(a).data("sort-price") - $(b).data("sort-price"))
			    .appendTo("#blocklist");
		    }
		    if ($(this).val()=="high"){
			$(".book_stay_block")
			    .sort((a,b) => $(b).data("sort-price") - $(a).data("sort-price"))
			    .appendTo("#blocklist");
		    }
		    if ($(this).val()=="location"||$(this).val()=="state"||$(this).val()=="type"){
			var val = $(this).val();
			$(".book_stay_block")
			    .sort(
				(a,b) => $(a).data("sort-"+val).toUpperCase().localeCompare($(b).data("sort-"+val).toUpperCase())
			    )
			    .appendTo("#blocklist");
		    }
		    if ($(this).val()=="default"){
			$(".book_stay_block")
			    .sort((a,b) => $(a).data("sort-order") - $(b).data("sort-order"))
			    .appendTo("#blocklist");
		    }
		    if ($(this).val()=="random"){
			$(".book_stay_block")
			    .sort(() => Math.random() - 0.5)
			    .appendTo("#blocklist");
		    }

		    $(".book_stay_block").each(function(){
			if (!$(this).find(".bookingPrice").length){
			    $(this).insertAfter($(".book_stay_block:last"));
			}
		    });
		    magicHeights();
		}).trigger("change");
		$(".book_stay_block").click(function(){
		   var dest = $(this).find(".dest").val();
		   var startdate = $(".startrange").val();
		   var enddate = $(".endrange").val();
		   var adults = $("select[name='adults']").val();
		   var children = $("select[name='children']").val();

		   // Build query string with search parameters
		   var params = [];
		   if (startdate) params.push("start=" + encodeURIComponent(startdate));
		   if (enddate) params.push("end=" + encodeURIComponent(enddate));
		   if (adults) params.push("adults=" + encodeURIComponent(adults));
		   if (children) params.push("children=" + encodeURIComponent(children));

		   if (params.length > 0) {
		       dest += (dest.indexOf('?') > -1 ? '&' : '?') + params.join('&');
		   }

		   window.location.href = dest;
		});
		calcMapHeight();
		$("body").click(function(){
		$(".book_stay_block").css("opacity","1").removeClass("highlightMap");
		});
	});
	$(window).load(function(){
		calcMapHeight();
	});
	$(document).scroll(function(){
		calcMapHeight();
	});

	{/literal}
</script>
{if $metadata.reqcoupon&&!$smarty.cookies.output_reqCoupon}
{* $theme_vars_discount_1_codes *}
<div id="reqcouponwrap">
<div id="reqcoupon" class="clearfix">
	<form action="/my-stay/">
	<input type="hidden" name="ajax" value="true"/>
		<div class="input-wrapper">
			<p>{$metadata.reqcoupontext}</p>
			<input class="input" name="checkvoucher" value="" id="reqcouponinput"/>
			<p class="Button_Medium"><span class="submit_form"><a href="#">{$metadata.coupon_use_code_button}</a></span>
			 <a id="closeReqCoupon" href="#">{$metadata.coupon_cancel_button}</a></p>
		</div>
	</form>
</div>
</div>
{/if}
