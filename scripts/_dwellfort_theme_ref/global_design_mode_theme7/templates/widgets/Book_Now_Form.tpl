{* @@@
{
        "widget_info":{
                "title":"Book Now Form"
                ,"title_info":"Enter a name for this instance of the book now form widget."
                ,"category":"setup"
        },
        "meta_data":[{
		"name":"Book Now Page"
		,"type":"linkpageonly"
		,"info":"Choose the page where your Book Now widget is set up"
		,"var":"destination"
		,"default":""
	},{
		"name":"Book Now Page ID"
		,"type":"text"
		,"design":"true"
		,"info":"Enter the book now page id"
		,"var":"destination_id"
		,"default":"55"
	},{
		"name":"British terms"
		,"type":"tick"
		,"var":"british"
		,"default":"0"
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
		"name":"Max adults"
		,"type":"text"
		,"info":"Enter the maximum number to display in room/appartment size"
		,"var":"max"
		,"default":"3"
	},{
		"name":"Max children"
		,"type":"text"
		,"info":"Enter the maximum number to display in room/appartment size"
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
		"name":"Show type filter"
		,"type":"tick"
		,"var":"showtype"
		,"default":"0"
	},{
		"name":"Inline mode"
		,"type":"tick"
		,"var":"inline"
		,"default":"0"
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
		"name":"Location Label"
		,"type":"text"
		,"info":"Location field label"
		,"var":"location_label"
		,"default":"Location:"
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
		"name":"Search Button Text"
		,"type":"text"
		,"info":"Submit button text for search form"
		,"var":"search_button_text"
		,"default":"Search"
	},{
		"name":"Properties Tag"
		,"type": "pagetagmulti"
		,"var": "proptagids"
	}],
        "inner_templates":{
        }
}
@@@ *}
{pages_by_tag tags=$metadata.proptagids assign=pages direction=asc}
{foreach from=$pages item=page}
{if $cities|is_array && $page.meta.city|in_array:$cities}{else}
{append var='cities' value=$page.meta.city}
{/if}
{if $states|is_array && $page.meta.state|in_array:$states}{else}
{append var='states' value=$page.meta.state}
{/if}
{if $bedrooms|is_array && $page.meta.bedrooms|in_array:$bedrooms}{else}
{append var='bedrooms' value=$page.meta.bedrooms}
{/if}
{*
{if $metadata.single_prop_mode}
	{get_page_child_data pageid=$metadata.destination_id type="calendar"}
	{foreach from=$page_child_data item=room}
		{if $room.values.room_accommtype|in_array:$types}{else}
		{append var='types' value=$room.values.room_accommtype}
		{/if}
	{/foreach}
{else}
*}
	{if $types|is_array && $page.meta.type|in_array:$types}{else}
	{append var='types' value=$page.meta.type}
	{/if}
{*
{/if}
*}
{if $states|@sort eq 1}{/if}
{if $cities|@sort eq 1}{/if}
{if $types|@sort eq 1}{/if}
{/foreach}
{if $metadata.inline}
<div class="styleBox clearfix inline-mode{if $metadata.hide_guests} hide-guests-mode{/if}">
<form class="exitForm" action="{$metadata.destination}" method="request">
{if $smarty.request.property}
<input type="hidden" name="property" value="{$smarty.request.property}" />
{/if}
{if $smarty.request.room}
<input type="hidden" name="room" value="{$smarty.request.room}" />
{/if}
{if $metadata.proptagids&&$metadata.show_location}
<div class="input-wrapper inline-search-hidden-select location-search clearfix input-wrapper-width-25 ">

		<label>{$metadata.where_to_go_label} 
		<select name="city">
		<option value="false">{$metadata.location_any_option}</option>
		{foreach from=$cities item=city}
		{if $city!=""}
		<option>{$city}</option>
		{/if}
		{/foreach}
		</select><span>{if $cities|is_array && $cities|count==1}{$cities[0]}{else}{$metadata.location_any_option}{/if}</span></label>

</div>
{/if}
{if $metadata.proptagids&&$metadata.show_state}
<div class="input-wrapper clearfix input-wrapper-width-100 ">


		<p>{if $metadata.british}County{else}State{/if}: 
		<select name="state">
		<option value="false">{$metadata.location_any_option}</option>
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
		<option value="false">{$metadata.location_any_option}</option>
		{foreach from=$types item=type}
		{if $type!=""}
		<option>{$type}</option>
		{/if}
		{/foreach}
		</select></p>


