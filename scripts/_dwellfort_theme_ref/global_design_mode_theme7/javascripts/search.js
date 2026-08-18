function removeFromBasket(item){
 var readi = 1;
 var writei = 1;
 var cont = true;
	while (cont===true) {
		if (item==readi){
			
			eraseCookie('bookname_'+readi);
			eraseCookie('available_'+readi);
			eraseCookie('roomid_'+readi);
			eraseCookie('propkey_'+readi);
			eraseCookie('currency_'+readi);
			eraseCookie('amount_'+readi);
			eraseCookie('numAdult_'+readi);
			eraseCookie('numChild_'+readi);
			eraseCookie('offer_'+readi);
			eraseCookie('upsells_'+readi);
			eraseCookie('optional_'+readi);
			eraseCookie('deposit_'+readi);
			eraseCookie('linksrez_rate_'+readi);
			eraseCookie('linksrez_hotel_'+readi);
			eraseCookie('linksrez_code_'+readi);
			eraseCookie('lodgify_houseid_'+readi);
			eraseCookie('lodgify_roomtypeid_'+readi);
			eraseCookie('coupon_'+readi);
			eraseCookie('start_'+readi);
			eraseCookie('end_'+readi);
			eraseCookie('topay_'+readi);
			eraseCookie('total_topay_'+readi);
			eraseCookie('deposit_topay_'+readi);

			readi++;
			continue;
		}
		if (readCookie("bookname_"+readi)){

			createCookie("bookname_"+writei,readCookie('bookname_'+readi));
			createCookie("available_"+writei,readCookie('available_'+readi));
			createCookie("roomid_"+writei,readCookie('roomid_'+readi));
			createCookie("propkey_"+writei,readCookie('propkey_'+readi));
			createCookie("currency_"+writei,readCookie('currency_'+readi));
			createCookie("amount_"+writei,readCookie('amount_'+readi));
			createCookie("numAdult_"+writei,readCookie('numAdult_'+readi));
			createCookie("numChild_"+writei,readCookie('numChild_'+readi));
			createCookie("offer_"+writei,readCookie('offer_'+readi));
			createCookie("upsells_"+writei,readCookie('upsells_'+readi));
			createCookie("optional_"+writei,readCookie('optional_'+readi));
			createCookie("deposit_"+writei,readCookie('deposit_'+readi));
			createCookie("linksrez_rate_"+writei,readCookie('linksrez_rate_'+readi));
			createCookie("linksrez_hotel_"+writei,readCookie('linksrez_hotel_'+readi));
			createCookie("linksrez_code_"+writei,readCookie('linksrez_code_'+readi));
			createCookie("lodgify_houseid_"+writei,readCookie('lodgify_houseid_'+readi));
			createCookie("lodgify_roomtypeid_"+writei,readCookie('lodgify_roomtypeid_'+readi));
			createCookie("coupon_"+writei,readCookie('coupon_'+readi));
			createCookie("start_"+writei,readCookie('start_'+readi));
			createCookie("end_"+writei,readCookie('end_'+readi));
			createCookie("topay_"+writei,readCookie('topay_'+readi));
			createCookie("total_topay_"+writei,readCookie('total_topay_'+readi));
			createCookie("deposit_topay_"+writei,readCookie('deposit_topay_'+readi));

			writei++;
			readi++;
		} else {
			readi--;
			eraseCookie('bookname_'+readi);
			eraseCookie('available_'+readi);
			eraseCookie('roomid_'+readi);
			eraseCookie('propkey_'+readi);
			eraseCookie('currency_'+readi);
			eraseCookie('amount_'+readi);
			eraseCookie('numAdult_'+readi);
			eraseCookie('numChild_'+readi);
			eraseCookie('offer_'+readi);
			eraseCookie('upsells_'+readi);
			eraseCookie('optional_'+readi);
			eraseCookie('deposit_'+readi);
			eraseCookie('linksrez_rate_'+readi);
			eraseCookie('linksrez_hotel_'+readi);
			eraseCookie('linksrez_code_'+readi);
			eraseCookie('lodgify_houseid_'+readi);
			eraseCookie('lodgify_roomtypeid_'+readi);
			eraseCookie('coupon_'+readi);
			eraseCookie('start_'+readi);
			eraseCookie('end_'+readi);
			eraseCookie('topay_'+readi);
			eraseCookie('total_topay_'+readi);
			eraseCookie('deposit_topay_'+readi);
			cont=false;
		}

	}
}
function getPrice($form) {
	/*
	if ($form.find("input[name=linksrez_code]").val()!=''){

		$form.find(".unavailable").hide();
		$form.find(".priceandbutton").show();
		$form.find(".bookingPrice").parent().show();
		$form.find(".bookingPrice").html("Getting price");
		$form.find(".offerBox").hide();
		$.ajax({
		   type: "POST",
		   url: "?ajax=1&app=1&nocache=1",
		   success: function(data)
		   {
	     

				var price = data;
				var offer = 1;
				 if (typeof price!="undefined") {
					$(".offer"+offer).find(".bookingPrice").html(price).parent().show();
					 
					$form.find(".percenttax").each(function(){
					var toadd = $(this).data("pc")*parseFloat(price.replace(/[^\d.-]/g, ''))/100;
					$(this).text(toadd.toFixed(2));
					});
					$(".offer"+offer).find(".offer").prop("disabled",false);
					$(".offer"+offer).find(".messages").text("").hide();
					$(".offer"+offer).show();
					$("#amount").val(parseFloat(price.replace(/[^\d.-]/g, '')));
				} 
			   setTimeout(function(){

				$(".offer:not(:disabled):first").attr("checked","true");
				if ($(".offer:not(:disabled)").length==0){
					$form.find(".priceandbutton").hide();
					$form.find(".unavailable").show();
					$form.find(".book_stay_button").hide();
				}else{
					$form.find(".priceandbutton").show();
					$form.find(".unavailable").hide();
					$form.find(".book_stay_button").show();

				}
				stickyLoad();
			   },100);

		   }
		});
		return false;
	}
	*/
	$form.find(".unavailable").hide();
	$form.find(".priceandbutton").show();
	$form.find(".bookingPrice").parent().show();
	$form.find(".bookingPrice").html("Getting price");
	$form.find(".offerBox").hide();
	$.ajax({
	   type: "POST",
	   url: $form.attr("action")+"?ajax=1",
	   data: $form.serialize(), // serializes the form's elements.
	   success: function(data)
	   {

		try {
			var ret = JSON.parse(data);
		} catch(e) {
			console.error("JSON parse error in getPrice:", e);
			console.error("Response data:", data);
			return;
		}
		   for (let index = 0; index < ret.length; ++index) {
			var element = ret[index];
			//var offer = element['offer'];
			var offer = index+1;
			var d = element['data'];
			var sym="&dollar;";
			if (d.currency=="GBP"){
				sym="&pound;";
			 }
			 if (d.currency=="EUR"){
				sym="&euro;";
			 }
			 if (typeof d.price!="undefined") {
				$(".offer"+offer).find(".bookingPrice").html(sym+d.price.toFixed(2)).parent().show();
				 
				$form.find(".percenttax").each(function(){
				var toadd = $(this).data("pc")*d.price/100;
				$(this).text(toadd.toFixed(2));
				});
				$(".offer"+offer).find(".offer").prop("disabled",false);
				$(".offer"+offer).find(".messages").text("").hide();
				$(".offer"+offer).show();
			} else {
				if(typeof d.messages!="undefined"&&d.messages[0].includes("minimum nights allowed")){
					var min = d.messages[0].split(" = ");
					min = min[1];
					var messageTemplate = $(".propSearchForm").data("minimum-stay-message");
					var message = messageTemplate.replace("{{MIN}}", min);
					$(".offer"+offer).find(".messages").text(message).show();
					$(".offer"+offer).show();
				}else{
					$(".offer"+offer).hide();
				}
				$(".offer"+offer).find(".offer").prop("disabled",true);
				$(".offer"+offer).find(".bookingPrice").parent().hide();
			}
	    	}
		   setTimeout(function(){

			$(".offer:not(:disabled):first").attr("checked","true");
			if ($(".offer:not(:disabled)").length==0){
				$form.find(".priceandbutton").hide();
				$form.find(".unavailable").show();
				$form.find(".book_stay_button").hide();
			}else{
				console.log("Showing price");
				$form.find(".priceandbutton").show();
				$form.find(".unavailable").hide();
				$form.find(".book_stay_button").show();

			}
			stickyLoad();
			   moduleHeights();
		   },200);

	   }
	});
};

