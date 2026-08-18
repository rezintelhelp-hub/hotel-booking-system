{* @@@
{
	"widget_info":{
		"title":"Forum"
		,"title_info":"Enter a name for this instance of the Forum."
		,"category":"setup"
	},
	"meta_data":[{
		"name":"Tag"
		,"type": "pagetagmulti"
		,"var": "tagids"
	},{
		"name":"Quick-add tag"
		,"info":"Enter the name for this tag. This tag will be created and set for the Tag item above. All pages with this tag will be treated as blog articles for this instace of the Blog widget."
		,"type": "quickaddtag"
		,"destvar": "tagids"
		,"needsparent": "false"
		,"onlyone":"true"
	},{
		"name":"Tag for sticky topics"
		,"type": "pagetagmulti"
		,"var": "pinnedtagids"
	},{
		"name":"Quick-add pinned topics tag"
		,"type": "quickaddtag"
		,"info":"Enter the name for this tag. This tag will be created and set for the 'Tag for pinned topics' item above. All pages with this tag will be treated as pinned topics for this instace of the Forum widget."
		,"destvar": "pinnedtagids"
		,"needsparent": "false"
		,"onlyone":"true"
	},{
		"name":"Sidebar categories"
		,"type": "pagetagmulti"
		,"var": "publiccats"
	},{
		"name":"Quick-add sidebar category tag"
		,"info":"Enter the name for this tag. This tag will be created and set as a Cateogory for this instance of the Forum. Admin users in the CMS will be able to choose from any 'Sidebar category' tag added here."
		,"type": "quickaddtag"
		,"destvar": "publiccats"
		,"needsparent": "true"
		,"parent_tag_append": "sidebar categories"
		,"onlyone":"false"
	},{
		"name":"New posts require approval"
		,"type": "tick"
		,"var": "approveposts"
		,"default":0
	},{
		"name":"Allow attachments"
		,"type": "tick"
		,"var": "allowattachments"
		,"default":1
	}],
	"inner_templates":{
		"forumpost": {
			"name":"Forum Post",
			"add_title":"Add new forum post",
			"add_info":"Enter a name for your forum post. This will be used as the visible title.",
			"meta_data":[{
				"name":"Last updated"
				,"info":"More recent dates will bring posts to the top of the page. Ensure the date is in this format: YYYY-MM-DD HH:MM"
				,"type": "date"
				,"var": "lastupdated"
			},{
				"name":"Belongs to forum"
				,"type":"tagchooser"
				,"onlyshow":"tagids"
			}
			,{
				"name":"Categories"
				,"type":"tagchooser"
				,"onlyshow":"publiccats"
			},{
				"name":"Content"
				,"info":"The content of the post. Markdown is supported."
				,"type": "text"
				,"var": "content"
			},{
				"name":"Created date"
				,"info":"Enter a date this post was first created. Ensure the date is in this format: YYYY-MM-DD HH:MM"
				,"type": "date"
				,"var": "created"
			}],
			"child_data":{
				"forumcomment":{
					"approved":{"type":"tick","label":"Approved"},
					"name":{"type":"text","label":"Name"},
					"email":{"type":"text","label":"Email"},
					"message":{"type":"text","label":"Message"}
				}
			}
		}
	}
}
@@@ *}

