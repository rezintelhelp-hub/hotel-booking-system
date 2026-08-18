<div class="input-numeric-id-{$numericid} input-wrapper clearfix input-wrapper-width-{$width} input-wrapper-type-{$type} input-wrapper-label-{$label|css_safe} input-wrapper-number-{$x} {if $required}input-wrapper-required{else}input-wrapper-not-required{/if}" >
{if $belongs_to_form ==""}
<input type="hidden" name="connect_fields" value="true" class="cms_connect_fields" /> 
{/if}
{if $admin_logged_in}
<input type="hidden" name="saveorder" value="true" class="saveorder" /> 
{/if}

{if $type != "consent"&&$type != "checkbox"&&$type != "radiogroup"&&$type!="heading"&&$type!="text"&&$type!="hidden"&&$type!="hr"&&$type!="clear"}
<label class="label_{$label|css_safe} {if $required}required_label{/if}" for="f_{$formId}_i_{$id|css_safe}">{$label|bpe_to_html} {if $admin_logged_in}<span class="admin_info" title="This label is only visible while you are logged into to the admin">ID: {$numericid}</span>{/if}</label>
{/if}
	{if $type=="hr"}
		<div class='hr'></div>
	{/if}
	{if $type=="clear"}
		<div class='clear'></div>
	{/if}
	{if $type=="heading"}
		<h2 class="formHeading_{$label|css_safe}">{$label|bpe_to_html}</h2>
	{/if}
	{if $type=="text"}
		<p class="formText_{$label|css_safe}">{$label|bpe_to_html}</p>
	{/if}
	{if $type == "phone"}
		<input {if $disabled}disabled{/if} {if $required}required{/if}  id="f_{$formId}_i_{$id|css_safe}" type="tel" maxlength="256" title="{$label}" name="{$id}" class="input input_{$label|css_safe}{if $required} required{/if}"{if $encrypted} data-encrypted="true"{/if} value="{if $encrypted}{$value}{else}{$value}{$prepops.$x}{/if}"/>
	{/if}
	{if $type == "short"||$type == "name"}
		<input {if $disabled}disabled{/if} {if $required}required{/if}  id="f_{$formId}_i_{$id|css_safe}" type="text" maxlength="256" title="{$label}" name="{$id}" class="input input_{$label|css_safe}{if $required} required{/if}"{if $encrypted} data-encrypted="true"{/if} value="{if $encrypted}{$value}{else}{$value}{$prepops.$x}{/if}"/>
	{/if}
	{if $type == "daterange"}
		<div class="formDaterange clearfix">
		<input  id="f_{$formId}_i_{$id|css_safe}" type="hidden" maxlength="256" name="{$id}" class="combinedrange" value="{$value}{$prepops.$x}"/>
		<div class="formDaterangeStart"><p class="formDaterangeStartLabel default_datepicker_double">Start<br/><span class="formDaterangeStartValue">&nbsp;</span></p></div><div class="formDaterangeEnd"><p class="formDaterangeEndLabel default_datepicker_double">End<br><span class="formDaterangeEndValue">&nbsp;</span></p></div></div>
	{/if}
	{if $type == "date"}
		<input {if $required}required{/if}  id="f_{$formId}_i_{$id|css_safe}" type="date" maxlength="256" title="{$label}" name="{$id}" class="input default_datepicker input_{$label|css_safe}{if $required} required{/if}"{if $encrypted} data-encrypted="true"{/if} value="{if $encrypted}{$value}{else}{$value}{$prepops.$x}{/if}"/>
	{/if}
	{if $type=="password"}
		<input id="{$id}" type="password" title="{$label}" name="{$id}" class="input input_{$label|css_safe}{if $required} required{/if}" value="{$value}{$prepops.$x}"/>
	{/if}
	{if $type == "email"}
		<input {if $disabled}disabled{/if} {if $required}required{/if}  id="f_{$formId}_i_{$id|css_safe}" type="email" maxlength="256" title="{$label}" name="{$id}" class="input input_{$label|css_safe}{if $required} required{/if}"{if $encrypted} data-encrypted="true"{/if} value="{if $encrypted}{$value}{else}{$value}{$prepops.$x}{/if}"/>
		<p id="emailIncorrect" class="Icon_Alert">Please check your email address for errors</p>
	{/if}
	{if $type == "hidden"}
		<input id="f_{$formId}_i_{$id|css_safe}" type="hidden" name="{$id}" class="input input_{$label|css_safe}" value="{$value}"/>
	{/if}
	{if $type == "long"}
		<textarea {if $required}required{/if} id="f_{$formId}_i_{$id|css_safe}" rows="5" title="{$label}" cols="40" name="{$id}" class="textarea textarea_{$label|css_safe}{if $required} required{/if}"{if $encrypted} data-encrypted="true"{/if} maxlength="2000">{if $encrypted}{$value}{else}{$value}{$prepops.$x}{/if}</textarea>

	{/if}
	{if $type == "file"}
		{* Check if this field has an existing file value *}
		{if $populate!=0 && isset($origcontent.logged_in_user.custom.$populate)}
			{assign var="existing_file_value" value=$origcontent.logged_in_user.custom.$populate}
			{if $existing_file_value && $existing_file_value != ""}
				{* Get the actual custom field ID for the populate field name *}
				{assign var="actual_field_id" value=""}
				{assign var="actual_user_id" value=""}
				
				{* Set user ID *}
				{if isset($origcontent.logged_in_user.newsletter_emailid)}
					{assign var="actual_user_id" value=$origcontent.logged_in_user.newsletter_emailid}
				{elseif isset($current_user_id)}
					{assign var="actual_user_id" value=$current_user_id}
				{/if}
				
				{* Find the custom field ID - check if populate is already the field ID *}
				{if isset($origcontent.logged_in_user.custom_field_configs)}
					{foreach from=$origcontent.logged_in_user.custom_field_configs key=field_id item=field_config}
						{if $field_id == $populate}
							{assign var="actual_field_id" value=$field_id}
							{break}
						{elseif $field_config.name == $populate}
							{assign var="actual_field_id" value=$field_id}
							{break}
						{/if}
					{/foreach}
				{/if}
				
				{* No fallback - it needs to work with the correct field ID *}
				
				{* Create display element for existing file *}
				<div class="existing-file-display" data-encrypted="{if $encrypted}true{else}false{/if}" 
				     data-field-type="file" data-encrypted-value="{$existing_file_value|escape:'htmlall'}" 
				     data-field-id="{$actual_field_id}" data-user-id="{$actual_user_id}">
					{if $encrypted}
						<div class="encrypted-file-placeholder">Loading encrypted file...</div>
					{else}
						<div class="regular-file-display">
							<a href="{$existing_file_value}" target="_blank" class="file-download-link">📄 Download File</a>
							<button type="button" class="clear-existing-file" data-field-id="{$id}">Remove</button>
						</div>
					{/if}
				</div>
			{/if}
		{/if}
		
		{if $admin_logged_in}
		<input type="hidden" name="{$id}" value=""/>
		{/if}
		<input {if $required}required{/if} id="f_{$formId}_i_{$id|css_safe}"  type="file" title="{$label}" name="{$id}" value="" class="inputFile inputFile_{$label|css_safe}{if $required} required{/if}"{if $encrypted} data-encrypted="true"{/if}/>
		<div id="filelabel_f_{$formId}_i_{$id|css_safe}" class="filenameLabel"></div>
	{/if}
	{if $type == "checkbox" || $type=="consent"}

		<input type="checkbox" {if $required}required{/if} title="{$label}" name="{$id}" class="checkbox checkbox_{$label|css_safe}{if $required} required{/if}" value="{$value}{$prepops.$x}{if $value==""&&$prepops.$x==""}true{/if}" {if $admin_logged_in}checked="checked"{/if} {if $prepops.$x}{if $prepops.$x==$value}checked="checked"{/if}checked="checked"{/if} id="cb_{$formId}_{$id|css_safe}">
				<label for="cb_{$formId}_{$id|css_safe}" {if $required}class="required_label"{/if}><span>{$label|bpe_to_html}</span>{if $admin_logged_in} <span class="admin_info" title="This label is only visible while you are logged into to the admin">ID: {$numericid}</span>{/if}</label>

	{/if}
	{if $type == "select"}
		{assign var=options value="**!!**"|explode:$options}
		<select id="f_{$formId}_i_{$id|css_safe}" name="{$id}" {if $required}required{/if} class="select select_{$label|css_safe} {if $required} required{/if}">
			{if $required}<option value="">Please choose</option>{/if}
			{foreach from=$options item=option name=optionsList}
			{if $option!=""}
				{* Check if this option has a value**||**label format (for collections) *}
				{assign var=option_parts value="**||**"|explode:$option}
				{if $option_parts|@count > 1}
					{assign var=option_value value=$option_parts[0]}
					{assign var=option_label value=$option_parts[1]}
				{else}
					{assign var=option_value value=$option}
					{assign var=option_label value=$option}
				{/if}
				<option value="{$option_value|htmlspecialchars}" {if ($value && $value==$option_value) || ($prepops.$x && $prepops.$x==$option_value)}selected="selected"{/if}>{$option_label}</option>
			{/if}
			{/foreach}
		</select>
	{/if}
	{if $type == "sms"}
		<div class="sms_country {if $content.logged_in_user.sms_number}with-badge{/if}">
		{geolocate}
		<select id="f_{$formId}_i_{$id|css_safe}" name="sms_country" class="select select_{$label|css_safe} {if $required} required{/if}">
			{foreach from=$countries item=option name=optionsList}
			<option value="{$option.number|htmlspecialchars}" {if $country}{if (!$sms_country&&$country==$option.country)||($sms_country&&$sms_country==$option.number)}selected="selected"{/if}{else}{if (!$sms_country&&$default_country==$option.number)||($sms_country&&$sms_country==$option.number)}selected="selected"{/if}{/if}>{$option.country_full}</option>
			{/foreach}
		</select>
		</div>
		<div class="sms_number {if $content.logged_in_user.sms_number}with-badge{/if}">
		<input id="f_{$formId}_ii_{$id|css_safe}" type="tel" maxlength="15" title="{$label}" name="{$id}" class="input input_{$label|css_safe}{if $required} required{/if}"{if $encrypted} data-encrypted="true"{/if} value="{if $encrypted}{$value}{else}{$value}{$prepops.$x}{/if}"/>

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
	{if $type == "radiogroup"}
		<fieldset>
			<legend class="label_{$label|css_safe} {if $required}required_label{/if}">{$label|bpe_to_html}</legend>
			{assign var=options value="**!!**"|explode:$options}
			{if $required}
				{foreach from=$options item=option name=optionsloop key=loop1}

				{if $option!=""}
				<input {if $required}required{/if} type="radio" id="radio{$option|css_safe}{$id|css_safe}" name="{$id}" value="{$option}" class="radio radio_{$label|css_safe}" {if $admin_logged_in} checked="checked"{/if} {if $prepops.$x}{if $prepops.$x==$option}checked="checked"{/if}{/if}/> 
				<label for="radio{$option|css_safe}{$id|css_safe}" class="withradio"><span>{$option}</span></label>
				{/if}
				{/foreach}
			{else}
				{foreach from=$options item=option name="option"}
				{if $option!=""}
				
				<input {if $required}required{/if} type="radio" name="{$id}" id="radio{$option|css_safe}{$id|css_safe}" value="{$option}" class="radio radio_{$option|css_safe}" {if $admin_logged_in} checked="checked"{/if} {if $prepops.$x}{if $prepops.$x==$option}checked="checked"{/if}{/if} />
				<label for="radio{$option|css_safe}{$id|css_safe}" class="withradio"><span>{$option}</span></label>
				{/if}
				{/foreach}

			{/if}
		</fieldset>
	{/if}
	
	
	</div>
	


