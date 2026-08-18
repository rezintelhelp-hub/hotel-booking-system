{if $content.sentAsEmail}
<table width="100%">
	<tr>
		<td width="25%">
		&nbsp;
		</td>
		<td width="50%">
		{$editable.content}{if $editable.content==""}&nbsp;{/if}
		</td>
		<td width="25%">
		&nbsp;
		</td>
	</tr>
</table>
{else}
	<div class="narrowCenteredColumn">
	{$editable.content}{if $editable.content==""}&nbsp;{/if}
	</div>
{/if}