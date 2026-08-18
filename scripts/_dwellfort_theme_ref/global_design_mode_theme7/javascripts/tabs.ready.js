
function tabsReady_core() {
	if (!$('body').hasClass("accessible-mode")){

		$(".tabs-widget").each(function(){
			if (!$(this).prev().hasClass("tabs-widget")) {
				$(this).before("<div class='tabs-widgets'><div class='tabs-tabs clearfix'></div><div class='tabs-contents'></div></div>");
			}
		});

		$(".tabs-widgets").each(function(){
			$wrapper = $(this);
			$(this).nextAll().each(function(){
				if (!$(this).hasClass("tabs-widget")) {
					return false;
				} else {
					$(this).appendTo($wrapper.find('.tabs-contents'));
					$wrapper.find('.tabs-tabs').append("<div class='tabs-tab' data-tab-id='"+$(this).data('tab-id')+"'>"+$(this).data('title')+"</div>");

				}
			});
			$('.tabs-widget',$(this)).hide();
			$('.tabs-widget',$(this)).first().show();
			$('.tabs-tab',$(this)).first().addClass('current-tabs-tab');
		});
		$('.tabs-tabs .tabs-tab').click(function() {
			var $wrap = $(this).parents('.tabs-widgets');
			$('.tabs-widget',$wrap).hide();
			$('.tabs-widget.tab-'+$(this).data('tab-id'),$wrap).show();
			$('.current-tabs-tab',$wrap).removeClass('current-tabs-tab');
			$(this).addClass('current-tabs-tab');
			if (typeof checkCalendars == 'function'){
				checkCalendars();
			}
			moduleHeights();
			magicHeights();
			return false;
		});
		setTimeout(function(){
		var hs = window.location.hash.split('#tab');
		if (hs.length>1){
		if ($('.tabs-tab[data-tab-id="'+hs[1]+'"]').length)  {
			var target = $('.tabs-tab[data-tab-id="'+hs[1]+'"]');
			target.trigger('click');
		}
		}
		},100);

	}
}
