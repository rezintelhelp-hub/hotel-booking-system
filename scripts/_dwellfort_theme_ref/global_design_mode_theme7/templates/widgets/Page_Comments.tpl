{* @@@
{
	"widget_info":{
		"title":"Page Comments"
		,"title_info":"Enter a name for this instance of the Page Comments widget. This is just used for reference."
		,"category":"setup"
	},
	"meta_data":[{
		"name":"Comments require approval"
		,"type": "tick"
		,"var": "commentsapproval"
		,"default":1
	}],
	"inner_templates":{
	},
	"child_data":[{
		"pagecomment":{
			"approved":{"type":"tick","label":"Approved"},
			"name":{"type":"text","label":"Name"},
			"email":{"type":"text","label":"Email"},
			"website":{"type":"text","label":"Website"},
			"message":{"type":"text","label":"Comment"}
		}
	}]
}
@@@ *}
{* Logic *}
	{if $smarty.post.addcomment && $smarty.post.data.message!=""}
		{if $metadata.commentsapproval}
		{assign var=approved value=0}
		{else}
		{assign var=approved value=1}
		{/if}
		{add_page_child_data
			pageid=$content.id 
			userid=$content.logged_in_user.id 
			data=$smarty.post.data 
			more_data_approved=$approved
			show_in_activity=1
			activity_name="Page Comment"
			type="pagecomment"
		}
			
		{if $child_data_exists}
			{redirect location="?exists=1"}
		{/if}
		{if $child_data_added}
			{redirect location="?added=1"}
		{/if}
	{/if}
	{foreach from=$content.page_child_data.pagecomment item=item key=key name=loop1}
		{if $item.values.approved}
		<div class="blog-comment styleBox">
			<p>
				<span class="blog-comment-author">
				{if $item.owner.avatar!=""}<img src="/images/{$item.owner.avatar}?width=100&height=100&shrink=false" alt="{$item.owner.name}" class="avatar"/>{/if}
				<strong>
					{if $item.owner.id==0}{$item.values.name}{else}{$item.owner.name}{/if}
				</strong></span> 
				{$item.values.message}
				<span class="blog-comment-date">{$item.created|date_format:"%A, %B %e, %Y"}</span>
			</p>
		</div>
		{/if}
	{/foreach}
		
	<h4 class="clear">{$langs.Add_Comment}</h4>
	{if $smarty.get.exists}
	<p class="Icon_Alert">You‘ve already added this comment.</p>
	{/if}
	{if $smarty.get.added}
	<p class="Icon_Tick">You’ve successfully added this comment. {if $metadata.commentsapproval==1}Your comment will be published here if approved.{/if}</p>		
	{/if}
	<div class="styleBox">
	<form action="" method="post" class="blog-comment-form">
		<input type="hidden" name="addcomment" value="1" />
		<label for="email1" class="fakeemail">Are you human?<br/>
		Leave this empty if you are a human. This is to prevent spam.
		</label>
		<input type="text" maxlength="256" id="email1" name="email1" value="" class="email1 input"/>
		{if $content.logged_in_user.id==""}
			<div class="input-wrapper input-wrapper-width-50 input-wrapper-type-name input-wrapper-required" >
				<label class="label_Your_name " for="blog_com_name">Your name:</label>
				<input id="blog_com_name" type="text" maxlength="256" title="Your name:" name="data[name]" class="input required" value=""/>
			</div>

			<div class="input-wrapper input-wrapper-width-50 input-wrapper-type-name input-wrapper-required" >
				<label class="label_Email " for="blog_com_email">Email:</label>
				<input id="blog_com_email" type="text" maxlength="256" title="Email:" name="data[email]" class="input required" value=""/>
			</div>
			<div class="input-wrapper input-wrapper-width-100 input-wrapper-type-short input-wrapper-required" >
				<label class="label_Message" for="blog_com_message">Message:</label>
				<textarea id="blog_com_message" type="text" name="data[message]" class="input required"></textarea>
			</div>
		{else}
		
		<div class="input-wrapper input-wrapper-width-100 input-wrapper-type-short input-wrapper-required" >
			<label class="label_Message" for="blog_com_message">Comment as {$content.logged_in_user.name}:</label>
			<textarea id="blog_com_message" type="text" name="data[message]" class="input required"></textarea>
		</div>
		{/if}
		
		
		<div class="clear"></div>

		<p class="Icon_Alert cf_contains_errors" >* Please fill out all required fields</p>

		<p class="button submit_form hide_if_no_js">
		<a href="#" class=''>Submit</a>
		</p>

		<input type="submit" value="Submit" class="contact-form-hide-with-js"/>

	</form>
</div>
<script type="text/javascript">
	{literal}
	$(document).ready(function(){
		if ($(".blog-comment-form").length>0) {
			$(".email1").css({
				"position":"absolute"
				,"top":"-4000px"
				,"left":"-1000px"
			});
			$(".fakeemail").hide();
		}
	});
	{/literal}
</script>
<style type="text/css" media="screen">
	{literal}
	.blog-comment-date {
		display:block;
		font-size:75%;
	}
	
	{/literal}
</style>
