{* @@@
{
	"widget_info":{
		"title":"Advanced Form"
		,"title_info":"Enter a name for this instance of the contact form widget. This form uses standard page-building tools to enable you to add fields using columns and other page layout widgets. Drop Form Field widgets into the editable zone once you add this widget to your page. You can use Groups to move your fields into layout widgets."
		,"category":"forms"
		,"include_js":"encryption-manager.js,form-encryption.js"
	},
	"meta_data":[{
		"name":	"Email results to"
		,"info":"Enter one or more email addresses below (separated by commas). Form submissions will be sent to these addresses."
		,"type": "text"
		,"default": ""
		,"var":  "destination"
		,"set_to_creator":  "true"
	},{
		"name":	"Redirect on send"
		,"type": "choose_page"
		,"default": ""
		,"var":  "redirect_on_send"
	},{
		"name":"Auto-responder"
		,"type": "choose_email"
		,"info":"Choose an email to use to automatically reply to the visitor who completes the form"
		,"var": "autoresponder"
		,"default":""
	},{
		"name":	"Submit Button Text"
		,"info":"Enter the text that the submit button for this form should use."
		,"type": "text"
		,"default": "Submit"
		,"var":  "submit_text"
	},{
		"name":	"Thanks message"
		,"info":"Enter a customised message to be displayed when the form is successfully sent (not displayed if ‘redirect to page on send’ is enabled)"
		,"type": "text"
		,"default": "Thank you - your form was successfully sent"
		,"var":  "thanks_message"
	},{
		"name":	"Filter rules"
		,"info": "Add words or phrases separated by commas to filter submissions. If any of the form field values contain any of the phrases you won't receive an email for the submission. CSV export will still contain all submissions."
		,"type": "text"
		,"default": ""
		,"var": "filter_rules"
	},{
		"name":	"Omit data from email"
		,"type": "tick"
		,"default": "0"
		,"var":  "hide_content"
	},{
		"name":	"Add outline"
		,"type": "tick"
		,"default": "0"
		,"var":  "add_outline"
	},{
		"name":	"Full width"
		,"type": "tick"
		,"default": "0"
		,"var":  "outline_fills_space"
	},{
		"name":	"Centered"
		,"type": "tick"
		,"default": "0"
		,"var":  "centered"
	},{
		"name":	"Add to user list"
		,"type": "user_list"
		,"default": "0"
		,"var":  "add_to_newsletter_id"
	},{
		"name":	"Redirect on choose password"
		,"info": "Choose a page to redirect the user to after they have chosen thier passord and logged in for the first time."
		,"type": "text"
		,"default": ""
		,"var": "redirect_on_choose_password"
	},{
		"name":	"Login immediately"
		,"type": "tick"
		,"default": "0"
		,"var":  "allow_guest_login"
	},{
		"name":	"Defer choose password"
		,"type": "tick"
		,"default": "0"
		,"var":  "defer_choose_password"
	},{
		"name":	"Disable Recaptcha"
		,"type": "tick"
		,"default": "0"
		,"var":  "disable_recaptcha"
	},{
		"name":	"Hide SSO links"
		,"type": "tick"
		,"default": "0"
		,"var":  "hide_sso"
	},{
		"name":	"Include editable categories"
		,"type": "tick"
		,"default": "0"
		,"var":  "include_categories"
	}]
}
@@@ *}
{if $metadata.form_id==""}
{add_form title=$metadata.instance_title}
{add_widget_meta name=form_id value=$form_id instance_id=$metadata.instance_id}
{else}
{assign var="value_check" 
value="`$metadata.redirect_on_choose_password``$metadata.instance_title``$metadata.destination``$metadata.redirect_on_send``$metadata.autoresponder``$metadata.submit_text``$metadata.thanks_message``$metadata.filter_rules``$metadata.hide_content``$metadata.add_outline``$metadata.outline_fills_space``$metadata.centered``$metadata.add_to_newsletter_id``$metadata.allow_guest_login``$metadata.defer_choose_password``$metadata.hide_sso``$metadata.disable_recaptcha``$metadata.include_categories`"
}
{if $value_check!=$metadata.value_check}
{edit_form 
form_id=$metadata.form_id
title=$metadata.instance_title
values=$metadata
}
{add_widget_meta name=value_check 
value=$value_check
instance_id=$metadata.instance_id}
{/if}
{/if}
{get_form
formid=$metadata.form_id
theme_vars=$theme_vars
lang=$language
dm_template=$dm_template
}
{if !$usedInBookingProd}
{assign var=hide_stock_threshold value=1000}
{if $smarty.get.form_sent!="true"}{else}
<h2>{$langs.Form_Sent}</h2>
{/if}
{if $smarty.get.formSpam!="true"}{else}
<h2>{$langs.Form_Error}</h2>
{/if}
{if $hide_sso==0 && $signupform}
	{if $mssso} 
	<p class="SSO_Button SSO_Microsoft"><a href="/actions/LoginMSSSO/?sso_add_to={$logintogroup}">Sign in with Microsoft</a></p>
	{/if}
	{if $fbsso} 
	<p class="SSO_Button SSO_Facebook"><a href="/actions/LoginFBSSO/?sso_add_to={$logintogroup}">Sign in with Facebook</a></p>
	{/if}
	{if $googlesso} 
	<p class="SSO_Button SSO_Google"><a href="/actions/LoginGoogleSSO/?sso_add_to={$logintogroup}">Sign in with Google</a></p>
	{/if}
	{if $mssso||$fbsso}
	<p>Or register below:</p>
	{/if}
{/if}
{if $emailupdated}
<p class="Icon_Info">Your email has been updated</p>
{/if}
{if $formId=="newsletter"}
<form action="/actions/NewsletterAdd/" method="post" class="clearfix form signupForm " enctype="multipart/form-data" >
{if !$usedInBookingProd}
<div class='form-style-box {if $add_outline}styleBox {/if} clearfix {if $outline_fills_space}outlinefills{else}nooutlinefills{/if} {if $centered}centered{/if}'>
	<input type='hidden' name="language" value="{$language}">
{/if}
{else}
<form action="{if $usedInCheckout}/actions/BuyerCheckoutForm/{else}/actions/FormSend/{/if}" method="post" class="clearfix form-{$formId} form {if $basketForm}formProduct addToBasketForm{/if} {if $usedInCheckout}formUsedInCheckout{/if} {if !$choosingpassword&&$logged_in_and_saving}reload_on_send{/if} {if $global_invis_recaptcha && !$usedInBookingProd && !$basketForm && !$usedInCheckout}withInvisRecaptcha{/if} {if $sms_enabled&&$sms_out_only&&!$choosingpassword&&$willallowlogin && $signupform}confirmSMSBeforeLogin{/if}" enctype="multipart/form-data" >
{if !$usedInBookingProd}
<div class='clearfix form-style-box {if $add_outline}styleBox {/if} {if $outline_fills_space}outlinefills{else}nooutlinefills{/if} {if $centered}centered{/if}'>
{/if}
{/if}
{else}
<h3 class='booking-person-title'></h3>
{/if}
{if $centered &&$outline_fills_space}
<div class="forminnerwrapcentered">
{/if}
{if $basketForm}
	<div class="productInner">
{/if}

