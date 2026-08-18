{* @@@
{
	"widget_info":{
		"title":"Form Field"
		,"title_info":"Enter a label for this field."
		,"category":"forms"
		,"delay_get_meta":"true"
	},
	"meta_data":[{
		"name":	"Required"
		,"type": "tick"
		,"default": "0"
		,"var":  "required"
		},{
		"name":"Populate user data"
		,"type": "dropdown_user_data"
		,"var": "populate"
		,"valid_attr_test": "type"
		,"valid_attr_values": "short,long,phone,date,daterange,select,radiogroup,checkbox,file"
		,"default":"0"
		},{
		"name":"Type"
		,"type": "dropdown"
		,"var": "type"
		,"default":"short"
		,"options":[
			{
				"label":"Text Field"
				,"value":"short"
			},
			{
				"label":"Long Text Field"
				,"value":"long"
			},
			{
				"label":"Name Field"
				,"value":"name"
			},
			{
				"label":"Email Field"
				,"value":"email"
			},
			{
				"label":"Phone Field"
				,"value":"phone"
			},
			{
				"label":"SMS Field"
				,"value":"sms"
			},
			{
				"label":"Date Field"
				,"value":"date"
			},
			{
				"label":"Range Date Field"
				,"value":"daterange"
			},
			{
				"label":"Dropdown Menu"
				,"value":"select"
			},
			{
				"label":"Button Choice"
				,"value":"radiogroup"
			},
			{
				"label":"Checkbox"
				,"value":"checkbox"
			},
			{
				"label":"Consent"
				,"value":"consent"
			},
			{
				"label":"File"
				,"value":"file"
			}
		]
	},{
		"name":"Options"
		,"type": "children"
		,"var": "options"
		,"label":"Edit dropdown choices"
		,"rename_text_title":"Option name"
		,"rename_text_info":"Enter the text for your dropdown option"
		,"valid_attr_test": "type"
		,"valid_attr_values": "select,radiogroup"
		,"add_items":[{"name":"Option","preset-var":"","preset-val":"","img":"/admin/graphics/dragicons/Form-Option.png"}]
		,"child_properties":{"name":""}
	}]
}
@@@ *}
{assign var="origcontent" value=$content}
{if !$metadata.input_id}
	{add_input label=$metadata.instance_title}
	{add_widget_meta name=input_id value=$input_id instance_id=$metadata.instance_id}
	{get_input 
	id=$input_id
	}
{else}
	{assign var="value_check" value="`$metadata.instance_title``$metadata.required``$metadata.width``$metadata.populate``$metadata.type``$metadata.options`"}
	{assign var="variants" value=$metadata.options|json_decode:true}
	{assign var="options" value=""}
	{foreach from=$variants key="key" item="option"}
	{assign var="options" value="`$options`**!!**`$option.name`"}
	{/foreach}
	{if $value_check!=$metadata.value_check}
	{edit_input 
	id=$metadata.input_id
	label=$metadata.instance_title
	required=$metadata.required
	width=$metadata.width
	type=$metadata.type
	populate=$metadata.populate
	options=$options
	}
	{add_widget_meta name=value_check 
	value=$value_check
	instance_id=$metadata.instance_id}
	{/if}
	{get_input 
	id=$metadata.input_id
	}
{/if}
{get_form formid=$belongs_to_form}

{* Handle value population from user data if specified *}
{assign var="user_field_collection_id" value=""}
{assign var="collection_options" value=""}

