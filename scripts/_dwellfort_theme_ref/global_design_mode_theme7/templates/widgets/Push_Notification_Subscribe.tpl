{* @@@
{
	"widget_info":{
		"title":"Push Notification Button"
		,"title_info":"Enter a name for this instance of the widget. This widget allows logged in users to subscribe to push notifications."
	},
	"meta_data":[{
                "name":"Add non-logged in users to list"
                ,"type": "user_list"
                ,"var": "userlist"
                ,"default":""
        },{
                "name":"Subscribe prompt"
                ,"type": "text"
                ,"var": "prompt"
                ,"default":""
        }]
}
@@@ *}

{if $metadata.prompt!=""}
<div class="styleBox" id="SubscribePrompt"><p>{$metadata.prompt}</p></div>
{/if}
<p class="Button_Large"><a href="#" id="PushNotifSubscribeButton" data-default-list="{$metadata.userlist}"></a></p>
<p id="PushNotAvailable">Push notifications not available on your device</p>
<p id="PushNotifBlocked">Push notifications have been denied on your device. You can remove the block in your preferences to re-enable.</p>
<div class="styleBox" id="addToHomeScreen"><h2>Web app enabled</h2><p>You can add this app to your device's home screen for a better experience and to enable push notification support on mobile. This feature is supported on most modern devices. </div>
