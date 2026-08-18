{if $content.sentAsEmail}
<table width="100%" class="colblock">
	<tr>
		<td width="65.6%" valign="middle">
		{$editable.main_content}{if $editable.main_content==""}&nbsp;{/if}
		</td>
		<td width="2%" class="colblock-divider">
		&nbsp;
		</td>
		<td width="32.3%" valign="middle">
		{$editable.sidebar_content}{if $editable.sidebar_content==""}&nbsp;{/if}
		</td>
	</tr>
</table>
{else}
<div class="column_row vertical-align">
<div class='column twoThirds first'>
	{$editable.main_content}{if $editable.main_content==""}&nbsp;{/if}
</div>
<div class='column thirdsCol last'>
	{$editable.sidebar_content}{if $editable.sidebar_content==""}&nbsp;{/if}
</div>
</div>
{/if}