<div id="blogContent" class="{if $show_blog=="yes"}showingblog{/if} {if $theme_vars_show_blog_sidebar==0}without-sidebar{/if}">
    <main id="content" tabindex="-1">
	{if $show_blog=="yes"} {* if we are showing a single article, show the article template *}

		{include file=components/blog-article.tpl}

	{else} {* otherwise, show the blog listings *}

		{if $viewing_cat_name!="" && $viewing_date=="month"}
			<p id="status" class="Icon_Info">{$langs.Browsing_Cat_Month_Year|replace:"<CATEGORY>":$viewing_cat_name|replace:"<MONTH>":$month|replace:"<YEAR>":$year} (<a href="/{$contentUrl}/">{$langs.Show_All}</a>)</p>
		{elseif $viewing_cat_name!="" && $viewing_date=="day"}
			<p id="status"  class="Icon_Info">{$langs.Browsing_Cat_Month_Day_Year|replace:"<CATEGORY>":$viewing_cat_name|replace:"<MONTH>":$month|replace:"<YEAR>":$year|replace:"<DAY>":$day}
				 (<a href="/{$contentUrl}/">{$langs.Show_All}</a>)</p>
		{elseif $viewing_cat_name!=""}
			<p id="status" class="Icon_Info">{$langs.Browsing_Cat|replace:"<CATEGORY>":$viewing_cat_name}
				 (<a href="/{$contentUrl}/">{$langs.Show_All}</a>)</p>
		{/if}
		{if $viewing_date=="month" && $viewing_cat_name==""}
			<p id="status" class="Icon_Info">{$langs.Browsing_Month_Year|replace:"<MONTH>":$month|replace:"<YEAR>":$year}
				 (<a href="/{$contentUrl}/">{$langs.Show_All}</a>)</p>
		{/if}
		{if $viewing_date=="day" && $viewing_cat_name==""}
			<p id="status" class="Icon_Info">{$langs.Browsing_Month_Year_Day|replace:"<MONTH>":$month|replace:"<YEAR>":$year|replace:"<DAY>":$day}
				(<a href="/{$contentUrl}/">{$langs.Show_All}</a>)</p>
		{/if}
		{if $searching_by!=""}
			<p id="status" class="Icon_Info">
				{$langs.Searching_By|replace:"<SEARCH_TERM>":$searching_by}
				(<a href="/{$contentUrl}/">{$langs.Show_All}</a>)</p>
		{/if}
		{if $viewingtag}
			<p id="status" class="Icon_Info">{$langs.Viewing_Tag|replace:"<TAG>":$viewingtag}</p>
		{/if}
		{if $currentPage == 1 && $pinned}
			{foreach from=$pinned item=pin}
				<div class="carousel_slide">
					<div class="pinnedBlog clearfix">
					
				
					{if $pin.picUrl}{assign var=img value="?"|explode:$pin.picUrl}
					<div class="bpe_image Left_Image"><a href="/{$contentUrl}/{$pin.url}/" style="display:block;line-height:0;"><img src="{if $pin.from_fb==0}{$img[0]}?width=1000&height=600&shrink=false{else}{$pin.full_pic_url}{/if}" alt="{$pin.title}"/></a></div>{/if}
					<h2 class='blogTitle'><a href="/{$contentUrl}/{$pin.url}/">{$pin.title}</a></h2>
					<p class="blogDate"><a href="/{$contentUrl}/{$pin.url}/">{$pin.timestamp|date_format_locale:"<strong>%A</strong>, %B %e, %Y":$language}</a></p>
					{assign var=temp1 value="<p"|explode:$pin.content|strip_tags}
					{assign var=temp value=">"|explode:$temp1[1]}
				
					<p><a href="/{$contentUrl}/{$pin.url}/">{$temp[1]|truncate:100:"&hellip;"}</a></p>
				
					<p class="blogReadMore"><a href="/{$contentUrl}/{$pin.url}/">Read more</a></p>
					</div>
				</div>
			{/foreach}
			<div class="hr"></div>
		{/if}
		{if $blogs}

			{foreach from=$blogs item=blog key=key name=loop}
			<div class="blogItemLoop {if $smarty.foreach.loop.iteration % 2 == 1}odd{/if} {if $smarty.foreach.loop.iteration % 3 == 2}middle-of-three{/if}">
					<p class="blogDate clearfix"><a href="/{$contentUrl}/{$blog.url}/">{$blog.timestamp|date_format_locale:"<strong>%A</strong>, %B %e, %Y":$language}</a></p>
				
					{if $blog.picUrl}{assign var=img value="?"|explode:$blog.picUrl}
					<a href="/{$contentUrl}/{$blog.url}/" style="display:block;line-height:0;"><img src="{if $blog.from_fb==0}{$img[0]}?width={if $theme_vars_blog_grid}400&height=400{else}1000&height=auto{/if}&shrink=false{else}{$blog.full_pic_url}{/if}" class="blogBanner" alt="{$blog.title}"/></a>
					{else}
					{if $theme_vars_blog_grid}<a href="/{$contentUrl}/{$blog.url}/" style="display:block;line-height:0;" class="placeholderimage"><img src="/graphics/x.gif" width="400" height="400" class="blogBanner" alt="{$blog.title}"/></a>{/if}
					{/if}
					<div class="blog-grid-index-height">
					<h2 class='blogTitle'><a href="/{$contentUrl}/{$blog.url}/">{$blog.title}</a></h2>
				
					{assign var=temp1 value="<p"|explode:$blog.content|strip_tags}
					
					{assign var=temp value=">"|explode:$temp1[1]}
					{if $temp[1]!=""}
					<p><a href="/{$contentUrl}/{$blog.url}/">{$temp[1]|truncate:$theme_vars_blog_preview_characters:"&hellip;"}</a></p>
					{/if}
					</div>
					<p class="blogReadMore"><a href="/{$contentUrl}/{$blog.url}/">Read more</a></p>


			</div>
			{/foreach}
			<div class="clear"></div>
			{if $totalPages != 1}
				<div class="blogPagination">
				{if $viewing_date}
					{if $viewing_date=="day"}
					<p id="paginate">
						{if $currentPage == 1}
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

						</p>
					{else}
						<p id="paginate">
						{if $currentPage == 1}
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

						</p>
					{/if}
				{else}
					<p id="paginate">
					{if $currentPage == 1}
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

					</p>
				{/if}
				</div>
			{/if}
			
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
	</main>
