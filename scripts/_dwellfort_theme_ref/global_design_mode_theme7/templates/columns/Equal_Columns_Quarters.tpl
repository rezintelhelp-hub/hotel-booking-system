
{if $content.sentAsEmail}
<table width="100%"  class="colblock">
	<tr>
		<td width="23%" valign="top">
		{$editable.first_column}{if $editable.first_column==""}&nbsp;{/if}
		</td>
		<td width="2.6%" class="colblock-divider">
		&nbsp;
		</td>
		<td width="23%" valign="top">
		{$editable.second_column}{if $editable.second_column==""}&nbsp;{/if}
		</td>
		<td width="2.6%" class="colblock-divider">
		&nbsp;
		</td>
		<td width="23%" valign="top">
		{$editable.third_column}{if $editable.third_column==""}&nbsp;{/if}
		</td>
		<td width="2.6%" class="colblock-divider">
		&nbsp;
		</td>
		<td width="23%" valign="top">
		{$editable.fourth_column}{if $editable.fourth_column==""}&nbsp;{/if}
		</td>
	</tr>
</table>
{else}
<div class="column_row magic-heights-wrap">
	<div class='column oneCol first magic-heights'>
		{$editable.first_column}{if $editable.first_column==""}&nbsp;{/if}
	</div>
	<div class='column oneCol lastiftwo magic-heights'>
		{$editable.second_column}{if $editable.second_column==""}&nbsp;{/if}
	</div>
	<div class="cleariftwo"></div>
	<div class='column oneCol firstiftwo magic-heights'>
		{$editable.third_column}{if $editable.third_column==""}&nbsp;{/if}
	</div>
	<div class='column oneCol last magic-heights'>
		{$editable.fourth_column}{if $editable.fourth_column==""}&nbsp;{/if}
	</div>
</div>
{/if}