</div>
{else}
<input type="hidden" name="type" value="false" />
{/if}
{*
<div class="input-wrapper clearfix input-wrapper-width-50 input-wrapper-type-date">
	<label for="">{$metadata.checkin_date_label}</label>
	<input type="date" placeholder="YYYY-MM-DD" class="prevent_pastOFF default_datepicker input" name="start"/>
</div>
<div class="input-wrapper clearfix input-wrapper-width-50 input-wrapper-type-date">
	<label for="">{$metadata.checkout_date_label}</label>
	<input type="date" placeholder="YYYY-MM-DD" class="prevent_pastOFF input default_datepicker" name="end"/>
</div>
*}
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
		{if $metadata.max>1}
		<option value="2">{$metadata.multiple_guests_text|replace:'{count}':'2'}</option>
		{/if}
		{if $metadata.max>2}
		<option value="3">{$metadata.multiple_guests_text|replace:'{count}':'3'}</option>
		{/if}
		{if $metadata.max>3}
		<option value="4">{$metadata.multiple_guests_text|replace:'{count}':'4'}</option>
		{/if}
		{if $metadata.max>4}
		<option value="5">{$metadata.multiple_guests_text|replace:'{count}':'5'}</option>
		{/if}
		{if $metadata.max>5}
		<option value="6">{$metadata.multiple_guests_text|replace:'{count}':'6'}</option>
		{/if}
		{if $metadata.max>6}
		<option value="7">{$metadata.multiple_guests_text|replace:'{count}':'7'}</option>
		{/if}
		{if $metadata.max>7}
		<option value="8">{$metadata.multiple_guests_text|replace:'{count}':'8'}</option>
		{/if}
		{if $metadata.max>8}
		<option value="9">{$metadata.multiple_guests_text|replace:'{count}':'9'}</option>
		{/if}
		{if $metadata.max>9}
		<option value="10">{$metadata.multiple_guests_text|replace:'{count}':'10'}</option>
		{/if}
		{if $metadata.max>10}
		<option value="11">{$metadata.multiple_guests_text|replace:'{count}':'11'}</option>
		{/if}
		{if $metadata.max>11}
		<option value="12">{$metadata.multiple_guests_text|replace:'{count}':'12'}</option>
		{/if}
		{if $metadata.max>12}
		<option value="13">{$metadata.multiple_guests_text|replace:'{count}':'13'}</option>
		{/if}
		{if $metadata.max>13}
		<option value="14">{$metadata.multiple_guests_text|replace:'{count}':'14'}</option>
		{/if}
	</select><span>{$metadata.single_guest_text}</span></label>
</div>
{else}

<div class="input-wrapper clearfix input-wrapper-width-50 input-wrapper-type-date">
	<select name="adults">
		<option value="1">{$metadata.single_adult_text}</option>
		{if $metadata.max>1}
		<option value="2">{$metadata.multiple_adults_text|replace:'{count}':'2'}</option>
		{/if}
		{if $metadata.max>2}
		<option value="3">{$metadata.multiple_adults_text|replace:'{count}':'3'}</option>
		{/if}
		{if $metadata.max>3}
		<option value="4">{$metadata.multiple_adults_text|replace:'{count}':'4'}</option>
		{/if}
		{if $metadata.max>4}
		<option value="5">{$metadata.multiple_adults_text|replace:'{count}':'5'}</option>
		{/if}
		{if $metadata.max>5}
		<option value="6">{$metadata.multiple_adults_text|replace:'{count}':'6'}</option>
		{/if}
		{if $metadata.max>6}
		<option value="7">{$metadata.multiple_adults_text|replace:'{count}':'7'}</option>
		{/if}
		{if $metadata.max>7}
		<option value="8">{$metadata.multiple_adults_text|replace:'{count}':'8'}</option>
		{/if}
		{if $metadata.max>8}
		<option value="9">{$metadata.multiple_adults_text|replace:'{count}':'9'}</option>
		{/if}
		{if $metadata.max>9}
		<option value="10">{$metadata.multiple_adults_text|replace:'{count}':'10'}</option>
		{/if}
		{if $metadata.max>10}
		<option value="11">{$metadata.multiple_adults_text|replace:'{count}':'11'}</option>
		{/if}
		{if $metadata.max>11}
		<option value="12">{$metadata.multiple_adults_text|replace:'{count}':'12'}</option>
		{/if}
		{if $metadata.max>12}
		<option value="13">{$metadata.multiple_adults_text|replace:'{count}':'13'}</option>
		{/if}
		{if $metadata.max>13}
		<option value="14">{$metadata.multiple_adults_text|replace:'{count}':'14'}</option>
		{/if}
	</select>
