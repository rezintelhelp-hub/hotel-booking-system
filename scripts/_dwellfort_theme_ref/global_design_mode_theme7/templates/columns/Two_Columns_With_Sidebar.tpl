{if $content.sentAsEmail}
<table width="100%" class="colblock">
	<tr>
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
		<td width="2%" class="colblock-divider">
		&nbsp;
		</td>
		<td width="24%" valign="top">
		{$editable.sidebar_content}{if $editable.sidebar_content==""}&nbsp;{/if}
		</td>
	</tr>
</table>
{else}
<div class="column_row magic-heights">
<div class='column threeCol first'>
	<div class="column_row">
		<div class='column twoCol first magic-heights'>
			{$editable.first_column}{if $editable.first_column==""}&nbsp;{/if}
		</div>
		<div class='column twoCol last magic-heights'>
			{$editable.second_column}{if $editable.second_column==""}&nbsp;{/if}
		</div>
	</div>
</div>
<div class='column quartCol last magic-heights'>
	{$editable.sidebar_content}{if $editable.sidebar_content==""}&nbsp;{/if}
</div>
</div>
{/if}
