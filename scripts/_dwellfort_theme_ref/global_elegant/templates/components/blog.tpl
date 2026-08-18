<div id="blogContent">
	
	{if $show_blog=="yes"} {* if we are showing a single article, show the article template *}

		{include file=components/blog-article.tpl}

	{else} {* otherwise, show the blog listings *}
		
		{if $viewing_cat_name!="" && $viewing_date=="month"}
			<div class="container"><p id="status">{$langs.Browsing_Cat_Month_Year|replace:"<CATEGORY>":$viewing_cat_name|replace:"<MONTH>":$month|replace:"<YEAR>":$year} (<a href="/{$contentUrl}/">{$langs.Show_All}</a>)</p></div>
		{elseif $viewing_cat_name!="" && $viewing_date=="day"}
			<div class="container"><p id="status">{$langs.Browsing_Cat_Month_Day_Year|replace:"<CATEGORY>":$viewing_cat_name|replace:"<MONTH>":$month|replace:"<YEAR>":$year|replace:"<DAY>":$day}
				 (<a href="/{$contentUrl}/">{$langs.Show_All}</a>)</p></div>
		{elseif $viewing_cat_name!=""}
			<div class="container"><p id="status">{$langs.Browsing_Cat|replace:"<CATEGORY>":$viewing_cat_name}
				 (<a href="/{$contentUrl}/">{$langs.Show_All}</a>)</p></div>
		{/if}
		{if $viewing_date=="month" && $viewing_cat_name==""}
			<div class="container"><p id="status">{$langs.Browsing_Month_Year|replace:"<MONTH>":$month|replace:"<YEAR>":$year}
				 (<a href="/{$contentUrl}/">{$langs.Show_All}</a>)</p></div>
		{/if}
		{if $viewing_date=="day" && $viewing_cat_name==""}
			<div class="container"><p id="status">{$langs.Browsing_Month_Year_Day|replace:"<MONTH>":$month|replace:"<YEAR>":$year|replace:"<DAY>":$day}
				(<a href="/{$contentUrl}/">{$langs.Show_All}</a>)</p></div>
		{/if}
		{if $searching_by!=""}
			<div class="container"><p id="status">
				{$langs.Searching_By|replace:"<SEARCH_TERM>":$searching_by}
				(<a href="/{$contentUrl}/">{$langs.Show_All}</a>)</p></div>
		{/if}
		{if $viewingtag}
			{$langs.Viewing_Tag|replace:"<TAG>":$viewingtag}
		{/if}
		{if $blogs}
		{foreach from=$blogs item=blog key=key name=loop}
		<div class="blogItemLoop" {if $blog.picUrl}{assign var=img value="?"|explode:$blog.picUrl}data-pic="{$img[0]}"{/if}>
			<div class="container">
				<h2 class='blogTitle'><a href="/{$contentUrl}/{$blog.url}/">{$blog.title}</a></h2>
				<p class="blogDate clearfix">{$blog.timestamp|date_format_locale:"<strong>%A</strong>, %B %e, %Y":$language}
					{*}
					{if $blog.tags}<span style='float:left;margin-right:10px'>{$langs.Tags}</span> 
						{foreach from=$blog.tags item=tag key=key name=loop1}
							<a href="/{$contentUrl}/tag/{$tag.url}/" class="tag"><span>{$tag.name}{if !$smarty.foreach.loop1.last}{/if}</span></a>
						{/foreach}
						<span class="clear"><!-- --></span>
					{/if}
					
					{if $blog.in_categories|@count>1}Filed in: {foreach from=$cats item=cat}
							{foreach from=$blog.in_categories item=in_cat name=catsloop}
								{if $in_cat == $cat.id}<a href="/{$contentUrl}/category/{$cat.url}/">{$cat.name}</a>{if !$smarty.foreach.catsloop.last}, {/if}{/if}
							{/foreach}
						{/foreach}<br/> {/if}
					<a href="/{$contentUrl}/{$blog.url}/#comments">{$langs.Read_Comments} ({$blog.comments|@count})</a> 
				*}</p>
				{assign var=temp value="</p>"|explode:$blog.content}
				{$temp[0]}</p>
				<p class="Button_Large"><a href="/{$contentUrl}/{$blog.url}/">Read more</a></p>
			
			</div>
		</div>
		{/foreach}
		{if $totalPages != 1}
			<div class="container blogPagination">
				{if $viewing_date}
					{if $viewing_date=="day"}
					<h5 id="paginate">{if $currentPage == 1}
						<span class="prevLink hidden">{$langs.Previous_Page}</span>

						{else}
						<span class="prevLink"><a href="/{$contentUrl}/date/{$day}/{$month}/{$year}/{if $viewing_cat_name!=""}category/{$cat_url}/{/if}page/{math equation="x - y" x=$currentPage y=1}/"><span>{$langs.Previous_Page}</span></a></span>
						{/if} 
						{if $currentPage == $totalPages}
						<span class="nextLink hidden">{$langs.Next_Page}</span>

						{else}
						<span class="nextLink"><a href="/{$contentUrl}/date/{$day}/{$month}/{$year}/{if $viewing_cat_name!=""}category/{$cat_url}/{/if}page/{math equation="x + y" x=$currentPage y=1}/"><span>{$langs.Next_Page}</span></a></span> 

						{/if}
						<span class="viewing">{$langs.Viewing_Page} <strong>{$currentPage} of {$totalPages}</strong></span>
						
						</h5>
					{else}
						<h5 id="paginate">{if $currentPage == 1}
							<span class="prevLink hidden">{$langs.Previous_Page}</span>
						{else}
						<span class="prevLink"><a href="/{$contentUrl}/date/{$month}/{$year}/{if $viewing_cat_name!=""}category/{$cat_url}/{/if}page/{math equation="x - y" x=$currentPage y=1}/"><span>{$langs.Previous_Page}</span></a></span>
						{/if} 
						{if $currentPage == $totalPages}
						<span class="nextLink hidden">{$langs.Next_Page}</span>
						{else}
						<span class="nextLink"><a href="/{$contentUrl}/date/{$month}/{$year}/{if $viewing_cat_name!=""}category/{$cat_url}/{/if}page/{math equation="x + y" x=$currentPage y=1}/"><span>{$langs.Next_Page}</span></a></span> 

						{/if}
						<span class="viewing">{$langs.Viewing_Page} <strong>{$currentPage} of {$totalPages}</strong></span>
						
						</h5>
					{/if}
				{else}
					<h5 id="paginate">{if $currentPage == 1}
						<span class="prevLink hidden">{$langs.Previous_Page}</span>

					{else}
					<span class="prevLink"><a href="/{$contentUrl}/{if $searching_by!=""}search/{$searching_by}/{/if}{if $viewingtag}tag/{$viewingtag}/{/if}{if $viewing_cat_name!=""}category/{$cat_url}/{/if}page/{math equation="x - y" x=$currentPage y=1}/"><span>{$langs.Previous_Page}</span></a></span>
					{/if} 
					{if $currentPage == $totalPages}
					<span class="nextLink hidden">{$langs.Next_Page}</span>
					{else}
					<span class="nextLink"><a href="/{$contentUrl}/{if $searching_by!=""}search/{$searching_by}/{/if}{if $viewingtag}tag/{$viewingtag}/{/if}{if $viewing_cat_name!=""}category/{$cat_url}/{/if}page/{math equation="x + y" x=$currentPage y=1}/"><span>{$langs.Next_Page}</span></a></span> 

					{/if}
					<span class="viewing">{$langs.Viewing_Page} <strong>{$currentPage} of {$totalPages}</strong></span>
					
					</h5>
				{/if}
			{/if}
			</div>
		{else}
		<div class="container">
			{if $searching_by!=""}
			<h1>{$langs.No_Entries_Search}</h1>
			
			{else}
			<h1>{$langs.No_Entries}</h1>
			{/if}
		</div>
		{/if} 
		
	{/if}
