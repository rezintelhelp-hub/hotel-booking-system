<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" style="background:{$theme_vars_footer_bg_color}">
<head>
<meta name="viewport" content="width=device-width" />

<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<title>Email</title>

<link rel="stylesheet" type="text/css" href="https://{$url}/css/email.css?v=2" />
{literal}
<style media="screen">
	.ReadMsgBody {width: 100%; background-color: #ffffff;}
	.ExternalClass {width: 100%; background-color: #ffffff;}
	body	 {width: 100%; background-color: #ffffff; margin:0; padding:0; -webkit-font-smoothing: antialiased;font-family: Georgia, Times, serif}
	table {border-collapse: collapse;}
	@media only screen and (max-width: 580px)  {
					.deviceWidth {width:auto!important; padding:0;}
					.body-wrap img { max-width:100% !important;  height:auto !important; } 
					.body-wrap img.scaff { height:1px !important; }
					.center {text-align: center!important;}
			}

	@media only screen and (max-width: 550px) {

		p[class="Button_Large"] a { display:block!important; margin-bottom:10px!important; background-image:none!important; margin-right:0!important;}

		div[class="column"] { width: auto!important; float:none!important;}

		.colblock tr,.colblock td {
			display:block;
			width:100%;
		}
		.colblock {
			margin-bottom:20px;
		}
		.colblock td.colblock-divider {
			display:none;
		}

		.mw,.container {
			width:auto!important;
			}

		h1 { font-size: 44px !important; color:#4A4A4A;}
		h2 { font-size: 27px !important; color:#4A4A4A; }
		h3 { font-size: 17px !important; color:#4A4A4A; }
		h4 { font-size: 13px !important; color:#4A4A4A; }
		h5 { font-size: 14px !important; color:#4A4A4A; }
		h6 { font-size: 14px; text-transform: uppercase; color:#444;}
		.cols .Button_Small a,.cols .Button_Medium a,.cols .Button_Large a {
			font-size:10px !important;
			line-height:12px !important;
			padding:3px 1px !important;
			font-weight:normal !important;
		}
		.collapse { margin:0!important;}

		p, ul {
			margin-bottom: 20px;
			font-weight: normal;
			font-size:14px !important;
			line-height:1.6;
			color:#4A4A4A;
			margin-top: 0;
		}

	}
	{/literal}
	{$theme_vars_newsletter_css}
	{literal}
</style>
{/literal}
</head>

<body leftmargin="0" topmargin="0" marginwidth="0" marginheight="0" bgcolor="{$theme_vars_footer_bg_color}" class="{if $theme_vars_rounded}rounded{/if}">
<!--[if gte mso 9]>
<style>
{literal}}
.deviceWidth {
  width:580px;
}
{/literal}
</style>
<![endif]-->
{if !$form_autoresponse && !$mailinglist_autoresponse&&!$checkout_email}
<p id="webversion" class="hide_in_webversion">Can't see this properly? <a href="***WEBVERSION***">Click here</a></p>
{/if}
<table width="100%" bgcolor="{$theme_vars_header_bg_color}" border="0" cellpadding="0" cellspacing="0" align="center">
	<tr>
		<td width="100%" style="padding-top:20px;padding-bottom:15px;" valign="top" bgcolor="{$theme_vars_header_bg_color}" >
<table  width="580" border="0" cellpadding="0" cellspacing="0" align="center" class="deviceWidth head-wrap" >
	<tr>
		<td align="center" width="100%" class="header {if $theme_vars_header_style=="default"}{elseif $theme_vars_header_style=="centered"}{else}{/if}" >

				{if $theme_vars_header_style=="default"}
				{if $theme_vars_main_newsletter_logo || $theme_vars_newsletter_logo}
				<table  width="100%" border="0" cellpadding="0" cellspacing="0" align="left" class="deviceWidth">
					<tr>
						<td><a href="{if $theme_vars_newsletter_link!=""}{$theme_vars_newsletter_link}{else}https://{$url}/{/if}"><img src="https://{$url}/images/themegraphics/{if $theme_vars_main_newsletter_logo}{$theme_vars_main_newsletter_logo}{else}{$theme_vars_newsletter_logo}{/if}" width="200" height="56" /></a></td>
						<td align="right"><h6 class="align-right collapse">{$smarty.now|date_format}</h6></td>
					</tr>
				</table>
				{/if}
				{elseif $theme_vars_header_style=="centered"}
				{if $theme_vars_main_newsletter_logo || $theme_vars_newsletter_logo}
				<table  border="0" cellpadding="0" cellspacing="0" align="center" class="deviceWidth">
					<tr>
						<td align="center"><a href="{if $theme_vars_newsletter_link!=""}{$theme_vars_newsletter_link}{else}http://{$url}/{/if}"><img src="https://{$url}/images/themegraphics/{if $theme_vars_main_newsletter_logo}{$theme_vars_main_newsletter_logo}{else}{$theme_vars_newsletter_logo}{/if}" width="200" height="56" /></a></td>
					</tr>
				</table>
				{/if}
				{else}
					{if $theme_vars_header_image}
					<a href="{if $theme_vars_newsletter_link!=""}{$theme_vars_newsletter_link}{else}https://{$url}/{/if}"><img src="https://{$url}/images/themegraphics/{$theme_vars_header_image}" width="600"/></a>
					{/if}
				{/if}

		</td>
	</tr>
</table>
		</td>
	</tr>
</table>
{if $contentSplit.Content_Bar_1 && $theme_vars_content_bar_1_enabled}
<table width="100%" border="0" cellpadding="0" cellspacing="0" align="center">
	<tr>
		<td width="100%" valign="top"   bgcolor="{$theme_vars_content_bar_1_outer_bg_color}">
<table class="body-wrap content-bar-1 deviceWidth" width="580" border="0" cellpadding="0" cellspacing="0" align="center" >
	<tr>
		<td width="100%" bgcolor="{$theme_vars_content_bar_1_inner_bg_color}">

			<table  border="0" cellpadding="0" cellspacing="0" align="left" class="deviceWidth">
				<tr>
					<td class="container">
						{$contentSplit.Content_Bar_1}
						<img src="https://{$url}/graphics/x.gif" class="scaff" width="538" height="1" />
					</td>
				</tr>
			</table>
		</td>
	</tr>
</table>
		</td>
	</tr>
</table>
{/if}
{if $contentSplit.Content_Bar_2 && $theme_vars_content_bar_2_enabled}
<table width="100%" border="0" cellpadding="0" cellspacing="0" align="center">
	<tr>
		<td width="100%" valign="top"   bgcolor="{$theme_vars_content_bar_2_outer_bg_color}">
<table class="body-wrap content-bar-2 deviceWidth"  width="580" border="0" cellpadding="0" cellspacing="0" align="center" >
	<tr>
		<td width="100%" bgcolor="{$theme_vars_content_bar_2_inner_bg_color}">

			<table  border="0" cellpadding="0" cellspacing="0" align="left" class="deviceWidth">
				<tr>
					<td class="container">
						{$contentSplit.Content_Bar_2}
						<img src="https://{$url}/graphics/x.gif" class="scaff" width="538" height="1" />
					</td>
				</tr>
			</table>
		</td>
	</tr>
</table>
		</td>
	</tr>
</table>
{/if}
<table width="100%" border="0" cellpadding="0" cellspacing="0" align="center">
	<tr>
		<td width="100%" valign="top"   bgcolor="{$theme_vars_content_bar_3_outer_bg_color}">
<table class="body-wrap content-bar-3 deviceWidth" width="580" border="0" cellpadding="0" cellspacing="0" align="center" >
	<tr>
		<td width="100%" bgcolor="{$theme_vars_content_bar_3_inner_bg_color}">

			<table  border="0" cellpadding="0" cellspacing="0" align="left" class="deviceWidth">
				<tr>
					<td class="container">

						{$contentSplit.normal}
						<img src="https://{$url}/graphics/x.gif" class="scaff" width="538" height="1" />

					</td>
				</tr>
			</table>
		</td>
	</tr>
</table>
		</td>
	</tr>
</table>
{if $contentSplit.Content_Bar_4 && $theme_vars_content_bar_4_enabled}
<table width="100%" border="0" cellpadding="0" cellspacing="0" align="center">
	<tr>
		<td width="100%" valign="top"   bgcolor="{$theme_vars_content_bar_4_outer_bg_color}" >
<table class="body-wrap content-bar-4 deviceWidth" width="580" border="0" cellpadding="0" cellspacing="0" align="center" >
	<tr>
		<td width="100%" bgcolor="{$theme_vars_content_bar_4_inner_bg_color}">

			<table  border="0" cellpadding="0" cellspacing="0" align="left" class="deviceWidth">
				<tr>
					<td class="container">
						{$contentSplit.Content_Bar_4}
						<img src="https://{$url}/graphics/x.gif" class="scaff" width="538" height="1" />
					</td>
				</tr>
			</table>
		</td>
	</tr>
</table>
		</td>
	</tr>
</table>
{/if}
{if $contentSplit.Content_Bar_5 && $theme_vars_content_bar_5_enabled}
<table width="100%" border="0" cellpadding="0" cellspacing="0" align="center">
	<tr>
		<td width="100%" valign="top"   bgcolor="{$theme_vars_content_bar_5_outer_bg_color}" >
<table class="body-wrap content-bar-5 deviceWidth" width="580" border="0" cellpadding="0" cellspacing="0" align="center" >
	<tr>
		<td width="100%" bgcolor="{$theme_vars_content_bar_5_inner_bg_color}">

			<table  border="0" cellpadding="0" cellspacing="0" align="left" class="deviceWidth">
				<tr>
					<td class="container">
						{$contentSplit.Content_Bar_5}
						<img src="https://{$url}/graphics/x.gif" class="scaff" width="538" height="1" />
					</td>
				</tr>
			</table>
		</td>
	</tr>
</table>
		</td>
	</tr>
</table>
{/if}
{if $contentSplit.Content_Bar_6 && $theme_vars_content_bar_6_enabled}
<table width="100%" border="0" cellpadding="0" cellspacing="0" align="center">
	<tr>
		<td width="100%" valign="top"  bgcolor="{$theme_vars_content_bar_6_outer_bg_color}" >
<table class="body-wrap content-bar-6 deviceWidth" width="580" border="0" cellpadding="0" cellspacing="0" align="center" >
	<tr>
		<td width="100%" bgcolor="{$theme_vars_content_bar_6_inner_bg_color}">

			<table  border="0" cellpadding="0" cellspacing="0" align="left" class="deviceWidth">
				<tr>
					<td class="container">
						{$contentSplit.Content_Bar_6}
						<img src="https://{$url}/graphics/x.gif" class="scaff" width="538" height="1" />
					</td>
				</tr>
			</table>
		</td>
	</tr>
</table>
		</td>
	</tr>
</table>
{/if}
{if $contentSplit.Content_Bar_7 && $theme_vars_content_bar_7_enabled}
<table width="100%" border="0" cellpadding="0" cellspacing="0" align="center">
	<tr>
		<td width="100%" valign="top"   bgcolor="{$theme_vars_content_bar_7_outer_bg_color}" >
<table class="body-wrap deviceWidth content-bar-7" width="580" border="0" cellpadding="0" cellspacing="0" align="center" >
	<tr>
		<td width="100%" bgcolor="{$theme_vars_content_bar_7_inner_bg_color}">

			<table  border="0" cellpadding="0" cellspacing="0" align="left" class="deviceWidth">
				<tr>
					<td class="container">
						{$contentSplit.Content_Bar_7}
						<img src="https://{$url}/graphics/x.gif" class="scaff" 	width="538" height="1" />
					</td>
				</tr>
			</table>
		</td>
	</tr>
</table>
		</td>
	</tr>
</table>
{/if}
{if $contentSplit.Content_Bar_8 && $theme_vars_content_bar_8_enabled}
<table width="100%" border="0" cellpadding="0" cellspacing="0" align="center">
	<tr>
		<td width="100%" valign="top" bgcolor="{$theme_vars_content_bar_8_outer_bg_color}" >
<table class="body-wrap deviceWidth content-bar-8"  width="580" border="0" cellpadding="0" cellspacing="0" align="center" >
	<tr>
		<td width="100%"  bgcolor="{$theme_vars_content_bar_8_inner_bg_color}">

			<table  border="0" cellpadding="0" cellspacing="0" align="left" class="deviceWidth">
				<tr>
					<td class="container">
						{$contentSplit.Content_Bar_8}
						<img src="https://{$url}/graphics/x.gif" class="scaff" width="538" height="1" />
					</td>
				</tr>
			</table>
		</td>
	</tr>
</table>
		</td>
	</tr>
</table>
{/if}
{if $contentSplit.Content_Bar_9 && $theme_vars_content_bar_9_enabled}
<table width="100%" border="0" cellpadding="0" cellspacing="0" align="center">
	<tr>
		<td width="100%" valign="top"  bgcolor="{$theme_vars_content_bar_9_outer_bg_color}" >
<table class="body-wrap deviceWidth content-bar-9" width="580" border="0" cellpadding="0" cellspacing="0" align="center" >
	<tr>
		<td width="100%" bgcolor="{$theme_vars_content_bar_9_inner_bg_color}">

			<table  border="0" cellpadding="0" cellspacing="0" align="left" class="deviceWidth">
				<tr>
					<td class="container">
						{$contentSplit.Content_Bar_9}
						<img src="https://{$url}/graphics/x.gif" class="scaff" width="538" height="1" />
					</td>
				</tr>
			</table>
		</td>
	</tr>
</table>
		</td>
	</tr>
</table>
{/if}
{if $contentSplit.Content_Bar_10 && $theme_vars_content_bar_10_enabled}
<table width="100%" border="0" cellpadding="0" cellspacing="0" align="center">
	<tr>
		<td width="100%" valign="top"   bgcolor="{$theme_vars_content_bar_10_outer_bg_color}" >
<table class="body-wrap content-bar-10 deviceWidth" width="580" border="0" cellpadding="0" cellspacing="0" align="center" >
	<tr>
		<td width="100%"  bgcolor="{$theme_vars_content_bar_10_inner_bg_color}">

			<table  border="0" cellpadding="0" cellspacing="0" align="left" class="deviceWidth">
				<tr>
					<td class="container">
						{$contentSplit.Content_Bar_10}
						<img src="https://{$url}/graphics/x.gif" class="scaff" width="538" height="1" />
					</td>
				</tr>
			</table>
		</td>
	</tr>
</table>
		</td>
	</tr>
</table>
{/if}
<table width="100%" border="0" cellpadding="0" cellspacing="0" align="center">
	<tr>
		<td width="100%" valign="top"   bgcolor="{$theme_vars_footer_bg_color}" >
<table class="footer-wrap deviceWidth" width="580" border="0" cellpadding="0" cellspacing="0" align="center" >
	<tr>
		<td width="100%">

				<!-- content -->
				<div class="content">
				<table>
				<tr>
					<td align="center">
						{$contentSplit.Footer}
					</td>
				</tr>
			</table>
				</div>
				<div class="content">
				<table>
				<tr>
					<td align="center">
						{if !$form_autoresponse && !$mailinglist_autoresponse&&!$checkout_email}
						<p id="unsub" class="hide_in_webversion">To unsubscribe from this newsletter <a href="http://{$url}/newsletter_remove.php?id=***ID***&amp;email=***EMAIL***">click here</a></p>
						{/if}
					</td>
				</tr>
			</table>
				</div>
		</td>
	</tr>
</table>
		</td>
	</tr>
</table> <!-- End Wrapper -->
<div style="display:none; white-space:nowrap; font:15px courier; color:#ffffff;">
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
</div>
</body>
</html>
