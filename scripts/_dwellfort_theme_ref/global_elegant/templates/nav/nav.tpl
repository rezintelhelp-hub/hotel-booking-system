<nav id="nav" role="navigation" class="clearfix">
	<div class="container">
		<a href="#nav" title="Show navigation" class="navToggle show">+</a>
    	<a href="#" title="Hide navigation" class="navToggle hide">-</a>
    	{if $loggedIn||$content.languages_in_use||$theme_vars_contactbar}
    	<a href="#topbar" title="Show Contact Bar" class="contactBarToggle show">+</a>
    	<a href="#" title="Hide Contact Bar" class="contactBarToggle hide">-</a>
    	{/if}
		{if $theme_vars_logo}
		<div id="logo" class="size_{$theme_vars_logo_size}"><a href="/"><img src="/images/themegraphics/{$theme_vars_logo}" /></a></div>
		{else}
		<div id="textLogo" class="text_logo_size_{$theme_vars_logo_size}">	
			<p><a href="/">{$theme_vars_logo_text}</a></p>
		</div>
		{/if}
	    <div id="expandNav" class="size_{$theme_vars_main_menu_size} with_logo_size_{$theme_vars_logo_size}">
			<ul>
				{foreach from=$mainNav item=item key=key name=loop1}
				{if $item.url == $content.url || $item.id == $content.parent || $item.id == $content.topParent}
				<li class="current"><a href="{if $item.homepage == "yes"}/{else}/{$item.url}/{/if}" title="{$item.title}">{if $item.subs}<span>{/if}{$item.title}{if $item.subs}</span>{/if}</a>{include file="nav/drop-down-menu.tpl" subs=$item.subs}</li>
				{assign var=current value="true"}
				{else}
				<li><a href="{if $item.homepage == "yes"}/{else}/{$item.url}/{/if}" title="{$item.title}">{if $item.subs}<span>{/if}{$item.title}{if $item.subs}</span>{/if}</a>{include file="nav/drop-down-menu.tpl" subs=$item.subs}</li>
				{/if}
				{/foreach} 
				<li>
					<form action="/actions/SearchForward/" method="post" id="searchFormSmall">
						<fieldset class="focusSwapWrap">
						<input type="hidden" name="language" value="{$content.language}"/>
						<label for="navSearch" class="focusSwapLabel">{$langs.Search}</label>
						<input id="navSearch" type="text" name="string" value="" />
						</fieldset>
					</form>
				</li>
			</ul>
		</div>
	</div>
</nav>