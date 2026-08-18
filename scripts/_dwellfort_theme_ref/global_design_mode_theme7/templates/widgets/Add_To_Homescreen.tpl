{* @@@
{
	"widget_info":{
		"title":"Add To Homescreen"
		,"title_info":"This widget will show an 'add to homescreen' promt on mobile devices."
		,"category":"setup"
	},
	"meta_data":[],
	"inner_templates":{
	}
}
@@@ *}
<div id="SWA2HS">
<div class="dismissInstallPrompt">X</div>
<img src="/images/themegraphics/{$theme_vars_touch_icon_96}" width="48" height="48"/> Install app
<div class="installPromptMore">Tap here to add this app to your Home Screen</div>
</div>
<div id="installPrompt" style="display:none;">
<div class="dismissInstallPrompt">X</div>
<img src="/images/themegraphics/{$theme_vars_touch_icon_96}" width="48" height="48"/> Install app 
<div class="installPromptMore">Tap the 'Share icon' then select 'Add to Home Screen'</div>
</div>
