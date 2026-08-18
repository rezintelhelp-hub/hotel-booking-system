/*

	Starting Blocks Theme Custom jQuery File

	======
	Contents:
	------
	#Basic init setup
	#'Default' Gallery Style (Lightbox with thumbs) - including support for prodcuts based on this gallery style
	#'Montage' Gallery Style - including support for prodcuts based on this gallery style
	#'Slideshow' Gallery Styles (single and multi) - including support for prodcuts based on these gallery styles
	#'Gallery with thumbs' Gallery Style - including support for prodcuts based on these gallery styles
	#'Carousel Slide' Widget
	#'Live Shopping Basket' Widget
	# Livechat Status Widget
	#Responsive video helper for jPlayer
	#Responsive video helper for JWPlayer
	#Responsive Calendar
	#Full width banner
	#Blog Loop
	

*/

/*

	#Basic init setup

*/

	$(document).scroll(function(){
		$("#backToTop").show().css("opacity","0");
		if ($(document).scrollTop()>200) {
			$("#backToTop").css("opacity","1");
		} else {
			$("#backToTop").css("opacity","0");
		}
	});
	$(window).on("load",function(){
		setRecentBlogWidths();
		if ($("#logo img").width()<$("#logo").width()) {
			$("#logo").css("width",$("#logo img").width()+"px");
		}
		imageMarginHelper();
	});
	$(window).resize(function(){
		imageMarginHelper();
		setRecentBlogWidths();
	});
	$(document).ready(function(){
		$("body").addClass("js");
		// Fix for image margins when floated before headings
		$("div.Right_Image,div.Left_Image").each(function(){
			if ($(this).prev().length && $(this).next().length) {
				if ($(this).prev()[0].tagName.toLowerCase()=="p"&&$(this).next()[0].tagName.toLowerCase()=="h1") {
					$(this).css("margin-top","30px");
				}
				if (
					$(this).prev()[0].tagName.toLowerCase()=="p"&&
					(
						$(this).next()[0].tagName.toLowerCase()=="h2"
						||$(this).next()[0].tagName.toLowerCase()=="h3"
						||$(this).next()[0].tagName.toLowerCase()=="h4"
					)
				) {
					$(this).css("margin-top","18px");
				}
			}

		});
		// Small bit of code to enable 'warning' class to be added to stock level based on 'Warning stock level' theme variable.
		$(".separateOptionStock").change(function(){
			if (parseInt($("option:selected",$(this)).attr("data-stock"))<parseInt($(".stockAndPrice",$(this).parent()).attr("data-warning-threshold"))) {
				$(".stockAndPrice .stock",$(this).parent()).addClass("warning");
			} else {
				$(".stockAndPrice .stock",$(this).parent()).removeClass("warning");
			}
		});	
		imageMarginHelper();
		if ($("body").attr("bgimage") && $("body").attr("data-bg-mode")=="stretch") {
			$("body").backstretch($("body").attr("bgimage"));
		}
		if ($("body").attr("bgimage") && $("body").attr("data-bg-mode")=="tile") {
			$("body").css("background-image","url("+$("body").attr("bgimage")+")");
		}
		if ($("#footers").attr("data-background") && $("#footers").attr("data-bg-mode")=="stretch") {
			$("#footers").backstretch($("#footers").attr("data-background"));
		}
		if ($("#footers").attr("data-background") && $("#footers").attr("data-bg-mode")=="tile") {
			$("#footers").css("background-image","url("+$("#footers").attr("data-background")+")");
		}
		$(".submit_form a").click(function(){
			$(this).parents("form").submit();
			return false;
		});
		$(".bpe_image").each(function(){
			if (typeof $("img",$(this)).attr("alt") != 'undefined') {
				if (typeof $("img",$(this)).attr("title") == 'undefined') {
					$("img",$(this)).attr("title",$("img",$(this)).attr("alt"));
				}
			}
		});
		$(".Caption,.Heavy_Border_Caption,.Light_Border_Caption").each(function(){
			if (typeof $("img",$(this)).attr("alt") != 'undefined') {
				var text = $("img",$(this)).attr("alt").split("||");
				var newString = "";
				for (var i=0; i < text.length; i++) {
					if (i==0) {
						newString = "<strong>"+text[i]+"</strong>";
					} else {
						newString = newString+"<br/>"+text[i];
					}
				};
				$(this).addClass("clearfix");
				$(this).wrapInner("<div class='captionWrap'></div>");
				$(".captionWrap",$(this)).append('<span class="caption">'+newString+'</span>');
			}
		});
		$("body").addClass("js");

		$(".focusSwapWrap input[type=text]").focus(function(){
			$(this).parent('.focusSwapWrap').addClass("focus");
		});
		$(".focusSwapWrap input[type=text]").blur(function(){
			if ($(this).val().replace(/ /g,'')=="") {
				$(this).val("");
				$(this).parent('.focusSwapWrap').removeClass("focus");	
			}
		});
		$( '#nav li:has(ul)' ).doubleTapToGo();
		$("#updateQuantitiesP").click(function(){
			$("#quantityForm").submit();
		});	
	});
	
	function setRecentBlogWidths () {
		$(".recent_blog_articles").each(function(){
			if ($(this).width()<287) {
				$(this).addClass("narrow"); 
			} else {
				$(this).removeClass("narrow"); 
			}
		});
	}
	function imageMarginHelper () {
		$(".Right_Image,.Left_Image").each(function(){
			$(this).removeClass("enoughSpaceForText");
			var avail = $(this).parent().innerWidth();
			var thisW = $("img",$(this)).width();
			var space = avail-thisW;
			if (space>70) {
				$(this).addClass("enoughSpaceForText");
			}
		});
	}


