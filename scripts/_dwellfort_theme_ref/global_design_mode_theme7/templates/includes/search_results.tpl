{* show search results*}
{if $search_all}
{if $limittext}
<p class="Icon_Info">{$limittext} <a href="?language={$smarty.get.language}&referrer={$referrer|urlencode}">{$langs.Search_Whole_Site}</a></p>
{else}
<div class="centered-tabs">
	<a href="?language={$smarty.get.language}&referrer={$referrer|urlencode}" {if !$smarty.get.images}class="current-centered-tab"{/if}>Pages</a>
	<a href="?language={$smarty.get.language}&images=1&referrer={$referrer|urlencode}" {if $smarty.get.images}class="current-centered-tab"{/if}>Images</a>
</div>
{/if}
{if !$search_results}
<p class="status">{$langs.Search_No_Results|replace:"<SEARCH_TERM>":$searching_by|htmlspecialchars}</p>
{/if}
{if $search_results && $search_results|@count!=0}
<p class="status">{$langs.Search_Total_Results|replace:"<SEARCH_TERM>":$searching_by|htmlspecialchars|replace:"<TOTAL_RESULTS>":$totalResults}</p>
{/if}
{foreach from=$search_results item=search_result key=key name=loop}
	{if $images}
	<div class="imageList"><a href="{if $search_result.homepage=="yes"}/{else}/{$search_result.url}{/if}#showimage-{$search_result.imageid}"><img src="/images/{$search_result.pic_url}?width=400&height=400&shrink=true"></a></div>
	{else}
	{if $search_result.homepage=="yes"}
	<h2 style="font-weight:normal;"><a href="/">{$search_result.title}</a></h2>
	{else}
	<h2 style="font-weight:normal;"><a href="/{$search_result.url}">{$search_result.title}</a></h2>
	{/if}
	{if $search_result.content!=""}
	<p class="nest">{$search_result.content|truncate:300}</p>
	{/if}
	{/if}
{/foreach}
{if $totalPages > 1}
	
		<h5 id="paginate">{if $currentPage == 1}
			<span class="prevLink hidden">{$langs.Previous_Page}</span>

		{else}
		<span class="prevLink"><a href="/search/{$searching_by|urlencode}/page/{math equation="x - y" x=$currentPage y=1}/"><span>{$langs.Previous_Page}</span></a></span>
		{/if} 
		{if $currentPage == $totalPages}
		<span class="nextLink hidden">{$langs.Next_Page}</span>
		{else}
		<span class="nextLink"><a href="/search/{$searching_by|urlencode}/page/{math equation="x + y" x=$currentPage y=1}/"><span>{$langs.Next_Page}</span></a></span> 

		{/if}
		{$langs.Viewing_Page_X_of_X|replace:"<CURRENT_PAGE>":$currentPage|replace:"<TOTAL_PAGES>":$totalPages}
		
	
		</h5>
{/if}
{/if}
