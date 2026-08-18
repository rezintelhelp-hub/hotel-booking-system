<p class="Icon_Email">
	{capture name=email_link}<a href="mailto:{$theme_vars_email_address}">{$theme_vars_email_address}</a>{/capture}

	<script type="text/javascript">document.write(
	'{$smarty.capture.email_link|str_rot13}'.replace(/[a-zA-Z]/g, function(c){literal}{return String.fromCharCode((c<="Z"?90:122)>=(c=c.charCodeAt(0)+13)?c:c-26);}));{/literal}
	</script>
</p>