$(document).keyup(function(e) {
	if (e.key === "Escape") { 
		$("#closeAllImagesProp").trigger("click");
	}
});
function getHVQ() {
	if ($("#booking-question").val()=='') {
		$.ajax({
		   type: "POST",
		   url: $hvqform.attr("action")+"?hvq=1&ajax=1&start_1="+getStartDate()+"&end_1="+getEndDate()+"&adults="+getAdults(),
		   data:$hvqform.serialize(),
		   success: function(data)
		   {
			var id = data.split("HVQMESSAGE:");
			var id = id[1].split(":ENDHVQMESSAGE");
			try {
				var msgs = JSON.parse(id[0]);
			} catch(e) {
				console.error("JSON parse error in HVQ:", e);
				console.error("Response data:", data);
				return;
			}
			$("#hvqthinking").hide();
			createCookie("hvq_"+getPropID()+"_"+getRoomID()+"_dates",getStartDate()+getEndDate());
			$("#hvqmsgs").html("");
			   for (let index = msgs.length-1; index >= 0; --index) {
				var source="guest";
				if (msgs[index].source=="host"){ 
				var source="host";
				}

				   str = msgs[index].message.replace(/(?:\r\n|\r|\n)/g, '<br>');

				$("#hvqmsgs").append("<p class='hvqmsg hvqsource"+source+"'>"+str+"<p>");
			   }
			   moduleHeights();

		   }
		});
	}
}
window.$hvqform;
function sanitise(string) {
  const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      "/": '&#x2F;',
  };
  const reg = /[&<>"'/]/ig;
  return string.replace(reg, (match)=>(map[match]));
}
let chatting;
function getStartDate() {
	if ($(".chat-button").length){
		var ret = $(".chat-button.active").data('start');
	} else {
		var ret = $(".formDaterangeStartValue").text();
	}
	return ret;
}
function getEndDate() {
	if ($(".chat-button").length){
		var ret = $(".chat-button.active").data('end');
	} else {
		var ret = $(".formDaterangeEndValue").text();
	}
	return ret;

}
function getAdults() {
	if ($(".chat-button").length){
		var date = $(".chat-button.active").data('adults');
	} else {
		var date = $("select[name=adults]").val();
	}
	return date;

}
function getRoomID() {
	if ($(".chat-button").length){
		var ret = $(".chat-button.active").data('roomid');
	} else {
		var ret = $("input[name=roomid]").val();
	}
	return ret;
}
function getPropID() {
	if ($(".chat-button").length){
		var ret = $(".chat-button.active").data('propid');
	} else {
		var ret = $("input[name=propertyid]").val();
	}
	return ret;
}
	$(document).ready(function(){
		$hvqform = $("#hvq");
		$(".chat-button").click(function(){
			$(".chat-button.active").removeClass("active");
			$(this).addClass("active");
			$("input[name=propertyid_1]",$("#hvq")).val(getPropID());
			$("input[name=roomid_1]",$("#hvq")).val(getRoomID());
			var hvqbid = readCookie("hvq_"+getPropID()+"_"+getRoomID()+"_book_id");
			if (hvqbid){
				$("#hvq_book_id").val(hvqbid);
			}

			clearInterval(chatting);
			getHVQ();
			chatting = setInterval(getHVQ,12000);
			$(".hv-container-wrap").show();
			return false;
		});
		$(".hv-close-button").click(function(){
			$(".hv-container-wrap").hide();
			return false;
		});
		if ($hvqform.length){
			var hvqbid = readCookie("hvq_"+$("input[name=propertyid]").val()+"_"+$("input[name=roomid]").val()+"_book_id");
			if (hvqbid){
				$("#hvq_book_id").val(hvqbid);
				$("#hvqthinking").show();
				getHVQ();
			}

			$("#hvq").submit(function(){
				var $form = $(this);
				var $data = $form.serialize();
				clearInterval(chatting);
				$("#hvqthinking").show();
				$("#hvqmsgs").append("<p class='hvqmsg hvqsourceguest'>"+sanitise($("#booking-question").val())+"</p>");
				$("#booking-question").val('');
				moduleHeights();
				$.ajax({
				   type: "POST",
				   url: $form.attr("action")+"?hvq=1&ajax=1&start_1="+getStartDate()+"&end_1="+getEndDate()+"&adults="+getAdults(),
				   data:$data,
				   success: function(data)
				   {
					chatting = setInterval(getHVQ,12000);
					if ($("#hvq_book_id").val()==""){
					var id = data.split("HVQBOOKID:");
					var id = id[1].split("ENDHVQ");
					createCookie("hvq_"+getPropID()+"_"+getRoomID()+"_book_id",id[0]);
					createCookie("hvq_"+getPropID()+"_"+getRoomID()+"_dates",getStartDate()+getEndDate());
					$("#hvq_book_id").val(id[0]);
					}

				   }
				});
				return false;
			});

		}
		$(".mybooking.paid").insertBefore($(".mybooking:not(.paid):first"));
	$(".discountButton a").click(function(){
		$(this).parent().next().show().find("input:first").focus();
		$(this).parent().hide();
		magicHeights();
		moduleHeights();
		return false;
	});
      $("#closeAllImagesProp,#allImagesProp").click(function(){$("#allImagesProp").hide();return false; });
      $("#viewAllImages").click(function(){
        $("#allImagesProp").appendTo($("body")).show();
        return false;
      });
      $(".show_more_info_button").click(function(){
        if ($(this).prev().is(":visible")){
                  $(this).prev().hide();
          $(this).find("a").text("Show less");
          
        }else{
                  $(this).prev().show();
          $(this).find("a").text("Show less");
        }
        moduleHeights();
        return false;
      });
$(".book_stay_button a").click(function () {
  eraseCookie("goneToPay");
});
      $(".book_stay_block").each(function(){
if ($(this).find('.book_stay_button').length){
$(this).insertAfter($(this).parent().find("#marker-map-wrap"));
}
});
$(".optional_cb").on("change",function(){
$(this).parents("form").submit();
});
$(".propSearchForm").each(function(){
			$(".adultsPropBox .value").text($("select[name=adults]",$(this)).val());
			$(".childrenPropBox .value").text($("select[name=children]",$(this)).val());
			// Only get price if form has dates populated
			if ($(this).find("input[name=start]").val() && $(this).find("input[name=end]").val()) {
				getPrice($(this));
			}
		});
		$(".propSearchForm").on("change","input:not(.offer),select",function(){
			createCookie("startdate",$(this).parents("form").find("input[name=start]").val());
			createCookie("enddate",$(this).parents("form").find("input[name=end]").val());
			$(".adultsPropBox .value").text($("select[name=adults]",$(this).parents("form")).val());
			$(".childrenPropBox .value").text($("select[name=children]",$(this).parents("form")).val());
			$(this).next(".offer_desc").text($("option:selected",$(this)).data("desc"));
getPrice($(this).parents("form"));
		});

		setTimeout(function(){
			if (!$('body').hasClass("accessible-mode")){
    	    
			        $(".expand-box-title").unbind().click(function(e){
			                if ($(e.target)[0].tagName.toLowerCase() == "a") {
			                        if ($(e.target).attr('href')!="#") {
			                        return true;
			                        }
			                }
			                if ($(this).parent().hasClass("showing")) {
			                        $(this).parent().removeClass("showing").find("> .expand-box-content").slideUp(300,function(){
			                                moduleHeights();
			                                magicHeights();
		
$('body').trigger('resize');
			                        });
			                } else {
			                        $("> .showing > .expand-box-content",$(this).parent().parent()).slideUp(295).parent().removeClass("showing");
			                        $(this).parent().addClass("showing");
			                        $("> .expand-box-content",$(this).parent()).slideDown(300,function(){
			                                moduleHeights();
			                                magicHeights();
			
$('body').trigger('resize');
			                        });
			                }
			                return false;
			        });
			}
		},200);

	});