</div>
<div id="sidebar">
	<div class="container">
		<div class="row">
			<div class='column oneCol first'>
				<h4>{$langs.View_By_Date}</h4>
				<div id="blogCal"></div>
			</div>
			<div class='column oneCol lastiftwo'>
				{if $cats}
			
					<h4>{$langs.Categories}</h4>
					<ul id="blogCats">
						<li{if $viewing_cat_name=="" && $show_blog!="yes" && $viewing_date=="" && $searching_by==""} class="current"{/if}><a href="{if $content.homepage=="yes"}/{else}/{$contentUrl}/{/if}">{$langs.Show_All}</a></li>
					{foreach from=$cats item=cat key=key name=loop1}
						<li{if $viewing_cat_name==$cat.name} class="current"{/if}><a href="/{$contentUrl}/category/{$cat.url}/">{$cat.name}</a></li>
					{/foreach}</ul>
				
				{/if}
			</div>
			<div class="cleariftwo"></div>
			<div class='column oneCol firstiftwo'>
			
				{if $recentArticles}

					<h4>{$langs.Recent_Articles}</h4>
					<ul id="recArts">{foreach from=$recentArticles item=recArt key=key name=loop1}
						<li{if $title==$recArt.name} class="current"{/if}><a href="/{$contentUrl}/{$recArt.url}/">{$recArt.name}</a></li>
					{/foreach}</ul>
					
				{/if}
			</div>
			<div class='column oneCol last'>
				{if $tagCloud}
	
				<h4>{$langs.Tag_Cloud}</h4>
				<ul id="tagCloud" class="clearfix">
				{foreach from=$tagCloud item=item}
					<li class="tag-{$item.ratio}"><a href="/{$contentUrl}/tag/{$item.url}/">{$item.name}</a></li>
				{/foreach}
				</ul>
			
				{/if}
			</div>
		</div>
	</div>
</div>

<footer id="mainFooter">
	<div class="container">
	{$sitewideContent.Footer}
	</div>
</footer>

<footer id="closing">
	<div class="container">
		<div id="closingRight">
		{$sitewideContent.Closing_Footer_Right}
		<p><a href="http://setseed.com?r=t">Proudly powered by SetSeed</a></p>
		</div>
		{$sitewideContent.Closing_Footer}
	</div>
</footer>