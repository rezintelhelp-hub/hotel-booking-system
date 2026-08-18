<!DOCTYPE html>
<!--[if lt IE 7 ]><html class="ie ie6" lang="{$content.language}"> <![endif]-->
<!--[if IE 7 ]><html class="ie ie7" lang="{$content.language}"> <![endif]-->
<!--[if IE 8 ]><html class="ie ie8" lang="{$content.language}"> <![endif]-->
<!--[if (gte IE 9)|!(IE)]><!--><html lang="{$content.language}"> <!--<![endif]-->
<head>
	{*
	<link rel="stylesheet" href="http://basehold.it/24">
	*}
	<meta charset="utf-8">
	{assign var=h1 value="<h1"|explode:$content.content|strip_tags_exclude:"<h1>"}
	{assign var=h1 value=">"|explode:$h1[1]}
	{assign var=h1 value="</h1"|explode:$h1[1]}
	{assign var=h1 value=$h1[0]}
	
	{assign var=h2 value="<h2"|explode:$content.content|strip_tags_exclude:"<h2>"}
	{assign var=h2 value=">"|explode:$h2[1]}
	{assign var=h2 value="</h2"|explode:$h2[1]}
	{assign var=h2 value=$h2[0]}
	
	{assign var=p value="<p"|explode:$content.content|strip_tags_exclude:"<p>"}
	{assign var=p value=">"|explode:$p[1]}
	{assign var=p value="</p"|explode:$p[1]}
	{assign var=p value=$p[0]}
	
	{assign var=li value="<li"|explode:$content.content|strip_tags_exclude:"<li>"}
	{assign var=li value=">"|explode:$li[1]}
	{assign var=li value="</li"|explode:$li[1]}
	{assign var=li value=$li[0]}

	<title>{if $content.longtitle!=""&&$content.longtitle!=$content.title}{$content.longtitle}{else}{if $h1!=""}{$h1}{/if}{if $h1==""}{$h2}{/if}{if $h2==""&&$h1==""}{$p}{/if} - {$theme_vars_meta_title_append}{/if}</title>
	<meta name="description" content="{if $content.description!=""}{$content.description}{else}{$h1}{if $h2!=""} - {$h2}{/if}{if $h2==""} - {$p}{/if}{if $p==""} - {$li}{/if}{/if}"/>

	{if $content.blog=="yes" && $content.showBlog!="yes"}
	<link rel="alternate" type="application/rss+xml" title="RSS" href="{$server_name}/rss/"/>
	{/if}
	{if $content.showBlog=="yes"}
	<link rel="alternate" type="application/rss+xml" title="RSS" href="{$server_name}/rss/{$url}/"/>
	{/if}

	<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
	
	<script src="/javascripts/{$js}.js"></script>	
	
	{* 
	IMPORTANT:
	Do not delete the above javascript reference. It is necesary for many core CMS feature, form submission, loading caledars, loading blog comments, handling video and galleries, etc. The 'custom.js' file in a theme's 'javascripts' folder is automatically added to the above javascript file. 
	*}
	<script src="/javascripts/owl.carousel.min.js"></script>
	<script src="/javascripts/backstretch.js"></script>
	<script src="/javascripts/doubletaptogo.js"></script>
	
	<link href='http://fonts.googleapis.com/css?family=Mako|Fjord+One' rel='stylesheet' type='text/css'>
	<link rel="stylesheet" href="/css/{$css}.css" type="text/css" charset="utf-8"/>
	{*
	IMPORTANT:
	The above css file is dynamically generated from the files in the theme's css folder, in the order specified in the theme's css/files.csv file. You can also references files individually if you want, just use the path: /css/yourfile.css - obviously keep the files in your site's theme's css folder though - don't put it in the actual /css/ folder in your document root! 
	*}

	<link rel="stylesheet" href="/css/print.css" type="text/css" media="print" charset="utf-8"/>

	<!--[if lt IE 9]>
		<script src="http://html5shim.googlecode.com/svn/trunk/html5.js"></script>
	<![endif]-->

	{if $theme_vars_favicon!=""}
	<link rel="shortcut icon" href="/images/themegraphics/{$theme_vars_favicon}">
	{/if}
	{if $theme_vars_apple_touch!=""}
	<link rel="apple-touch-icon" href="/images/themegraphics/{$theme_vars_apple_touch}">
	{/if}

	<!--[if lt IE 9]>
	<script src="http://ie7-js.googlecode.com/svn/version/2.1(beta4)/IE9.js"></script>
	<![endif]-->