{tags assign=cats langs=$langs assign_flat=flat_cats only_include_in_flat=$metadata.publiccats}
{* Logic *}
{if $vars[0]} {* If showing post *}

	{page_by_slug slug=$vars[0] assign=page thispage=$content.id}
	{assign var=singlepage value=true}
	{if $smarty.post.addcomment}
		{if $metadata.commentsapproval}
		{assign var=approved value=0}
		{else}
		{assign var=approved value=1}
		{/if}
		{add_page_child_data
			pageid=$page.id 
			userid=$content.logged_in_user.id 
			data=$smarty.post.data 
			more_data_approved=$approved
			show_in_activity=1
			activity_name="Forum comment"
			type="forumcomment"}
			

		{page_metadata pageid=$page.id var=lastupdated value=$smarty.now|date_format:"%Y-%m-%d %H:%M"}
		{flush_cache}
		{if $child_data_exists}
			{redirect location="?exists=1"}
		{/if}
		{if $child_data_added}
			{if $metadata.allowattachments}
				{add_page_child_data_uploads
					pageid=$page.id
					type="attachments_`$child_data_added`"
					files="cattachments"
					show_in_activity=0
					userid=$content.logged_in_user.id 
				}
			{/if}
			{get_page_child_data type="forumcomment_`$page.id`_notify" assign="toemail" pageid=$content.id}
			{foreach from=$toemail item=email}

				{if ($content.logged_in_user && $email.owner.email!=$content.logged_in_user.email)||!$content.logged_in_user}
				{email_send 
					send_date=$smarty.now|date_format:"%Y-%m-%d %T"
					sendid="forumcomment_notif_`$page.id`_`$content.logged_in_user_id`_`$smarty.now`" 
					pagecontent="<p>A new comment has been added to the post: `$page.title`.</p><p>`$content.protocol``$content.http_host``$content.request_uri`</p>"
					subject="A new comment has been added" 
					email=$email.owner.email
					name=$email.owner.name
				}
				{/if}
			{/foreach}
			{redirect location="?added=1"}
			 
		{/if}
	{/if}
	{if $smarty.post.editcomment&&$content.logged_in_user.id}
		{edit_page_child_data
			id=$smarty.post.id 
			checkowner=$content.logged_in_user.id 
			data=$smarty.post.data 
			}

				{delete_all_page_child_data_uploads
					pageid=$page.id
					type="attachments_`$smarty.post.id`"
					keep=$smarty.post.keep_attachments
					owner=$content.logged_in_user.id
				}

		{page_metadata pageid=$page.id var=lastupdated value=$smarty.now|date_format:"%Y-%m-%d %H:%M"}
		{flush_cache}
		{redirect location="?"}
	{/if}
{else}

	{if !$smarty.request.start}
	{assign var=start value=0}
	{else}
	{assign var=start value=$smarty.request.start}
	{/if}
	{if $smarty.request.category}


		{foreach from=$flat_cats item=tag}
			{if $tag.name|css_safe==$smarty.request.category} 
				{assign var=cattag value=$tag.id}
			{/if}
		{/foreach}

		{pages_by_tag tags=$metadata.tagids additionaltags=$cattag omit=$metadata.pinnedtagids assign=pages sortbymeta=lastupdated}
		{assign var=totalpages value=$pages|@count}
		{pages_by_tag tags=$metadata.tagids additionaltags=$cattag omit=$metadata.pinnedtagids assign=pages sortbymeta=lastupdated start=$start limit=10}
	{else}
		{pages_by_tag tags=$metadata.tagids featured=$metadata.pinnedtagids assign=pages sortbymeta=lastupdated direction=desc}
		{assign var=totalpages value=$pages|@count}
		{pages_by_tag tags=$metadata.tagids featured=$metadata.pinnedtagids assign=pages sortbymeta=lastupdated direction=desc start=$start limit=10}

	{/if}

	{if $metadata.approveposts}
	{assign var=live value=0}
	{else}
	{assign var=live value=1}
	{/if}
	{if $smarty.post.addpost&&$content.logged_in_user.id!=""}
		{if $smarty.post.content==""||$smarty.post.pagetitle==""}
			{redirect location="?incomplete=1"}
		{/if}
		{assign 'tagsnew'  value="`$metadata.tagids`,`$cattag`"}
		{add_page 
			tagids=$tagsnew
			pagetitle=$smarty.post.pagetitle 
			meta_content=$smarty.post.content 
			userid=$content.logged_in_user.id 
			live=$live 
			loggedinonly=$content.loggedinonly
			dm_template=0
			widget_template="forumpost"
			meta_created=$smarty.now|date_format:"%Y-%m-%d %H:%M"
			meta_lastupdated=$smarty.now|date_format:"%Y-%m-%d %H:%M"
			locked=1
		}
		{add_user_child_data
			show_in_activity=0
			userid=$content.logged_in_user.id
			more_data_pageid=$added
			type="forumpost"
		}
		{if $metadata.allowattachments}
			{add_page_child_data_uploads
				pageid=$added
				pagename=$smarty.post.pagetitle
				type="attachments"
				files="attachments"
				show_in_activity=0
				userid=$content.logged_in_user.id 
			}
		{/if}
		{add_page_child_data pageid=$content.id userid=$content.logged_in_user.id more_data_enable_notification=1 show_in_activity=0 type="forumcomment_`$added`_notify" }
		{flush_cache}
		{if $added}

			{if $cattag==""}
			{get_page_child_data type="forum_main_notify" assign="toemail" pageid=$content.id}
			{else}
			{get_page_child_data type="forum_`$smarty.request.category`_notify" assign="toemail" pageid=$content.id}

			{assign var=catmore value=""}
			{foreach from=$flat_cats item=tag}
				{if $tag.name|css_safe==$smarty.request.category} 
					{assign var=catmore value="<br />The post is in the following category: `$tag.name`"}
				{/if}
			{/foreach}
			{/if}
			{foreach from=$toemail item=email}
				{if $content.logged_in_user && $email.owner.email!=$content.logged_in_user.email}
				{email_send 
					send_date=$smarty.now|date_format:"%Y-%m-%d %T"
					sendid="forum_notif_`$cattag`_`$content.logged_in_user_id`_`$smarty.now`" 
					pagecontent="<p>A new post has been added to the forum (`$smarty.post.pagetitle`). If the post is approved it will show here: `$content.protocol``$content.http_host``$content.request_uri` `$catmore`</p>"
					subject="A new post has just been added to the forum"
					email=$email.owner.email
					name=$email.owner.name
				}
				{/if}
			{/foreach}
			{if $smarty.get.category}

			{redirect location="?added=1&category=`$smarty.get.category`"}
			{else}
			{redirect location="?added=1"}

			{/if}

		{/if}
		{if $exists}
			{if $smarty.get.category}

			{redirect location="?exists=1&category=`$smarty.get.category`"}
			{else}
			{redirect location="?exists=1"}
			{/if}
		{/if}
		{if $incomplete}
			{if $smarty.get.category}

			{redirect location="?incomplete=1&category=`$smarty.get.category`"}
			{else}
			{redirect location="?incomplete=1"}
			{/if}
		{/if}
	{/if}
	