/*
	#'Default' Gallery Style (Lightbox with thumbs) - including support for prodcuts based on this gallery style

*/
	$(window).resize(function(){
		if ($("#lightboxContainer").length) {
			$('<img src="'+$("#lightboxInner img").attr("src")+'" style="display:none;max-width:10000px !important;width:auto;"/>').appendTo("html").on("load",function(){
				var originalWidth = $(this).width();
				var originalHeight = $(this).height();
				var ratio = originalWidth/originalHeight;
				var newMaxWidth = $(window).width()-60;
				var newHeight = newMaxWidth/ratio;
				if (originalWidth>newMaxWidth) {
					var w = newMaxWidth;
					var h = newHeight;
				} else {
					var w = originalWidth;
					var h = originalHeight;
				}
				$("#lightboxContainer").stop(false,true).animate({
		        	width: w,
		        	height: h
		        },300);
		        $("#lightboxStuff").stop(false,true).animate({
		        	width: w
		        },300);
		 	});
		}
	});
	$(document).ready(function(){
		$(".responsive_lightbox").click(function(){
			var clicked = $(this);
			var parentsId = $(this).parents(".galleryWrapper").attr("id");
			$(".lightboxCurrent").removeClass("lightboxCurrent");
			clicked.addClass("lightboxCurrent");
			$('embed, object, select',"#wrapper").css({ 'visibility' : 'hidden' });
			var formName = $(this).parents(".galleryWrapper").attr("id").replace(/gallery/, "");
			$('body').append("<div id='lightboxOverlay'></div><div id='lightboxOuter'><div id='lightboxContainer'><div id='lightboxExtra1'><div id='lightboxExtra2'><div id='lightboxExtra3'><div id='lightboxClose'>x</div><div id='lightboxPrev'>&lt;</div><div id='lightboxNext'>&gt;</div><div id='lightboxInner'></div></div></div></div></div><div id='lightboxStuff'><div id='lightboxShop'></div><div id='lightboxCaption'></div></div></div>");
			$(".shopGalleryVariant[name="+formName+"]").appendTo("#lightboxShop").fadeIn();
			$("#lightboxShop form").append("<input type='hidden' name='pic_url' value='' />");
			$("#lightboxOverlay").css("height",$(document).height()+"px");
			$("#lightboxOuter").css("top",$(document).scrollTop()+100+"px");
			
			$("#lightboxContainer").css({
				opacity: 0,
				display: "block"
			});
			$("#lightboxContainer").animate({
				opacity: 1
			});
			function showImage (href,title) {
				function cont4 () {
					function cont3 () {
						showNav();
						$("."+formName+"input").val(title);
						$("input[name=pic_url]",$("#lightboxShop form")).val(href);
						$("#lightboxCaption").html("<p>"+title+"</p>");
						$("#lightboxInner").html('<img src="'+href+'" alt="'+title+'" style="display:none"/>');
						$("#lightboxInner img").css({
							opacity: 0,
							display: "block"
						});
						$("#lightboxInner img").animate({
							opacity: 1
						},300);
					}
					$('<img src="'+href+'" style="display:none;max-width:1000px !important;"/>').appendTo("body").on("load",function(){
					        var originalWidth = $(this).width();
							var originalHeight = $(this).height();
							var ratio = originalWidth/originalHeight;
							var newMaxWidth = $(window).width()-60;
							var newHeight = newMaxWidth/ratio;
							if (originalWidth>newMaxWidth) {
								var w = newMaxWidth;
								var h = newHeight;
							} else {
								var w = originalWidth;
								var h = originalHeight;
							}
							$("#lightboxContainer").stop(false,true).animate({
					        	width: w,
					        	height: h
					        },300,cont3);
					        $("#lightboxStuff").stop(false,true).animate({
					        	width: w
					        },300);
					 });
				}
				$("#lightboxNext,#lightboxPrev,#lightboxClose").fadeOut(300);		
				$("#lightboxInner img").fadeOut(300,cont4);		



			}
			function showNav () {
				$("#lightboxClose").fadeIn();
				$("#lightboxClose").unbind().click(function(){
					function cont2 () {
						$("#lightboxOverlay,#lightboxOuter").remove();
						$('embed, object, select',"#wrapper").css({ 'visibility' : 'visible' });
					}
					$("#lightboxOuter,#lightboxOverlay").fadeOut(300,cont2);

					$(".shopGalleryVariant[name="+formName+"]").appendTo("body").hide();
				});
				var totalEls = $("#"+parentsId+" .responsive_lightbox").length-1;
				var clickedEl = 0;
				var currentEl = 0;
				$("#"+parentsId+" .responsive_lightbox").each(function(){
					if ($(this).hasClass("lightboxCurrent")) {
						clickedEl = currentEl;
					}
					currentEl++;
				});
				if (clickedEl!=totalEls) {
					$("#lightboxNext").fadeIn();				
					$("#lightboxNext").unbind().click(function(){
						var stop = 0;
						var stop2 = 0;
						$("#"+parentsId+" .responsive_lightbox").each(function(){
							stop++;
							if ($(this).hasClass("lightboxCurrent")) {
								stop2 = stop;
							}
						});
						var stop3 = 0;
						$("#"+parentsId+" .responsive_lightbox").each(function(){
							if (stop3 == stop2) {
								$(".lightboxCurrent").removeClass("lightboxCurrent");
								$(this).addClass("lightboxCurrent");
								var href = $(this).attr("href");
								var title = $(this).attr("title");
								showImage(href,title);
							}
							stop3++;
						});	
					});	
				}
				if (clickedEl!=0) {
					$("#lightboxPrev").fadeIn();
					$("#lightboxPrev").unbind().click(function(){
						var prev = 0;
						var clicked = 0;
						$("#"+parentsId+" .responsive_lightbox").each(function(){
							if ($(this).hasClass("lightboxCurrent")) {
								current = prev;
							}
							prev++;
						});
						var prev = 0;
						$("#"+parentsId+" .responsive_lightbox").each(function(){
							if (prev==current-1) {
								$(".lightboxCurrent").removeClass("lightboxCurrent");
								$(this).addClass("lightboxCurrent");
								var href = $(this).attr("href");
								var title = $(this).attr("title");
								showImage(href,title);
							}
							prev++;
						});
					});	
				}
			}
			function cont () {
				$("."+formName+"input").val(clicked.attr("title"));
				$("input[name=pic_url]",$("#lightboxShop form")).val(clicked.attr("href"));
				$("#lightboxCaption").html("<p>"+clicked.attr("title")+"</p>");
				$("#lightboxStuff").fadeIn();
				$("#lightboxInner").html('<img src="'+clicked.attr("href")+'" alt="'+clicked.attr("title")+'" style="display:none"/>');
				$("#lightboxInner img").css({
					opacity: 0,
					display: "block"
				});
				$("#lightboxInner img").animate({
					opacity: 1
				},300);	
				
				showNav();

			}

			var preloader = new Image();

			preloader.onload = function() {
				var originalWidth = preloader.width;
				var originalHeight = preloader.height;
				var ratio = originalWidth/originalHeight;
				var newMaxWidth = $(window).width()-60;
				var newHeight = newMaxWidth/ratio;
				if (originalWidth>newMaxWidth) {
					var w = newMaxWidth;
					var h = newHeight;
				} else {
					var w = originalWidth;
					var h = originalHeight;
				}

				$("#lightboxStuff").css("width",w+"px");
				$("#lightboxContainer").stop(false,true).animate({
		        	width: w,
		        	height: h
		        },300,cont);
		
				
			};
			preloader.src = clicked.attr("href");
			return false;
		});	
	});