{if $basketForm}
<input type="hidden" name="addToBasketId" value="{$basketForm}" id="addToBasketId"/>
{/if}
{if !$usedInBookingProd}
<input type="hidden" name="formId" value="{$formId}"/>
<input type="hidden" name="checkowner" value="true"/>

<label for="email1" class="fakeemail">{$langs.Are_You_Human}<br/>
 	{$langs.Are_You_Human_Instructions}
</label>
<input type="text" maxlength="256" id="email1" title="{$langs.Are_You_Human_Instructions}" name="email1" value="" class="email1 input"/>
{/if}
{$editable.form_fields}
{*
{foreach from=$inputs item=input key=key name=loop1}
{assign var=x value=$smarty.foreach.loop1.iteration}
<div class="input-wrapper clearfix input-wrapper-width-{$input.width} input-wrapper-type-{$input.type} input-wrapper-label-{$input.label|css_safe} input-wrapper-number-{$x} {if $input.required=="yes"}input-wrapper-required{else}input-wrapper-not-required{/if}" >

{if $input.type != "checkbox"&&$input.type != "radiogroup"&&$input.type!="heading"&&$input.type!="text"&&$input.type!="hidden"&&$input.type!="hr"&&$input.type!="clear"}
<label class="label_{$input.label|css_safe} {if $input.required=="yes"}required_label{/if}" for="f_{$formId}_i_{$input.id|css_safe}">{$input.label|bpe_to_html}</label>
{/if}
	{if $input.type=="hr"}
		<div class='hr'></div>
	{/if}
	{if $input.type=="clear"}
		<div class='clear'></div>
	{/if}
	{if $input.type=="heading"}
		<h2 class="formHeading_{$input.label|css_safe}">{$input.label|bpe_to_html}</h2>
	{/if}
	{if $input.type=="text"}
		<p class="formText_{$input.label|css_safe}">{$input.label|bpe_to_html}</p>
	{/if}
	{if $input.type == "phone"}
		<input {if $input.disabled}disabled{/if} {if $input.required=="yes"}required{/if}  id="f_{$formId}_i_{$input.id|css_safe}" type="tel" maxlength="256" title="{$input.label}" name="{$input.id}" class="input input_{$input.label|css_safe}{if $input.required=="yes"} required{/if}" value="{$input.value}{if $smarty.foreach.loop1.iteration==$inputpop}{$val}{/if}{$prepops.$x}"/>
	{/if}
	{if $input.type == "short"||$input.type == "name"}
		<input {if $input.disabled}disabled{/if} {if $input.required=="yes"}required{/if}  id="f_{$formId}_i_{$input.id|css_safe}" type="text" maxlength="256" title="{$input.label}" name="{$input.id}" class="input input_{$input.label|css_safe}{if $input.required=="yes"} required{/if}" value="{$input.value}{if $smarty.foreach.loop1.iteration==$inputpop}{$val}{/if}{$prepops.$x}"/>
	{/if}
	{if $input.type == "daterange"}
		<div class="formDaterange clearfix">
		<input  id="f_{$formId}_i_{$input.id|css_safe}" type="hidden" maxlength="256" name="{$input.id}" class="combinedrange" value="{$input.value}{if $smarty.foreach.loop1.iteration==$inputpop}{$val}{/if}{$prepops.$x}"/>
		<div class="formDaterangeStart"><p class="formDaterangeStartLabel default_datepicker_double">Start<br/><span class="formDaterangeStartValue">&nbsp;</span></p></div><div class="formDaterangeEnd"><p class="formDaterangeEndLabel default_datepicker_double">End<br><span class="formDaterangeEndValue">&nbsp;</span></p></div></div>
	{/if}
	{if $input.type == "date"}
		<input {if $input.required=="yes"}required{/if}  id="f_{$formId}_i_{$input.id|css_safe}" type="date" maxlength="256" title="{$input.label}" name="{$input.id}" class="input default_datepicker input_{$input.label|css_safe}{if $input.required=="yes"} required{/if}" value="{$input.value}{if $smarty.foreach.loop1.iteration==$inputpop}{$val}{/if}{$prepops.$x}"/>
	{/if}
	{if $input.type=="password"}
		<input type="password" title="{$input.label}" name="{$input.id}" class="input input_{$input.label|css_safe}{if $input.required=="yes"} required{/if}" value="{$input.value}{if $smarty.foreach.loop1.iteration==$inputpop}{$val}{/if}{$prepops.$x}"/>
	{/if}
	{if $input.type == "email"}
		<input {if $input.disabled}disabled{/if} {if $input.required=="yes"}required{/if}  id="f_{$formId}_i_{$input.id|css_safe}" type="email" maxlength="256" title="{$input.label}" name="{$input.id}" class="input input_{$input.label|css_safe}{if $input.required=="yes"} required{/if}" value="{$input.value}{if $smarty.foreach.loop1.iteration==$inputpop}{$val}{/if}{$prepops.$x}"/>
		<p id="emailIncorrect" class="Icon_Alert">Please check your email address for errors</p>
	{/if}
	{if $input.type == "hidden"}
		<input id="f_{$formId}_i_{$input.id|css_safe}" type="hidden" name="{$input.id}" class="input input_{$input.label|css_safe}" value="{$input.value}"/>
	{/if}
	{if $input.type == "long"}
		<textarea {if $input.required=="yes"}required{/if} id="f_{$formId}_i_{$input.id|css_safe}" rows="5" title="{$input.label}" cols="40" name="{$input.id}" class="textarea textarea_{$input.label|css_safe}{if $input.required=="yes"} required{/if}" maxlength="2000">{if $smarty.foreach.loop1.iteration==$inputpop}{$val}{/if}{$input.value}{$prepops.$x}</textarea>

	{/if}
	{if $input.type == "file"}
		<input {if $input.required=="yes"}required{/if} id="f_{$formId}_i_{$input.id|css_safe}"  type="file" title="{$input.label}" name="{$input.id}" value="" class="inputFile inputFile_{$input.label|css_safe}{if $input.required=="yes"} required{/if}"/>
		<div id="filelabel_f_{$formId}_i_{$input.id|css_safe}" class="filenameLabel"></div>
	{/if}
	{if $input.type == "checkbox"}


		<input type="checkbox" {if $input.required=="yes"}required{/if} title="{$input.label}" name="{$input.id}" class="checkbox checkbox_{$input.label|css_safe}{if $input.required=="yes"} required{/if}" value="{$input.value}{$prepops.$x}{if $input.value==""&&$prepops.$x==""}true{/if}" {if $smarty.foreach.loop1.iteration==$inputpop}checked="checked"{/if} {if $prepops.$x}{if $prepops.$x==$input.value}checked="checked"{/if}checked="checked"{/if} id="cb_{$formId}_{$input.id|css_safe}">
				<label for="cb_{$formId}_{$input.id|css_safe}" {if $input.required=="yes"}class="required_label"{/if}><span>{$input.label|bpe_to_html}</span></label>

	{/if}
	{if $input.type == "select"}
		{assign var=options value="**!!**"|explode:$input.options}
		<select id="f_{$formId}_i_{$input.id|css_safe}" name="{$input.id}" {if $input.required=="yes"}required{/if} class="select select_{$input.label|css_safe} {if $input.required=="yes"} required{/if}">
			{if $input.required=="yes"}<option value=""></option>{/if}
			{foreach from=$options item=option name=optionsList}
			<option value="{$option|htmlspecialchars}" {if $smarty.foreach.loop1.iteration==$inputpop &&  $smarty.foreach.optionsList.iteration==$val}selected="selected"{/if} {if $prepops.$x}{if $prepops.$x==$option}selected="selected"{/if}{/if}>{$option}</option>
			{/foreach}
		</select>
	{/if}
	{if $input.type == "sms"}
		<div class="sms_country {if $content.logged_in_user.sms_number}with-badge{/if}">
		{geolocate}
		<select id="f_{$formId}_i_{$input.id|css_safe}" name="sms_country" class="select select_{$input.label|css_safe} {if $input.required=="yes"} required{/if}">
			{foreach from=$countries item=option name=optionsList}
			<option value="{$option.number|htmlspecialchars}" {if $country}{if (!$input.sms_country&&$country==$option.country)||($input.sms_country&&$input.sms_country==$option.number)}selected="selected"{/if}{else}{if (!$input.sms_country&&$default_country==$option.number)||($input.sms_country&&$input.sms_country==$option.number)}selected="selected"{/if}{/if}>{$option.country_full}</option>
			{/foreach}
		</select>
		</div>
		<div class="sms_number {if $content.logged_in_user.sms_number}with-badge{/if}">
		<input id="f_{$formId}_ii_{$input.id|css_safe}" type="tel" maxlength="15" title="{$input.label}" name="{$input.id}" class="input input_{$input.label|css_safe}{if $input.required=="yes"} required{/if}" value="{if $smarty.foreach.loop1.iteration==$inputpop}{$val}{/if}{$input.value}{$prepops.$x}"/>

		</div>
		{if $content.logged_in_user}
		{if $content.logged_in_user.sms_verified}
			<p class="sms-verified">Your SMS number {$content.logged_in_user.sms_number} is verified.</p>
		{else}
			{if !$smarty.post.code&&$content.logged_in_user.sms_number}

			<p class="sms-reverify"><a href="" id="reverify">Need a new code?</a></p>

			{/if}
		{/if}
		{/if}
	{/if}
	{if $input.type == "radiogroup"}
		<fieldset>
			<legend class="label_{$input.label|css_safe} {if $input.required=="yes"}required_label{/if}">{$input.label|bpe_to_html}</legend>
			{assign var=options value="**!!**"|explode:$input.options}
			{if $input.required=="yes"}
				{foreach from=$options item=option name=optionsloop key=loop1}

				<input {if $input.required=="yes"}required{/if} type="radio" id="radio{$option|css_safe}{$input.id|css_safe}{$smarty.foreach.option.iteration}" name="{$input.id}" value="{$option}" class="radio radio_{$input.label|css_safe}" {if $smarty.foreach.optionsloop.iteration=="1"} checked="checked"{/if} {if $prepops.$x}{if $prepops.$x==$option}checked="checked"{/if}{/if}/> 
				<label for="radio{$option|css_safe}{$input.id|css_safe}{$smarty.foreach.option.iteration}" class="withradio"><span>{$option}</span></label>
				{/foreach}
			{else}
				{foreach from=$options item=option name="option"}
				
				<input {if $input.required=="yes"}required{/if} type="radio" name="{$input.id}" id="radio{$option|css_safe}{$input.id|css_safe}{$smarty.foreach.option.iteration}" value="{$option}" class="radio radio_{$option|css_safe}" {if $prepops.$x}{if $prepops.$x==$option}checked="checked"{/if}{/if} />
				<label for="radio{$option|css_safe}{$input.id|css_safe}{$smarty.foreach.option.iteration}" class="withradio"><span>{$option}</span></label>
				{/foreach}

			{/if}
		</fieldset>
	{/if}
	
	
	</div>
	

{/foreach}

*}

	<div class="clear"></div>
	
	{if !$usedInBookingProd && !$basketForm}
		{if !$usedInCheckout}
			{if $recaptcha_key!=""}
					{if $recap_ts}
						<div id="recap{$formId}" class="cf-turnstile" data-sitekey="{$recaptcha_key}"></div>
					{else}
						<div id="recap{$formId}" class="g-recaptcha{if $global_invis_recaptcha}load{/if}" {if $global_invis_recaptcha}data-size="invisible" data-recap-callback="invisRecaptcha"{/if} data-sitekey="{$recaptcha_key}"></div>
					{/if}
			{/if}
		{/if}
	{/if}

	{if !$variants}
	{if $price}
