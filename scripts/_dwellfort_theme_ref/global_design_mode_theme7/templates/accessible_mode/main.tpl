<!doctype html>
<html class="no-js" lang="{$content.language}">
<head prefix="og: http://ogp.me/ns#">

    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">


	<meta name="robots" content="noindex,nofollow">
	    <meta name="viewport" content="width=device-width, initial-scale=1">

	{include file="includes/meta_titles.tpl"}

	{include file="includes/meta_fb.tpl"}

	{include file="includes/meta_twitter.tpl"}

	{include file="includes/meta_icons.tpl"}
	
	
	
    <!-- Enable styling of HTML5 sectioning elements in legacy browsers. Simplified inline version of HTML5Shiv (https://github.com/aFarkas/html5shiv) for enhanced performance -->
    <!--[if lt IE 9]>
    <script>
		{literal}
        (function (d, a) {
            d.documentElement.className = 'lt-ie9'; 
			for (var i = 0, len = a.length; i < len; i++) {
				d.createElement(a[i]);
			}
        }(document, ['HEADER', 'NAV', 'SECTION', 'FOOTER', 'ARTICLE', 'MAIN', 'FIGCAPTION', 'FIGURE', 'ASIDE']));
		{/literal}
    </script>
    <![endif]-->
		<link href="https://fonts.googleapis.com/css?family=Lato%7CUbuntu" rel="stylesheet">

	{include file="includes/consent_head.tpl"}
	<script src="/javascripts/{$js}.js"></script>

	<link rel="stylesheet" href="/css/{$css}.css" type="text/css" />
	{$theme_vars_head_code_accessible}
</head>
<body class="accessible-mode {if $content.homepage}homepage{else}nothome{/if} page_{$content.url} parent_{$content.parent} top_parent_{$content.topParent} page_id_{$content.id}">
    <header class="clearfix">
        <nav id="quick-menu" title="Quick menu">
            <p>Quick menu:</p>
            <ul>
                <li><a class="menu-link" href="#content">Go to content</a></li>
                <li><a class="menu-link" href="#main-menu">Go to main menu</a></li>
                <li><a class="menu-link" href="#search">Go to search</a></li>
            </ul>
        </nav>
		
		<img src="{if $theme_vars_accessible_logo}/images/themegraphics/{$theme_vars_accessible_logo}{else}/graphics/logo.png{/if}" id="branding" alt="{$site_title} Logo" />
        
		
        <div id="search-menu">

			<form action="/actions/SearchForward/" method="post" id="search">
				<input type="hidden" name="language" value="{$content.language}"/>
	      	  	<label for="search-field">Search</label>
				<input type="text" maxlength="60" title="{$langs.Search}" name="string" value="" required placeholder="{$langs.Search}" id="search-field"/>
				<input type="submit" value="{$langs.Search}" />
			</form>
        </div>
		
       
		

    </header>
	{if $content.blog!="yes"}
    <main id="content" tabindex="-1">
	{/if}
	

    	{$sitewideContent.Accessible_Mode_Header|replace:'style="text-align:left"':""|replace:'style="text-align:center"':""|replace:'style="text-align:right"':""|replace:"/ />":"/>"}
	

		{if !$security}
			{if $search_all}
				<h1>{$langs.Search_Results}</h1>
				{include file="includes/search_results.tpl"}
			{/if}
{*			{$templateSections.normal}
			{$templateSections.Content_Bar_3}*}
		{if $content.showBlog!="yes" || $theme_vars_only_show_bar3_onblog_articles==0}
			{if $theme_vars_content_bar_1||$theme_vars_content_bar_1_accessible}{if $theme_vars_content_bar_1_accessible&&$templateSections.Content_Bar_1_Accessible!=""}{$templateSections.Content_Bar_1_Accessible|replace:'style="text-align:left"':""|replace:'style="text-align:center"':""|replace:'style="text-align:right"':""|replace:"/ />":"/>"}{else}{$templateSections.Content_Bar_1|replace:'style="text-align:left"':""|replace:'style="text-align:center"':""|replace:'style="text-align:right"':""|replace:"/ />":"/>"}{/if}{/if}
			{if $theme_vars_content_bar_2||$theme_vars_content_bar_2_accessible}{if $theme_vars_content_bar_2_accessible&&$templateSections.Content_Bar_2_Accessible!=""}{$templateSections.Content_Bar_2_Accessible|replace:'style="text-align:left"':""|replace:'style="text-align:center"':""|replace:'style="text-align:right"':""|replace:"/ />":"/>"}{else}{$templateSections.Content_Bar_2|replace:'style="text-align:left"':""|replace:'style="text-align:center"':""|replace:'style="text-align:right"':""|replace:"/ />":"/>"}{/if}{/if}
		{/if}
		{if $theme_vars_content_bar_3_accessible&&$templateSections.Main_Content_Accessible!=""}{$templateSections.Main_Content_Accessible|replace:'style="text-align:left"':""|replace:'style="text-align:center"':""|replace:'style="text-align:right"':""|replace:"/ />":"/>"}{else}{$templateSections.normal|replace:'style="text-align:left"':""|replace:'style="text-align:center"':""|replace:'style="text-align:right"':""|replace:"/ />":"/>"}{/if}
		{if $content.showBlog!="yes" || $theme_vars_only_show_bar3_onblog_articles==0}
			{if $theme_vars_content_bar_4||$theme_vars_content_bar_4_accessible}{if $theme_vars_content_bar_4_accessible&&$templateSections.Content_Bar_4_Accessible!=""}{$templateSections.Content_Bar_4_Accessible|replace:'style="text-align:left"':""|replace:'style="text-align:center"':""|replace:'style="text-align:right"':""|replace:"/ />":"/>"}{else}{$templateSections.Content_Bar_4|replace:'style="text-align:left"':""|replace:'style="text-align:center"':""|replace:'style="text-align:right"':""|replace:"/ />":"/>"}{/if}{/if}
			{if $theme_vars_content_bar_5||$theme_vars_content_bar_5_accessible}{if $theme_vars_content_bar_5_accessible&&$templateSections.Content_Bar_5_Accessible!=""}{$templateSections.Content_Bar_5_Accessible|replace:'style="text-align:left"':""|replace:'style="text-align:center"':""|replace:'style="text-align:right"':""|replace:"/ />":"/>"}{else}{$templateSections.Content_Bar_5|replace:'style="text-align:left"':""|replace:'style="text-align:center"':""|replace:'style="text-align:right"':""|replace:"/ />":"/>"}{/if}{/if}
			{if $theme_vars_content_bar_6||$theme_vars_content_bar_6_accessible}{if $theme_vars_content_bar_6_accessible&&$templateSections.Content_Bar_6_Accessible!=""}{$templateSections.Content_Bar_6_Accessible|replace:'style="text-align:left"':""|replace:'style="text-align:center"':""|replace:'style="text-align:right"':""|replace:"/ />":"/>"}{else}{$templateSections.Content_Bar_6|replace:'style="text-align:left"':""|replace:'style="text-align:center"':""|replace:'style="text-align:right"':""|replace:"/ />":"/>"}{/if}{/if}
			{if $theme_vars_content_bar_7||$theme_vars_content_bar_7_accessible}{if $theme_vars_content_bar_7_accessible&&$templateSections.Content_Bar_7_Accessible!=""}{$templateSections.Content_Bar_7_Accessible|replace:'style="text-align:left"':""|replace:'style="text-align:center"':""|replace:'style="text-align:right"':""|replace:"/ />":"/>"}{else}{$templateSections.Content_Bar_7|replace:'style="text-align:left"':""|replace:'style="text-align:center"':""|replace:'style="text-align:right"':""|replace:"/ />":"/>"}{/if}{/if}
			{if $theme_vars_content_bar_8||$theme_vars_content_bar_8_accessible}{if $theme_vars_content_bar_8_accessible&&$templateSections.Content_Bar_8_Accessible!=""}{$templateSections.Content_Bar_8_Accessible|replace:'style="text-align:left"':""|replace:'style="text-align:center"':""|replace:'style="text-align:right"':""|replace:"/ />":"/>"}{else}{$templateSections.Content_Bar_8|replace:'style="text-align:left"':""|replace:'style="text-align:center"':""|replace:'style="text-align:right"':""|replace:"/ />":"/>"}{/if}{/if}
			{if $theme_vars_content_bar_9||$theme_vars_content_bar_9_accessible}{if $theme_vars_content_bar_9_accessible&&$templateSections.Content_Bar_9_Accessible!=""}{$templateSections.Content_Bar_9_Accessible|replace:'style="text-align:left"':""|replace:'style="text-align:center"':""|replace:'style="text-align:right"':""|replace:"/ />":"/>"}{else}{$templateSections.Content_Bar_9|replace:'style="text-align:left"':""|replace:'style="text-align:center"':""|replace:'style="text-align:right"':""|replace:"/ />":"/>"}{/if}{/if}
			{if $theme_vars_content_bar_10||$theme_vars_content_bar_10_accessible}{if $theme_vars_content_bar_10_accessible&&$templateSections.Content_Bar_10_Accessible!=""}{$templateSections.Content_Bar_10_Accessible|replace:'style="text-align:left"':""|replace:'style="text-align:center"':""|replace:'style="text-align:right"':""|replace:"/ />":"/>"}{else}{$templateSections.Content_Bar_10|replace:'style="text-align:left"':""|replace:'style="text-align:center"':""|replace:'style="text-align:right"':""|replace:"/ />":"/>"}{/if}{/if}
		{/if}
		{else}
		{include file="includes/login.tpl"}
		{/if}
	{if $content.blog!="yes"}
    </main>
	{/if}
	
    <nav class="site-header-quick-menu" id="main-menu" title="Main menu" >
        <p>Main menu</p>
        <ul>
			{foreach from=$mainNav item=item key=key name=loop1}
			<li class="{if $item.url == $content.url || $item.id == $content.parent || $item.id == $content.topParent}current{assign var=current value="true"}{/if} {if $item.subs}has-subs{/if}" data-page-id="{$item.id}"><a href="{if $item.homepage == "yes"}/{else}/{$item.url}/{/if}" {if $item.newWindow}target="_blank" title="{$item.title|replace:"Media Page":"Media"} (Opens new window)"{else}title="{$item.title|replace:"Media Page":"Media"}"{/if}>{if $item.subs}<span>{/if}{$item.title|replace:"Media Page":"Media"}{if $item.subs}</span>{/if}</a>
				{include file="nav/drop-down-menu.tpl" subs=$item.subs}</li>
			{/foreach}
		</ul>
    </nav>

    <footer >
		{$sitewideContent.Accessible_Mode_Footer|replace:'style="text-align:left"':""|replace:'style="text-align:center"':""|replace:'style="text-align:right"':""|replace:"/ />":"/>"}
    </footer>
	<script src="/javascripts/owl.carousel.min.js"></script>
	<script src="/javascripts/backstretch.js"></script>
	<script src="/javascripts/doubletaptogo.js"></script>
	<script src="/javascripts/overlaps.js"></script>
	<script src="/javascripts/countdown.js"></script>
	{$theme_vars_body_code_accessible}
	{include file="includes/consent.tpl"}
</body>
</html>
