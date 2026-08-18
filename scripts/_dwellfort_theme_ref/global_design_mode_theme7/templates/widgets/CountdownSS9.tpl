{* @@@
{
	"widget_info":{
		"title":"Countdown"
		,"title_info":"Enter a name for this instance of the Countdown widget"
		,"category":"setup"
		,"include_js":"countdown.js,countdown.ready.js"
	},
	"meta_data":[{
		"name":"Date",
		"var":"time",
		"default":"2050/12/25 12:30:00",
		"type":"text"	
		,"info":"Enter a target date and time for the countdown. Should be in this format: YYYY/MM/DD HH:MM:SS"
	}],
	"inner_templates":{
	}
}
@@@ *}
<ul class="countdownclock" data-time="{$metadata.time|convert_time_timezone:$content.timezone}">
	<li><span class="years">00</span><p class="years_text">Years</p></li>
	<li class="seperator">:</li>
	<li><span class="days">00</span><p class="days_text">Days</p></li>
	<li class="seperator">:</li>
	<li><span class="hours">00</span><p class="hours_text">Hours</p></li>
	<li class="seperator">:</li>
	<li><span class="minutes">00</span><p class="minutes_text">Minutes</p></li>
	<li class="seperator">:</li>
	<li><span class="seconds">00</span><p class="seconds_text">Seconds</p></li>
</ul>
<div class="countdown-show-after">
 {$editable.show_when_complete}
</div>