function showPropsByPrice() {
	if ($('.Featured_Property').length && window.location.hash){

		var hash = window.location.hash.replace("#","").split("-");
		var min = hash[0];
		var max = hash[1];

		$(".Featured_Property").hide();
		$(".Featured_Property").each(function(){

			if (max!="any") {
				if($(this).data("price")>=min && $(this).data("price")<=max) {
					$(this).show();
				}				
			} else {
				if($(this).data("price")>=min) {
					$(this).show();
				}				
			}
			if ($(this).data("price-max")!="" && $(this).data("price-max")!="0"  ) {
				if (max!="any") {
					if($(this).data("price-max")>=min && $(this).data("price-max")<=max) {
						$(this).show();
					}				
				} else {
					if($(this).data("price-max")>=min) {
						$(this).show();
					}
				}
			}
		});
	}
	setTimeout(function () {
	//equalHeightProps();
	moduleHeights();		
	}, 10);

}
$(window).load(function(){
	$(".book-slide").each(function(){
		$(this).attr("style",$(this).attr("load-style"));
	});
});
$(document).ready(function(){
	$("#closeReqCoupon").click(function(){
		$("#reqcouponwrap").hide();
		return false;
	});
	$("#reqcoupon form").submit(function(e){
		e.preventDefault();
		const formData = $(this).serialize(); 
		$.ajax({
		   type: "POST",
		   url: "/my-stay/?ajax=1&app=1&nocache=1",
		   data: formData,
		   success: function(data)
		   {
			const partsAfterStart = data.split("CODERETSTART");
			   

			var targetText;
			if (partsAfterStart.length > 1) {
			    const partsAfterEnd = partsAfterStart[1].split("CODERETEND");

			    if (partsAfterEnd.length > 0) {
				targetText = partsAfterEnd[0].trim();

			    } 			} 
			   if (!isNaN(targetText) && targetText !== "") {
			   alert("Success: Your coupon is valid.");
			createCookie("output_reqCoupon",targetText);
				   $("#reqcouponwrap").hide();
			   } else {
			   alert("Error: Unfortunately your coupon isn't valid.");
			   }
		   }
		});
		return false;
	});
	$(".exitForm").submit(function(){
		$("#exitLoader").show();
	});
	// Get language from html lang attribute, default to 'en'
	var lang = $('html').attr('lang') || 'en';
	
	// Translations for top 5 languages
	var searchingMessages = {
		'en': 'Searching, Please Wait&hellip;',
		'es': 'Buscando, Por Favor Espere&hellip;',
		'fr': 'Recherche en cours, Veuillez patienter&hellip;',
		'de': 'Suche läuft, Bitte warten&hellip;',
		'it': 'Ricerca in corso, Attendere prego&hellip;',
		'pt': 'Pesquisando, Por Favor Aguarde&hellip;',
		'zh': '搜索中，请稍候&hellip;',
		'ja': '検索中、お待ちください&hellip;',
		'ar': 'جاري البحث، يرجى الانتظار&hellip;',
		'ru': 'Поиск, пожалуйста подождите&hellip;'
	};
	
	// Get message for current language, fallback to English
	var message = searchingMessages[lang] || searchingMessages['en'];
	
	// For language codes with regions (e.g., 'en-US'), try base language
	if (!searchingMessages[lang] && lang.indexOf('-') > -1) {
		var baseLang = lang.split('-')[0];
		message = searchingMessages[baseLang] || searchingMessages['en'];
	}
	
	$("body").append("<div id='exitLoader'><p>" + message + "</p></div>");
	$(".discount_form").submit(function(){
		createCookie($("input[type=text]",$(this)).attr("name"),$("input[type=text]",$(this)).val());
		window.location.reload();
		return false;
	});
	$(".removeFromBasket").click(function(){
		removeFromBasket($(this).data("item-id"));
		window.location = window.location;
		return false;
	});
	$("#search-type").change(function(){
		$(".location-wrapper").hide();
		$("#location-"+$(this).find("option:checked").data('property-id')).show();
	}).trigger("change");
	if (readCookie('searchstate')) {
		var state = readCookie('searchstate').split("|");
		$("#search-type").val(state[0]);
		var c = 1;
		$(".location-wrapper select").each(function(){
			$(this).val(state[c]);
			c++;
		});
		$("#search-price select").val(state[state.length-1]);
		setTimeout(function () {
		$("#search-type").trigger("change");			
		}, 10);

	}
	$('#property-search-form').unbind().submit(function(e){
		var state = $("#search-type").val();
		$(".location-wrapper select").each(function(){
			state+="|";
			state+=$(this).val();
		});
		state+="|"+$("#search-price select").val();
		createCookie("searchstate",state);
		e.preventDefault();

		var link = $("#search-type").val()+$(".location-wrapper:visible select").val()+"#"+$("#search-price select").val();
		window.location.href=link;

		return false;
	});
	$('#property-search-form-create').unbind().submit(function(e){
		var state = $("#search-type").val();
		$(".location-wrapper select").each(function(){
			state+="|";
			state+=$(this).val();
		});
		createCookie("searchstate",state);
		e.preventDefault();

		var link = $("#search-type").val()+$(".location-wrapper:visible select").val()+"?create=1";
		window.location.href=link;
		
		return false;
	});
	showPropsByPrice();
	$(".inline-search-hidden-select select").on("change",function(){
		$(this).next().text($(this).find("option:selected").text());
	});

});
window.onpopstate = function () {
	showPropsByPrice();	
}
