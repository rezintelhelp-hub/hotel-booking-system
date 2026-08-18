{if $content.sentAsEmail}
<table width="100%">
	<tr>
		<td width="49%" valign="top">
		{$editable.first_column}{if $editable.first_column==""}&nbsp;{/if}			
		</td>
		<td width="2%">
		&nbsp;
		</td>
		<td width="49%" valign="top">
		{$editable.second_column}{if $editable.second_column==""}&nbsp;{/if}			
		</td>
	</tr>
</table>
{else}
<div class="row">
<div class='column twoCol first'>
	{$editable.first_column}{if $editable.first_column==""}&nbsp;{/if}
</div>
<div class='column twoCol last'>
	{$editable.second_column}{if $editable.second_column==""}&nbsp;{/if}
</div>
</div>
{/if}