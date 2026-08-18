<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN"
	"http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">

<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en" lang="en">
<head>
	<meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>

	<title>{$langs.Livechat}</title>
	
	<script src="/livechat/javascripts/jquery.js" type="text/javascript" charset="utf-8"></script>
	<script src="/livechat/javascripts/regjquery.js" type="text/javascript" charset="utf-8"></script>
	{*
	LEAVE THE ABOVE JAVASCRIPT CODE IN PLACE
	*}
	<link rel="stylesheet" href="/livechat/css/master.css" type="text/css" media="screen" title="Default Style" charset="utf-8"/>

	<!--[if lte IE 7]>
		<style type="text/css" media="screen">
			{literal}
			#scroll {
				height:237px
			}
			{/literal}
		</style>
	<![endif]-->
	
</head>
<body id="user">
	<div id="header">{$langs.Livechat}</div>
	<div id="scroll">
		<p class="user">{$message}</p>
		<div id="chat">
		{if !$cookieTrue}
			<p id="cookieError">{$langs.Cookie_Error}
		{/if}
		</div>
	</div>
	{if $cookieTrue}
	<form id="form" action="#" method="post">
		<input type="text" id="message" name="message" value="{$langs.Livechat_Type}"/>
		<span id="convoend" style="display:none;">{$langs.Livechat_End}</span>
		<input type="hidden" name="chatId" value="" id="chatId" style="display:none;"/>
	</form>
	{/if}
</body>
</html>
