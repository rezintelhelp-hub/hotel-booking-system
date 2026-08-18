	{* 
		ICO file should contain 16x16, 32x32 and 48x48 sizes in a ICO wrapper - create from PNGS here: http://icoconvert.com/Multi_Image_to_one_icon/ 
		touch-icon-iphone.png should be 60x60
	*}
	{if $theme_vars_favicon || $theme_vars_main_favicon}
	<link rel="shortcut icon" href="/favicon.ico"> {* Needs .htaccess in place to serve from images/themegraphics/ *}
	{/if}
	{if $theme_vars_touch_icon_57}
	<link rel="apple-touch-icon" href="/images/themegraphics/{$theme_vars_touch_icon_57}">
	{else}
		{if $theme_vars_main_touch_icon_57}
		<link rel="apple-touch-icon" href="/images/themegraphics/{$theme_vars_main_touch_icon_57}">
		{/if}
	{/if}
	{if $theme_vars_touch_icon_76}
	<link rel="apple-touch-icon" sizes="76x76" href="/images/themegraphics/{$theme_vars_touch_icon_76}">
	{else}
		{if $theme_vars_main_touch_icon_76}
		<link rel="apple-touch-icon" sizes="76x76" href="/images/themegraphics/{$theme_vars_main_touch_icon_76}">
		{/if}
	{/if}
	{if $theme_vars_touch_icon_120}
	<link rel="apple-touch-icon" sizes="120x120" href="/images/themegraphics/{$theme_vars_touch_icon_120}">
	{else}
		{if $theme_vars_main_touch_icon_120}
		<link rel="apple-touch-icon" sizes="120x120" href="/images/themegraphics/{$theme_vars_main_touch_icon_120}">
		{/if}
	{/if}
	{if $theme_vars_touch_icon_152}
	<link rel="apple-touch-icon" sizes="152x152" href="/images/themegraphics/{$theme_vars_touch_icon_152}">
	{else}
		{if $theme_vars_main_touch_icon_152}
		<link rel="apple-touch-icon" sizes="152x152" href="/images/themegraphics/{$theme_vars_main_touch_icon_152}">
		{/if}
	{/if}