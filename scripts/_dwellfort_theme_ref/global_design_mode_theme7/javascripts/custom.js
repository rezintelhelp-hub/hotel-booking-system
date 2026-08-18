/*! Copyright (c) 2010 Brandon Aaron (http://brandonaaron.net)
 * Licensed under the MIT License (LICENSE.txt).
 *
 * Version 1.2.3
 */

(function (factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['jquery'], factory);
    } else {
        // Browser globals
        factory(jQuery);
    }
}(function ($) {

    $.fn.overlaps = function(selector) {
        return this.pushStack(filterOverlaps(this, selector && $(selector)));
    };

    function filterOverlaps(collection1, collection2) {
        var dims1  = getDims(collection1),
            dims2  = !collection2 ? dims1 : getDims(collection2),
            stack  = [],
            index1 = 0,
            index2 = 0,
            length1 = dims1.length,
            length2 = !collection2 ? dims1.length : dims2.length;

        if (!collection2) { collection2 = collection1; }

        for (; index1 < length1; index1++) {
            for (index2 = 0; index2 < length2; index2++) {
                if (collection1[index1] === collection2[index2]) {
                    continue;
                } else if (checkOverlap(dims1[index1], dims2[index2])) {
                    stack.push( (length1 > length2) ?
                        collection1[index1] :
                        collection2[index2]);
                }
            }
        }

        return $.unique(stack);
    }

    function getDims(elems) {
        var dims = [], i = 0, offset, elem;

        while ((elem = elems[i++])) {
            offset = $(elem).offset();
            dims.push([
                offset.top,
                offset.left,
                $(elem).outerWidth(),
                $(elem).outerHeight()
            ]);
        }

        return dims;
    }

    function checkOverlap(dims1, dims2) {
        var x1 = dims1[1], y1 = dims1[0],
            w1 = dims1[2], h1 = dims1[3],
            x2 = dims2[1], y2 = dims2[0],
            w2 = dims2[2], h2 = dims2[3];
        return !(y2 + h2 <= y1 || y1 + h1 <= y2 || x2 + w2 <= x1 || x1 + w1 <= x2);
    }

}));
/*
waitForImages plugin

Copyright (c) 2014 Alex Dickson

Permission is hereby granted, free of charge, to any person
obtaining a copy of this software and associated documentation
files (the "Software"), to deal in the Software without
restriction, including without limitation the rights to use,
copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the
Software is furnished to do so, subject to the following
conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.

*/
/*! waitForImages jQuery Plugin 2018-02-13 */
!function(a){"function"==typeof define&&define.amd?define(["jquery"],a):"object"==typeof exports?module.exports=a(require("jquery")):a(jQuery)}(function(a){var b="waitForImages",c=function(a){return a.srcset&&a.sizes}(new Image);a.waitForImages={hasImageProperties:["backgroundImage","listStyleImage","borderImage","borderCornerImage","cursor"],hasImageAttributes:["srcset"]},a.expr.pseudos["has-src"]=function(b){return a(b).is('img[src][src!=""]')},a.expr.pseudos.uncached=function(b){return!!a(b).is(":has-src")&&!b.complete},a.fn.waitForImages=function(){var d,e,f,g=0,h=0,i=a.Deferred(),j=this,k=[],l=a.waitForImages.hasImageProperties||[],m=a.waitForImages.hasImageAttributes||[],n=/url\(\s*(['"]?)(.*?)\1\s*\)/g;if(a.isPlainObject(arguments[0])?(f=arguments[0].waitForAll,e=arguments[0].each,d=arguments[0].finished):1===arguments.length&&"boolean"===a.type(arguments[0])?f=arguments[0]:(d=arguments[0],e=arguments[1],f=arguments[2]),d=d||a.noop,e=e||a.noop,f=!!f,!a.isFunction(d)||!a.isFunction(e))throw new TypeError("An invalid callback was supplied.");return this.each(function(){var b=a(this);f?b.find("*").addBack().each(function(){var b=a(this);b.is("img:has-src")&&!b.is("[srcset]")&&k.push({src:b.attr("src"),element:b[0]}),a.each(l,function(a,c){var d,e=b.css(c);if(!e)return!0;for(;d=n.exec(e);)k.push({src:d[2],element:b[0]})}),a.each(m,function(a,c){var d=b.attr(c);return!d||void k.push({src:b.attr("src"),srcset:b.attr("srcset"),element:b[0]})})}):b.find("img:has-src").each(function(){k.push({src:this.src,element:this})})}),g=k.length,h=0,0===g&&(d.call(j),i.resolveWith(j)),a.each(k,function(f,k){var l=new Image,m="load."+b+" error."+b;a(l).one(m,function b(c){var f=[h,g,"load"==c.type];if(h++,e.apply(k.element,f),i.notifyWith(k.element,f),a(this).off(m,b),h==g)return d.call(j[0]),i.resolveWith(j[0]),!1}),c&&k.srcset&&(l.srcset=k.srcset,l.sizes=k.sizes),l.src=k.src}),i.promise()}});

/*
End waitForImages plugin
*/

/*!
 * jQuery UI Touch Punch 0.2.3
 *
 * Copyright 2011–2014, Dave Furfero
 * Dual licensed under the MIT or GPL Version 2 licenses.
 *
 * Depends:
 *  jquery.ui.widget.js
 *  jquery.ui.mouse.js
 */
!function(a){function f(a,b){if(!(a.originalEvent.touches.length>1)){a.preventDefault();var c=a.originalEvent.changedTouches[0],d=document.createEvent("MouseEvents");d.initMouseEvent(b,!0,!0,window,1,c.screenX,c.screenY,c.clientX,c.clientY,!1,!1,!1,!1,0,null),a.target.dispatchEvent(d)}}if(a.support.touch="ontouchend"in document,a.support.touch){var e,b=a.ui.mouse.prototype,c=b._mouseInit,d=b._mouseDestroy;b._touchStart=function(a){var b=this;!e&&b._mouseCapture(a.originalEvent.changedTouches[0])&&(e=!0,b._touchMoved=!1,f(a,"mouseover"),f(a,"mousemove"),f(a,"mousedown"))},b._touchMove=function(a){e&&(this._touchMoved=!0,f(a,"mousemove"))},b._touchEnd=function(a){e&&(f(a,"mouseup"),f(a,"mouseout"),this._touchMoved||f(a,"click"),e=!1)},b._mouseInit=function(){var b=this;b.element.bind({touchstart:a.proxy(b,"_touchStart"),touchmove:a.proxy(b,"_touchMove"),touchend:a.proxy(b,"_touchEnd")}),c.call(b)},b._mouseDestroy=function(){var b=this;b.element.unbind({touchstart:a.proxy(b,"_touchStart"),touchmove:a.proxy(b,"_touchMove"),touchend:a.proxy(b,"_touchEnd")}),d.call(b)}}}(jQuery);



/*

	Starting Blocks Theme Custom jQuery File

	======
	Contents:
	------
	#Popup Video
	#Expand Collapse Widgets
	#Popdown widgets
	#Basic init setup
	#'Default' Gallery Style (Lightbox with thumbs) - including support for prodcuts based on this gallery style
	#'Montage' Gallery Style - including support for prodcuts based on this gallery style
	#'Slideshow' Gallery Styles (single and multi) - including support for prodcuts based on these gallery styles
	#'Gallery with thumbs' Gallery Style - including support for prodcuts based on these gallery styles
	#'Carousel Slide' Widget
	#'Live Shopping Basket' Widget
	#'Shopping Basket' Widget
	# Livechat Status Widget
	# Searchable Subpage Index
	# Searchable Preview Based Subpage Index
	#Responsive video helper for jPlayer
	#Responsive video helper for JWPlayer
	#Responsive Calendar
	#Full width banner
	#Blog Loop
	#Countdown
	#Consent widgets


*/
/* Share links */
	function shareReady() {
		$('.share-links a').click(function() {
			var w = 700;
			var h = 600;
			var wleft = (screen.width/2)-(w/2);
			var wtop = (screen.height/2)-(h/2);
			window.open($(this).attr('href'), $(this).attr('title'), 'toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=no, resizable=no, copyhistory=no, width='+w+', height='+h+', top='+wtop+', left='+wleft);
			return false;
		});
	};
/* YouTube Channel */
	 function youTubeReady() {
		 if (window.consent.functional){
			 $('.youtube-channel').each(function(){
				var feed = $(this).data('feed');
				var total = $(this).data('show');
				var x = 0;
				if (isNaN(total)) {
					total = 10;
				}
				while (x<total) {
					if (typeof feed[x] != 'undefined') {	
						var link = feed[x].link;
						var id = link.substr(link.indexOf("=") + 1); 
						$(this).append('<div class="youtube-iframe-col"><div class="youtube-iframe"><iframe src="https://youtube.com/embed/'+id+'?"/></div></div>');
					}
					x++;
				}
			 });
		 } else {

		 }
		 moduleHeights();
	 }

$(window).on('scroll',function(e){
	floatingScroll();
	backtotopScroll();
	frillsScroll();
	asyncImagesLoad();
});
window.fontsloaded=false;
window.findBreakpoints=false;
$(window).on('load',function(e){
	$(window).on('scroll',function(e){
		fixedHeaderScroll();
	});
	floatingLoad();
	foldericons();
	stickyLoad();
	miscLoad();
	searchImageLoad();
	montageLoad();
	magicHeights();
	asyncImagesLoad();
	tabsResize();
	instaLoad();
	setTimeout(function(){
		frillsReady();
		if (!window.fontsloaded){
			window.fontsloaded=true;
			afterFonts();
		}
	},150);

	$("#mobile-menu-page-wrap").css("height",$("#mobileheader").height()-"px");
});
document.fonts.ready.then(function () {
	setTimeout(function(){
		window.fontsloaded=true;
		afterFonts();
	},100);
});
$(window).on('resize',function(e){
	galleryResize();
	if ($(window).width()==windowwidth) {
		return false;
	}
	/* width only below */
	windowwidth=$(window).width();
	foldericons();
	magicHeights();
	asyncImagesLoad();
	floatingResize();
	mp_lightboxResize();
	miscResize();
	montageResize();
	galThumbResize();
	responsiveVideoResize();
	responsiveVideoJWResize();
	backstretches();
	tabsResize();
});
$(document).on('ready',function() {
	windowwidth=$(window).width();
	smileyReady();
	mapsMarkersReady();
	bookmarksReady();
	tabsReady();
	forumReady();
	bannerHeightWithFloating();
	folderGalleryStylesLoad();
	userChatReady();
	youTubeReady();
	shareReady();
	avatarReady();
	walthroughReady();
	consentReady();
	updateConsentBasedContent();
	countdownReady();
	calendarReady();
	bannerReady();
	galThumbReady();
	carouselReady();
	slideshowReady();
	livechatReady();
	pbReady();
	kbReady();
	basketReady();
	productQuanReady();
	montageReady();
	galleryReady();
	popupReady();
	popdownReady();
	expandReady();
	filterReady();
	floatingReady();
	stickyReady();
	magicHeights();
	asyncImagesLoad();
	conditionalForm();
	accessibleReady();
	imagesReady();
	mpPopupReady();
	iconsReady();
	hoverImageReady();
	anchorCheckLoad();
	miscReady();
	swReady();
	subscriptionReady();
	unleashedReady();
});
function setFormPages($form){
	var $prev = $(".prev_form_page",$form);
	var $next = $(".next_form_page",$form);
	var $submit = $(".submit_form",$form);
	if ($(".current_form_page").prevAll(".form_page").length===0){
		$prev.hide();
	}else{
		$prev.show();
		$submit.hide();
	}
	if ($(".current_form_page").nextAll(".form_page").length===0){
		$next.hide();
		$submit.show();
	}else{
		$next.show();
		$submit.hide();
	}
	moduleHeights();
};
function conditionalForm() {
	$(".form").each(function(){
		$(".form_page",$(this)).first().addClass("current_form_page");
		setFormPages($(this));
	});
	$(".prev_form_page,.next_form_page").click(function(){
		if ($(this).hasClass("next_form_page")){
			var $each=$(".current_form_page").removeClass("current_form_page").nextAll(".form_page");
		} else {
			var $each=$(".current_form_page").removeClass("current_form_page").prevAll(".form_page");
		}
		var $form = $(this).parents(".form");
		var $submit = $(".submit_form",$form);
		$each.each(function(){
			//if (($(".showing_conditional_section",$(this)).length&&$(".form_conditional_section",$(this)).length)||!$(".form_conditional_section",$(this)).length){
				$(this).addClass("current_form_page");
				setTimeout(function(){
					setFormPages($form);
				},10);
				return false;
			//}
		});
		return false;
	});
	$(".form_page").parents(".form").addClass("form_with_sections");
	if ($(".form_conditional_section").length){
		$("input,select,textarea",$(".form")).change(function(e){
			$(".form_conditional_section",$(e.target).parents(".form")).each(function(){
				var rules = $(this).data("rules");
				var visible = $(this).data("visible");
				if (visible=="all"){
					var pass = true;
				}else{
					var pass = false;
				}

				for (var i=0; i < rules.length; i++) {
					var ok = false;
					if (rules[i]["operator"]=="=="){
						if ($(".input-numeric-id-"+rules[i]["ID"]).find(".input,.textarea,.select,.radio:checked").val()==rules[i]["Value"]){
						ok=true;
						}
						if ($(".input-numeric-id-"+rules[i]["ID"]).find(".checkbox:checked").length && (rules[i]["Value"]=="1"||rules[i]["Value"]=="true"||rules[i]["Value"]=="checked")){
						ok=true;
						}
					}
					if (rules[i]["operator"]=="!="){
						if ($(".input-numeric-id-"+rules[i]["ID"]).find(".input,.textarea,.select,.radio:checked").val()!=rules[i]["Value"]){
						ok=true;
						}
						if (!$(".input-numeric-id-"+rules[i]["ID"]).find(".checkbox:checked").length && (rules[i]["Value"]=="1"||rules[i]["Value"]=="true"||rules[i]["Value"]=="checked")){
						ok=true;
						}
					}
					if (rules[i]["operator"]==">"){
						if ($(".input-numeric-id-"+rules[i]["ID"]).find(".input,.textarea,.select,.radio:checked").val()>rules[i]["Value"]){
						ok=true;
						}
					}
					if (rules[i]["operator"]=="<"){
						if ($(".input-numeric-id-"+rules[i]["ID"]).find(".input,.textarea,.select,.radio:checked").val()<rules[i]["Value"]){
						ok=true;
						}
					}
					if (visible=="all"){
						if (!ok){
							pass=false;
						}
					}else{
						if (ok) {
							pass=true;
						}
					}
				};
				if (pass){
				$(this).addClass("showing_conditional_section");
				$(this).find(".required_hidden").removeClass("required_hidden").addClass("required");
				}else{
				$(this).find(".required").removeClass("required").addClass("required_hidden");
				$(this).removeClass("showing_conditional_section");
				}
				moduleHeights();

			});
			formStyleHelper();
		});
	}

	$(".form_conditional_section").parents(".form").find("input:first").trigger("change");
}
function unleashedReady(){
	if (!$("#unleashed-automatic").length&&!readCookie('output_cursym_idv3')){
		$('#unleashed-region-chooser').addClass('visible').appendTo($('body'));
	}
	if(readCookie('output_cursymv3')) {
		createCookie('preselect_cur',readCookie("output_cursymv3"),0);
	}
	if ($("#unleashed-automatic").length){
		var id = $("#unleashed-automatic").data("instance-id");
			$.ajax({
			  url: '',
			  data: 'choose_region=true&nocache=true',
			  success: function(data) {
				  var s = data.split("AJAX_"+"REGION");// + stops it matching this part of the script if loaded inline
				  s = s[1];
				if (s=="aud"||s=="nzd"||s=="gbp"||s=="usd"||s=="eur"||s=="default"){
					if (s!="default"){
						createCookie('output_cursymv3',s,0);
						createCookie('preselect_cur',s,0);
					}
					createCookie('output_cursym_idv3',id,0);
				}
				  else {
					$('#unleashed-region-chooser').addClass('visible').appendTo($('body'));
				}
			  }
			});
	}
	$('#unleashed-region-chooser select').change(function(){
		var val = $(this).val();
		var id = $(this).data("instance-id");
		if (val!=""){
			if (val!="default"){
				createCookie('output_cursymv3',val,0);
				createCookie('preselect_cur',val,0);
			}
			createCookie('output_cursym_idv3',id,0);
			window.location.reload();
		}

	});
}
function instaLoad() {
	$(".instagram-mini-feed-post").each(function(){
		var $img = $('img',$(this));
		$img.attr('src',$img.data('src'));
	});
}
function tabsResize() {
	$('.tabs-widgets').each(function(){
		$(this).removeClass('not-enough-space-tabs');
		var ot=0;
		$('.tabs-tab',$(this)).each(function() {
			var tot=$(this).offset().top;
			if (ot==0) {
				ot=tot;
			}
			if (tot!=ot) {
				$(this).parents('.tabs-widgets').addClass('not-enough-space-tabs');
			}
		});
	});
}
function tabsReady() {
		if (typeof tabsReady_core != "undefined"){
			tabsReady_core();
		}
}
function mapsMarkersReady() {
		if (typeof mapsMarkersReady_core != "undefined"){
			mapsMarkersReady_core();
		}
}
function smileyReady(){
	$(".smiley_feedback").each(function(){

		var id  = $(this).data("id");
		var done = readCookie("smileyDone"+id);
		if (done){
			$(".save_score_done",$(this)).show();
			$(".smiley_score[data-score='"+done+"']").addClass("score_clicked");
		}
	});
	$(".smiley_score").click(function(){
		$(this).addClass("score_clicked");
		var score = $(this).data("score");
		var id  = $(this).parent().data("id");
		var $done=$(".save_score_done",$(this).parent());
		createCookie("smileyDone"+id,score);
		$.post(window.location.href,  {'id':id,'data[score]':score,'no_cache':'true'},  function(){
			$done.fadeIn();
			}
		);
	});
}
function bookmarksReady() {
	$('.user-bookmark-show-add').click(function() {	
		var $t =$(this).parents('.user-bookmarks-list').find('.user-bookmarks-add');
		if ($t.is(":visible")) {
			$t.slideUp(100,function(){
				magicHeights();
				moduleHeights();
			});
		}else {
			$t.slideDown(100,function(){
				magicHeights();
				moduleHeights();
			});
		}
		return false;
	});
}
function forumReady() {

	$("#notification_subscribe,#notification_post_subscribe").on("change",function(){
		$(this).parents("form").submit();

	});
		$('.remove_attachment').click(function(){
			$(this).parent().remove();
			return false;
		});
		if ($(".blog-add-form,.post-add-form,.post-edit-form,.blog-comment-form").length>0) {
			$(".email1").css({
				"position":"absolute"
				,"top":"-4000px"
				,"left":"-1000px"
			});
			$(".fakeemail").hide();
		}
		$('.edit_forum_comment_button').click(function(){
			var $comment= $(this).parents('.forum-comment');
			if (!$comment.find('form:visible').length) {
				$(this).text('Cancel');
				$comment.find("form").show();
				$comment.find('textarea').focus();
				$comment.find('.forum-comment-body').hide();
				$comment.find('.forum-comment-date').hide();
				$comment.find('> .forum-attachment').hide();
			}else{
				$(this).text('Edit');
				$comment.find("form").hide();
				$comment.find('.forum-comment-body').show();
				$comment.find('.forum-comment-date').show();
				$comment.find('> .forum-attachment').show();
			}
			return false;
		});
		$("#addpost:not('.dont-hide')").hide();
		moduleHeights();
		$('#show_add_post').attr('href','');
		$("#show_add_post").click(function(){
			$("#addpost").show();
			$("#forum_title").focus();
			moduleHeights();
			return false;
		});
		$('#forum-add-attachment a').click(function(){
			if ($('.forum-file-upload:hidden').length) {
				$('.forum-file-upload:hidden:first').removeClass("input-concealed");
			}
			if (!$('.forum-file-upload:hidden').length) {
				$(this).parent().hide();
			}
			return false;
		});
		$('#forum-comment-add-attachment a').click(function(){
			if ($('.forum-comment-file-upload:hidden').length) {
				$('.forum-comment-file-upload:hidden:first').removeClass("input-concealed");
			}
			if (!$('.forum-comment-file-upload:hidden').length) {
				$(this).parent().hide();
			}
			return false;
		});
}
function subscriptionReady() {
	$('.subscription-cancel-button a').click(function() {
		$('body').append('<div id="subscribe-confirm-mask"></div><div id="subscribe-confirm"><h2>End your subscription to '+$(this).parents('.subscription-product').find('.subscription-product-title').text()+'</h2><p>You will not be charged again.</p><div id="subscription-confirm-buttons"><a href="" id="subscription-end">Stop subscription</a><a href="" id="subscription-cancel">Cancel (keep subscription)</a></div></div>');
		var link = $(this).attr('href');
		setTimeout(function() { 

			$('body #subscription-end').unbind().click(function() {
				if ($(this).parents('#subscribe-confirm').hasClass('loading')) {
					return false;
				}
				$(this).parents('#subscribe-confirm').addClass('loading');
				setTimeout( function() { 
				window.location.href=link;
				},50);
				return false;
			});
			$('body #subscription-cancel').unbind().click(function() {
				if ($(this).parents('#subscribe-confirm').hasClass('loading')) {
					return false;
				}
				$('#subscribe-confirm-mask,#subscribe-confirm').remove();
				return false;
			});
		},10);
		return false;
	});
	$('.subscription-subscribe').click(function() {
		$('body').append('<div id="subscribe-confirm-mask"></div><div id="subscribe-confirm"><h2>Confirm subscription to '+$(this).parents('.subscription-product').find('.subscription-product-title').text()+'</h2><p>'+$(this).parents('.subscription-product').find('.subscription-product-price').html()+' You will receive an email reminder 7 days prior.<div id="subscription-confirm-buttons"><a href="" id="subscription-confirm">Confirm and start payments</a><a href="" id="subscription-cancel">Cancel</a></div></div>');
		var link = $(this).attr('href');
		setTimeout(function() { 

		$('body #subscription-confirm').unbind().click(function() {
			if ($(this).parents('#subscribe-confirm').hasClass('loading')) {
				return false;
			}
			$(this).parents('#subscribe-confirm').addClass('loading');
			setTimeout( function() { 
			window.location.href=link;
			},50);
			return false;
		});
		$('body #subscription-cancel').unbind().click(function() {
			if ($(this).parents('#subscribe-confirm').hasClass('loading')) {
				return false;
			}
			$('#subscribe-confirm-mask,#subscribe-confirm').remove();
			return false;
		});
		},10);
		return false;		
	});
	$('.auth-payment').click(function() {
	
	  stripe.confirmCardPayment($(this).data('intent')).then(function(result) {
		setTimeout(function(){
		window.location.reload();
		},50);
	    if (result.error) {

	    } else {

	    }
	  });
	});
}
function swReady() {
	// SWA2HS
	if ($("#SWA2HS").length){ 
		$("#installPrompt").appendTo("body");
		$("#SWA2HS").appendTo("body");
    // Move both to body append to avoid overflow hidden issues
		const addBtn = document.getElementById('SWA2HS');
    // addBtn is the 'tap here to install which should work on Android'
		const installPromptDiv = document.getElementById('installPrompt');
    // installPromptDiv is the iOS style version with tap share.. instructions.
      
	  addBtn.style.display = 'none';
		installPromptDiv.style.display = 'none';

		if (window.localStorage.getItem('dismissInstallPrompt')){
      // prompts have been dismissed
			$("#installPrompt").remove();
			$("#SWA2HS").remove();
		} else {

			let deferredPrompt;

			// Prevent Chrome from showing the mini-infobar

      const isAndroid = /Android/i.test(navigator.userAgent);

      if (isAndroid) {
      // show 'tap here' on Android (skip on Chrom desktop)
			window.addEventListener('beforeinstallprompt', (e) => {
			    // Prevent the mini-infobar from appearing on mobile
			    e.preventDefault();

			    // Stash the event so it can be triggered later.
			    deferredPrompt = e;

			    // Update UI notify the user they can add to home screen
			    addBtn.style.display = 'block';
			});
      }

			// Show the prompt when the button is clicked, Android
			addBtn.addEventListener('click', (e) => {
			    // Hide the app provided install promotion
			    addBtn.style.display = 'none';
			    // Show the install prompt
			    deferredPrompt.prompt();
			    // Wait for the user to respond to the prompt
			    deferredPrompt.userChoice.then((choiceResult) => {
				if (choiceResult.outcome === 'accepted') {
				    installPromptDiv.style.display = 'none';
				}
				deferredPrompt = null;
			    });
			});


		}
		if (window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches) {
		    // Already installed or running standalone
		    installPromptDiv.style.display = 'none';
  			addBtn.style.display='none';
		} else if ((/iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream) || (navigator.platform="MacIntel" && navigator.maxTouchPoints > 1) ) {
		    // Show iOS specific instructions
		    installPromptDiv.style.display = 'block';
  			addBtn.style.display='none';
		}

    $(".dismissInstallPrompt").click(function(){
      window.localStorage.setItem('dismissInstallPrompt',true);
      $("#SWA2HS,#installPrompt").remove();
      return false;
    });
	}


	// 
	const applicationServerPublicKey = $("body").data("push-notif-public");
	let isSubscribed = false;
	let swRegistration = null;

	function urlB64ToUint8Array(base64String) {
	  const padding = '='.repeat((4 - base64String.length % 4) % 4);
	  const base64 = (base64String + padding)
	    .replace(/\-/g, '+')
	    .replace(/_/g, '/');

	  const rawData = window.atob(base64);
	  const outputArray = new Uint8Array(rawData.length);

	  for (let i = 0; i < rawData.length; ++i) {
	    outputArray[i] = rawData.charCodeAt(i);
	  }
	  return outputArray;
	}
	function updateSubscriptionOnServer(subscription,default_list) {
	    const key = subscription.getKey('p256dh');
	    const token = subscription.getKey('auth');
	    const contentEncoding = (PushManager.supportedContentEncodings || ['aesgcm'])[0];
		if (typeof default_list == "undefined") {
			default_list="";
		}
	    return fetch('/actions/PushSubscribe/', {
		    method: 'POST',
	      body: JSON.stringify({
		endpoint: subscription.endpoint,
		default_list: default_list,
		publicKey: key ? btoa(String.fromCharCode.apply(null, new Uint8Array(key))) : null,
		authToken: token ? btoa(String.fromCharCode.apply(null, new Uint8Array(token))) : null,
		contentEncoding,
	      }),
	    }).then(function(response){ 
		//console.log(response.text()); 
	    });
	  }

	function unsubscribeUser() {
	  swRegistration.pushManager.getSubscription()
	  .then(function(subscription) {
	    if (subscription) {
	      return subscription.unsubscribe();
	    }
	  })
	  .catch(function(error) {
	    //console.log('Error unsubscribing', error);
	  })
	  .then(function() {

	    //console.log('User is unsubscribed.');
	    isSubscribed = false;
      $("#SubscribePrompt").show();
	    $("#PushNotifSubscribeButton").text("Subscribe");
		  alert("Your device has been unsubscribed.");
	  });
	}
	function subscribeUser(default_list) {
	  const applicationServerKey = urlB64ToUint8Array(applicationServerPublicKey);
	  swRegistration.pushManager.subscribe({
	    userVisibleOnly: true,
	    applicationServerKey: applicationServerKey
	  })
	  .then(function(subscription) {
	  //  console.log('User is subscribed.');
	//   console.log(subscription);
	    updateSubscriptionOnServer(subscription,default_list);
	    isSubscribed = true;
      $("#SubscribePrompt").hide();
	    $("#PushNotifSubscribeButton").text("Unsubcribe");

	  })
	  .catch(function(error) {
	    console.error('Failed to subscribe the user: ', error);
	  });
	}
	function initializeUI() {
	  // Set the initial subscription value
	if (Notification.permission === 'denied') {
 	$("#PushNotifSubscribeButton").hide();
  $("#SubscribePrompt").hide();
 	$("#PushNotifBlocked").show();
	    return;
	}
	$("#PushNotifSubscribeButton").click(function(){
		if (isSubscribed) {
		unsubscribeUser();
		} else {
		subscribeUser($(this).data("default-list"));
		}
		return false;
	});
	  swRegistration.pushManager.getSubscription()
	  .then(function(subscription) {
	    isSubscribed = !(subscription === null);

	    if (isSubscribed) {
		    // user is subscribed
        $("#SubscribePrompt").hide();
		    $("#PushNotifSubscribeButton").text("Unsubscribe");
	    } else {
		    // user is not subscribed
		    $("#PushNotifSubscribeButton").text("Subscribe").show();
        $("#SubscribePrompt").show();
	    }

	  });
	}

	if ('serviceWorker' in navigator && 'PushManager' in window) {
	  navigator.serviceWorker.register('/javascripts/sw.js')
	  .then(function(swReg) {
	 // success register service worker
	    swRegistration = swReg;
	    initializeUI();
	  })
	  .catch(function(error) {
		  // error
	   $("#PushNotAvailable").show();
	    $("#PushNotifSubscribeButton").parent().hide();
      $("#SubscribePrompt").hide();
	//	alert("didn't work ");
	  });
	} else {

		    if ($("#PushNotAvailable").length && !window.matchMedia('(display-mode: standalone)').matches) {
			    var ver = navigator.appVersion;
				var agt = navigator.userAgent;
				var browser  = navigator.appName;
				var version = parseInt(navigator.appVersion,10);
				var no,vo,x;

				if ((vo=agt.indexOf("Chrome"))!=-1) {
				 browser= "Chrome";
				 version = agt.substring(vo+7);
				}
				else if ((vo=agt.indexOf("Safari"))!=-1) {
				 browser= "Safari";
				 version = agt.substring(vo+7);
				 if ((vo=agt.indexOf("Version"))!=-1) 
				   version = agt.substring(vo+8);
				}
				if ((x=version.indexOf(";"))!=-1)
				   version=version.substring(0,x);
				if ((x=version.indexOf(" "))!=-1)
				   version=version.substring(0,x);

				version = parseInt(''+version,10);
				if (isNaN(version)) {
				 version = parseInt(navigator.appVersion,10);
				}
		    }
	    $("#PushNotifSubscribeButton").parent().hide();
      $("#SubscribePrompt").hide();

				if (browser=="Safari"&&version>=17||browser=="Chrome") {
					$("#addToHomeScreen").show();
				} else {
					$("#PushNotAvailable").show();

				}
	//	alert("not available");
		// not supported
	}
}
function miscReady() {
	$('.Greyed_Out_Button a').click(function() { 
		return false;
	});
}
function userChatUpdateRecipients() {
	var ids = "";
	var names = "";
	$('#user_list_chat_convo .user_chat_recipient').each(function() {
		if (ids!="") {
			ids+=",";
			names+=", ";
		}
		ids += $(this).data('id');
		names += $(this).data('name').replace(/,/g,' ');
	});
	$('#user_chat_recipient_ids').val(ids);
	$('#user_chat_recipient_names').val(names);
}
var livemessages=false;
function liveMessages(id,last_id) {
	if (livemessages!==false) {
		livemessages.close();
	}
	if (!!window.EventSource) {

		    livemessages = new EventSource("?sse=true&app=true&sse_tpl=User_List_Chat&message_id="+id+"&last_id="+last_id);
		//console.log("event source init");
	} else {
		    alert("Your browser doesn't support the livechat system. We recommend upgrading to Google Chrome.");
	}

	livemessages.addEventListener("open", function(e) {
	    //console.log("Connection was opened.");
	}, false);

	livemessages.addEventListener("error", function(e) {
	    //console.log("Error - connection was lost.");
	}, false);
	livemessages.addEventListener("message", function(e) {
	//	   console.log("Message: " + e.data);
		    if (e.data.indexOf('unread|')===0) {
			var unread = e.data.split('|');
			$('.user_chat_sidebar_convo[data-id="'+unread[1]+'"]').addClass('unread');
		    }
		    else {
			$('#user_chat_messages').append(e.data);
			$('#user_chat_messages').scrollTop(10000000);
		    }

	}, false);
}
function userChatReady() {
	if (!$('#user_list_chat').length) {
		return false;
	}
	liveMessages(-1,0);
	$('.user_chat_sidebar_convo').each(function() {
		var $convo = $(this);
		$('.user_chat_recipient',$(this)).each(function() {
			if ($('.user_chat_name',$convo).text().trim()!="") {
				$('.user_chat_name',$convo).text($('.user_chat_name',$convo).text()+',');
			}
			$('.user_chat_name',$convo).text($('.user_chat_name',$convo).text()+' '+$(this).text());
		});
	});
	$('.user_chat_sidebar_convo').click(function() { 
		$('.user_chat_sidebar_convo.current_user_chat').removeClass('current_user_chat');
		$(this).addClass('current_user_chat');
		$(this).removeClass('unread');
		$('#editing_chat').val($(this).data('id'));
		$('#user_chat_messages').html($('.user_chat_messages',$(this)).html());
		$('#user_chat_messages').scrollTop(10000000);
		if ($(this).attr('id')=="user_list_chat_add_chat") {
			liveMessages(-1,0);
			$('#user_chat_type_message textarea').prop('disabled',true);
			$('#user_chat_add_new p').show();
			$('#user_chat_recipient_search').show().focus();

		} else {
			liveMessages($(this).data('id'),$('#user_chat_messages .user_chat_message:last').data('id'));
			$('#user_chat_recipient_search').hide();
			$('#user_chat_type_message textarea').prop('disabled',false);
			$('#user_chat_add_new p').hide();
		}
		$('#user_chat_recipient_list').html($('.user_chat_users',$(this)).html());
		return false;
	});
	$('#user_chat_type_message form').submit(function() {
		if ($('#user_list_chat_add_chat').hasClass('current_user_chat')) {

		} else {
			if ($(this).hasClass('sending')) {
				return false;
			}
			$(this).addClass('sending');
			$(this).ajaxSubmit({success:function() { 
				$('#user_chat_type_message textarea').val('');
				$('#user_chat_type_message form').removeClass('sending');
			}});
			return false;
		}	
	});
	$('#user_chat_add_new').click(function() { 
		$('#user_chat_recipient_search:visible').focus();
	});
	$('#user_chat_user_list a').click(function() {
		$(this).parent().addClass('disabled');
		$('#user_chat_recipient_search').val('').trigger('change');
		
		$('#user_chat_recipient_list').append('<span data-name="'+$(this).data('name')+'" data-id="'+$(this).data('user-id')+'" class="user_chat_recipient">'+$(this).data('name')+'<span>x</span></span>');
		userChatUpdateRecipients();
		$('#user_chat_type_message textarea').prop('disabled',false);
		return false;		
	});
	$('#user_chat_recipient_list').on('click','.user_chat_recipient > span',function() { 
		var toreshow = $(this).parent().data('id');
		$('#user_chat_user_list .user_'+toreshow).removeClass('disabled');
		$(this).parent().remove();
		userChatUpdateRecipients();
		if (!$('#user_chat_recipient_list span').length) {
		$('#user_chat_type_message textarea').prop('disabled',true);
		}
		return false;
	});
	$('#user_chat_recipient_search').on('keydown',function(e) { 
		if (e.keyCode=="8" && $(this).val()=="") {
			var toreshow = $('.user_chat_recipient:last').data('id');
			$('#user_chat_user_list .user_'+toreshow).removeClass('disabled');
			$('.user_chat_recipient:last').remove();	
			userChatUpdateRecipients();
		}
	});
	$('#user_chat_recipient_search').on('keydown',function(e) { 
		if (e.keyCode=="40") { // down
			if ($('.recipient_highlight').next('li:visible').length) {
				$('.recipient_highlight').next('li:visible').addClass('recipient_highlight').prev().removeClass('recipient_highlight');
				e.preventDefault();
				return false;
			}
		}
		if (e.keyCode=="38") { // up
			if ($('.recipient_highlight').prev('li:visible').length) {
				$('.recipient_highlight').prev('li:visible').addClass('recipient_highlight').next().removeClass('recipient_highlight');
				e.preventDefault();
				return false;
			}
		}
		if (e.keyCode=="13") { // up
			$('.recipient_highlight:visible a').trigger('click');
		}
	});
	$('body').on('click',function(e) { 
		if (!$(e.target).parents('#user_chat_add_new').length) {
			$('#user_chat_user_list').hide();
			$('#user_chat_recipient_search').val('');
		}
	});
	$('#user_chat_type_message button').click(function() {
		$(this).parents('form').submit();
		return false;
	});
	$('#user_chat_recipient_search').on('keyup change',function(e) { 
		var s = $(this).val().toLowerCase();
		var show = false;
		$('#user_chat_user_list li').hide().each(function() { 
			if ($(this).data('search').indexOf(s)!=-1&&s.trim()!=""&&!$(this).hasClass('disabled')) {
				$(this).show();	
				show = true;
			}
		});
		if (show) {
			$('#user_chat_user_list').show();
			if (!$('#user_chat_user_list .recipient_highlight:visible').length) {
				$('.recipient_highlight').removeClass('recipient_highlight');
				$('#user_chat_user_list li:visible').first().addClass('recipient_highlight');
			}
		}else {
			$('#user_chat_user_list').hide();
		}
		
	});
}
function anchorCheckLoad() {
		setTimeout(function() { 
		if (window.location.hash){
			var hs = window.location.hash.split('#');
			if (hs[1].indexOf('tab')===0||hs[1].indexOf('map-')===0){
				return false;
			}
			if ($('*[name="'+hs[1]+'"]').length)  {
				var target = $('*[name="'+hs[1]+'"]');
			}
			try {
                         var $element = $(window.location.hash);
                         } catch(error) {
                         return false;
                         }
			if ($(window.location.hash).length) {
				var target = $(window.location.hash);
			}
			if (typeof target != 'undefined') {
				 if ($('#dmt-floating-sub-menu:not(.fixed)').length) {
					  if (typeof  $('#dmt-floating-sub-menu:not(.fixed) .dmt-floating-sub-menu-link:first').data('move-dist') !='undefined'){
							var extra = $('#dmt-floating-sub-menu:not(.fixed) .dmt-floating-sub-menu-link:first').outerHeight() - $('#dmt-floating-sub-menu:not(.fixed) .dmt-floating-sub-menu-link:first').data('move-dist');
					  } else {
							  var extra = $('#dmt-floating-sub-menu:not(.fixed) .dmt-floating-sub-menu-link:first').outerHeight();					  	
					  }

				  } else if ($('body').hasClass("with-fixed-header")) {
					  var extra = $("#header").outerHeight();
				  } else {
					 var extra = 0;
				  }
			  
				$('html, body').animate({
				  scrollTop: target.offset().top - extra
				}, 1500,function(){
				  if ($('#dmt-floating-sub-menu:not(.fixed)').length) {
					  checkFloatingSub();
				  }
									  
				});
			};
		}
		},50);
}
var asyncRunning=false;
function asyncImagesLoad() {
	if (asyncRunning){
		return false;
	}
	asyncRunning=true;
	$(".index-async-load:not(.async-loaded,.async-loading)").each(function(){
		  var rect = $(this)[0].getBoundingClientRect();
		if (((rect['top'] > 0 && rect['top'] < window.innerHeight) ||
			(rect['bottom'] > 0 && rect['bottom'] < window.innerHeight)) &&
			((rect['left'] > 0 && rect['left'] < window.innerWidth) || (rect['right'] > 0 && rect['right'] < window.innerWidth))){
			$(this).addClass("async-loading");

		}
	});
	$(".index-async-load:not(.async-loaded,.async-loading)").eq($(".async-loading:last").index()+1).addClass("async-preload");
	$(".index-async-load:not(.async-loaded,.async-loading)").eq($(".async-loading:last").index()+2).addClass("async-preload");
	$(".index-async-load:not(.async-loaded,.async-loading)").eq($(".async-loading:last").index()+3).addClass("async-preload");
	$(".index-async-load:not(.async-loaded,.async-loading)").eq($(".async-loading:last").index()+4).addClass("async-preload");

	$(".async-loading,.async-preload").each(function(){
			if ($(this).hasClass("src-requested")){
				return true;
			}
			$(this).addClass("src-requested");
			var path = $(this).data("async-src").split("?");
			var w = $(this).parent().innerWidth()*2;
			var $t = $(this);
			$(this).attr("src",path[0]+"?width="+w+"&height=auto").load(function(){
			magicHeights();
			moduleHeights();
			$t.addClass("async-loaded");
			$t.removeClass("async-loading");
			$t.removeClass("async-preload");
			});
	});

	asyncRunning=false;
}
/* Magic Heights */
function magicHeights() {
	/*
	$('.magic-heights:visible').each(function(){
		if ($(this).children().find(".magic-heights-inner:not('.magic-heights-wrap .magic-heights-inner')").length) {
			var $i = $(this).childen().find(".magic-heights-inner:not('.magic-heights-wrap .magic-heights-inner')");
		}else {
			var $i = $(this);
		}
		$i.css('height','auto');
		if ($(this).children().find(".magic-heights-inner2:not('.magic-heights-wrap .magic-heights-inner2')").length) {
			var $i = $(this).childen().find(".magic-heights-inner2:not('.magic-heights-wrap .magic-heights-inner2')");
			$i.css('height','auto');
		}
	});
	*/

	setTimeout(function(){

	var todo = ['.magic-heights-wrap .magic-heights-wrap .magic-heights-wrap:not(".mhdone")','.magic-heights-wrap .magic-heights-wrap:not(".mhdone")','.magic-heights-wrap:not(".mhdone")'];
	var colors = ['#f00','#0f0','#00f'];
	$(".magic-heights-inner,.magic-heights-inner-2,.magic-heights-inner-3,.magic-heights").css("height","auto");
	$(".mhdone").removeClass("mhdone");
	var cc=0;
	todo.forEach(function(str) {
	$(str).each(function(){
	//	$(this).attr('style','border:1px solid '+colors[cc]);
		$('.firstinrow:not(".mhdone .firstinrow")',$(this)).removeClass('firstinrow');
		if ($('.magic-heights:not(".mhdone .magic-heights"):visible',$(this)).length) {
			var ot = $('.magic-heights:not(".mhdone .magic-heights"):visible:first',$(this)).offset().top;
			var count = 0;
			$('.magic-heights:visible:not(".mhdone .magic-heights")',$(this)).each(function(){
				if ($(this).offset().top != ot) {
					return false;
				}
				count++;
			});
			var iteration = 1;
			var h = 0;
			var h2 = 0;
			var h3 = 0;
			$('.magic-heights:not(".mhdone .magic-heights"):visible',$(this)).addClass('notdone').each(function(){
				if ($('.magic-heights-inner:not(".mhdone .magic-heights-inner")',$(this)).length) {
					var $i = $('.magic-heights-inner:not(".mhdone .magic-heights-inner")',$(this));
				}else {
					var $i = $(this);
				}
				if ($i.innerHeight()>h) {
					h = $i.innerHeight();
				}
				if ($('.magic-heights-inner-2:not(".mhdone .magic-heights-inner-2")',$(this)).length) {
					var $i2 = $('.magic-heights-inner-2:not(".mhdone .magic-heights-inner-2")',$(this));
					if ($i2.innerHeight()>h2) {
						h2 = $i2.innerHeight();
					}
				}
				if ($('.magic-heights-inner-3:not(".mhdone .magic-heights-inner-3")',$(this)).length) {
					var $i3 = $('.magic-heights-inner-3:not(".mhdone .magic-heights-inner-3")',$(this));
					if ($i3.innerHeight()>h3) {
						h3 = $i3.innerHeight();
					}
				}
				if (iteration==1) {
					$(this).addClass('firstinrow');
				}
				if (iteration % count == 0) {
					$(this).nextAll('.magic-heights:not(".mhdone .magic-heights"):visible').first().addClass('firstinrow');
					$(this).prevAll('.magic-heights:not(".mhdone .magic-heights"):visible').slice(0,count-1).removeClass('notdone').each(function(){
						if ($(".magic-heights-inner:not('.mhdone .magic-heights-inner')",$(this)).length) {
							var $i = $(".magic-heights-inner:not('.mhdone .magic-heights-inner')",$(this));
						}else {
							var $i = $(this);
						}
						$i.css('height',h+'px');
						if ($(".magic-heights-inner-2:not('.mhdone .magic-heights-inner-2')",$(this)).length) {
							$(".magic-heights-inner-2:not('.mhdone .magic-heights-inner-2')",$(this)).css('height',h2+'px');
						}
						if ($(".magic-heights-inner-3:not('.mhdone .magic-heights-inner-3')",$(this)).length) {
							$(".magic-heights-inner-3:not('.mhdone .magic-heights-inner-3')",$(this)).css('height',h3+'px');
						}
					});
					$(this).removeClass('notdone');
					$i.css('height',h+'px');
					if ($(".magic-heights-inner-2:not('.mhdone .magic-heights-inner-2')",$(this)).length) {
						$(".magic-heights-inner-2:not('.mhdone .magic-heights-inner-2')",$(this)).css('height',h2+'px');
					}
					if ($(".magic-heights-inner-3:not('.mhdone .magic-heights-inner-3')",$(this)).length) {
						$(".magic-heights-inner-3:not('.mhdone .magic-heights-inner-3')",$(this)).css('height',h3+'px');
					}
					h = 0;
					h2 = 0;
					h3 = 0;
				}
				iteration++;	
			});
			iteration = 1;
			h = 0;
			h2 = 0;
			h3 = 0;
			$('.notdone:visible',$(this)).each(function(){
				if ($(".magic-heights-inner:not('.mhdone .magic-heights-inner')",$(this)).length) {
					var $i = $(".magic-heights-inner:not('.mhdone .magic-heights-inner')",$(this));
				}else {
					var $i = $(this);
				}
				if ($i.innerHeight()>h) {
					h = $i.innerHeight();
				}
				if ($(".magic-heights-inner-2:not('.mhdone .magic-heights-inner-2')",$(this)).length) {
					var $i2 = $(".magic-heights-inner-2:not('.mhdone .magic-heights-inner-2')",$(this));
					if ($i2.innerHeight()>h2) {
						h2 = $i2.innerHeight();
					}
				}
				if ($(".magic-heights-inner-3:not('.mhdone .magic-heights-inner-3')",$(this)).length) {
					var $i3 = $(".magic-heights-inner-3:not('.mhdone .magic-heights-inner-3')",$(this));
					if ($i3.innerHeight()>h3) {
						h3 = $i3.innerHeight();
					}
				}
				iteration++;	
			});
			$('.notdone:visible',$(this)).each(function(){
				if ($(".magic-heights-inner:not('.mhdone .magic-heights-inner')",$(this)).length) {
					var $i = $(".magic-heights-inner:not('.mhdone .magic-heights-inner')",$(this));
				}else {
					var $i = $(this);
				}
				$i.css('height',h+'px');
				if ($(".magic-heights-inner-2:not('.mhdone .magic-heights-inner-2')",$(this)).length) {
					$(".magic-heights-inner-2:not('.mhdone .magic-heights-inner-2')",$(this)).css('height',h2+'px');
				}
				if ($(".magic-heights-inner-3:not('.mhdone .magic-heights-inner-3')",$(this)).length) {
					$(".magic-heights-inner-3:not('.mhdone .magic-heights-inner-3')",$(this)).css('height',h3+'px');
				}
				$(this).removeClass('notdone');
			});
		}
		$(this).addClass("mhdone");
	});
		cc++;
	});
	},50);
}
/* Folder icons */

function foldericons() {
	$(".folder-item").css("height","auto");
	var h = 0;
	$(".folder-style-grid .folder-item").each(function(){
		if ($(this).innerHeight()>h) {
			h=$(this).innerHeight();
		}
	});
	$(".folder-style-grid .folder-item").css("height",h+"px");
}

function walthroughReady() {
	$("h1,h2,h3,h4,p,li,h1 a,h2 a,h3 a,h4 a,p a,li a,.disclosure-reveal",$(".prevent-orphans .content")).each(function(){
		if ($(this).width()>200) {
 			if ($(this).children().length==0) {
 				$(this).html($(this).text().replace(/ (?=[^ ]*$)/i, "&nbsp;"));
 			}
		}
	});
	$(".walkthrough_checkbox").each(function(){
		var nth = $(this).prevAll(".walkthrough_checkbox").length;
		var uid = hex_hmac_sha1($(this).text()+nth,window.location.pathname);
		$(this).data('uid',uid);
		if (readCookie('checkbox'+uid)) {
			$(this).addClass("checked");
		}
	});
	
	$(".walkthrough_reset a").click(function(){
		$(".walkthrough_checkbox.checked").trigger("click")
		return false;
	});
	$(".walkthrough_checkbox").click(function(){
		if ($(this).hasClass("checked")) {
			$(this).removeClass("checked");
			eraseCookie("checkbox"+$(this).data('uid'));
		} else {
			$(this).addClass("checked");
			createCookie('checkbox'+$(this).data('uid'),true,0);
		}
		return false;
	});
}
function avatarReady() {
	$('#user_avatar').click(function(){
		if ($("#change_avatar:visible").length) {
			$("#change_avatar").slideUp(50,function(){moduleHeights();});
		} else {
			$("#change_avatar").slideDown(50,function(){moduleHeights();});
		}
	});
	$('#change_bio_button').click(function(){
		if ($("#change_bio:visible").length) {
			$("#change_bio").slideUp(50,function(){moduleHeights();});
		} else {
			$("#change_bio").slideDown(50,function(){moduleHeights();});
		}
		return false;
	});
	$(".inputFile").on("change",function(){
		if ($(this).val()!="") {
			
			var theSplit = $(this).val().split('\\');
	        $("#filelabel_"+$(this).attr("id")).text( theSplit[theSplit.length-1]);
		}

		       

	})
};
function accessibleReady() {
	$(".accessible-mode .form:not(#paymentGatewayForm.form) .hide_if_no_js").hide();
	$(".accessible-mode .form:not(#paymentGatewayForm.form) .contact-form-hide-with-js").show();
	$("select[name=chb_sh]").change(function(){
		$(this).parents("form").submit();
	});
	/*
	$("input[name=gateway]").change(function(){
		$(this).parents("form").submit();
	});
	$("input[name=agree_terms]").change(function(){
		$(this).parents("form").submit();
	});
	$("input[name=add_to_list]").change(function(){
		$(this).parents("form").submit();
	});
	*/
	
	$("#header .row").each(function(){
		$(this).waitForImages(function(){
			if (window.fontsloaded&&!$(this).hasClass('jsLoaded')){
		//	if (!$(this).hasClass('jsLoaded')){
				flexiBreak();
				$("#header .row:not('.flexibreak-big')").addClass("jsLoaded");
			}
		});
	});
	$("#footer .row").each(function(){
		$(this).waitForImages(function(){
			if (window.fontsloaded&&!$(this).hasClass('jsLoaded')){
			//if (!$(this).hasClass('jsLoaded')){
				flexiBreak();
				$("#footer .row:not('.flexibreak-big')").addClass("jsLoaded");
			}
		});
	});
	$(".nav li").mouseleave(function(){
		clearTimeout(hidingPagePreview);

		hidingPagePreview = setTimeout(function () {
			$(".hover-preview").removeClass('hover-preview');
			$(".page-preview").fadeOut(100);				
		}, 50);

	});
	$(".nav li").mouseover(function(){
		clearTimeout(hidingPagePreview);
		if ($(this).hasClass('show-preview')) {
			var mw = $(this).width();
			var left = $(this).offset().left-$(this).parents(".row").offset().left;
			var w = $("#page-preview-id-"+$(this).data('page-id')+"").show().css({"visibility":"hidden","width":"auto","position":"relative"}).find('.page-preview-inner').css("float","left").outerWidth();
			var space= $(this).parents(".row").width();
			
			if (left+w > space) {
				if (w > space) {
					// need to move to left and shrink
					left = 0;
					w = space;
				} else {
					
					// just need to move left
					var diff = (left+w) - space;
					left = left - diff;
				}
			}
			$(this).addClass('hover-preview');
			if ($(".page-preview:visible").length) {
				$(".page-preview").hide();

				$("#page-preview-id-"+$(this).data('page-id')).css("visibility","visible").css("min-width",mw+"px").css("width",w+"px").css("position","absolute").css("left",left+"px").show().find('.page-preview-inner').css("float","none");
			} else {
				$("#page-preview-id-"+$(this).data('page-id')).css("visibility","visible").css("min-width",mw+"px").css("width",w+"px").css("position","absolute").css("left",left+"px").fadeIn(100).find('.page-preview-inner').css("float","none");
			}

		} else {
			$(".hover-preview").removeClass('hover-preview');
			$(".nav li.hover-preview").removeClass("hover-preview");
			$(".page-preview").fadeOut(100);				
		}
	});

	$(".page-preview").mouseleave(function(){
		$(".hover-preview").removeClass('hover-preview');
		$(this).fadeOut(100);
	});

	$(".page-preview").mouseover(function(){
		clearTimeout(hidingPagePreview);
	});
	
	$(".Smaller").wrapInner("<span class=\"smallerWrap\"></span>")
	$(".Much_Smaller").wrapInner("<span class=\"muchSmallerWrap\"></span>")
	$(".Bigger").wrapInner("<span class=\"biggerWrap\"></span>")
	$(".Much_Bigger").wrapInner("<span class=\"muchBiggerWrap\"></span>")
	if (!$('body').hasClass("accessible-mode")){
		$('a[href*="#"]:not([href="#cookies"],[href="#"],[href="#navSearch"]),#backToTop').unbind().click(function() {

			if (location.pathname.replace(/^\//,'') == this.pathname.replace(/^\//,'') && location.hostname == this.hostname) {

			  var target = $(this.hash);
			  target = target.length ? target : $('*[name="' + this.hash.slice(1) +'"]');
			  if ($(this).attr("id")=="backToTop") {
				  var target = $("body");
			  }
			  if (target.length) {
				  if ($('#dmt-floating-sub-menu:not(.fixed)').length) {
					  if (typeof  $('#dmt-floating-sub-menu:not(.fixed) .dmt-floating-sub-menu-link:first').data('move-dist') !='undefined'){
							var extra = $('#dmt-floating-sub-menu:not(.fixed) .dmt-floating-sub-menu-link:first').outerHeight() - $('#dmt-floating-sub-menu:not(.fixed) .dmt-floating-sub-menu-link:first').data('move-dist');
					  } else {
							  var extra = $('#dmt-floating-sub-menu:not(.fixed) .dmt-floating-sub-menu-link:first').outerHeight();					  	
					  }

				  } else if ($('body').hasClass("with-fixed-header")) {
					  var extra = $("#header").outerHeight();
				  } else {
					 var extra = 0;
				  }
			  
				$('html, body').animate({
				  scrollTop: target.offset().top - extra
				}, 1500,function(){
				  if ($('#dmt-floating-sub-menu:not(.fixed)').length) {
					  checkFloatingSub();
				  }
									  
				});
				return false;
			  }
			}
		  });
	}

	parallaxScroll();
	
	if ($(window).width()<768) {
		$("body").addClass("mobile-header-enabled");
		$("#mobile-menu-page-wrap").css("height",$("#mobileheader").height()-"px");
		if ($(".mobile-header-icon").length>4){
		$("body").addClass("mobile-header-many");
		}
		$("#header .row,#footer .row").addClass("jsLoaded");
	}else{
		$("body").addClass("js");
		$("body").addClass("prepping");
	}


	$("body").removeClass("prepping");

	$(".column").each(function(){
		if ($(this).text().trim()==""&&!$(this).children().length) {
			$(this).addClass("empty-column");
		}
	});

	$(".mobile-menu a").click(function(){
		var $this = $(this);

		if (!$(this).parents(".flexibreak-small").length&&!$(this).parents('#mobileheader').length) {
			$this = $("#"+$(".module.nav").parent().data("flexibreak-small")).find(".mobile-menu a");
			var i = $this.parents(".flexibreak-small").attr("id");
			var $orig = $("*[data-flexibreak-small=\""+i+"\"]");
		}
		else {
			var $orig = $('#header .nav').parent();
		}
		if (!$this.parents(".mobile-menu").hasClass("style") || $this.parents(".mobile-menu").hasClass("style-append")) {
			if (!$("#mobile-menu-auto").length) {
				$this.parents(".row").after('<section class="row jsLoaded mobile-menu-row"><ul id="mobile-menu-auto" class="hidden"></ul></section>');
				var $target = $("#mobile-menu-auto");
				$(".nav > ul",$orig).children(":not(#nav-logo,#nav-search)").each(function(){
					if (!$(".mobile-header-icon a[href='"+$("a",$(this)).attr("href")+"']").length){
					$target.append($(this).clone());
					}
				});
				if ($(".nav > ul #nav-search.nav-search-first",$orig).length&&$("body").hasClass("with-mobile-header")) {
					$target.prepend($("#search-form-popdown form").clone());
				}
				if ($(".nav > ul #nav-search.nav-search-last",$orig).length&&$("body").hasClass("with-mobile-header")) {
					$target.append($("#search-form-popdown form").clone());
				}
				$target.find("> li > a").removeAttr("style");
			} else {
				var $target = $("#mobile-menu-auto");
			}
			setTimeout(function () {
				if ($target.hasClass("hidden")) {
					$target.removeClass("hidden");
				} else {
					$target.addClass("hidden");
				}
			}, 0);
		}
		if ($this.parents(".mobile-menu").hasClass("style-reveal-left")||$this.parents(".mobile-menu").hasClass("style-reveal-right")) {
			var revealDirection = ($this.parents(".mobile-menu").hasClass("style-reveal-left")?"left":"right");
			if (!$("#mobile-menu-behind").length) {
				$("body").addClass("mobile-menu-position-"+revealDirection);
				$("body").wrapInner('<div id="mobile-menu-page-wrap"></div>');

				$("#editInCMS").appendTo("body");
				$("#mobile-menu-page-wrap").prepend($("#mobileheader"));
				$("#mobile-menu-page-wrap,#mobilemenu").click(function(){
					$("body").removeClass("mobile-menu-revealing-left mobile-menu-revealing-right");
					setTimeout(function () {
						$("body").removeClass("mobile-menu-animating-"+revealDirection);
					}, 700);
				});
				if (typeof turnstile != "undefined" && $(".cf-turnstile").length) {
					turnstile.reset();
				}
				checkMobileMenuHeights();
				var below_nav_append="";
				if ($("#below_nav_append").length){
				below_nav_append='<div id="below_mobile_nav">'+$("#below_nav_append").html()+"</div>";
				}
				$("body").prepend('<div id="mobile-menu-behind"><ul></ul>'+below_nav_append+'</div>');
				var $target = $("#mobile-menu-behind ul");
				$(".nav > ul",$orig).children(":not(#nav-logo,#nav-search)").each(function(){
					//if (!$(".mobile-header-icon a[href='"+$("a",$(this)).attr("href")+"']").length){
					$target.append($(this).clone());
					//}
				});
				if ($(".nav > ul #nav-search.nav-search-first",$orig).length&&$("body").hasClass("with-mobile-header")) {
					$target.prepend($("#search-form-popdown form").clone());
				}
				if ($(".nav > ul #nav-search.nav-search-last",$orig).length&&$("body").hasClass("with-mobile-header")) {
					$target.append($("#search-form-popdown form").clone());
				}
				
				$target.find("> li > a").removeAttr("style");
			}
			setTimeout(function () {

				$("body").addClass("mobile-menu-animating-"+revealDirection+" mobile-menu-revealing-"+revealDirection);

			}, 10);
			$(".showSubMenu").remove();
			$("#mobile-menu-behind ul ul").each(function(){
				$(this).parent().addClass("withHiddenNav").append("<div class='showSubMenu'></div>");
			});
			$(".showSubMenu").click(function(){
				$(this).parent().toggleClass("showingSubMenu");
				return false;
			});
		}
		return false;
	});

	$("*[data-scroll-decay]").each(function(){
		$(this).addClass("parallax");
	});
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
		
		if ($(this).val()=="") {
			$('.out-of-stock',$(this).parents(".addToBasketForm")).hide();
			$('.submit_form',$(this).parents(".addToBasketForm")).hide();
		} else {
			$('.out-of-stock',$(this).parents(".addToBasketForm")).show();
			$('.submit_form',$(this).parents(".addToBasketForm")).show();
		}
	});
	imageMarginHelper();
	
	$(".submit_form a").click(function(){
		$(this).parents("form").find(".autosavingFlag").remove();
		return false;
	});
	
	formStyleHelper();
	$(".Circular.bpe_image").each(function() {
		if (!$(this).find('.circularwrap').length) { $(this).wrapInner('<span class="circularwrap"></span>'); }
	});
	
	$(".bpe_image").each(function(){
		if (typeof $("img",$(this)).attr("alt") != 'undefined' && typeof $('img',$(this)).attr("title") == 'undefined') {
			if (typeof $("img",$(this)).attr("title") == 'undefined') {
				$("img",$(this)).attr("title",$("img",$(this)).attr("alt"));
			}
		}
	});
	$(".Caption,.Heavy_Border_Caption,.Light_Border_Caption,.Caption_Below_Image,.intranet_pic_big,.intranet_pic_small").each(function(){
		if (typeof $("img",$(this)).attr("title") != 'undefined') {
			var text = $("img",$(this)).attr("title");
			if (text.indexOf('[caption:')!=-1) {
				var texts = text.split("[caption:");
				var captions  = texts[1].split("]");
				caption  = captions[0].trim();
				text = caption.split("||");
				var alt = captions[1].trim();
				$("img",$(this)).attr("alt",alt);
			} else {
				var alt = text;
				text = text.split("||");
				var caption = alt;
			}
			var newString = "";
			for (var i=0; i < text.length; i++) {
				if (i==0) {
					newString = "<strong>"+text[i]+"</strong>";
				} else {
					newString = newString+"<br/>"+text[i];
				}
			};
			$(this).addClass("clearfix");
			if ($("a",$(this)).length) {
				$("a",$(this)).wrapInner("<div class='captionWrap'></div>");
			} else {
				$(this).wrapInner("<div class='captionWrap'></div>");
			}
			$(".captionWrap",$(this)).append('<span class="caption">'+newString+'</span>');
		
			if ($("a",$(this)).length) {
				$("a",$(this)).attr("title",caption);
			}
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
		return false;
	});


};


/* Frills mode */
var frillinterval= 0;
var clearfrillsinterval;
function frillsReady(){

	if ($("body").hasClass("frills_load")){
	setTimeout(function(){
	$("body").addClass("frills");

		setTimeout(function(){
			$("body").removeClass("frills_load");
			frillsScroll();
		},10);
	},500);
	}
}
function frillsScroll() {
	var $frills = $("h1:not(.column h1),h2:not(.column h2),.bpe_image:not(.column .bpe_image),.column");
	var bottomedge =  $(window).scrollTop() + $(window).height() - 20;
	$frills.each(function(){
		if (!$(this).hasClass("frills_showing") && $(this).offset().top < bottomedge) {
			$(this).addClass("frills_showing");
			var $t = $(this);
			setTimeout(function(){
				$t.addClass("frills_shown");
			},frillinterval);
			frillinterval = frillinterval+200;
			
		}
	});
	clearfrillsinterval = setTimeout(function(){
		frillinterval= 0;
	},1000);

};
/* Sticky Sidebar */

function stickyReady() {
	$(".sticky-column-sidebar").parents('.container').addClass("with-sticky");
	$(".sticky-column-sidebar").height($(".sticky-sidebar-inner").outerHeight()+"px");
};
function stickyLoad() {
	$(".sticky-column-sidebar").height($(".sticky-sidebar-inner").outerHeight()+"px");
};
/* Popup Message */

function popupReady() {
	var popuphash = hex_sha1($('#popupMessageBox').html()+"");
	if($('#popupMessageBox.autoshow').length && !$("body").hasClass("accessible-mode")) {
		$('#popupMessageBox.autoshow').each(function(){
			if ($(this).data('html')===undefined){
			 $(this).data('html',$(this).html());
			 $(this).html('');
			}
		});

		var delay = $("body").data("popup-delay");

		if (!readCookie('seenPopupMessage'+popuphash)) {

			setTimeout(function () {
				var message= $($("#popupMessageBox.autoshow").data('html')); 
				$('body').append('<div id="popupMessageBoxPopup" title="Important Information"><div id="popupMessageBoxPopupCenter"><div id="popupMessageBoxPopupBox"><div id="closePopupBox"></div><div></div></div></div></div>');
				message.appendTo($("#popupMessageBoxPopup > div > div"));
				setTimeout(function(){
					$("#popupMessageBoxPopup .submit_form a").click(function(){
						$(this).parents("form").find(".autosavingFlag").remove();
						$(this).parents("form").submit();
						return false;
					});
					$("#popupMessageBoxPopup .g-recaptchaload").each(function() {
					    var object = $(this);
					    var rid = grecaptcha.render(object.attr("id"), {
						"sitekey" :$(this).data("sitekey"),
						"callback" : function(token) {
						    object.parents('form').find(".g-recaptcha-response").val(token);
							invisRecaptcha(token);
						}
					    });
						$(this).parents('form').attr('recapid',rid);
					});
					 $("#popupMessageBoxPopup .cf-turnstile").each(function() {
					      var object = $(this);
					      var rid = turnstile.render("#"+object.attr("id"), {
						  "sitekey" :$(this).data("sitekey"),
						  "callback" : function(token) {
						      object.parents('form').append("<input type='hidden' name='cf-turntstile-response' value='"+     token+"'/>");
						  }
					      });
						  $(this).parents('form').attr('recapid',rid);
					  });
					bindForms();
				},100);
			}, delay);

			
		}
	}
	$("body").on("click","#closePopupBox",function(){

		if (!$("#popupMessageBoxPopup").hasClass("fromlink")) {
		createCookie('seenPopupMessage'+popuphash,true,0);
		}

		
		$("#popupMessageBoxPopup").fadeOut();
		setTimeout(function () {
		$("#popupMessageBoxPopup").remove();			
		}, 300);
	});
	$('.popupMessageOnClickContent').each(function(){
		if ($(this).data('html')===undefined){
		$(this).data('html',$(this).html());
		$(this).html('');
		}
	});
	$(".popupMessageOnClick a").unbind("click").click(function(){
		var message= $($(this).parents(".popupMessageOnClick").next('.popupMessageOnClickContent').data('html')); 
		$('body').append('<div id="popupMessageBoxPopup" class="fromlink" title="Important Information"><div id="popupMessageBoxPopupCenter"><div id="popupMessageBoxPopupBox"><div id="closePopupBox"></div><div id="popupMessageContents"></div></div></div></div>');
		message.appendTo($("#popupMessageContents"));
		setTimeout(function(){
			$("#popupMessageContents .submit_form a").click(function(){
				$(this).parents("form").find(".autosavingFlag").remove();
				$(this).parents("form").submit();
				return false;
			});
			$("#popupMessageContents .g-recaptchaload").each(function() {
			    var object = $(this);
			    var rid = grecaptcha.render(object.attr("id"), {
				"sitekey" :$(this).data("sitekey"),
				"callback" : function(token) {
				    object.parents('form').find(".g-recaptcha-response").val(token);
					invisRecaptcha(token);
				}
			    });
				$(this).parents('form').attr('recapid',rid);
			});
			 $("#popupMessageContents .cf-turnstile").each(function() {
			      var object = $(this);
			      var rid = turnstile.render("#"+object.attr("id"), {
				  "sitekey" :$(this).data("sitekey"),
				  "callback" : function(token) {
				      object.parents('form').append("<input type='hidden' name='cf-turntstile-response' value='"+     token+"'/>");
				  }
			      });
				  $(this).parents('form').attr('recapid',rid);
			  });
			bindForms();
		},100);
		return false;
	});

};
/* Filter subpage index
*/
function filterReady() {
	$("#subPageIndexProducts").each(function(){
		var attributes = {};
		$(".productMeta",$(this)).each(function(){
			var $product = $(this).parent();
			if ($(this).text().trim()!="") {

			var metaString = $(this).text().split(",");

			for (var i = metaString.length - 1; i >= 0; i--){
				var metaName = metaString[i].split(":")[0].trim();
				var metaVal = metaString[i].split(":")[1].trim().split("||");
				

				if (metaName in attributes) {

					for (var y = 0; y < metaVal.length; y++) {
						$product.addClass("attr_"+metaName.replace(/[^a-zA-Z0-9]+/g,'')+"_"+metaVal[y].replace(/[^a-zA-Z0-9]+/g,''));
						if ($.inArray(metaVal[y], attributes[metaName])===-1) {
							attributes[metaName].push(metaVal[y]);
						}
					}
				

				} else {

					attributes[metaName] = new Array();		
					for (var y = 0; y < metaVal.length; y++) {
						$product.addClass("attr_"+metaName.replace(/[^a-zA-Z0-9]+/g,'')+"_"+metaVal[y].replace(/[^a-zA-Z0-9]+/g,''));
						attributes[metaName].push(metaVal[y]);
					}

				}
			}
		
			}
			
		});

		for (var property in attributes) {

			var filter = "<div><strong>"+property+"</strong><br/><select name='"+property.replace(/[^a-zA-Z0-9]+/g,'')+"' class='filterMenu'><option value=''>All</option>";

			for (var i=0; i < attributes[property].length; i++) {
				filter += "<option value='"+attributes[property][i].replace(/[^a-zA-Z0-9]+/g,'')+"'>"+attributes[property][i]+"</option>";
			};
			
			filter += "</select></div>";
			
			$("#subPageIndexProducts #filterBox").prepend(filter);
			
		}
		$(".filterMenu").change(function(){
			var needsClasses = "";
			$(".subPageProducts").hide();
			$(".filterMenu").each(function(){
				if ($(this).val()!="") {
					needsClasses += ".attr_"+$(this).attr("name")+"_"+$(this).val();
				}				
			});
			
			if (needsClasses=="") {
				$(".subPageProducts").show();
			} else {
				$(needsClasses).show();				
			}
			magicHeights();

		});
	});
	setTimeout(function () {
		if (window.location.href){
			if (window.location.hash.indexOf("#filter")===0) {
				var preselect = window.location.hash.split("#filter-");
				var string = preselect[1].split(":");
				var option = string[0];
				var value = string[1]
				if (option && value) {
					$(".filterMenu[name=\""+option+"\"]").val(value).trigger("change");
					$("#filterBox .filterRadio[name=\""+option+"\"][value=\""+value+"\"]").prop("checked",true);
				
				}
			}
		}
	}, 590);

};
/*
	Floating Sub Menu
*/	
	function checkFloatingSub() {
		if ($("#dmt-floating-sub-menu").length==0) {
			return false;
		}
		var $el = $("#dmt-floating-sub-menu:not(.fixed)");
		$el.removeClass('mobile');
		if ($("#dmt-floating-sub-menu:not(.fixed) a").length > 2 && $(window).width()<480) {
			$el.addClass('mobile');
		}
		if ($("#dmt-floating-sub-menu:not(.fixed) a").length > 3 && $(window).width()<540) {
			$el.addClass('mobile');
		}
		if ($("#dmt-floating-sub-menu:not(.fixed) a").length > 4 && $(window).width()<600) {
			$el.addClass('mobile');
		}
		if ($("#dmt-floating-sub-menu:not(.fixed) a").length > 5 && $(window).width()<700) {
			$el.addClass('mobile');
		}
		if ($("#dmt-floating-sub-menu:not(.fixed) a").length > 6 && $(window).width()<750) {
			$el.addClass('mobile');
		}
		if ($("#dmt-floating-sub-menu:not(.fixed) a").length > 7 && $(window).width()<800) {
			$el.addClass('mobile');
		}
		if ($el.offset().top + $el.outerHeight() < window.pageYOffset) {
			if (!$("#dmt-floating-sub-menu.fixed").length) {
				var l = $el.offset().left;
				$("body").append($el.clone(true).addClass("fixed").css("left",l+"px"));
				if ($el.hasClass('mobile')) {
					$("#submenu").remove();
					$el.prepend("<div id='submenu'></div>")
					$("#dmt-floating-sub-menu.fixed a").remove();
					$("#dmt-floating-sub-menu.fixed").append("<div class='mobile-menu'><p><a href=\"#submenu\">Menu</a></p></div>");
				} else {
					$("#dmt-floating-sub-menu.fixed .dmt-floating-sub-menu-link").each(function(){
						if (typeof $(this).data("move-dist")!="undefined") {
							$(this).css("top","-"+$(this).data("move-dist")+'px').css("margin-bottom","-"+$(this).data("move-dist")+'px');
						}
					});
					$("#dmt-floating-sub-menu.fixed .dmt-floating-sub-menu-link").hover(function(){
						$(this).css("top","0px");
					},function(){
						$(this).css("top","-"+$(this).data("move-dist")+'px');
					});
					
				}
				
				$('a[href*="#"]:not([href="#"],[href="#navSearch"])',$('#dmt-floating-sub-menu.fixed')).unbind('click').click(function() {

				    if (location.pathname.replace(/^\//,'') == this.pathname.replace(/^\//,'') && location.hostname == this.hostname) {
				      var target = $(this.hash);
				      target = target.length ? target : $('*[name="' + this.hash.slice(1) +'"]');
				      if (target.length) {

				       
							if (typeof $(this).data("move-dist") != "undefined") {
								 $('html, body').animate({
						          scrollTop: target.offset().top - $(this).outerHeight() + $(this).data("move-dist")
								  }, 1500);
							} else {
								 $('html, body').animate({
						          scrollTop: target.offset().top - $(this).outerHeight()
								 }, 1500);
							}

				       
				        return false;
				      }
				    }
				  });
				  
				setTimeout(function () {
				$("#dmt-floating-sub-menu.fixed").addClass("visible");
				}, 10);
			}
		
		} 
		if ($el.offset().top  > window.pageYOffset -$el.outerHeight()) {
			$("#dmt-floating-sub-menu.fixed").removeClass("visible");
			setTimeout(function () {
				$("#dmt-floating-sub-menu.fixed").remove();
			}, 500);
			
		}
		

	}	
	function floatingScroll() {
		if ($("#dmt-floating-sub-menu:not(.fixed)").length) {
			checkFloatingSub();
		}
	};
	function floatingReady() {
		var $el = $("#dmt-floating-sub-menu:not(.fixed)");
		$el.css("width",$el.width());
	};
	function floatingResize() {
		$("#dmt-floating-sub-menu.fixed").remove();
		
		var $el = $("#dmt-floating-sub-menu:not(.fixed)");
		$el.removeAttr('style');
		$el.css("width",$el.outerWidth());
		checkFloatingSub();
		addFloatingSubHeights();
	};
	function addFloatingSubHeights() {
		var $el = $("#dmt-floating-sub-menu:not(.fixed)");
		$(".dmt-floating-sub-menu-link",$el).each(function(){
			if ($(".bpe_image",$(this)).length) {

				var h = $(".bpe_image",$(this)).outerHeight();

				$(this).data('move-dist',h);
			}
		});
	}
	function floatingLoad() {
		addFloatingSubHeights();
		
	};

/*
	Product images
*/
	function imagesReady() {
		if ($("#main .bpe_image").length) {
			var pagepicenc = encodeURIComponent($("#main .bpe_image:first").find("img").attr('src'));
			var pagepic = $("#main .bpe_image:first").find("img").attr('src');
		} else {
			var pagepic=false;
		}

		
		$(".addToBasketForm").each(function(){
			if (pagepic) {
				if (!$("input[name=pic_url]",$(this)).length) {
					$(this).append('<input type="hidden" name="pic_url" value="'+pagepic+'"/>');
				}				
			}
			if (!$("input[name=url_str]",$(this)).length) {
				$(this).append('<input type="hidden" name="url_str" value="'+window.location.pathname+'"/>');
			}
		});
		$(".addToBasketLink").each(function(){
			if (pagepic) {
				if ($(this).attr('href').indexOf("pic_url")==-1) {
					$(this).attr('href',$(this).attr('href')+'&pic_url='+pagepicenc);
				}
				
			}
			if ($(this).attr('href').indexOf("url_str")==-1) {
				$(this).attr('href',$(this).attr('href')+'&url_str='+encodeURIComponent(window.location.pathname));
			}
		});
		$(".column_row").each(function(){
			if ($("input[name=pic_url]",$(this)).length==1 && $("img",$(this)).length) {
				$("input[name=pic_url]",$(this)).val($("img",$(this)).first().attr('src'));
			}
			if ($(".addToBasketLink",$(this)).length==1 && $("img",$(this)).length) {
				var urlparts = $(".addToBasketLink",$(this)).attr('href').split("?");

				var query_parts = urlparts[1].split('&');
				var newquery="";
				for (var i = 0; i < query_parts.length; i++) {
					if (newquery!="") {
						newquery+="&";
					}
					if (query_parts[i].indexOf("pic_url=")===0) {
						var imgurl = $("img",$(this)).first().attr('src').split("?");
						newquery+="pic_url="+encodeURIComponent(imgurl[0]);
					} else {
						newquery+=query_parts[i];
					}

				}

				$(".addToBasketLink",$(this)).attr('href',urlparts[0]+"?"+newquery);
			}

		});
		$(".column").each(function(){
			if ($("input[name=pic_url]",$(this)).length==1 && $("img",$(this)).length) {
				$("input[name=pic_url]",$(this)).val($("img",$(this)).first().attr('src'));
			}
			if ($(".addToBasketLink",$(this)).length==1 && $("img",$(this)).length) {
				var urlparts = $(".addToBasketLink",$(this)).attr('href').split("?");

				var query_parts = urlparts[1].split('&');
				var newquery="";
				for (var i = 0; i < query_parts.length; i++) {
					if (newquery!="") {
						newquery+="&";
					}
					if (query_parts[i].indexOf("pic_url=")===0) {
						var imgurl = $("img",$(this)).first().attr('src').split("?");
						newquery+="pic_url="+encodeURIComponent(imgurl[0]);
					} else {
						newquery+=query_parts[i];
					}

				}

				$(".addToBasketLink",$(this)).attr('href',urlparts[0]+"?"+newquery);
			}
			
		});
	};
/*
	Icon text
*/
	function fixIconLinks(c) {
		$("."+c).each(function(){		
			if ($(">a",$(this)).length) {
				if ($(">a",$(this)).text()==$(this).text()) {
					$(">a",$(this)).addClass(c);
					$(this).removeClass(c);
				}
			}
		});
	}
	function iconsReady() {
		var icons = new Array();
		icons.push("Icon_Phone");
		icons.push("Icon_Tick");
		icons.push("Icon_Info");
		icons.push("Icon_Question");
		icons.push("Icon_Alert");
		icons.push("Icon_Email");
		icons.push("Icon_Home");
		icons.push("Icon_Livechat");
		
		for (var i = 0; i < icons.length; i++) {
			fixIconLinks(icons[i]);
		}
	};
/*
	Hover Image
*/
	function hoverImageReady() {
		if (!$('body').hasClass("accessible-mode")){
			$(".Hover_Image_Button").each(function(){
				$("a",$(this)).append("<div class='cms_hover_image_hover'><img srcset='"+$(this).data('hover-srcset')+"' src='"+$(this).data('hover-src')+"'/></div>");
			});
		}
	};
/*

	#Popup Video

*/
var mpytplayer;
function insertYT() {
	if (window.consent.functional){
		var mpplayer_tag = document.createElement('script');
		mpplayer_tag.src = "https://www.youtube.com/iframe_api";
	    var firstScriptTag = document.getElementsByTagName('script')[0];
	    firstScriptTag.parentNode.insertBefore(mpplayer_tag, firstScriptTag);
	}
}
	function showMPPopup(src,desc) {
		$("#mp_lightbox_outer").removeClass("ytvidmp");
		
		$("#mp_lightbox_inner,#mp_lightbox_outer_outer").removeAttr("style");
		if (src.substr(src.length - 4).toLowerCase()==".png"
			|| src.substr(src.length - 4).toLowerCase()==".jpg"
			|| src.substr(src.length - 5).toLowerCase()==".jpeg"
			|| src.substr(src.length - 4).toLowerCase()==".gif"
			|| src.substr(src.length - 5).toLowerCase()==".apng"
		) {
			
			var img = new Image();
			img.onload = function() {
				$("#mp_lightbox_outer").fadeIn();
				
				var r = this.height/this.width*100;
				$("#mp_lightbox_inner").css("padding-bottom",r+"%");
				$("#mp_lighbox_content").data("ratio",r);
				$("#mp_lightbox_outer_outer").data("maxw",this.width).css("width",this.width+"px");
				if ($("#mp_lighbox_content").height()+100>$(window).height()) {
					var nw = ($(window).height()-100) / (r/100);
					$("#mp_lightbox_outer_outer").css("width",nw+"px");
				}
				
				$("#mp_lighbox_content").html("<img src='"+src+"' style=\"width:100%\"/>");
				if (desc!="") {
				$("#mp_lighbox_content").append('<div class="mpPopupDescOuter"><div class="mpPopupDesc">'+desc+'</div></div>');					
				}

			}
			img.src = src;
		}
		if (src.substr(src.length - 4).toLowerCase()==".mov"||src.substr(src.length - 4).toLowerCase()==".mp4") {
			
			$("#mp_lightbox_outer").fadeIn();
			
			$("#mp_lightbox_inner").css("padding-bottom","56.25%");
			$("#mp_lightbox_outer_outer").css("width","1800px");
			if ($("#mp_lighbox_content").height()+100>$(window).height()) {
				var nw = ($(window).height()-100) / (56.25/100);
				$("#mp_lightbox_outer_outer").css("width",nw+"px");
			}
			
			
			var width = $("#mp_lighbox_content").width();
			var height = $("#mp_lighbox_content").height();
			var video = src;
			$("#mp_lighbox_content").html("<div id=\"videoMPPopup\" class='jplayerInit' data-poster='/graphics/play.jpg' data-vid='"+video+"'>"+playerHTML+"</div>");
			makeVideo("videoMPPopup",width,height,"/graphics/play.jpg",video,true,false);
		}

		if (src.substr(0,23)=="https://www.youtube.com" || src.substr(0,22)=="http://www.youtube.com") {
			src = src.replace("/shorts/","/embed/");
			src = src.replace("/watch?v=","/embed/");
			src = src.split("/embed/");
			src = src[1];
			$("#mp_lightbox_outer").fadeIn().addClass("ytvidmp");
			
			$("#mp_lightbox_inner").css("padding-bottom","56.25%");
			$("#mp_lightbox_outer_outer").css("width","1800px");
			if ($("#mp_lighbox_content").height()+100>$(window).height()) {
				var nw = ($(window).height()-100) / (56.25/100);
				$("#mp_lightbox_outer_outer").css("width",nw+"px");
			}
			
			
			var width = $("#mp_lighbox_content").width();
			var height = $("#mp_lighbox_content").height();
			$("#mp_lighbox_content").html("<div id='mppopupytplayer'></div>");
			
			mpytplayer = new YT.Player('mppopupytplayer', {
			          height: "100%",
			          width: "100%",
			          videoId: src,
				  playerVars: {autoplay:1,rel:0}
			        });

		}

	}
	function mp_lightboxResize() {
		if ($("#mp_lightbox_outer:visible").length && $("#mp_lighbox_content img").length) {
			
			var r =	$("#mp_lighbox_content").data("ratio");
			if ($("#mp_lighbox_content").height()+100>$(window).height()) {
				var nw = ($(window).height()-100) / (r/100);
				$("#mp_lightbox_outer_outer").css("width",nw+"px");
			} else {
				$("#mp_lightbox_outer_outer").css("width",$("#mp_lightbox_outer_outer").data("maxw")+'px');
			}
		}
		if ($("#mp_lightbox_outer:visible").length && $("#mp_lightbox_outer").hasClass("ytvidmp")) {
			
			$("#mp_lightbox_inner").css("padding-bottom","56.25%");
			$("#mp_lightbox_outer_outer").data("maxw",this.width).css("width",this.width+"px");
			if ($("#mp_lighbox_content").height()+100>$(window).height()) {
				var nw = ($(window).height()-100) / (56.25/100);
				$("#mp_lightbox_outer_outer").css("width",nw+"px");
			} else {
				$("#mp_lightbox_outer_outer").css("width","1800px");
			}
		}
	};
	function mpPopupReady() {
		$("#showCouponCode").click(function(){
			$("#couponForm").slideDown();
			return false;
		});
		$('.Popup_Link').each(function() { 
			  if (typeof $("img",$(this)).attr("alt") != 'undefined') {
                                 var text = $("img",$(this)).attr("alt");
                                 if (text.indexOf('[caption:')!=-1) {
                                         var texts = text.split("[caption:");
                                         var captions  = texts[1].split("]");
                                         caption  = captions[0].trim();
                                         text = caption.split("||");
                                         var alt = captions[1].trim();
                                         $("img",$(this)).attr("alt",alt);
                                 } else {
                                         var alt = text;
                                         text = text.split("||");
                                         var caption = alt;
                                 }
                                 $("img",$(this)).attr('caption',caption);
                         }       
                 });     

		if (!$('body').hasClass("accessible-mode")){
			$(".Popup_Link").click(function(){
				var desc = "";
				if (typeof $(this).find("img").attr("alt") != "undefined" && $(this).find("img").attr("alt")!="") {
					desc = $(this).find("img").attr("alt");
				}
                                   if (typeof $(this).find("img").attr('caption')!="undefined") {
                                           desc = $(this).find('img').attr('caption');
                                   }       
				if ($(this).find('a').length) {
                                	var href=$(this).find('a').attr('href');
                                } 
				if ($(this).find('img')) {
                                	var href = $(this).find('img').attr('src').split('?');
                                            href = href[0];
                                }
				if (typeof href !='undefined') {
                                showMPPopup(href,desc);
				}
				return false;
			});
			$("#closeMP").click(function(){
				$("#mp_lightbox_outer").fadeOut();
				if ($("#videoMPPopup .jplayer").hasClass("playing")) {
					$("#videoMPPopup .jplayer").jPlayer("stop");
				}
				if (mpytplayer) {
				mpytplayer.stopVideo();				
				}
				return false;

			});
		}
	};
/*

	#Expand Collapse Widgets

*/
	function expandReady() {
		if (!$('body').hasClass("accessible-mode")){
			$(".expand-box-content:not(.openonload .expand-box-content)").slideUp(300,function(){
                                                 setTimeout(function(){
                                                  moduleHeights();
                                                 },5);
					});
			$(".expand-box-title").click(function(e){
				if ($(e.target)[0].tagName.toLowerCase() == "a") {
					if ($(e.target).attr('href')!="#") {
					return true;						
					}

				}
				if ($(this).parent().hasClass("showing")) {
					$(this).parent().removeClass("showing").find("> .expand-box-content").slideUp(300,function(){
						 moduleHeights();
                                                 magicHeights();
                                                 setTimeout(function(){
                                                  moduleHeights();
                                                 },5);
					});
				} else {
					$("> .showing > .expand-box-content",$(this).parent().parent()).slideUp(295).parent().removeClass("showing");
					$(this).parent().addClass("showing");
					$("> .expand-box-content",$(this).parent()).slideDown(300,function(){
						 moduleHeights();
                                                 magicHeights();
                                                 setTimeout(function(){
                                                  moduleHeights();
                                                 },5);
						if($('.galleryWithThumbs',$(this)).length) {
							afterResizeGallery();
						}
					});				
				}
				return false;
			});

		}
		if ($("input[name='verify_email']").length && $("input[name=verify_email]").parents(".expand-box:not(.showing)").length) {
			$("input[name='verify_email']").parents(".expand-box:not(.showing)").find(".expand-box-title").trigger("click");
			$("input[name='pass1']").focus();
		}
		setTimeout(function(){
			var hs = window.location.hash.split('#expand-');
			if (hs.length>1){
				if ($('.expand-box[data-expand-id="'+hs[1]+'"]').length)  {
					var target = $('.expand-box[data-expand-id="'+hs[1]+'"] .expand-box-title');
					target.trigger('click');
					if (typeof target != 'undefined') {
					  
					 if ($('#dmt-floating-sub-menu:not(.fixed)').length) {
						  if (typeof  $('#dmt-floating-sub-menu:not(.fixed) .dmt-floating-sub-menu-link:first').data('move-dist') !='undefined'){
								var extra = $('#dmt-floating-sub-menu:not(.fixed) .dmt-floating-sub-menu-link:first').outerHeight() - $('#dmt-floating-sub-menu:not(.fixed) .dmt-floating-sub-menu-link:first').data('move-dist');
						  } else {
								  var extra = $('#dmt-floating-sub-menu:not(.fixed) .dmt-floating-sub-menu-link:first').outerHeight();					  	
						  }

						  } else if ($('body').hasClass("with-fixed-header")) {
							  var extra = $("#header").outerHeight();
						  } else {
							 var extra = 0;
						  }
			  
						$('html, body').animate({
						  scrollTop: target.offset().top - extra
						}, 1500,function(){
						  if ($('#dmt-floating-sub-menu:not(.fixed)').length) {
							  checkFloatingSub();
						  }
											  
						});
					}
				}
			}
		},550);
	};
/*

	#Popdown widgets

*/
	function hideSearchPopdown() {
		$("#search-form-popdown").removeClass("visible");
		setTimeout(function () {
			$("#search-form-popdown").removeClass("animate").removeAttr("style");
		}, 300);
		$(".display-popdown-widget a.active").removeClass("active");

	}
	function popdownReady() {
		backstretches();
		$("html").click(function(e){
			if (e.target.nodeName.toLowerCase()!="input") {
			hideSearchPopdown();				
			}

		});
		$("body").on("click",".display-popdown-widget a",function(e){
			if ($(this).hasClass("active")) {
				$(this).removeClass("active");
				hideSearchPopdown(e);
			} else {
				$(this).addClass("active");
				var $pd = $("#"+$(this).data("target"));

				var lh = $(this).outerWidth() / 2;
				var ol = $(this).offset().left + lh;
				var t = $(this).offset().top + $(this).outerHeight() + 3;
				var pl = 160;
				ol = ol - pl;
				$(".tri",$pd).css("margin-left","-6px");
				if (ol + 320 > $(window).width()-20) {
					var diff = ol + 320 - $(window).width() + 10;
					ol = ol - diff;
					diff = diff-6;
					$(".tri",$pd).css("margin-left",diff+"px");
				}
				$pd.css("left",ol+"px").css("top",t+"px");
				setTimeout(function () {
					$pd.addClass("animate");
					$pd.addClass("visible");
				}, 1);
				$("input",$pd).focus();
			}

			return false;
		});
	};
/*

	#Basic init setup

*/

	var scrolling = false;
	var scrollingTimer;
	var scroll = window.requestAnimationFrame ||
						 window.webkitRequestAnimationFrame ||
						 window.mozRequestAnimationFrame ||
						 window.msRequestAnimationFrame ||
						 window.oRequestAnimationFrame ||
						 function(callback){ window.setTimeout(callback, 1000/60) };

		 if(navigator.userAgent.indexOf('AppleWebKit') != -1){
				var isWebKit = true;
		 } else {
				var isWebKit = false;
		 }



	function parallaxScroll(timestamp) {
		$("*[data-scroll-decay]").each(function(){
			//var st = $(document).scrollTop();
			var st = window.pageYOffset;
			var ot = $(this).offset().top;
			var th = $(this).outerHeight();
			var wh = $(window).height();

			var decay = 0.5;
			if (typeof $(this).data("scroll-decay") != 'undefined') {
				decay = $(this).data("scroll-decay");
			}
			if (st<0) {
				st=0;
			}
			
			if (isWebKit) {
				$("body").addClass("supports-pos-fixed");
				decay = 1-decay;
				move = ot-st;
				move = move*decay;

			} else {
				move = ot-st;
				move = -move*decay;
			}

				$("> .backstretch img:last",$(this))
				.css("height",wh+"px")
				.css("width","auto")
				.css("left","50%")
				.css("min-width","100%")
				.css("-moz-transform","translate3d(-50%,"+move+"px,0)")
				.css("-webkit-transform","translate3d(-50%,"+move+"px,0)")
				.css("-o-transform","translate3d(-50%,"+move+"px,0)")
				.css("transform","translate3d(-50%,"+move+"px,0)");


		});
	 	scroll(parallaxScroll);

	}

	function backtotopScroll() {
		scrolling = true;
		clearTimeout(scrollingTimer);
		scrollingTimer = setTimeout(function () {
			scrolling = false;
		}, 100);

		$("#backToTop").show().css("opacity","0");
		if ($(document).scrollTop()>200) {
			$("#backToTop").css("opacity","1");
		} else {
			$("#backToTop").css("opacity","0");
		}

	};
	function afterFonts(){
		flexiBreak();
		$("#header .row:not('.flexibreak-big'),#footer .row:not('.flexibreak-big')").addClass("jsLoaded");

	};
	function miscLoad() {
		setRecentBlogWidths();
		if ($("#logo img").width()<$("#logo").width()) {
			$("#logo").css("width",$("#logo img").width()+"px");
		}
		imageMarginHelper();
		backstretches();

		setTimeout(function () {
			$("body").addClass("loaded");
		}, 50);
			setTimeout(function () {
					backstretches();
			}, 200);

	};
	var ww = 0;
	function miscResize() {
		if (!scrolling){
			var st = $(document).scrollTop();
			$("#mobile-menu-auto").addClass("hidden");
			imageMarginHelper();
			if (window.fontsloaded){
				flexiBreak();
				$("#header .row:not('.flexibreak-big'),#footer .row:not('.flexibreak-big')").addClass("jsLoaded");
			}
			hideSearchPopdown();
			setRecentBlogWidths();
			$("body,html").scrollTop(st);
			if ($('body').hasClass("match-parallax-zoom")) {
				backstretches();
			}
		}
			

	};
	var hidingPagePreview;

	function prepMobileHeader() {

	$(".mobile-menu:visible a").each(function(){
		var $this = $(this);

		if (!$(this).parents(".flexibreak-small").length&&!$(this).parents('#mobileheader').length) {
			$this = $("#"+$(".module.nav").parent().data("flexibreak-small")).find(".mobile-menu a");
			var i = $this.parents(".flexibreak-small").attr("id");
			var $orig = $("*[data-flexibreak-small=\""+i+"\"]");
		}
		else {
			var $orig = $('#header .nav').parent();
		}
		if ($this.parents(".mobile-menu").hasClass("style-reveal-left")||$this.parents(".mobile-menu").hasClass("style-reveal-right")) {
			var revealDirection = ($this.parents(".mobile-menu").hasClass("style-reveal-left")?"left":"right");
			if (!$("#mobile-menu-behind").length) {
				$("body").addClass("mobile-menu-position-"+revealDirection);
				$("body").wrapInner('<div id="mobile-menu-page-wrap"></div>');
				//$("#mobileheader").insertAfter("#mobile-menu-page-wrap");
				$("#mobile-menu-page-wrap").prepend($("#mobileheader"));
				$("#mobile-menu-page-wrap,#mobileheader").click(function(){
					$("body").removeClass("mobile-menu-revealing-left mobile-menu-revealing-right");
					setTimeout(function () {
						$("body").removeClass("mobile-menu-animating-"+revealDirection);
					}, 700);
				});
				if (typeof turnstile != "undefined" && $(".cf-turnstile").length) {
					turnstile.reset();
				}
				checkMobileMenuHeights();
				var below_nav_append="";
				if ($("#below_nav_append").length){
				below_nav_append='<div id="below_mobile_nav">'+$("#below_nav_append").html()+"</div>";
				}
				$("body").prepend('<div id="mobile-menu-behind"><ul></ul>'+below_nav_append+'</div>');
				var $target = $("#mobile-menu-behind ul");
				$(".nav > ul",$orig).children(":not(#nav-logo,#nav-search)").each(function(){
					//if (!$(".mobile-header-icon a[href='"+$("a",$(this)).attr("href")+"']").length){
					$target.append($(this).clone());
					//}
				});
				if ($(".nav > ul #nav-search.nav-search-first",$orig).length&&$("body").hasClass("with-mobile-header")) {
					$target.prepend($("#search-form-popdown form").clone());
				}
				if ($(".nav > ul #nav-search.nav-search-last",$orig).length&&$("body").hasClass("with-mobile-header")) {
					$target.append($("#search-form-popdown form").clone());
				}
				if ($this.parents(".inc-search").length){
					$target.parent().append($(".search-module:first form").clone().addClass("appended-search"));
					$target.parent().find("form.appended-search").wrap("<div class='search-module'></div>");
				}

				if ($target.find("li").length==0){
					$this.parents(".mobile-menu").hide();
				}
				$target.find("> li > a").removeAttr("style");
				popupReady();
			}
			setTimeout(function () {

		//		$("body").addClass("mobile-menu-animating-"+revealDirection+" mobile-menu-revealing-"+revealDirection);

			}, 10);
			$("#mobile-menu-behind ul ul").each(function(){
				$(this).parent().addClass("withHiddenNav").append("<div class='showSubMenu'></div>");
			});
			$(".showSubMenu").click(function(){
		//		$(this).parent().toggleClass("showingSubMenu");
				return false;
			});
		}
		return false;
	});

	}
	function moduleHeights (replace) {
		if (typeof replace == 'undefined'){
			var replace = true;
		}

		$(".widget-banner-window-height").each(function(){
			var wh = $(window).height();

			$('.banner-feature',$(this)).css('min-height',wh+"px");
		});
		$(".vertical-align .column").css("padding-top","0px");
		$(".vertical-align").each(function(){
			var tallest = 0;
			$(".column",$(this)).each(function(){
				if ($(this).height()>tallest) {
					tallest = $(this).height();
				}
			});
			$(".column",$(this)).each(function(){
				if ($(this).height()<tallest) {
					var pt = tallest - $(this).height();
					pt = pt / 2;
					$(this).css('padding-top',pt+'px');
				}
			});
			
		});
		
		$(".row:visible:not(.mobile-menu-row,.flexibreak-small .row),.fill-row:visible").each(function(){
			// calculate row height
			var r= 0;
			var rowhl = 0;
			var rowhr = 0;
			var subrowh=0;
			var firstrow=true;
			var wrapperspace = 0;
			if ($("> *:not(.module)",$(this)).length) {
				wrapperspace =
				parseFloat($("> *:not(.module)",$(this)).css("padding-top"))
				+ parseFloat($("> *:not(.module)",$(this)).css("margin-top"))
				+ parseFloat($("> *:not(.module)",$(this)).css("border-top-width"))
				+ parseFloat($("> *:not(.module)",$(this)).css("padding-bottom"))
				+ parseFloat($("> *:not(.module)",$(this)).css("margin-bottom"))
				+ parseFloat($("> *:not(.module)",$(this)).css("border-bottom-width"))
				;
				rowhl = wrapperspace;
			}
			$(this).find(".banner-feature").removeAttr("style");
			$(".module",$(this)).each(function(){
				if ($(this).outerHeight(true)>rowhl) {
					rowhl = $(this).outerHeight(true);
				}
			});
			rowhl = rowhl+subrowh;

			$(".align-left:not(.valign),.align-:not(.valign)",$(this)).each(function(){
				if ($(this).hasClass("clear-left") || firstrow) {
					firstrow = false;
					subrowh = subrowh+$(this).outerHeight(true);

				} else {
					if ($(this).outerHeight(true)>subrowh) {
						subrowh=$(this).outerHeight(true);
					}
				}
			});
			if (subrowh>rowhl) {
				rowhl = subrowh;
			}
			subrowh=0;
			firstrow=true;
			$(".align-right:not(.valign)",$(this)).each(function(){

				if ($(this).hasClass("clear-right") || firstrow) {
					firstrow=false
					subrowh = subrowh+$(this).outerHeight(true);
				} else {
					if ($(this).outerHeight(true)>subrowh) {
						subrowh=$(this).outerHeight(true);
					}
				}

				rowhr = rowhr+subrowh;

			});

			subrowh=0;
			firstrow=true;
			$(".align-center",$(this)).each(function(){
				if (!$(this).next().length&&!$(this).prev().length) {
					subrowh = $(this).outerHeight(true);
				}
				rowhr = rowhr+subrowh;
				if ($(this).outerHeight(true)>rowhr) {
					rowhr=$(this).outerHeight(true);
				}

			});


			$(".align-justify",$(this)).each(function(){

				if (!$(this).hasClass("clear-right")) {
					if ($(this).prev().hasClass("align-right")) {
						if ($(this).prev().hasClass("clear-right")) {
							var oldrow = $(this).prev().outerHeight(true);
						} else {
							var oldrow = 0;
							$(this).prevUntil(".clear-right",".align-right").each(function(){
								if ($(this).outerHeight(true)>oldrow) {
									oldrow = $(this).outerHeight(true);
								}
							});
						}
						if ($(this).outerHeight(true) > oldrow) {
							rowhr = rowhr-oldrow;
							rowhr = rowhr+$(this).outerHeight(true);
						}
					}
					if (!$(this).next().length&&!$(this).prev().length) {
						rowhr = rowhr+$(this).outerHeight(true);
					}
				}


				if (!$(this).hasClass("clear-left")) {
					if ($(this).prev().hasClass("align-left")) {
						if ($(this).prev().hasClass("clear-left")) {
							var oldrow = $(this).prev().outerHeight(true);
						} else {
							var oldrow = 0;
							$(this).prevUntil(".clear-left",".align-left").each(function(){
								if ($(this).outerHeight(true)>oldrow) {
									oldrow = $(this).outerHeight(true);
								}
							});
						}
						if ($(this).outerHeight(true) > oldrow) {
							rowhl = rowhl-oldrow;
							rowhl = rowhl+$(this).outerHeight(true);
						}
					}
				}


			});


			var wh = 0;
			$(".width",$(this)).each(function(){
				if ($(this).hasClass("width-valign-middle")||$(this).hasClass("width-valign-bottom")) {
					if ($(this).find("> div").outerHeight(true)>wh) {
						wh=$(this).find("> div").outerHeight(true);
					}

				} else {
					if ($(this).outerHeight(true)>wh) {
						wh=$(this).outerHeight(true);
					}

				}
			});
			$(".width",$(this)).css("height",wh+"px");



			if (rowhl>rowhr) {
				var r = rowhl;
			} else {
				var r = rowhr;
			}

			if (wh > r) {
				r = wh;
			}

			$(this).css("height",r+"px");

			appendCustomStyle($(this).attr("id"),"row","height",r,replace);
			/*
			if (typeof $(this).attr("id") != "undefined"){
			if (customstyle["fb1"][$(this).attr("id")]===undefined && 
			customstyle["rs1"][$(this).attr("id")]===undefined) {
				customstyle["default_row_height"][$(this).attr("id")]=r;
			}
			if (customstyle["fb2"][$(this).attr("id")]===undefined) {
				customstyle["row_height_fb1"][$(this).attr("id")]=r;
			}
			if (customstyle["fb3"][$(this).attr("id")]===undefined) {
				customstyle["row_height_fb2"][$(this).attr("id")]=r;
			}
			if (customstyle["fb3"][$(this).attr("id")]!==undefined) {
				customstyle["row_height_fb3"][$(this).attr("id")]=r;
			}
			if (customstyle["rs2"][$(this).attr("id")]===undefined) {
				customstyle["row_height_rs1"][$(this).attr("id")]=r;
			}
			if (customstyle["rs3"][$(this).attr("id")]===undefined) {
				customstyle["row_height_rs2"][$(this).attr("id")]=r;
			}
			if (customstyle["rs3"][$(this).attr("id")]!==undefined) {
				customstyle["row_height_rs3"][$(this).attr("id")]=r;
			}
			}
			*/


			if (typeof $(this).data("min-height")!='undefined') {
				$(this).css('height','auto');


				if ($(this).data("min-height")=="window") {
					var wh = $(window).height();
				} else {
					var wh = parseFloat($(this).data("min-height"));
					if ($(this).data("scale-prop")) {
						var ratio = 1000 / wh;
						wh = $(window).width() / ratio;
					}
				}

				var p = wh / 2;
				var pt = p - r/2;
				var pb = p - r/2;
				var deduct = parseFloat($(this).parent(".container").css("padding-top")) + parseFloat($(this).parent(".container").css("border-top-width")) + parseFloat($(this).css("margin-top"));

				pt = pt - deduct;
				pb = pb - deduct;
				if (pt>0&&pb>0) {
					//if (pb>r) {
					if ($(this).find(".banner-feature").length){
						$(this).find(".banner-feature").css("padding-top",pt+"px").css("padding-bottom",pb+"px");
					} else {
						$(this).css("padding-top",pt+"px").css("padding-bottom",pb+"px");
					}
					//} else {
					//	$(this).css("padding-top","0px").css("padding-bottom","0px");
					//}

				} else {
					$(this).css("padding-top","0px").css("padding-bottom","0px");
				}
			}
			$(".width-valign-middle").each(function(){
				var t = $(this).find("> div,> ul").height() / 2;
				$(this).find("> *").css("margin-bottom","-"+t+'px');
			});

		});
		$(".sticky-column-sidebar").height($(".sticky-sidebar-inner").outerHeight()+"px");

	}
	function setFixedHeader() {
		if ($("body").hasClass("with-fixed-header")) { 
			if ($("#all_headers_bg").length) {
				var $header = $("#all_headers_bg");
			} else {
				var $header = $("#header");
			}
		
			if (!$("body").hasClass("fixed-type-1")){
				$("body").css("padding-top","0px");
			}
			$header.css({position:"relative"});
			var targeth = $header.height()*1.2;
			if ($(window).height()>targeth) {
				if (!$("body").hasClass("fixed-type-1")){
					if ($("body").hasClass("is_admin")){
						var t = "36px";
					} else { 
						var t = "0px";
					}
					$header.css({top:t,left:"0px",right:"0px",position:"fixed"});
				}
				toscroll = 1;
				if (!$("body").hasClass("skip-padding")) {

					$("#header .container.hide-in-fixed").each(function(){
						$(this).addClass("no-animate");
						$(this).css("max-height","2000px");
						$(this).css("max-height",$(this).outerHeight()+"px");
						$(this).removeClass("no-animate");
						toscroll = toscroll + $(this).outerHeight();
					});
					$("#header .container:not(.hide-in-fixed)").each(function(){
						$(this).data("ot",$(this).offset().top);
						if ($(".logo-module.with-fixed-logo-version",$(this)).length) {
							toscroll = toscroll + $(this).outerHeight()/2;
						}
					});
					var headerHeight = $header.outerHeight();
				
					if (!$("body").hasClass("fixed-type-1")){
						$("body").css("padding-top",headerHeight+"px");
					}

					$('body').addClass('header-calculated');

				}
			}
		}
		if ($("body").hasClass("header-no-height")) {
			if ($("#all_headers_bg").length) {
				var $header = $("#all_headers_bg");
			} else {
				var $header = $("#header");				
			}
			$header.addClass("no-height");
		}
		if ($("body").hasClass("header-fixed-behind")) {
			if ($("#all_headers_bg").length) {
				var $header = $("#all_headers_bg");
			} else {
				var $header = $("#header");				
			}
			$("body").css("padding-top",$header.outerHeight()+"px");
		}
		$(".sticky-column-sidebar").height($(".sticky-sidebar-inner").outerHeight()+"px");
	}
	var toscroll = 1;
	function fixedHeaderScroll() {
		if (!$('body').hasClass('header-calculated')&&$('body').hasClass('with-fixed-header')&&!$('body').hasClass('skip-padding')){
			return true;
		}
		if ($("#all_headers_bg").length) {
			var $header = $("#all_headers_bg");
		} else {
			var $header = $("#header");
		}
	
		var targeth = $header.height()*1.2;
					
		if ($("body").hasClass("with-fixed-header") && $(window).height()>targeth) {
			var t = $(document).scrollTop();
			if ($("body").hasClass("fixed-type-1")){
				var adds = parseInt($("body").css("padding-top"));
				var pt = adds;
				$("#header .container:not(.hide-in-fixed)").each(function(){
					var ot = $(this).data("ot")-pt;
					if (t>ot-adds+pt){
						$(this).css({top:adds+"px",left:"0px",right:"0px",position:"fixed"});
						$(this).addClass("pinned-header-row");
						if (!$(this).next(".fixed-header-placeholder").length){
						$(this).after("<div class='fixed-header-placeholder' style='height:"+$(this).outerHeight()+"px'></div>");
						}
						adds+=$(this).outerHeight();
					} else {
						$(this).removeClass("pinned-header-row");
						$(this).removeAttr("style");
						$(this).next(".fixed-header-placeholder").remove();
					}
				});
				adds+=20;
				$(".sticky-column-sidebar").css("top",adds+"px");

			} else {
				if (t > toscroll) {
					if (!$('body').hasClass('showing-fixed-header')){
						$("body").addClass("showing-fixed-header");
			//			modules();
					}
					setTimeout(function () {
						$(".backstretch").each(function(){
							var instance = $(this).parent().data("backstretch");
							instance.resize();
						});
					}, 650);
					$(".logo-module.with-fixed-logo-version").each(function(){
						$("img",$(this)).attr("width",$(this).data("logo-fixed-width")).attr("height",$(this).data("logo-fixed-height"));
						var $t = $(this);
						setTimeout(function () {
						$("img",$t).attr("src",$t.data("logo-fixed-img"));
						}, 1);

					});
					var miniHeaderSpace = $("#header").height();
					if ($(window).width()>800) {
						$(".sticky-column-sidebar").css("top",miniHeaderSpace+"px");
					}

				} else {
					if ($('body').hasClass('showing-fixed-header')){
						$("body").removeClass("showing-fixed-header");
						$('.hide-in-fixed').removeAttr('style');
			//			modules();
					}
					setTimeout(function () {
						$(".backstretch").each(function(){
							var instance = $(this).parent().data("backstretch");
							instance.resize();
						});
					}, 650);
					$(".logo-module.with-fixed-logo-version").each(function(){
						$("img",$(this)).attr("width",$(this).data("norm-width")).attr("height",$(this).data("norm-height"));
						var $t = $(this);
						setTimeout(function () {
						$("img",$t).attr("src",$t.data("logo-normal-img"));						
						}, 1);

					});
					if ($(window).width()>800) {

						$(".sticky-column-sidebar").height($(".sticky-sidebar-inner").outerHeight()+"px");
					}
				}
			}
			if ($(".logo-module.with-fixed-logo-version").length) {
				setTimeout(function () {
					moduleHeights();
				}, 50);
			}
		};
	}
	function checkMobileMenuHeights() {
		if ($("#mobile-menu-page-wrap").length) {
			var ept = parseInt($("#mobile-menu-page-wrap").css("padding-top"));
			//var npt = parseInt($("body").css("padding-top")) + ept;
			var npt = ept;
			if ($("#mobile-menu-page-wrap").height()<$(window).height()) {
				$("#mobile-menu-page-wrap").css("min-height",$(window).height()+"px").css("padding-top",npt+"px");
			}
			if ($("#mobile-menu-behind").height()<$(window).height()) {
				$("#mobile-menu-behind").css("min-height",$(window).height()+"px").css("padding-top",npt+"px");
			}
		}
	}
	function modules($scope,replace) {
		if (!findBreakpoints&&$("body").hasClass("breakpoints")){
		return false;
		}
		if (typeof $scope == 'undefined'){
			var $scope = $('body');
		}
		if (typeof replace == 'undefined'){
			var replace = replace;
		}
		$(".align-center:visible:not(.width)",$scope).each(function(){
			var $t = $(this);
			var l = $t.css("left");
			var r = $t.css("right");
			$t.css({opacity:1,float:"left",width:"auto",right:"auto",left:"auto"});
			setTimeout(function(){
				var w = $t.outerWidth()+10;
				$t.css({width:w+"px",float:"none",opacity:1,left:l,right:r});
				appendCustomStyle($scope.attr("id"),"w",$t.data("position"),w,replace);
				appendCustomStyle($scope.attr("id"),"pl",$t.data("position"),l,replace);
				appendCustomStyle($scope.attr("id"),"pr",$t.data("position"),r,replace);
			},10);

		});
		$(".valign-middle:not(.width,.align-center)",$scope).each(function(){
			var t = $(this).height() / 2;
			$(this).css("margin-bottom","-"+t+'px');
			appendCustomStyle($scope.attr("id"),"mb",$(this).data("position"),t,replace);
		});
		$(".align-center.valign-middle.nav",$scope).each(function(){
			var t = $(this).find("li:first").height() / 2;
			$(this).find("li:not(#nav-logo)").css("top","-"+t+'px');
			appendCustomStyle($scope.attr("id"),"t",$(this).data("position"),t,replace);
		});
		if ($scope.hasClass("row")){
			var $rows=$scope;
		}else{
			var $rows=$(".row:visible",$scope);
		}
		//$(".row:visible",$scope).each(function(){
		$rows.each(function(){
			if (!$(this).is(":visible")){
				return true;
			}
			var $row = $(this);
			$row.css("height","auto");
			$(".width",$(this)).css("height","auto");

			// Loop through all valign-bottom align-right clear-right items and adjust the bottom position so they stack.
			var offset =0
			var $els = $($(".valign-bottom.clear-right",$(this)).get().reverse());
			$els.each(function(){
				$(this).css("bottom",offset+"px");
				offset=offset+$(this).outerHeight(true);
			});
			if ($els.last().hasClass("valign-bottom")) {
				$els.last().prevUntil(":not(.align-right,.align-justify),.clear-right",".valign-bottom.align-right").css("bottom",offset+"px");
			}

			// Loop through all valign-bottom align-left clear-left items and adjust the bottom position so they stack.
			var offset =0
			var $els = $($(".valign-bottom.clear-left",$(this)).get().reverse());
			$els.each(function(){
				$(this).css("bottom",offset+"px");
				offset=offset+$(this).outerHeight(true);
			});
			if ($els.last().prev().hasClass("valign-bottom")) {
				$els.last().prevUntil(":not(.align-left,.align-justify),.clear-left",".valign-bottom.align-left").css("bottom",offset+"px");
			}

			// Loop through all valign-top align-right clear-right items and adjust the top position so they stack.
			var offset =0
			var $els = $($(".valign-top.clear-right",$(this)).get());
			$els.each(function(){
				$(this).css("top",offset+"px");
				offset=offset+$(this).outerHeight(true);
			});
			if ($els.last().hasClass("valign-top")) {
				$els.last().prevUntil(":not(.align-right,.align-justify),.clear-right",".valign-top.align-right").css("top",offset+"px");
			}

			// Loop through all valign-top align-left clear-left items and adjust the top position so they stack.
			var offset =0
			var $els = $($(".valign-top.clear-left",$(this)).get());
			$els.each(function(){
				$(this).css("top",offset+"px");
				offset=offset+$(this).outerHeight(true);
			});
			if ($els.last().prev().hasClass("valign-top")) {
				$els.last().prevUntil(":not(.align-left,.align-justify),.clear-left",".valign-top.align-left").css("top",offset+"px");
			}




			// Go through valign-top align-right items and adjust right position so they sit on the same row
			var widths = parseFloat($(".valign-top.align-right",$(this)).css("right"));
			$(".valign-top.align-right",$(this)).each(function(){
				widths = widths+$(this).outerWidth(true);
				if (!$(this).next().hasClass("clear-right") && $(this).next(".valign-top.align-right").length) {
					$(this).next().css("right",widths+"px");
					appendCustomStyle($scope.attr("id"),"pr",$(this).next().data("position"),widths,replace);
				}

			});

			// Go through valign-middle align-right items and adjust right position so they sit on the same row
			var widths = parseFloat($(".valign-middle.align-right",$(this)).css("right"));
			$(".valign-middle.align-right",$(this)).each(function(){
				widths = widths+$(this).outerWidth(true);
				if (!$(this).next().hasClass("clear-right") && $(this).next(".valign-middle.align-right").length) {
					$(this).next().css("right",widths+"px");
					appendCustomStyle($scope.attr("id"),"pr",$(this).next().data("position"),widths,replace);
				}

			});

			// Go through valign-bottom align-right items and adjust right position so they sit on the same row
			var widths = parseFloat($(".valign-bottom.align-right",$(this)).css("right"));
			$(".valign-bottom.align-right",$(this)).each(function(){
				widths = widths+$(this).outerWidth(true);
				if (!$(this).next().hasClass("clear-right") && $(this).next(".valign-bottom.align-right").length) {
					$(this).next().css("right",widths+"px");
					appendCustomStyle($scope.attr("id"),"pr",$(this).next().data("position"),widths,replace);
				}

			});

			// Go through valign-bottom align-left items and adjust right position so they sit on the same row
			var widths = parseFloat($(".valign-bottom.align-left",$(this)).css("left"));
			$(".valign-bottom.align-left",$(this)).each(function(){
				widths = widths+$(this).outerWidth(true);
				if (!$(this).next().hasClass("clear-left") && $(this).next(".valign-bottom.align-left").length) {
					$(this).next().css("left",widths+"px");
					appendCustomStyle($scope.attr("id"),"pl",$(this).next().data("position"),widths,replace);
				}

			});

			// Go through valign-middle align-left items and adjust right position so they sit on the same row
			var widths = parseFloat($(".valign-.align-left:not(.valign-top,.valign-middle,.valign-bottom)",$(this)).css("left"));
			$(".valign-.align-left:not(.valign-top,.valign-middle,.valign-bottom)",$(this)).each(function(){
				widths = widths+$(this).outerWidth(true);
				if (!$(this).next().hasClass("clear-left") && $(this).next(".valign-middle.align-left").length) {
					$(this).next().css("left",widths+"px");
					appendCustomStyle($scope.attr("id"),"pl",$(this).next().data("position"),widths,replace);
				}

			});

			// Go through valign-middle align-left items and adjust right position so they sit on the same row
			var widths = parseFloat($(".valign-middle.align-left",$(this)).css("left"));
			$(".valign-middle.align-left",$(this)).each(function(){
				widths = widths+$(this).outerWidth(true);
				if (!$(this).next().hasClass("clear-left") && $(this).next(".valign-middle.align-left").length) {
					$(this).next().css("left",widths+"px");
					appendCustomStyle($scope.attr("id"),"pl",$(this).next().data("position"),widths,replace);
				}

			});

			// Go through valign-middle align-right items and adjust right position so they sit on the same row
			var widths = parseFloat($(".valign-middle.align-right",$(this)).css("right"));
			$(".valign-middle.align-right",$(this)).each(function(){
				widths = widths+$(this).outerWidth(true);
				if (!$(this).next().hasClass("clear-right") && $(this).next(".valign-middle.align-right").length) {
					$(this).next().css("right",widths+"px");
					appendCustomStyle($scope.attr("id"),"pr",$(this).next().data("position"),widths,replace);
				}
			});


			// Go through valign-top align-left items and adjust right position so they sit on the same row
			var widths = parseFloat($(".valign-top.align-left",$(this)).css("left"));
			$(".valign-top.align-left",$(this)).each(function(){
				widths = widths+$(this).outerWidth(true);
				if (!$(this).next().hasClass("clear-left") && $(this).next(".valign-top.align-left").length) {
					$(this).next().css("left",widths+"px");
					appendCustomStyle($scope.attr("id"),"pl",$(this).next().data("position"),widths,replace);
				}

			});


			// Go through valign-top align-right items and adjust right position so they sit on the same row
			var widths = parseFloat($(".valign-top.align-right",$(this)).css("right"));
			$(".valign-top.align-right",$(this)).each(function(){
				widths = widths+$(this).outerWidth(true);
				if (!$(this).next().hasClass("clear-right") && $(this).next(".valign-top.align-right").length) {
					$(this).next().css("right",widths+"px");
					appendCustomStyle($scope.attr("id"),"pr",$(this).next().data("position"),widths,replace);
				}

			});

			// Check any valign-middle or valign-bottom justify items to make sure they they don't overlap left aligned items.
			var leftedge = 20;
			$(".align-left,.align-",$(this)).each(function(){
				var rightedge = $(this).outerWidth(true) + $(this).position().left;
				if (rightedge>leftedge) {
					leftedge =rightedge;
				}
			});
			/*
			$(".valign-bottom.align-justify,.valign-middle.align-justify,.valign-top.align-justify",$(this)).each(function(){
				$(this).css("left",leftedge+"px");
				appendCustomStyle($scope.attr("id"),"pl",$(this).data("position"),leftedge,replace);
			});
			*/



		});

		/*
		$(".module.align-justify.style-equal",$scope).each(function(){
			var $lis = $("> * > *",$(this));
			var n = $lis.length;
			var space = n * 10 - 10;
			var width = ($(this).width() - space) / n;
			width = Math.floor(width);
			$lis.css("width",width+"px");
		});
		$(".module.align-justify:not(.style-equal,.style-space)",$scope).each(function(){
			var w = $(this).innerWidth();
			var ews = 0;
			var $m = $(this);
			$("> * >*",$(this)).each(function(){
				if ($("> a",$(this)).length) {
					var $el = $(">a",$(this));
					var incOuter = true;
				} else {
					var $el = $(this);
					var incOuter = false;
				}
				if (typeof $m.attr("padding-left") == 'undefined') {
					$m.attr("padding-left",$el.css("padding-left"));
					$m.attr("padding-right",$el.css("padding-right"));
				}

				$el.css("padding-left","0px").css("padding-right","0px");
				if (incOuter) {
					 var ew = $el.parent().outerWidth(true);
				} else {
					 var ew = $el.outerWidth(true);
				}

				ews = ews+ew;
			});
			var d = w - ews - 2;
			var c = $("> * > *",$(this)).length;
			var p = d/c;
			p = p/2;

			$("> * > *",$(this)).each(function(){
				if ($("> a",$(this)).length) {
					var $el = $(">a",$(this));
				} else {
					var $el = $(this);
				}

				if (p<parseFloat($m.attr("padding-right"))) {
					$el.css({"padding-left":$m.attr("padding-left"),"padding-right":$m.attr("padding-right")});
				} else {
					$el.css({"padding-left":p+"px","padding-right":p+"px"});
				}
			});
		});
		*/
		$(".nav.valign-bottom.logo-first,.nav.valign-middle.logo-first,.nav.valign-bottom.logo-last,.nav.valign-middle.logo-last,.nav.with-middle-logo",$scope).each(function(){
			$(">ul>li:not(#nav-logo)",$(this)).css("margin-top","0px");
			var th = $("> ul > li#nav-logo",$(this)).outerHeight();
			var $t = $(this);
			$(">ul>li:not(#nav-logo)",$(this)).each(function(){
				var h = $(">a,>form",$(this)).outerHeight();
				var mt = th-h;
				if ($t.hasClass("valign-middle")||$t.hasClass("with-middle-logo")) {
					mt = mt/2;
				}
				$(this).css("margin-top",mt+"px");
			});

		});



	}
	function testFlexiBreak($container) {

		var offset = 0;
		var ok = true;
		if ($container.hasClass("contains-text")) {
			var offset = $("> li",$container).offset().top;

			$("> li:not(#nav-logo)",$container).each(function(){
				if ($(this).offset().top!=offset) {
					ok = false;
				}
			});
		}

		if ($container.parent().hasClass("align-justify") && $container.parent().hasClass("style-equal")) {
			$(".tfb").contents().unwrap();
		
			$("> li > a",$container).wrapInner("<span class='tfb'>");

			$('.tfb').each(function(){
				var outer = $(this).parent().width() - (parseInt($(this).parent().css("padding-left"))+parseInt($(this).parent().css("padding-right")));

				if ($(this).width()>outer) {
					ok = false;
				}
			});
			
		}

		if (!$container.hasClass("allow-line-breaks")) {
			var h = $("> li:not(#nav-search,#nav-basket,#nav-logo) > a",$container).first().height();
			$("> li:gt(0):not(#nav-search,#nav-basket,#nav-logo) > a",$container).each(function(){
				if ($(this).height()!=h) {
					ok=false;
				}
			});
		}

		return ok;
	}
	var testWidth=3560;
	var maxTestWidth=3560;
	var minTestWidth=320;
	var customstyle={};
	customstyle["default_row_height"]={};
	customstyle["row_height_fb1"]={};
	customstyle["row_height_fb2"]={};
	customstyle["row_height_fb3"]={};
	customstyle["row_height_rs1"]={};
	customstyle["row_height_rs2"]={};
	customstyle["row_height_rs3"]={};

	customstyle["mb_left_default"]={};
	customstyle["mb_left_fb1"]={};
	customstyle["mb_left_fb2"]={};
	customstyle["mb_left_fb3"]={};
	customstyle["mb_left_rs1"]={};
	customstyle["mb_left_rs2"]={};
	customstyle["mb_left_rs3"]={};

	customstyle["mb_left2_default"]={};
	customstyle["mb_left2_fb1"]={};
	customstyle["mb_left2_fb2"]={};
	customstyle["mb_left2_fb3"]={};
	customstyle["mb_left2_rs1"]={};
	customstyle["mb_left2_rs2"]={};
	customstyle["mb_left2_rs3"]={};

	customstyle["mb_right_default"]={};
	customstyle["mb_right_fb1"]={};
	customstyle["mb_right_fb2"]={};
	customstyle["mb_right_fb3"]={};
	customstyle["mb_right_rs1"]={};
	customstyle["mb_right_rs2"]={};
	customstyle["mb_right_rs3"]={};

	customstyle["mb_right2_default"]={};
	customstyle["mb_right2_fb1"]={};
	customstyle["mb_right2_fb2"]={};
	customstyle["mb_right2_fb3"]={};
	customstyle["mb_right2_rs1"]={};
	customstyle["mb_right2_rs2"]={};
	customstyle["mb_right2_rs3"]={};
 
	customstyle["mb_centered_default"]={};
	customstyle["mb_centered_fb1"]={};
	customstyle["mb_centered_fb2"]={};
	customstyle["mb_centered_fb3"]={};
	customstyle["mb_centered_rs1"]={};
	customstyle["mb_centered_rs2"]={};
	customstyle["mb_centered_rs3"]={};

	customstyle["pl_left_default"]={};
	customstyle["pl_left_fb1"]={};
	customstyle["pl_left_fb2"]={};
	customstyle["pl_left_fb3"]={};
	customstyle["pl_left_rs1"]={};
	customstyle["pl_left_rs2"]={};
	customstyle["pl_left_rs3"]={};

	customstyle["pl_left2_default"]={};
	customstyle["pl_left2_fb1"]={};
	customstyle["pl_left2_fb2"]={};
	customstyle["pl_left2_fb3"]={};
	customstyle["pl_left2_rs1"]={};
	customstyle["pl_left2_rs2"]={};
	customstyle["pl_left2_rs3"]={};

	customstyle["pl_right_default"]={};
	customstyle["pl_right_fb1"]={};
	customstyle["pl_right_fb2"]={};
	customstyle["pl_right_fb3"]={};
	customstyle["pl_right_rs1"]={};
	customstyle["pl_right_rs2"]={};
	customstyle["pl_right_rs3"]={};

	customstyle["pl_right2_default"]={};
	customstyle["pl_right2_fb1"]={};
	customstyle["pl_right2_fb2"]={};
	customstyle["pl_right2_fb3"]={};
	customstyle["pl_right2_rs1"]={};
	customstyle["pl_right2_rs2"]={};
	customstyle["pl_right2_rs3"]={};
 
	customstyle["pl_centered_default"]={};
	customstyle["pl_centered_fb1"]={};
	customstyle["pl_centered_fb2"]={};
	customstyle["pl_centered_fb3"]={};
	customstyle["pl_centered_rs1"]={};
	customstyle["pl_centered_rs2"]={};
	customstyle["pl_centered_rs3"]={};

	customstyle["pr_left_default"]={};
	customstyle["pr_left_fb1"]={};
	customstyle["pr_left_fb2"]={};
	customstyle["pr_left_fb3"]={};
	customstyle["pr_left_rs1"]={};
	customstyle["pr_left_rs2"]={};
	customstyle["pr_left_rs3"]={};

	customstyle["pr_left2_default"]={};
	customstyle["pr_left2_fb1"]={};
	customstyle["pr_left2_fb2"]={};
	customstyle["pr_left2_fb3"]={};
	customstyle["pr_left2_rs1"]={};
	customstyle["pr_left2_rs2"]={};
	customstyle["pr_left2_rs3"]={};

	customstyle["pr_right_default"]={};
	customstyle["pr_right_fb1"]={};
	customstyle["pr_right_fb2"]={};
	customstyle["pr_right_fb3"]={};
	customstyle["pr_right_rs1"]={};
	customstyle["pr_right_rs2"]={};
	customstyle["pr_right_rs3"]={};

	customstyle["pr_right2_default"]={};
	customstyle["pr_right2_fb1"]={};
	customstyle["pr_right2_fb2"]={};
	customstyle["pr_right2_fb3"]={};
	customstyle["pr_right2_rs1"]={};
	customstyle["pr_right2_rs2"]={};
	customstyle["pr_right2_rs3"]={};
 
	customstyle["pr_centered_default"]={};
	customstyle["pr_centered_fb1"]={};
	customstyle["pr_centered_fb2"]={};
	customstyle["pr_centered_fb3"]={};
	customstyle["pr_centered_rs1"]={};
	customstyle["pr_centered_rs2"]={};
	customstyle["pr_centered_rs3"]={};

	customstyle["w_left_default"]={};
	customstyle["w_left_fb1"]={};
	customstyle["w_left_fb2"]={};
	customstyle["w_left_fb3"]={};
	customstyle["w_left_rs1"]={};
	customstyle["w_left_rs2"]={};
	customstyle["w_left_rs3"]={};

	customstyle["w_left2_default"]={};
	customstyle["w_left2_fb1"]={};
	customstyle["w_left2_fb2"]={};
	customstyle["w_left2_fb3"]={};
	customstyle["w_left2_rs1"]={};
	customstyle["w_left2_rs2"]={};
	customstyle["w_left2_rs3"]={};

	customstyle["w_right_default"]={};
	customstyle["w_right_fb1"]={};
	customstyle["w_right_fb2"]={};
	customstyle["w_right_fb3"]={};
	customstyle["w_right_rs1"]={};
	customstyle["w_right_rs2"]={};
	customstyle["w_right_rs3"]={};

	customstyle["w_right2_default"]={};
	customstyle["w_right2_fb1"]={};
	customstyle["w_right2_fb2"]={};
	customstyle["w_right2_fb3"]={};
	customstyle["w_right2_rs1"]={};
	customstyle["w_right2_rs2"]={};
	customstyle["w_right2_rs3"]={};
 
	customstyle["w_centered_default"]={};
	customstyle["w_centered_fb1"]={};
	customstyle["w_centered_fb2"]={};
	customstyle["w_centered_fb3"]={};
	customstyle["w_centered_rs1"]={};
	customstyle["w_centered_rs2"]={};
	customstyle["w_centered_rs3"]={};

	customstyle["t_left_default"]={};
	customstyle["t_left_fb1"]={};
	customstyle["t_left_fb2"]={};
	customstyle["t_left_fb3"]={};
	customstyle["t_left_rs1"]={};
	customstyle["t_left_rs2"]={};
	customstyle["t_left_rs3"]={};

	customstyle["t_left2_default"]={};
	customstyle["t_left2_fb1"]={};
	customstyle["t_left2_fb2"]={};
	customstyle["t_left2_fb3"]={};
	customstyle["t_left2_rs1"]={};
	customstyle["t_left2_rs2"]={};
	customstyle["t_left2_rs3"]={};

	customstyle["t_right_default"]={};
	customstyle["t_right_fb1"]={};
	customstyle["t_right_fb2"]={};
	customstyle["t_right_fb3"]={};
	customstyle["t_right_rs1"]={};
	customstyle["t_right_rs2"]={};
	customstyle["t_right_rs3"]={};

	customstyle["t_right2_default"]={};
	customstyle["t_right2_fb1"]={};
	customstyle["t_right2_fb2"]={};
	customstyle["t_right2_fb3"]={};
	customstyle["t_right2_rs1"]={};
	customstyle["t_right2_rs2"]={};
	customstyle["t_right2_rs3"]={};
 
	customstyle["t_centered_default"]={};
	customstyle["t_centered_fb1"]={};
	customstyle["t_centered_fb2"]={};
	customstyle["t_centered_fb3"]={};
	customstyle["t_centered_rs1"]={};
	customstyle["t_centered_rs2"]={};
	customstyle["t_centered_rs3"]={};

	customstyle["fb1"]={};
	customstyle["fb2"]={};
	customstyle["fb3"]={};
	customstyle["rs1"]={};
	customstyle["rs2"]={};
	customstyle["rs3"]={};
	customstyle["mm"]={};
	function appendCustomStyle(id,type,pos,value,replace){
		var rid = false;
		if (typeof id != "undefined"){
		rid = id;
		}
		if (rid&&typeof pos!="undefined") {
			if (customstyle["fb1"][rid]===undefined && 
			     customstyle["rs1"][rid]===undefined) {
				if (customstyle[type+"_"+pos+"_default"]===undefined){
					customstyle[type+"_"+pos+"_default"]={};
				}
				if (customstyle[type+"_"+pos+"_default"][rid]===undefined||replace){
				customstyle[type+"_"+pos+"_default"][rid]=value;
				}
			}
			if (customstyle["rs2"][rid]===undefined) {
				if (customstyle[type+"_"+pos+"_rs1"]===undefined){
					customstyle[type+"_"+pos+"_rs1"]={};
				}
				if (customstyle[type+"_"+pos+"_rs1"][rid]===undefined||replace){
				customstyle[type+"_"+pos+"_rs1"][rid]=value;
				}
			}
			if (customstyle["rs3"][rid]===undefined) {
				if (customstyle[type+"_"+pos+"_rs2"]===undefined){
					customstyle[type+"_"+pos+"_rs2"]={};
				}
				if (customstyle[type+"_"+pos+"_rs2"][rid]===undefined||replace){
				customstyle[type+"_"+pos+"_rs2"][rid]=value;
				}
			}
			if (customstyle["rs3"][rid]!==undefined) {
				if (customstyle[type+"_"+pos+"_rs3"]===undefined){
					customstyle[type+"_"+pos+"_rs3"]={};
				}
				if (customstyle[type+"_"+pos+"_rs3"][rid]===undefined||replace){
				customstyle[type+"_"+pos+"_rs3"][rid]=value;
				}
			}
			if (customstyle["fb2"][rid]===undefined) {
				if (customstyle[type+"_"+pos+"_fb1"]===undefined){
					customstyle[type+"_"+pos+"_fb1"]={};
				}
				if (customstyle[type+"_"+pos+"_fb1"][rid]===undefined||replace){
				customstyle[type+"_"+pos+"_fb1"][rid]=value;
				}
			}
			if (customstyle["fb3"][rid]===undefined) {
				if (customstyle[type+"_"+pos+"_fb2"]===undefined){
					customstyle[type+"_"+pos+"_fb2"]={};
				}
				if (customstyle[type+"_"+pos+"_fb2"][rid]===undefined||replace){
				customstyle[type+"_"+pos+"_fb2"][rid]=value;
				}
			}
			if (customstyle["fb3"][rid]!==undefined) {
				if (customstyle[type+"_"+pos+"_fb3"]===undefined){
					customstyle[type+"_"+pos+"_fb3"]={};
				}
				if (customstyle[type+"_"+pos+"_fb3"][rid]===undefined||replace){
				customstyle[type+"_"+pos+"_fb3"][rid]=value;
				}
			}
		}
	}
	function flexiBreak() {

		if (!findBreakpoints&&$("body").hasClass("breakpoints")){
			setTimeout(function () {
				moduleHeights();
				setFixedHeader();
				fixPropsHeights();
				setTimeout(function () {
					prepMobileHeader();

				}, 200);
			}, 400);
			return false;
		} 

		$("body").removeClass("mobile-header-enabled");
		if (findBreakpoints){
			var total = maxTestWidth-320;
			var current = total-(testWidth-320);
			var pc = current/total*100;
			var of360=pc*360/100;
			if (of360<1){
				of360=1;
			}
			if (of360>330){
				of360=330;
			}

			if (window.parent!=window.self){
				window.parent.setBreakpointPC(of360);
			} 
			if (navigator.userAgent.includes("Chrome")&&navigator.userAgent.includes("Macintosh")) {
				var minus="";
				of360=360-of360;
			} else {
				var minus="-";
			}
			$(".meter-1").css("stroke-dashoffset",minus+of360);
			var realTest = testWidth-60;
			$("html,body").css("width",testWidth+"px");
			$("body").addClass("calculatingBreakpoints");
			$("body > *:not(.breakpointload,#editInCMS)").css("width",realTest+"px");
		}

		$(".flexibreak-big").each(function(){
			var ok = true;
			var fb = false;
			var forceMobile=false;
			if ($("body").hasClass("hamburger-on")&&$("> .nav",$(this)).length){
				forceMobile=true;
				ok=false;
			}
			if ($(".flexibreak-container",$(this)).length) {
				var $container = $(".flexibreak-container",$(this));
				$container.removeClass("flexibreak1 flexibreak2 flexibreak3");
				fb=true;
			}
			var $row = $(this);
			$row.removeClass("rowscale1 rowscale2 rowscale3");

			$row.show();
			$("#"+$row.data("flexibreak-small")).hide();

			modules($(this));
			if (fb) {
				if (!testFlexiBreak($container)) {
					$container.addClass("flexibreak1");
					if (customstyle["fb1"][$(this).attr("id")]===undefined) {
					customstyle["fb1"][$(this).attr("id")]=testWidth;
					}
					if (!testFlexiBreak($container)) {
						$container.removeClass("flexibreak1 flexibreak2 flexibreak3");
						$container.addClass("flexibreak2");
						if (customstyle["fb2"][$(this).attr("id")]===undefined) {
						customstyle["fb2"][$(this).attr("id")]=testWidth;
						}
						if (!testFlexiBreak($container)) {
							$container.removeClass("flexibreak1 flexibreak2 flexibreak3");
							$container.addClass("flexibreak3");
							if (customstyle["fb3"][$(this).attr("id")]===undefined) {
							customstyle["fb3"][$(this).attr("id")]=testWidth;
							}
							if (!testFlexiBreak($container)) {
								ok = false;
							}
						}
					}
				}
			}

			var $t = $(this);
			if (ok){
				var rep = true;
			} else {
				var rep = false;
			}
			modules($t,rep);
			moduleHeights(rep);
			var shortTime=1;
			if (findBreakpoints){
			shortTime=25;
			}
			var longTime=250;
			if (findBreakpoints){
			longTime=250;
			}

			setTimeout(function () {
				if (ok){
				var $modules = $(".module:not(.width)",$row);
				if ($modules.overlaps($(".module:not(.width)",$row)).length) {
					$row.addClass("rowscale1");
					if (customstyle["rs1"][$t.attr("id")]===undefined) {
					customstyle["rs1"][$t.attr("id")]=testWidth;
					}
					setTimeout(function(){
						modules($t,rep);
						setTimeout(function(){
							if ($modules.overlaps($modules).length) {
								$row.addClass("rowscale2");
								if (customstyle["rs2"][$t.attr("id")]===undefined) {
								customstyle["rs2"][$t.attr("id")]=testWidth;
								}
								setTimeout(function(){
									modules($t,rep);
									setTimeout(function(){
										if ($modules.overlaps($modules).length) {
											$row.addClass("rowscale3");
											if (customstyle["rs3"][$t.attr("id")]===undefined) {
											customstyle["rs3"][$t.attr("id")]=testWidth;
											}
											setTimeout(function(){
												modules($t,rep);
												setTimeout(function(){
													if ($modules.overlaps($modules).length) {

														ok = false;
													}
												},shortTime);
											},shortTime);
										}
									},shortTime);
								},shortTime);
							}
						},shortTime);
					},shortTime);
				}
				}
				setTimeout(function(){
					if (!ok) {

						$row.hide();
						if (!$row.parent().children(":not(.flexibreak-big)").length) {
							$row.parent().hide().addClass("flex-wrap-hidden");
						}
						$("#"+$row.data("flexibreak-small")).show();
						modules($("#"+$row.data("flexibreak-small")),true);
						setTimeout(function () {
						$("#"+$row.data("flexibreak-small")+" .row").addClass('jsLoaded');
						}, 150);
						$("body").addClass("mobile-header-enabled");
						$("#mobile-menu-page-wrap").css("height",$("#mobileheader").height()-"px");
						if (customstyle["mm"][$t.attr("id")]===undefined) {
							if (forceMobile){
							customstyle["mm"][$t.attr("id")]=4000;
							} else {
							customstyle["mm"][$t.attr("id")]=testWidth;
							}
						}
					}
					if (!findBreakpoints){
						setTimeout(function () {
							moduleHeights();
							setFixedHeader();
							fixPropsHeights();
							setTimeout(function () {
								prepMobileHeader();

							}, 200);
						}, 400);
					}

					setTimeout(function () {
					$t.addClass('jsLoaded');
					}, 350);
				}, longTime);
			}, 100);


		});

		if (findBreakpoints){
			if (testWidth>minTestWidth){
				testWidth-=30;
				setTimeout(function(){flexiBreak()},300);
			}else{
				setTimeout(function () {
					$.ajax({ url: "/admin/pageActions.php?pageAction=saveContentStyle"
						,data: customstyle 
						,success: function(){
							if (window.parent!=window.self){
							window.parent.hideBreakpointLoad();
							}
							location.reload();

						}
					});
				},200);
			}
		}

	}


	function setRecentBlogWidths () {
		$(".recent_blog_articles").each(function(){
			if ($(this).width()<287) {
				$(this).addClass("narrow");
			} else {
				$(this).removeClass("narrow");
			}
		});
		var h = 0;
	}
	function imageMarginHelper () {
		$(".Right_Image:not(.align-left .Right_Image, .align-right .Right_Image, .align-center .Right_Image),.Left_Image:not(.align-right .Left_Image,.align-left .Left_Image,.align-center .Left_Image)").each(function(){
			if ($(this).next().length) {
				$(this).removeClass("enoughSpaceForText").removeClass("notEnoughSpaceForText");
				var avail = $(this).parent().innerWidth();
				var thisW = $("img",$(this)).width();
				var space = avail-thisW;
				if (space>140) {
					$(this).addClass("enoughSpaceForText");
				} else {
					$(this).addClass("notEnoughSpaceForText");
				}				
			}
		});
		$(".Caption_Below_Image").each(function(){
			$(".captionWrap",$(this)).css("width",$(this).find("img").width()+'px');
		});

	}
	function formStyleHelper() {

		$('.form-style-box.nooutlinefills').css('width',"auto");
		$('.form-style-box').css('float','left');
		$('.form-style-box.nooutlinefills').css('width',$('.form-style-box').width()+"px");
		$('.form-style-box').css('float','none');

		$('.forminnerwrapcentered').css('float','left');
		$('.forminnerwrapcentered').css('width',$('.forminnerwrapcentered').width()+"px");
		$('.forminnerwrapcentered').css('float','none');

	}

/*
Search select image	
*/

	function searchImageLoad() {
		if (window.location.hash.substr(0, 11)=="#showimage-") {
			var id = window.location.hash.split("-");
			$(".galleryitem"+id[1]).trigger("click");
		}
	};
/* 
 Banner height fix with floating header
*/
	function fixPropsHeights() {
		$(".banner-feature:not(.fill-row .banner-feature)",$(".with-scale-prop-widgets")).each(function(){
			var $outer = $(this).parents(".with-scale-prop-widgets");
			if (typeof $outer.data("min-height")!='undefined') {
				var visible = 0;
				if ($outer.data("min-height")=="window") {
					var wh = $(window).height();
				} else {
					var wh = parseFloat($outer.data("min-height"));
					if ($outer.data("scale-prop")) {
						if ($('body').hasClass('with-fixed-header')) {
							var visible = $('#header').height();
						} 
						
						var ratio = 1000 / wh;
						wh = $(window).width() / ratio;
					}
				}
				var $t = $(this);
				if ($t.find(".banner-feature-inner").offset().top<visible+gap/2||$t.height()<$t.find(".banner-feature-inner").height()) {
					$t.find(".banner-feature-inner").removeClass('banner-feature-force-bottom');
					if (typeof custombannergap != 'undefined') {
						var gap = custombannergap;
					}else {
						var gap = 60;
					}
					$(this).css('height','auto');
					$(this).css('min-height','auto');
					var h = $t.find(".banner-feature-inner").height() + visible+gap;
					if ($t.find(".banner-feature-inner").hasClass('banner-feature-content-middle')||$t.find(".banner-feature-inner").hasClass('banner-feature-content-top'))  {
						$t.find(".banner-feature-inner").addClass('banner-feature-force-bottom');
					}
					$t.css('height',h+'px');
				}


			}
		});
		$(".banner-feature-content-inner",$(".with-scale-prop-widgets")).each(function(){
			var $outer = $(this).parents(".with-scale-prop-widgets");
			if (typeof $outer.find('.row').data("min-height")!='undefined') {
				$(this).removeAttr('style');
				var visible = 0;
				if ($outer.find(".row").data("min-height")=="window") {
					var wh = $(window).height();
				} else {
					var wh = parseFloat($outer.find(".row").data("min-height"));
					if ($outer.find(".row").data("scale-prop")) {
						if ($('body').hasClass('with-fixed-header')) {
							var visible = $('#header').height();
						} 
						
						var ratio = 1000 / wh;
						wh = $(window).width() / ratio;
					}
				}
				var $t = $(this);
				$t.removeClass('banner-feature-force-bottom');
					if (typeof custombannergap != 'undefined') {
						var gap = custombannergap;
					}else {
						var gap = 60;
					}
				if ($t.offset().top<visible+gap/2) {
					var difference = visible-$t.offset().top+gap/2;
					$t.css('padding-top',difference+'px');
				}


			}
		});

	}
	function bannerHeightWithFloating() { 


		$('.with-scale-prop-widgets .row').each(function(){
			if (!$('> *',$(this)).hasClass('banner-feature')) {
			$(this).wrapInner('<div class="banner-feature-content"></div>');
			$(this).find(".banner-feature-content").wrapInner('<div class="banner-feature-content-inner"></div>');
			}
		});
		fixPropsHeights();
	};
/* 
 *
 * Folder Gallery Style
 * 
 */
	function sortGallery(galid, by, direction) {
	    $('.gallery-folder-' + galid + ' .folder-item').sort(function (a, b) {
		var contentA = $(a).attr(by);
		var contentB = $(b).attr(by);

		if (direction === "asc") {
		    return (contentA < contentB) ? -1 : (contentA > contentB) ? 1 : 0;
		} else {
		    return (contentA > contentB) ? -1 : (contentA < contentB) ? 1 : 0;
		}
	    }).appendTo($('.gallery-folder-' + galid));
	}

	function folderGalleryStylesLoad() { 
		$('.folder-search input').on('change keyup',function(){
			var galid = $(this).parents('.folder-filter').data('gallery-id');
			if ($(this).val()=="") {
			$('.gallery-folder-'+galid+' .folder-item').show();
			return false;
			}
			$('.gallery-folder-'+galid+' .folder-item').hide();
			$('.gallery-folder-'+galid+' .folder-item[data-for-search*="'+$(this).val().toLowerCase()+'"]').show();
		});
		$('.folder-filter a').click(function () {
		    var $p = $(this).parents('.folder-filter');
		    $('.current', $(this).parent()).removeClass('current');
		    $(this).addClass('current');

		    var galid = $(this).parents('.folder-filter').data('gallery-id');
		    var by = $('.folder-sort-by .current').data('by');
		    var direction = $('.folder-sort-direction .current').data('direction');

		    // Save the sorting state for this gallery in localStorage using its gallery ID
		    localStorage.setItem('sortingState-' + galid, JSON.stringify({
			sortBy: by,
			sortDirection: direction
		    }));

		    // Perform the sorting for the specific gallery
		    sortGallery(galid, by, direction);

		    return false;
		});
		$('.folder-filter').each(function () {
			var galid = $(this).data('gallery-id'); // Get the gallery ID for this filter

			// Retrieve the stored sorting state for this gallery, if it exists
			var sortingState = localStorage.getItem('sortingState-' + galid);

			if (sortingState) {
			    sortingState = JSON.parse(sortingState);

			    var by = sortingState.sortBy;
			    var direction = sortingState.sortDirection;

			    // Remove the 'current' class from all sorting controls in this gallery
			    $(this).find('.folder-sort-by .current').removeClass('current');
			    $(this).find('.folder-sort-direction .current').removeClass('current');


			    // Restore the 'current' classes for the appropriate elements
			    $(this).find('.folder-sort-by').find(`[data-by="${by}"]`).addClass('current');
			    $(this).find('.folder-sort-direction').find(`[data-direction="${direction}"]`).addClass('current');

			    // Perform the sorting for this specific gallery
			    sortGallery(galid, by, direction);
			}
		    });
	};

/*
	#'Default' Gallery Style (Lightbox with thumbs) - including support for prodcuts based on this gallery style

*/
	function galleryResize() {
		if ($("#lightboxContainer").length) {
			$('<img src="'+$("#lightboxInner img").attr("src")+'" style="display:none;max-width:10000px !important;width:auto;"/>').appendTo("html").on("load",function(){
				var originalWidth = $(this).width();
				var originalHeight = $(this).height();
				var ratio = originalWidth/originalHeight;
				var newMaxWidth = $(window).width()-80;
				var newMaxHeight = $(window).height()-30-$("#lightboxStuff").height();
				var newHeight = newMaxWidth/ratio;
				var newWidth = newMaxHeight*ratio;
				console.log(newHeight);
				console.log(newWidth);
				if (originalWidth>newMaxWidth) {
					var w = newMaxWidth;
					var h = newHeight;
				} else {
					var w = originalWidth;
					var h = originalHeight;
				}
				if (h>newMaxHeight) {
					var h = newMaxHeight;
					var w = newWidth;
				} 
				if (w<200){
					w=200;
					h=200/ratio;
				}

				$("#lightboxExtra1").stop(false,true).animate({
		        	width: w,
		        	height: h
				},300);
		        $("#lightboxStuff").stop(false,true).animate({
		        	width: w
		        },300);
		 	});
		}
	};
	function galleryReady() {
		$(".responsive_lightbox").click(function(){
			var clicked = $(this);
			var parentsId = $(this).parents(".galleryWrapper").attr("id");
			$(".lightboxCurrent").removeClass("lightboxCurrent");
			clicked.addClass("lightboxCurrent");
			$('embed, object, select',"#wrapper").css({ 'visibility' : 'hidden' });
			var formName = $(this).parents(".galleryWrapper").attr("id").replace(/gallery/, "");
			var prodid = $(this).parents(".galleryWrapper").data("prodid");

			$('body').append("<div id='lightboxOverlay'></div><div id='lightboxOuter'><div id='lightboxContainer'><div id='lightboxPrev'>&lt;</div><div id='lightboxNext'>&gt;</div><div id='lightboxExtra1'><div id='lightboxExtra2'><div id='lightboxExtra3'><div id='lightboxInner'></div></div></div></div><div id='lightboxStuff'><div id='lightboxShop'></div><div id='lightboxCaption'></div></div></div><div id='lightboxClose'>x</div></div>");

			$(".shopGalleryVariant[name="+formName+"].prodid"+prodid).appendTo("#lightboxShop").fadeIn();
			$("#lightboxShop form").append("<input type='hidden' name='pic_url' value='' />");
			//$("#lightboxOverlay").css("height",$(document).height()+"px");
			//$("#lightboxOuter").css("top",$(document).scrollTop()+100+"px");

			$("#lightboxContainer").css({
				opacity: 0,
				display: "block"
			});
			$("#lightboxContainer").animate({
				opacity: 1
			});
			function showImage (href,title,retina) {
				function cont4 () {
					function cont3 () {
						showNav();
						$("."+formName+"input").val(title);
						$("input[name=pic_url]",$("#lightboxShop form")).val(href);
						$("#lightboxCaption").html("<p>"+title+"</p>");
						$("#lightboxInner").html('<img srcset="'+retina+' 2x" src="'+href+'" alt="'+title+'" style="display:none;min-width:200px"/>');
						$("#lightboxInner img").css({
							opacity: 0,
							display: "block"
						});
						$("#lightboxInner img").animate({
							opacity: 1
						},300);
					}
					$('<img srcset="'+retina+' 2x" src="'+href+'" style="display:none;max-width:1000px !important;"/>').appendTo("body").on("load",function(){
					        var originalWidth = $(this).width();
							var originalHeight = $(this).height();
							var ratio = originalWidth/originalHeight;
							var newMaxWidth = $(window).width()-80;
							var newMaxHeight = $(window).height()-60;
							var newHeight = newMaxWidth/ratio;
							var newWidth = newMaxHeight*ratio;
							if (originalWidth>newMaxWidth) {
								var w = newMaxWidth;
								var h = newHeight;
							} else {
								var w = originalWidth;
								var h = originalHeight;
							}
							if (h>newMaxHeight) {
								var h = newMaxHeight;
								var w = newWidth;
							} 
							if (w<200){
								w=200;
								h=200/ratio;
							}
							$("#lightboxExtra1 img").css("min-width",w+"px");
							$("#lightboxExtra1").stop(false,true).animate({
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
								var retina = $(this).data("retina");
								showImage(href,title,retina);
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
								var retina = $(this).data("retina");
								showImage(href,title,retina);
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
				$("#lightboxInner").html('<img srcset="'+clicked.data('retina')+' 2x" src="'+clicked.attr("href")+'" alt="'+clicked.attr("title")+'" style="display:none;min-width:200px"/>');
				$("#lightboxInner img").css({
					opacity: 0,
					display: "block"
				});
				$("#lightboxInner img").animate({
					opacity: 1
				},300);

				showNav();

			}
			 var href = clicked.attr("href");
                         var title = clicked.attr("title");
                         var retina = clicked.data("retina");
                         $('<img srcset="'+retina+' 2x" src="'+href+'" style="display:none;max-width:1000px !important;"/>').appendTo("body").on("load",function(){
				var originalWidth = $(this).width();
					var originalHeight = $(this).height();
					var ratio = originalWidth/originalHeight;
					var newMaxWidth = $(window).width()-80;
					var newMaxHeight = $(window).height()-60;
					var newHeight = newMaxWidth/ratio;
					var newWidth = newMaxHeight*ratio;
					if (originalWidth>newMaxWidth) {

						var w = newMaxWidth;
						var h = newHeight;
					} else {
						var w = originalWidth;
						var h = originalHeight;
					}
					if (h>newMaxHeight) {
						var h = newMaxHeight;
						var w = newWidth;
					} 

					if (w<200){
						w=200;
						h=200/ratio;
					}
                                         $("#lightboxExtra1").stop(false,true).animate({
                                         width: w,
                                         height: h
                                 },300,cont);
                                 $("#lightboxStuff").stop(false,true).animate({
                                         width: w
                                 },300);
                            });
/*
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
			*/
			return false;
		});
	};



/*
	#'Montage' Gallery Style - including support for prodcuts based on this gallery style

*/
	function montageLoad() {
		setMontageMargin();
		$(".montageSlideshow").hide().css("width","0");
		setTimeout(function() {
			$(".montageSlideshow").css("width","100%").show();
		}, 1);
	};
	function montageReady() {
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
	};

	function montageResize() {
		setMontageMargin();
	};
	function setMontageMargin () {
		$(".imagesInMontage4").each(function(){
			var w = $(this).width();
			var p = $(".item1",$(this)).width()+$(".item2",$(this)).width();
			var g = w-p;
			$(".for-margin",$(this)).css("margin-top",g+"px");
		});
	}



/*
	#'Gallery with thumbs' Gallery Style - including support for prodcuts based on these gallery styles

*/
	function galThumbResize() {
		$(".enlarge img").fadeOut();
		clearTimeout(afterResizingGallery);
		afterResizingGallery = setTimeout(function () {
			afterResizeGallery();
		}, 400);
	};
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


/*
	#'Live Shopping Basket' Widget
*/
function showCounts() {
	$(".chekoutcount").load("/actions/ShowMiniBasket/"+lang+"&count=true",function(){
		modules();
	});
}
function bindMiniBasket () {
	var options = {
			success: function(){
			$("#miniBasket2").load("/actions/ShowMiniBasket/"+lang,function(){
				bindMiniBasket();
				$("#loading").stop(true,false).fadeOut();
				moduleHeights();
				setFixedHeader();
				
			});


		}  // post-submit callback
	};
	$("#miniBasket2 #updateQuantities").click(function(){
		$("#miniBasketForm").submit();
		return false;
	});
	$("#miniBasket2 .quantity").blur(function(e){
		if ($(e.target).attr("id")!="updateQuantities") {
			$("#miniBasketForm").submit();
		}
	});
	$("#miniBasket2 #miniBasketForm").submit(function(){
		$("#loading").fadeIn();

		$("#miniBasketForm").ajaxSubmit(options);
		return false;
	});
	$("#miniBasket2 .removeCell a").click(function(){
		$("#loading").fadeIn();
		$.ajax({ url: $(this).attr("href"), success: function(){
			$("#miniBasket2").load("/actions/ShowMiniBasket/"+lang,function(){
			bindMiniBasket();
			$("#loading").stop(true,false).fadeOut();
			moduleHeights();
			setFixedHeader();
			
			});
			showCounts();
		}});
		return false;
	});
}
	function productQuanReady() {
		$('.product-quantity-input').on("click",function(){
			$(this)[0].select();
		});
		$('.product-quantity-input').on("keyup change",function(){
			
			if ($(this).parents(".addToBasketForm.multi.only-sell-if-in-stock").length && typeof $("option:selected",$(this).parents(".addToBasketForm.multi")).attr("data-stock") != "undefined") {

				if (parseInt($("option:selected",$(this).parents(".addToBasketForm.multi")).attr("data-stock"))<parseInt($(this).val())) {
					$(this).val(parseInt($("option:selected",$(this).parents(".addToBasketForm.multi")).attr("data-stock")));
				}
			} else {
				if (typeof $(this).attr("data-max")!='undefined') {
					if (parseInt($(this).val())>$(this).data("max")) {
						$(this).val($(this).data("max"));
					}
				}
				
			}
			if ($(this).val()<1) {
				$(this).val(1);
			}
			var newv = $(this).val();
			if ($(this).parents(".simpleProduct").length) {
				var hrefstr = $(".button a",$(this).parents(".simpleProduct")).attr("href");
				var href = hrefstr.split("&");
				var newhref = '';
				if (href.length>1 && hrefstr.indexOf("&quantity=")>0) {

					for (var i = 0; i < href.length; i++) {

						if (newhref!="") {
							newhref+="&";
						}
						if (href[i].indexOf("quantity=")==0) {
							newhref += "quantity="+newv;
						} else {
							newhref += href[i];							
						}

						
					}
				} else {
					newhref = hrefstr+"&quantity="+newv;
				}
				$(".button a",$(this).parents(".simpleProduct")).attr("href",newhref);
				
			}
		});
		$(".product-quantity-plus").on("click",function(){
			var c = parseInt($("input",$(this).parent()).val());
			c = c+1;
			$("input",$(this).parent()).val(c).trigger("change");
		});
		$(".product-quantity-minus").on("click",function(){
			var c = parseInt($("input",$(this).parent()).val());
			c = c-1;
			$("input",$(this).parent()).val(c).trigger("change");
		});
		if (!$('body').hasClass('accessible-mode')) {
			$(".form .submit_form").before("<img src=\"/graphics/form-load.gif\" alt=\"\" id=\"loader\"/>");
		}
		if ($('.formUsedInCheckout').length) {
			$("#paymentGatewayForm").css("float","none");
		}
		showCounts();
		$("#miniBasket2").load("/actions/ShowMiniBasket/"+lang,function(){
			bindMiniBasket();
			moduleHeights();
			setFixedHeader();
			
		});
		if ($("#miniBasket2").length) {
			$("#miniBasketDone #dismiss").click(function(){
				$('#miniBasketDone').fadeOut();
				return false;
			});
			$(".addToBasketLink").click(function(){
				$("#loading").fadeIn();
				$("#bigloader").fadeIn();
				dataLayer.push({"event":"addToBasket","productID":$(this).parents(".simpleProduct").data("datalayer-productid"),"productPrice":$(this).parents(".simpleProduct").data("datalayer-price"),"productName":$(this).parents(".simpleProduct").data("datalayer-name")});
				$.ajax({ url: $(this).attr("href"), success: function(){
					$("#miniBasket2").load("/actions/ShowMiniBasket/"+lang,function(){
					bindMiniBasket();
					$("#loading").stop(true,false).fadeOut();
					$("#bigloader").stop(true,false).fadeOut();
					$("#miniBasketDone").stop(true,false).fadeIn();
					moduleHeights();
					setFixedHeader();
					
					});
					showCounts();

				}});
				return false;
			});
			$(".cms-booking-product-form").unbind('submit').submit(function(){

				var $form=$(this);
				var fail=false;
				$(".personal-details-form:visible .required:visible",$(this)).each(function(){
					if ($(this).val()=="") {
						fail = true;
					}
				});
				if (fail) {
						alert($form.data('fail-msg'));
						return false;
				}
				$(".personal-details-form:hidden").remove();
				var days = 0;
				$(".cms-booking-product-days-input",$(this)).each(function(){
					days = days+JSON.parse($(this).val()).length;
				});
				if (days==0) {
					$(".cms-booking-product-select-day",$(this)).slideDown();
					return false;
				}
				$("#loading").fadeIn();
				$("#bigloader").fadeIn();
				$(this).ajaxSubmit({success:function() { 
					$("#miniBasket2").load("/actions/ShowMiniBasket/"+lang,function(){
						bindMiniBasket();
						$("#loading").stop(true,false).fadeOut();
						$("#bigloader").stop(true,false).fadeOut();
						$("#loader:visible").fadeOut();
						$("#bigloader:visible").fadeOut();
						$("#miniBasketDone").stop(true,false).fadeIn();
						moduleHeights();
						setFixedHeader();
						
					});
					showCounts();
				}});
				return false;
			});
			$(".addToBasketForm").unbind().submit(function(){
				$("#loading").fadeIn();
				$("#bigloader").fadeIn();
				if ($(this).find("input[name=donation_amount]")) {
					var pp = $(this).find("input[name=donation_amount]").val();
				}
				if ($(this).find("select[name=variant_price]")) {
					var pp = $(this).find("select[name=variant_price] option:checked").data("datalayer-price");
					dataLayer.push({"event":"addToBasket","productID":$(this).data("datalayer-productid"),"productPrice":pp,"productName":$(this).parents(".simpleProduct").data("datalayer-name"),"variantName":$(this).find("select[name=variant_price]").val()});
				} else {
					dataLayer.push({"event":"addToBasket","productID":$(this).data("datalayer-productid"),"productPrice":pp,"productName":$(this).parents(".simpleProduct").data("datalayer-name")});
				}

				$(this).ajaxSubmit({success:function() { 
					$("#miniBasket2").load("/actions/ShowMiniBasket/"+lang,function(){
						bindMiniBasket();
						$("#loading").stop(true,false).fadeOut();
						$("#bigloader").stop(true,false).fadeOut();
						$("#loader:visible").fadeOut();
						$("#bigloader:visible").fadeOut();
						$("#miniBasketDone").stop(true,false).fadeIn();
						moduleHeights();
						setFixedHeader();
						
					});
					showCounts();
				}});
				return false;
			});
		}
	};

/*
	#'Shopping Basket' Widget
*/
	function qtyUpdate(){
		$("#quantityForm").submit();
	}
	window.qtyTimeout;
		let ss_autocomplete;
		let ss_address1Field;
		let ss_address2Field;
		let ss_postalField;

		function ss_initAutocomplete() {
		  ss_address1Field = document.querySelector(".ss_autocomplete_street");
		  ss_address2Field = document.querySelector(".ss_autocomplete_town");
		  ss_postalField = document.querySelector(".ss_autocomplete_zip");
		  // Create the autocomplete object, restricting the search predictions to
		  // addresses in the US and Canada.
		  ss_autocomplete = new google.maps.places.Autocomplete(ss_address1Field, {
		    componentRestrictions: { country: $.parseJSON($("#autocomplete_countries").val()) },
		    fields: ["address_components"],
		    types: ["address"],
		  });
		  ss_address1Field.focus();
		  // When the user selects an address from the drop-down, populate the
		  // address fields in the form.
		  ss_autocomplete.addListener("place_changed", ss_fillInAddress);
		}

		function ss_fillInAddress() {
		  // Get the place details from the autocomplete object.
		  const place = ss_autocomplete.getPlace();
		  let address1 = "";
		  let postcode = "";

		  // Get each component of the address from the place details,
		  // and then fill-in the corresponding field on the form.
		  // place.address_components are google.maps.GeocoderAddressComponent objects
		  // which are documented at http://goo.gle/3l5i5Mr
		  for (const component of place.address_components) {
		    // @ts-ignore remove once typings fixed
		    const componentType = component.types[0];

			console.log(componentType+" "+component.long_name);
		    switch (componentType) {
		      case "street_number": {
			address1 = `${component.long_name} ${address1}`;
			break;
		      }

		      case "route": {
			address1 += component.short_name;
			break;
		      }

		      case "postal_code": {
			postcode = `${component.long_name}${postcode}`;
			break;
		      }

		      case "postal_code_suffix": {
			postcode = `${postcode}-${component.long_name}`;
			break;
		      }
		      case "administrative_area_level_2": {
			    $(".ss_autocomplete_state").val(component.long_name);
			break;
		      }
		      case "postal_town": {
			    $(".ss_autocomplete_city").val(component.long_name);
			break;
		      }
		      case "locality": {
			    $(".ss_autocomplete_town").val(component.long_name);
			break;
		      }
		      case "country":
			$(".ss_autocomplete_country option").each(function(){
				if ($(this).text().toLowerCase()==component.long_name.toLowerCase()){
					$(".ss_autocomplete_country").val($(this).attr("value"));
				}
			});
			break;
		    }
		  }

		  ss_address1Field.value = address1;
		  ss_postalField.value = postcode;
		  // After filling the form with address components from the Autocomplete
		  // prediction, set cursor focus on the second address line to encourage
		  // entry of subpremise information such as apartment, unit, or floor number.
		  ss_address2Field.focus();
		}

		window.ss_initAutocomplete = ss_initAutocomplete;

		// end address lookup 
	function basketReady() {
		$("#goToStep2").submit(function(){
			if ($("select[name=chb_sh]").length && $("select[name=chb_sh]").val()==""){
			alert("Please select a shipping method to continue");
				return false;
			}
		});
		$(".shippingDisp span").text($(".shippingDropdownWrap option:selected").text());
		$("#shipping_name").val($("select[name=chb_sh] option:selected").text());
		if ($("select[name=chb_sh]").length){
			$(".shippingDisp").addClass("withSelect");
		}
		$(".gatewaychange").change(function(){
			var t = $(".gatewaychange option:selected").text();
			$(this).prev().text(t);
		});
		$(".quantityDropdown").each(function(){
			if (parseInt($(this).find(".dropdownDisp").text())<10){
			$(this).show();
			$(this).next().hide();
			}
		});
		$(".quantityWrapper input").keyup(function(e){
			if (isFinite(e.key)){
			clearTimeout(window.qtyTimeout);
			window.qtyTimeout = setTimeout(function(){
				qtyUpdate();
			},1000);
			}
		});
		$(".quantityWrapper input").change(function(){
			$(this).parents("form").submit();
		});
		$(".quantityDropdown select").change(function(){
			var upd = $(this).data("update");
			if ($(this).val()=="10+"){
				$(this).parents(".quantityDropdown").hide();
				$("#"+upd).parents(".quantityWrapper").show().find("input").focus();
				$("#"+upd).val("10");
			} else {
				$(".dropdownDisp",$(this).parents(".quantityDropdown")).text($(this).val());
				$("#"+upd).val($(this).val());
				$(this).parents("form").submit();
			}

		});
		$('select#country').change(function(){
			var c = $(this).val().toLowerCase();
			 $('.unhide-country-switch').each(function(){
				$(this).fadeTo("fast",1);
					$(this).prop("disabled",0);
					 if ($(this).hasClass('was-required')){
						$(this).addClass('required');
					 }
			 });
			$('.country-switch').each(function(){
				if (typeof $(this).attr('data-'+c) != 'undefined'){
					$(this).text($(this).data(c));
				}else{

					$(this).text($(this).data('orig'));
				}
			});
			$('.hide-if-'+c).each(function(){
				$(this).fadeTo("fast",0.5);
				if ($(this)[0].nodeName.toLowerCase()=="input") {
					$(this).prop("disabled",true);
					if ($(this).hasClass('required')){
						$(this).removeClass('required');
						$(this).addClass('was-required');
					} 
				}
			});
		}).trigger("change");
	}
	/*
	
	# Searchable Subpage Index

	*/

	function kbReady() {
		$("#kbSearchInput").keyup(function(){
			$("#contactform textarea").val($(this).val());
			if ($(this).val()!="") {
				$("#kbIndex").addClass("searching");
			} else {
				$("#kbIndex").removeClass("searching");
			}
			
			$(".searchShow,.searchShowTemp").removeClass("searchShow");
			$(".revealH3").removeClass("revealH3");
			$(".revealUL").removeClass("revealUL");
			$(".revealMore").removeClass("revealMore");
			
			var words = $(this).val().split(" ");
			var $i;
			$(".kbItem1,.kbItem2").attr("data-count","0");
			var highestCount=0;
			for (var i = words.length - 1; i >= 0; i--) {
				$i=$(".kbItem1[data-keywords*='"+words[i].toLowerCase().replace('$','\\$').replace('.','\\.')+"'],.kbItem2[data-keywords*='"+words[i].toLowerCase().replace('$','\\$').replace('.','\\.')+"']");
				if ($i.length) {
					$i.addClass("searchShowTemp");
					$i.each(function(){
						var count = parseInt($(this).attr("data-count"))+1;
						if (count>highestCount) {
							highestCount=count;
						}
						$(this).attr("data-count",count);
					});
				}
			};
			$(".searchShowTemp").filter(function(){
				return (parseInt($(this).attr("data-count"))<highestCount);
			}).removeClass("searchShowTemp");
			$(".searchShowTemp").removeClass("searchShowTemp").addClass("searchShow");
			$(".searchShow").parents(".kbItem").addClass("revealH3");
			$(".searchShow").parents(".kbItem1").addClass("revealUL");
			$(".searchShow.hidden").parent().addClass("revealMore");

		});
		$(".kbItem1.hasSubs > a").click(function(){
			if ($(this).parent().hasClass("showingSubUL")) {
				$(this).parent().removeClass("showingSubUL");
			} else {
				$(this).parent().addClass("showingSubUL");
			}
			
			return false;
		});
		$(".kbAll a").click(function(){
			if ($(this).parents("ul").hasClass("revealHidden")) {
				$(this).parents("ul").removeClass("revealHidden");
				$(this).html($(this).attr("data-lang-open"));
			} else {
				$(this).parents("ul").addClass("revealHidden");	
				$(this).html($(this).attr("data-lang-close"));
			}
			return false;
		});

       if (window.self == window.top) {
		$("#kbSearchInput").focus();	       	
       }

		$("#clearKBSearch").click(function(){
			$("#kbSearchInput").val("").trigger("keyup");
		});
		$("#contactSupport a").click(function(){
			$("#hideWhenContact").hide();
			$(this).parent().hide();
			$(this).parent().next().addClass("revealed");
			return false;
		});
	};
	/*
	
	# Searchable Preview Based Subpage Index

	*/

	function pbReady() {
		$("#pbSearchInput").keyup(function(){
			
			if ($(this).val()!="") {
				$("#pbIndex").addClass("searching");
			} else {
				$("#pbIndex").removeClass("searching");
			}
			
			$(".searchShow,.searchShowTemp").removeClass("searchShow");
			
			
			var words = $(this).val().split(" ");
			var $i;
			$(".pbItem").attr("data-count","0");
			var highestCount=0;
			for (var i = words.length - 1; i >= 0; i--) {
				$i=$(".pbItem[data-keywords*="+words[i].toLowerCase().replace('$','\\$').replace('.','\\.')+"]");
				if ($i.length) {
					$i.addClass("searchShowTemp");
					$i.each(function(){
						var count = parseInt($(this).attr("data-count"))+1;
						if (count>highestCount) {
							highestCount=count;
						}
						$(this).attr("data-count",count);
					});
				}
			};
			$(".searchShowTemp").filter(function(){
				return (parseInt($(this).attr("data-count"))<highestCount);
			}).removeClass("searchShowTemp");
			$(".searchShowTemp").removeClass("searchShowTemp").addClass("searchShow");
		});
		$(".kbItem1.hasSubs > a").click(function(){
			if ($(this).parent().hasClass("showingSubUL")) {
				$(this).parent().removeClass("showingSubUL");
			} else {
				$(this).parent().addClass("showingSubUL");
			}
			
			return false;
		});

       if (window.self == window.top) {
		$("#pbSearchInput").focus();	       	
       }

		$("#clearPBSearch").click(function(){
			$("#pbSearchInput").val("").trigger("keyup");
		});
		
		
	};
	

/*

	#Livechat Status Widget
*/


	function livechatReady() {
		return false;
		if(typeof sDMT=='undefined') {
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
		}

		$(".startConvo").click(function () {
			href = this.href;
			var popup = window.open(href,'','toolbar=0,scrollbars=0,location=0,statusbar=0,menubar=0,resizable=0,width=311,height=349');
			return false;
		});

	};

/*
	#Responsive video helper for jPlayer

*/

	var afterResizing;
	var windowwidth;
	function responsiveVideoResize() {
			
		if (!$(".jplayerInit .jplayer").hasClass("playing")) {
			if ($("#videoMPPopup .jplayer").length) {
				$("#mp_lightbox_outer").fadeOut();
				if ($("#videoMPPopup .jplayer").hasClass("playing")) {
					$("#videoMPPopup .jplayer").jPlayer("stop");
				}
				
			}
			clearTimeout(afterResizing);
			if (!$(".jp-video-full").length) {

				afterResizing = setTimeout(function () {
					if ($(".jplayerInit").length && !$(".jp-video-full").length) {

						$(".jplayerInit .jplayer").jPlayer("destroy");
						$(".jplayerInit").each(function(){
							var img = $(this).attr("data-poster");
							var vid = $(this).attr("data-vid");
							var $t = $(this).parent();
							$(this).remove();
							$t.html("<a href='"+vid+"'><img src='"+img+"' /></a>");
							$t.waitForImages(function(){
								afterResize();
							});
						});

					}
				}, 100);
			}
		}
	};
function afterResize() {
	var jplayerVideoCounter=0;
	$(".bpe_video:not(.Popup_Video) img").each(function(){
		if (!$(".jplayerInit",$(this).parents(".bpe_video")).length) {

		var width = $(this).width();
		var height = $(this).height();
		var image = $(this).attr("src");
			var video = $(this).parent().attr("href");
			$(this).parent().after("<div id=\"video"+jplayerVideoCounter+"\" class='jplayerInit' data-poster='"+image+"' data-vid='"+video+"'>"+playerHTML+"</div>");
			$(this).parent().remove();

			makeVideo("video"+jplayerVideoCounter,width,height,image,video,false,false);

			jplayerVideoCounter++;
			}
		});
	}
/*
	#Responsive video helper for JWPlayer

*/

	var afterResizingJW;
	function responsiveVideoJWResize () {
		if ($(window).width()==windowwidth) {
			return false;
		}
		if (window.jwplayer) {
			var i = 0;
			while (true) {
			    var player = jwplayer("video"+i);
			    if (!player)
			        break;
					player.remove();
			    i++;
			}
			$(".bpe_video:not(.Popup_Video)").show();

			clearTimeout(afterResizingJW);
			afterResizingJW = setTimeout(function () {
				afterResizeJW();
			}, 1000);
		}

	};
	function afterResizeJW() {
		var JWPlayerVideoCounter=0;
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
	function calendarReady() {
		$(".calendar_responsive_list_mode").on("click",".list_event",function(e){
			var $t = $(this);
			if ($(".eventdetails",$t).length) {
				$("body").append("<div id='eventPopupWrapper'><div id='eventPopup'><div id='closeEventPopup'>x</div><div id='eventInfo'></div></div></div>");

				$(".eventdetails",$t).clone().appendTo($("#eventInfo"));

				var h = $("#eventPopup").outerHeight() / 2;
				$("#eventPopup").css("margin-top","-"+h+"px");

				$("#closeEventPopup").click(function(){
					$("#eventPopupWrapper").remove();
				});
				return false;
			}
		});
		$(".calendar").on("click",".event",function(e){
			var $t = $(this);
			if ($(window).width()>768 && $(".eventdetails",$t).length) {
				$("body").append("<div id='eventPopupWrapper'><div id='eventPopup'><div id='closeEventPopup'>x</div><div id='eventInfo'></div></div></div>");

				$(".eventdetails",$t).clone().appendTo($("#eventInfo"));

				var h = $("#eventPopup").outerHeight() / 2;
				$("#eventPopup").css("margin-top","-"+h+"px");

				$("#closeEventPopup").click(function(){
					$("#eventPopupWrapper").remove();
				});
				return false;
			}
		});
		$(".calendar").on("click",".hasEvents",function(e){
			
				if ($(window).width()<=768) {
					$("body").append("<div id='eventPopupWrapper'><div id='eventPopup'><div id='closeEventPopup'>x</div><div id='eventInfo'></div></div></div>");

					$(".eventdetails",$t).clone().appendTo($("#eventInfo"));

					var h = $("#eventPopup").outerHeight() / 2;
					$("#eventPopup").css("margin-top","-"+h+"px");

					$("#closeEventPopup").click(function(){
						$("#eventPopupWrapper").remove();
					});
					return false;
				}
			
		});

	};

/*
	#Full width banner + Disclosures

*/
	function bannerReady() {
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
		$("h1,h2,h3,h4,p,li",".disclose").filter(":not(.Button_Small,.Button_Medium,.Button_Large)").wrapInner("<span class=\"disclosure-reveal\"></span>");
	};

/*

 	#Blog Loop

*/
	/*
	$(document).ready(function(){
		$(".blogItemLoop").each(function(){
			if (typeof $(this).attr("data-pic") != 'undefined') {
				$(this).backstretch($(this).attr("data-pic"));
			}
			$("h1,h2,h3,h4,p,li",$(this)).filter(":not(.Button_Small,.Button_Medium,.Button_Large,.blogDate)").wrapInner("<span></span>");
		});
	});
	*/

/*
	#Countdown

*/
	function countdownReady() {
		if (typeof countdownReady_core != "undefined"){
			countdownReady_core();
		}

		
	};

function slideshowReady() {
	if (typeof slideshowReady_core != "undefined"){
		slideshowReady_core();
	}
}

function galThumbReady() {
	if (typeof galThumbReady_core != "undefined"){
		galThumbReady_core();
	}
}

function carouselReady() {
	if (typeof carouselReady_core != "undefined"){
		carouselReady_core();
	}
}

function backstretches() {
	if (typeof backstretches_core != "undefined"){
		backstretches_core();
	}
}




// If you add JWPlayer to your installation you can set some basic config for the player here.
var videoControlBar = "over";
var videoScreenColor = "#FFFFFF";

/* 
#Consent banner
*/
function updateConsentBasedContent() {
	insertYT();

	if (typeof mapsMarkersReady_core!= "undefined"){
		mapsMarkersReady_core();
	}
	if (window.consent.functional){
		$(".functional-iframe-check-consent").each(function(){
			$(this).html('<iframe src="'+$(this).data("iframe-src")+'" frameborder="0" allowfullscreen></iframe>').removeClass("styleBox");
		});
	}
	$(".consent-container").each(function(){
		var purp = $(this).data("consent-purpose");
		if (($(this).hasClass("consent-container-require-consent")&&consent[purp])||!$(this).hasClass("consent-container-require-consent")) {
			$(this).html($(this).data("content"));
			moduleHeights();

		}
	});
}
function setConsent(consent) {
	const consentMode = {
	    'ad_storage': consent.advertising ? 'granted' : 'denied',
	    'ad_user_data': consent.advertising ? 'granted' : 'denied',
	    'ad_personalisation': consent.advertising ? 'granted' : 'denied',
	    'analytics_storage': consent.performance ? 'granted' : 'denied',
	    'personalization_storage': consent.functional ? 'granted' : 'denied',
	};
	gtag('consent', 'update', consentMode);
	window.consent=consent;
	localStorage.setItem('consent', JSON.stringify(consent));
	updateConsentBasedContent();
}
function consentReady() {
	$('a[href="#cookies"]').click(function(){
		$("#consent_banner").show();
		return false;
	});

	if (localStorage.getItem('consent') === null) {
		$("#consent_banner").show();
	}

	$(".show-cookie-banner").click(function(){
		$("#consent_banner").show();
		return false;
	});
	if (window.consent.functional){
		$(".consent-functional").addClass("on");
	}
	if (window.consent.performance){
		$(".consent-performance").addClass("on");
	}
	if (window.consent.advertising){
		$(".consent-advertising").addClass("on");
	}
	$(".consent-item:not(.consent-disabled)").click(function(){
		if ($(this).hasClass("on")) {
			$(this).removeClass("on");
			$(this).text("Opted-out");
		} else {

			$(this).text("Allowed");
			$(this).addClass("on");
		}
		$("#consent_current").text("Save selection");

	});
	$("#consent_current").click(function(){
		setConsent({
			functional: $(".consent-functional").hasClass("on"),
			performance: $(".consent-performance").hasClass("on"),
			advertising: $(".consent-advertising").hasClass("on")
		    });
		setTimeout(function(){
			$("#consent_banner").fadeOut(300);
		},300)
		return false;
	});
	$("#consent_allow").click(function(){
		$("#consent_banner .consent-item:not(.on)").trigger("click");
		setTimeout(function(){
			setConsent({
				functional: true,
				performance: true,
				advertising: true
			    });
			$("#consent_banner").fadeOut(300);
		},300)
		return false;
	});
};

