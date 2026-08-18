{if $content.sentAsEmail}
<table width="100%">
	<tr>
		<td width="65.6%" valign="top">
		{$editable.main_content}{if $editable.main_content==""}&nbsp;{/if}	
		</td>
		<td width="2%">
		&nbsp;
		</td>
		<td width="32.3%" valign="top">
		{$editable.sidebar_content}{if $editable.sidebar_content==""}&nbsp;{/if}
		</td>
	</tr>
</table>
{else}
<div class="row">
<div class='column twoThirds first'>
	{$editable.main_content}{if $editable.main_content==""}&nbsp;{/if}
</div>
<div class='column thirdsCol last'>
	{$editable.sidebar_content}{if $editable.sidebar_content==""}&nbsp;{/if}
</div>
</div>
{/if}