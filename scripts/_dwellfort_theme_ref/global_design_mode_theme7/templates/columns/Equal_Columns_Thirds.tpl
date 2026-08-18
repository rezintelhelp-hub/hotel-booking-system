{if $content.sentAsEmail}
<table width="100%" class="colblock">
	<tr>
		<td width="32%" valign="top">
		{$editable.first_column}{if $editable.first_column==""}&nbsp;{/if}
		</td>
		<td width="2%" class="colblock-divider">
		&nbsp;
		</td>
		<td width="32%" valign="top">
		{$editable.second_column}{if $editable.second_column==""}&nbsp;{/if}
		</td>
		<td width="2%" class="colblock-divider">
		&nbsp;
		</td>
		<td width="32%" valign="top">
		{$editable.third_column}{if $editable.third_column==""}&nbsp;{/if}
		</td>
	</tr>
</table>
{else}
<div class="column_row magic-heights-wrap">
	<div class='column threeThirdsCol first magic-heights'>
		{$editable.first_column}{if $editable.first_column==""}&nbsp;{/if}
	</div>
	<div class='column threeThirdsCol magic-heights'>
		{$editable.second_column}{if $editable.second_column==""}&nbsp;{/if}
	</div>
	<div class='column threeThirdsCol last magic-heights'>
		{$editable.third_column}{if $editable.third_column==""}&nbsp;{/if}
	</div>
</div>
{/if}