/*
	#'Montage' Gallery Style - including support for prodcuts based on this gallery style

*/
	$(window).on("load",function(){
		setMontageMargin();
		$(".montageSlideshow").hide().css("width","0");
		setTimeout(function() {
			$(".montageSlideshow").css("width","100%").show();
		}, 1);
	});
	$(document).ready(function(){
		$(".montageSlideshow").each(function(){
			var formId = $(this).attr("id").replace("gallery","");
			if ($("form[name="+formId+"]").length) {
				$(this).after("<div class='montageProductWrapper'></div>");
				var $wrapper = $(this).next();
				$wrapper.append($(this));
				$wrapper.append($("form[name="+formId+"]").show().addClass("montageProductForm"));
				var $form = $("form",$wrapper);
				$(".montage-pic",$wrapper).append('<span class="montageCheckbox"></span>');
				$(".montage-pic:first",$wrapper).addClass("selected");
				$(".montageSlideshow",$wrapper).addClass("with-product");
				$form.append("<input type='hidden' name='pic_url' value='' />");
				$("."+formId+"input",$form).val($("img:first",$wrapper).attr("alt"));
				var href = $("img:first",$wrapper).attr("src").split("?");
				$("input[name=pic_url]",$form).val(href[0]);
			}
		});
		$(".with-product .montage-pic").click(function(){
			$montage = $(this).parents(".with-product");
			$(".selected",$montage).removeClass("selected");
			$(this).addClass("selected");
			var $form = $(this).parents(".with-product").next();
			var formId = $(this).parents(".with-product").attr("id").replace("gallery","");
			$("."+formId+"input",$form).val($("img",$(this)).attr("alt"));
			var href = $("img",$(this)).attr("src").split("?");
			$("input[name=pic_url]",$form).val(href[0]);
		});
	});
	$(window).resize(function(){
		setMontageMargin();
	});
	function setMontageMargin () {
		$(".imagesInMontage4").each(function(){
			var w = $(this).width();
			var p = $(".item1",$(this)).width()+$(".item2",$(this)).width();
			var g = w-p;
			$(".for-margin",$(this)).css("margin-top",g+"px");
		});
	}


