<p class="blog-add-comment-heading">{$langs.Add_Comment}</p>
<form id="commentFormForm" class="commentForm clearfix" action="" method="post">
	<label for="name" class="label">{$langs.Your_Name} </label>
	<input type="text" name="" value="" id="name" class="input" title="{$langs.Your_Name}"/>
	<p class="labelInfo">{$langs.Your_Name_Info}</p>
	<label for="email" class="label">{$langs.Your_Email}</label>
	<input type="text" name="" value="" id="email" class="input" title="{$langs.Your_Email}"/>
	 <p class="labelInfo">{$langs.Your_Email_Info}</p>
	<p id="emailIncorrect" class="Icon_Cross">{$langs.Email_Error}</p>
	<label for="website" class="label">{$langs.Your_Website} </label>
	<input type="text" name="" value="" id="website" class="input" title="{$langs.Your_Website}"/>
	<p class="labelInfo">{$langs.Your_Website_Info}</p>
	<label class="label" for="comment">{$langs.Your_Comment}</label>
	<textarea name="comment" rows="4" cols="20" class="textarea" id="comment" title="{$langs.Your_Comment}"></textarea>
	<p class="labelInfo">{$langs.Your_Comment_Info}</p>
	<div class="clear"></div>
	<input type="submit" name="" value="{$langs.Add_Comment}" title="{$langs.Add_Comment}" id="addCommentButton"/> <img src="/graphics/AjaxLoader.gif" alt="" id="loader" style="display:none;margin-top:20px;margin-left:10px;margin-bottom:-13px;"/>
</form>
