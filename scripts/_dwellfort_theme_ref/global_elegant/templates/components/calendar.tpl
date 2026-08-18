<input type="hidden" name="" value="{$prev_month_year}" id="prev_month_year" class="prev_month_year"/>
<input type="hidden" name="" value="{$prev_month}" id="prev_month_val" class="prev_month_val"/>
<input type="hidden" name="" value="{$next_month}" id="next_month_val" class="next_month_val"/>
<input type="hidden" name="" value="{$next_month_year}" id="next_month_year" class="next_month_year"/>
<input type="hidden" name="" value="{$month}" id="current_month" class="current_month"/>
<input type="hidden" name="" value="{$year}" id="current_year" class="current_year"/>
{assign var=monthyear value="$month $year"}

<h1 class="calMonth"><a href="" id="prev_month" class="prev_month"></a>  <a href="" id="next_month" class="next_month"></a>{$month|date_format_locale:"%B":$language} {$monthyear|date_format_locale:"%Y":$language}</h1>
<table class="calTable">
	<tr>
		<th>
			<span class="cal_th_desktop">{"Monday"|date_format_locale:"%A":$language}</span>
			<span class="cal_th_tablet">{"Monday"|date_format_locale:"%a":$language}</span>
			<span class="cal_th_mobile">{"Monday"|date_format_locale:"%a":$language|truncate:"1":"":true}</span>
		</th>
		<th>
			<span class="cal_th_desktop">{"Tuesday"|date_format_locale:"%A":$language}</span>
			<span class="cal_th_tablet">{"Tuesday"|date_format_locale:"%a":$language}</span>
			<span class="cal_th_mobile">{"Tuesday"|date_format_locale:"%a":$language|truncate:"1":"":true}</span>
		</th>
		<th>
			<span class="cal_th_desktop">{"Wednesday"|date_format_locale:"%A":$language}</span>
			<span class="cal_th_tablet">{"Wednesday"|date_format_locale:"%a":$language}</span>
			<span class="cal_th_mobile">{"Wednesday"|date_format_locale:"%a":$language|truncate:"1":"":true}</span>
		</th>
		<th>
			<span class="cal_th_desktop">{"Thursday"|date_format_locale:"%A":$language}</span>
			<span class="cal_th_tablet">{"Thursday"|date_format_locale:"%a":$language}</span>
			<span class="cal_th_mobile">{"Thursday"|date_format_locale:"%a":$language|truncate:"1":"":true}</span>
		</th>
		<th>
			<span class="cal_th_desktop">{"Friday"|date_format_locale:"%A":$language}</span>
			<span class="cal_th_tablet">{"Friday"|date_format_locale:"%a":$language}</span>
			<span class="cal_th_mobile">{"Friday"|date_format_locale:"%a":$language|truncate:"1":"":true}</span>
		</th>
		<th class="weekend">
			<span class="cal_th_desktop">{"Saturday"|date_format_locale:"%A":$language}</span>
			<span class="cal_th_tablet">{"Saturday"|date_format_locale:"%a":$language}</span>
			<span class="cal_th_mobile">{"Saturday"|date_format_locale:"%a":$language|truncate:"1":"":true}</span>
		</th>
		<th class="weekend">
			<span class="cal_th_desktop">{"Sunday"|date_format_locale:"%A":$language}</span>
			<span class="cal_th_tablet">{"Sunday"|date_format_locale:"%a":$language}</span>
			<span class="cal_th_mobile">{"Sunday"|date_format_locale:"%a":$language|truncate:"1":"":true}</span>
		</th>
	</tr>
	<tr>
	{foreach from=$dates item=item key=key name=loop1}
		<td class="{if $smarty.now|date_format:"%Y"==$year and $smarty.now|date_format:"%B"==$month and $smarty.now|date_format:"%d"==$item[0]} current{/if} {if $smarty.foreach.loop1.iteration % 7 == 6 || $smarty.foreach.loop1.iteration % 7 == 0}weekend{/if} {$item[4]} {if $item[1]|@count>0}hasEvents{/if}" data-full-date="{if $item[4]=="prevMonth"}{assign var=str value="$item[0] $prev_month $prev_month_year"}{$str|date_format_locale:"%d %B %Y":$language}{/if}{if $item[4]=="currentMonth"}{assign var=str value="$item[0] $month $year"}{$str|date_format_locale:"%d %B %Y":$language}{/if}{if $item[4]=="nextMonth"}{assign var=str value="$item[0] $next_month $next_month_year"}{$str|date_format_locale:"%d %B %Y":$language}{/if}">
			{$item[0]}
			{if $item[1]|@count>0}
			{foreach from=$item[1] item=item1 key=key2 name=loop2}
				<div class="event" id="{$item1[1]}">{if $item1[2]!=""}<a href="{if $item1[3]!="External Website"}{/if}{$item1[2]}{if $item1[3]!="External Website"}{/if}">{/if}{$item1[0]}{if $item1[2]!=""}</a>{/if}</div>
			{/foreach}
			{/if}
		</td>
	{if $smarty.foreach.loop1.iteration is div by 7}
	</tr>
	<tr>
	{/if}
	{/foreach}
	</tr>
</table>