/*
	#'Slideshow' Gallery Styles (single and multi) - including support for prodcuts based on these gallery styles
*/
	
	$(document).ready(function(){
		$(".owl-slideshow-single").each(function(){
			$(this).owlCarousel({
				navigation : true, 
				slideSpeed : 300,
				autoPlay : 3000,
	    		stopOnHover : true,
				paginationSpeed : 400,
				goToFirstSpeed : 2000,
			    singleItem : true,
			    autoHeight : true,
			    transitionStyle:"fade",
				navigationText : ["&lt;","&gt;"]
			});
		});
		$(".owl-slideshow-multi").each(function(){
			$(this).owlCarousel({
				items : 4,
				slideSpeed : 300,
				autoPlay : 3000,
	    		stopOnHover : true,
				paginationSpeed : 400,
				goToFirstSpeed : 2000,
				navigationText : ["&lt;","&gt;"]
			});
		});

		$(".owl-slideshow-multi,.owl-slideshow-single").each(function(){
			var formId = $(this).attr("id").replace("gallery","");
			if ($("form[name="+formId+"]").length) {
				$(this).after("<div class='slideshowProductWrapper'></div>");
				var $wrapper = $(this).next();
				$wrapper.append($(this));
				$wrapper.append($("form[name="+formId+"]").show().addClass("slideshowProductForm"));
				var $form = $("form",$wrapper);
				$(".item",$wrapper).append('<span class="slideshowCheckbox"></span>');
				$(".item:first",$wrapper).addClass("current");

				$(".owl-slideshow-multi,.owl-slideshow-single",$wrapper).addClass("with-product");
				$form.append("<input type='hidden' name='pic_url' value='' />");
				$("."+formId+"input",$form).val($(".item:first img",$wrapper).attr("alt"));
				var href = $("img:first",$wrapper).attr("src").split("?");
				$("input[name=pic_url]",$form).val(href[0]);
			}
		});
		$(".owl-slideshow-multi.with-product .item,.owl-slideshow-single.with-product .item").click(function(){
			
			var $galThumbs = $(this).parents(".with-product");
			$(".current",$galThumbs).removeClass("current");
			$(this).addClass("current");

			var $form = $(this).parents(".with-product").next();
			var formId = $(this).parents(".with-product").attr("id").replace("gallery","");
			$("."+formId+"input",$form).val($("img",$(this)).attr("alt"));
			var href = $("img",$(this)).attr("src").split("?");
			$("input[name=pic_url]",$form).val(href[0]);
		});

	});

