{if $content.sentAsEmail}
<table width="100%" class="colblock">
	<tr>
		<td width="49%" valign="middle">
		{$editable.first_column}{if $editable.first_column==""}&nbsp;{/if}
		</td>
		<td width="2%" class="colblock-divider">
		&nbsp;
		</td>
		<td width="49%" valign="middle">
		{$editable.second_column}{if $editable.second_column==""}&nbsp;{/if}
		</td>
	</tr>
</table>
{else}
<div class="column_row vertical-align">
<div class='column twoCol first'>
	{$editable.first_column}{if $editable.first_column==""}&nbsp;{/if}
</div>
<div class='column twoCol last'>
	{$editable.second_column}{if $editable.second_column==""}&nbsp;{/if}
</div>
</div>
{/if}
