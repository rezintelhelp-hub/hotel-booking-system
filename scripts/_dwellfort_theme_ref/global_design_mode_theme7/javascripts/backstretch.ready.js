	function backstretches_core() {
		$("*[data-backgrounds]").each(function(){
			var duration = 4000;
			var fade = 1000;
			var opacity = 1;
			var colour = "transparent";
			var align = "center";
			if ($(this).data("backgrounds") != null){
				if (typeof $(this).data("background-align") != 'undefined') {
					align = $(this).data("background-align");
				}			
				if (typeof $(this).data("background-color") != 'undefined') {
					colour = $(this).data("background-color");
				}
				if (typeof $(this).data("background-opacity") != 'undefined') {
					opacity = $(this).data("background-opacity");
				}
				if (typeof $(this).data("background-duration") != 'undefined') {
					duration = $(this).data("background-duration");
				}
				if (typeof $(this).data("background-fade") != 'undefined') {
					fade = $(this).data("background-fade");
				}
				if ($(this).data('parallax-combined')) {
					$(".combined-parallax-bg-wrap",$(this)).remove();
					var c = 9;

					for (var i = 0; i < $(this).data("backgrounds").length; i++) {

						$(this).append("<div class='combined-parallax-bg-wrap' data-scroll-decay='0."+c+"'></div>")
						$(this).find(".combined-parallax-bg-wrap:last").backstretch($(this).data("backgrounds")[i], {duration: duration, fade: fade, parallax: true,align:align});
						
						c--;

					}

				} else {
					

					if (typeof $(this).data("scroll-decay") != "undefined") {
						if ($(this).data("background-panzoom")==1) { 
							$(this).backstretch($(this).data("backgrounds"), {duration: duration, fade: fade, parallax: true, panzoom: true,align:align});
						} else {
							$(this).backstretch($(this).data("backgrounds"), {duration: duration, fade: fade, parallax: true,align:align});					
						}

					} else {
						if ($(this).data("background-panzoom")==1) { 
							$(this).backstretch($(this).data("backgrounds"), {duration: duration, fade: fade, panzoom: true,align:align});					
						} else {
							$(this).backstretch($(this).data("backgrounds"), {duration: duration, fade: fade,align:align});
						}				

					}
					if ($(this).data("background-panzoom")==1) {
						$(this).addClass('panzoom');
					}
					$(".backstretch",$(this)).css("opacity",opacity);
				}

				$(this).css("background-color",colour);
			}
		});
	}