/*
	#'Gallery with thumbs' Gallery Style - including support for prodcuts based on these gallery styles

*/
	$(window).resize(function(){
		$(".enlarge img").fadeOut();
		clearTimeout(afterResizingGallery);
		afterResizingGallery = setTimeout(function () {
			afterResizeGallery();
		}, 400);
	});
	var afterResizingGallery;
	function afterResizeGallery () {
		$(".galleryWithThumbs").each(function(){
			var $e = $(".enlarge",$(this));
			$e.css("height","auto");
			var $t = $(this);
			var $a = $("a.current",$t);
			showPic($a,$e);
		});
	}
	$(document).ready(function(){
		$(".owl-gallery-thumbs").each(function(){
			$(this).owlCarousel({
				items : 10,
				slideSpeed : 300,
				paginationSpeed : 400,
				navigationText : ["&lt;","&gt;"],
				itemsDesktop : [1000,8], 
				itemsDesktopSmall : [768,6],
				itemsTablet: [480,5],
				itemsMobile : false
			});
		});
		
		$(".galleryWithThumbs").each(function(){

			var $e = $(".enlarge",$(this));
			var $t = $(this);
			var $a = $("a:first",$t);
			showPic($a,$e);

			$("a",$t).click(function(){
				$(".current",$t).removeClass("current");
				showPic($(this),$e);
				return false;
			});
		});
		$(".galleryWithThumbs").each(function(){
			var formId = $(this).attr("id").replace("gallery","");
			if ($("form[name="+formId+"]").length) {
				$(this).after("<div class='galleryThumbsProductWrapper'></div>");
				var $wrapper = $(this).next();
				$wrapper.append($(this));
				$wrapper.append($("form[name="+formId+"]").show().addClass("galleryThumbsProductForm"));
				var $form = $("form",$wrapper);
				$(".galleryWithThumbs",$wrapper).addClass("with-product");
				$form.append("<input type='hidden' name='pic_url' value='' />");
				$("."+formId+"input",$form).val($(".owl-gallery-thumbs img:first",$wrapper).attr("alt"));
				var href = $("img:first",$wrapper).attr("src").split("?");
				$("input[name=pic_url]",$form).val(href[0]);
			}
		});
		$(".galleryWithThumbs.with-product .owl-gallery-thumbs a").click(function(){
			var $galThumbs = $(this).parents(".with-product");
			var $form = $(this).parents(".with-product").next();
			var formId = $(this).parents(".with-product").attr("id").replace("gallery","");
			$("."+formId+"input",$form).val($("img",$(this)).attr("alt"));
			var href = $("img",$(this)).attr("src").split("?");
			$("input[name=pic_url]",$form).val(href[0]);
		});
	});
	function showPic ($a,$e) {
		$a.addClass("current");
		$("img",$e).fadeOut();
		var $i = $("<img src='"+$a.attr("href")+"' style='display:none;'/>");
		$e.append($i);
		$i.one('load', function() {
		  $e.css("height",$(this).height()+"px");
		  $i.fadeIn();
		}).each(function() {
		  if(this.complete) $(this).load();
		});
	}


