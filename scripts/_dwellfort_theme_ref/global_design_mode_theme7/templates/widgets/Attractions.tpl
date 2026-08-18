{* @@@
{
	"widget_info":{
		"title":"Attractions Listings"
		,"title_info":"Enter a name for this attractions category."
	},
	"meta_data":[{
		"name":"Tag"
		,"type": "pagetagmulti"
		,"var": "tagids"
	},{
		"name":"Book Now Page URL"
		,"type":"text"
		,"info":"URL to the book now page"
		,"var":"book_now_url"
		,"default":"/book-now/"
	}],
	"inner_templates":{
		"attractionslisting": {
			"name":"Attractions listing",
			"template_sections":[
				["","Summary","1"]
				,["gallery","Booking","0"]
				,["more_content","More content","0"]
				,["bookingform","Facilities","0"]
				,["neighbourhood","Neighbourhood","0"]
				,["houserules","House Rules","0"]
				,["directions","Directions","0"]
				,["housemanual","House Manual","0"]
				,["notes","Notes","0"]
			],"meta_data":[{
				"name":"Last updated"
				,"info":"More recent dates will bring posts to the top of the page. Ensure the date is in this format: YYYY-MM-DD HH:MM"
				,"type": "date"
				,"var": "lastupdated"
			},{
				"name":"Attraction Type"
				,"info":"Attraction Type"
				,"type": "text"
				,"var": "attraction_type"
			},{
				"name":"Attraction Name"
				,"info":"Attraction Name"
				,"type": "text"
				,"var": "attraction_name"
			},{
				"name":"Language"
				,"info":"Local Language"
				,"type": "text"
				,"var": "language"
			},{
				"name":"Street Address"
				,"info":"Street Address"
				,"type": "text"
				,"var": "street_address"
			},{
				"name":"City"
				,"info":"City"
				,"type": "text"
				,"var": "city"
			},{
				"name":"State"
				,"info":"State"
				,"type": "text"
				,"var": "state"
			},{
				"name":"Country Code"
				,"info":"Country"
				,"type": "text"
				,"var": "country_code"
			},{
				"name":"Postcode"
				,"info":"postcode"
				,"type": "text"
				,"var": "postcode"
			},{
				"name":"Latitude"
				,"info":"Latitude"
				,"type": "text"
				,"var": "latitude"
			},{
				"name":"Longditude"
				,"info":"Londitude"
				,"type": "text"
				,"var": "longditude"
			},{
				"name":"Customer Parking"
				,"type": "tick"
				,"var": "customerparking"
				,"default":"0"
			},{
				"name":"Allow Children"
				,"type": "tick"
				,"var": "allowchildren"
				,"default":"0"
			},{
				"name":"Allow Smoking"
				,"type": "tick"
				,"var": "allowsmoking"
				,"default":"0"
			},{
				"name":"Allow Pets"
				,"type": "tick"
				,"var": "allowpets"
				,"default":"0"						
			},{
				"name":"Handicap Facilities"
				,"type": "tick"
				,"var": "handicapfacilities"
				,"default":"0"
			},{
				"name":"Opening Time"
				,"info":"Opening Time"
				,"type": "text"
				,"var": "opening_time"
			},{
				"name":"Closing Time"
				,"info":"Closing Time"
				,"type": "text"
				,"var": "closing_time"
			},{
				"name":"Directions"
				,"info":"Directions"
				,"type": "text"
				,"var": "directions"
			},{
				"name":"Summary"
				,"info":"This is the full description of the property"
				,"type": "text"
				,"var": "summary"
			},{
				"name":"Adult Price"
				,"info":"Add a maximum price (without any dollar symbol or other punctuation) if the price is a guide. Leave empty to show as fixed price."
				,"type": "text"
				,"var": "adult_price"
			},{
				"name":"OAP Price"
				,"info":"Add a maximum price (without any dollar symbol or other punctuation) if the price is a guide. Leave empty to show as fixed price."
				,"type": "text"
				,"var": "oap_price"	
			},{
				"name":"Children Price"
				,"info":"Add a maximum price (without any dollar symbol or other punctuation) if the price is a guide. Leave empty to show as fixed price."
				,"type": "text"
				,"var": "children_price"				
			},{
				"name":"Contact phone"
				,"info":"Enter public phone number"
				,"type": "text"
				,"var": "phone"
			},{
				"name":"Contact email"
				,"info":"Enter public email"
				,"type": "text"
				,"var": "email"
			}]
		}
	}
}
@@@ *}
	
