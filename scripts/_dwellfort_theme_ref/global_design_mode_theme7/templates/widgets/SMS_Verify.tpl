{* @@@
{
	"widget_info":{
		"title":"SMS Verifty"
		,"title_info":"Enter a name for this instance of the SMS verification widget."
		,"legacy":"true"
	},
	"meta_data":[]
}
@@@ *}
{if $content.logged_in_user}
<div class="styleBox">
{if $content.logged_in_user.sms_verified}
	<h4 class="sms-verifiy-heading verified">SMS Verification</h4>
	<p>Your SMS number {$content.logged_in_user.sms_number} is verified.</p>
{else}
	{if $smarty.post.code}
	{verify_sms action="verify" code=$smarty.post.code userid=$content.logged_in_user.id}
	{if $verified}
	<h4 class="sms-verify-heading verified">Your number is now verified</h4>
	{flush_cache}
	{else}
	<h4 class="sms-verify-heading not-verified">Your number is not verified</h4>
	{/if}
	{/if}
	{if !$smarty.post.code}
	<form action="?nocache=1" method="post">
		<label class="sms-verify-label">Your code:<label>
		<input type="code" name="code" value="" class="input"/></div>

		<p><input type="submit" value="Verify" /></p>
	</form>
	<p><a href="?resend=1&nocache=1">Didn't receive a code? Click here to resend</a></p>
	{/if}
	{if $smarty.request.resend}
		{verify_sms action="resend" userid=$content.logged_in_user.id}
		{if $sent}
		<p class="Icon_Info">Thanks, you will receive a new code momentarily.</p>
		{else}
		<p class="Icon_Alert">Unfortunatly your verification code hasn't been sent. Please contact us for further help.</p>
		{/if}
	{/if}
	{/if}
</div>
{/if}