</head>
<body class="{if $LIMIT_PAGES==3}withAd{/if} {if $content.homepage}homepage{/if} page_{$content.url} {$content.parent} {$content.topParent} id_{$content.id} {if $theme_vars_windowbgimage}withBigBG{/if}" {if $theme_vars_windowbgimage}bgimage="/images/themegraphics/{$theme_vars_windowbgimage}?width=1920"{/if} data-bg-mode="{$theme_vars_background_mode}">
<div id="bg">
	<div id="mainBg">
	
		{if $loggedIn||$content.languages_in_use||$theme_vars_contactbar}
		<div id="topbar">
			<div class="container">
				{if $theme_vars_facebook_link||$theme_vars_gplus_link||$theme_vars_linkedin_link||$theme_vars_pinterest_link||$theme_vars_twitter_user_name||$theme_vars_youtube_link||$theme_vars_vimeo_link}
				<div class="socialIconsTiny header">
					{if $theme_vars_facebook_link}<a href="{$theme_vars_facebook_link}" title="Facebook"><img src="/graphics/social-small-facebook.png" alt=""/></a>{/if}
					{if $theme_vars_gplus_link}<a href="{$theme_vars_gplus_link}" title="Google+"><img src="/graphics/social-small-gplus.png" alt=""/></a>{/if}
					{if $theme_vars_linkedin_link}<a href="{$theme_vars_linkedin_link}" title="LinkedIn"><img src="/graphics/social-small-linkedin.png" alt=""/></a>{/if}
					{if $theme_vars_pinterest_link}<a href="{$theme_vars_pinterest_link}" title="Pinterest"><img src="/graphics/social-small-pinterest.png" alt=""/></a>{/if}
					{if $theme_vars_twitter_user_name}<a href="http://twitter.com/{$theme_vars_twitter_user_name}" title="Twitter"><img src="/graphics/social-small-twitter.png" alt=""/></a>{/if}
					{if $theme_vars_youtube_link}<a href="{$theme_vars_youtube_link}" title="YouTube"><img src="/graphics/social-small-youtube.png" alt=""/></a>{/if}
					{if $theme_vars_vimeo_link}<a href="{$theme_vars_vimeo_link}" title="Vimeo"><img src="/graphics/social-small-vimeo.png" alt=""/></a>{/if}
				</div>
				{/if}
				<div id="contact">	
					<ul>
					{if $theme_vars_phone_number!=""}
					<li class="Icon_Phone">
						{$theme_vars_phone_number}
					</li>
					{/if}
					{if $theme_vars_email_address!=""}
					<li class="Icon_Email">
						{capture name=email_link}<a href="mailto:{$theme_vars_email_address}">{$theme_vars_email_address}{/capture}

						<script type="text/javascript">document.write(
						'{$smarty.capture.email_link|str_rot13}'.replace(/[a-zA-Z]/g, function(c){literal}{return String.fromCharCode((c<="Z"?90:122)>=(c=c.charCodeAt(0)+13)?c:c-26);}));{/literal}
						</script>

						</a>
					</li>
					{/if}
					<li id="livechat" class="Icon_Livechat" style="display:none"><a href="/livechat/convo.php?language={$content.language}" id="startConvo">{$langs.Livechat}</a>
					</li>
					</ul>
				</div>
				
				{if $loggedIn}<p id="loggedIn" class="Button_Small"><a href="/actions/Logout/">{$langs.Logout}</a></p>{/if}

				{if $content.languages_in_use}
					<ul id="languages">
						{foreach from=$content.languages_in_use item=lang}
						<li><a href="{$lang.1}" class="">{$lang.3}</a></li>
						{/foreach}
					</ul>
				{/if}
			</div>
			{include file=nav/nav.tpl}
		</div>
		{else}
			{include file=nav/nav.tpl}
		{/if}
		
		<br class="clear" />
		{if !$content.blog}
		
			{if $security}
				<div class="container">
					<section class="fullWidth">
					{include file=includes/login.tpl}
					</section>
				</div>

			{else}
				{if $content.contentSplit.Full_Width_Banner_Content||$content.contentSplit.Full_Width_Banner_Background_Image}
				<div id="fullWidthBanner">
					<div id="fullWidthBannerBG">{$content.contentSplit.Full_Width_Banner_Background_Image}</div>
					<div class="container">{$content.contentSplit.Full_Width_Banner_Content}</div>
				</div>
				{/if}
				{if $staticSubs|@count>0 && $theme_vars_sidebar_menu!="none"}

					<div class="container" id="centerBg">

						<section id="main" class="withSidebarNav">
						{$content.contentSplit.normal}
						
						{if $content.contentSplit.normal==""}&nbsp;{/if}
						{* The above line is just to keep the floated layout in place if now content is added yet *}

						</section>

						{include file=nav/side-bar-sub-menu.tpl} 

					</div>

				{else}
					{if $content.contentSplit.normal || $search_all}
					<div class="container" id="centerBg">
						
						<section class="fullWidth">
						
						{$content.contentSplit.normal}
						
						{include file=includes/search-results.tpl}

						</section>

					</div>
					{/if}
				{/if}
			{/if}
			</div> <!-- #mainBg -->
			<div id="footers" data-background="/images/themegraphics/{$theme_vars_footerbgimage}" data-bg-mode="{$theme_vars_footer_background_mode}">
				{if $content.contentSplit.Footer || $sitewideContent.Footer || $content.homepage!="yes"}
				<footer id="mainFooter">
					<div class="container">
				
					{if $content.contentSplit.Footer!=""}
						{$content.contentSplit.Footer}
					{else}
						{$sitewideContent.Footer}
					{/if}
					{if $content.homepage!="yes"}
						<p id="breadcrumb">{$breadcrumb}</p>
					{/if}
					</div>
				</footer>
				{/if}
				{if $sitewideContent.Closing_Footer_Right || $sitewideContent.Closing_Footer}
				<footer id="closing">
					<div class="container">
						<div id="closingRight">
						{$sitewideContent.Closing_Footer_Right}
					</div>
						{$sitewideContent.Closing_Footer}
					</div>
				</footer>	
				{/if}
			</div>
		{else}
			</div> <!-- #mainBg -->
			
			{if $content.contentSplit.Full_Width_Banner_Content||$content.contentSplit.Full_Width_Banner_Background_Image}
			<div id="fullWidthBanner" class="withBlog">
				<div id="fullWidthBannerBG">{$content.contentSplit.Full_Width_Banner_Background_Image}</div>
				<div class="container">{$content.contentSplit.Full_Width_Banner_Content}</div>
			</div>
			{/if}
			{$content.contentSplit.normal}
	{/if}
</div> <!-- #bg -->
<a href="#" id="backToTop"></a>
<div id="loading"></div>
{if $LIMIT_PAGES==3}
<div id="ad">
	<a href="#">Get your own FREE website today.</a>
</div>
{/if}
</body>
</html>