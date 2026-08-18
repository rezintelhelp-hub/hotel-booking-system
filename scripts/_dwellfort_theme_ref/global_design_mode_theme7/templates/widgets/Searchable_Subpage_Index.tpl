<div id="kbIndex">
	<div id="kbSearch" class="clearfix">
		<div id="hideWhenContact">
			<label>{$editable.Search_Title|strip_tags}</label>
			<div id="kbSearchWrap">
			<p id="kbSearchEg">{$editable.Search_Example|strip_tags}</p>
			<input type="text" id="kbSearchInput" />
			<div id="clearKBSearch"></div>
			</div>
		</div>
	</div>
{foreach from=$mainNavIncExcluded item=item name=loop1}

	{if $item.url == $content.url}
		{if $item.subs|@count>0}
			{foreach from=$item.subs item=sub name=kb}
						
					
					{if $smarty.foreach.kb.index % 2 == 0}
					<div class="kbRow clearfix">
					{/if}

							<div class="kbItem {if $smarty.foreach.kb.iteration is odd}left{else}right{/if}">
								<h3>{$sub.pagetitle}</h3>
								{if $sub.subSubs|@count>0}
									<ul>
									{foreach from=$sub.subSubs item=subSub key=key2 name=kb3}
										<li class="{if $subSub.id==$content.id}currentSubSub{/if} {if $smarty.foreach.kb3.iteration=="1"}firstSubSub{/if} {if $smarty.foreach.kb3.iteration>5}hidden{/if} kbItem1 {if $subSub.subSubSubs|@count>0}hasSubs{else}kbArticle{/if}" data-keywords="{$subSub.keywords}"><a href="/{$subSub.topParentUrl}/{$subSub.parentUrl}/{$subSub.url}/">{$subSub.pagetitle}</a>
																		
											{if $subSub.subSubSubs|@count>0}
												<ul class="kbSubSubs">
												
												{foreach from=$subSub.subSubSubs item=subSubSub key=key2 name=kb4}
													<li class="kbItem2" data-keywords="{$subSubSub.keywords}"><a href="/{$subSubSub.topParentUrl}/{$subSubSub.subParentUrl}/{$subSubSub.parentUrl}/{$subSubSub.url}/" class="{if $subSubSub.id==$content.id}current{/if} {if $smarty.foreach.kb4.iteration>5}hidden{/if}">{$subSubSub.pagetitle}</a></li>
												{/foreach}
												</ul>
											{/if} 
										</li>
										{assign var=kb3total value=$smarty.foreach.kb3.total}
	                                                                {/foreach}
                                                                        {if $kb3total > 5}
                                                                                {assign var=remaining value=$kb3total-5}
										<li class="kbAll"><a href="/{$sub.parentUrl}/{$sub.url}/" data-lang-close="View top 5" data-lang-open="View all ({$remaining} more)">View all ({$remaining} more)</a></li>
									{/if}
									</ul>
								{/if} 

							</div>	
					
					{if $smarty.foreach.kb.index % 2 == 1 || $smarty.foreach.kb.last}
					</div>
					{/if}
				   	
				  
			{/foreach}

			
		{/if} 
	{/if}
{/foreach} 
</div>