</div>
<div class="input-wrapper clearfix input-wrapper-width-50 input-wrapper-type-date">
	<select name="children">
		<option value="0">{$metadata.no_children_text}</option>
		<option value="1">{$metadata.single_child_text}</option>
		{if $metadata.maxkids>1}
		<option value="2">{$metadata.multiple_children_text|replace:'{count}':'2'}</option>
		{/if}
		{if $metadata.maxkids>2}
		<option value="3">{$metadata.multiple_children_text|replace:'{count}':'3'}</option>
		{/if}
		{if $metadata.maxkids>3}
		<option value="4">{$metadata.multiple_children_text|replace:'{count}':'4'}</option>
		{/if}
		{if $metadata.maxkids>4}
		<option value="5">{$metadata.multiple_children_text|replace:'{count}':'5'}</option>
		{/if}
		{if $metadata.maxkids>5}
		<option value="6">{$metadata.multiple_children_text|replace:'{count}':'6'}</option>
		{/if}
		{if $metadata.maxkids>6}
		<option value="7">{$metadata.multiple_children_text|replace:'{count}':'7'}</option>
		{/if}
		{if $metadata.maxkids>7}
		<option value="8">{$metadata.multiple_children_text|replace:'{count}':'8'}</option>
		{/if}
		{if $metadata.maxkids>8}
		<option value="9">{$metadata.multiple_children_text|replace:'{count}':'9'}</option>
		{/if}
		{if $metadata.maxkids>9}
		<option value="10">{$metadata.multiple_children_text|replace:'{count}':'10'}</option>
		{/if}
		{if $metadata.maxkids>10}
		<option value="11">{$metadata.multiple_children_text|replace:'{count}':'11'}</option>
		{/if}
		{if $metadata.maxkids>11}
		<option value="12">{$metadata.multiple_children_text|replace:'{count}':'12'}</option>
		{/if}
		{if $metadata.maxkids>12}
		<option value="13">{$metadata.multiple_children_text|replace:'{count}':'13'}</option>
		{/if}
		{if $metadata.maxkids>13}
		<option value="14">{$metadata.multiple_children_text|replace:'{count}':'14'}</option>
		{/if}
	</select>
</div>
{/if}
{/if}{* End hide_guests check *}
<div class="input-wrapper clearfix input-wrapper-width-25">
<p class="Button_Medium submit_form"><a href="#">{$metadata.search_button_text}</a></p>
</div>

</form>
</div>
{else}
<div class="styleBox clearfix">
<form class="exitForm" action="{$metadata.destination}" method="request">
{if $smarty.request.property}
<input type="hidden" name="property" value="{$smarty.request.property}" />
{/if}
{if $smarty.request.room}
<input type="hidden" name="room" value="{$smarty.request.room}" />
{/if}
{if !$metadata.hide_guests}
{if !$metadata.show_children}
<div class="input-wrapper clearfix input-wrapper-width-100 input-wrapper-type-date">
	<select name="adults">
		<option value="1">{$metadata.single_guest_text}</option>
		{if $metadata.max>1}
		<option value="2">{$metadata.multiple_guests_text|replace:'{count}':'2'}</option>
		{/if}
		{if $metadata.max>2}
		<option value="3">{$metadata.multiple_guests_text|replace:'{count}':'3'}</option>
		{/if}
		{if $metadata.max>3}
		<option value="4">{$metadata.multiple_guests_text|replace:'{count}':'4'}</option>
		{/if}
		{if $metadata.max>4}
		<option value="5">{$metadata.multiple_guests_text|replace:'{count}':'5'}</option>
		{/if}
		{if $metadata.max>5}
		<option value="6">{$metadata.multiple_guests_text|replace:'{count}':'6'}</option>
		{/if}
		{if $metadata.max>6}
		<option value="7">{$metadata.multiple_guests_text|replace:'{count}':'7'}</option>
		{/if}
		{if $metadata.max>7}
		<option value="8">{$metadata.multiple_guests_text|replace:'{count}':'8'}</option>
		{/if}
		{if $metadata.max>8}
		<option value="9">{$metadata.multiple_guests_text|replace:'{count}':'9'}</option>
		{/if}
		{if $metadata.max>9}
		<option value="10">{$metadata.multiple_guests_text|replace:'{count}':'10'}</option>
		{/if}
		{if $metadata.max>10}
		<option value="11">{$metadata.multiple_guests_text|replace:'{count}':'11'}</option>
		{/if}
		{if $metadata.max>11}
		<option value="12">{$metadata.multiple_guests_text|replace:'{count}':'12'}</option>
		{/if}
		{if $metadata.max>12}
		<option value="13">{$metadata.multiple_guests_text|replace:'{count}':'13'}</option>
		{/if}
		{if $metadata.max>13}
		<option value="14">{$metadata.multiple_guests_text|replace:'{count}':'14'}</option>
		{/if}
	</select>
