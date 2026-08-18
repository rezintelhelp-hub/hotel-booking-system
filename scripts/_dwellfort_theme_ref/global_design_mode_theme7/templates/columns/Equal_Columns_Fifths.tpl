{if $content.sentAsEmail}
<table width="100%"  class="colblock">
	<tr>
		<td width="18%" valign="top">
		{$editable.first_column}{if $editable.first_column==""}&nbsp;{/if}
		</td>
		<td width="2.5%" class="colblock-divider">
		&nbsp;
		</td>
		<td width="18%" valign="top">
		{$editable.second_column}{if $editable.second_column==""}&nbsp;{/if}
		</td>
		<td width="2.5%" class="colblock-divider">
		&nbsp;
		</td>
		<td width="18%" valign="top">
		{$editable.third_column}{if $editable.third_column==""}&nbsp;{/if}
		</td>
		<td width="2.5%" class="colblock-divider">
		&nbsp;
		</td>
		<td width="18%" valign="top">
		{$editable.fourth_column}{if $editable.fourth_column==""}&nbsp;{/if}
		</td>
		<td width="2.5%" class="colblock-divider">
		&nbsp;
		</td>
		<td width="18%" valign="top">
		{$editable.fifth_column}{if $editable.fifth_column==""}&nbsp;{/if}
		</td>
	</tr>
</table>
{else}
<div class="column_row magic-heights-wrap">
	<div class='column fifthsCol first magic-heights'>
		{$editable.first_column}{if $editable.first_column==""}&nbsp;{/if}
	</div>
	<div class='column fifthsCol magic-heights'>
		{$editable.second_column}{if $editable.second_column==""}&nbsp;{/if}
	</div>
	<div class='column fifthsCol lastiftwo magic-heights'>
		{$editable.third_column}{if $editable.third_column==""}&nbsp;{/if}
	</div>
	<div class="cleariftwo"></div>
	<div class='column fifthsCol firstiftwo secondRowFifths magic-heights'>
		{$editable.fourth_column}{if $editable.fourth_column==""}&nbsp;{/if}
	</div>
	<div class='column fifthsCol last secondRowFifths magic-heights'>
		{$editable.fifth_column}{if $editable.fifth_column==""}&nbsp;{/if}
	</div>
</div>
{/if}

