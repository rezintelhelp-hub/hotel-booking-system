{if $content.sentAsEmail}
<table width="100%" class="colblock">
	<tr>
		<td width="65.6%" valign="top">
		{$editable.main_content}{if $editable.main_content==""}&nbsp;{/if}
		</td>
		<td width="2%" class="colblock-divider">
		&nbsp;
		</td>
		<td width="32.3%" valign="top">
		{$editable.sidebar_content}{if $editable.sidebar_content==""}&nbsp;{/if}
		</td>
	</tr>
</table>
{else}
<div class="sticky-container">
<div class='sticky-column-main stickytTwoThirds'>
	{$editable.main_content}{if $editable.main_content==""}&nbsp;{/if}
</div>
<div class='sticky-column-sidebar stickyThirdsCol'>
	<div class="sticky-sidebar-inner">{$editable.sidebar_content}{if $editable.sidebar_content==""}&nbsp;{/if}</div>
</div>
</div>
{/if}