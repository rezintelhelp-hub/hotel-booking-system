{* @@@
{
        "widget_info":{
                "title":"User Control Bar"
                ,"title_info":"Enter a name for this instance of the user control bar widget."
                ,"category":"setup" 
        },
        "meta_data":[{
                "name":"Welcome text"
                ,"type": "text"
		,"info":"Enter the text to show with the user’s name. This text can include these placeholders: {FIRST_NAME} {LAST_NAME}"
                ,"var": "welcome"
                ,"default":"Welcome {FIRST_NAME} {LAST_NAME}"
        },{
                "name":"Enable bio"
                ,"type": "tick"
                ,"var": "bio"
                ,"default":"0"
        },{
                "name":"Bio intro"
                ,"info":"Explanitory text explaining what the staff bio is used for."
                ,"type": "text"
                ,"var": "bio_info"
                ,"default":""
        },{
                "name":"Custom Link 1 Text"
                ,"type": "text"
		,"info":"Enter the text for the custom link"
                ,"var": "link1text"
                ,"default":""
        },{
                "name":"Custom Link 1 Link"
                ,"type": "linkpageonly"
		,"info":"Choose a page or enter a link for the custom link"
                ,"var": "link1link"
                ,"default":""
        },{
                "name":"Custom Link 2 Text"
                ,"type": "text"
		,"info":"Enter the text for the custom link"
                ,"var": "link2text"
                ,"default":""
        },{
                "name":"Custom Link 2 Link"
                ,"type": "linkpageonly"
		,"info":"Choose a page or enter a link for the custom link"
                ,"var": "link2link"
                ,"default":""
        },{
                "name":"Custom Link 3 Text"
                ,"type": "text"
		,"info":"Choose a page or enter a link for the custom link"
		,"info":"Enter the text for the custom link"
                ,"var": "link3text"
                ,"default":""
        },{
                "name":"Custom Link 3 Link"
                ,"type": "linkpageonly"
                ,"var": "link3link"
                ,"default":""
        },{
                "name":"Logout destination"
                ,"type": "linkpageonly"
                ,"info": "Choose a page to redirect to after the user logs out"
                ,"var": "logout_link"
                ,"default":""
        },{
                "name":"Show unverifed message"
                ,"type": "tick"
                ,"var": "show_unverified"
                ,"default":"0"
        },{
                "name":"Unverified message"
                ,"type": "text"
		,"info":"Explanitory text for guests who have been logged it but are yet to verify thier accounts."
                ,"var": "unverified"
                ,"default":"Your email address is currently not verified. Please click the link in the email you received when registering or reset your password from the login page to verify your account."
        }],
        "inner_templates":{
        }
}
@@@ *}
{if $smarty.post.avatarupload}
	{add_user_avatar userid=$content.logged_in_user.id file="avatar"}
	{flush_cache}	
{/if}
{if $smarty.post.changebio}
	{add_user_custom_fields userid=$content.logged_in_user.id name="Bio" value=$smarty.post.bio}
	{flush_cache}	
{/if}
{if $content.logged_in_user}
{get_user_custom_fields userid=$content.logged_in_user.id}
{foreach from=$user_custom_fields item=$field}
	{if $field.name=="Bio"}
		{assign var="bio" value=$field.value}
	{/if}
{/foreach}
<div class="styleBox user-control-bar clearfix">
{if $content.logged_in_user.avatar!="" && !$avatar_added}
<img src="/images/{$content.logged_in_user.avatar}?width=100&height=100&shrink=false" id="user_avatar" title="Upload new avatar"/>
{/if}
{if $avatar_added}
	<img src="/images/{$avatar_added}?width=100&height=100&shrink=false" id="user_avatar" title="Upload new avatar"/>
{/if}
{if $content.logged_in_user.avatar=="" && !$avatar_added}
	<img src="/graphics/person.png" id="user_avatar" title="Upload new avatar"/>
{/if}
	<p class="user-bar-custom-button user-bar-custom-button-logout"><a href="/actions/logout/?redirect={$metadata.logout_link|urlencode}" class="logout-button">{$langs.Logout}</a></p>
	{if $metadata.bio}
	<p class="user-bar-custom-button user-bar-custom-button-bio"><a href="#" class="user-bar-button" id="change_bio_button">{$langs.Bio}</a></p>
	{/if}
{if $metadata.link1text!=""}
	<p class="user-bar-custom-button user-bar-custom-button-1"><a href="{$metadata.link1link}" >{$metadata.link1text}</a></p>
{/if}
{if $metadata.link2text!=""}
	<p class="user-bar-custom-button user-bar-custom-button-2"><a href="{$metadata.link2link}" >{$metadata.link2text}</a></p>
{/if}
{if $metadata.link3text!=""}
	<p class="user-bar-custom-button user-bar-custom-button-3"><a href="{$metadata.link3link}" >{$metadata.link3text}</a></p>
{/if}
<p>{$metadata.welcome|replace:'{FIRST_NAME}':$content.logged_in_user.first_name|replace:'{LAST_NAME}':$content.logged_in_user.last_name}</p>
	<form action="" method="post" enctype="multipart/form-data" id="change_avatar" class="">
		<div class="styleBox" style="margin:30px 0 0">
		<input name="avatar" type="file" value="" class="avatar_input"/>
		<input name="avatarupload" value="true" type="hidden"/>
		<input type="submit" value="Upload new avatar"/>
		</div>
	</form>
	{if $metadata.bio}
	<form action="" method="post" enctype="multipart/form-data" id="change_bio" class="">
		<div class="styleBox" style="margin:30px 0 0">
		<h2>Edit Bio</p>
		<p>{$metadata.bio_info}</p>
		<textarea name ="bio">{$bio|htmlspecialchars}</textarea>
		<input name="changebio" value="true" type="hidden"/>
		<input type="submit" value="Save"/>
		</div>
	</form>
	{/if}
</div>
{/if}
{if $smarty.request.guest}
<p class="Icon_Tick">{$langs.Account_Created}</p>
{/if}
{if $metadata.show_unverified && $content.logged_in_user && $content.logged_in_user.verified==0 && $content.logged_in_user.sms_verified==0}
<p class="Icon_Info">{$metadata.unverified}</p>
{/if}
{if $smarty.request.verified}
<p class="Icon_Tick">Your account is now verified and you have been logged in.</p>
{/if}
