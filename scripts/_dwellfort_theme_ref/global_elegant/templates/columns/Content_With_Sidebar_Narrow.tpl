{if $content.sentAsEmail}
<table width="100%">
	<tr>
		<td width="74%" valign="top">
		{$editable.main_content}{if $editable.main_content==""}&nbsp;{/if}
		</td>
		<td width="2%">
		&nbsp;
		</td>
		<td width="24%" valign="top">
		{$editable.sidebar_content}{if $editable.sidebar_content==""}&nbsp;{/if}
		</td>
	</tr>
</table>
{else}
<div class="row">
<div class='column threeCol first'>
	{$editable.main_content}{if $editable.main_content==""}&nbsp;{/if}
</div>
<div class='column quartCol last'>
	{$editable.sidebar_content}{if $editable.sidebar_content==""}&nbsp;{/if}
</div>
</div>
{/if}