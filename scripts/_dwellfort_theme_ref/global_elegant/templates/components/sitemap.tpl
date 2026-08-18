<ul>
{foreach from=$sitemapPages item=item key=key name=loop1}
	<li><a href="{if $item.homepage == "yes"}/{else}/{$item.url}/{/if}">{$item.title}</a>
		{if $item.subs|@count>0}
			<ul>
			{foreach from=$item.subs item=sub key=key2 name=loop2}
				<li><a href="/{$sub.parentUrl}/{$sub.url}/">{$sub.pagetitle}</a>
					{if $sub.blog=="yes"}
						<ul>
						{foreach from=$blogPagesSitemap item=blogPage key=key name=loop1}
						<li><a href="/{$item.url}/{$blogPage.url}/">{$blogPage.title}</a></li>
						{/foreach}
						</ul>
					{/if}
					{if $sub.subSubs|@count>0}
						<ul>
							{foreach from=$sub.subSubs item=subSub}
								<li><a href="/{$subSub.topParentUrl}/{$subSub.parentUrl}/{$subSub.url}/">{$subSub.pagetitle}</a></li>
							{/foreach}
						</ul>
					{/if}
				</li>
			{/foreach}
			</ul>
		{/if}	
		{if $item.blog=="yes" && $item.subs|@count<=0}
			<ul>
			{foreach from=$blogPagesSitemap item=blogPage key=key name=loop1}
			<li><a href="/{$item.url}/{$blogPage.url}/">{$blogPage.title}</a></li>
			{/foreach}
			</ul>
		{/if}
	</li>
{/foreach}
{foreach from=$nonLinkers item=item key=key name=loop1}
	<li><a href="{if $item.homepage == "yes"}/{else}/{$item.url}/{/if}">{$item.title}</a>
		{if $item.blog=="yes"}
			<ul>
			{foreach from=$blogPagesSitemap item=blogPage key=key name=loop1}
			<li><a href="/{$item.url}/{$blogPage.url}/">{$blogPage.title}</a></li>
			{/foreach}
			</ul>
		{/if}
	</li>
{/foreach}
</ul>
