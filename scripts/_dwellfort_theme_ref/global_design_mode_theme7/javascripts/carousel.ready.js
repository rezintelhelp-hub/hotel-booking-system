/*
#'Slideshow' and 'Carousel Slide' Widget initialization
Extracted from custom.js to support inline script loading

These functions are called from custom.js document.ready to ensure
proper initialization order (after backstretch initialization)
*/

// Slideshow functionality
function slideshowReady_core() {
	if (!$('body').hasClass("accessible-mode")){
		$(".banner-feature:not(#content_bar_1_banner_slideshow .banner-feature,#content_bar_2_banner_slideshow .banner-feature,#content_bar_3_banner_slideshow .banner-feature,#content_bar_4_banner_slideshow .banner-feature,#content_bar_5_banner_slideshow .banner-feature,#content_bar_6_banner_slideshow .banner-feature,#content_bar_7_banner_slideshow .banner-feature,#content_bar_8_banner_slideshow .banner-feature,#content_bar_9_banner_slideshow .banner-feature,#content_bar_10_banner_slideshow .banner-feature)").each(function(){
			if (!$(this).prev().hasClass("banner-feature")) {
				$(this).before("<div class='banner-feature-wrap'></div>");
			}
		});
		$(".banner-feature-wrap").each(function(){
			var $wrapper = $(this);
			$(this).nextAll().each(function(){
				if (!$(this).hasClass("banner-feature")) {
					return false;
				} else {
					$(this).appendTo($wrapper);
				}
			});
		});
		$(".shop-related-products").each(function(){
			$(this).owlCarousel({
				items : 4,
				slideSpeed : 300,
				itemsScaleUp : false,
				paginationSpeed : 400,
				navigationText : ["&lt;","&gt;"],
				navigation:true,
				itemsDesktop : [1000,4],
				itemsDesktopSmall : [768,3],
				itemsTablet: [480,3],
				itemsMobile : [320,2]
			});
		});

		$(".banner-feature-wrap").each(function(){
			$(this).owlCarousel({
				navigation : true,
				slideSpeed : 300,
				paginationSpeed : 400,
				singleItem:true,
				navigationText : ["&lt;","&gt;"],
				afterAction: function(el){
					this.$owlItems.removeClass('activebanner');
					this.$owlItems.eq(this.currentItem).addClass('activebanner');
					setTimeout(function () {
                                                moduleHeights();
                                                },350);

				    }
			});
		});


		$("#content_bar_1_banner_slideshow,#content_bar_2_banner_slideshow,#content_bar_3_banner_slideshow,#content_bar_4_banner_slideshow,#content_bar_5_banner_slideshow,#content_bar_6_banner_slideshow,#content_bar_7_banner_slideshow,#content_bar_8_banner_slideshow,#content_bar_9_banner_slideshow,#content_bar_10_banner_slideshow").each(function(){
			var speed = $(this).data("slideshow-speed");
			var transstyle = $(this).data("slideshow-style");
			var dots = $(this).data("slideshow-dots");
			var arrows = $(this).data("slideshow-arrows");
			var c = "banner-owl ";
			if (arrows){
				c += "with_side_buttons ";
			}
				var pag = false;
			if (dots){
				c += "with_dots ";
				var pag = true;
			}
			$("> section  > div > div",$(this)).addClass(c);
			$("> section  > div > div",$(this)).owlCarousel({
				navigation : true,
				pagination:pag,
				autoPlay : speed,
			    singleItem : true,
				slideSpeed:500,
				afterMove: function(){
					setTimeout(function () {
			//		moduleHeights();
					}, 350);

				},
			    autoHeight : false,
			    transitionStyle:transstyle,
				navigationText : ["&lt;","&gt;"],
				afterAction: function(el){
					this.$owlItems.removeClass('activebanner');
					this.$owlItems.eq(this.currentItem).addClass('activebanner');
					setTimeout(function () {
                                 //               moduleHeights();
                                                },550);
				    }
			});
		});

		$(".recent-pages-scroll").each(function(){
			var speed = $(this).data("speed");
			$(this).owlCarousel({
				navigation : true,
				autoPlay : speed,
				paginationSpeed : 400,
				goToFirstSpeed : 2000,
			    singleItem : true,
			    autoHeight : true,
				afterMove: function(){
					setTimeout(function () {
					moduleHeights();
					}, 350);

				},
			    transitionStyle:"fade",
				navigationText : ["&lt;","&gt;"],
				afterAction: function() {
					 setTimeout(function () {
                                                 moduleHeights();
                                                  },550);

				}
			});
		});
		$(".owl-slideshow-single").each(function(){
			var speed = $(this).data("speed");
			$(this).owlCarousel({
				navigation : true,
				slideSpeed : 300,
				autoPlay : speed,
	    		stopOnHover : true,
				paginationSpeed : 400,
				goToFirstSpeed : 2000,
			    singleItem : true,
			    autoHeight : true,
				afterMove: function(){
					setTimeout(function () {
					moduleHeights();
					}, 350);

				},
			    transitionStyle:"fade",
				navigationText : ["&lt;","&gt;"],
				afterAction: function() {
					 setTimeout(function () {
                                                 moduleHeights();
                                                  },550);

				}
			});
		});
		$(".owl-slideshow-multi").each(function(){
			var speed = $(this).data("speed");
			$(this).owlCarousel({
				items : 4,
				slideSpeed : 300,
				autoPlay : speed,
	    		stopOnHover : true,
				paginationSpeed : 400,
				goToFirstSpeed : 2000,
				navigationText : ["&lt;","&gt;"],
				afterAction: function() {
				 setTimeout(function () {
                                                 moduleHeights();
                                                  },550);

				}
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
	}

}

// Gallery thumbs functionality
function galThumbReady_core() {
	if (!$('body').hasClass("accessible-mode")){

		$(".owl-gallery-thumbs").each(function(){
			$(this).owlCarousel({
				items : 6,
				slideSpeed : 300,
				itemsScaleUp : false,
				paginationSpeed : 400,
				navigationText : ["&lt;","&gt;"],
				itemsDesktop : [1000,5],
				itemsDesktopSmall : [768,4],
				itemsTablet: [480,4],
				itemsMobile : [320,3]
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
	} else {
		$(".enlarge").remove();
	}
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
}

// Helper function for galThumbReady
function showPic ($a,$e) {
	$a.addClass("current");
	$(".captionWrap,.caption,img",$e).fadeOut().remove();

	var $img = $("<img src='"+$a.attr("href")+"' style='display:none;'/>");
	if ($("img",$a).attr("alt")!="") {
		var $i = $("<span class='captionWrap'><span class='caption'>"+$("img",$a).attr("alt")+"</span></span>");
		$img.prependTo($i);
	} else {
		var $i = $img;
	}

	$e.append($i);

	$img.one('load', function() {
	  $e.css("height",$(this).height()+"px");
	  $img.fadeIn();
		setTimeout(function () {
		moduleHeights();
		magicHeights();
		setFixedHeader();
		}, 500);
		if ($img.parents(".withZoom").length){
			$e.zoom({url: $a.attr("href")});
		}
	}).each(function() {
	  if(this.complete) $(this).load();
	});
}

// Carousel slide functionality
function carouselReady_core() {
	if (!$('body').hasClass("accessible-mode")){
		$(".carousel_slide").each(function(){
			if (!$(this).prev().hasClass("carousel_slide")) {
				if ($(this).hasClass("carousel_slide_autoscroll")) {
					$(this).before("<div class='owl-carousel owl-carousel-autoscroll' data-speed="+$(this).data("speed")+"></div>");
				} else {
					$(this).before("<div class='owl-carousel'></div>");
				}
			}
		});

		$(".owl-carousel").each(function(){
			var $wrapper = $(this);
			$(this).nextAll().each(function(){
				if (!$(this).hasClass("carousel_slide")) {
					return false;
				} else {
					$(this).appendTo($wrapper);
				}
			});
		});

		$(".owl-carousel").each(function(){
			if ($(this).hasClass("owl-carousel-autoscroll")) {
				var speed = $(this).data("speed");
				$(this).owlCarousel({
					navigation : true,
					slideSpeed : 300,
					autoPlay : speed,
					paginationSpeed : 300,
					singleItem:true,
					navigationText : ["&lt;","&gt;"]
				});
			}else{
				$(this).owlCarousel({
					navigation : true,
					slideSpeed : 300,
					paginationSpeed : 400,
					singleItem:true,
					navigationText : ["&lt;","&gt;"]
				});
			}

		});

		$(".carousel_slide_multi").each(function(){
			if (!$(this).prev().hasClass("carousel_slide_multi")) {
				var c = "";
				if ($(this).hasClass("with_side_buttons")){
					c += "with_side_buttons ";
				}
				if ($(this).hasClass("with_dots")){
					c += "with_dots ";
				}
				if ($(this).data("speed") != "0000") {
					$(this).before("<div class='"+c+" owl-carousel-multi owl-carousel-autoscroll' data-speed='"+$(this).data("speed")+"' data-items='"+$(this).data("items")+"'></div>");
				} else {
					$(this).before("<div class='"+c+" owl-carousel-multi' data-items='"+$(this).data("items")+"'></div>");
				}
			}
		});
		$(".owl-carousel-multi").each(function(){
			var $wrapper = $(this);
			$(this).nextAll().each(function(){
				if (!$(this).hasClass("carousel_slide_multi")) {
					return false;
				} else {
					$(this).appendTo($wrapper);
				}
			});
		});

		$(".owl-carousel-multi").each(function(){
			if ($(this).data("items")==1) {
				var si = true;
			} else {
				var si = false;
			}
			if ($(this).hasClass("owl-carousel-autoscroll")) {
				$(this).owlCarousel({
					navigation : true,
					slideSpeed : 300,
					autoPlay : $(this).data("speed"),
					paginationSpeed : 400,
					singleItem:si,
					items:$(this).data("items"),
					navigationText : ["&lt;","&gt;"]
				});
			}else{
				$(this).owlCarousel({
					navigation : true,
					slideSpeed : 300,
					paginationSpeed : 400,
					singleItem:si,
					items:$(this).data("speed"),
					navigationText : ["&lt;","&gt;"]
				});
			}

		});

	}
}
