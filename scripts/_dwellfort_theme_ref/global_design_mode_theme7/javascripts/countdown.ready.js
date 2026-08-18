	function countdownReady_core() {
		$('.countdownclock').each(function(){
			var time = $(this).data("time");
			var t = $(this);
			$(this).countdown({
			    date: time,
			    day: 'Day',
			    days: 'Days'
			}, function () {
				t.next('.countdown-show-after').show();
				moduleHeights();
			});
		
		});
			
		
	};