/*
	#'Carousel Slide' Widget
*/

	$(document).ready(function(){
		$(".carousel_slide").each(function(){
			if (!$(this).prev().hasClass("carousel_slide")) {
				$(this).before("<div class='owl-carousel'></div>");
			}
		});
		$(".owl-carousel").each(function(){
			$wrapper = $(this);
			$(this).nextAll().each(function(){
				if (!$(this).hasClass("carousel_slide")) {
					return false;
				} else {
					$(this).appendTo($wrapper);
				}
			});
		});
		$(".owl-carousel").each(function(){
			$(this).owlCarousel({
				navigation : true,
				slideSpeed : 300,
				paginationSpeed : 400,
				singleItem:true,
				navigationText : ["&lt;","&gt;"]
			});
		});
	});


/*
	#'Live Shopping Basket' Widget
*/

	function bindMiniBasket () {
		var options = { 
		    success: function(){
				$("#miniBasket2").load("/actions/ShowMiniBasket/"+lang,function(){
					bindMiniBasket();					
					$("#loading").stop(true,false).fadeOut();
				});


			}  // post-submit callback 
		};
		$(".quantity").blur(function(e){
			if ($(e.target).attr("id")!="updateQuantities") {
				$("#miniBasketForm").submit();				
			}
		});
		$("#miniBasketForm").submit(function(){
			$("#loading").fadeIn();

			$("#miniBasketForm").ajaxSubmit(options);
			return false;
		});
		$(".removeCell a").click(function(){
			$("#loading").fadeIn();
			$.ajax({ url: $(this).attr("href"), success: function(){
				$("#miniBasket2").load("/actions/ShowMiniBasket/"+lang,function(){
				bindMiniBasket();
				$("#loading").stop(true,false).fadeOut();

				});
			}});
			return false;
		});
	}
	$(document).ready(function(){
		$("#miniBasket2").load("/actions/ShowMiniBasket/"+lang,function(){
			bindMiniBasket();
		});
		if ($("#miniBasket2").length) {
			$(".addToBasketLink").click(function(){
				$("#loading").fadeIn();
				$.ajax({ url: $(this).attr("href"), success: function(){
					$("#miniBasket2").load("/actions/ShowMiniBasket/"+lang,function(){
					bindMiniBasket();
					$("#loading").stop(true,false).fadeOut();
					});

				}});
				return false;
			});
			$(".addToBasketForm").ajaxForm(function(){
				$("#loading").fadeIn();
				$("#miniBasket2").load("/actions/ShowMiniBasket/"+lang,function(){
					bindMiniBasket();
					$("#loading").stop(true,false).fadeOut();
					$("#loader:visible").fadeOut();
				});
			});
		}
	});

/* 
	
	#Livechat Status Widget
*/


	$(document).ready(function(){
		
		function checkLivechat () {
			$.ajax({
				type: "GET",
				url: "/actions/LivechatStatus/",
				success: function(msg){
					if (msg=="online") {
						$(".livechatWidgetOffline").hide();
						$(".livechatWidgetOnline").show();
					} else {
						$(".livechatWidgetOffline").show();
						$(".livechatWidgetOnline").hide();
					}
				}
			});
			setTimeout(checkLivechat, 10000);
		}
		checkLivechat();
		$(".startConvo").click(function () {
			href = this.href;
			var popup = window.open(href,'','toolbar=0,scrollbars=0,location=0,statusbar=0,menubar=0,resizable=0,width=311,height=349');
			return false;
		});

	});

