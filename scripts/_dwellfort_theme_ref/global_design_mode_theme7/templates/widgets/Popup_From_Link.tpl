{*
{$editable.link_text}
*}
{if $editable.link_text}
<div class="popupMessageOnClick">
	{$editable.link_text}
</div>
<div class="popupMessageOnClickContent">
{$editable.message_content}
</div>
{else}
<div id="popupMessageBox" class="autoshow">
	
	{$editable.message_content}
	
</div>
{/if}
