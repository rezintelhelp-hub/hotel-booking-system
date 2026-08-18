{* @@@
{
	"widget_info":{
		"title":"Add Blog Post"
 		,"title_info":"Enter a name for this instance of the widget. This is just used for reference."
		,"category":"setup"
	},
	"meta_data":[{
		"name":"Tag"
		,"type": "pagetagmulti"
		,"var": "blogtag"
	},{
		"name":"Categories"
		,"type": "pagetagmulti"
		,"var": "categories"
	},{
		"name":"Require approval"
		,"type": "tick"
		,"var": "approveposts"
		,"default":1
	},{
		"name":"Allow uploads"
		,"type": "tick"
		,"var": "allowattachments"
		,"default":1
	}],
	"inner_templates":{
	}
}
@@@ *}
{tags assign=cats langs=$langs assign_flat=flat_cats only_include_in_flat=$metadata.categories}
{if $content.logged_in_user}

	{if $metadata.approveposts}
	{assign var=live value=0}
	{else}
	{assign var=live value=1}
	{/if}
	{if $smarty.post.addpost&&$content.logged_in_user.id!=""}
		{if $smarty.post.content==""||$smarty.post.pagetitle==""}
			{redirect location="?incomplete=1"}
		{/if}
		{assign 'tagsnew'  value="`$metadata.blogtag`"}
		{foreach from=$flat_cats item="potential"}
		{foreach from=$smarty.request.categories item="cat"}
			{if $cat==$potential.id}
				{assign 'tagsnew'  value="`$tagsnew`,`$cat`"}
			{/if}
		{/foreach}
		{/foreach}
		{add_page 
			tagids=$tagsnew
			pagetitle=$smarty.post.pagetitle 
			content=$smarty.post.content 
			userid=$content.logged_in_user.id 
			live=$live 
			dm_template=0
			widget_template="bloginner"
			meta_created=$smarty.now|date_format:"%Y-%m-%d %H:%M"
			meta_date=$smarty.now|date_format:"%Y-%m-%d %H:%M"
			meta_lastupdated=$smarty.now|date_format:"%Y-%m-%d %H:%M"
			locked=0
		}
		{add_user_child_data
			show_in_activity=0
			userid=$content.logged_in_user.id
			more_data_pageid=$added
			type="blogpost"
		}
		{if $metadata.allowattachments}
			{add_page_child_data_uploads
				pageid=$added
				pagename=$smarty.post.pagetitle
				type="blogattachments"
				files="attachments"
				show_in_activity=0
				userid=$content.logged_in_user.id 
			}
			{if !$firstimage&&($ext=="jpg"||$ext=="png"||$ext=="jpeg"||$ext=="gif")}

				{edit_page 
				id=$added
				pic_url="/images/`$filename`"
				}
				{assign var="firstimage" value=true}
			{/if}
		{/if}
		{flush_cache}
		{if $added}
			{redirect location="?added=1"}
		{/if}
		{if $exists}
			{redirect location="?exists=1"}
		{/if}
		{if $incomplete}
			{redirect location="?incomplete=1"}
		{/if}
	{/if}
	{if $smarty.get.added}
	<p class="Icon_Tick">Your post has been successfully added. {if $metadata.approveposts}It will appear on this page if approved.{/if}</p>
	{/if}
	{if $smarty.get.incomplete}
	<p class="Icon_Alert">Please add a title and content for your post.</p>
	{/if}
	{if $smarty.get.exists}
	<p class="Icon_Alert">You&rsquo;ve already added this post.<p>
	{/if}

	<form action="" method="post" class="styleBox blog-add-form"  enctype="multipart/form-data">
		<h4>Add post as {$content.logged_in_user.name}:</h4>
		<input type="hidden" name="addpost" value="1" />
		<input type="hidden" name="category" value="{$smarty.get.category}" />
		<label for="email1" class="fakeemail">Are you human?<br/>
		Leave this empty if you are a human. This is to prevent spam.
		</label>
		<input type="text" maxlength="256" id="email1" name="email1" value="" class="email1 input"/>


		<div class="input-wrapper input-wrapper-width-100 input-wrapper-type-name input-wrapper-required" >
			<label class="label_Your_name " for="forum_title">Topic title:</label>
			<input id="forum_title" type="text" maxlength="256" title="Topic title:" name="pagetitle" class="input required" value=""/>
		</div>

		<div class="input-wrapper input-wrapper-width-100 input-wrapper-type-short input-wrapper-required" >
			<label class="label_Your_name " for="forum_content">Topic content:</label>
			<textarea id="forum_content" type="text" name="content" class="input required"></textarea>
		</div>
		{if $metadata.categories}
			{foreach from=$flat_cats item=tag}
				<label><input type="checkbox" value="{$tag.id}" name="categories[]"/> {$tag.name}</label>
			{/foreach}
		{/if}
		{if $metadata.allowattachments}
		<div class="forum-file-upload input-wrapper input-concealed input-wrapper-width-25 input-wrapper-type-file input-wrapper-not-required" >
			<label for="file1">File upload:</label>
			<input type="file" name="attachments[]" value="" id="file1">
		</div>
		<div class="forum-file-upload input-wrapper input-concealed input-wrapper-width-25 input-wrapper-type-file input-wrapper-not-required" >
			<label for="file2">File upload:</label>
			<input type="file" name="attachments[]" value="" id="file2">
		</div>
		<div class="forum-file-upload input-wrapper input-concealed input-wrapper-width-25 input-wrapper-type-file input-wrapper-not-required" >
			<label for="file3">File upload:</label>
			<input type="file" name="attachments[]" value="" id="file3">
		</div>
		<div class="forum-file-upload input-wrapper input-concealed input-wrapper-width-25 input-wrapper-type-file input-wrapper-not-required" >
			<label for="file4">File upload:</label>
			<input type="file" name="attachments[]" value="" id="file4">
		</div>
		<div class="clear"></div>
		<div class="forum-file-upload input-wrapper input-concealed input-wrapper-width-25 input-wrapper-type-file input-wrapper-not-required" >
			<label for="file5">File upload:</label>
			<input type="file" name="attachments[]" value="" id="file5">
		</div>
		<div class="forum-file-upload input-wrapper input-concealed input-wrapper-width-25 input-wrapper-type-file input-wrapper-not-required" >
			<label for="file6">File upload:</label>
			<input type="file" name="attachments[]" value="" id="file6">
		</div>
		<div class="forum-file-upload input-wrapper input-concealed input-wrapper-width-25 input-wrapper-type-file input-wrapper-not-required" >
			<label for="file7">File upload:</label>
			<input type="file" name="attachments[]" value="" id="file7">
		</div>
		<div class="forum-file-upload input-wrapper input-concealed input-wrapper-width-25 input-wrapper-type-file input-wrapper-not-required" >
			<label for="file8">File upload:</label>
			<input type="file" name="attachments[]" value="" id="file8">
		</div>
		<p class="Button_Small" id="forum-add-attachment"><a href="#">Add attachment</a></p>
		{/if}
		<div class="hr"></div>

		<p class="Icon_Alert cf_contains_errors" >* Please fill out all required fields</p>
		
		<p class="button submit_form hide_if_no_js">
		<a href="#" class=''>Add post</a>
		</p>

		<input type="submit" value="Submit" class="contact-form-hide-with-js"/>


	</form>
{else}
<p class="Icon_Alert">You need to be logged in to use this widget</p>
{/if}