/*
	#Responsive video helper for jPlayer

*/

	var afterResizing;
	$(window).resize(function(){
		if (!$(".jplayerInit .jplayer").hasClass("playing")) {
			if ($(".jplayerInit").length && !$(".jp-video-full").length) {

				$(".jplayerInit .jplayer").jPlayer("destroy");
				$(".jplayerInit").each(function(){
					var img = $(this).attr("data-poster");
					var vid = $(this).attr("data-vid");
					var $t = $(this).parent();
					$(this).remove();
					$t.html("<a href='"+vid+"'><img src='"+img+"' /></a>");
				});

			}
			clearTimeout(afterResizing);
			if (!$(".jp-video-full").length) {
				afterResizing = setTimeout(function () {
					afterResize();
				}, 1000);
			}
		}
	});
	function afterResize() {
		var jplayerVideoCounter=1;
		$(".bpe_video:not(.Popup_Video) img").each(function(){
			var width = $(this).width();
			var height = $(this).height();
			var image = $(this).attr("src");
			var video = $(this).parent().attr("href");
			$(this).parent().after("<div id=\"video"+jplayerVideoCounter+"\" class='jplayerInit' data-poster='"+image+"' data-vid='"+video+"'>"+playerHTML+"</div>");
			$(this).parent().remove();

			makeVideo("video"+jplayerVideoCounter,width,height,image,video,false,false);

			jplayerVideoCounter++;
		});
	}
/*
	#Responsive video helper for JWPlayer

*/

	var afterResizingJW;
	$(window).resize(function(){
		if (window.jwplayer) {
			jwplayer().remove();
			$(".bpe_video:not(.Popup_Video)").show();
			clearTimeout(afterResizingJW);
			
			afterResizingJW = setTimeout(function () {
				afterResizeJW();
			}, 1000);
		}
	
	});
	function afterResizeJW() {
		var JWPlayerVideoCounter=1;
		$(".bpe_video:not(.Popup_Video) img").each(function(){

			var img = this;
			var width = $(this).width();
			var height = $(this).height();
			var image = $(this).attr("src");
			var video = $(this).parent().attr("href");
			$(this).parent().parent().hide();
			$(this).parent().parent().after("<div id=\"video"+JWPlayerVideoCounter+"\"></div>");
			makeVideo("video"+JWPlayerVideoCounter,width,height,image,video,false);


			JWPlayerVideoCounter++;
		});
	}

/* 

 	#Responsive Calendar

*/
	$(document).ready(function(){
		$(".calendar").click(function(e){
			if ($(e.target).hasClass("hasEvents") || $(e.target).parents(".hasEvents").length) {
				if ($(e.target).hasClass("hasEvents")) {
					var $t = $(e.target);
				} else {
					var $t = $(e.target).parents(".hasEvents");
				}
				if ($(window).width()<=768) {
					$("body").append("<div id='eventPopupWrapper'><div id='eventPopup'><div id='closeEventPopup'>x</div><div id='eventInfo'></div></div></div>");
					$("#eventInfo").append("<h4>"+$t.attr("data-full-date")+"</h4>");
					$(".event",$t).clone().appendTo($("#eventInfo"));
					$("#closeEventPopup").click(function(){
						$("#eventPopupWrapper").remove();
					});
				}
			}
		});

	});

/*
	#Full width banner

*/
	$(document).ready(function(){
		if ($("#fullWidthBanner").length) {
			if ($("#fullWidthBannerBG img").length) {
				var src = $("#fullWidthBannerBG img").attr("src");
				src = src.split("?");
				src = src[0]+"?width=1920&height=auto";
			} else {
				var src="/graphics/full-width-bg.jpg"
			}
			$("#fullWidthBanner").backstretch(src);
			$("h1,h2,h3,h4,p,li","#fullWidthBanner").filter(":not(.Button_Small,.Button_Medium,.Button_Large)").wrapInner("<span></span>");
		}
	});

/* 

 	#Blog Loop 

*/
	$(document).ready(function(){
		$(".blogItemLoop").each(function(){
			if (typeof $(this).attr("data-pic") != 'undefined') {
				$(this).backstretch($(this).attr("data-pic"));
			}
			$("h1,h2,h3,h4,p,li",$(this)).filter(":not(.Button_Small,.Button_Medium,.Button_Large,.blogDate)").wrapInner("<span></span>");
		});
	});



// If you add JWPlayer to your installation you can set some basic config for the player here.
var videoControlBar = "over";
var videoScreenColor = "#FFFFFF"; 