<p class="stockAndPrice">
	<span class="price">{$curSym}{$price}{if $checkout_tax && $add_tax && $indicate_net} <span class="salestax">+ {$sales_tax_name}</span>{/if}</span>
	{if $in_stock<$hide_stock_threshold && $theme_vars_hide_stock_levels==0}
	<span class="stock {if $in_stock<$warning_stock_threshold}warning{/if}">{$langs.In_Stock}: <strong>{$in_stock}</strong></span>
	{/if}
	</p>
	{/if}
	{/if}
		{if $variants}
		<select name="variant_price" {if $separate_stock_for_options}class="separateOptionStock" data-product-code="{$code}"{/if}>
		{if $separate_stock_for_options}<option value="" selected>{$langs.Please_Choose|htmlspecialchars}</option>{/if}
		{foreach from=$variants item=variant key=key name=loop1}
			<option value="{$variant.name|htmlspecialchars}" {if ($variant.stock==""||$variant.stock=="0") && $separate_stock_for_options && $only_sell_if_in_stock}disabled{/if}>{$variant.name} ({$curSym}{$variant.price}) {if $checkout_tax && $add_tax && $indicate_net}+ {$sales_tax_name}{/if}){if ($variant.stock==""||$variant.stock=="0") && $separate_stock_for_options && $only_sell_if_in_stock} - {if $sold_out_message==""}{$langs.Currently_Unavailable}{else}{$sold_out_message}{/if}{/if}</option>
		{/foreach}
		</select>
		<div class="clear"></div>
		{/if}
{if !$usedInBookingProd}	
		{if !$usedInCheckout}
			<p id="alreadyregistered" class=" Icon_Alert">Error: You have already have an account in our system. If you need to generate a new password you can do this from the login page.</p>
			{if !$choosingpassword && $willallowlogin && $signupform && $sms_enabled} 
				<p class="signupFormNeedsEmailOrSMS Icon_Alert">Please enter an email or number</p>
			{/if}
				<p class="Icon_Alert cf_contains_errors" >* Please fill out all required fields</p>
				{if $recaptcha_key!=""}
				<p id="recaptcha_error" class="cf_contains_errors_captcha Icon_Alert">Error: Please check the reCAPTCHA</p>
				{/if}
			
			{if $variants}

				<p class="button submit_form hide_if_no_js {if  $only_sell_if_in_stock && $separate_stock_for_options}hide-if-no-stock{/if}" {if  $separate_stock_for_options}style="display:none"{/if}>
					<a href="#" class=''>{$langs.Add_To_Basket}</a>
				</p>

			{else}
				{if $only_sell_if_in_stock && $in_stock==0}
					{if $theme_vars_hide_stock_levels==1}
						<p class="Icon_Alert">{if $sold_out_message==""}{$langs.Currently_Unavailable}{else}{$sold_out_message}{/if}</p>
						{/if}
					{else}
						<p class="button prev_form_page hide_if_no_js">
							<a href="#" class=''>Prev</a>
						</p>
						<p class="button next_form_page hide_if_no_js">
							<a href="#" class=''>Next</a>
						</p>
						<p class="button submit_form hide_if_no_js">
							<a href="#" class=''>{if $basketForm}{$langs.Add_To_Basket}{else}{if $submit_text!=""}{$submit_text}{else}{$langs.Submit}{/if}{/if}</a>
						</p>
					{/if}
			{/if}

			<input type="submit" value="{if $basketForm}{$langs.Add_To_Basket}{else}{$langs.Submit}{/if}" class="contact-form-hide-with-js"/>
			<p id="sending_wait" class="Icon_Info">Sending, please wait.</p>
			{/if}
			{if !$choosingpassword && $willallowlogin && $signupform} 
				<input type="hidden" name="willallowlogin" value="true" />
			{/if} 

			<p id="success" class="Icon_Tick {if $form_sent!="true"}hidden{/if}">
				{if !$choosingpassword&&$logged_in_and_saving}
					{$langs.User_Data_Saved}
				{else}
					{if $choosingpassword}
						{if $requireapproval}
							{$langs.Pending_Approval}
						{else}
							{$langs.Password_Chosen}
						{/if}
					{elseif $signupform && !$choosingpassword && $willallowlogin}
						{$langs.Form_Register}
					{else}
						{if $thanks_message!=""}
							{$thanks_message}
						{else}
							{$langs.Form_Sent}
						{/if}
					{/if}
				{/if}

			</p>

	{if $basketForm}
		
	</div>
	{/if}
	</div>
{if $centered &&$outline_fills_space}
{if !$usedInBookingProd}
</div>
{/if}
{/if}
	</form>
{/if}