</div>
{if $theme_vars_show_blog_sidebar}
<div id="sidebar">
	<aside>
				{if $theme_vars_show_blog_minical}
				<p><strong>{$langs.View_By_Date}</strong></p>
				<div id="blogCal"></div>
				{/if}
				
				{if $cats && $theme_vars_show_blog_cats}

					<p><strong>{$langs.Categories}</strong></p>
					<ul id="blogCats">
						<li{if $viewing_cat_name=="" && $show_blog!="yes" && $viewing_date=="" && $searching_by==""} class="current"{/if}><a href="{if $content.homepage=="yes"}/{else}/{$contentUrl}/{/if}">{$langs.Show_All}</a></li>
					{foreach from=$cats item=cat key=key name=loop1}
						<li{if $viewing_cat_name==$cat.name} class="current"{/if}><a href="/{$contentUrl}/category/{$cat.url}/">{$cat.name}</a></li>
					{/foreach}</ul>

				{/if}
			
				{if $recentArticles && $theme_vars_show_blog_recarts}

					<p><strong>{$langs.Recent_Articles}</strong></p>
					<ul id="recArts">{foreach from=$recentArticles item=recArt key=key name=loop1}
						<li{if $title==$recArt.name} class="current"{/if}><a href="/{$contentUrl}/{$recArt.url}/">{$recArt.name}</a></li>
					{/foreach}</ul>

				{/if}

				{if $tagCloud && $theme_vars_show_blog_tags}

				<p><strong>{$langs.Tag_Cloud}</strong></p>
				<ul id="tagCloud" class="clearfix">
				{foreach from=$tagCloud item=item}
					<li class="tag-{$item.ratio}"><a href="/{$contentUrl}/tag/{$item.url}/">{$item.name}</a></li>
				{/foreach}
				</ul>

				{/if}
		</aside>

</div>
{/if}
<div class="clear"></div>
