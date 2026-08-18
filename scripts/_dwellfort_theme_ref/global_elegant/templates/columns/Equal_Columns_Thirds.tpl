{if $content.sentAsEmail}
<table width="100%">
	<tr>
		<td width="32%" valign="top">
		{$editable.first_column}{if $editable.first_column==""}&nbsp;{/if}			
		</td>
		<td width="2%">
		&nbsp;
		</td>
		<td width="32%" valign="top">
		{$editable.second_column}{if $editable.second_column==""}&nbsp;{/if}			
		</td>
		<td width="2%">
		&nbsp;
		</td>
		<td width="32%" valign="top">
		{$editable.third_column}{if $editable.third_column==""}&nbsp;{/if}
		</td>
	</tr>
</table>
{else}
<div class="row">
	<div class='column threeThirdsCol first'>
		{$editable.first_column}{if $editable.first_column==""}&nbsp;{/if}
	</div>
	<div class='column threeThirdsCol'>
		{$editable.second_column}{if $editable.second_column==""}&nbsp;{/if}
	</div>
	<div class='column threeThirdsCol last'>
		{$editable.third_column}{if $editable.third_column==""}&nbsp;{/if}
	</div>
</div>
{/if}