{* Logic *}
{if $vars[0]} {* If showing post *}
	

	{page_by_slug slug=$vars[0] assign=page thispage=$content.id}
	{assign var=singlepage value=true}
	
{else}

	{pages_by_tag tags=$metadata.tagids assign=pages sortbymeta=lastupdated direction=desc}
	{foreach from=$pages item=page}
	{if $types && $page.meta.attraction_type|in_array:$types}{else}
	{if $page.meta.attraction_type!=""}
	{append var='types' value=$page.meta.attraction_type}
	{/if}
	{/if}
	{/foreach}
	{if $types && $types|@sort eq 1}{/if}
	{if $types && $types|@count}
		<form action="" method="get">



		<p>Type:
		<select name="filter_meta[attraction_type]">
		<option value="false">Any</option>
		{foreach from=$types item=type}
		<option {if $smarty.get.filter_meta.attraction_type==$type}selected=selected{/if}>{$type}</option>
		{/foreach}
		</select></p>
		<input type="submit"/>

		</form>


	{pages_by_tag tags=$metadata.tagids assign=pages sortbymeta=lastupdated direction=desc filter_array_meta=$smarty.get.filter_meta}
	{/if}
{/if}

{* Display *}
	
	{if $singlepage}

		<h1><strong>{$page.title}<strong></h1>
		
		<div class="column_row">

			<div class='column  threeThirdsCol first'>

				<p>{$page.contentSplit.normal}</p>
				{if $page.meta.directions}<p class><strong>Directions = <strong>  {$page.meta.directions}</p>{/if}

				{if $page.meta.allowchildren == "1" || $page.meta.allowsmoking == "1" || $page.meta.allowpets == "1" || $page.meta.customerparking == "1" || $page.meta.handicapfacilities == "1"}
				<h4>General Information</h4>
				{/if}
				{if $page.meta.allowchildren == "1"}<p class><strong>Allow Children? <strong> Yes children are allowed</strong></p>{/if}
				{if $page.meta.allowsmoking == "1"}<p class><strong>Allow Smoking? <strong> Yes smoking is allowed</strong></p>{/if}
				{if $page.meta.allowpets == "1"}<p class><strong>Allow pets? <strong> Yes well behaved dogs are allowed</strong></p>{/if}
				{if $page.meta.customerparking == "1"}<p class><strong>Is there Parking? <strong> Yes there is customer parking</strong></p>{/if}
				{if $page.meta.handicapfacilities == "1"}<p class><strong>Are there Handicap Facilities? <strong> Yes there are Handicap Facilities</strong></p>{/if}
					<p>{$page.contentSplit.bookingform}</p>
					{if $page.meta.opening_time || $page.meta.closing_time || $page.meta.adult_price || $page.meta.children_price || $page.meta.oap_price}
					<h4>Booking Information</h4>
					{/if}
					{if $page.meta.opening_time}<p class><strong>Opening Time = <strong> {$page.meta.opening_time}</p>{/if}
					{if $page.meta.closing_time}<p class><strong>Closing Time = <strong> {$page.meta.closing_time}</p>{/if}
					{if $page.meta.adult_price}<p class><strong>Adult Price = <strong> {$page.meta.adult_price}</p>{/if}
					{if $page.meta.children_price}<p class><strong>Children Price = <strong> {$page.meta.children_price}</p>{/if}
					{if $page.meta.oap_price}<p class><strong>OAP Price = <strong> {$page.meta.oap_price}</p>{/if}
					
			</div>	

			<div class='column threeThirdsCol'>
			<h4>Summary</h4>
				{if $page.meta.summary}<p class>{$page.meta.summary}</p>{/if}
				<p>{$page.contentSplit.more_content}</p>

				<p>{$page.contentSplit.gallery}</p>


				{if $page.meta.email || $page.meta.phone}
				<h4>Enquire about this Attraction</h4>
				{/if}
				{if $page.meta.email}<p class="Button_Medium Icon_Email"><a href="mailto:{$page.meta.email}">{$page.meta.email}</a></p>{/if}
				{if $page.meta.phone}<p class="Button_Medium Icon_Phone">{$page.meta.phone}</p>{/if}

			</div>


			<div class='column  threeThirdsCol last'>
					{if $page.meta.street_address}<h4>Address</h4><p class>{$page.meta.street_address}</p>{/if}
				<div class="property_info" >
				<p></p>
				<H2>Location</H2>
					<iframe 
					width="100%" 
					height="250" 
					frameborder="0" 
					scrolling="no" 
					marginheight="0" 
					marginwidth="0" 
					src="https://maps.google.com/maps?q={$page.meta.latitude},{$page.meta.longditude}&hl=es;z=14&amp;output=embed"
					>
					</iframe>				
				</div>

					
					<p class><p class="Button_Medium"><a href="{$metadata.book_now_url}">Book now</a></p>
			</div>
		</div>
		
	{else}

		{if $pages && $pages|@count==0}
			<div class="homeweb-empty-section">
				<h3>There are no attractions yet.</h3>
			</div>
		{/if}
		
			<div class="magic-heights-wrap">
		{foreach from=$pages item=page name=props}

			<div class="attraction magic-heights clearfix {if $smarty.foreach.props.iteration % 3 == 2}middle{/if}" data-price="{$page.meta.price}" data-price-max="{$page.meta.price_max}">
				<div class="magic-heights-inner">
				<p class="Image"><a href="{$page.url_str}"><img src="{if $page.pic_url==""}{if $theme_vars_placeholder_image}/images/themegraphics/{$theme_vars_placeholder_image}?width=500&height=300&shrink=false{/if}{else}{$page.pic_url}?width=500&height=300&shrink=false{/if}" /></a></p>
				<div class="property_title"><h2><a href="{$page.url_str}"><strong>{$page.pagetitle}</strong></a></h2></div>
				</div>
				<div class="magic-heights-inner-2">
				<div class="column_row">
					{if $page.meta.attraction_type!=""}<p class="Type">Type of Attraction: {$page.meta.attraction_type}</p>{/if}
					{if $page.meta.opening_time}<p class="Opening">Opening Time: {$page.meta.opening_time}</p>{/if}
					{if $page.meta.closing_time}<p class="Closing">Closing Time: {$page.meta.closing_time}</p>{/if}
					<p class><a href="{$page.url_str}">Click Here</a> for more information</p>
				</div>
				</div>
			</div>
				
				{*<span class="forum-post-column forum-post-created">Created<br/>{$page.meta.created|date_format:"%b %e, %Y %H:%M"}</span>*}
	
	
				{if $smarty.foreach.props.iteration is div by 4}<div class="clear"></div>{/if}
		{/foreach}
		</div>
	
	{/if}
		
