			{if $theme_vars_main_logo && !$logo_file}
			{assign var=logo_file value=$theme_vars_main_logo}
			{/if}
			{if $theme_vars_main_logo_fixed && !$logo_file_fixed}
			{assign var=logo_file_fixed value=$theme_vars_main_logo_fixed}
			{/if}

			<style type="text/css" media="screen">
				#{$mr_id} {literal}{{/literal}
				background-color:{$bg_color};
				{if $bg_mode=="tile"}
				background-image:url(/images/themegraphics/{$background1});
				background-repeat:repeat;
				{/if}
				{literal}}{/literal}
			</style>
			<div class="container {if $show_in_fixed=="0"}hide-in-fixed{/if} {if $inverted}inverted{/if}
				{if $left=="menu"||$left_2=="menu"||$centered=="menu"||$right=="menu"||$right_2=="menu"}ontop{/if}"
					id="{$mr_id}"
					{if $bg_mode!="tile" && (($background_video==""&&!$background_video_sw_enabled)||($background_video_sw==""&&$background_video_sw_enabled))}
						{if $bg_enabled&&$Backgrounds}
							data-backgrounds="{$Backgrounds|images_to_json:true|htmlspecialchars}"
						{else}
							{if $background1}
								data-backgrounds="[&quot;/images/themegraphics/{$background1}&quot;{if $background2},&quot;/images/themegraphics/{$background2}&quot;{/if}{if $background3},&quot;/images/themegraphics/{$background3}&quot;{/if}{if $background4},&quot;/images/themegraphics/{$background4}&quot;{/if}{if $background5},&quot;/images/themegraphics/{$background5}&quot;{/if}]"
							{/if}
						{/if}
					{/if}
					data-background-fade="1000"
					data-background-align="{$bg_align}"
					data-background-panzoom="{$panzoom}"
					data-background-duration="5000"
					data-background-color="{$bg_color}"
					data-background-opacity="{$bg_opacity}"
					{if $bg_mode=="parallax_slow"}
					data-scroll-decay="0.1"
					{/if}
					{if $bg_mode=="parallax_norm"}
					data-scroll-decay="0.5"
					{/if}
					{if $bg_mode=="parallax_fast"}
					data-scroll-decay="0.9"
					{/if}
					{if $bg_mode=="parallax_infini"}
					data-scroll-decay="1"
					{/if}
					{if $bg_mode=="parallax_combined"}
					data-parallax-combined="1"
					{/if}
					{if $background_video_sw_enabled&&$background_video_sw!=""}
						{assign var=videostr value="href=\"/media"|explode:$background_video_sw}
						{assign var=videostr2 value="\""|explode:$videostr[1]}
						{if !$bg_enabled||!$Backgrounds}
							{assign var=imgstr value="src=\""|explode:$background_video_sw}
							{assign var=imgstr2 value="\""|explode:$imgstr[1]}
							{assign var=imgstr3 value=$imgstr2[0]}
						{else}
							{assign var=imgstr value="src=\""|explode:$Backgrounds}
							{assign var=imgstr2 value="\""|explode:$imgstr[1]}
							{assign var=imgstr3t value="?"|explode:$imgstr2[0]}
							{assign var=imgstr3 value=$imgstr3t[0]}
						{/if}
						data-vide-bg="mp4: /media{$videostr2[0]}, poster: {$imgstr3}"
						data-vide-options="loop: true, muted: {if $theme_vars_mute_bg_video}true{else}false{/if}, position: 50% 50%, opacity: {$bg_opacity}"
					{elseif $background_video}
						data-vide-bg="mp4: /media/{$background_video}, poster: /images/themegraphics/{$background1}"
						data-vide-options="loop: true, muted: {if $theme_vars_mute_bg_video}true{else}false{/if}, position: 50% 50%, opacity: {$bg_opacity}"
					{/if}
				>
				{if $full_top_enabled && $full_top_content!=""}
				<div class="row clearix" id="{$mr_id}_full_width_top">
					{include file="modules/content_block.tpl"
						c=$full_top_content
					}
				</div>
				{/if}


				{if $left!="none"||$left_2!="none"||$centered!="none"||$right!="none"||$right_2!=""}
				<div id="{$mr_id}_row" class="row clearfix flexibreak-big" data-flexibreak-small="{$mr_id}-small" {if $height!="auto"}data-min-height="{$height}"{/if} data-scale-prop="{$scale_prop}">

					{if $centered!="none"||$right!="sitewide"||$left=="logo"}
						{assign var=cblva value=$left_valign}
					{/if}
					{if ($right=="logo"||$centered=="logo") && $left_2!="none" && $left_valign=="both"}
						{assign var=cblva value="top"}
					{/if}

					{if $left=="menu"}

						{assign var=align value="left"}
						{if $nav_style!=""}
							{assign var=align value="justify"}
						{/if}

						{include file="modules/nav.tpl"
							pos="left"
							align=$align
							valign=$cblva
							style=$nav_style
							search=$search
							basket=$basket
						}

					{/if}
					{if $left=="logo"}
					    {include file="modules/logo.tpl"
					        logo=$logo_file
							logo_retina=$logo_retina
							logo_fixed=$logo_file_fixed
							align=left
							link=$logo_link
					    }
					{/if}
					{if $left=="sitewide"}
						{include file="modules/content_block.tpl"
							pos="left"
							c=$Left
							align=left
							valign=$cblva
							id="`$mr_id`_left"
						}
					{/if}
					{if $left=="social"}
						{include file="modules/social_links.tpl"
							pos="left"
							align=left
							style=icons
							icon_style=$icon_style
							valign=$cblva

						}
					{/if}
					{if $left=="social_large"}
						{include file="modules/social_links.tpl"
							pos="left"
							align=left
							style=icons
							size=large
							icon_style=$icon_style
							valign=$cblva
						}
					{/if}
					{if $left=="social_text"}
						{include file="modules/social_links.tpl"
							pos="left"
							align=left
							icon_style=$icon_style
							style=text
							valign=$cblva
						}
					{/if}
					{if $left=="social_text_icons"}
						{include file="modules/social_links.tpl"
							pos="left"
							align=left
							valign=$cblva
							icon_style=$icon_style
						}
					{/if}
					{if $left=="social_text_icons_large"}
						{include file="modules/social_links.tpl"
							pos="left"
							align=left
							size=large
							valign=$cblva
							icon_style=$icon_style
						}
					{/if}
					{if $left=="checkout"}
						{include file="modules/checkout_link.tpl"
							pos="left"
							align=left
							valign=$cblva
						}
					{/if}
					{if $left=="checkouticon"}
						{include file="modules/checkout_link.tpl"
							pos="left"
							align=left
							valign=$cblva
							text=false
						}
					{/if}
					{if $left=="languages"}
						{include file="modules/languages.tpl"
							pos="left"
							align=left
							valign=$cblva
						}
					{/if}
					{if $left=="googletranslate"}
						{include file="modules/googletranslate.tpl"
							pos="left"
							align=left
							valign=$cblva
						}
					{/if}
					{if $left=="search"}
						{include file="modules/search.tpl"
							pos="left"
							align=left
							valign=$cblva
						}
					{/if}
					{if ($right=="logo"||$centered=="logo") && $left_valign=="both"}
						{assign var=cblva value="bottom"}
					{/if}
					{if $left_2=="sitewide"}
						{include file="modules/content_block.tpl"
							pos="left2"
							c=$Left_Secondary
							align=left
							valign=$cblva
							id="`$mr_id`_left_secondary"
						}
					{/if}
					{if $left_2=="social"}
						{include file="modules/social_links.tpl"
							pos="left2"
							align=left
							style=icons
							icon_style=$icon_style
							valign=$cblva
						}
					{/if}
					{if $left_2=="social_large"}
						{include file="modules/social_links.tpl"
							pos="left2"
							align=left
							style=icons
							icon_style=$icon_style
							size=large
							valign=$cblva
						}
					{/if}

					{if $left_2=="menu"}

						{assign var=align value="left"}
						{if $nav_style!=""}
							{assign var=align value="justify"}
						{/if}
						{include file="modules/nav.tpl"
							pos="left2"
							align=$align
							valign=$cblva
							style=$nav_style
							search=$search
							basket=$basket
						}

					{/if}
					{if $left_2=="social_text"}
						{include file="modules/social_links.tpl"
							pos="left2"
							align=left
							style=text
							icon_style=$icon_style
							valign=$cblva
						}
					{/if}
					{if $left_2=="social_text_icons"}
						{include file="modules/social_links.tpl"
							pos="left2"
							align=left
							valign=$cblva
							icon_style=$icon_style
						}
					{/if}
					{if $left_2=="social_text_icons_large"}
						{include file="modules/social_links.tpl"
							pos="left2"
							align=left
							size=large
							valign=$cblva
							icon_style=$icon_style
						}
					{/if}
					{if $left_2=="checkout"}
						{include file="modules/checkout_link.tpl"
							pos="left2"
							align=left
							valign=$cblva
						}
					{/if}
					{if $left_2=="checkouticon"}
						{include file="modules/checkout_link.tpl"
							pos="left2"
							align=left
							valign=$cblva
							text=false
						}
					{/if}
					{if $left_2=="languages"}
						{include file="modules/languages.tpl"
							pos="left2"
							align=left
							valign=$cblva
						}
					{/if}
					{if $left_2=="googletranslate"}
						{include file="modules/googletranslate.tpl"
							pos="left2"
							align=left
							valign=$cblva
						}
					{/if}
					{if $left_2=="search"}
						{include file="modules/search.tpl"
							pos="left2"
							align=left
							valign=$cblva
						}
					{/if}



					{if $left!="none"||$centered!="none"||$left=="sitewide"}
						{assign var=cbrva value=$right_valign}
					{/if}
					{if ($left=="logo"||$centered=="logo") && $right_2!="none" && $right_valign=="both"}
						{assign var=cbrva value="top"}
					{/if}

					{if $right=="menu"}

						{assign var=align value="right"}
						{if $nav_style!=""}
							{assign var=align value="justify"}
						{/if}

						{include file="modules/nav.tpl"
							pos="right"
							align=$align
							valign=$cbrva
							style=$nav_style
							search=$search
							basket=$basket
						}

					{/if}
					{if $right=="logo"}
					    {include file="modules/logo.tpl"
					        logo=$logo3
					        logo_fixed=$logo3_fixed
							logo_retina=$logo3_retina
							align=right
							link=$logo3_link
					    }
					{/if}
					{if $right=="sitewide"}
						{include file="modules/content_block.tpl"
							pos="right"
							c=$Right
							align=right
							valign=$cbrva
							id="`$mr_id`_right"
						}
					{/if}
					{if $right=="social"}

						{include file="modules/social_links.tpl"
							pos="right"
							align=right
							icon_style=$icon_style
							style=icons
							valign=$cbrva
						}
					{/if}
					{if $right=="social_large"}

						{include file="modules/social_links.tpl"
							pos="right"
							align=right
							style=icons
							icon_style=$icon_style
							size=large
							valign=$cbrva
						}
					{/if}
					{if $right=="social_text"}
						{include file="modules/social_links.tpl"
							pos="right"
							align=right
							style=text
							icon_style=$icon_style
							valign=$cbrva
						}
					{/if}
					{if $right=="social_text_icons"}
						{include file="modules/social_links.tpl"
							pos="right"
							align=right
							valign=$cbrva
							icon_style=$icon_style
						}
					{/if}
					{if $right=="social_text_icons_large"}
						{include file="modules/social_links.tpl"
							pos="right"
							align=right
							size=large
							icon_style=$icon_style
							valign=$cbrva
						}
					{/if}
					{if $right=="checkout"}
						{include file="modules/checkout_link.tpl"
							pos="right"
							align=right
							valign=$cbrva
						}
					{/if}
					{if $right=="checkouticon"}
						{include file="modules/checkout_link.tpl"
							pos="right"
							align=right
							valign=$cbrva
							text=false
						}
					{/if}
					{if $right=="languages"}
						{include file="modules/languages.tpl"
							pos="right"
							align=right
							valign=$cbrva
						}
					{/if}
					{if $right=="googletranslate"}
						{include file="modules/googletranslate.tpl"
							pos="right"
							align=right
							valign=$cbrva
						}
					{/if}
					{if $right=="search"}
						{include file="modules/search.tpl"
							pos="right"
							align=right
							valign=$cbrva
						}
					{/if}

					{if ($left=="logo"||$centered=="logo") && $right_valign=="both"}
						{assign var=cbrva value="bottom"}
					{/if}
					{if $right_2=="sitewide"}
						{include file="modules/content_block.tpl"
							pos="right2"
							c=$Right_Secondary
							align=right
							valign=$cbrva
							id="`$mr_id`_right_secondary"
						}
					{/if}
					{if $right_2=="social"}
						{include file="modules/social_links.tpl"
							pos="right2"
							align=right
							style=icons
							icon_style=$icon_style
							valign=$cbrva
						}
					{/if}
					{if $right_2=="social_large"}
						{include file="modules/social_links.tpl"
							pos="right2"
							align=right
							size=large
							style=icons
							icon_style=$icon_style
							valign=$cbrva
						}
					{/if}
					{if $right_2=="menu"}

						{assign var=align value="right"}
						{if $nav_style!=""}
							{assign var=align value="justify"}
						{/if}

						{include file="modules/nav.tpl"
							pos="right2"
							align=$align
							valign=$cbrva
							style=$nav_style
							search=$search
							basket=$basket
						}

					{/if}
					{if $right_2=="social_text"}
						{include file="modules/social_links.tpl"
							pos="right2"
							align=right
							style=text
							icon_style=$icon_style
							valign=$cbrva
						}
					{/if}
					{if $right_2=="social_text_icons"}
						{include file="modules/social_links.tpl"
							pos="right2"
							align=right
							valign=$cbrva
							icon_style=$icon_style
						}
					{/if}
					{if $right_2=="social_text_icons_large"}
						{include file="modules/social_links.tpl"
							pos="right2"
							align=right
							size=large
							icon_style=$icon_style
							valign=$cbrva
						}
					{/if}
					{if $right_2=="checkout"}
						{include file="modules/checkout_link.tpl"
							pos="right2"
							align=right
							valign=$cbrva
						}
					{/if}
					{if $right_2=="checkouticon"}
						{include file="modules/checkout_link.tpl"
							pos="right2"
							align=right
							valign=$cbrva
							text=false
						}
					{/if}
					{if $right_2=="languages"}
						{include file="modules/languages.tpl"
							pos="right2"
							align=right
							valign=$cbrva
						}
					{/if}
					{if $right_2=="googletranslate"}
						{include file="modules/googletranslate.tpl"
							pos="right2"
							align=right
							valign=$cbrva
						}
					{/if}
					{if $right_2=="search"}
						{include file="modules/search.tpl"
							pos="right2"
							align=right
							valign=$cbrva
						}
					{/if}


					{if $centered=="sitewide"}
						{include file="modules/content_block.tpl"
							pos="centered"
							c=$Centered
							align=center
							id="`$mr_id`_centered"
						}
					{/if}

					{if $centered=="logo"}
					    {include file="modules/logo.tpl"
							pos="centered"
							align=center
							logo=$logo2
							logo_retina=$logo2_retina
							logo_fixed=$logo2_fixed
							link=$logo2_link
					    }
					{/if}

					{if $centered=="social"}
						{include file="modules/social_links.tpl"
							pos="centered"
							align=center
							icon_style=$icon_style
							style=icons
						}
					{/if}
					{if $centered=="social_large"}
						{include file="modules/social_links.tpl"
							icon_style=$icon_style
							pos="centered"
							align=center
							size=large
							style=icons
						}
					{/if}

					{if $centered=="menu"}

						{assign var=align value="center"}
						{if $nav_style!=""}
							{assign var=align value="justify"}
						{/if}
						{if $left=="logo"||$left_2=="logo"||$right=="logo"||$right_2=="logo"}
							{include file="modules/nav.tpl"
								pos="centered"
								align=$align
								style=$nav_style
								search=$search
								basket=$basket
								valign="middle"
								skipclearfix=true
							}

						{else}
							{include file="modules/nav.tpl"
								pos="centered"
								align=$align
								style=$nav_style
								search=$search
								basket=$basket
							}

						{/if}
					{/if}
					{if $centered=="menu_with_middle_logo"||$centered=="menu_with_middle_logo_left_mobile"}

						{assign var=align value="center"}
						{if $nav_style!=""}
							{assign var=align value="justify"}
						{/if}
						
						{include file="modules/nav.tpl"
							pos="centered"
							align=$align
							style=$nav_style
							search=$search
							basket=$basket
							middle_logo=$logo2
							middle_logo_retina=$logo2_retina
							middle_logo_fixed=$logo2_fixed
							middle_link=$logo2_link
						}
					   

					{/if}
					{if $centered=="social_text"}
						{include file="modules/social_links.tpl"
							pos="centered"
							align=center
							style=text
							icon_style=$icon_style
						}
					{/if}
					{if $centered=="social_text_icons"}
						{include file="modules/social_links.tpl"
							pos="centered"
							align=center
							icon_style=$icon_style
						}
					{/if}
					{if $centered=="social_text_icons_large"}
						{include file="modules/social_links.tpl"
							pos="centered"
							align=center
							icon_style=$icon_style
							size=large
						}
					{/if}
					{if $centered=="checkout"}
						{include file="modules/checkout_link.tpl"
							pos="centered"
							align=center
						}
					{/if}
					{if $centered=="checkouticon"}
						{include file="modules/checkout_link.tpl"
							pos="centered"
							align=center
							text=false
						}
					{/if}
					{if $centered=="languages"}
						{include file="modules/languages.tpl"
							pos="centered"
							align=center
						}
					{/if}
					{if $centered=="googletranslate"}
						{include file="modules/googletranslate.tpl"
							pos="centered"
							align=center
						}
					{/if}
					{if $centered=="search"}
						{include file="modules/search.tpl"
							pos="centered"
							align=center
						}
					{/if}


				</div>

				<div id="{$mr_id}-small" class="flexibreak-small">
						{if $centered=="menu_with_middle_logo"} 
						<div class="row clearfix">
							{include file="modules/logo.tpl"
								pos="left"
								align=left
								logo=$logo2
								logo_retina=$logo2_retina
								logo_fixed=$logo2_file_fixed
								link=$logo2_link
							}
							{include file="modules/mobile_nav.tpl"
								pos="centered"
								align=right
								style="reveal-right"
								valign=middle
							}
						</div>
						{/if}
						{if $centered=="menu_with_middle_logo_left_mobile"} 
						<div class="row clearfix">
							{include file="modules/mobile_nav.tpl"
								pos="centered"
								align=left
								style="reveal-left"
								valign=middle
							}
							{include file="modules/logo.tpl"
								pos="right"
								align=right
								logo=$logo2
								logo_retina=$logo2_retina
								logo_fixed=$logo2_file_fixed
								link=$logo2_link
							}
							
						</div>
						{/if}
						{if $left=="logo" && ($centered=="menu" || $right=="menu" || $right_2=="menu" || $left_2=="menu")}

							{if $centered=="search"||$right=="search"||$right_2=="search"||$left_2=="search"}
							{assign var="inc_search" value=true}
							{/if}
							<div class="row clearfix">
								{include file="modules/logo.tpl"
									pos="left"
									align=left
									logo=$logo_file
									logo_retina=$logo_retina
									logo_fixed=$logo_file_fixed
									link=$logo_link
								}
								{include file="modules/mobile_nav.tpl"
									pos="right"
									align=right
									style="reveal-right"
									valign=middle
									inc_search=$inc_search
								}
							</div>

						{/if}

						{if $right=="logo" && ($left=="menu" || $left_2=="menu" || $right_2=="menu")}

							{if $left=="search" || $left_2=="search" || $right_2=="search"}
							{assign var="inc_search" value=true}
							{/if}
							<div class="row clearfix">
								{include file="modules/logo.tpl"
									pos="right"
									align=right
									logo=$logo3
									logo_retina=$logo3_retina
									logo_fixed=$logo3_fixed
									link=$logo3_link
								}
								{include file="modules/mobile_nav.tpl"
									pos="left"
									align=left
									style="reveal-left"
									valign=middle
									inc_search=$inc_search
								}
							</div>

						{/if}
						{if ($centered=="menu" || $left=="menu" || $left_2=="menu" || $right_2=="menu" || $right=="menu") && ((!$hamburger&&$left!="sitewide"&&$right!="sitewide")&&($left!="logo" && $right!="logo"))}
							{if $left=="search" || $left_2=="search" || $right=="search" || $right_2=="search"}
							{assign var="inc_search" value=true}
							{/if}
              {assign var="pos" value="left"}
              {if $right=="menu" || $right_2=="menu"}
              {assign var="pos" value="right"}
              {/if}
							<div class="row clearfix">
								{include file="modules/mobile_nav.tpl"
									pos=$pos
									align=center
									style="reveal-$pos"
									inc_search=$inc_search
								}
							</div>
						{/if}
						{if $left=="logo" && $centered!="menu" && $right!="menu" && $right_2!="menu" && $left_2!="menu"}
							<div class="row clearfix">
						    {include file="modules/logo.tpl"
								pos="left"
								logo=$logo_file
								logo_retina=$logo_retina
								logo_fixed=$logo_file_fixed
								align=center
								link=$logo_link
						    }
							</div>
						{/if}

						{if $left=="sitewide"&&($right=="menu"||$centered=="menu")}
							{if $left_2=="search" || $right=="search" || $right_2=="search"}
							{assign var="inc_search" value=true}
							{/if}
							<div class="row clearfix" id="{$mr_id}_left_mobile">
							{include file="modules/content_block.tpl"
								pos="left"
								c=$Left
								align=left
							}
							{include file="modules/mobile_nav.tpl"
								pos="right"
								align=right
								style="reveal-right"
								valign=middle
								inc_search=$inc_search
							}
							</div>
						{/if}
						{if $left=="social"}
							<div class="row clearfix">
							{include file="modules/social_links.tpl"
								pos="left"
								align=center
								icon_style=$icon_style
								style=icons
							}
							</div>
						{/if}
						{if $left=="social_large"}
							<div class="row clearfix">
							{include file="modules/social_links.tpl"
								pos="left"
								align=center
								style=icons
								icon_style=$icon_style
								size=large
							}
							</div>
						{/if}
						{if $left=="social_text"}
							<div class="row clearfix">
							{include file="modules/social_links.tpl"
								pos="left"
								align=center
								style=text
								icon_style=$icon_style
							}
							</div>
						{/if}
						{if $left=="social_text_icons"}
							<div class="row clearfix">
							{include file="modules/social_links.tpl"
								pos="left"
								align=center
								icon_style=$icon_style
							}
							</div>
						{/if}
						{if $left=="social_text_icons_large"}
							<div class="row clearfix">
							{include file="modules/social_links.tpl"
								pos="left"
								align=center
								icon_style=$icon_style
								size=large
							}
							</div>
						{/if}
						{if $left=="checkout"}
							<div class="row clearfix">
							{include file="modules/checkout_link.tpl"
								pos="left"
								text=false
								align=center
							}
							</div>
						{/if}
						{if $left=="languages"}
							<div class="row clearfix">
							{include file="modules/languages.tpl"
								pos="left"
								align=center
							}
							</div>
						{/if}
						{if $left=="googletranslate"}
							<div class="row clearfix">
							{include file="modules/googletranslate.tpl"
								pos="left"
								align=center
							}
							</div>
						{/if}



						{if $left_2=="sitewide"}
							<div class="row clearfix" id="{$mr_id}_left_secondary_mobile">
							{include file="modules/content_block.tpl"
								pos="left2"
								c=$Left_Secondary
								align=center
							}
							</div>
						{/if}
						{if $left_2=="social"}
							<div class="row clearfix">
							{include file="modules/social_links.tpl"
								pos="left2"
								align=center
								icon_style=$icon_style
								style=icons
							}
							</div>
						{/if}
						{if $left_2=="social_large"}
							<div class="row clearfix">
							{include file="modules/social_links.tpl"
								pos="left2"
								align=center
								size=large
								icon_style=$icon_style
								style=icons
							}
							</div>
						{/if}



						{if $left_2=="social_text"}
							<div class="row clearfix">
							{include file="modules/social_links.tpl"
								pos="left2"
								align=center
								icon_style=$icon_style
								style=text
							}
							</div>
						{/if}
						{if $left_2=="social_text_icons"}
							<div class="row clearfix">
							{include file="modules/social_links.tpl"
								pos="left2"
								align=center
								icon_style=$icon_style
							}
							</div>
						{/if}
						{if $left_2=="social_text_icons_large"}
							<div class="row clearfix">
							{include file="modules/social_links.tpl"
								pos="left2"
								align=center
								size=large
								icon_style=$icon_style
							}
							</div>
						{/if}
						{if $left_2=="checkout"}
							<div class="row clearfix">
							{include file="modules/checkout_link.tpl"
								pos="left2"
								align=center
							}
							</div>
						{/if}
						{if $left_2=="checkouticon"}
							<div class="row clearfix">
							{include file="modules/checkout_link.tpl"
								pos="left2"
								text=false
								align=center
							}
							</div>
						{/if}
						{if $left_2=="languages"}
							<div class="row clearfix">
							{include file="modules/languages.tpl"
								pos="left2"
								align=center
							}
							</div>
						{/if}
						{if $left_2=="googletranslate"}
							<div class="row clearfix">
							{include file="modules/googletranslate.tpl"
								pos="left2"
								align=center
							}
							</div>
						{/if}



						{if $right=="logo" && $left!="menu" && $right_2!="menu" && $left_2!="menu"}
							<div class="row clearfix">
						    {include file="modules/logo.tpl"
								pos="right"
								logo=$logo3
								logo_retina=$logo3_retina
								logo_fixed=$logo3_fixed
								align=center
								link=$logo3_link
						    }
							</div>
						{/if}

						{if $right=="sitewide"&&$left=="menu"}
							<div class="row clearfix" id="{$mr_id}_right_mobile">
							{include file="modules/content_block.tpl"
								pos="right"
								c=$Right
								align=right
							}
							{include file="modules/mobile_nav.tpl"
								pos="left"
								align=left
								style="reveal-left"
								valign=middle
							}
							</div>
						{/if}
						{if $right=="sitewide"&&$left!="menu"}
							<div class="row clearfix" id="{$mr_id}_right_mobile">
							{include file="modules/content_block.tpl"
								pos="right"
								c=$Right
								align=center
								valign=middle
							}
							</div>
						{/if}
						{if $right=="social"}
							<div class="row clearfix">
							{include file="modules/social_links.tpl"
								align=center
								icon_style=$icon_style
								style=icons
							}
							</div>
						{/if}
						{if $right=="social_large"}
							<div class="row clearfix">
							{include file="modules/social_links.tpl"
								align=center
								icon_style=$icon_style
								style=icons
								size=large
							}
							</div>
						{/if}
						{if $right=="social_text"}
							<div class="row clearfix">
							{include file="modules/social_links.tpl"
								pos="right"
								align=center
								icon_style=$icon_style
								style=text
							}
							</div>
						{/if}
						{if $right=="social_text_icons"}
							<div class="row clearfix">
							{include file="modules/social_links.tpl"
								pos="right"
								align=center
								icon_style=$icon_style
							}
							</div>
						{/if}
						{if $right=="social_text_icons_large"}
							<div class="row clearfix">
							{include file="modules/social_links.tpl"
								pos="right"
								align=center
								size=large
								icon_style=$icon_style
							}
							</div>
						{/if}
						{if $right=="checkout"}
							<div class="row clearfix">
							{include file="modules/checkout_link.tpl"
								pos="right"
								align=center
							}
							</div>
						{/if}
						{if $right=="checkouticon"}
							<div class="row clearfix">
							{include file="modules/checkout_link.tpl"
								pos="right"
								text=false
								align=center
							}
							</div>
						{/if}
						{if $right=="languages"}
							<div class="row clearfix">
							{include file="modules/languages.tpl"
								pos="right"
								align=center
							}
							</div>
						{/if}
						{if $right=="googletranslate"}
							<div class="row clearfix">
							{include file="modules/googletranslate.tpl"
								pos="right"
								align=center
							}
							</div>
						{/if}



						{if $right_2=="sitewide"}
							<div class="row clearfix" id="{$mr_id}_right_secondary_mobile">
							{include file="modules/content_block.tpl"
								pos="right2"
								c=$Right_Secondary
								align=center
							}
							</div>
						{/if}
						{if $right_2=="social"}
							<div class="row clearfix">
							{include file="modules/social_links.tpl"
								pos="right2"
								align=center
								icon_style=$icon_style
								style=icons
							}
							</div>
						{/if}
						{if $right_2=="social_large"}
							<div class="row clearfix">
							{include file="modules/social_links.tpl"
								pos="right2"
								align=center
								size=large
								icon_style=$icon_style
								style=icons
							}
							</div>
						{/if}

						{if $right_2=="social_text"}
							<div class="row clearfix">
							{include file="modules/social_links.tpl"
								pos="right2"
								align=center
								icon_style=$icon_style
								style=text
							}
							</div>
						{/if}
						{if $right_2=="social_text_icons"}
							<div class="row clearfix">
							{include file="modules/social_links.tpl"
								pos="right2"
								align=center
								icon_style=$icon_style
							}
							</div>
						{/if}
						{if $right_2=="social_text_icons_large"}
							<div class="row clearfix">
							{include file="modules/social_links.tpl"
								pos="right2"
								align=center
								size=large
								icon_style=$icon_style
							}
							</div>
						{/if}
						{if $right_2=="checkout"}
							<div class="row clearfix">
							{include file="modules/checkout_link.tpl"
								pos="right2"
								align=center
							}
							</div>
						{/if}
						{if $right_2=="checkouticon"}
							<div class="row clearfix">
							{include file="modules/checkout_link.tpl"
								pos="right2"
								align=center
								text=false
							}
							</div>
						{/if}
						{if $right_2=="languages"}
							<div class="row clearfix">
							{include file="modules/languages.tpl"
								pos="right2"
								align=center
							}
							</div>
						{/if}
						{if $right_2=="googletranslate"}
							<div class="row clearfix">
							{include file="modules/googletranslate.tpl"
								pos="right2"
								align=center
							}
							</div>
						{/if}


						{if $centered=="sitewide"}
							<div class="row clearfix" id="{$mr_id}_centered_mobile">
							{include file="modules/content_block.tpl"
								pos="centered"
								c=$Centered
								align=center
							}
							</div>
						{/if}

						{if $centered=="logo"}
							<div class="row clearfix">
						    {include file="modules/logo.tpl"
								pos="centered"
								align=center
								logo=$logo2
								logo_retina=$logo2_retina
								logo_fixed=$logo2_fixed
								link=$logo2_link
						    }
							</div>
						{/if}

						{if $centered=="social"}
							<div class="row clearfix">
							{include file="modules/social_links.tpl"
								pos="centered"
								align=center
								style=icons
								icon_style=$icon_style
							}
							</div>
						{/if}

						{if $centered=="social_large"}
							<div class="row clearfix">
							{include file="modules/social_links.tpl"
								icon_style=$icon_style
								pos="centered"
								align=center
								size=large
								style=icons
							}
							</div>
						{/if}


						{if $centered=="social_text"}
							<div class="row clearfix">
							{include file="modules/social_links.tpl"
								pos="centered"
								align=center
								icon_style=$icon_style
								style=text
							}
							</div>
						{/if}
						{if $centered=="social_text_icons"}
							<div class="row clearfix">
							{include file="modules/social_links.tpl"
								pos="centered"
								align=center
								icon_style=$icon_style
							}
							</div>
						{/if}
						{if $centered=="social_text_icons_large"}
							<div class="row clearfix">
							{include file="modules/social_links.tpl"
								pos="centered"
								align=center
								icon_style=$icon_style
								size=large
							}
							</div>
						{/if}
						{if $centered=="checkout"}
							<div class="row clearfix">
							{include file="modules/checkout_link.tpl"
								pos="centered"
								align=center
							}
							</div>
						{/if}
						{if $centered=="checkouticon"}
							<div class="row clearfix">
							{include file="modules/checkout_link.tpl"
								pos="centered"
								align=center
								text=false
							}
							</div>
						{/if}
						{if $centered=="languages"}
							<div class="row clearfix">
							{include file="modules/languages.tpl"
								pos="centered"
								align=center
							}
							</div>
						{/if}
						{if $centered=="googletranslate"}
							<div class="row clearfix">
							{include file="modules/googletranslate.tpl"
								pos="centered"
								align=center
							}
							</div>
						{/if}

				</div>
				{/if}
				{if $full_bottom_enabled}
				<div class="row clearix" id="{$mr_id}_full_width_bottom">
					{include file="modules/content_block.tpl"
						c=$full_bottom_content
						align=""
					}
				</div>
				{/if}

			</div>
