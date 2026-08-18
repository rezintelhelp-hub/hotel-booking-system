{if $notValidUser}<p class="Icon_Alert">{$langs.Not_Valid_User}</p>{/if}
{if $resetting}
<h3>{$langs.Change_Password_Info}</h3>
{else}
<h3>{$langs.Login_Required}</h3>
{/if}
	<noscript><p class="Icon_Alert">{$langs.Login_Security_Warning}</p></noscript>
{if $smarty.get.resetsent}<p class="Icon_Alert">{$langs.Reset_Sent}</p>{/if}
{if $smarty.get.passchanged}<p class="Icon_Info">{$langs.Reset_Done}</p>{/if}
{if $smarty.get.nomatch}<p class="Icon_Info">{$langs.Reset_NoMatch}</p>{/if}
{if $smarty.get.codeerror}<p class="Icon_Info">{$langs.Reset_Fail}</p>{/if}
<form action="/actions/Login/" method="post" id="loginForm">
	<label>{$langs.Email}:</label>
	<input type="text" name="email" value="{if $resetting}{$resettingemail}{/if}" class="input" {if $resetting}readonly{/if}/>
	<label>{if $resetting}{$langs.Choose_pass_1}{else}{$langs.Password}{/if} :</label>
	<input type="password" name="password" value="" class="input"/>
	{if $resetting}
	<div class="password-strength-indicator">
		<div class="strength-bar-container">
			<div id="password-strength-bar" class="strength-bar"></div>
		</div>
		<div id="password-strength-verdict" class="strength-verdict">enter password</div>
	</div>
	<input type="hidden" name="code" value="{$smarty.get.code}" >
	<input type="hidden" name="id" value="{$smarty.get.resetpass}" >
	<label>{$langs.Choose_pass_2} :</label>
	<input type="password" name="password2" value="" class="input"/>
	<p><input type="submit" value="{$langs.Change_Password}" id=""/></p>
	{else}
	<label><input type="checkbox" name="persistant" value="" > {$langs.Keep_Me_Logged_In}</label>
	<label><input type="checkbox" name="reset" value="" id="reset"> {$langs.Reset_Password}</label>
	<p><input type="submit" value="{$langs.Login}" id=""/></p>	
	{/if}
	

</form>