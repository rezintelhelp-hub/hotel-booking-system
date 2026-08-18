<html>
<body>
	{if !$form_autoresponse && !$mailinglist_autoresponse}
	<p class="hide_in_webversion">Can't see this? <a href="***WEBVERSION***">Click here</a></p>
	{/if}
	{$contentSplit.normal}
	{if !$form_autoresponse}
	<hr/>
	<p class="hide_in_webversion">To unsubscribe from this newsletter please <a href="http://{$url}/newsletter_remove.php?id=***ID***&email=***EMAIL***">click here</a> or copy the following address into your web browser: http://{$url}/actions/NewsletterRemove/?id=***ID***&email=***EMAIL***</p>
	{/if}
</body>
</html>