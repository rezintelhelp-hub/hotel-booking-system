{if $content.sentAsEmail}
<table width="100%"  class="colblock">
	<tr>
		<td width="23%" valign="middle">
		{$editable.first_column}{if $editable.first_column==""}&nbsp;{/if}
		</td>
		<td width="2.6%" class="colblock-divider">
		&nbsp;
		</td>
		<td width="23%" valign="middle">
		{$editable.second_column}{if $editable.second_column==""}&nbsp;{/if}
		</td>
		<td width="2.6%" class="colblock-divider">
		&nbsp;
		</td>
		<td width="23%" valign="middle">
		{$editable.third_column}{if $editable.third_column==""}&nbsp;{/if}
		</td>
		<td width="2.6%" class="colblock-divider">
		&nbsp;
		</td>
		<td width="23%" valign="middle">
		{$editable.fourth_column}{if $editable.fourth_column==""}&nbsp;{/if}
		</td>
		<td width="2.6%" class="colblock-divider">
		&nbsp;
		</td>
		<td width="23%" valign="middle">
		{$editable.fifth_column}{if $editable.fourth_column==""}&nbsp;{/if}
		</td>
	</tr>
</table>
{else}
<div class="column_row vertical-align">
	<div class='column fifthsCol first'>
		{$editable.first_column}{if $editable.first_column==""}&nbsp;{/if}
	</div>
	<div class='column fifthsCol'>
		{$editable.second_column}{if $editable.second_column==""}&nbsp;{/if}
	</div>
	<div class='column fifthsCol lastiftwo'>
		{$editable.third_column}{if $editable.third_column==""}&nbsp;{/if}
	</div>
	<div class="cleariftwo"></div>
	<div class='column fifthsCol firstiftwo secondRowFifths'>
		{$editable.fourth_column}{if $editable.fourth_column==""}&nbsp;{/if}
	</div>
	<div class='column fifthsCol last secondRowFifths'>
		{$editable.fifth_column}{if $editable.fifth_column==""}&nbsp;{/if}
	</div>
</div>
{/if}

