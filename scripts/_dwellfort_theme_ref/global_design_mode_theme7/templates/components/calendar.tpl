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
			{if $calendar_start==0}
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
		{/if}
		{if $calendar_start==1}
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
			<th>
				<span class="cal_th_desktop">{"Monday"|date_format_locale:"%A":$language}</span>
				<span class="cal_th_tablet">{"Monday"|date_format_locale:"%a":$language}</span>
				<span class="cal_th_mobile">{"Monday"|date_format_locale:"%a":$language|truncate:"1":"":true}</span>
			</th>
		{/if}
		{if $calendar_start==2}
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
		{/if}
		{if $calendar_start==3}
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
		{/if}
		{if $calendar_start==4}
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
		{/if}
		{if $calendar_start==5}
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
		{/if}
		{if $calendar_start==6}
			<th class="weekend">
				<span class="cal_th_desktop">{"Sunday"|date_format_locale:"%A":$language}</span>
				<span class="cal_th_tablet">{"Sunday"|date_format_locale:"%a":$language}</span>
				<span class="cal_th_mobile">{"Sunday"|date_format_locale:"%a":$language|truncate:"1":"":true}</span>
			</th>
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
		{/if}
	</tr>
	<tr>
	{foreach from=$dates item=item key=key name=loop1}
	{if $item[4]=="prevMonth"}{assign var=str value="`$item[0]` `$prev_month` `$prev_month_year`"}{/if}{if $item[4]=="currentMonth"}{assign var=str value="`$item[0]` `$month` `$year`"}{/if}{if $item[4]=="nextMonth"}{assign var=str value="`$item[0]` `$next_month` `$next_month_year`"}{/if}
		<td class="{if $smarty.now|date_format:"%Y"==$year and $smarty.now|date_format:"%B"==$month and $smarty.now|date_format:"%d"==$item[0]} current{/if} {if $smarty.foreach.loop1.iteration % 7 == 6-$calendar_start || $smarty.foreach.loop1.iteration % 7 == 7-$calendar_start || $smarty.foreach.loop1.iteration % 7 == 0 && $calendar_start==0}weekend{/if} {$item[4]} {if $item[1]|@count>0}hasEvents{/if}" data-full-date="{if $item[4]=="prevMonth"}{$str|date_format_locale:"%d %B %Y":$language}{/if}{if $item[4]=="currentMonth"}{$str|date_format_locale:"%d %B %Y":$language}{/if}{if $item[4]=="nextMonth"}{$str|date_format_locale:"%d %B %Y":$language}{/if}">
			{$item[0]}
			{if $item[1]|@count>0}
			{foreach from=$item[1] item=item1 key=key2 name=loop2}
				<div {if $item1[5]}title="{$item1[5]}"{/if} class="event {foreach from=$item1[10] item=group}ss-filter-group-id-{$group} {/foreach} event-{$item1[0]|css_safe} event-id-{$item1[1]|css_safe}" id="{$item1[1]}">
				{if $item1[8]!="" || $item1[5]!="" ||  $item1[7]!="" || $item1[6] || $item1[11]}
				<div class="eventdetails">
				<strong>{$item1[0]}</strong><br/>
					{if $item1[8]!=""}<img src="/images/{$item1[8]}" style="margin-top:5px;"/><br/>{/if}
					{if $item1[5]!=""}<span class="eventlabel"><em>Summary:</em> {$item1[5]}</span>{/if}
					{if $item1[7]!=""}<span class="eventlabel"><em>Location:</em> {$item1[7]}</span>{/if}
					{if $item1[6]!=""}<span class="eventlabel"><em>Time:</em> {$item1[6]}</span>{/if}
					{if $item1[11]!=""}<span class="eventlabel"><em>Duration:</em> {$item1[11]}</span>{/if}
					
					{if $item1[2]!=""}
					<div class="downloadeventWrap pair"><a  href="/actions/downloadevent/?dateend={if $item1[11]==""}{$str|date_format:"%d-%B-%Y"}{if $item1[6]!=""} {$item1[6]|htmlspecialchars}{else} 10:00 am{/if}{else}{$item1[12].end_timestamp|date_format:"%d-%B-%Y %I:%M %p"}{/if}&location=&summary=&link={$item1[2]}&description={$item1[0]}&datestart={$str|date_format:"%d-%B-%Y"}{if $item1[6]!=""} {$item1[6]|htmlspecialchars}{else} 09:00am{/if}" class='download-event'>Add to calendar</a> <a href="{$item1[2]}" title="Learn more (Opens in new window)" target="_blank">Learn more</a></div>
					{else}
					<div class="downloadeventWrap"><a  href="/actions/downloadevent/?dateend={if $item1[11]==""}{$str|date_format:"%d-%B-%Y"}{if $item1[6]!=""} {$item1[6]|htmlspecialchars}{else} 10:00 am{/if}{else}{$item1[12].end_timestamp|date_format:"%d-%B-%Y %I:%M %p"}{/if}&location=&summary=&link={$item1[2]}&description={$item1[0]}&datestart={$str|date_format:"%d-%B-%Y"}{if $item1[6]!=""} {$item1[6]|htmlspecialchars}{else} 09:00am{/if}" class='download-event'>Add to calendar</a></div>
					{/if}

					
				</div>
				
				{/if}
					{if $item1[2]!=""}<a href="{if $item1[3]!="External Website"}{/if}{$item1[2]}{if $item1[3]!="External Website"}{/if}" target="_blank" title="{$item1[0]} (Opens in new window)">{/if}{$item1[0]}{if $item1[2]!=""}</a>{/if}
					</div>
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