{* Check for collections first, regardless of whether user has saved values *}
{if $populate!=0 && isset($origcontent.logged_in_user) && isset($origcontent.logged_in_user.custom_field_configs) && isset($origcontent.logged_in_user.custom_field_configs.$populate)}
	{assign var="all_configs" value=$origcontent.logged_in_user.custom_field_configs}
	{if $all_configs && isset($all_configs[$populate])}
		{assign var="field_config" value=$all_configs[$populate]}
		{if isset($field_config.collection_id) && $field_config.collection_id && $field_config.collection_id != "null" && $field_config.collection_id != ""}
			{assign var="user_field_collection_id" value=$field_config.collection_id}
			{* Fetch collection values *}
			{get_collection_values collection_id=$user_field_collection_id}
			{* Add default "Please choose" option if no existing value *}
			{assign var="has_existing_value" value=false}
			{if isset($origcontent.logged_in_user.custom.$populate) && $origcontent.logged_in_user.custom.$populate != ""}
				{assign var="has_existing_value" value=true}
			{/if}
			{if !$has_existing_value}
				{assign var="collection_options" value="**!!****||**Please choose**!!**"|cat:$collection_options_string}
			{else}
				{assign var="collection_options" value=$collection_options_string}
			{/if}
		{/if}
	{/if}
{/if}

{* Handle existing user values if they exist *}
{if $populate!=0 && isset($origcontent.logged_in_user) && isset($origcontent.logged_in_user.custom) && isset($origcontent.logged_in_user.custom.$populate)}
	{assign var="val" value=$origcontent.logged_in_user.custom.$populate}
{else}
	{assign var="val" value=""}
{/if}

{* Check if this field should be encrypted (any field that populates user data) *}
{if $populate!=0 && isset($origcontent.logged_in_user)}
	{* Check if user has existing encryption status for this field *}
	{if isset($origcontent.logged_in_user.custom_is_encrypted.$populate)}
		{assign var="encrypted" value=$origcontent.logged_in_user.custom_is_encrypted.$populate}
	{else}
		{* If no existing encryption status, assume encrypted for user data fields *}
		{assign var="encrypted" value=true}
	{/if}
{else}
	{assign var="encrypted" value=false}
{/if}
{if $type=="name" && $origcontent.logged_in_user.name}
{assign var="val" value=$origcontent.logged_in_user.name}
{/if}
{if $type=="email" && $origcontent.logged_in_user.email}
{assign var="val" value=$origcontent.logged_in_user.email}
{if $val=="None"}
{assign var="val" value=""}
{/if}
{/if}
{* Override type and options if this field uses collections *}
{assign var="final_type" value=$type}
{assign var="final_options" value=$options}
{if $user_field_collection_id && $collection_options}
	{assign var="final_type" value="select"}
	{assign var="final_options" value=$collection_options}
{/if}

{include file="includes/form_field_master.tpl" type=$final_type label=$metadata.instance_title id=$uuid required=$required width=$width belongs_to_form=$belongs_to_form value=$val content=$origcontent admin_logged_in=$admin_logged_in numericid=$metadata.input_id options=$final_options encrypted=$encrypted}
{if $willallowlogin && !$defer_choose_password && $type=="email"}
{assign var="val" value=""}
{include file="includes/form_field_master.tpl" type="password" label="Choose Password" id="pass1" required=$required width="" belongs_to_form=$belongs_to_form}
<div class="password-strength-container" style="margin-top: 10px;">
    <div class="password-strength-meter">
        <div class="strength-bar" id="pass1-strength-bar"></div>
    </div>
    <div class="password-strength-text">Password strength: <span id="pass1-strength-verdict">enter password</span></div>
</div>
{include file="includes/form_field_master.tpl" type="password" label="Confirm Password" id="pass2" required=$required width="" belongs_to_form=$belongs_to_form}
<style>
/* Password Strength Meter - Inline styles for registration forms */
.password-strength-container {
    margin-top: 10px;
}

.password-strength-meter {
    width: 100%;
    height: 8px;
    background-color: #e0e0e0;
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 5px;
}

.strength-bar {
    height: 100%;
    width: 0%;
    transition: width 0.3s ease, background-color 0.3s ease;
    border-radius: 4px;
}

.strength-bar.very-weak {
    background-color: #d32f2f;
}

.strength-bar.weak {
    background-color: #f57c00;
}

.strength-bar.mediocre {
    background-color: #fbc02d;
}

.strength-bar.strong {
    background-color: #388e3c;
}

.strength-bar.stronger {
    background-color: #1976d2;
}

.password-strength-text {
    font-size: 12px;
    color: #666;
}
</style>
{/if}
