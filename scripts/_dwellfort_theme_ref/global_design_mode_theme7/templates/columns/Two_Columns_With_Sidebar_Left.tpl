{if $content.sentAsEmail}
<table width="100%" class="colblock">
	<tr>
		<td width="24%" valign="top">
		{$editable.sidebar_content}{if $editable.sidebar_content==""}&nbsp;{/if}
		</td>
		<td width="2%" class="colblock-divider">
		&nbsp;
		</td>
		<td width="74%" valign="top">
			<table width="100%" class="colblock">
				<tr>
					<td width="49%" valign="top">
					{$editable.first_column}{if $editable.first_column==""}&nbsp;{/if}
					</td>
					<td width="2%" class="colblock-divider">
					&nbsp;
					</td>
					<td width="49%" valign="top">
					{$editable.second_column}{if $editable.second_column==""}&nbsp;{/if}
					</td>
				</tr>
			</table>
		</td>
	</tr>
</table>
{else}
<div class="column_row magic-heights-wrap">
<div class='column quartCol first magic-heights'>
	{$editable.sidebar_content}{if $editable.sidebar_content==""}&nbsp;{/if}
</div>
<div class='column threeCol last'>
	<div class="column_row">
		<div class='column magic-heights twoCol first'>
			{$editable.first_column}{if $editable.first_column==""}&nbsp;{/if}
		</div>
		<div class='column twoCol last magic-heights'>
			{$editable.second_column}{if $editable.second_column==""}&nbsp;{/if}
		</div>
	</div>
</div>
</div>
{/if}
