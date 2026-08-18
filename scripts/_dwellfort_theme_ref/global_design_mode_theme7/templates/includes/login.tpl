<h3>{$langs.Login_Required}</h3>
{if $smarty.request.verified}
<p class="Icon_Tick">{$langs.Account_Verified_Login}</p>
{/if}
<form action="/actions/Login/" method="post" id="loginForm">
	<noscript><p class="warning">{$langs.Login_Security_Warning}</p></noscript>
	
	<input type="hidden" name="timestamp" value="{$securityTime}" id="timestampInput"/>
	<input type="hidden" name="salt" value="{$securitySalt}" id="saltInput"/>
	<input type="hidden" name="hash" value="" id="hashInput"/>
	<input type="hidden" name="page" value="{$content.id}"/>
	<label for="login_username">{$langs.Username}:</label>
	<input id="login_username" type="text" name="username" value="" class="input" title="{$langs.Username}"/>
	<label for="login_password">{$langs.Password}:</label>
	<input id="login_password" type="password" name="password" value="" class="input" title="{$langs.Password}"/>
	<input type="submit" value="{$langs.Login}" id=""/>
</form>
