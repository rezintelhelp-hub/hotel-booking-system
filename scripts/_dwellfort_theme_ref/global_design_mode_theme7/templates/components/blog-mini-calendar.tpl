<input type="hidden" name="" value="{$prev_month_year}" id="blog_prev_month_year"/>
<input type="hidden" name="" value="{$prev_month}" id="blog_prev_month_val"/>
<input type="hidden" name="" value="{$next_month}" id="blog_next_month_val"/>
<input type="hidden" name="" value="{$next_month_year}" id="blog_next_month_year"/>
<input type="hidden" name="" value="{$month}" id="blog_current_month"/>
<input type="hidden" name="" value="{$year}" id="blog_current_year"/>
{assign var=monthyear value="$month $year"}
<p id="blogCalMonth"><a href="" id="blog_prev_month" title="Show Next Month">Show Next Month</a>  <a href="" id="blog_next_month" title="Show Previous Month">Show Previous Month</a><a href="/{$content_url}/date/{$month}/{$year}/{if $viewing_cat_name!=""}category/{$cat_url}/{/if}">{$month|date_format_locale:"%B":$language} {$monthyear|date_format_locale:"%Y":$language}</a></p>

<table class="calTableBlog">
	<tr>
		<th>{"Monday"|date_format_locale:"%a":$language|truncate:"2":""}</th>
		<th>{"Tuesday"|date_format_locale:"%a":$language|truncate:"2":""}</th>
		<th>{"Wednesday"|date_format_locale:"%a":$language|truncate:"2":""}</th>
		<th>{"Thursday"|date_format_locale:"%a":$language|truncate:"2":""}</th>
		<th>{"Friday"|date_format_locale:"%a":$language|truncate:"2":""}</th>
		<th>{"Saturday"|date_format_locale:"%a":$language|truncate:"2":""}</th>
		<th>{"Sunday"|date_format_locale:"%a":$language|truncate:"2":""}</th>
	</tr>
	<tr>
	{foreach from=$dates item=item key=key name=loop1}
		<td{if $smarty.now|date_format:"%Y"==$year and $smarty.now|date_format:"%B"==$month and $smarty.now|date_format:"%d"==$item[0]} class="current"{/if}>
			{if $item[1]=="yes"}
			<a href="/{$content_url}/date/{$item[2]}/{if $viewing_cat_name!=""}category/{$cat_url}/{/if}">{$item[0]}</a>
			{else}
			{$item[0]}
			{/if}
		</td>
	{if $smarty.foreach.loop1.iteration is div by 7}
	</tr>
	<tr>
	{/if}
	{/foreach}
	</tr>
</table>
