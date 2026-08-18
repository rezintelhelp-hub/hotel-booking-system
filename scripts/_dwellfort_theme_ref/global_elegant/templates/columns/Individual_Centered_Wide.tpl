{if $content.sentAsEmail}
<table width="100%">
	<tr>
		<td width="20%">
		&nbsp;
		</td>
		<td width="70%">
		{$editable.content}{if $editable.content==""}&nbsp;{/if}		
		</td>
		<td width="20%">
		&nbsp;
		</td>
	</tr>
</table>
{else}
<div class="wideCenteredColumn">
	{$editable.content}{if $editable.content==""}&nbsp;{/if}
	</div>
{/if}