</div>
{else}

<div class="input-wrapper clearfix input-wrapper-width-50 input-wrapper-type-date">
	<select name="adults">
		<option value="1">{$metadata.single_adult_text}</option>
		{if $metadata.max>1}
		<option value="2">{$metadata.multiple_adults_text|replace:'{count}':'2'}</option>
		{/if}
		{if $metadata.max>2}
		<option value="3">{$metadata.multiple_adults_text|replace:'{count}':'3'}</option>
		{/if}
		{if $metadata.max>3}
		<option value="4">{$metadata.multiple_adults_text|replace:'{count}':'4'}</option>
		{/if}
		{if $metadata.max>4}
		<option value="5">{$metadata.multiple_adults_text|replace:'{count}':'5'}</option>
		{/if}
		{if $metadata.max>5}
		<option value="6">{$metadata.multiple_adults_text|replace:'{count}':'6'}</option>
		{/if}
		{if $metadata.max>6}
		<option value="7">{$metadata.multiple_adults_text|replace:'{count}':'7'}</option>
		{/if}
		{if $metadata.max>7}
		<option value="8">{$metadata.multiple_adults_text|replace:'{count}':'8'}</option>
		{/if}
		{if $metadata.max>8}
		<option value="9">{$metadata.multiple_adults_text|replace:'{count}':'9'}</option>
		{/if}
		{if $metadata.max>9}
		<option value="10">{$metadata.multiple_adults_text|replace:'{count}':'10'}</option>
		{/if}
		{if $metadata.max>10}
		<option value="11">{$metadata.multiple_adults_text|replace:'{count}':'11'}</option>
		{/if}
		{if $metadata.max>11}
		<option value="12">{$metadata.multiple_adults_text|replace:'{count}':'12'}</option>
		{/if}
		{if $metadata.max>12}
		<option value="13">{$metadata.multiple_adults_text|replace:'{count}':'13'}</option>
		{/if}
		{if $metadata.max>13}
		<option value="14">{$metadata.multiple_adults_text|replace:'{count}':'14'}</option>
		{/if}
	</select>
</div>
<div class="input-wrapper clearfix input-wrapper-width-50 input-wrapper-type-date">
	<select name="children">
		<option value="0">{$metadata.no_children_text}</option>
		<option value="1">{$metadata.single_child_text}</option>
		{if $metadata.maxkids>1}
		<option value="2">{$metadata.multiple_children_text|replace:'{count}':'2'}</option>
		{/if}
		{if $metadata.maxkids>2}
		<option value="3">{$metadata.multiple_children_text|replace:'{count}':'3'}</option>
		{/if}
		{if $metadata.maxkids>3}
		<option value="4">{$metadata.multiple_children_text|replace:'{count}':'4'}</option>
		{/if}
		{if $metadata.maxkids>4}
		<option value="5">{$metadata.multiple_children_text|replace:'{count}':'5'}</option>
		{/if}
		{if $metadata.maxkids>5}
		<option value="6">{$metadata.multiple_children_text|replace:'{count}':'6'}</option>
		{/if}
		{if $metadata.maxkids>6}
		<option value="7">{$metadata.multiple_children_text|replace:'{count}':'7'}</option>
		{/if}
		{if $metadata.maxkids>7}
		<option value="8">{$metadata.multiple_children_text|replace:'{count}':'8'}</option>
		{/if}
		{if $metadata.maxkids>8}
		<option value="9">{$metadata.multiple_children_text|replace:'{count}':'9'}</option>
		{/if}
		{if $metadata.maxkids>9}
		<option value="10">{$metadata.multiple_children_text|replace:'{count}':'10'}</option>
		{/if}
		{if $metadata.maxkids>10}
		<option value="11">{$metadata.multiple_children_text|replace:'{count}':'11'}</option>
		{/if}
		{if $metadata.maxkids>11}
		<option value="12">{$metadata.multiple_children_text|replace:'{count}':'12'}</option>
		{/if}
		{if $metadata.maxkids>12}
		<option value="13">{$metadata.multiple_children_text|replace:'{count}':'13'}</option>
		{/if}
		{if $metadata.maxkids>13}
		<option value="14">{$metadata.multiple_children_text|replace:'{count}':'14'}</option>
		{/if}
	</select>
