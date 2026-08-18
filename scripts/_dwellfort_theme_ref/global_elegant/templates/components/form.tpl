{if $formSent!="true"}{else}
<h2>{$langs.Form_Sent}</h2>
{/if}
{if $formSpam!="true"}{else}
<h2>{$langs.Form_Error}</h2>
{/if}

{if $formId=="newsletter"}
<form action="/actions/NewsletterAdd/" method="post" class="form signupForm" enctype="multipart/form-data" >
{else}
<form action="{if $usedInCheckout}/actions/BuyerCheckoutForm/{else}/actions/FormSend/{/if}" method="post" class="form {if $basketForm}formProduct addToBasketForm{/if} {if $usedInCheckout}formUsedInCheckout{/if}" enctype="multipart/form-data" >
{/if}

{if $basketForm}
	<div class="productInner">		
{/if}
	
{if $basketForm}
<input type="hidden" name="addToBasketId" value="{$basketForm}" id="addToBasketId"/>
{/if}

<input type="hidden" name="formId" value="{$formId}"/>

<label for="email1" class="fakeemail">{$langs.Are_You_Human}<br/>
 	{$langs.Are_You_Human_Instructions}
</label>
<input type="text" name="email1" value="" class="email1 input"/>

{foreach from=$inputs item=input key=key name=loop1}
{assign var=x value=$smarty.foreach.loop1.iteration}

{if $input.type != "checkbox"&&$input.type != "radiogroup"&&$input.type!="heading"&&$input.type!="text"&&$input.type!="hidden"}
<label class="label_{$input.label|css_safe} {if $input.required=="yes"}required_label{/if}">{$input.label}</label>
{/if}

	{if $input.type=="heading"}
		<h2 class="formHeading_{$input.label|css_safe}">{$input.label}</h2>
	{/if}
	{if $input.type=="text"}
		<p class="formText_{$input.label|css_safe}">{$input.label}</p>
	{/if}
	{if $input.type == "short"||$input.type == "phone"||$input.type == "name"}
		<input type="text" name="{$input.id}" class="input {if $input.date}default_datepicker{/if} input_{$input.label|css_safe}{if $input.required=="yes"} required{/if}" value="{$input.value}{if $smarty.foreach.loop1.iteration==$inputpop}{$val}{/if}{$prepops.$x}"/>
	{/if}
	{if $input.type == "email"}
		<input type="text" name="{$input.id}" class="input input_{$input.label|css_safe}{if $input.required=="yes"} required{/if}" id="emailInput" value="{if $smarty.foreach.loop1.iteration==$inputpop}{$val}{/if}{$input.value}{$prepops.$x}"/>
		<p id="emailIncorrect" style="display:none;">Please check your email address for errors</p>
	{/if}
	{if $input.type == "hidden"}
		<input type="hidden" name="{$input.id}" class="input input_{$input.label|css_safe}" value="{$input.value}"/>
	{/if}
	{if $input.type == "long"}
		<textarea rows="5" cols="40" name="{$input.id}" class="textarea textarea_{$input.label|css_safe}{if $input.required=="yes"} required{/if}">{if $smarty.foreach.loop1.iteration==$inputpop}{$val}{/if}{$input.value}{$prepops.$x}</textarea>

	{/if}
	{if $input.type == "file"}
		<input type="file" name="{$input.id}" value="" class="inputFile inputFile_{$input.label|css_safe}{if $input.required=="yes"} required{/if}"/>
	{/if}
	{if $input.type == "checkbox"}
	<fieldset>	
		<label for="cb_{$formId}_{$input.id}">
		<input type="checkbox" name="{$input.id}" class="checkbox checkbox_{$input.label|css_safe}{if $input.required=="yes"} required{/if}" value="{$input.value}{$prepops.$x}" {if $smarty.foreach.loop1.iteration==$inputpop}checked="checked"{/if} {if $prepops.$x}{if $prepops.$x==$input.value}checked="checked"{/if}checked="checked"{/if} id="cb_{$formId}_{$input.id}"> <span>{$input.label}</span>
		</label>
	</fieldset>
	{/if}
	{if $input.type == "select"}
		{assign var=options value="**!!**"|explode:$input.options}
		<select name="{$input.id}" class="select select_{$input.label|css_safe} {if $input.required=="yes"} required{/if}">
			{foreach from=$options item=option name=optionsList}
			<option value="{$option}" {if $smarty.foreach.loop1.iteration==$inputpop &&  $smarty.foreach.optionsList.iteration==$val}selected="selected"{/if} {if $prepops.$x}{if $prepops.$x==$option}selected="selected"{/if}{/if}>{$option}</option>
			{/foreach}
		</select>
	{/if}
	{if $input.type == "radiogroup"}
		<fieldset>	
			<label for="" class="label_{$input.label|css_safe} {if $input.required=="yes"}required_label{/if}">{$input.label}</label>
			{assign var=options value="**!!**"|explode:$input.options}
			{if $input.required=="yes"}
				{foreach from=$options item=option name=optionsloop key=loop1}
				<label for="radio{$option|css_safe}{$input.id}{$smarty.foreach.option.iteration}">
				<input type="radio" id="radio{$option|css_safe}{$input.id}{$smarty.foreach.option.iteration}" name="{$input.id}" value="{$option}" class="radio radio_{$input.label|css_safe}" {if $smarty.foreach.optionsloop.iteration=="1"} checked="checked"{/if} {if $prepops.$x}{if $prepops.$x==$option}checked="checked"{/if}{/if}/> <span>{$option}</span>
				</label>
				{/foreach}
			{else}
				{foreach from=$options item=option name="option"}
				<label for="radio{$option|css_safe}{$input.id}{$smarty.foreach.option.iteration}">
				<input type="radio" name="{$input.id}" id="radio{$option|css_safe}{$input.id}{$smarty.foreach.option.iteration}" value="{$option}" class="radio radio_{$option|css_safe}" {if $prepops.$x}{if $prepops.$x==$option}checked="checked"{/if}{/if} /> <span>{$option}</span>
				</label>
				{/foreach}

			{/if}
		</fieldset>
	{/if}

{/foreach}



	

	
	{if !$variants}
	{if $price}
<p class="stockAndPrice">
	<span class="price">{$curSym}{$price}</span>
	{if $in_stock<$theme_vars_hide_stock_threshold}
	<span class="stock {if $in_stock<$warning_stock_threshold}warning{/if}">{$langs.In_Stock}: <strong>{$in_stock}</strong></span>
	{/if}
	</p>
	{/if}
	{/if}
		{if $variants}
		<select name="variant_price">
		{foreach from=$variants item=variant key=key name=loop1}
			<option value="{$variant.name|htmlspecialchars}">{$variant.name} ({$curSym}{$variant.price})</option>
		{/foreach}
		</select>
		<div class="clear"></div>
		{/if}
		{if !$usedInCheckout}
				<img src="/graphics/form-load.gif" alt="" id="loader" style="display:none;float:right;margin:10px 10px 0"/>
					<p class="button submit_form hide_if_no_js">
				<a href="#" class=''>{if $basketForm}{$langs.Add_To_Basket}{else}{$langs.Submit}{/if}</a>
			</p>
		
				<noscript><input type="submit" value="{if $basketForm}{$langs.Add_To_Basket}{else}{$langs.Submit}{/if}"/></noscript>
			{/if}
	<p id="success" class="Icon_Tick" style="display:{if $form_sent!="true"}none{else}block{/if}";>{$langs.Form_Sent}</p>
	{if $basketForm}
		
	</div>
	{/if}
	</form>

