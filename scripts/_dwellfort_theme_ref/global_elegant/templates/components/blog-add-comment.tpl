<h4>{$langs.Add_Comment}</h4>
<form id="commentFormForm" class="commentForm clearfix" action="" method="post">
	<label for="name" class="label">{$langs.Your_Name} </label>
	<input type="text" name="" value="" id="name" class="input"/>
	<p class="labelInfo">{$langs.Your_Name_Info}</p>
	<label for="email" class="label">{$langs.Your_Email}</label>
	<input type="text" name="" value="" id="email" class="input"/>
	 <p class="labelInfo">{$langs.Your_Email_Info}</p>
	<p id="emailIncorrect" class="Icon_Cross" style="display:none;">{$langs.Email_Error}</p>
	<label for="website" class="label">{$langs.Your_Website} </label>
	<input type="text" name="" value="" id="website" class="input"/>
	<p class="labelInfo">{$langs.Your_Website_Info}</p>
	<label class="label">{$langs.Your_Comment}</label>
	<textarea name="comment" rows="4" cols="20" class="textarea" id="comment"></textarea>
	<p class="labelInfo">{$langs.Your_Comment_Info}</p>
	<input type="submit" name="" value="{$langs.Add_Comment}" style="float:left"/> <img src="/graphics/form-loader.gif" alt="" id="loader" style="display:none;margin-top:-18px;margin-bottom:-13px;"/>
</form>