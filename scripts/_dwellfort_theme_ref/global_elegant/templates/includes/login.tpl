<h3>{$langs.Login_Required}</h3>
<form action="/actions/Login/" method="post" id="loginForm">
	<noscript><p class="warning">{$langs.Login_Security_Warning}</p></noscript>
	
	<input type="hidden" name="timestamp" value="{$securityTime}" id="timestampInput"/>
	<input type="hidden" name="salt" value="{$securitySalt}" id="saltInput"/>
	<input type="hidden" name="hash" value="" id="hashInput"/>
	<input type="hidden" name="page" value="{$content.id}"/>
	<label>{$langs.Username}:</label>
	<input type="text" name="username" value="" class="input"/>
	<label>{$langs.Password}:</label>
	<input type="password" name="password" value="" class="input"/>
	<input type="submit" value="{$langs.Login}" id=""/>
</form>