{/if}


{* Display *}
<div class="{if $singlepage}displaying-forum-article{else}displaying-forum-index{/if} {if $metadata.grid}blog_grid{/if}">
{if $metadata.publiccats}
<div class="content-block-with-sidebar">
{/if}
	{if $singlepage}
	{if $content.logged_in_user.id}
		{get_user_child_data
                      userid=$content.logged_in_user.id
                      use_as_key="pageid"
                      type="forumpost"
                 }
		 {/if}
		{$editable.above_post}
		<div class="hide_if_edit">
			{if $smarty.get.edit}
				<h1>Editing post</h1>
			{else}
				<div class="clearfix"> 
				<h1>{$page.title}</h1>
				<span class="blog-comment-author">
				{if $page.owner.avatar!=""}<img src="/images/{$page.owner.avatar}?width=100&height=100&shrink=false" alt="{$page.owner.name}" class="avatar"/>
				{else}	
					<img src="/graphics/person.png" class="avatar" title="Upload new avatar"/>
				{/if}
				<strong>
				{$page.owner.name}
				</strong></span> 
				<span class="blog-comment-date">{$page.meta.created|date_format:"%A, %B %e, %Y"}</span>

 				</div>
			{/if}

			{if $user_child_data[$page.id]&&!$smarty.get.edit} {* If exists, page was created by logged in user *}
			<p class="Button_Small"><a href="?edit=1">Edit</a></p>
			{/if}

			{if !$smarty.get.edit}
			{$page.meta.content|parsedown}
			{/if}
		</div>
		{if $user_child_data[$page.id]} {* If exists, page was created by logged in user *}
			{if $smarty.post.editpost && $user_child_data[$page.id]} {* If logged in user is creator and form post *}
				{edit_page
					id=$page.id
					pagetitle=$smarty.post.pagetitle
					meta_content=$smarty.post.content
					meta_lastupdated=$smarty.now|date_format:"%Y-%m-%d %H:%M"
				}
				{delete_all_page_child_data_uploads
					pageid=$page.id
					type="attachments"
					keep=$smarty.post.keep_attachments
					owner=$content.logged_in_user.id
				}
				{add_page_child_data_uploads
					pageid=$page.id
					type="attachments"
					files="attachments"
					show_in_activity=0
					userid=$content.logged_in_user.id
				}
				{flush_cache}
				{if $edited}
					{redirect location="?saved=1"}
				{/if}
				{if $pagenameinuse}
					{redirect location="?pagenameinuse=1&edit=1"}
				{/if}
			 {/if}
			{if $smarty.get.edit}
			<form action="" method="post" class="styleBox clearfix  post-edit-form" id="editpost" enctype="multipart/form-data">
				<input type="hidden" name="editpost" value="1" />
				<label for="email1" class="fakeemail">Are you human?<br/>
				Leave this empty if you are a human. This is to prevent spam.
				</label>
				<input type="text" maxlength="256" id="email1" name="email1" value="" class="email1 input"/>


				<div class="input-wrapper input-wrapper-width-100 input-wrapper-type-name input-wrapper-required" >
					<label class="label_Your_name " for="forum_title">Topic title:</label>
					<input id="forum_title" type="text" maxlength="256" title="Topic title:" name="pagetitle" class="input required" value="{$page.title}"/>
				</div>
				
				<div class="input-wrapper input-wrapper-width-100 input-wrapper-type-short input-wrapper-required" >
					<label class="label_Your_name " for="forum_content">Topic content:</label>
					<textarea id="forum_content" type="text" name="content" class="input required">{$page.meta.content}</textarea>
				</div>
				{if $metadata.allowattachments}
				{foreach from=$page.page_child_data.attachments item=item key=key name=loop1}
					
					<div class="forum-attachment">
						{if $item.values.ext=="jpeg"||$item.values.ext=="jpg"||$item.values.ext=="png"||$item.values.ext=="gif"}
						<p class="Popup_Link"><a href="/images/{$item.values.filename}"><img src="/images/{$item.values.filename}?width=150&height=150"/></a></p>
						{elseif $item.values.ext=="mov"||$item.values.ext=="mp4"}
						<p class="Popup_Link"><a href="/media/{$item.values.filename}">Play Video</a></p>
						{else}

						<p class="Button_Small"><a href="/downloads/{$item.values.filename}">{$item.values.filename}</a></p>
						{/if}
					<input type="hidden" name="keep_attachments[]" value="{$item.id}"/>
					<span class='remove_attachment'>Remove</span>
					</div>
				
				{/foreach}
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
				
				<p class="cancel_edit_forum"><a href="?" class=''>Cancel</a></p>
				<p class="button submit_form hide_if_no_js">
				<a href="#" class=''>Save</a> 
				</p>

				<input type="submit" value="Save" class="contact-form-hide-with-js"/>
			</form>
			{/if}
		{/if}
			&nbsp;
		{if !$smarty.get.edit}
			{foreach from=$page.page_child_data.attachments item=item key=key name=loop1}

				<div class="forum-attachment">
					{if $item.values.ext=="jpeg"||$item.values.ext=="jpg"||$item.values.ext=="png"||$item.values.ext=="gif"}
					<p class="Popup_Link"><a href="/images/{$item.values.filename}"><img src="/images/{$item.values.filename}?width=150&height=150"/></a></p>
					{elseif $item.values.ext=="mov"||$item.values.ext=="mp4"}
					<p class="Popup_Link"><a href="/media/{$item.values.filename}">Play Video</a></p>
					{else}

					<p class="Button_Small"><a href="/downloads/{$item.values.filename}">{$item.values.filename}</a></p>
					{/if}
				</div>

			{/foreach}
			<div class="clear"></div>
			{if $page.page_child_data.forumcomment}
			<h4>Comments</h4>
			{/if}
			{if $content.logged_in_user}
			{if $smarty.request.subscribe_post_toggle}
				{get_page_child_data type="forumcomment_`$page.id`_notify" userid=$content.logged_in_user.id assign="exists_notify" pageid=$content.id}
				{if $exists_notify&&!$smarty.request.enable_notification}
				{delete_page_child_data type="forumcomment_`$page.id`_notify" userid=$content.logged_in_user.id pageid=$content.id}
				{/if}
				{if !$exists_notify&&$smarty.request.enable_notification}
				{add_page_child_data pageid=$content.id userid=$content.logged_in_user.id data=$smarty.request.enable_notification show_in_activity=0 type="forumcomment_`$page.id`_notify" }
				{/if}
				{flush_cache}
			{/if}
			<div class="notification_subscribe controlBox">
			{get_page_child_data type="forumcomment_`$page.id`_notify" userid=$content.logged_in_user.id assign="exists_notify_tick" pageid=$content.id}
			<form action="" method="post">
			<input type="hidden" name="subscribe_post_toggle" value="1"/>
			<label><input {if $exists_notify_tick}checked="checked"{/if}  value="1" name="enable_notification[enabled]" type="checkbox" id="notification_post_subscribe" /> Receive email notifications when new comments are added to this post</label>
			</div>
			</form>
			{/if}
			{foreach from=$page.page_child_data.forumcomment item=item key=key name=loop1}
				{if $item.values.approved}
				<div class="forum-comment styleBox clearfix">
					<p>
						<span class="blog-comment-author">
						{if $item.owner.avatar!=""}<img src="/images/{$item.owner.avatar}?width=100&height=100&shrink=false" alt="{$item.owner.name}" class="avatar"/>
						{else}
							<img src="/graphics/person.png" class="avatar" title="Upload new avatar"/>
						{/if}
						<strong>
							{if $item.owner.id==0}{$item.values.name}{else}{$item.owner.name}{/if}
						</strong></span> 
						<span class="forum-comment-body">{$item.values.message}</span>
						{if $item.owner.id&&$item.owner.id==$content.logged_in_user.id}
						<span class="edit_forum_comment_button">Edit</span>
						{/if}
						<span class="forum-comment-date">{$item.created|date_format:"%A, %B %e, %Y"}</span>
					</p>
					{if $metadata.allowattachments}
					{assign var="attachment_name" value="attachments_`$item.id`"}
					{foreach from=$page.page_child_data.$attachment_name item=item key=key name=loop1}
						
						<div class="forum-attachment">
						{if $item.values.ext=="jpeg"||$item.values.ext=="jpg"||$item.values.ext=="png"||$item.values.ext=="gif"}
						<p class="Popup_Link"><a href="/images/{$item.values.filename}"><img src="/images/{$item.values.filename}?width=150&height=150"/></a></p>
						{elseif $item.values.ext=="mov"||$item.values.ext=="mp4"}
						<p class="Popup_Link"><a href="/media/{$item.values.filename}">Play Video</a></p>
						{else}

						<p class="Button_Small"><a href="/downloads/{$item.values.filename}">{$item.values.filename}</a></p>
						{/if}
					</div>
					{/foreach}
					{/if}
					{if $item.owner.id==$content.logged_in_user.id&&$item.owner.id}
					<form action="" method="post" class="edit_forum_comment">
					<input type="hidden" name="id" value="{$item.id}"/>
					<input type="hidden" name="editcomment" value="true"/>
				<div class="input-wrapper input-wrapper-width-100 input-wrapper-type-short input-wrapper-required" >
					<textarea class="input" name="data[message]">{$item.values.message}</textarea>
					</div>
					<div class="clearfix">
					{if $metadata.allowattachments}
					{assign var="attachment_name" value="attachments_`$item.id`"}
					{foreach from=$page.page_child_data.$attachment_name item=item key=key name=loop1}
						
						<div class="forum-attachment">
						{if $item.values.ext=="jpeg"||$item.values.ext=="jpg"||$item.values.ext=="png"||$item.values.ext=="gif"}
						<p class="Popup_Link"><a href="/images/{$item.values.filename}"><img src="/images/{$item.values.filename}?width=150&height=150"/></a></p>
						{elseif $item.values.ext=="mov"||$item.values.ext=="mp4"}
						<p class="Popup_Link"><a href="/media/{$item.values.filename}">Play Video</a></p>
						{else}

						<p class="Button_Small"><a href="/downloads/{$item.values.filename}">{$item.values.filename}</a></p>
						{/if}
					{if $item.owner.id==$content.logged_in_user.id&&$item.owner.id}
					<input type="hidden" name="keep_attachments[]" value="{$item.id}"/>
					<span class='remove_attachment'>Remove</span>
					{/if}
					</div>
					{/foreach}
					{/if}
					</div>
					<p class="button submit_form hide_if_no_js">
					<a href="#" class=''>Save</a>
					</p>

					<input type="submit" value="Submit" class="contact-form-hide-with-js"/>
					
					</form>
					{/if}
				</div>
				{/if}
			{/foreach}
		
		{/if}
		{if $smarty.get.exists}
		<p class="Icon_Alert">You've already added this comment.</p>
		{/if}
		{if $smarty.get.added}
		<p class="Icon_Tick">You've successfully added this comment. {if $metadata.commentsapproval==1}Your comment will be published here if approved.{/if}</p>
		{/if}
		{if !$smarty.get.edit}
			<div class="styleBox">
			<form action="" method="post" class="blog-comment-form" enctype="multipart/form-data">
				<input type="hidden" name="addcomment" value="1" />
				<label for="email1" class="fakeemail">Are you human?<br/>
				Leave this empty if you are a human. This is to prevent spam.
				</label>
				<input type="text" maxlength="256" id="email1" name="email1" value="" class="email1 input"/>
				{if $content.logged_in_user.id==""}
					<div class="input-wrapper input-wrapper-width-25 input-wrapper-type-name input-wrapper-required" >
						<label class="label_Your_name " for="blog_com_name">Your name:</label>
						<input id="blog_com_name" type="text" maxlength="256" title="Your name:" name="data[name]" class="input required" value=""/>
					</div>

					<div class="input-wrapper input-wrapper-width-25 input-wrapper-type-name input-wrapper-required" >
						<label class="label_Email " for="blog_com_email">Email:</label>
						<input id="blog_com_email" type="text" maxlength="256" title="Email:" name="data[email]" class="input required" value=""/>
					</div>

					<div class="input-wrapper input-wrapper-width-0 input-wrapper-type-short input-wrapper-required" >
						<label class="label_Message" for="blog_com_message">Message:</label>
						<textarea id="blog_com_message" type="text" name="data[message]" class="input required"></textarea>
					</div>
				{else}
				
				<div class="input-wrapper input-wrapper-width-100 input-wrapper-type-short input-wrapper-required" >
					<label class="label_Message" for="blog_com_message">Comment as {$content.logged_in_user.name}:</label>
					<textarea id="blog_com_message" type="text" name="data[message]" class="input required"></textarea>
				</div>
				{/if}

				<div class="forum-comment-file-upload input-wrapper input-concealed input-wrapper-width-25 input-wrapper-type-file input-wrapper-not-required" >
					<label for="filec1">File upload:</label>
					<input type="file" name="cattachments[]" value="" id="filec1">
				</div>
				<div class="forum-comment-file-upload input-wrapper input-concealed input-wrapper-width-25 input-wrapper-type-file input-wrapper-not-required" >
					<label for="filec2">File upload:</label>
					<input type="file" name="cattachments[]" value="" id="filec2">
				</div>
				<div class="forum-comment-file-upload input-wrapper input-concealed input-wrapper-width-25 input-wrapper-type-file input-wrapper-not-required" >
					<label for="filec3">File upload:</label>
					<input type="file" name="cattachments[]" value="" id="filec3">
				</div>
				<div class="forum-comment-file-upload input-wrapper input-concealed input-wrapper-width-25 input-wrapper-type-file input-wrapper-not-required" >
					<label for="filec4">File upload:</label>
					<input type="file" name="cattachments[]" value="" id="filec4">
				</div>
				<div class="forum-comment-file-upload input-wrapper input-concealed input-wrapper-width-25 input-wrapper-type-file input-wrapper-not-required" >
					<label for="filec5">File upload:</label>
					<input type="file" name="cattachments[]" value="" id="filec5">
				</div>
				<div class="forum-comment-file-upload input-wrapper input-concealed input-wrapper-width-25 input-wrapper-type-file input-wrapper-not-required" >
					<label for="filec6">File upload:</label>
					<input type="file" name="cattachments[]" value="" id="filec6">
				</div>
				<div class="forum-comment-file-upload input-wrapper input-concealed input-wrapper-width-25 input-wrapper-type-file input-wrapper-not-required" >
					<label for="filec7">File upload:</label>
					<input type="file" name="cattachments[]" value="" id="filec7">
				</div>
				<div class="forum-comment-file-upload input-wrapper input-concealed input-wrapper-width-25 input-wrapper-type-file input-wrapper-not-required" >
					<label for="filec8">File upload:</label>
					<input type="file" name="cattachments[]" value="" id="filec8">
				</div>
				<div class="clear"></div>
				<p class="Button_Small" id="forum-comment-add-attachment"><a href="#">Add attachment</a></p>
				
				<div class="clear"></div>

				<p class="Icon_Alert cf_contains_errors" >* Please fill out all required fields</p>

				<p class="button submit_form hide_if_no_js">
				<a href="#" class=''>Add comment</a>
				</p>

				<input type="submit" value="Submit" class="contact-form-hide-with-js"/>

				<p id="success" class="Icon_Tick hidden">Thank you - your form was successfully sent</p>

			</form>
			</div>
		{/if}
	{else}
		{*
		{if $smarty.get.category}
				{foreach from=$flat_cats item=tag}
					{if $tag.name|css_safe==$smarty.get.category} 
						<p class="Icon_Info">You are browsing by <strong>{$tag.name}</strong></p>
					{/if}
				{/foreach}
		{/if}
		*}

		{$editable.above_index}
		{if (($metadata.publiccats && $smarty.get.category)||(!$metadata.publiccats))}
			{if $content.logged_in_user.id==""}
				<h4>Add a new post</h4>
				<p>You need to be logged in to post to this forum.</p>
			{else}
				{if $metadata.publiccats && $smarty.get.category}
					 {assign var="catstr" value=$smarty.get.category}
				{else}
					 {assign var="catstr" value="main"}

				{/if}
				{if $smarty.request.subscribe_toggle}
					{get_page_child_data type="forum_`$catstr`_notify" userid=$content.logged_in_user.id assign="exists_notify" pageid=$content.id}
					{if $exists_notify&&!$smarty.request.enable_notification}
					{delete_page_child_data type="forum_`$catstr`_notify" userid=$content.logged_in_user.id pageid=$content.id}
					{/if}
					{if !$exists_notify&&$smarty.request.enable_notification}
					{add_page_child_data pageid=$content.id userid=$content.logged_in_user.id data=$smarty.request.enable_notification show_in_activity=0 type="forum_`$catstr`_notify" }
					{/if}
					{flush_cache}
				{/if}
				<div class="notification_subscribe controlBox">
				{get_page_child_data type="forum_`$catstr`_notify" userid=$content.logged_in_user.id assign="exists_notify_tick" pageid=$content.id}
				<form action="" method="post" >
				<input type="hidden" name="subscribe_toggle" value="1"/>
				<label><input {if $exists_notify_tick}checked="checked"{/if}  value="1" name="enable_notification[enabled]" type="checkbox" id="notification_subscribe" /> Receive email notifications when new posts are added here</label>
				</div>
				</form>
				<p class="Button_Large"><a href="#addpost" id="show_add_post">Add post</a></p>

				{if $smarty.get.added}
				<p class="Icon_Tick">Your post has been successfully added. {if $metadata.approveposts}It will appear on this page if approved.{/if}</p>
				{/if}
				{if $smarty.get.incomplete}
				<p class="Icon_Alert">Please add a title and content for your post.</p>
				{/if}
				{if $smarty.get.exists}
				<p class="Icon_Alert">You&rsquo;ve already added this post.<p>
				{/if}

				<form action="" method="post" class="styleBox post-add-form" id="addpost" enctype="multipart/form-data">
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
			{/if}

		{/if}
		{if !$pages}
		<p class="Icon_Info">There are no posts to display</p>
		{/if}
		{foreach from=$pages item=page}
			<div class="styleBox">
			<p class="forum-post-index clearfix {if $page.owner.avatar!=""}with-avatar{/if}">
				{if $page.owner.avatar!=""}<img src="/images/{$page.owner.avatar}?width=100&height=100&shrink=false" alt="{$page.owner.name}" class="avatar"/>{/if}
				<span class="forum-post-column forum-post-title"><a href="{$page.url_str}">{$page.pagetitle}</a></span>
				<span class="forum-post-column forum-post-comments"><span class="forum-post-column-tite">Replies:</span><br/>{$page.page_child_data.forumcomment|@count}</span> 
				<span class="forum-post-column forum-post-last-update"><span class="forum-post-column-tite">Last updated:</span><br/>{$page.meta.lastupdated|date_format:"%b %e, %Y %H:%M"} </span>
				<span class="forum-post-column forum-post-created"><span class="forum-post-column-tite">Created:</span><br/>{$page.meta.created|date_format:"%b %e, %Y %H:%M"}</span>
			</p>
			</div>
		{/foreach}

		{if $start + 10 < $totalpages||$start>0}
		<p class="forum-pages clearfix">
		{if $start + 10 < $totalpages}
		<a class="forum-pages-next" href="?start={$start+10}{if $smarty.get.category}&category={$smarty.get.category}{/if}{if $smarty.get.astag}&astag=true{/if}">Next</a>
		{/if}
		{if $start>0}
		<a class="forum-pages-prev" href="?start={$start-10}{if $smarty.get.category}&category={$smarty.get.category}{/if}{if $smarty.get.astag}&astag=true{/if}">Prev</a>
		{/if}
		</p>
		{/if}
		
	
	{/if}
{if $metadata.publiccats}
</div>
<nav id="sidebarNav">
<div id="sidebarInner">
	<h4><a href="{$content.fullUrl}">Categories</a></h4>
	<ul class="blog-categories">
	{foreach from=$flat_cats item=tag}
		<li class="blog-category-{$tag.name|css_safe} 
		{if $tag.name|css_safe==$smarty.get.category}current{/if}
		"><a href="{$content.fullUrl}?category={$tag.name|css_safe}">{$tag.name}</a></li>
	{/foreach}
	</ul>
	</div>
</div>
</nav>
{/if}
</div>
