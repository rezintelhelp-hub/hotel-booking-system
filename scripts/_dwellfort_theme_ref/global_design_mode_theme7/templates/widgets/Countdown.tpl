{* @@@
{
	"widget_info":{
		"title":""
		,"title_info":""
		,"legacy":"true"
		,"include_js":"countdown.js,countdown.ready.js"
	},
	"meta_data":[],
	"inner_templates":{
	}
}
@@@ *}
{*
{$editable.time}
*}
<ul class="countdownclock" data-time="{$editable.time|strip_tags|convert_time_timezone:$content.timezone}">
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
