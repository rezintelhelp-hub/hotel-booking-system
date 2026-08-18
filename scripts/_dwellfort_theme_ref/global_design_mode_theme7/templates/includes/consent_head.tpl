<script {$script_nonce} type="text/javascript">
	{if $theme_vars_consent_mode}
	{literal}
	window.dataLayer = window.dataLayer || [];
	  function gtag(){dataLayer.push(arguments);}

	  // Set default consent to 'denied' as a placeholder
	  // Determine actual values based on your own requirements
	if (localStorage.getItem('consent') === null) {
		gtag('consent', 'default', {
		    'ad_storage':  'denied',
		    'ad_user_data': 'denied',
		    'ad_personalisation': 'denied',
		    'analytics_storage': 'denied',
		    'personalization_storage': 'denied',
		});
		window.consent = { advertising:false,functional:false,performance:false };
	} else {
		window.consent = JSON.parse(localStorage.getItem('consent'));
		const consentMode = {
		    'ad_storage': window.consent.advertising ? 'granted' : 'denied',
		    'ad_user_data': window.consent.advertising ? 'granted' : 'denied',
		    'ad_personalisation': window.consent.advertising ? 'granted' : 'denied',
		    'analytics_storage': window.consent.performance ? 'granted' : 'denied',
		    'personalization_storage': window.consent.functional ? 'granted' : 'denied',
		};
		gtag('consent', 'default', consentMode);
	}
	  {/literal}
	{else}
	{literal}
	window.consent = { advertising:true,functional:true,performance:true };
	{/literal}
	{/if}
</script>
