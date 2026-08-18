{strip}
{if $content.homepage=="yes" && $content.blog!="yes"}/{else}

	{if $content.type=="topLevel"}
		/{$content.url}/
	{/if}
	{if $content.tag}tag/{$content.tag}/{/if}
	{if $content.blogDay||$content.blogMonth}date/{/if}
	{if $content.blogDay}{$content.blogDay}/{/if}
	{if $content.blogMonth}{$content.blogMonth}/{$content.blogYear}/{/if}
	{if $content.category}category/{$content.categoryUrl}/{/if}
	
	{*
		if its second level page, show parent and then page title
	*}
	{if $content.type=="subLevel"}
		{foreach from=$mainNavIncExcluded item=topLevelPage}
			{if $content.parent == $topLevelPage.id}
				/{$topLevelPage.url}/{$content.url}/
			{/if}
		{/foreach}
	{/if}
{*
		if its third level page, show parents and then page title
	*}
	
	{if $content.type=="subSubLevel"}
		{foreach from=$mainNavIncExcluded item=topLevelPage}
			{foreach from=$topLevelPage.subs item=subLevelPage}
				{foreach from=$subLevelPage.subSubs item=subSubLevelPage}
					{if $subSubLevelPage.parent == $subLevelPage.id && $content.id==$subSubLevelPage.id}
					/{$topLevelPage.url}/{$subLevelPage.url}/{$content.url}/
					{/if}
				{/foreach}
			{/foreach}
		{/foreach}
	{/if}
	
	{if $content.type=="subSubSubLevel"}
		{foreach from=$mainNavIncExcluded item=topLevelPage}
			{foreach from=$topLevelPage.subs item=subLevelPage}
				{foreach from=$subLevelPage.subSubs item=subSubLevelPage}
					{foreach from=$subSubLevelPage.subSubSubs item=subSubSubLevelPage}
						{if $content.id == $subSubSubLevelPage.id}
							/{$topLevelPage.url}/{$subLevelPage.url}/{$subSubLevelPage.url}/{$content.url}/
						{/if}
					{/foreach}
				{/foreach}
			{/foreach}
		{/foreach}
		
	{/if}


	
	{if $content.showBlog}
		{foreach from=$mainNavIncExcluded item=item key=key name=loop1}
			{if $item.blog == "yes"}
			{$content.articleUrl}/
			{/if}
		{/foreach}
	{/if}
{/if}
{/strip}
