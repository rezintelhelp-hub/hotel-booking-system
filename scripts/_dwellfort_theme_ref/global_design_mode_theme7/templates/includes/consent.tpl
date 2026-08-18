{if $theme_vars_consent_mode}
<div id="consent_banner">
<h5>We use cookies</h5>
<p>{$theme_vars_consent_info|bpe_to_html}</p>

<div class="consent-disabled consent-purpose">Necessary <button class="consent_button consent-item consent-disabled on" >Allowed</button></div>
<div class="consent-purpose">Functional <button class="consent_button consent-item consent-functional" data-consent-purpose="functional">Opted-out</button> </div>
<div class="consent-purpose">Performance <button class="consent_button consent-item consent-performance" data-consent-purpose="performance">Opted-out</button> </div>
<div class="consent-purpose">Advertising <button class="consent_button consent-item consent-advertising" data-consent-purpose="advertising">Opted-out</button> </div>
<button id="consent_allow">Allow all</button>
<button id="consent_current">Use current</button>
</div>
 {/if}
