(function ( $ ) {
$.fn.countdown = function(options,onComplete) {
	 var settings = $.extend({
            date: "2050/12/15 00:00:00"
		,years: "Years"
		,year: "Year"
		,days: "Days"
		,day: "Day"
		,hours: "Hours"
		,hour: "Hour"
		,minutes: "Minutes"
		,minute: "Minute"
		,seconds: "Seconds"
		,second: "Second"
        }, options );
		var countDownDate = new Date(settings.date+"").getTime();
		var now = new Date();
		var el = this;
		var interval = setInterval(function() {
			var now = Date.now();
			// UTC

			var distance = countDownDate - now;

			var years = Math.floor(distance / (1000 * 60 * 60 * 24 * 365));
			var days = Math.floor((distance % (1000 * 60 * 60 * 24 * 365) ) / (1000 * 60 * 60 * 24));
			var hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
			var minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
			var seconds = Math.floor((distance % (1000 * 60)) / 1000);
			el.find('.years').text(years);
			el.find('.days').text(days);
			el.find('.hours').text(hours);
			el.find('.minutes').text(minutes);
			el.find('.seconds').text(seconds);
			el.find('.years_text').text(settings.years);
			el.find('.days_text').text(settings.days);
			el.find('.hours_text').text(settings.hours);
			el.find('.minutes_text').text(settings.minutes);
			el.find('.seconds_text').text(settings.seconds);
			if (years==1){
				el.find('.years_text').text(settings.year);
			} 
			if (days==1){
				el.find('.days_text').text(settings.day);
			} 
			if (hours==1){
				el.find('.hours_text').text(settings.hour);
			} 
			if (minutes==1){
				el.find('.minutes_text').text(settings.minute);
			} 
			if (seconds==1){
				el.find('.seconds_text').text(settings.second);
			} 
			if (days==1){
				el.find('.days_text').text(settings.day);
			} 
			if (hours==1){
				el.find('.hours_text').text(settings.hour);
			} 
			if (minutes==1){
				el.find('.minutes_text').text(settings.minute);
			} 
			if (seconds==1){
				el.find('.seconds_text').text(settings.second);
			} 
			el.find('*').show();
			if (years==0){
				el.find('.years').parent().hide().next().hide();
			} 
			if (days==0){
				el.find('.days').parent().hide().next().hide();
			} 
			if (hours==0){
				el.find('.hours').parent().hide().next().hide();
			} 
			if (minutes==0){
				el.find('.minutes').parent().hide().next().hide();
			} 
			if (distance < 0) {
			   clearInterval(interval);
				el.hide();
				onComplete($(this));
			 }
		}, 1000); 
}; 
}( jQuery ));