</div>
{/if}
{/if}{* End hide_guests check for inline form *}
{if $metadata.proptagids&&$metadata.show_location}
<div class="input-wrapper clearfix input-wrapper-width-100 ">


		<p>{$metadata.location_label} 
		<select name="city">
		<option value="false">{$metadata.location_any_option}</option>
		{foreach from=$cities item=city}
		{if $city!=""}
		<option>{$city}</option>
		{/if}
		{/foreach}
		</select></p>

</div>
{/if}
{if $metadata.proptagids&&$metadata.show_state}
<div class="input-wrapper clearfix input-wrapper-width-100 ">


		<p>{if $metadata.british}County{else}State{/if}: 
		<select name="state">
		<option value="false">{$metadata.location_any_option}</option>
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
		<option value="false">{$metadata.location_any_option}</option>
		{foreach from=$types item=type}
		{if $type!=""}
		<option>{$type}</option>
		{/if}
		{/foreach}
		</select></p>


</div>
{else}
<input type="hidden" name="type" value="false" />
{/if}
{*
<div class="input-wrapper clearfix input-wrapper-width-50 input-wrapper-type-date">
	<label for="">{$metadata.checkin_date_label}</label>
	<input type="date" placeholder="YYYY-MM-DD" class="prevent_pastOFF default_datepicker input" name="start"/>
</div>
<div class="input-wrapper clearfix input-wrapper-width-50 input-wrapper-type-date">
	<label for="">{$metadata.checkout_date_label}</label>
	<input type="date" placeholder="YYYY-MM-DD" class="prevent_pastOFF input default_datepicker" name="end"/>
</div>
*}
<div class="formDaterange clearfix">
	<input type="hidden" class="startrange " name="start"/>
	<input type="hidden" class="endrange " name="end"/>
        <div class="formDaterangeStart"><p class="formDaterangeStartLabel prevent_past default_datepicker_double" data-cutoff="{$metadata.cutoff}" data-timezone="">{$metadata.checkin_date_label}<br/><span class="formDaterangeStartValue">&nbsp;</span></p></div><div class="formDaterangeEnd"><p class="formDaterangeEndLabel prevent_past default_datepicker_double" data-cutoff="{$metadata.cutoff}" data-timezone="">{$metadata.checkout_date_label}<br><span class="formDaterangeEndValue">&nbsp;</span></p></div></div>
<div class="input-wrapper">
	<p class="Button_Medium submit_form"><a href="#">{$metadata.search_button_text}</a></p>
</div>
</form>
</div>
{/if}
<script type="text/javascript">
	{literal}
	var startdate = readCookie("startdate");
	var enddate = readCookie("enddate");
	var adults = readCookie("adults");
	if (startdate){
		$(".startrange").val(startdate);
		$(".startrange:not(.inline-mode .startrange)").parents("form").find(".submit_form a").text("Continue Booking");
		$(".formDaterangeStartValue").text(startdate);
		$(".endrange").val(enddate);
		$(".formDaterangeEndValue").text(enddate);
		$("select[name='adults']").val(adults);
	}
	$(document).ready(function(){
	$(".inline-search-hidden-select select").change(function(){
		$(this).parents(".inline-search-hidden-select").find("span").text($(this).find(":selected").text());	
	});
	});
	{/literal}
</script>