<script type="text/javascript">
	{literal}
	function equalHeightProps() {
		$(".Featured_Property").css("height","auto");
		if ($(window).width()>900) {
			var h = 0;
			$(".Featured_Property").each(function(){
				if ($(this).innerHeight()>h) {
					h = $(this).innerHeight();
				}
			});
			$(".Featured_Property").css("height",h+"px");
		}
	}
	$(window).resize(function(){
		equalHeightProps();
	});
	$(window).load(function(){
		equalHeightProps();
	});
	$(document).ready(function(){
		
		if ($(".post-add-form,.blog-comment-form").length>0) {
			$(".email1").css({
				"position":"absolute"
				,"top":"-4000px"
				,"left":"-1000px"
			});
			$(".fakeemail").hide();
		}
		$("#addpost:not(.editpost,.createpost)").hide();
		moduleHeights();
		$("#show_add_post").click(function(){
			$("#addpost").show();
			$("#property_title").focus();
			$(".Featured_Property").hide();
			moduleHeights();
			return false;
		});
		$('#property-add-attachment a').click(function(){
			if ($('.property-file-upload:hidden').length) {
				$('.property-file-upload:hidden:first').removeClass("input-concealed");
			}
			if (!$('.property-file-upload:hidden').length) {
				$(this).parent().hide();
			}
			return false;
		});
		$('#property-add-floorplan a').click(function(){
			if ($('.property-fp-upload:hidden').length) {
				$('.property-fp-upload:hidden:first').removeClass("input-concealed");
			}
			if (!$('.property-fp-upload:hidden').length) {
				$(this).parent().hide();
			}
			return false;
		});
	});
	{/literal}
</script>
