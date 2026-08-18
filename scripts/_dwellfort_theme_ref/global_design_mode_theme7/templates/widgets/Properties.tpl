{* @@@
{
	"widget_info":{
		"title":"Property Listings"
		,"title_info":"Enter a name for this property category."
		,"include_js":"tabs.ready.js" 
	},
	"meta_data":[{
		"name":"Book Now Page"
		,"type":"linkpageonly"
		,"info":"Choose the page where your Book Now widget is set up"
		,"var":"destination"
		,"default":"/book-now/"
	},{
		"name":"My Stays Page"
		,"type":"linkpageonly"
		,"info":"Choose the page where your My Stays widget is set up"
		,"var":"mystays_destination"
		,"default":"/my-stay/"
	},{
		"name":"Tag"
		,"type": "pagetagmulti"
		,"var": "tagids"
	},{
		"name":"British terms"
		,"type":"tick"
		,"var":"british"
		,"default":"0"
	},{
		"name":"Direct payment confirm webhook"
		,"type":"tick"
		,"var":"directconfirm_webhook"
		,"default":"0"
	},{
		"name":"UseROSS Webhook"
		,"type":"tick"
		,"var":"useross_webhook"
		,"default":"0"
	},{
		"name":"Linksrez Webhook"
		,"type":"tick"
		,"var":"linksrez_webhook"
		,"default":"0"
	},{
		"name":"Require Coupon Per Offer"
		,"type":"tick"
		,"var":"reqcoupon"
		,"default":"0"
	},{
		"name":"Tab mode"
		,"type":"tick"
		,"var":"tabs"
		,"default":"0"
	},{
		"name":"Skip meta description"
		,"type":"tick"
		,"var":"skipdesc"
		,"default":"0"
	},{
		"name":"Excluded rooms"
		,"type":"text"
		,"info":"Enter a list of room ids separated by commas to exclude form your website."
		,"default":""
		,"var":"excluded"
	},{
		"name":"Show related properties"
		,"type":"tick"
		,"var":"show_rel"
		,"default":"0"
	},{
		"name":"Trim title up to first hyphen"
		,"type":"tick"
		,"var":"trim"
		,"default":"0"
	},{
		"name":"Show filter"
		,"type":"tick"
		,"var":"show_filter"
		,"default":"1"
	},{
		"name":"Show type filter"
		,"type":"tick"
		,"var":"showtype"
		,"default":"0"
	},{
		"name":"Show aux text"
		,"type":"tick"
		,"var":"showaux"
		,"default":"1"
	},{
		"name":"Show children field"
		,"type":"tick"
		,"var":"show_children"
		,"default":"1"
	},{
		"name":"Show location field"
		,"type":"tick"
		,"var":"show_location"
		,"default":"1"
	},{
		"name":"Show state field"
		,"type":"tick"
		,"var":"show_state"
		,"default":"1"
	},{
		"name":"Enable Hostvana"
		,"type":"tick"
		,"var":"hostvana"
		,"default":"0"
	},{
		"name":"Cutoff time"
		,"type":"text"
		,"info":"Enter the cutoff time for current day bookings"
		,"var":"cutoff"
		,"default":"15:00"
	},{
		"name":"User Id"
		,"type":"text"
		,"design":"true"
		,"default":""
		,"var":"userid"
	},{
		"name":"Beds24 API Key"
		,"type":"text"
		,"design":"true"
		,"default":""
		,"var":"b24_apikey"
	},{
		"name":"Lodgify API Key"
		,"type":"text"
		,"design":"true"
		,"default":""
		,"var":"lodgify_apikey"
	},{
		"name":"Beds24 API v2 Invite Code"
		,"type":"text"
		,"design":"true"
		,"default":""
		,"var":"invitecode"
	},{
		"name":"Beds24 API v2 Long Token"
		,"type":"text"
		,"info":"This should only be changed for debugging purposes. It will be managed internally normally."
		,"design":"true"
		,"default":""
		,"var":"longtoken"
	},{
		"name":"Beds24 API v2 Refresh Token"
		,"type":"text"
		,"info":"This should only be changed for debugging purposes. It will be managed internally normally."
		,"design":"true"
		,"default":""
		,"var":"refreshtoken"
	},{
		"name":"Hostvana Agent Name"
		,"type":"text"
		,"design":"true"
		,"default":"Agent"
		,"var":"agent"
	},{
		"name":"Browse Properties Heading"
		,"type":"text"
		,"info":"Main heading for property listings page"
		,"var":"browse_properties_text"
		,"default":"Browse Properties"
	},{
		"name":"Bedrooms Filter Label"
		,"type":"text"
		,"info":"Label for bedroom count filter"
		,"var":"bedrooms_filter_label"
		,"default":"Bedrooms:"
	},{
		"name":"Location Filter Label"
		,"type":"text"
		,"info":"Label for location/city filter"
		,"var":"location_filter_label"
		,"default":"Location:"
	},{
		"name":"Type Filter Label"
		,"type":"text"
		,"info":"Label for property type filter"
		,"var":"type_filter_label"
		,"default":"Type:"
	},{
		"name":"Any Option Text"
		,"type":"text"
		,"info":"Default option text for filter dropdowns"
		,"var":"any_option_text"
		,"default":"Any"
	},{
		"name":"Check In Label"
		,"type":"text"
		,"info":"Label for check-in date field"
		,"var":"checkin_label"
		,"default":"Check in"
	},{
		"name":"Check Out Label"
		,"type":"text"
		,"info":"Label for check-out date field"
		,"var":"checkout_label"
		,"default":"Check out"
	},{
		"name":"Adults Field Label"
		,"type":"text"
		,"info":"Label for adults selection field"
		,"var":"adults_field_label"
		,"default":"Adults:"
	},{
		"name":"Children Field Label"
		,"type":"text"
		,"info":"Label for children selection field"
		,"var":"children_field_label"
		,"default":"Children:"
	},{
		"name":"Price Loading Text"
		,"type":"text"
		,"info":"Text shown while getting latest price"
		,"var":"price_loading_text"
		,"default":"Getting latest price"
	},{
		"name":"Book Stay Button"
		,"type":"text"
		,"info":"Main booking button text"
		,"var":"book_stay_button"
		,"default":"Book your Stay"
	},{
		"name":"Continue Booking Button"
		,"type":"text"
		,"info":"Continue booking button text"
		,"var":"continue_booking_button"
		,"default":"Continue Booking"
	},{
		"name":"First Night Deposit Message"
		,"type":"text"
		,"info":"Deposit message for first night's fee (101% deposit)"
		,"var":"first_night_deposit_message"
		,"default":"First night's fee as deposit required, balance will be due subject to terms and conditions"
	},{
		"name":"Percentage Deposit Message"
		,"type":"text"
		,"info":"Percentage deposit message with % placeholder"
		,"var":"percentage_deposit_message"
		,"default":"% deposit required, balance will be due subject to terms and conditions"
	},{
		"name":"Unavailable Message"
		,"type":"text"
		,"info":"Message when stay is unavailable for selected dates"
		,"var":"unavailable_message"
		,"default":"Your stay is unavailable for these dates."
	},{
		"name":"Go Back Button"
		,"type":"text"
		,"info":"Back button text"
		,"var":"go_back_button"
		,"default":"Go Back"
	},{
		"name":"Show More Button"
		,"type":"text"
		,"info":"Expand/collapse button for additional information"
		,"var":"show_more_button"
		,"default":"Show more"
	},{
		"name":"Related Properties Heading"
		,"type":"text"
		,"info":"Section heading for related properties"
		,"var":"related_properties_heading"
		,"default":"Related properties"
	},{
		"name":"Agent Greeting"
		,"type":"text"
		,"info":"Hostvana agent greeting message"
		,"var":"agent_greeting"
		,"default":"I'm here to answer any listing questions"
	},{
		"name":"Chat Placeholder"
		,"type":"text"
		,"info":"Chat input placeholder text"
		,"var":"chat_placeholder"
		,"default":"Type your question here"
	},{
		"name":"Chat Submit Button"
		,"type":"text"
		,"info":"Chat form submit button text"
		,"var":"chat_submit_button"
		,"default":"Submit"
	},{
		"name":"Agent Online Status"
		,"type":"text"
		,"info":"Agent online status indicator"
		,"var":"agent_online_status"
		,"default":"Online"
	},{
		"name":"Location Section Heading"
		,"type":"text"
		,"info":"Section heading for location amenities"
		,"var":"location_section_heading"
		,"default":"Location"
	},{
		"name":"Guests Label"
		,"type":"text"
		,"info":"Property capacity label"
		,"var":"guests_label"
		,"default":"Guests:"
	},{
		"name":"Bedrooms Label"
		,"type":"text"
		,"info":"Property bedroom count label"
		,"var":"bedrooms_label"
		,"default":"Bedrooms:"
	},{
		"name":"Bathrooms Label"
		,"type":"text"
		,"info":"Property bathroom count label"
		,"var":"bathrooms_label"
		,"default":"Bathrooms:"
	},{
		"name":"Default Offer Name"
		,"type":"text"
		,"info":"Default offer name when none specified"
		,"var":"default_offer_name"
		,"default":"Price"
	},{
		"name":"Description Heading"
		,"type":"text"
		,"info":"Heading for property description section"
		,"var":"description_heading"
		,"default":"Description"
	},{
		"name":"More Information Heading"
		,"type":"text"
		,"info":"Heading for more information section"
		,"var":"more_information_heading"
		,"default":"More information"
	},{
		"name":"Availability Heading"
		,"type":"text"
		,"info":"Heading for property availability section"
		,"var":"availability_heading"
		,"default":"Availability"
	},{
		"name":"Features Heading"
		,"type":"text"
		,"info":"Heading for property features section"
		,"var":"features_heading"
		,"default":"Features"
	},{
		"name":"Terms Heading"
		,"type":"text"
		,"info":"Heading for property terms section"
		,"var":"terms_heading"
		,"default":"Terms"
	},{
		"name":"General Terms Heading"
		,"type":"text"
		,"info":"Heading for general terms subsection"
		,"var":"general_terms_heading"
		,"default":"General terms"
	},{
		"name":"Rules Heading"
		,"type":"text"
		,"info":"Heading for property rules subsection"
		,"var":"rules_heading"
		,"default":"Rules"
	},{
		"name":"Cancellation Heading"
		,"type":"text"
		,"info":"Heading for cancellation policy subsection"
		,"var":"cancellation_heading"
		,"default":"Cancellation"
	},{
		"name":"Minimum Stay Message"
		,"type":"text"
		,"info":"Message shown when booking doesn't meet minimum stay. Use {{MIN}} as placeholder for the minimum number."
		,"var":"minimum_stay_message"
		,"default":"Your current booking doesn't meet the minimum stay of {{MIN}}"
	}
	],
	"inner_templates":{
		"propertylisting": {
			"name":"Property listing",
			"template_sections":[
				["","Column 1 top","1"]
				,["col2top","Column 2 top","0"]
				,["col3top","Column 3 top","0"]
				,["col1bottom","Column 1 bottom","0"]
				,["col2bottom","Column 2 bottom","0"]
				,["col3bottom","Column 3 bottom","0"]
			],"meta_data":[{
				"name":"Lodgify RoomTypeId"
				,"type":"text"
				,"design":"true"
				,"default":""
				,"var":"lodgify_roomtypeid"
			},{
				"name":"Lodgify HouseId"
				,"type":"text"
				,"design":"true"
				,"default":""
				,"var":"lodgify_houseid"
			},{
				"name":"LinksRez Hotel Code"
				,"type":"text"
				,"design":"true"
				,"default":""
				,"var":"linksrez_hotel"
			},{
				"name":"LinksRez Rate"
				,"type":"text"
				,"design":"true"
				,"default":""
				,"var":"linksrez_rate"
			},{
				"name":"LinksRez Room Code"
				,"type":"text"
				,"design":"true"
				,"default":""
				,"var":"linksrez_code"
			},{
				"name":"Beds24 API Prop Key"
				,"type":"text"
				,"design":"true"
				,"default":""
				,"var":"b24_api_propkey"
			},{
				"name":"Featured"
				,"type": "tick"
				,"var": "featured"
				,"default":"0"
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
				"name":"Description"
				,"info":""
				,"type": "text"
				,"var": "b24desc"
			},{
				"name":"Description 2"
				,"info":""
				,"type": "text"
				,"var": "b24desc2"
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
				,"type": "hidden"
				,"var": "latitude"
			},{
				"name":"Longitude"
				,"info":""
				,"type": "hidden"
				,"var": "longitude"
			},{
				"name":"Common Spaces Shared"
				,"info":"Who can use the Common Space"
				,"type": "text"
				,"var": "common_space_shared"
			},{
				"name":"Bathroom Shared"
				,"info":"Private or Shared Bathroom"
				,"type": "text"
				,"var": "bathroom_shared"
			},{
				"name":"Bedrooms"
				,"info":"Number of Bedrooms"
				,"type": "text"
				,"var": "bedrooms"
			},{
				"name":"Bathrooms"
				,"info":"Number of Bathrooms"
				,"type": "text"
				,"var": "bathrooms"
			},{
				"name":"Room Configuration 1"
				,"info":"Type of Bedroom and Style of Bed"
				,"type": "text"
				,"var": "roomconfig_1"
			},{
				"name":"Room Configuration 2"
				,"info":"Type of Bedroom and Style of Bed"
				,"type": "text"
				,"var": "roomconfig_2"
			},{
				"name":"Room Configuration 3"
				,"info":"Type of Bedroom and Style of Bed"
				,"type": "text"
				,"var": "roomconfig_3"
			},{
				"name":"Room Configuration 4"
				,"info":"Type of Bedroom and Style of Bed"
				,"type": "text"
				,"var": "roomconfig_4"
			},{
				"name":"Person Capacity"
				,"info":"Person Capacity"
				,"type": "text"
				,"var": "person_capacity"
			},{
				"name":"General"
				,"info":""
				,"type": "text"
				,"var": "general"
			},{
				"name":"Cancellation"
				,"info":""
				,"type": "text"
				,"var": "cancellation"
			},{
				"name":"Rules"
				,"info":""
				,"type": "text"
				,"var": "rules"
			},{
				"name":"Location"
				,"info":""
				,"type": "text"
				,"var": "location"
			},{
				"name":"Check in"
				,"info":""
				,"type": "text"
				,"var": "checkin"
			},{
				"name":"Checkin End"
				,"info":"Person Capacity"
				,"type": "text"
				,"var": "checkinend"
			},{
				"name":"Checkout"
				,"info":""
				,"type": "text"
				,"var": "checkout"
			},{
				"name":"Amenities"
				,"info":"Amenities"
				,"type": "text"
				,"var": "amenities"
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
				"name":"Parking spaces"
				,"info":"Number of parking spaces"
				,"type": "text"
				,"var": "parking"
			},{
				"name":"Allow Events"
				,"type": "tick"
				,"var": "allowevents"
				,"default":"0"
			},{
				"name":"Allow Children"
				,"type": "tick"
				,"var": "allowchildren"
				,"default":"0"
			},{
				"name":"Allow Infants"
				,"type": "tick"
				,"var": "allowinfants"
				,"default":"1"
			}
			,{
				"name":"Living Room",
				"type":"tick",
				"var":"LIVING_ROOM",
				"default":"0"
			}
			,{
				"name":"Fireplace",
				"type":"tick",
				"var":"FIREPLACE",
				"default":"0"
			}
			,{
				"name":"Ceiling Fan",
				"type":"tick",
				"var":"CEILING_FAN",
				"default":"0"
			}
			,{
				"name":"Wood Stove",
				"type":"tick",
				"var":"WOOD_STOVE",
				"default":"0"
			}
			,{
				"name":"Heating",
				"type":"tick",
				"var":"HEATING",
				"default":"0"
			}
			,{
				"name":"Doorbell",
				"type":"tick",
				"var":"DOORBELL",
				"default":"0"
			}
			,{
				"name":"Elevator",
				"type":"tick",
				"var":"ELEVATOR",
				"default":"0"
			}
			,{
				"name":"Air Conditioning",
				"type":"tick",
				"var":"AIR_CONDITIONING",
				"default":"0"
			}
			,{
				"name":"Telephone",
				"type":"tick",
				"var":"TELEPHONE",
				"default":"0"
			}
			,{
				"name":"Bathrobe",
				"type":"tick",
				"var":"BATHROBE",
				"default":"0"
			}
			,{
				"name":"Iron Board",
				"type":"tick",
				"var":"IRON_BOARD",
				"default":"0"
			}
			,{
				"name":"Towels",
				"type":"tick",
				"var":"TOWELS",
				"default":"0"
			}
			,{
				"name":"Hair Dryer",
				"type":"tick",
				"var":"HAIR_DRYER",
				"default":"0"
			}
			,{
				"name":"Linens",
				"type":"tick",
				"var":"LINENS",
				"default":"0"
			}
			,{
				"name":"Dryer",
				"type":"tick",
				"var":"DRYER",
				"default":"0"
			}
			,{
				"name":"Slippers",
				"type":"tick",
				"var":"SLIPPERS",
				"default":"0"
			}
			,{
				"name":"Shampoo",
				"type":"tick",
				"var":"SHAMPOO",
				"default":"0"
			}
			,{
				"name":"Washer",
				"type":"tick",
				"var":"WASHER",
				"default":"0"
			}
			,{
				"name":"Toiletries",
				"type":"tick",
				"var":"TOILETRIES",
				"default":"0"
			}
			,{
				"name":"Hangers",
				"type":"tick",
				"var":"HANGERS",
				"default":"0"
			}
			,{
				"name":"Balcony",
				"type":"tick",
				"var":"BALCONY",
				"default":"0"
			}
			,{
				"name":"Grill",
				"type":"tick",
				"var":"GRILL",
				"default":"0"
			}
			,{
				"name":"Roof Terrace",
				"type":"tick",
				"var":"ROOF_TERRACE",
				"default":"0"
			}
			,{
				"name":"Garage",
				"type":"tick",
				"var":"GARAGE",
				"default":"0"
			}
			,{
				"name":"Private Entrance",
				"type":"tick",
				"var":"PRIVATE_ENTRANCE",
				"default":"0"
			}
			,{
				"name":"Safe",
				"type":"tick",
				"var":"SAFE",
				"default":"0"
			}
			,{
				"name":"Smoke Detector",
				"type":"tick",
				"var":"SMOKE_DETECTOR",
				"default":"0"
			}
			,{
				"name":"Deck Patio Uncovered",
				"type":"tick",
				"var":"DECK_PATIO_UNCOVERED",
				"default":"0"
			}
			,{
				"name":"Game Room",
				"type":"tick",
				"var":"GAME_ROOM",
				"default":"0"
			}
			,{
				"name":"Private Yard",
				"type":"tick",
				"var":"PRIVATE_YARD",
				"default":"0"
			}
			,{
				"name":"Parking Included",
				"type":"tick",
				"var":"PARKING_INCLUDED",
				"default":"0"
			}
			,{
				"name":"Lanai Gazebo Covered",
				"type":"tick",
				"var":"LANAI_GAZEBO_COVERED",
				"default":"0"
			}
			,{
				"name":"Sitting Area",
				"type":"tick",
				"var":"SITTING_AREA",
				"default":"0"
			}
			,{
				"name":"Parking Possible",
				"type":"tick",
				"var":"PARKING_POSSIBLE",
				"default":"0"
			}
			,{
				"name":"Garden",
				"type":"tick",
				"var":"GARDEN",
				"default":"0"
			}
			,{
				"name":"Parking Paid",
				"type":"tick",
				"var":"PARKING_PAID",
				"default":"0"
			}
			,{
				"name":"Veranda",
				"type":"tick",
				"var":"VERANDA",
				"default":"0"
			}
			,{
				"name":"Co Detector",
				"type":"tick",
				"var":"CO_DETECTOR",
				"default":"0"
			}
			,{
				"name":"Lockers",
				"type":"tick",
				"var":"LOCKERS",
				"default":"0"
			}
			,{
				"name":"Fire Extinguisher",
				"type":"tick",
				"var":"FIRE_EXTINGUISHER",
				"default":"0"
			}
			,{
				"name":"Safety Card",
				"type":"tick",
				"var":"SAFETY_CARD",
				"default":"0"
			}
			,{
				"name":"First aid Kit",
				"type":"tick",
				"var":"FIRST_AID_KIT",
				"default":"0"
			}
			,{
				"name":"Lock Bedroom",
				"type":"tick",
				"var":"LOCK_BEDROOM",
				"default":"0"
			}
			,{
				"name":"Desk",
				"type":"tick",
				"var":"DESK",
				"default":"0"
			}
			,{
				"name":"Business Center",
				"type":"tick",
				"var":"BUSINESS_CENTER",
				"default":"0"
			}
			,{
				"name":"Laptop Friendly",
				"type":"tick",
				"var":"LAPTOP_FRIENDLY",
				"default":"0"
			}
			,{
				"name":"Books",
				"type":"tick",
				"var":"BOOKS",
				"default":"0"
			}
			,{
				"name":"Music Library",
				"type":"tick",
				"var":"MUSIC_LIBRARY",
				"default":"0"
			}
			,{
				"name":"Satellite",
				"type":"tick",
				"var":"SATELLITE",
				"default":"0"
			}
			,{
				"name":"Video Games",
				"type":"tick",
				"var":"VIDEO_GAMES",
				"default":"0"
			}
			,{
				"name":"Stereo",
				"type":"tick",
				"var":"STEREO",
				"default":"0"
			}
			,{
				"name":"Dvd",
				"type":"tick",
				"var":"DVD",
				"default":"0"
			}
			,{
				"name":"Table Tennis",
				"type":"tick",
				"var":"TABLE_TENNIS",
				"default":"0"
			}
			,{
				"name":"Video Library",
				"type":"tick",
				"var":"VIDEO_LIBRARY",
				"default":"0"
			}
			,{
				"name":"Foosball",
				"type":"tick",
				"var":"FOOSBALL",
				"default":"0"
			}
			,{
				"name":"Pool Table",
				"type":"tick",
				"var":"POOL_TABLE",
				"default":"0"
			}
			,{
				"name":"Tv",
				"type":"tick",
				"var":"TV",
				"default":"0"
			}
			,{
				"name":"Video on Demand",
				"type":"tick",
				"var":"VIDEO_ON_DEMAND",
				"default":"0"
			}
			,{
				"name":"Games",
				"type":"tick",
				"var":"GAMES",
				"default":"0"
			}
			,{
				"name":"Cable",
				"type":"tick",
				"var":"CABLE",
				"default":"0"
			}
			,{
				"name":"Toys",
				"type":"tick",
				"var":"TOYS",
				"default":"0"
			}
			,{
				"name":"Dinner None",
				"type":"tick",
				"var":"DINNER_NONE",
				"default":"0"
			}
			,{
				"name":"Breakfast None",
				"type":"tick",
				"var":"BREAKFAST_NONE",
				"default":"0"
			}
			,{
				"name":"Lunch Possible",
				"type":"tick",
				"var":"LUNCH_POSSIBLE",
				"default":"0"
			}
			,{
				"name":"Minibar",
				"type":"tick",
				"var":"MINIBAR",
				"default":"0"
			}
			,{
				"name":"Private Chef",
				"type":"tick",
				"var":"PRIVATE_CHEF",
				"default":"0"
			}
			,{
				"name":"Cafe",
				"type":"tick",
				"var":"CAFE",
				"default":"0"
			}
			,{
				"name":"Lunch Included",
				"type":"tick",
				"var":"LUNCH_INCLUDED",
				"default":"0"
			}
			,{
				"name":"Breakfast Possible",
				"type":"tick",
				"var":"BREAKFAST_POSSIBLE",
				"default":"0"
			}
			,{
				"name":"Dinner Possible",
				"type":"tick",
				"var":"DINNER_POSSIBLE",
				"default":"0"
			}
			,{
				"name":"Breakfast Included",
				"type":"tick",
				"var":"BREAKFAST_INCLUDED",
				"default":"0"
			}
			,{
				"name":"Dinner Included",
				"type":"tick",
				"var":"DINNER_INCLUDED",
				"default":"0"
			}
			,{
				"name":"Meals None",
				"type":"tick",
				"var":"MEALS_NONE",
				"default":"0"
			}
			,{
				"name":"Restaurant",
				"type":"tick",
				"var":"RESTAURANT",
				"default":"0"
			}
			,{
				"name":"Room Service",
				"type":"tick",
				"var":"ROOM_SERVICE",
				"default":"0"
			}
			,{
				"name":"Meals Possible",
				"type":"tick",
				"var":"MEALS_POSSIBLE",
				"default":"0"
			}
			,{
				"name":"Lunch None",
				"type":"tick",
				"var":"LUNCH_NONE",
				"default":"0"
			}
			,{
				"name":"Breakfast in Room",
				"type":"tick",
				"var":"BREAKFAST_IN_ROOM",
				"default":"0"
			}
			,{
				"name":"Internet",
				"type":"tick",
				"var":"INTERNET",
				"default":"0"
			}
			,{
				"name":"Wifi",
				"type":"tick",
				"var":"WIFI",
				"default":"0"
			}
			,{
				"name":"Kitchen",
				"type":"tick",
				"var":"KITCHEN",
				"default":"0"
			}
			,{
				"name":"Dishes Utensils",
				"type":"tick",
				"var":"DISHES_UTENSILS",
				"default":"0"
			}
			,{
				"name":"Kettle",
				"type":"tick",
				"var":"KETTLE",
				"default":"0"
			}
			,{
				"name":"Refrigerator",
				"type":"tick",
				"var":"REFRIGERATOR",
				"default":"0"
			}
			,{
				"name":"Toaster",
				"type":"tick",
				"var":"TOASTER",
				"default":"0"
			}
			,{
				"name":"Microwave",
				"type":"tick",
				"var":"MICROWAVE",
				"default":"0"
			}
			,{
				"name":"Dishwasher",
				"type":"tick",
				"var":"DISHWASHER",
				"default":"0"
			}
			,{
				"name":"Dining Area",
				"type":"tick",
				"var":"DINING_AREA",
				"default":"0"
			}
			,{
				"name":"Shared Kitchen",
				"type":"tick",
				"var":"SHARED_KITCHEN",
				"default":"0"
			}
			,{
				"name":"Dining Room",
				"type":"tick",
				"var":"DINING_ROOM",
				"default":"0"
			}
			,{
				"name":"Freezer",
				"type":"tick",
				"var":"FREEZER",
				"default":"0"
			}
			,{
				"name":"Oven",
				"type":"tick",
				"var":"OVEN",
				"default":"0"
			}
			,{
				"name":"Spices",
				"type":"tick",
				"var":"SPICES",
				"default":"0"
			}
			,{
				"name":"Coffee Maker",
				"type":"tick",
				"var":"COFFEE_MAKER",
				"default":"0"
			}
			,{
				"name":"Highchair",
				"type":"tick",
				"var":"HIGHCHAIR",
				"default":"0"
			}
			,{
				"name":"Raclette",
				"type":"tick",
				"var":"RACLETTE",
				"default":"0"
			}
			,{
				"name":"Stove",
				"type":"tick",
				"var":"STOVE",
				"default":"0"
			}
			,{
				"name":"Beach",
				"type":"tick",
				"var":"BEACH",
				"default":"0"
			}
			,{
				"name":"Downtown",
				"type":"tick",
				"var":"DOWNTOWN",
				"default":"0"
			}
			,{
				"name":"Beach Front",
				"type":"tick",
				"var":"BEACH_FRONT",
				"default":"0"
			}
			,{
				"name":"Golf Course Front",
				"type":"tick",
				"var":"GOLF_COURSE_FRONT",
				"default":"0"
			}
			,{
				"name":"Beach View",
				"type":"tick",
				"var":"BEACH_VIEW",
				"default":"0"
			}
			,{
				"name":"Golf Course View",
				"type":"tick",
				"var":"GOLF_COURSE_VIEW",
				"default":"0"
			}
			,{
				"name":"Lake",
				"type":"tick",
				"var":"LAKE",
				"default":"0"
			}
			,{
				"name":"Mountain",
				"type":"tick",
				"var":"MOUNTAIN",
				"default":"0"
			}
			,{
				"name":"Monument View",
				"type":"tick",
				"var":"MONUMENT_VIEW",
				"default":"0"
			}
			,{
				"name":"Lake View",
				"type":"tick",
				"var":"LAKE_VIEW",
				"default":"0"
			}
			,{
				"name":"Lake Front",
				"type":"tick",
				"var":"LAKE_FRONT",
				"default":"0"
			}
			,{
				"name":"Mountain View",
				"type":"tick",
				"var":"MOUNTAIN_VIEW",
				"default":"0"
			}
			,{
				"name":"Ski Out",
				"type":"tick",
				"var":"SKI_OUT",
				"default":"0"
			}
			,{
				"name":"Resort",
				"type":"tick",
				"var":"RESORT",
				"default":"0"
			}
			,{
				"name":"Waterfront",
				"type":"tick",
				"var":"WATERFRONT",
				"default":"0"
			}
			,{
				"name":"Town",
				"type":"tick",
				"var":"TOWN",
				"default":"0"
			}
			,{
				"name":"River",
				"type":"tick",
				"var":"RIVER",
				"default":"0"
			}
			,{
				"name":"Near Ocean",
				"type":"tick",
				"var":"NEAR_OCEAN",
				"default":"0"
			}
			,{
				"name":"Ocean Front",
				"type":"tick",
				"var":"OCEAN_FRONT",
				"default":"0"
			}
			,{
				"name":"Rural",
				"type":"tick",
				"var":"RURAL",
				"default":"0"
			}
			,{
				"name":"Village",
				"type":"tick",
				"var":"VILLAGE",
				"default":"0"
			}
			,{
				"name":"Ocean View",
				"type":"tick",
				"var":"OCEAN_VIEW",
				"default":"0"
			}
			,{
				"name":"Ski In",
				"type":"tick",
				"var":"SKI_IN",
				"default":"0"
			}
			,{
				"name":"Water View",
				"type":"tick",
				"var":"WATER_VIEW",
				"default":"0"
			}
			,{
				"name":"Pets Considered",
				"type":"tick",
				"var":"PETS_CONSIDERED",
				"default":"0"
			}
			,{
				"name":"Pets not Allowed",
				"type":"tick",
				"var":"PETS_NOT_ALLOWED",
				"default":"0"
			}
			,{
				"name":"Hot Tub",
				"type":"tick",
				"var":"HOT_TUB",
				"default":"0"
			}
			,{
				"name":"Pool Indoor",
				"type":"tick",
				"var":"POOL_INDOOR",
				"default":"0"
			}
			,{
				"name":"Massage",
				"type":"tick",
				"var":"MASSAGE",
				"default":"0"
			}
			,{
				"name":"Pool Private",
				"type":"tick",
				"var":"POOL_PRIVATE",
				"default":"0"
			}
			,{
				"name":"Pool",
				"type":"tick",
				"var":"POOL",
				"default":"0"
			}
			,{
				"name":"Pool Children",
				"type":"tick",
				"var":"POOL_CHILDREN",
				"default":"0"
			}
			,{
				"name":"Pool Heated",
				"type":"tick",
				"var":"POOL_HEATED",
				"default":"0"
			}
			,{
				"name":"Sauna",
				"type":"tick",
				"var":"SAUNA",
				"default":"0"
			}
			,{
				"name":"Airport Shuttle",
				"type":"tick",
				"var":"AIRPORT_SHUTTLE",
				"default":"0"
			}
			,{
				"name":"Baggage Storage",
				"type":"tick",
				"var":"BAGGAGE_STORAGE",
				"default":"0"
			}
			,{
				"name":"Bar",
				"type":"tick",
				"var":"BAR",
				"default":"0"
			}
			,{
				"name":"Car Available",
				"type":"tick",
				"var":"CAR_AVAILABLE",
				"default":"0"
			}
			,{
				"name":"Concierge",
				"type":"tick",
				"var":"CONCIERGE",
				"default":"0"
			}
			,{
				"name":"Cleaning Possible",
				"type":"tick",
				"var":"CLEANING_POSSIBLE",
				"default":"0"
			}
			,{
				"name":"Cleaning Included",
				"type":"tick",
				"var":"CLEANING_INCLUDED",
				"default":"0"
			}
			,{
				"name":"Chauffeur",
				"type":"tick",
				"var":"CHAUFFEUR",
				"default":"0"
			}
			,{
				"name":"Shop",
				"type":"tick",
				"var":"SHOP",
				"default":"0"
			}
			,{
				"name":"Doorman",
				"type":"tick",
				"var":"DOORMAN",
				"default":"0"
			}
			,{
				"name":"Reception",
				"type":"tick",
				"var":"RECEPTION",
				"default":"0"
			}
			,{
				"name":"Reception 24 Hour",
				"type":"tick",
				"var":"_HOUR",
				"default":"0"
			}
			,{
				"name":"Staff",
				"type":"tick",
				"var":"STAFF",
				"default":"0"
			}
			,{
				"name":"Basketball Court",
				"type":"tick",
				"var":"BASKETBALL_COURT",
				"default":"0"
			}
			,{
				"name":"Bicycle",
				"type":"tick",
				"var":"BICYCLE",
				"default":"0"
			}
			,{
				"name":"Equestrian Events",
				"type":"tick",
				"var":"EQUESTRIAN_EVENTS",
				"default":"0"
			}
			,{
				"name":"Boat",
				"type":"tick",
				"var":"BOAT",
				"default":"0"
			}
			,{
				"name":"Fishing",
				"type":"tick",
				"var":"FISHING",
				"default":"0"
			}
			,{
				"name":"Cycling",
				"type":"tick",
				"var":"CYCLING",
				"default":"0"
			}
			,{
				"name":"Fitness Room",
				"type":"tick",
				"var":"FITNESS_ROOM",
				"default":"0"
			}
			,{
				"name":"Horse Riding",
				"type":"tick",
				"var":"HORSE_RIDING",
				"default":"0"
			}
			,{
				"name":"Hiking",
				"type":"tick",
				"var":"HIKING",
				"default":"0"
			}
			,{
				"name":"Gym",
				"type":"tick",
				"var":"GYM",
				"default":"0"
			}
			,{
				"name":"Golf",
				"type":"tick",
				"var":"GOLF",
				"default":"0"
			}
			,{
				"name":"Cross Country Skiing",
				"type":"tick",
				"var":"CROSS_COUNTRY_SKIING",
				"default":"0"
			}
			,{
				"name":"Kayaking",
				"type":"tick",
				"var":"KAYAKING",
				"default":"0"
			}
			,{
				"name":"Hunting",
				"type":"tick",
				"var":"HUNTING",
				"default":"0"
			}
			,{
				"name":"Ice Skating",
				"type":"tick",
				"var":"ICE_SKATING",
				"default":"0"
			}
			,{
				"name":"Mountain Biking",
				"type":"tick",
				"var":"MOUNTAIN_BIKING",
				"default":"0"
			}
			,{
				"name":"Jet Skiing",
				"type":"tick",
				"var":"JET_SKIING",
				"default":"0"
			}
			,{
				"name":"Mountain Climbing",
				"type":"tick",
				"var":"MOUNTAIN_CLIMBING",
				"default":"0"
			}
			,{
				"name":"Kayak Canoe",
				"type":"tick",
				"var":"KAYAK_CANOE",
				"default":"0"
			}
			,{
				"name":"Mountaineering",
				"type":"tick",
				"var":"MOUNTAINEERING",
				"default":"0"
			}
			,{
				"name":"Roller Blading",
				"type":"tick",
				"var":"ROLLER_BLADING",
				"default":"0"
			}
			,{
				"name":"Rafting",
				"type":"tick",
				"var":"RAFTING",
				"default":"0"
			}
			,{
				"name":"Parasailing",
				"type":"tick",
				"var":"PARASAILING",
				"default":"0"
			}
			,{
				"name":"Paragliding",
				"type":"tick",
				"var":"PARAGLIDING",
				"default":"0"
			}
			,{
				"name":"Sailing",
				"type":"tick",
				"var":"SAILING",
				"default":"0"
			}
			,{
				"name":"Snow Sports Gear",
				"type":"tick",
				"var":"SNOW_SPORTS_GEAR",
				"default":"0"
			}
			,{
				"name":"Snowboarding",
				"type":"tick",
				"var":"SNOWBOARDING",
				"default":"0"
			}
			,{
				"name":"Scuba or Snorkeling",
				"type":"tick",
				"var":"SCUBA_OR_SNORKELING",
				"default":"0"
			}
			,{
				"name":"Skiing",
				"type":"tick",
				"var":"SKIING",
				"default":"0"
			}
			,{
				"name":"Surfing",
				"type":"tick",
				"var":"SURFING",
				"default":"0"
			}
			,{
				"name":"Swimming",
				"type":"tick",
				"var":"SWIMMING",
				"default":"0"
			}
			,{
				"name":"Skiing Water",
				"type":"tick",
				"var":"SKIING_WATER",
				"default":"0"
			}
			,{
				"name":"Water Sports",
				"type":"tick",
				"var":"WATER_SPORTS",
				"default":"0"
			}
			,{
				"name":"Tubing Water",
				"type":"tick",
				"var":"TUBING_WATER",
				"default":"0"
			}
			,{
				"name":"Wind Surfing",
				"type":"tick",
				"var":"WIND_SURFING",
				"default":"0"
			}
			,{
				"name":"Whitewater Rafting",
				"type":"tick",
				"var":"WHITEWATER_RAFTING",
				"default":"0"
			}
			,{
				"name":"Trampoline",
				"type":"tick",
				"var":"TRAMPOLINE",
				"default":"0"
			}
			,{
				"name":"Tennis",
				"type":"tick",
				"var":"TENNIS",
				"default":"0"
			}
			,{
				"name":"Water Sports Gear",
				"type":"tick",
				"var":"WATER_SPORTS_GEAR",
				"default":"0"
			}
			,{
				"name":"Adults Only",
				"type":"tick",
				"var":"ADULTS_ONLY",
				"default":"0"
			}
			,{
				"name":"Children not Allowed",
				"type":"tick",
				"var":"CHILDREN_NOT_ALLOWED",
				"default":"0"
			}
			,{
				"name":"Long Term Renters",
				"type":"tick",
				"var":"LONG_TERM_RENTERS",
				"default":"0"
			}
			,{
				"name":"Smoking not Allowed",
				"type":"tick",
				"var":"SMOKING_NOT_ALLOWED",
				"default":"0"
			}
			,{
				"name":"Disabled Accessible",
				"type":"tick",
				"var":"DISABLED_ACCESSIBLE",
				"default":"0"
			}
			,{
				"name":"Minimum age Limit",
				"type":"tick",
				"var":"MINIMUM_AGE_LIMIT",
				"default":"0"
			}
			,{
				"name":"Children Welcome",
				"type":"tick",
				"var":"CHILDREN_WELCOME",
				"default":"0"
			}
			,{
				"name":"Car Necessary",
				"type":"tick",
				"var":"CAR_NECESSARY",
				"default":"0"
			}
			,{
				"name":"Car Recommended",
				"type":"tick",
				"var":"CAR_RECOMMENDED",
				"default":"0"
			}
			,{
				"name":"Events Allowed",
				"type":"tick",
				"var":"EVENTS_ALLOWED",
				"default":"0"
			}
			,{
				"name":"Senior Adults Only",
				"type":"tick",
				"var":"SENIOR_ADULTS_ONLY",
				"default":"0"
			}
			,{
				"name":"Wheelchair Yes",
				"type":"tick",
				"var":"WHEELCHAIR_YES",
				"default":"0"
			}
			,{
				"name":"Infants not Allowed",
				"type":"tick",
				"var":"INFANTS_NOT_ALLOWED",
				"default":"0"
			}
			,{
				"name":"Car not Necessary",
				"type":"tick",
				"var":"CAR_NOT_NECESSARY",
				"default":"0"
			}
			,{
				"name":"Smoking Allowed",
				"type":"tick",
				"var":"SMOKING_ALLOWED",
				"default":"0"
			}
			,{
				"name":"Wheelchair No",
				"type":"tick",
				"var":"WHEELCHAIR_NO",
				"default":"0"
			}
			,{
				"name":"Children not allowed details"
				,"type": "text"
				,"var": "children_not_allowed_details"
				,"default":"0"
			},{
				"name":"Listing Expectations"
				,"info":"Listing Expectations"
				,"type": "text"
				,"var": "listing_expectations"
			},{
				"name":"Space"
				,"info":"Size of Apartment"
				,"type": "text"
				,"var": "space"
			},{
				"name":"Interaction"
				,"info":"How the staff interact with the guests"
				,"type": "text"
				,"var": "Interaction"
			},{
				"name":"Neighbourhood"
				,"info":"Deatils of the Neighbourhood"
				,"type": "text"
				,"var": "neighbourhood"
			},{
				"name":"Directions"
				,"info":"Directions"
				,"type": "text"
				,"var": "directions"
			},{
				"name":"Transit"
				,"info":"Transit"
				,"type": "text"
				,"var": "transit"
			},{
				"name":"Permit ID"
				,"info":"Permit ID"
				,"type": "text"
				,"var": "permitid"
			},{
				"name":"House Rules"
				,"info":"House Rules"
				,"type": "text"
				,"var": "house_rules"
			},{
				"name":"House Manual"
				,"info":"House Manual"
				,"type": "text"
				,"var": "house_manual"
			},{
				"name":"Notes"
				,"info":"Notes"
				,"type": "text"
				,"var": "Notes"
			},{
				"name":"Summary"
				,"info":"This is the full description of the property"
				,"type": "text"
				,"var": "summary"
			},{
				"name":"Default Minimum Stay"
				,"info":"Default Minimum Stay"
				,"type": "text"
				,"var": "default_minimum_stay"
			},{
				"name":"Default Daily Price"
				,"info":"Add a maximum price (without any pound symbol or other punctuation) if the price is a guide. Leave empty to show as fixed price."
				,"type": "text"
				,"var": "default_daily_price"
			},{
				"name":"Cleaning Fee"
				,"info":"Add a Cleaning Fee"
				,"type": "text"
				,"var": "cleaning_fee"
			},{
				"name":"Security Deposit"
				,"info":"Add a Security Deposit"
				,"type": "text"
				,"var": "security_deposit"
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
			},{
				"name":"Images"
				,"type": "hidden"
				,"var": "images_json"
			},{
				"name":"Small Images"
				,"type": "hidden"
				,"var": "small_images_json"
			},{
				"name":"Small Master Image"
				,"type": "hidden"
				,"var": "small_master_image"
			}]
		}
	}
}
@@@ *}
{if $smarty.get.app}
{if $smarty.get.webhook}
	{if $metadata.useross_webhook||$metadata.directconfirm_webhook}
		{* check if we've dealt with this before *}
		{get_page_child_data type="webhooks" pageid=$content.id}
		{foreach from=$page_child_data item=booking}
			{if $booking.bookid==$smarty.get.bookid}
				{assign var=bookingexists value=true}
			{/if}
		{/foreach}
		{if !$bookingexists}
			{add_page_child_data
			 pageid=$content.id
			 userid=0
			more_data_bookid=$smarty.get.bookid
			 show_in_activity=0
			 type="webhooks"}
			 {if $metadata.useross_webhook}
			{* send useross link bank to info field of booking *}
			{beds24 action="senduseross" skipuseross="false" bookid=$smarty.get.bookid propid=$smarty.request.propertyid longtoken=$metadata.longtoken invitecode=$metadata.invitecode refreshtoken=$metadata.refreshtoken}
			{else}
			{beds24 action="senduseross" skipuseross="true" bookid=$smarty.get.bookid propid=$smarty.request.propertyid longtoken=$metadata.longtoken invitecode=$metadata.invitecode refreshtoken=$metadata.refreshtoken}
			{/if}
			{if $bookingconfirmed}
				{get_user_child_data
				type="booking"
				}
				{foreach from=$user_child_data item=data}
					{if $data.bookid==$smarty.get.bookid}
					{assign var=firstNight value=$data.firstNight}
					{assign var=lastNight value=$data.lastNight}
					{assign var=propName value=$data.property_name}
					{assign var=firstName value=$data.real_first_name}
					{assign var=lastName value=$data.real_last_name}
					{assign var=avg_per_day value=$data.avg_per_day}
					{assign var=qty_days value=$data.qty_days}
					{assign var=upsells value=$data.upsells}
					{assign var=optional value=$data.optional}
					{assign var=adults value=$data.adults}
					{assign var=children value=$data.children}
					{assign var=deposit value=$data.deposit}
					{assign var=linksrez_code value=$data.linksrez_code}
					{assign var=linksrez_rate value=$data.linksrez_rate}
					{assign var=linksrez_hotel value=$data.linksrez_hotel}
					{assign var=lodgify_houseid value=$data.lodgify_houseid}
					{assign var=lodgify_roomtypeid value=$data.lodgify_roomtypeid}
					{assign var=total_topay value=$data.total_topay}
					{assign var=deposit_topay value=$data.deposit_topay}
					{assign var=currency value=$data.currency}
					{delete_user_child_data
						id=$data.id
						userid=$data.owner.id
					}
					{assign var="owner" value=$data.owner.id}
					{/if}
				{/foreach}

				{add_user_child_data
				userid=$owner
				type="booking"
				data=[]
				more_data_status="Paid"
				more_data_firstNight=$firstNight
				more_data_lastNight=$lastNight
				more_data_property_name=$propName
				more_data_bookid=$smarty.request.bookid
				more_data_avg_per_day=$avg_per_day
				more_data_qty_days=$qty_days
				more_data_real_first_name=$firstName
				more_data_real_last_name=$lastName
				more_data_upsells=$upsells
				more_data_optional=$optional
				more_data_deposit=$deposit
				more_data_currency=$currency
				more_data_linksrez_code=$linksrez_code
				more_data_linksrez_hotel=$linksrez_hotel
				more_data_linksrez_rate=$linksrez_rate
				more_data_lodgify_houseid=$lodgify_houseid
				more_data_lodgify_roomtypeid=$lodgify_roomtypeid
				more_data_adults=$adults
				more_data_children=$children
				more_data_total_topay=$total_topay
				more_data_deposit_topay=$deposit_topay
				}

			{/if}
			{if $refreshtoken}
				{add_widget_meta
					instance_id=$metadata.instance_id
					name="refreshtoken"
					value=$refreshtoken
				}
			{/if}
			{if $longtoken}
				{add_widget_meta
					instance_id=$metadata.instance_id
					name="longtoken"
					value=$longtoken
				}
			{/if}
		{/if}
	{/if}
	{if $metadata.linksrez_webhook}
		{* check if it's a website booking, if so Linksrez will already have been posted*}
		{get_user_child_data type="booking"}
		{assign var=bookingexists value=false}
		{foreach from=$user_child_data item=booking}
			{if $booking.bookid==$smarty.get.bookid}
				{assign var=bookingexists value=true}
			{/if}
		{/foreach}
		{* check if we've dealt with this before *}
		{get_page_child_data type="webhooks" pageid=$content.id}
		{foreach from=$page_child_data item=booking}
			{if $booking.bookid==$smarty.get.bookid}
				{assign var=bookingexists value=true}
			{/if}
		{/foreach}
		{if !$bookingexists}
		{pages_by_tag tags=$metadata.tagids assign=lrchecks direction=asc filter_meta_roomid=$smarty.get.roomid}
		{foreach from=$lrchecks item=lrcheck}
		{beds24 action="webhook" propkey=$lrcheck.meta.b24_api_propkey apikey=$metadata.b24_apikey linksrez_code=$lrcheck.meta.linksrez_code linksrez_rate=$lrcheck.meta.linksrez_rate linksrez_hotel=$lrcheck.meta.linksrez_hotel lodgify_houseid=$lrcheck.meta.lodgify_houseid lodgify_roomtypeid=$lrcheck.meta.lodgify_roomtypeid}
		{if $lrcheck.meta.linksrez_code!=""}
		{assign var="lr" value=true}
		{/if}
		{if $lrcheck.meta.lodgify_houseid!=""}
		{assign var="lf" value=true}
		{/if}
		{/foreach}
		{/if}
		{if $lf}
			{beds24 action="createBookingLodgify"
			apikey=$metadata.lodgify_apikey
			guestFirstName=$firstName
			guestLastName=$lastName
			guestEmail=$email
			guestPhone=$phone
			guestArrivalTime=$arrivalTime
			guestAddress=$adress
			guestCity=$city
			guestPostcode=$postcode
			guestCountry=$country
			guestComments=$comments
			guestCompany=$company
			invoicee=""
			cookies=$b24data
			}
		{/if}
		{if $lr}
			{beds24 action="createBookingLinksrez"
			guestFirstName=$firstName
			guestLastName=$lastName
			guestEmail=$email
			guestPhone=$phone
			guestArrivalTime=$arrivalTime
			guestAddress=$address
			guestCity=$city
			guestPostcode=$postcode
			guestCountry=$country
			guestComments=$comments
			guestCompany=$company
			invoicee=""
			cookies=$b24data
		}
		{/if}
		{add_page_child_data
		 pageid=$content.id
		 userid=0
		more_data_bookid=$smarty.get.bookid
		 show_in_activity=0
		 type="webhooks"}
	 {/if}
{/if}
{if $smarty.get.ajax}
{page_by_slug slug=$vars[0] assign=page thispage=$content.id}
{beds24 action="checkFastAvailability" calendar=$page.meta.calendar number=$smarty.cookies.adults start=$smarty.cookies.startdate end=$smarty.cookies.enddate}
{if $page.meta.property_currency=="EUR"}€{elseif $page.meta.property_currency=="GBP"}£{else}&dollar;{/if}{$price}
{/if}
{if $smarty.get.linksrezinit}
	{pages_by_tag tags=$metadata.tagids assign=pages direction=asc filter_meta_linksrez_hotel=$smarty.get.hotelCode}
	{assign var="rates" value=""}
	{foreach from=$pages item=page}
	  {if !$page.meta.linksrez_rate|in_array:$donerates}
	{if $rates!=""}
	{assign var="rates" value="`$rates`,"}
	{/if}
	{assign var="rates" value="`$rates`\"`$page.meta.linksrez_rate`\""}
	    {append var="donerates" value=$page.meta.linksrez_rate}
	  {/if}
	{/foreach}

{literal}{{/literal}
  "ratePlans": [{$rates}], 
  "roomTypes":[{foreach from=$pages item=page name="pages"}
  {if !$page.meta.linksrez_code|in_array:$donecodes}
    {if !$smarty.foreach.pages.first},{/if}"{$page.meta.linksrez_code}"
    {append var="donecodes" value=$page.meta.linksrez_code}
    {/if}
	{/foreach}]
{literal}}{/literal}
{/if}
{if $smarty.get.linksrezrates}
	{"Starting linksrezpush"|error_log}
{linksrez}
{page_by_slug slug=$metadata.destination|replace:"/":"" assign="bookpage"}
{get_page_child_data type="calendar" pageid=$bookpage.id}
{foreach from=$dates item="hotelrooms" key="hotel"}
	{"in dates loop - hotel: `$hotel`"|error_log}
{foreach from=$hotelrooms item="date" key="roomid"}
	{pages_by_tag tags=$metadata.tagids assign=pages direction=asc filter_meta_linksrez_code=$roomid filter_meta_linksrez_hotel=$hotel}
	{foreach from=$pages item=page}
		{beds24 action="mergeDates" existing=$page.meta.calendar new=$date[$page.meta.linksrez_rate]}
	{"After mergeDates"|error_log}
		{foreach from=$page_child_data item=cal key=id}
			{if $cal.linksrez_code==$roomid && $cal.linksrez_rate==$page.meta.linksrez_rate && $cal.linksrez_hotel==$hotel}
	{"Found calendar to update"|error_log}
				{edit_page_child_data id=$id more_data_data=$calendar}

			{/if}
		{/foreach}
		{edit_page
			id=$page.static_pagesid
			meta_calendar=$calendar
		}
	{/foreach}
{/foreach}
{/foreach}
{die}
{/if}
{else}
{assign var="excluded" value=","|explode:$metadata.excluded}
{* Logic *}
{if $vars[0]} {* If showing post *}


	{page_by_slug slug=$vars[0] assign=page thispage=$content.id}
	{assign var=singlepage value=true}

{else}

{pages_by_tag tags=$metadata.tagids assign=pages direction=asc}
{foreach from=$pages item=page}
{if $cities|is_array && $page.meta.city|in_array:$cities}{else}
{append var='cities' value=$page.meta.city}
{/if}
{if $states|is_array && $page.meta.state|in_array:$states}{else}
{append var='states' value=$page.meta.state}
{/if}
{if $bedrooms|is_array && $page.meta.bedrooms|in_array:$bedrooms}{else}
{append var='bedrooms' value=$page.meta.bedrooms}
{/if}
	{if $types|is_array && $page.meta.type|in_array:$types}{else}
	{append var='types' value=$page.meta.type}
	{/if}
{/foreach}
{if $types && $types|@sort eq 1}{/if}
{if $states && $states|@sort eq 1}{/if}
{if $cities && $cities|@sort eq 1}{/if}
<h2>{if $metadata.browse_properties_text}{$metadata.browse_properties_text}{else}Browse Properties{/if}</h2>

	{if $metadata.show_filter}
		<form action="" method="get">

<div class="column_row">

	<div class='column  oneCol first'>

		<p>{if $metadata.bedrooms_filter_label}{$metadata.bedrooms_filter_label}{else}Bedrooms:{/if} 
		<select name="filter_meta[bedrooms]">
		<option value="false">{if $metadata.any_option_text}{$metadata.any_option_text}{else}Any{/if}</option>
		{foreach from=$bedrooms item=bedroom}
		{if $bedroom!=""}
		<option {if $smarty.get.filter_meta.bedrooms==$bedroom}selected=selected{/if}>{$bedroom}</option>
		{/if}
		{/foreach}
		</select></p>

	</div>
{if $metadata.show_location}
	<div class='column oneCol lastiftwo'>

		<p>{if $metadata.location_filter_label}{$metadata.location_filter_label}{else}Location:{/if} 
		<select name="filter_meta[city]">
		<option value="false">{if $metadata.any_option_text}{$metadata.any_option_text}{else}Any{/if}</option>
		{foreach from=$cities item=city}
		{if $city!=""}
		<option {if $smarty.get.filter_meta.city==$city}selected=selected{/if}>{$city}</option>
		{/if}
		{/foreach}
		</select></p>

	</div>

{/if}
{if $metadata.show_state}
	<div class='column  oneCol firstiftwo'>

		<p>{if $metadata.british}County{else}State{/if}: 
		<select name="filter_meta[state]">
		<option value="false">{if $metadata.any_option_text}{$metadata.any_option_text}{else}Any{/if}</option>
		{foreach from=$states item=state}
		{if $state!=""}
		<option {if $smarty.get.filter_meta.state==$state}selected=selected{/if}>{$state}</option>
		{/if}
		{/foreach}
		</select></p>

	</div>
{/if}

{if $metadata.showtype}
<div class="column oneCol last">


		<p>{if $metadata.type_filter_label}{$metadata.type_filter_label}{else}Type:{/if} 
		<select name="filter_meta[type]">
		<option value="false">{if $metadata.any_option_text}{$metadata.any_option_text}{else}Any{/if}</option>
		{foreach from=$types item=type}
		{if $type!=""}
		<option {if $smarty.get.filter_meta.type==$type}selected=selected{/if}>{$type}</option>
		{/if}
		{/foreach}
		</select></p>


</div>
{else}
<input type="hidden" name="type" value="false" />
{/if}
</div>

</p>
<input type="submit"/>
</form>
{/if}
{if !$singlepage}
{if !$smarty.request.rebuild}
{redirect location="/book-now"}
{/if}
{"Rebuilding log test"|error_log}
	{if $smarty.request.fast}

		{foreach from=$content.page_child_data.propertykeys item=value key=key}
		{* each one of these is a room, single room props will just be a single room *}
			{assign var=pageid value=$value.values.pageid}
			{pages_by_id ids=$pageid assign="pagetest"}
			{$pagetest[0].meta.propkey}
			{$pagetest[0].meta.roomid}
			{"In FAST Update `$content.http_host`"|error_log}
			{if $pagetest[0].meta.propkey!=""}
				{assign var="calendar" value=false}
				{if $pagetest[0].meta.linksrez_code!=""}
					{beds24 action="updateB24Avail" roomid=$propertyContents.roomId dates=$pagetest[0].meta.calendar propkey=$pagetest[0].meta.b24_api_propkey apikey=$metadata.b24_apikey}
				{elseif $pagetest[0].meta.lodgify_houseid!=""}
					{beds24 action="getCalendarLodgify" roomtypeid=$pagetest[0].meta.lodgify_roomtypeid houseid=$pagetest[0].meta.lodgify_houseid apikey=$metadata.lodgify_apikey}
					{beds24 action="updateB24Avail" roomid=$pagetest[0].meta.roomid dates=$calendar propkey=$pagetest[0].meta.b24_api_propkey apikey=$metadata.b24_apikey}
				{else}
					{beds24 action="getCalendar" propkey=$pagetest[0].meta.propkey roomid=$pagetest[0].meta.roomid}
				{/if}
				{if $calendar}
					{page_by_slug slug=$metadata.destination|replace:"/":"" assign="bookpage"}
					{get_page_child_data type="calendar" pageid=$bookpage.id}
					{foreach from=$page_child_data item=cal key=id}
						{if $pagetest[0].meta.roomid==$cal.roomid}
							{edit_page_child_data id=$id more_data_data=$calendar}
						{/if}
					{/foreach}
					{edit_page
						id=$pageid
						meta_calendar=$calendar
					}
				{/if}
			{/if}

		{/foreach}
	{else}
		{if $metadata.userid}
			{if $smarty.request.fullclear}
				FULL PURGE
				{beds24 action="fullClear"}
			{/if}
			{beds24 action="getProperties" userid=$metadata.userid lang=$content.language}
			{foreach from=$properties item=property}
				{if $metadata.invitecode!=""}
				{beds24 action="getPropertyRooms" propkey=$property.propKey lang=$content.language longtoken=$metadata.longtoken get_offer_pos=1 invitecode=$metadata.invitecode refreshtoken=$metadata.refreshtoken debug=$smarty.request.debug}
				{if $refreshtoken}
					{assign var="metadata.refreshtoken" value=$refreshtoken}
					{add_widget_meta
						instance_id=$metadata.instance_id
						name="refreshtoken"
						value=$refreshtoken
					}
				{/if}
				{if $longtoken}
					{assign var="metadata.longtoken" value=$longtoken}
					{add_widget_meta
						instance_id=$metadata.instance_id
						name="longtoken"
						value=$longtoken
					}
				{/if}
				{else}
				{beds24 action="getPropertyRooms" propkey=$property.propKey lang=$content.language}
				{/if}
				{counter assign="counter" name="count"}
				{foreach from=$propertyRooms item=propertyContents}
			In room loop	
					
					{if !$propertyContents.roomId|in_array:$excluded}
						{assign var=needsupdate value=false}
						{assign var=pageid value=false}
						{assign var=firsttoimport value=true}
						{assign var=filtertype value=$propertyContents.type}
						{foreach from=$content.page_child_data.propertykeys item=value key=key}
						{* each one of these is a room, single room props will just be a single room *}
							{if $value.values.imported=="`$property.propId``$propertyContents.roomId`" && $smarty.get.rebuild && $value.values.pageid!=''}

							{assign var=needsupdate value=$value.id}
							{assign var=pageid value=$value.values.pageid}
							{/if}
							{if $value.values.imported=="`$property.propId``$propertyContents.roomId`" && $value.values.pageid!=''}
							{assign var=firsttoimport value=false}
							{/if}

						{/foreach}

						{if $property.propTypeId=="Condo"||$property.propTypeId=="Hotel"||$property.propTypeId=="Guesthouse"||$property.propTypeId=="Heritage Hotel"||$property.propTypeId=="Aparthotel"||$property.propTypeId=="Bed and Breakfast"||$property.propTypeId=="Boutique Hotel"||$property.propTypeId=="Hostel"}
							{if $propertyContents.displayName!=""}
							{assign var="roomname" value="`$property.name` `$propertyContents.displayName`"}
							{else}
							{assign var="roomname" value="`$property.name` `$propertyContents.name`"}
							{/if}
						{else}
							{if $propertyContents.displayName!=""}
							{assign var="roomname" value=$propertyContents.displayName}
							{else}
							{assign var="roomname" value=$property.name}
							{/if}
						{/if}
						{if $needsupdate}


							{"Rebuilding page needs update"|error_log}
							{"Rebuilding `$content.http_host`"|error_log}
							{pages_by_id ids=$pageid assign="pagetest"}
							{if $pagetest[0].meta.linksrez_code!=""}
								{beds24 action="updateB24Avail" roomid=$propertyContents.roomId dates=$pagetest[0].meta.calendar propkey=$pagetest[0].meta.b24_api_propkey apikey=$metadata.b24_apikey}
							{elseif $pagetest[0].meta.lodgify_houseid!=""}
								{beds24 action="getCalendarLodgify" roomtypeid=$pagetest[0].meta.lodgify_roomtypeid houseid=$pagetest[0].meta.lodgify_houseid apikey=$metadata.lodgify_apikey}
								{edit_page
									id=$pageid
									meta_calendar=$calendar
								}
								{beds24 action="updateB24Avail" roomid=$propertyContents.roomId dates=$calendar propkey=$pagetest[0].meta.b24_api_propkey apikey=$metadata.b24_apikey}
							{else}
								{beds24 action="getCalendar" propkey=$property.propKey roomid=$propertyContents.roomId}
								{edit_page
									id=$pageid
									meta_calendar=$calendar
								}
							{/if}
							{assign var="metadesc" value=$propertyContents.meta_description}
							{if $metadata.skipdesc}
							{assign var=metadesc value=$pagetest[0].meta.ss_page_desc}
							{/if}
							{edit_page
								id=$pageid
								meta_propkey=$property.propKey
								pagetitle=$roomname
								meta_ss_page_title=$roomname
								meta_ss_page_desc=$metadesc
								meta_b24desc=$propertyContents.description
								meta_b24desc2=$propertyContents.description2
								meta_type=$filtertype
								meta_roomid=$propertyContents.roomId
								meta_lastupdated=$smarty.now|date_format:"%Y-%m-%d %H:%M"
								meta_bedrooms=$propertyContents.bedrooms
								meta_bathrooms=$propertyContents.bathrooms
								meta_auxtext=$propertyContents.auxtext
								meta_beds24type=$property.propTypeId
								meta_allowchildren=$propertyContents.allowchildren
								meta_allowinfants=$propertyContents.allowinfants
								meta_allowsmoking=$propertyContents.allowsmoking
								meta_allowpets=$propertyContents.allowpets
								meta_LIVING_ROOM=$propertyContents.LIVING_ROOM
								meta_FIREPLACE=$propertyContents.FIREPLACE
								meta_CEILING_FAN=$propertyContents.CEILING_FAN
								meta_WOOD_STOVE=$propertyContents.WOOD_STOVE
								meta_HEATING=$propertyContents.HEATING
								meta_DOORBELL=$propertyContents.DOORBELL
								meta_ELEVATOR=$propertyContents.ELEVATOR
								meta_AIR_CONDITIONING=$propertyContents.AIR_CONDITIONING
								meta_TELEPHONE=$propertyContents.TELEPHONE
								meta_BATHROBE=$propertyContents.BATHROBE
								meta_IRON_BOARD=$propertyContents.IRON_BOARD
								meta_TOWELS=$propertyContents.TOWELS
								meta_HAIR_DRYER=$propertyContents.HAIR_DRYER
								meta_LINENS=$propertyContents.LINENS
								meta_DRYER=$propertyContents.DRYER
								meta_SLIPPERS=$propertyContents.SLIPPERS
								meta_SHAMPOO=$propertyContents.SHAMPOO
								meta_WASHER=$propertyContents.WASHER
								meta_TOILETRIES=$propertyContents.TOILETRIES
								meta_HANGERS=$propertyContents.HANGERS
								meta_BALCONY=$propertyContents.BALCONY
								meta_GRILL=$propertyContents.GRILL
								meta_ROOF_TERRACE=$propertyContents.ROOF_TERRACE
								meta_GARAGE=$propertyContents.GARAGE
								meta_PRIVATE_ENTRANCE=$propertyContents.PRIVATE_ENTRANCE
								meta_SAFE=$propertyContents.SAFE
								meta_SMOKE_DETECTOR=$propertyContents.SMOKE_DETECTOR
								meta_DECK_PATIO_UNCOVERED=$propertyContents.DECK_PATIO_UNCOVERED
								meta_GAME_ROOM=$propertyContents.GAME_ROOM
								meta_PRIVATE_YARD=$propertyContents.PRIVATE_YARD
								meta_PARKING_INCLUDED=$propertyContents.PARKING_INCLUDED
								meta_LANAI_GAZEBO_COVERED=$propertyContents.LANAI_GAZEBO_COVERED
								meta_SITTING_AREA=$propertyContents.SITTING_AREA
								meta_PARKING_POSSIBLE=$propertyContents.PARKING_POSSIBLE
								meta_GARDEN=$propertyContents.GARDEN
								meta_PARKING_PAID=$propertyContents.PARKING_PAID
								meta_VERANDA=$propertyContents.VERANDA
								meta_CO_DETECTOR=$propertyContents.CO_DETECTOR
								meta_LOCKERS=$propertyContents.LOCKERS
								meta_FIRE_EXTINGUISHER=$propertyContents.FIRE_EXTINGUISHER
								meta_SAFETY_CARD=$propertyContents.SAFETY_CARD
								meta_FIRST_AID_KIT=$propertyContents.FIRST_AID_KIT
								meta_LOCK_BEDROOM=$propertyContents.LOCK_BEDROOM
								meta_DESK=$propertyContents.DESK
								meta_BUSINESS_CENTER=$propertyContents.BUSINESS_CENTER
								meta_LAPTOP_FRIENDLY=$propertyContents.LAPTOP_FRIENDLY
								meta_BOOKS=$propertyContents.BOOKS
								meta_MUSIC_LIBRARY=$propertyContents.MUSIC_LIBRARY
								meta_SATELLITE=$propertyContents.SATELLITE
								meta_VIDEO_GAMES=$propertyContents.VIDEO_GAMES
								meta_STEREO=$propertyContents.STEREO
								meta_DVD=$propertyContents.DVD
								meta_TABLE_TENNIS=$propertyContents.TABLE_TENNIS
								meta_VIDEO_LIBRARY=$propertyContents.VIDEO_LIBRARY
								meta_FOOSBALL=$propertyContents.FOOSBALL
								meta_POOL_TABLE=$propertyContents.POOL_TABLE
								meta_TV=$propertyContents.TV
								meta_VIDEO_ON_DEMAND=$propertyContents.VIDEO_ON_DEMAND
								meta_GAMES=$propertyContents.GAMES
								meta_CABLE=$propertyContents.CABLE
								meta_TOYS=$propertyContents.TOYS
								meta_DINNER_NONE=$propertyContents.DINNER_NONE
								meta_BREAKFAST_NONE=$propertyContents.BREAKFAST_NONE
								meta_LUNCH_POSSIBLE=$propertyContents.LUNCH_POSSIBLE
								meta_MINIBAR=$propertyContents.MINIBAR
								meta_PRIVATE_CHEF=$propertyContents.PRIVATE_CHEF
								meta_CAFE=$propertyContents.CAFE
								meta_LUNCH_INCLUDED=$propertyContents.LUNCH_INCLUDED
								meta_BREAKFAST_POSSIBLE=$propertyContents.BREAKFAST_POSSIBLE
								meta_DINNER_POSSIBLE=$propertyContents.DINNER_POSSIBLE
								meta_BREAKFAST_INCLUDED=$propertyContents.BREAKFAST_INCLUDED
								meta_DINNER_INCLUDED=$propertyContents.DINNER_INCLUDED
								meta_MEALS_NONE=$propertyContents.MEALS_NONE
								meta_RESTAURANT=$propertyContents.RESTAURANT
								meta_ROOM_SERVICE=$propertyContents.ROOM_SERVICE
								meta_MEALS_POSSIBLE=$propertyContents.MEALS_POSSIBLE
								meta_LUNCH_NONE=$propertyContents.LUNCH_NONE
								meta_BREAKFAST_IN_ROOM=$propertyContents.BREAKFAST_IN_ROOM
								meta_INTERNET=$propertyContents.INTERNET
								meta_WIFI=$propertyContents.WIFI
								meta_KITCHEN=$propertyContents.KITCHEN
								meta_DISHES_UTENSILS=$propertyContents.DISHES_UTENSILS
								meta_KETTLE=$propertyContents.KETTLE
								meta_REFRIGERATOR=$propertyContents.REFRIGERATOR
								meta_TOASTER=$propertyContents.TOASTER
								meta_MICROWAVE=$propertyContents.MICROWAVE
								meta_DISHWASHER=$propertyContents.DISHWASHER
								meta_DINING_AREA=$propertyContents.DINING_AREA
								meta_SHARED_KITCHEN=$propertyContents.SHARED_KITCHEN
								meta_DINING_ROOM=$propertyContents.DINING_ROOM
								meta_FREEZER=$propertyContents.FREEZER
								meta_OVEN=$propertyContents.OVEN
								meta_SPICES=$propertyContents.SPICES
								meta_COFFEE_MAKER=$propertyContents.COFFEE_MAKER
								meta_HIGHCHAIR=$propertyContents.HIGHCHAIR
								meta_RACLETTE=$propertyContents.RACLETTE
								meta_STOVE=$propertyContents.STOVE
								meta_BEACH=$propertyContents.BEACH
								meta_DOWNTOWN=$propertyContents.DOWNTOWN
								meta_BEACH_FRONT=$propertyContents.BEACH_FRONT
								meta_GOLF_COURSE_FRONT=$propertyContents.GOLF_COURSE_FRONT
								meta_BEACH_VIEW=$propertyContents.BEACH_VIEW
								meta_GOLF_COURSE_VIEW=$propertyContents.GOLF_COURSE_VIEW
								meta_LAKE=$propertyContents.LAKE
								meta_MOUNTAIN=$propertyContents.MOUNTAIN
								meta_MONUMENT_VIEW=$propertyContents.MONUMENT_VIEW
								meta_LAKE_VIEW=$propertyContents.LAKE_VIEW
								meta_LAKE_FRONT=$propertyContents.LAKE_FRONT
								meta_MOUNTAIN_VIEW=$propertyContents.MOUNTAIN_VIEW
								meta_SKI_OUT=$propertyContents.SKI_OUT
								meta_RESORT=$propertyContents.RESORT
								meta_WATERFRONT=$propertyContents.WATERFRONT
								meta_TOWN=$propertyContents.TOWN
								meta_RIVER=$propertyContents.RIVER
								meta_NEAR_OCEAN=$propertyContents.NEAR_OCEAN
								meta_OCEAN_FRONT=$propertyContents.OCEAN_FRONT
								meta_RURAL=$propertyContents.RURAL
								meta_VILLAGE=$propertyContents.VILLAGE
								meta_OCEAN_VIEW=$propertyContents.OCEAN_VIEW
								meta_SKI_IN=$propertyContents.SKI_IN
								meta_WATER_VIEW=$propertyContents.WATER_VIEW
								meta_PETS_CONSIDERED=$propertyContents.PETS_CONSIDERED
								meta_PETS_NOT_ALLOWED=$propertyContents.PETS_NOT_ALLOWED
								meta_HOT_TUB=$propertyContents.HOT_TUB
								meta_POOL_INDOOR=$propertyContents.POOL_INDOOR
								meta_MASSAGE=$propertyContents.MASSAGE
								meta_POOL_PRIVATE=$propertyContents.POOL_PRIVATE
								meta_POOL=$propertyContents.POOL
								meta_POOL_CHILDREN=$propertyContents.POOL_CHILDREN
								meta_POOL_HEATED=$propertyContents.POOL_HEATED
								meta_SAUNA=$propertyContents.SAUNA
								meta_AIRPORT_SHUTTLE=$propertyContents.AIRPORT_SHUTTLE
								meta_BAGGAGE_STORAGE=$propertyContents.BAGGAGE_STORAGE
								meta_BAR=$propertyContents.BAR
								meta_CAR_AVAILABLE=$propertyContents.CAR_AVAILABLE
								meta_CONCIERGE=$propertyContents.CONCIERGE
								meta_CLEANING_POSSIBLE=$propertyContents.CLEANING_POSSIBLE
								meta_CLEANING_INCLUDED=$propertyContents.CLEANING_INCLUDED
								meta_CHAUFFEUR=$propertyContents.CHAUFFEUR
								meta_SHOP=$propertyContents.SHOP
								meta_DOORMAN=$propertyContents.DOORMAN
								meta_RECEPTION=$propertyContents.RECEPTION
								meta_RECEPTION_24_HOUR=$propertyContents.RECEPTION_24_HOUR
								meta_STAFF=$propertyContents.STAFF
								meta_BASKETBALL_COURT=$propertyContents.BASKETBALL_COURT
								meta_BICYCLE=$propertyContents.BICYCLE
								meta_EQUESTRIAN_EVENTS=$propertyContents.EQUESTRIAN_EVENTS
								meta_BOAT=$propertyContents.BOAT
								meta_FISHING=$propertyContents.FISHING
								meta_CYCLING=$propertyContents.CYCLING
								meta_FITNESS_ROOM=$propertyContents.FITNESS_ROOM
								meta_HORSE_RIDING=$propertyContents.HORSE_RIDING
								meta_HIKING=$propertyContents.HIKING
								meta_GYM=$propertyContents.GYM
								meta_GOLF=$propertyContents.GOLF
								meta_CROSS_COUNTRY_SKIING=$propertyContents.CROSS_COUNTRY_SKIING
								meta_KAYAKING=$propertyContents.KAYAKING
								meta_HUNTING=$propertyContents.HUNTING
								meta_ICE_SKATING=$propertyContents.ICE_SKATING
								meta_MOUNTAIN_BIKING=$propertyContents.MOUNTAIN_BIKING
								meta_JET_SKIING=$propertyContents.JET_SKIING
								meta_MOUNTAIN_CLIMBING=$propertyContents.MOUNTAIN_CLIMBING
								meta_KAYAK_CANOE=$propertyContents.KAYAK_CANOE
								meta_MOUNTAINEERING=$propertyContents.MOUNTAINEERING
								meta_ROLLER_BLADING=$propertyContents.ROLLER_BLADING
								meta_RAFTING=$propertyContents.RAFTING
								meta_PARASAILING=$propertyContents.PARASAILING
								meta_PARAGLIDING=$propertyContents.PARAGLIDING
								meta_SAILING=$propertyContents.SAILING
								meta_SNOW_SPORTS_GEAR=$propertyContents.SNOW_SPORTS_GEAR
								meta_SNOWBOARDING=$propertyContents.SNOWBOARDING
								meta_SCUBA_OR_SNORKELING=$propertyContents.SCUBA_OR_SNORKELING
								meta_SKIING=$propertyContents.SKIING
								meta_SURFING=$propertyContents.SURFING
								meta_SWIMMING=$propertyContents.SWIMMING
								meta_SKIING_WATER=$propertyContents.SKIING_WATER
								meta_WATER_SPORTS=$propertyContents.WATER_SPORTS
								meta_TUBING_WATER=$propertyContents.TUBING_WATER
								meta_WIND_SURFING=$propertyContents.WIND_SURFING
								meta_WHITEWATER_RAFTING=$propertyContents.WHITEWATER_RAFTING
								meta_TRAMPOLINE=$propertyContents.TRAMPOLINE
								meta_TENNIS=$propertyContents.TENNIS
								meta_WATER_SPORTS_GEAR=$propertyContents.WATER_SPORTS_GEAR
								meta_ADULTS_ONLY=$propertyContents.ADULTS_ONLY
								meta_CHILDREN_NOT_ALLOWED=$propertyContents.CHILDREN_NOT_ALLOWED
								meta_LONG_TERM_RENTERS=$propertyContents.LONG_TERM_RENTERS
								meta_SMOKING_NOT_ALLOWED=$propertyContents.SMOKING_NOT_ALLOWED
								meta_DISABLED_ACCESSIBLE=$propertyContents.DISABLED_ACCESSIBLE
								meta_MINIMUM_AGE_LIMIT=$propertyContents.MINIMUM_AGE_LIMIT
								meta_CHILDREN_WELCOME=$propertyContents.CHILDREN_WELCOME
								meta_CAR_NECESSARY=$propertyContents.CAR_NECESSARY
								meta_CAR_RECOMMENDED=$propertyContents.CAR_RECOMMENDED
								meta_EVENTS_ALLOWED=$propertyContents.EVENTS_ALLOWED
								meta_SENIOR_ADULTS_ONLY=$propertyContents.SENIOR_ADULTS_ONLY
								meta_WHEELCHAIR_YES=$propertyContents.WHEELCHAIR_YES
								meta_INFANTS_NOT_ALLOWED=$propertyContents.INFANTS_NOT_ALLOWED
								meta_CAR_NOT_NECESSARY=$propertyContents.CAR_NOT_NECESSARY
								meta_SMOKING_ALLOWED=$propertyContents.SMOKING_ALLOWED
								meta_WHEELCHAIR_NO=$propertyContents.WHEELCHAIR_NO
								meta_street_address=$propertyContents.address
								meta_city=$propertyContents.city
								meta_state=$propertyContents.state
								meta_images_json=$propertyContents.images|json_encode
								meta_small_images_json=$propertyContents.small_images|json_encode
								meta_small_master_image=$propertyContents.small_master_image
								meta_postcode=$propertyContents.postcode
								meta_property_price=$propertyContents.dailyrate
								meta_property_currency=$propertyContents.currency
								meta_latitude=$propertyContents.latitude
								meta_longitude=$propertyContents.longitude
								meta_person_capacity=$propertyContents.maxPeople
								meta_adults_capacity=$propertyContents.maxAdult
								meta_children_capacity=$propertyContents.maxChildren
								meta_general=$propertyContents.general
								meta_cancellation=$propertyContents.cancellation
								meta_rules=$propertyContents.rules
								meta_location=$propertyContents.location
								meta_checkin=$propertyContents.checkin
								meta_checkinend=$propertyContents.checkinend
								meta_checkout=$propertyContents.checkout
								meta_offer1name=$propertyContents.offer1
								meta_offer2name=$propertyContents.offer2
								meta_offer3name=$propertyContents.offer3
								meta_offer4name=$propertyContents.offer4
								meta_offer5name=$propertyContents.offer5
								meta_offer6name=$propertyContents.offer6
								meta_offer7name=$propertyContents.offer7
								meta_offer8name=$propertyContents.offer8
								meta_offer9name=$propertyContents.offer9
								meta_offer10name=$propertyContents.offer10
								meta_offer1id=$propertyContents.offer1id
								meta_offer2id=$propertyContents.offer2id
								meta_offer3id=$propertyContents.offer3id
								meta_offer4id=$propertyContents.offer4id
								meta_offer5id=$propertyContents.offer5id
								meta_offer6id=$propertyContents.offer6id
								meta_offer7id=$propertyContents.offer7id
								meta_offer8id=$propertyContents.offer8id
								meta_offer9id=$propertyContents.offer9id
								meta_offer10id=$propertyContents.offer10id
								meta_offer1desc=$propertyContents.offer1desc
								meta_offer2desc=$propertyContents.offer2desc
								meta_offer3desc=$propertyContents.offer3desc
								meta_offer4desc=$propertyContents.offer4desc
								meta_offer5desc=$propertyContents.offer5desc
								meta_offer6desc=$propertyContents.offer6desc
								meta_offer7desc=$propertyContents.offer7desc
								meta_offer8desc=$propertyContents.offer8desc
								meta_offer9desc=$propertyContents.offer9desc
								meta_offer10desc=$propertyContents.offer10desc
								meta_upsells=$propertyContents.upsells
								meta_deposit=$propertyContents.deposit
							}
							{edit_page_child_data id=$needsupdate more_data_lastimported=$smarty.now|date_format:"%Y-%m-%d %H:%M"}
						{/if}
						{if $firsttoimport&&$metadata.tagids!=""}
							First to import {$roomname}
							{assign var="added" value=false}
							added reset
							{add_page
								pagetitle=$roomname
								userid=0
								live=1
								locked=1
								widget_template="propertylisting"
								tagids=$metadata.tagids
								meta_created=$smarty.now|date_format:"%Y-%m-%d %H:%M"
								meta_lastupdated=$smarty.now|date_format:"%Y-%m-%d %H:%M"
							}
							hopefully added {$added}
							{if $added}
							{add_page_child_data
							 pageid=$content.id
							 userid=0
							 data=$smarty.post.data
							more_data_imported="`$property.propId``$propertyContents.roomId`"
							more_data_pageid=$added
							more_data_lastimported=$smarty.now|date_format:"%Y-%m-%d %H:%M"
							 show_in_activity=0
							 type="propertykeys"}
							{beds24 action="getCalendar" propkey=$property.propKey roomid=$propertyContents.roomId}
							{edit_page
								id=$added
								meta_calendar=$calendar
								meta_propkey=$property.propKey
								pagetitle=$roomname
								meta_ss_page_title=$roomname
								meta_ss_page_desc=$propertyContents.meta_description
								meta_b24desc=$propertyContents.description
								meta_b24desc2=$propertyContents.description2
								meta_type=$filtertype
								meta_roomid=$propertyContents.roomId
								meta_lastupdated=$smarty.now|date_format:"%Y-%m-%d %H:%M"
								meta_bedrooms=$propertyContents.bedrooms
								meta_bathrooms=$propertyContents.bathrooms
								meta_auxtext=$propertyContents.auxtext
								meta_beds24type=$property.propTypeId
								meta_allowchildren=$propertyContents.allowchildren
								meta_allowinfants=$propertyContents.allowinfants
								meta_allowsmoking=$propertyContents.allowsmoking
								meta_allowpets=$propertyContents.allowpets
								meta_LIVING_ROOM=$propertyContents.LIVING_ROOM
								meta_FIREPLACE=$propertyContents.FIREPLACE
								meta_CEILING_FAN=$propertyContents.CEILING_FAN
								meta_WOOD_STOVE=$propertyContents.WOOD_STOVE
								meta_HEATING=$propertyContents.HEATING
								meta_DOORBELL=$propertyContents.DOORBELL
								meta_ELEVATOR=$propertyContents.ELEVATOR
								meta_AIR_CONDITIONING=$propertyContents.AIR_CONDITIONING
								meta_TELEPHONE=$propertyContents.TELEPHONE
								meta_BATHROBE=$propertyContents.BATHROBE
								meta_IRON_BOARD=$propertyContents.IRON_BOARD
								meta_TOWELS=$propertyContents.TOWELS
								meta_HAIR_DRYER=$propertyContents.HAIR_DRYER
								meta_LINENS=$propertyContents.LINENS
								meta_DRYER=$propertyContents.DRYER
								meta_SLIPPERS=$propertyContents.SLIPPERS
								meta_SHAMPOO=$propertyContents.SHAMPOO
								meta_WASHER=$propertyContents.WASHER
								meta_TOILETRIES=$propertyContents.TOILETRIES
								meta_HANGERS=$propertyContents.HANGERS
								meta_BALCONY=$propertyContents.BALCONY
								meta_GRILL=$propertyContents.GRILL
								meta_ROOF_TERRACE=$propertyContents.ROOF_TERRACE
								meta_GARAGE=$propertyContents.GARAGE
								meta_PRIVATE_ENTRANCE=$propertyContents.PRIVATE_ENTRANCE
								meta_SAFE=$propertyContents.SAFE
								meta_SMOKE_DETECTOR=$propertyContents.SMOKE_DETECTOR
								meta_DECK_PATIO_UNCOVERED=$propertyContents.DECK_PATIO_UNCOVERED
								meta_GAME_ROOM=$propertyContents.GAME_ROOM
								meta_PRIVATE_YARD=$propertyContents.PRIVATE_YARD
								meta_PARKING_INCLUDED=$propertyContents.PARKING_INCLUDED
								meta_LANAI_GAZEBO_COVERED=$propertyContents.LANAI_GAZEBO_COVERED
								meta_SITTING_AREA=$propertyContents.SITTING_AREA
								meta_PARKING_POSSIBLE=$propertyContents.PARKING_POSSIBLE
								meta_GARDEN=$propertyContents.GARDEN
								meta_PARKING_PAID=$propertyContents.PARKING_PAID
								meta_VERANDA=$propertyContents.VERANDA
								meta_CO_DETECTOR=$propertyContents.CO_DETECTOR
								meta_LOCKERS=$propertyContents.LOCKERS
								meta_FIRE_EXTINGUISHER=$propertyContents.FIRE_EXTINGUISHER
								meta_SAFETY_CARD=$propertyContents.SAFETY_CARD
								meta_FIRST_AID_KIT=$propertyContents.FIRST_AID_KIT
								meta_LOCK_BEDROOM=$propertyContents.LOCK_BEDROOM
								meta_DESK=$propertyContents.DESK
								meta_BUSINESS_CENTER=$propertyContents.BUSINESS_CENTER
								meta_LAPTOP_FRIENDLY=$propertyContents.LAPTOP_FRIENDLY
								meta_BOOKS=$propertyContents.BOOKS
								meta_MUSIC_LIBRARY=$propertyContents.MUSIC_LIBRARY
								meta_SATELLITE=$propertyContents.SATELLITE
								meta_VIDEO_GAMES=$propertyContents.VIDEO_GAMES
								meta_STEREO=$propertyContents.STEREO
								meta_DVD=$propertyContents.DVD
								meta_TABLE_TENNIS=$propertyContents.TABLE_TENNIS
								meta_VIDEO_LIBRARY=$propertyContents.VIDEO_LIBRARY
								meta_FOOSBALL=$propertyContents.FOOSBALL
								meta_POOL_TABLE=$propertyContents.POOL_TABLE
								meta_TV=$propertyContents.TV
								meta_VIDEO_ON_DEMAND=$propertyContents.VIDEO_ON_DEMAND
								meta_GAMES=$propertyContents.GAMES
								meta_CABLE=$propertyContents.CABLE
								meta_TOYS=$propertyContents.TOYS
								meta_DINNER_NONE=$propertyContents.DINNER_NONE
								meta_BREAKFAST_NONE=$propertyContents.BREAKFAST_NONE
								meta_LUNCH_POSSIBLE=$propertyContents.LUNCH_POSSIBLE
								meta_MINIBAR=$propertyContents.MINIBAR
								meta_PRIVATE_CHEF=$propertyContents.PRIVATE_CHEF
								meta_CAFE=$propertyContents.CAFE
								meta_LUNCH_INCLUDED=$propertyContents.LUNCH_INCLUDED
								meta_BREAKFAST_POSSIBLE=$propertyContents.BREAKFAST_POSSIBLE
								meta_DINNER_POSSIBLE=$propertyContents.DINNER_POSSIBLE
								meta_BREAKFAST_INCLUDED=$propertyContents.BREAKFAST_INCLUDED
								meta_DINNER_INCLUDED=$propertyContents.DINNER_INCLUDED
								meta_MEALS_NONE=$propertyContents.MEALS_NONE
								meta_RESTAURANT=$propertyContents.RESTAURANT
								meta_ROOM_SERVICE=$propertyContents.ROOM_SERVICE
								meta_MEALS_POSSIBLE=$propertyContents.MEALS_POSSIBLE
								meta_LUNCH_NONE=$propertyContents.LUNCH_NONE
								meta_BREAKFAST_IN_ROOM=$propertyContents.BREAKFAST_IN_ROOM
								meta_INTERNET=$propertyContents.INTERNET
								meta_WIFI=$propertyContents.WIFI
								meta_KITCHEN=$propertyContents.KITCHEN
								meta_DISHES_UTENSILS=$propertyContents.DISHES_UTENSILS
								meta_KETTLE=$propertyContents.KETTLE
								meta_REFRIGERATOR=$propertyContents.REFRIGERATOR
								meta_TOASTER=$propertyContents.TOASTER
								meta_MICROWAVE=$propertyContents.MICROWAVE
								meta_DISHWASHER=$propertyContents.DISHWASHER
								meta_DINING_AREA=$propertyContents.DINING_AREA
								meta_SHARED_KITCHEN=$propertyContents.SHARED_KITCHEN
								meta_DINING_ROOM=$propertyContents.DINING_ROOM
								meta_FREEZER=$propertyContents.FREEZER
								meta_OVEN=$propertyContents.OVEN
								meta_SPICES=$propertyContents.SPICES
								meta_COFFEE_MAKER=$propertyContents.COFFEE_MAKER
								meta_HIGHCHAIR=$propertyContents.HIGHCHAIR
								meta_RACLETTE=$propertyContents.RACLETTE
								meta_STOVE=$propertyContents.STOVE
								meta_BEACH=$propertyContents.BEACH
								meta_DOWNTOWN=$propertyContents.DOWNTOWN
								meta_BEACH_FRONT=$propertyContents.BEACH_FRONT
								meta_GOLF_COURSE_FRONT=$propertyContents.GOLF_COURSE_FRONT
								meta_BEACH_VIEW=$propertyContents.BEACH_VIEW
								meta_GOLF_COURSE_VIEW=$propertyContents.GOLF_COURSE_VIEW
								meta_LAKE=$propertyContents.LAKE
								meta_MOUNTAIN=$propertyContents.MOUNTAIN
								meta_MONUMENT_VIEW=$propertyContents.MONUMENT_VIEW
								meta_LAKE_VIEW=$propertyContents.LAKE_VIEW
								meta_LAKE_FRONT=$propertyContents.LAKE_FRONT
								meta_MOUNTAIN_VIEW=$propertyContents.MOUNTAIN_VIEW
								meta_SKI_OUT=$propertyContents.SKI_OUT
								meta_RESORT=$propertyContents.RESORT
								meta_WATERFRONT=$propertyContents.WATERFRONT
								meta_TOWN=$propertyContents.TOWN
								meta_RIVER=$propertyContents.RIVER
								meta_NEAR_OCEAN=$propertyContents.NEAR_OCEAN
								meta_OCEAN_FRONT=$propertyContents.OCEAN_FRONT
								meta_RURAL=$propertyContents.RURAL
								meta_VILLAGE=$propertyContents.VILLAGE
								meta_OCEAN_VIEW=$propertyContents.OCEAN_VIEW
								meta_SKI_IN=$propertyContents.SKI_IN
								meta_WATER_VIEW=$propertyContents.WATER_VIEW
								meta_PETS_CONSIDERED=$propertyContents.PETS_CONSIDERED
								meta_PETS_NOT_ALLOWED=$propertyContents.PETS_NOT_ALLOWED
								meta_HOT_TUB=$propertyContents.HOT_TUB
								meta_POOL_INDOOR=$propertyContents.POOL_INDOOR
								meta_MASSAGE=$propertyContents.MASSAGE
								meta_POOL_PRIVATE=$propertyContents.POOL_PRIVATE
								meta_POOL=$propertyContents.POOL
								meta_POOL_CHILDREN=$propertyContents.POOL_CHILDREN
								meta_POOL_HEATED=$propertyContents.POOL_HEATED
								meta_SAUNA=$propertyContents.SAUNA
								meta_AIRPORT_SHUTTLE=$propertyContents.AIRPORT_SHUTTLE
								meta_BAGGAGE_STORAGE=$propertyContents.BAGGAGE_STORAGE
								meta_BAR=$propertyContents.BAR
								meta_CAR_AVAILABLE=$propertyContents.CAR_AVAILABLE
								meta_CONCIERGE=$propertyContents.CONCIERGE
								meta_CLEANING_POSSIBLE=$propertyContents.CLEANING_POSSIBLE
								meta_CLEANING_INCLUDED=$propertyContents.CLEANING_INCLUDED
								meta_CHAUFFEUR=$propertyContents.CHAUFFEUR
								meta_SHOP=$propertyContents.SHOP
								meta_DOORMAN=$propertyContents.DOORMAN
								meta_RECEPTION=$propertyContents.RECEPTION
								meta_RECEPTION_24_HOUR=$propertyContents.RECEPTION_24_HOUR
								meta_STAFF=$propertyContents.STAFF
								meta_BASKETBALL_COURT=$propertyContents.BASKETBALL_COURT
								meta_BICYCLE=$propertyContents.BICYCLE
								meta_EQUESTRIAN_EVENTS=$propertyContents.EQUESTRIAN_EVENTS
								meta_BOAT=$propertyContents.BOAT
								meta_FISHING=$propertyContents.FISHING
								meta_CYCLING=$propertyContents.CYCLING
								meta_FITNESS_ROOM=$propertyContents.FITNESS_ROOM
								meta_HORSE_RIDING=$propertyContents.HORSE_RIDING
								meta_HIKING=$propertyContents.HIKING
								meta_GYM=$propertyContents.GYM
								meta_GOLF=$propertyContents.GOLF
								meta_CROSS_COUNTRY_SKIING=$propertyContents.CROSS_COUNTRY_SKIING
								meta_KAYAKING=$propertyContents.KAYAKING
								meta_HUNTING=$propertyContents.HUNTING
								meta_ICE_SKATING=$propertyContents.ICE_SKATING
								meta_MOUNTAIN_BIKING=$propertyContents.MOUNTAIN_BIKING
								meta_JET_SKIING=$propertyContents.JET_SKIING
								meta_MOUNTAIN_CLIMBING=$propertyContents.MOUNTAIN_CLIMBING
								meta_KAYAK_CANOE=$propertyContents.KAYAK_CANOE
								meta_MOUNTAINEERING=$propertyContents.MOUNTAINEERING
								meta_ROLLER_BLADING=$propertyContents.ROLLER_BLADING
								meta_RAFTING=$propertyContents.RAFTING
								meta_PARASAILING=$propertyContents.PARASAILING
								meta_PARAGLIDING=$propertyContents.PARAGLIDING
								meta_SAILING=$propertyContents.SAILING
								meta_SNOW_SPORTS_GEAR=$propertyContents.SNOW_SPORTS_GEAR
								meta_SNOWBOARDING=$propertyContents.SNOWBOARDING
								meta_SCUBA_OR_SNORKELING=$propertyContents.SCUBA_OR_SNORKELING
								meta_SKIING=$propertyContents.SKIING
								meta_SURFING=$propertyContents.SURFING
								meta_SWIMMING=$propertyContents.SWIMMING
								meta_SKIING_WATER=$propertyContents.SKIING_WATER
								meta_WATER_SPORTS=$propertyContents.WATER_SPORTS
								meta_TUBING_WATER=$propertyContents.TUBING_WATER
								meta_WIND_SURFING=$propertyContents.WIND_SURFING
								meta_WHITEWATER_RAFTING=$propertyContents.WHITEWATER_RAFTING
								meta_TRAMPOLINE=$propertyContents.TRAMPOLINE
								meta_TENNIS=$propertyContents.TENNIS
								meta_WATER_SPORTS_GEAR=$propertyContents.WATER_SPORTS_GEAR
								meta_ADULTS_ONLY=$propertyContents.ADULTS_ONLY
								meta_CHILDREN_NOT_ALLOWED=$propertyContents.CHILDREN_NOT_ALLOWED
								meta_LONG_TERM_RENTERS=$propertyContents.LONG_TERM_RENTERS
								meta_SMOKING_NOT_ALLOWED=$propertyContents.SMOKING_NOT_ALLOWED
								meta_DISABLED_ACCESSIBLE=$propertyContents.DISABLED_ACCESSIBLE
								meta_MINIMUM_AGE_LIMIT=$propertyContents.MINIMUM_AGE_LIMIT
								meta_CHILDREN_WELCOME=$propertyContents.CHILDREN_WELCOME
								meta_CAR_NECESSARY=$propertyContents.CAR_NECESSARY
								meta_CAR_RECOMMENDED=$propertyContents.CAR_RECOMMENDED
								meta_EVENTS_ALLOWED=$propertyContents.EVENTS_ALLOWED
								meta_SENIOR_ADULTS_ONLY=$propertyContents.SENIOR_ADULTS_ONLY
								meta_WHEELCHAIR_YES=$propertyContents.WHEELCHAIR_YES
								meta_INFANTS_NOT_ALLOWED=$propertyContents.INFANTS_NOT_ALLOWED
								meta_CAR_NOT_NECESSARY=$propertyContents.CAR_NOT_NECESSARY
								meta_SMOKING_ALLOWED=$propertyContents.SMOKING_ALLOWED
								meta_WHEELCHAIR_NO=$propertyContents.WHEELCHAIR_NO
								meta_street_address=$propertyContents.address
								meta_city=$propertyContents.city
								meta_state=$propertyContents.state
								meta_images_json=$propertyContents.images|json_encode
								meta_small_images_json=$propertyContents.small_images|json_encode
								meta_small_master_image=$propertyContents.small_master_image
								meta_postcode=$propertyContents.postcode
								meta_property_price=$propertyContents.dailyrate
								meta_property_currency=$propertyContents.currency
								meta_latitude=$propertyContents.latitude
								meta_longitude=$propertyContents.longitude
								meta_person_capacity=$propertyContents.maxPeople
								meta_adults_capacity=$propertyContents.maxAdult
								meta_children_capacity=$propertyContents.maxChildren
								meta_general=$propertyContents.general
								meta_cancellation=$propertyContents.cancellation
								meta_rules=$propertyContents.rules
								meta_location=$propertyContents.location
								meta_checkin=$propertyContents.checkin
								meta_checkinend=$propertyContents.checkinend
								meta_checkout=$propertyContents.checkout
								meta_offer1name=$propertyContents.offer1
								meta_offer2name=$propertyContents.offer2
								meta_offer3name=$propertyContents.offer3
								meta_offer4name=$propertyContents.offer4
								meta_offer5name=$propertyContents.offer5
								meta_offer6name=$propertyContents.offer6
								meta_offer7name=$propertyContents.offer7
								meta_offer8name=$propertyContents.offer8
								meta_offer9name=$propertyContents.offer9
								meta_offer10name=$propertyContents.offer10
								meta_offer1id=$propertyContents.offer1id
								meta_offer2id=$propertyContents.offer2id
								meta_offer3id=$propertyContents.offer3id
								meta_offer4id=$propertyContents.offer4id
								meta_offer5id=$propertyContents.offer5id
								meta_offer6id=$propertyContents.offer6id
								meta_offer7id=$propertyContents.offer7id
								meta_offer8id=$propertyContents.offer8id
								meta_offer9id=$propertyContents.offer9id
								meta_offer10id=$propertyContents.offer10id
								meta_offer1desc=$propertyContents.offer1desc
								meta_offer2desc=$propertyContents.offer2desc
								meta_offer3desc=$propertyContents.offer3desc
								meta_offer4desc=$propertyContents.offer4desc
								meta_offer5desc=$propertyContents.offer5desc
								meta_offer6desc=$propertyContents.offer6desc
								meta_offer7desc=$propertyContents.offer7desc
								meta_offer8desc=$propertyContents.offer8desc
								meta_offer9desc=$propertyContents.offer9desc
								meta_offer10desc=$propertyContents.offer10desc
								meta_upsells=$propertyContents.upsells
								meta_deposit=$propertyContents.deposit
							}
							 {/if}
						{/if}
					{/if}
				{/foreach}
			{/foreach}
		{/if}
	{/if}

{/if}

	{pages_by_tag tags=$metadata.tagids assign=pages direction=asc filter_array_meta=$smarty.get.filter_meta}


{/if}

{* Display *}
	{if $singlepage}

		{assign var="images" value=$page.meta.images_json|json_decode:true}
		<div id="main_images">
		<div id="hero_image" style="background-image:url({$images[0][0]});background-size:cover;"></div>
		<div id="tl_image" style="background-image:url({$images[1][0]});background-size:cover;"></div>
		<div id="tr_image" style="background-image:url({$images[2][0]});background-size:cover;"></div>
		<div id="br_image" style="background-image:url({$images[3][0]});background-size:cover;"></div>
		<div id="bl_image" style="background-image:url({$images[4][0]});background-size:cover;"></div>
		<a href="#" id="viewAllImages">View all images</a>
		</div>
		<div id="locmap">
		<iframe
		width="100%"
		height="100%"
		frameborder="0"
		scrolling="no"
		marginheight="0" 
		marginwidth="0" 
		src="https://maps.google.com/maps?q={$page.meta.latitude},{$page.meta.longitude}&hl=es;z=14&amp;output=embed"
		>
		</iframe>
		</div>
		<div class="clear"></div>


		<div id="allImagesProp"><div id="allImagesPropInner">
		<a id="closeAllImagesProp">x</a>
		{if $metadata.trim}
		<h1>{$page.title|trim|regex_replace:"/^.*? - /":""}</h1>
		{else}
		<h1>{$page.title}</h1>
		{/if}
		{foreach from=$images item="image"}
		<div class="propImage" style="background-image:url({$image[0]});background-size:cover;"></div>

		{/foreach}
		</div></div>
		 <div class="sticky-container">                                                                              
 <div class='sticky-column-main stickytTwoThirds'>                                                           
		{if $metadata.trim}
		<h1><strong>{$page.title|trim|regex_replace:"/^.*? - /":""}</strong></h1>
		{else}
		<h1><strong>{$page.title}</strong></h1>
		{/if}
		{* Set automatic translations for tab headings based on content language *}
		{if $content.language == "es"}
			{assign var="trans_more_info" value="Más información"}
			{assign var="trans_amenities" value="Servicios"}
			{assign var="trans_business" value="Negocios"}
			{assign var="trans_entertainment" value="Entretenimiento"}
			{assign var="trans_food_drink" value="Comida y bebida"}
			{assign var="trans_internet" value="Internet"}
			{assign var="trans_kitchen" value="Cocina"}
			{assign var="trans_pets" value="Mascotas"}
			{assign var="trans_pool_wellness" value="Piscina y bienestar"}
			{assign var="trans_services" value="Servicios"}
			{assign var="trans_sports" value="Deportes"}
			{assign var="trans_suitability" value="Idoneidad"}
		{elseif $content.language == "fr"}
			{assign var="trans_more_info" value="Plus d'informations"}
			{assign var="trans_amenities" value="Équipements"}
			{assign var="trans_business" value="Affaires"}
			{assign var="trans_entertainment" value="Divertissement"}
			{assign var="trans_food_drink" value="Nourriture et boissons"}
			{assign var="trans_internet" value="Internet"}
			{assign var="trans_kitchen" value="Cuisine"}
			{assign var="trans_pets" value="Animaux"}
			{assign var="trans_pool_wellness" value="Piscine et bien-être"}
			{assign var="trans_services" value="Services"}
			{assign var="trans_sports" value="Sports"}
			{assign var="trans_suitability" value="Convenance"}
		{elseif $content.language == "de"}
			{assign var="trans_more_info" value="Weitere Informationen"}
			{assign var="trans_amenities" value="Ausstattung"}
			{assign var="trans_business" value="Geschäftlich"}
			{assign var="trans_entertainment" value="Unterhaltung"}
			{assign var="trans_food_drink" value="Essen und Trinken"}
			{assign var="trans_internet" value="Internet"}
			{assign var="trans_kitchen" value="Küche"}
			{assign var="trans_pets" value="Haustiere"}
			{assign var="trans_pool_wellness" value="Pool und Wellness"}
			{assign var="trans_services" value="Dienstleistungen"}
			{assign var="trans_sports" value="Sport"}
			{assign var="trans_suitability" value="Eignung"}
		{elseif $content.language == "it"}
			{assign var="trans_more_info" value="Maggiori informazioni"}
			{assign var="trans_amenities" value="Servizi"}
			{assign var="trans_business" value="Affari"}
			{assign var="trans_entertainment" value="Intrattenimento"}
			{assign var="trans_food_drink" value="Cibo e bevande"}
			{assign var="trans_internet" value="Internet"}
			{assign var="trans_kitchen" value="Cucina"}
			{assign var="trans_pets" value="Animali domestici"}
			{assign var="trans_pool_wellness" value="Piscina e benessere"}
			{assign var="trans_services" value="Servizi"}
			{assign var="trans_sports" value="Sport"}
			{assign var="trans_suitability" value="Idoneità"}
		{else}
			{assign var="trans_more_info" value="More information"}
			{assign var="trans_amenities" value="Amenities"}
			{assign var="trans_business" value="Business"}
			{assign var="trans_entertainment" value="Entertainment"}
			{assign var="trans_food_drink" value="Food and drink"}
			{assign var="trans_internet" value="Internet"}
			{assign var="trans_kitchen" value="Kitchen"}
			{assign var="trans_pets" value="Pets"}
			{assign var="trans_pool_wellness" value="Pool and Wellness"}
			{assign var="trans_services" value="Services"}
			{assign var="trans_sports" value="Sports"}
			{assign var="trans_suitability" value="Suitability"}
		{/if}
		<h2>{$page.meta.street_address}, {$page.meta.city}, {$page.meta.state}</h2>
		<p class="room_stats">{if $metadata.guests_label}{$metadata.guests_label}{else}Guests:{/if} {$page.meta.person_capacity}, {if $metadata.bedrooms_label}{$metadata.bedrooms_label}{else}Bedrooms:{/if} {$page.meta.bedrooms}, {if $metadata.bathrooms_label}{$metadata.bathrooms_label}{else}Bathrooms:{/if} {$page.meta.bathrooms}</p>
 			{if $metadata.tabs}
			<div data-tab-id="description" data-title="{if $metadata.description_heading}{$metadata.description_heading}{else}Description{/if}" class="tabs-widget tab-description">
			{else}
			<h2>{if $metadata.description_heading}{$metadata.description_heading}{else}Description{/if}</h2>
			{/if}
			<p>{$page.meta.b24desc}</p>
 			{if $metadata.tabs}
			</div>
			<div data-tab-id="moreinfo" data-title="{if $metadata.more_information_heading}{$metadata.more_information_heading}{else}{$trans_more_info}{/if}" class="tabs-widget tab-moreinfo">
				<p>{$page.meta.b24desc2}</p>
			{else}
			   <div class="more-info">
					<div class="show_more_info">
					<p>
					{$page.meta.b24desc2}
					</p>
					</div>
					<p class="Button_Small show_more_info_button"><a href="#" >{if $metadata.show_more_button}{$metadata.show_more_button}{else}Show more{/if}</a></p>

				</div>

			{/if}


				<p>{$page.contentSplit.normal}</p>
				{beds24 action="checkFastAvailability" calendar=$page.meta.calendar number=$smarty.cookies.adults}
				{foreach from=$all_days item="day" name="days"}
					{if $day.status=="red"
					&&$all_days[$smarty.foreach.days.index-1].status!="red"
					&&$all_days[$smarty.foreach.days.index-1]}
					<input type="hidden" class="doubleDatepickerUnavailFirstNight" value="{$day.label}" />
					{/if}
					{if $day.status=="red"
					&&$all_days[$smarty.foreach.days.index-1].status=="red"
					&&$all_days[$smarty.foreach.days.index-1]}
					<input type="hidden" class="doubleDatepickerUnavail" value="{$day.label}" />
					{/if}
					{if $day.status=="green"
					&&$all_days[$smarty.foreach.days.index-1].status=="red"
					&&$all_days[$smarty.foreach.days.index-1]}
					<input type="hidden" class="doubleDatepickerUnavailLastNight" value="{$day.label}" />
					{/if}
				{/foreach}
 			{if $metadata.tabs}
			</div>
			<div data-tab-id="availability" data-title="{if $metadata.availability_heading}{$metadata.availability_heading}{else}Availability{/if}" class="tabs-widget tab-availability">
			{else}
				<h2>{if $metadata.availability_heading}{$metadata.availability_heading}{else}Availability{/if}</h2>
			{/if}
				<div id="proxyDatepickerDouble"></div>

					<div id="checkInOut" class="clearfix">
					{assign var=checkstart value="."|explode:$page.meta.checkin}
					<p><strong>Check-in start time:</strong><br/> {$checkstart[0]}:{if $checkstart[1]=="5"}30{else}00{/if}hrs</p>
					{assign var=checkend value="."|explode:$page.meta.checkinend}
					<p><strong>Check-in end time:</strong><br/> {$checkend[0]}:{if $checkend[1]=="5"}30{else}00{/if}hrs</p>
					{assign var=checkout value="."|explode:$page.meta.checkout}
					<p><strong>Check-out by:</strong><br/> {$checkout[0]}:{if $checkout[1]=="5"}30{else}00{/if}hrs</p>
					</div>

			<div class="clear"></div>

 			{if $metadata.tabs}
			</div>
			<div data-tab-id="features" data-title="{if $metadata.features_heading}{$metadata.features_heading}{else}Features{/if}" class="tabs-widget tab-features">
			{else}
			<h2>{if $metadata.features_heading}{$metadata.features_heading}{else}Features{/if}</h2>
			{/if}
				<div class="property_info" >
{if $page.meta.LIVING_ROOM || $page.meta.FIREPLACE || $page.meta.CEILING_FAN || $page.meta.WOOD_STOVE || $page.meta.HEATING || $page.meta.DOORBELL || $page.meta.ELEVATOR || $page.meta.AIR_CONDITIONING || $page.meta.TELEPHONE || $page.meta.BATHROBE || $page.meta.IRON_BOARD || $page.meta.TOWELS || $page.meta.HAIR_DRYER || $page.meta.LINENS || $page.meta.DRYER || $page.meta.SLIPPERS || $page.meta.SHAMPOO || $page.meta.WASHER || $page.meta.TOILETRIES || $page.meta.HANGERS || $page.meta.BALCONY || $page.meta.GRILL || $page.meta.ROOF_TERRACE || $page.meta.GARAGE || $page.meta.PRIVATE_ENTRANCE || $page.meta.SAFE || $page.meta.SMOKE_DETECTOR || $page.meta.DECK_PATIO_UNCOVERED || $page.meta.GAME_ROOM || $page.meta.PRIVATE_YARD || $page.meta.PARKING_INCLUDED || $page.meta.LANAI_GAZEBO_COVERED || $page.meta.SITTING_AREA || $page.meta.PARKING_POSSIBLE || $page.meta.GARDEN || $page.meta.PARKING_PAID || $page.meta.VERANDA || $page.meta.CO_DETECTOR || $page.meta.LOCKERS || $page.meta.FIRE_EXTINGUISHER || $page.meta.SAFETY_CARD || $page.meta.FIRST_AID_KIT || $page.meta.LOCK_BEDROOM || $page.meta.DESK}
 			{if !$metadata.tabs}
				<div data-tab-id="amenities" data-title="{$trans_amenities}" class="tabs-widget tab-amenities">
			{else}
				<h2>{$trans_amenities}</h2>
			{/if}
				<ul class="clearfix">
{if $page.meta.LIVING_ROOM} <li class="living_room"><i class="fa-solid fa-star"></i> Living room</li>{/if}
{if $page.meta.FIREPLACE} <li class="fireplace"><i class=" fa-solid fa-star"></i>Fireplace</li>{/if}
{if $page.meta.CEILING_FAN} <li class="ceiling_fan"><i class=" fa-solid fa-star"></i>Ceiling fan</li>{/if}
{if $page.meta.WOOD_STOVE} <li class="wood_stove"><i class="fa-solid fa-star"></i> Wood stove</li>{/if}
{if $page.meta.HEATING} <li class="heating"><i class="fa-solid fa-star"></i> Heating</li>{/if}
{if $page.meta.DOORBELL} <li class="doorbell"><i class="fa-solid fa-star"></i> Doorbell</li>{/if}
{if $page.meta.ELEVATOR} <li class="elevator"><i class="fa-solid fa-star"></i> Elevator</li>{/if}
{if $page.meta.AIR_CONDITIONING} <li class="air_conditioning"><i class="fa-solid fa-star"></i> Air conditioning</li>{/if}
{if $page.meta.TELEPHONE} <li class="telephone"><i class="fa-solid fa-star"></i> Telephone</li>{/if}
{if $page.meta.BATHROBE} <li class="bathrobe"><i class="fa-solid fa-star"></i> Bathrobe</li>{/if}
{if $page.meta.IRON_BOARD} <li class="iron_board"><i class="fa-solid fa-star"></i> Iron board</li>{/if}
{if $page.meta.TOWELS} <li class="towels"><i class="fa-solid fa-star"></i> Towels</li>{/if}
{if $page.meta.HAIR_DRYER} <li class="hair_dryer"><i class="fa-solid fa-star"></i> Hair dryer</li>{/if}
{if $page.meta.LINENS} <li class="linens"><i class="fa-solid fa-star"></i> Linens</li>{/if}
{if $page.meta.DRYER} <li class="dryer"><i class="fa-solid fa-star"></i> Dryer</li>{/if}
{if $page.meta.SLIPPERS} <li class="slippers"><i class="fa-solid fa-star"></i> Slippers</li>{/if}
{if $page.meta.SHAMPOO} <li class="shampoo"><i class="fa-solid fa-star"></i> Shampoo</li>{/if}
{if $page.meta.WASHER} <li class="washer"><i class="fa-solid fa-star"></i> Washer</li>{/if}
{if $page.meta.TOILETRIES} <li class="toiletries"><i class="fa-solid fa-star"></i> Toiletries</li>{/if}
{if $page.meta.HANGERS} <li class="hangers"><i class="fa-solid fa-star"></i> Hangers</li>{/if}
{if $page.meta.BALCONY} <li class="balcony"><i class="fa-solid fa-star"></i> Balcony</li>{/if}
{if $page.meta.GRILL} <li class="grill"><i class="fa-solid fa-star"></i> Grill</li>{/if}
{if $page.meta.ROOF_TERRACE} <li class="roof_terrace"><i class="fa-solid fa-star"></i> Roof terrace</li>{/if}
{if $page.meta.GARAGE} <li class="garage"><i class="fa-solid fa-star"></i> Garage</li>{/if}
{if $page.meta.PRIVATE_ENTRANCE} <li class="private_entrance"><i class="fa-solid fa-star"></i> Private entrance</li>{/if}
{if $page.meta.SAFE} <li class="safe"><i class="fa-solid fa-star"></i> Safe</li>{/if}
{if $page.meta.SMOKE_DETECTOR} <li class="smoke_detector"><i class="fa-solid fa-star"></i> Smoke detector</li>{/if}
{if $page.meta.DECK_PATIO_UNCOVERED} <li class="deck_patio_uncovered"><i class="fa-solid fa-star"></i> Deck patio uncovered</li>{/if}
{if $page.meta.GAME_ROOM} <li class="game_room"><i class="fa-solid fa-star"></i> Game room</li>{/if}
{if $page.meta.PRIVATE_YARD} <li class="private_yard"><i class="fa-solid fa-star"></i> Private yard</li>{/if}
{if $page.meta.PARKING_INCLUDED} <li class="parking_included"><i class="fa-solid fa-star"></i> Parking included</li>{/if}
{if $page.meta.LANAI_GAZEBO_COVERED} <li class="lanai_gazebo_covered"><i class="fa-solid fa-star"></i> Lanai gazebo covered</li>{/if}
{if $page.meta.SITTING_AREA} <li class="sitting_area"><i class="fa-solid fa-star"></i> Sitting area</li>{/if}
{if $page.meta.PARKING_POSSIBLE} <li class="parking_possible"><i class="fa-solid fa-star"></i> Parking possible</li>{/if}
{if $page.meta.GARDEN} <li class="garden"><i class="fa-solid fa-star"></i> Garden</li>{/if}
{if $page.meta.PARKING_PAID} <li class="parking_paid"><i class="fa-solid fa-star"></i> Parking paid</li>{/if}
{if $page.meta.VERANDA} <li class="veranda"><i class="fa-solid fa-star"></i> Veranda</li>{/if}
{if $page.meta.CO_DETECTOR} <li class="co_detector"><i class="fa-solid fa-star"></i> Co detector</li>{/if}
{if $page.meta.LOCKERS} <li class="lockers"><i class="fa-solid fa-star"></i> Lockers</li>{/if}
{if $page.meta.FIRE_EXTINGUISHER} <li class="fire_extinguisher"><i class="fa-solid fa-star"></i> Fire extinguisher</li>{/if}
{if $page.meta.SAFETY_CARD} <li class="safety_card"><i class="fa-solid fa-star"></i> Safety card</li>{/if}
{if $page.meta.FIRST_AID_KIT} <li class="first_aid_kit"><i class="fa-solid fa-star"></i> First aid kit</li>{/if}
{if $page.meta.LOCK_BEDROOM} <li class="lock_bedroom"><i class="fa-solid fa-star"></i> Lock bedroom</li>{/if}
{if $page.meta.DESK} <li class="desk"><i class="fa-solid fa-star"></i> Desk</li>{/if}
				</ul>
 			{if !$metadata.tabs}
				</div>
			{/if}
				{/if}
{if $page.meta.BUSINESS_CENTER || $page.meta.LAPTOP_FRIENDLY}
 			{if !$metadata.tabs}
		<div data-tab-id="business" data-title="{$trans_business}" class="tabs-widget tab-business">
			{else}
			<h2>{$trans_business}</h2>
			{/if}
				<ul class="clearfix">

{if $page.meta.BUSINESS_CENTER} <li class="business_center"><i class="fa-solid fa-briefcase"></i> Business center</li>{/if}
{if $page.meta.LAPTOP_FRIENDLY} <li class="laptop_friendly"><i class="fa-solid fa-briefcase"></i> Laptop friendly</li>{/if}
				</ul>
 			{if !$metadata.tabs}
				</div>
			{/if}
				{/if}
{if $page.meta.BOOKS || $page.meta.MUSIC_LIBRARY || $page.meta.SATELLITE || $page.meta.VIDEO_GAMES || $page.meta.STEREO || $page.meta.DVD || $page.meta.TABLE_TENNIS || $page.meta.VIDEO_LIBRARY || $page.meta.FOOSBALL || $page.meta.POOL_TABLE || $page.meta.TV || $page.meta.VIDEO_ON_DEMAND || $page.meta.GAMES || $page.meta.CABLE || $page.meta.TOYS}
 			{if !$metadata.tabs}
		<div data-tab-id="entertainment" data-title="{$trans_entertainment}" class="tabs-widget tab-entertainment">
		{else}
		<h2>{$trans_entertainment}</h2>
		{/if}
				<ul class="clearfix">
{if $page.meta.BOOKS} <li class="books"><i class="fa-solid fa-book"></i> Books</li>{/if}
{if $page.meta.MUSIC_LIBRARY} <li class="music_library"><i class="fa-solid fa-book"></i> Music library</li>{/if}
{if $page.meta.SATELLITE} <li class="satellite"><i class="fa-solid fa-book"></i> Satellite</li>{/if}
{if $page.meta.VIDEO_GAMES} <li class="video_games"><i class="fa-solid fa-book"></i> Video games</li>{/if}
{if $page.meta.STEREO} <li class="stereo"><i class="fa-solid fa-book"></i> Stereo</li>{/if}
{if $page.meta.DVD} <li class="dvd"><i class="fa-solid fa-book"></i> Dvd</li>{/if}
{if $page.meta.TABLE_TENNIS} <li class="table_tennis"><i class="fa-solid fa-book"></i> Table tennis</li>{/if}
{if $page.meta.VIDEO_LIBRARY} <li class="video_library"><i class="fa-solid fa-book"></i> Video library</li>{/if}
{if $page.meta.FOOSBALL} <li class="foosball"><i class="fa-solid fa-book"></i> Foosball</li>{/if}
{if $page.meta.POOL_TABLE} <li class="pool_table"><i class="fa-solid fa-book"></i> Pool table</li>{/if}
{if $page.meta.TV} <li class="tv"><i class="fa-solid fa-book"></i> Tv</li>{/if}
{if $page.meta.VIDEO_ON_DEMAND} <li class="video_on_demand"><i class="fa-solid fa-book"></i> Video on demand</li>{/if}
{if $page.meta.GAMES} <li class="games"><i class="fa-solid fa-book"></i> Games</li>{/if}
{if $page.meta.CABLE} <li class="cable"><i class="fa-solid fa-book"></i> Cable</li>{/if}
{if $page.meta.TOYS} <li class="toys"><i class="fa-solid fa-book"></i> Toys</li>{/if}
				</ul>
 			{if !$metadata.tabs}
				</div>
			{/if}
				{/if}
{if $page.meta.DINNER_NONE || $page.meta.BREAKFAST_NONE || $page.meta.LUNCH_POSSIBLE || $page.meta.MINIBAR || $page.meta.PRIVATE_CHEF || $page.meta.CAFE || $page.meta.LUNCH_INCLUDED || $page.meta.BREAKFAST_POSSIBLE || $page.meta.DINNER_POSSIBLE || $page.meta.BREAKFAST_INCLUDED || $page.meta.DINNER_INCLUDED || $page.meta.MEALS_NONE || $page.meta.RESTAURANT || $page.meta.ROOM_SERVICE || $page.meta.MEALS_POSSIBLE || $page.meta.LUNCH_NONE || $page.meta.BREAKFAST_IN_ROOM}
 			{if !$metadata.tabs}
		<div data-tab-id="food" data-title="{$trans_food_drink}" class="tabs-widget tab-food">
		{else}
		<h2>{$trans_food_drink}</h2>
		{/if}
				<ul class="clearfix">
{if $page.meta.DINNER_NONE} <li class="dinner_none"><i class="fa-solid fa-utensils"></i> Dinner none</li>{/if}
{if $page.meta.BREAKFAST_NONE} <li class="breakfast_none"><i class="fa-solid fa-utensils"></i> Breakfast none</li>{/if}
{if $page.meta.LUNCH_POSSIBLE} <li class="lunch_possible"><i class="fa-solid fa-utensils"></i> Lunch possible</li>{/if}
{if $page.meta.MINIBAR} <li class="minibar"><i class="fa-solid fa-utensils"></i> Minibar</li>{/if}
{if $page.meta.PRIVATE_CHEF} <li class="private_chef"><i class="fa-solid fa-utensils"></i> Private chef</li>{/if}
{if $page.meta.CAFE} <li class="cafe"><i class="fa-solid fa-utensils"></i> Cafe</li>{/if}
{if $page.meta.LUNCH_INCLUDED} <li class="lunch_included"><i class="fa-solid fa-utensils"></i> Lunch included</li>{/if}
{if $page.meta.BREAKFAST_POSSIBLE} <li class="breakfast_possible"><i class="fa-solid fa-utensils"></i> Breakfast possible</li>{/if}
{if $page.meta.DINNER_POSSIBLE} <li class="dinner_possible"><i class="fa-solid fa-utensils"></i> Dinner possible</li>{/if}
{if $page.meta.BREAKFAST_INCLUDED} <li class="breakfast_included"><i class="fa-solid fa-utensils"></i> Breakfast included</li>{/if}
{if $page.meta.DINNER_INCLUDED} <li class="dinner_included"><i class="fa-solid fa-utensils"></i> Dinner included</li>{/if}
{if $page.meta.MEALS_NONE} <li class="meals_none"><i class="fa-solid fa-utensils"></i> Meals none</li>{/if}
{if $page.meta.RESTAURANT} <li class="restaurant"><i class="fa-solid fa-utensils"></i> Restaurant</li>{/if}
{if $page.meta.ROOM_SERVICE} <li class="room_service"><i class="fa-solid fa-utensils"></i> Room service</li>{/if}
{if $page.meta.MEALS_POSSIBLE} <li class="meals_possible"><i class="fa-solid fa-utensils"></i> Meals possible</li>{/if}
{if $page.meta.LUNCH_NONE} <li class="lunch_none"><i class="fa-solid fa-utensils"></i> Lunch none</li>{/if}
{if $page.meta.BREAKFAST_IN_ROOM} <li class="breakfast_in_room"><i class="fa-solid fa-utensils"></i> Breakfast in room</li>{/if}
				</ul>
 			{if !$metadata.tabs}
				</div>
				{/if}
				{/if}
				{if $page.meta.INTERNET || $page.meta.WIFI}
		{if !$metadata.tabs}
		<div data-tab-id="internet" data-title="{$trans_internet}" class="tabs-widget tab-internet">
		{else}
		<h2>{$trans_internet}</h2>
		{/if}
				<ul class="clearfix">
{if $page.meta.INTERNET} <li class="internet"><i class="fa-solid fa-wifi"></i> Internet</li>{/if}
{if $page.meta.WIFI} <li class="wifi"><i class="fa-solid fa-wifi"></i> Wifi</li>{/if}
				</ul>
		{if !$metadata.tabs}
			</div>
			{/if}
				{/if}
{if $page.meta.KITCHEN || $page.meta.DISHES_UTENSILS || $page.meta.KETTLE || $page.meta.REFRIGERATOR || $page.meta.TOASTER || $page.meta.MICROWAVE || $page.meta.DISHWASHER || $page.meta.DINING_AREA || $page.meta.SHARED_KITCHEN || $page.meta.DINING_ROOM || $page.meta.FREEZER || $page.meta.OVEN || $page.meta.SPICES || $page.meta.COFFEE_MAKER || $page.meta.HIGHCHAIR || $page.meta.RACLETTE || $page.meta.STOVE}
		{if !$metadata.tabs}
			<div data-tab-id="kitchen" data-title="{$trans_kitchen}" class="tabs-widget tab-kitchen">
			{else}
			<h2>{$trans_kitchen}</h2>
			{/if}
				<ul class="clearfix">
{if $page.meta.KITCHEN} <li class="kitchen"><i class="fa-solid fa-utensils"></i> Kitchen</li>{/if}
{if $page.meta.DISHES_UTENSILS} <li class="dishes_utensils"><i class="fa-solid fa-utensils"></i> Dishes utensils</li>{/if}
{if $page.meta.KETTLE} <li class="kettle"><i class="fa-solid fa-utensils"></i> Kettle</li>{/if}
{if $page.meta.REFRIGERATOR} <li class="refrigerator"><i class="fa-solid fa-utensils"></i> Refrigerator</li>{/if}
{if $page.meta.TOASTER} <li class="toaster"><i class="fa-solid fa-utensils"></i> Toaster</li>{/if}
{if $page.meta.MICROWAVE} <li class="microwave"><i class="fa-solid fa-utensils"></i> Microwave</li>{/if}
{if $page.meta.DISHWASHER} <li class="dishwasher"><i class="fa-solid fa-utensils"></i> Dishwasher</li>{/if}
{if $page.meta.DINING_AREA} <li class="dining_area"><i class="fa-solid fa-utensils"></i> Dining area</li>{/if}
{if $page.meta.SHARED_KITCHEN} <li class="shared_kitchen"><i class="fa-solid fa-utensils"></i> Shared kitchen</li>{/if}
{if $page.meta.DINING_ROOM} <li class="dining_room"><i class="fa-solid fa-utensils"></i> Dining room</li>{/if}
{if $page.meta.FREEZER} <li class="freezer"><i class="fa-solid fa-utensils"></i> Freezer</li>{/if}
{if $page.meta.OVEN} <li class="oven"><i class="fa-solid fa-utensils"></i> Oven</li>{/if}
{if $page.meta.SPICES} <li class="spices"><i class="fa-solid fa-utensils"></i> Spices</li>{/if}
{if $page.meta.COFFEE_MAKER} <li class="coffee_maker"><i class="fa-solid fa-utensils"></i> Coffee maker</li>{/if}
{if $page.meta.HIGHCHAIR} <li class="highchair"><i class="fa-solid fa-utensils"></i> Highchair</li>{/if}
{if $page.meta.RACLETTE} <li class="raclette"><i class="fa-solid fa-utensils"></i> Raclette</li>{/if}
{if $page.meta.STOVE} <li class="stove"><i class="fa-solid fa-utensils"></i> Stove</li>{/if}
				</ul>
		{if !$metadata.tabs}
			</div>
				{/if}
				{/if}
{if $page.meta.BEACH || $page.meta.DOWNTOWN || $page.meta.BEACH_FRONT || $page.meta.GOLF_COURSE_FRONT || $page.meta.BEACH_VIEW || $page.meta.GOLF_COURSE_VIEW || $page.meta.LAKE || $page.meta.MOUNTAIN || $page.meta.MONUMENT_VIEW || $page.meta.LAKE_VIEW || $page.meta.LAKE_FRONT || $page.meta.MOUNTAIN_VIEW || $page.meta.SKI_OUT || $page.meta.RESORT || $page.meta.WATERFRONT || $page.meta.TOWN || $page.meta.RIVER || $page.meta.NEAR_OCEAN || $page.meta.OCEAN_FRONT || $page.meta.RURAL || $page.meta.VILLAGE || $page.meta.OCEAN_VIEW || $page.meta.SKI_IN || $page.meta.WATER_VIEW}
			{if !$metadata.tabs}
			<div data-tab-id="location" data-title="{if $metadata.location_section_heading}{$metadata.location_section_heading}{else}Location{/if}" class="tabs-widget tab-location">
			{else}
			<h2>{if $metadata.location_section_heading}{$metadata.location_section_heading}{else}Location{/if}</h2>
			{/if}
				<ul class="clearfix">
{if $page.meta.BEACH} <li class="beach"><i class="fa-solid fa-map"></i> Beach</li>{/if}
{if $page.meta.DOWNTOWN} <li class="downtown"><i class="fa-solid fa-map"></i> Downtown</li>{/if}
{if $page.meta.BEACH_FRONT} <li class="beach_front"><i class="fa-solid fa-map"></i> Beach front</li>{/if}
{if $page.meta.GOLF_COURSE_FRONT} <li class="golf_course_front"><i class="fa-solid fa-map"></i> Golf course front</li>{/if}
{if $page.meta.BEACH_VIEW} <li class="beach_view"><i class="fa-solid fa-map"></i> Beach view</li>{/if}
{if $page.meta.GOLF_COURSE_VIEW} <li class="golf_course_view"><i class="fa-solid fa-map"></i> Golf course view</li>{/if}
{if $page.meta.LAKE} <li class="lake"><i class="fa-solid fa-map"></i> Lake</li>{/if}
{if $page.meta.MOUNTAIN} <li class="mountain"><i class="fa-solid fa-map"></i> Mountain</li>{/if}
{if $page.meta.MONUMENT_VIEW} <li class="monument_view"><i class="fa-solid fa-map"></i> Monument view</li>{/if}
{if $page.meta.LAKE_VIEW} <li class="lake_view"><i class="fa-solid fa-map"></i> Lake view</li>{/if}
{if $page.meta.LAKE_FRONT} <li class="lake_front"><i class="fa-solid fa-map"></i> Lake front</li>{/if}
{if $page.meta.MOUNTAIN_VIEW} <li class="mountain_view"><i class="fa-solid fa-map"></i> Mountain view</li>{/if}
{if $page.meta.SKI_OUT} <li class="ski_out"><i class="fa-solid fa-map"></i> Ski out</li>{/if}
{if $page.meta.RESORT} <li class="resort"><i class="fa-solid fa-map"></i> Resort</li>{/if}
{if $page.meta.WATERFRONT} <li class="waterfront"><i class="fa-solid fa-map"></i> Waterfront</li>{/if}
{if $page.meta.TOWN} <li class="town"><i class="fa-solid fa-map"></i> Town</li>{/if}
{if $page.meta.RIVER} <li class="river"><i class="fa-solid fa-map"></i> River</li>{/if}
{if $page.meta.NEAR_OCEAN} <li class="near_ocean"><i class="fa-solid fa-map"></i> Near ocean</li>{/if}
{if $page.meta.OCEAN_FRONT} <li class="ocean_front"><i class="fa-solid fa-map"></i> Ocean front</li>{/if}
{if $page.meta.RURAL} <li class="rural"><i class="fa-solid fa-map"></i> Rural</li>{/if}
{if $page.meta.VILLAGE} <li class="village"><i class="fa-solid fa-map"></i> Village</li>{/if}
{if $page.meta.OCEAN_VIEW} <li class="ocean_view"><i class="fa-solid fa-map"></i> Ocean view</li>{/if}
{if $page.meta.SKI_IN} <li class="ski_in"><i class="fa-solid fa-map"></i> Ski in</li>{/if}
{if $page.meta.WATER_VIEW} <li class="water_view"><i class="fa-solid fa-map"></i> Water view</li>{/if}
				</ul>
			{if !$metadata.tabs}
				</div>
				{/if}
				{/if}
{if $page.meta.PETS_CONSIDERED || $page.meta.PETS_NOT_ALLOWED}
			{if !$metadata.tabs}
			<div data-tab-id="pets" data-title="{$trans_pets}" class="tabs-widget tab-pets">
			{else}
			<h2>{$trans_pets}</h2>
			{/if}
				<ul class="clearfix">
{if $page.meta.PETS_CONSIDERED} <li class="pets_considered"><i class="fa-solid fa-paw"></i> Pets considered</li>{/if}
{if $page.meta.PETS_NOT_ALLOWED} <li class="pets_not_allowed"><i class="fa-solid fa-paw"></i> Pets not allowed</li>{/if}
				</ul>
			{if !$metadata.tabs}
				</div>
				{/if}
				{/if}
{if $page.meta.HOT_TUB || $page.meta.POOL_INDOOR || $page.meta.MASSAGE || $page.meta.POOL_PRIVATE || $page.meta.POOL || $page.meta.POOL_CHILDREN || $page.meta.POOL_HEATED || $page.meta.SAUNA}
			{if !$metadata.tabs}
			<div data-tab-id="pool" data-title="{$trans_pool_wellness}" class="tabs-widget tab-pool">
			{else}
			<h2>{$trans_pool_wellness}</h2>
			{/if}
				<ul class="clearfix">
{if $page.meta.HOT_TUB} <li class="hot_tub"><i class="fa-solid fa-spa"></i> Hot tub</li>{/if}
{if $page.meta.POOL_INDOOR} <li class="pool_indoor"><i class="fa-solid fa-spa"></i> Pool indoor</li>{/if}
{if $page.meta.MASSAGE} <li class="massage"><i class="fa-solid fa-spa"></i> Massage</li>{/if}
{if $page.meta.POOL_PRIVATE} <li class="pool_private"><i class="fa-solid fa-spa"></i> Pool private</li>{/if}
{if $page.meta.POOL} <li class="pool"><i class="fa-solid fa-spa"></i> Pool</li>{/if}
{if $page.meta.POOL_CHILDREN} <li class="pool_children"><i class="fa-solid fa-spa"></i> Pool children</li>{/if}
{if $page.meta.POOL_HEATED} <li class="pool_heated"><i class="fa-solid fa-spa"></i> Pool heated</li>{/if}
{if $page.meta.SAUNA} <li class="sauna"><i class="fa-solid fa-spa"></i> Sauna</li>{/if}
				</ul>
			{if !$metadata.tabs}
				</div>
			{/if}
				{/if}
{if $page.meta.AIRPORT_SHUTTLE || $page.meta.BAGGAGE_STORAGE || $page.meta.BAR || $page.meta.CAR_AVAILABLE || $page.meta.CONCIERGE || $page.meta.CLEANING_POSSIBLE || $page.meta.CLEANING_INCLUDED || $page.meta.CHAUFFEUR || $page.meta.SHOP || $page.meta.DOORMAN || $page.meta.RECEPTION || $page.meta.RECEPTION_24_HOUR || $page.meta.STAFF}
			{if !$metadata.tabs}
			<div data-tab-id="services" data-title="{$trans_services}" class="tabs-widget tab-services">
			{else}
			<h2>{$trans_services}</h2>
			{/if}
				<ul class="clearfix">
{if $page.meta.AIRPORT_SHUTTLE} <li class="airport_shuttle"><i class="fa-solid fa-plane"></i> Airport shuttle</li>{/if}
{if $page.meta.BAGGAGE_STORAGE} <li class="baggage_storage"><i class="fa-solid fa-plane"></i> Baggage storage</li>{/if}
{if $page.meta.BAR} <li class="bar"><i class="fa-solid fa-plane"></i> Bar</li>{/if}
{if $page.meta.CAR_AVAILABLE} <li class="car_available"><i class="fa-solid fa-plane"></i> Car available</li>{/if}
{if $page.meta.CONCIERGE} <li class="concierge"><i class="fa-solid fa-plane"></i> Concierge</li>{/if}
{if $page.meta.CLEANING_POSSIBLE} <li class="cleaning_possible"><i class="fa-solid fa-plane"></i> Cleaning possible</li>{/if}
{if $page.meta.CLEANING_INCLUDED} <li class="cleaning_included"><i class="fa-solid fa-plane"></i> Cleaning included</li>{/if}
{if $page.meta.CHAUFFEUR} <li class="chauffeur"><i class="fa-solid fa-plane"></i> Chauffeur</li>{/if}
{if $page.meta.SHOP} <li class="shop"><i class="fa-solid fa-plane"></i> Shop</li>{/if}
{if $page.meta.DOORMAN} <li class="doorman"><i class="fa-solid fa-plane"></i> Doorman</li>{/if}
{if $page.meta.RECEPTION} <li class="reception"><i class="fa-solid fa-plane"></i> Reception</li>{/if}
{if $page.meta.RECEPTION_24_HOUR} <li class="reception_24_hour"><i class="fa-solid fa-plane"></i> Reception 24 hour</li>{/if}
{if $page.meta.STAFF} <li class="staff"><i class="fa-solid fa-plane"></i> Staff</li>{/if}
				</ul>
			{if !$metadata.tabs}
				</div>
			{/if}
				{/if}
{if $page.meta.BASKETBALL_COURT || $page.meta.BICYCLE || $page.meta.EQUESTRIAN_EVENTS || $page.meta.BOAT || $page.meta.FISHING || $page.meta.CYCLING || $page.meta.FITNESS_ROOM || $page.meta.HORSE_RIDING || $page.meta.HIKING || $page.meta.GYM || $page.meta.GOLF || $page.meta.CROSS_COUNTRY_SKIING || $page.meta.KAYAKING || $page.meta.HUNTING || $page.meta.ICE_SKATING || $page.meta.MOUNTAIN_BIKING || $page.meta.JET_SKIING || $page.meta.MOUNTAIN_CLIMBING || $page.meta.KAYAK_CANOE || $page.meta.MOUNTAINEERING || $page.meta.ROLLER_BLADING || $page.meta.RAFTING || $page.meta.PARASAILING || $page.meta.PARAGLIDING || $page.meta.SAILING || $page.meta.SNOW_SPORTS_GEAR || $page.meta.SNOWBOARDING || $page.meta.SCUBA_OR_SNORKELING || $page.meta.SKIING || $page.meta.SURFING || $page.meta.SWIMMING || $page.meta.SKIING_WATER || $page.meta.WATER_SPORTS || $page.meta.TUBING_WATER || $page.meta.WIND_SURFING || $page.meta.WHITEWATER_RAFTING || $page.meta.TRAMPOLINE || $page.meta.TENNIS || $page.meta.WATER_SPORTS_GEAR}
			{if !$metadata.tabs}
			<div data-tab-id="sports" data-title="{$trans_sports}" class="tabs-widget tab-sports">
			{else}
			<h2>{$trans_sports}</h2>
			{/if}
				<ul class="clearfix">
{if $page.meta.BASKETBALL_COURT} <li class="basketball_court"><i class="fa-solid fa-football"></i> Basketball court</li>{/if}
{if $page.meta.BICYCLE} <li class="bicycle"><i class="fa-solid fa-football"></i> Bicycle</li>{/if}
{if $page.meta.EQUESTRIAN_EVENTS} <li class="equestrian_events"><i class="fa-solid fa-football"></i> Equestrian events</li>{/if}
{if $page.meta.BOAT} <li class="boat"><i class="fa-solid fa-football"></i> Boat</li>{/if}
{if $page.meta.FISHING} <li class="fishing"><i class="fa-solid fa-football"></i> Fishing</li>{/if}
{if $page.meta.CYCLING} <li class="cycling"><i class="fa-solid fa-football"></i> Cycling</li>{/if}
{if $page.meta.FITNESS_ROOM} <li class="fitness_room"><i class="fa-solid fa-football"></i> Fitness room</li>{/if}
{if $page.meta.HORSE_RIDING} <li class="horse_riding"><i class="fa-solid fa-football"></i> Horse riding</li>{/if}
{if $page.meta.HIKING} <li class="hiking"><i class="fa-solid fa-football"></i> Hiking</li>{/if}
{if $page.meta.GYM} <li class="gym"><i class="fa-solid fa-football"></i> Gym</li>{/if}
{if $page.meta.GOLF} <li class="golf"><i class="fa-solid fa-football"></i> Golf</li>{/if}
{if $page.meta.CROSS_COUNTRY_SKIING} <li class="cross_country_skiing"><i class="fa-solid fa-football"></i> Cross country skiing</li>{/if}
{if $page.meta.KAYAKING} <li class="kayaking"><i class="fa-solid fa-football"></i> Kayaking</li>{/if}
{if $page.meta.HUNTING} <li class="hunting"><i class="fa-solid fa-football"></i> Hunting</li>{/if}
{if $page.meta.ICE_SKATING} <li class="ice_skating"><i class="fa-solid fa-football"></i> Ice skating</li>{/if}
{if $page.meta.MOUNTAIN_BIKING} <li class="mountain_biking"><i class="fa-solid fa-football"></i> Mountain biking</li>{/if}
{if $page.meta.JET_SKIING} <li class="jet_skiing"><i class="fa-solid fa-football"></i> Jet skiing</li>{/if}
{if $page.meta.MOUNTAIN_CLIMBING} <li class="mountain_climbing"><i class="fa-solid fa-football"></i> Mountain climbing</li>{/if}
{if $page.meta.KAYAK_CANOE} <li class="kayak_canoe"><i class="fa-solid fa-football"></i> Kayak canoe</li>{/if}
{if $page.meta.MOUNTAINEERING} <li class="mountaineering"><i class="fa-solid fa-football"></i> Mountaineering</li>{/if}
{if $page.meta.ROLLER_BLADING} <li class="roller_blading"><i class="fa-solid fa-football"></i> Roller blading</li>{/if}
{if $page.meta.RAFTING} <li class="rafting"><i class="fa-solid fa-football"></i> Rafting</li>{/if}
{if $page.meta.PARASAILING} <li class="parasailing"><i class="fa-solid fa-football"></i> Parasailing</li>{/if}
{if $page.meta.PARAGLIDING} <li class="paragliding"><i class="fa-solid fa-football"></i> Paragliding</li>{/if}
{if $page.meta.SAILING} <li class="sailing"><i class="fa-solid fa-football"></i> Sailing</li>{/if}
{if $page.meta.SNOW_SPORTS_GEAR} <li class="snow_sports_gear"><i class="fa-solid fa-football"></i> Snow sports gear</li>{/if}
{if $page.meta.SNOWBOARDING} <li class="snowboarding"><i class="fa-solid fa-football"></i> Snowboarding</li>{/if}
{if $page.meta.SCUBA_OR_SNORKELING} <li class="scuba_or_snorkeling"><i class="fa-solid fa-football"></i> Scuba or snorkeling</li>{/if}
{if $page.meta.SKIING} <li class="skiing"><i class="fa-solid fa-football"></i> Skiing</li>{/if}
{if $page.meta.SURFING} <li class="surfing"><i class="fa-solid fa-football"></i> Surfing</li>{/if}
{if $page.meta.SWIMMING} <li class="swimming"><i class="fa-solid fa-football"></i> Swimming</li>{/if}
{if $page.meta.SKIING_WATER} <li class="skiing_water"><i class="fa-solid fa-football"></i> Skiing water</li>{/if}
{if $page.meta.WATER_SPORTS} <li class="water_sports"><i class="fa-solid fa-football"></i> Water sports</li>{/if}
{if $page.meta.TUBING_WATER} <li class="tubing_water"><i class="fa-solid fa-football"></i> Tubing water</li>{/if}
{if $page.meta.WIND_SURFING} <li class="wind_surfing"><i class="fa-solid fa-football"></i> Wind surfing</li>{/if}
{if $page.meta.WHITEWATER_RAFTING} <li class="whitewater_rafting"><i class="fa-solid fa-football"></i> Whitewater rafting</li>{/if}
{if $page.meta.TRAMPOLINE} <li class="trampoline"><i class="fa-solid fa-football"></i> Trampoline</li>{/if}
{if $page.meta.TENNIS} <li class="tennis"><i class="fa-solid fa-football"></i> Tennis</li>{/if}
{if $page.meta.WATER_SPORTS_GEAR} <li class="water_sports_gear"><i class="fa-solid fa-football"></i> Water sports gear</li>{/if}
				</ul>
			{if !$metadata.tabs}
				</div>
				{/if}
				{/if}
{if $page.meta.ADULTS_ONLY || $page.meta.CHILDREN_NOT_ALLOWED || $page.meta.LONG_TERM_RENTERS || $page.meta.SMOKING_NOT_ALLOWED || $page.meta.DISABLED_ACCESSIBLE || $page.meta.MINIMUM_AGE_LIMIT || $page.meta.CHILDREN_WELCOME || $page.meta.CAR_NECESSARY || $page.meta.CAR_RECOMMENDED || $page.meta.EVENTS_ALLOWED || $page.meta.SENIOR_ADULTS_ONLY || $page.meta.WHEELCHAIR_YES || $page.meta.INFANTS_NOT_ALLOWED || $page.meta.CAR_NOT_NECESSARY || $page.meta.SMOKING_ALLOWED || $page.meta.WHEELCHAIR_NO}
			{if !$metadata.tabs}
			<div data-tab-id="suitability" data-title="{$trans_suitability}" class="tabs-widget tab-suitability">
			{else}
			<h2>{$trans_suitability}</h2>
			{/if}
				<ul class="clearfix">
{if $page.meta.ADULTS_ONLY} <li class="adults_only"><i class="fa-solid fa-universal-access"></i> Adults only</li>{/if}
{if $page.meta.CHILDREN_NOT_ALLOWED} <li class="children_not_allowed"><i class="fa-solid fa-universal-access"></i> Children not allowed</li>{/if}
{if $page.meta.LONG_TERM_RENTERS} <li class="long_term_renters"><i class="fa-solid fa-universal-access"></i> Long term renters</li>{/if}
{if $page.meta.SMOKING_NOT_ALLOWED} <li class="smoking_not_allowed"><i class="fa-solid fa-universal-access"></i> Smoking not allowed</li>{/if}
{if $page.meta.DISABLED_ACCESSIBLE} <li class="disabled_accessible"><i class="fa-solid fa-universal-access"></i> Disabled accessible</li>{/if}
{if $page.meta.MINIMUM_AGE_LIMIT} <li class="minimum_age_limit"><i class="fa-solid fa-universal-access"></i> Minimum age limit</li>{/if}
{if $page.meta.CHILDREN_WELCOME} <li class="children_welcome"><i class="fa-solid fa-universal-access"></i> Children welcome</li>{/if}
{if $page.meta.CAR_NECESSARY} <li class="car_necessary"><i class="fa-solid fa-universal-access"></i> Car necessary</li>{/if}
{if $page.meta.CAR_RECOMMENDED} <li class="car_recommended"><i class="fa-solid fa-universal-access"></i> Car recommended</li>{/if}
{if $page.meta.EVENTS_ALLOWED} <li class="events_allowed"><i class="fa-solid fa-universal-access"></i> Events allowed</li>{/if}
{if $page.meta.SENIOR_ADULTS_ONLY} <li class="senior_adults_only"><i class="fa-solid fa-universal-access"></i> Senior adults only</li>{/if}
{if $page.meta.WHEELCHAIR_YES} <li class="wheelchair_yes"><i class="fa-solid fa-universal-access"></i> Wheelchair yes</li>{/if}
{if $page.meta.INFANTS_NOT_ALLOWED} <li class="infants_not_allowed"><i class="fa-solid fa-universal-access"></i> Infants not allowed</li>{/if}
{if $page.meta.CAR_NOT_NECESSARY} <li class="car_not_necessary"><i class="fa-solid fa-universal-access"></i> Car not necessary</li>{/if}
{if $page.meta.SMOKING_ALLOWED} <li class="smoking_allowed"><i class="fa-solid fa-universal-access"></i> Smoking allowed</li>{/if}
{if $page.meta.WHEELCHAIR_NO} <li class="wheelchair_no"><i class="fa-solid fa-universal-access"></i> Wheelchair no</li>{/if}

				</ul>
			{if !$metadata.tabs}
				</div>
			{/if}
				{/if}
{*
				{if $page.meta.bedrooms} {if $metadata.bedrooms_label}{$metadata.bedrooms_label}{else}Bedrooms:{/if} {$page.meta.bedrooms}{/if}
				{if $page.meta.person_capacity} {$page.meta.person_capacity}{/if}
				{if $page.meta.bathrooms} {$page.meta.bathrooms}{/if}
				{if $page.meta.parking} {$page.meta.parking}{/if}

*}
				</div>

 			{if $metadata.tabs}
			</div>
			<div data-tab-id="terms" data-title="{if $metadata.terms_heading}{$metadata.terms_heading}{else}Terms{/if}" class="tabs-widget tab-terms">
			{else}
			<h2>{if $metadata.terms_heading}{$metadata.terms_heading}{else}Terms{/if}</h2>
			{/if}
			<div class="expand-box ">
				   <div class="expand-box-title clearfix room-expand">
					<h4>{if $metadata.general_terms_heading}{$metadata.general_terms_heading}{else}General terms{/if}</h4>
				</div>
				   <div class="expand-box-content clearfix">
							<p>{$page.meta.general|nl2br}</p>
				</div>
			</div>
			<div class="expand-box ">
				   <div class="expand-box-title clearfix room-expand">
					<h4>{if $metadata.rules_heading}{$metadata.rules_heading}{else}Rules{/if}</h4>
				</div>
				   <div class="expand-box-content clearfix">
							<p>{$page.meta.rules|nl2br}</p>
				</div>
			</div>
			<div class="expand-box ">
				   <div class="expand-box-title clearfix room-expand">
					<h4>{if $metadata.cancellation_heading}{$metadata.cancellation_heading}{else}Cancellation{/if}</h4>
				</div>
				   <div class="expand-box-content clearfix">
							<p>{$page.meta.cancellation|nl2br}</p>
				</div>
			</div>
 			{if $metadata.tabs}
			</div>
			{/if}
 </div>                                                                                                      
 <div class='sticky-column-sidebar stickyThirdsCol propAvailSidebar'>                                                        
	 <div class="sticky-sidebar-inner "> 
	<form class="clearfix propSearchForm" action="{$metadata.mystays_destination}" method="post" data-minimum-stay-message="{if $metadata.minimum_stay_message}{$metadata.minimum_stay_message}{else}Your current booking doesn't meet the minimum stay of {literal}{{MIN}}{/literal}{/if}">
	<input name="findfirstoffer" type="hidden" value="findall" />
	<div class="formDaterange clearfix"> <input type="hidden" class="startrange " name="start"/> <input type="hidden" class="endrange " name="end"/>
									<div class="formDaterangeStart"><p class="formDaterangeStartLabel prevent_past default_datepicker_double" data-cutoff="{$metadata.cutoff}" data-timezone="">{if $metadata.checkin_label}{$metadata.checkin_label}{else}Check in{/if}<br/><span class="formDaterangeStartValue">&nbsp;</span></p></div><div class="formDaterangeEnd"><p class="formDaterangeEndLabel prevent_past default_datepicker_double" data-cutoff="{$metadata.cutoff}" data-timezone="">{if $metadata.checkout_label}{$metadata.checkout_label}{else}Check out{/if}<br><span class="formDaterangeEndValue">&nbsp;</span></p></div></div>
									<input type="hidden" name="propertyid" value="{$page.meta.propkey}" />
									<input type="hidden" name="roomid" value="{$page.meta.roomid}" />
									<input type="hidden" name="linksrez_code" value="{$page.meta.linksrez_code}" />
									<input type="hidden" name="linksrez_rate" value="{$page.meta.linksrez_rate}" />
									<input type="hidden" name="linksrez_hotel" value="{$page.meta.linksrez_hotel}" />
									<input type="hidden" name="lodgify_houseid" value="{$page.meta.lodgify_houseid}" />
									<input type="hidden" name="lodgify_roomtypeid" value="{$page.meta.lodgify_roomtypeid}" />
									<input type="hidden" name="propertyname" value="{$page.meta.ss_page_title}" />
									<input type="hidden" name="amount" value="" id="amount" />
									<input type="hidden" name="currency" value="{$page.meta.property_currency}" />
									<div class="adultsPropBox{if $metadata.show_children} half{/if}">
								<label>{if $metadata.adults_field_label}{$metadata.adults_field_label}{else}Adults:{/if}</label>
								<span class="value">1</span>
								<span class="arrow">M</span>
								{*
								{if $page.meta.person_capacity>$page.meta.adults_capacity}
									{assign var="adults" value=$page.meta.person_capacity}
								{else}
								*}
									{assign var="adults" value=$page.meta.adults_capacity}
									{*
								{/if}
								*}
								<select name="adults">
									<option value="1">1</option>
									{for $i=2 to 50}
									    {if $adults >= $i}
										<option>{$i}</option>
									    {/if}
									{/for}
								</select>
								</div>
								{if $metadata.show_children}
								<div class="childrenPropBox">
								<label>{if $metadata.children_field_label}{$metadata.children_field_label}{else}Children:{/if}</label>
								<span class="value">1</span>
								<span class="arrow">M</span>
								<select name="children">
									<option value="0">0</option>
									{if $page.meta.children_capacity > 0}
									    {for $i=1 to $page.meta.children_capacity}
										<option value="{$i}">{$i}</option>
									    {/for}
									{/if}
								</select>
								</div>
								{/if}
								<label class="offerBox offer1 selected" data-offer="1">
									<input type="radio" name="offers" value="{$page.meta.offer1id}" checked="checked" class="offer"/>
									<p><strong>{if $page.meta.offer1name!=""}{$page.meta.offer1name}{else}{if $metadata.default_offer_name}{$metadata.default_offer_name}{else}Price{/if}{/if}</strong><br/>
									{$page.meta.offer1desc}</p>
									<div class="priceBox">
									<p><span class="bookingPrice">{if $metadata.price_loading_text}{$metadata.price_loading_text}{else}Getting latest price{/if}</span></p>
									</div>
									<div class="messages"></div>

								</label>
								{if $page.meta.offer2name!=""&&(($metadata.reqcoupon&&$smarty.cookies.output_reqCoupon==2)||!$metadata.reqcoupon)}
								<label class="offerBox offer2" data-offer="2">
									<input type="radio" name="offers" value="{$page.meta.offer2id}" class="offer"/>
									<p><strong>{if $page.meta.offer2name!=""}{$page.meta.offer2name}{else}{if $metadata.default_offer_name}{$metadata.default_offer_name}{else}Price{/if}{/if}</strong><br/>
									{$page.meta.offer2desc}</p>
									<div class="priceBox">
									<p><span class="bookingPrice">{if $metadata.price_loading_text}{$metadata.price_loading_text}{else}Getting latest price{/if}</span></p>
									</div>
									<div class="messages"></div>
								</label>
								{/if}
								{if $page.meta.offer3name!=""&&(($metadata.reqcoupon&&$smarty.cookies.output_reqCoupon==3)||!$metadata.reqcoupon)}
								<label class="offerBox offer3" data-offer="3" class="offer">
									<input type="radio" name="offers" value="{$page.meta.offer3id}"/>
									<p><strong>{if $page.meta.offer3name!=""}{$page.meta.offer3name}{else}{if $metadata.default_offer_name}{$metadata.default_offer_name}{else}Price{/if}{/if}</strong><br/>
									{$page.meta.offer3desc}</p>
									<div class="priceBox">
									<p><span class="bookingPrice">{if $metadata.price_loading_text}{$metadata.price_loading_text}{else}Getting latest price{/if}</span></p>
									</div>
									<div class="messages"></div>
								</label>
								{/if}
								{if $page.meta.offer4name!=""&&(($metadata.reqcoupon&&$smarty.cookies.output_reqCoupon==4)||!$metadata.reqcoupon)}
								<label class="offerBox offer4" data-offer="4" class="offer">
									<input type="radio" name="offers" value="{$page.meta.offer4id}"/>
									<p><strong>{if $page.meta.offer4name!=""}{$page.meta.offer4name}{else}{if $metadata.default_offer_name}{$metadata.default_offer_name}{else}Price{/if}{/if}</strong><br/>
									{$page.meta.offer4desc}</p>
									<div class="priceBox">
									<p><span class="bookingPrice">{if $metadata.price_loading_text}{$metadata.price_loading_text}{else}Getting latest price{/if}</span></p>
									</div>
									<div class="messages"></div>
								</label>
								{/if}
								{if $page.meta.offer5name!=""&&(($metadata.reqcoupon&&$smarty.cookies.output_reqCoupon==5)||!$metadata.reqcoupon)}
								<label class="offerBox offer5" data-offer="5">
									<input type="radio" name="offers" value="{$page.meta.offer5id}" class="offer"/>
									<p><strong>{if $page.meta.offer5name!=""}{$page.meta.offer5name}{else}{if $metadata.default_offer_name}{$metadata.default_offer_name}{else}Price{/if}{/if}</strong><br/>
									{$page.meta.offer5desc}</p>
									<div class="priceBox">
									<p><span class="bookingPrice">{if $metadata.price_loading_text}{$metadata.price_loading_text}{else}Getting latest price{/if}</span></p>
									</div>
									<div class="messages"></div>
								</label>
								{/if}
								{if $page.meta.offer6name!=""&&(($metadata.reqcoupon&&$smarty.cookies.output_reqCoupon==6)||!$metadata.reqcoupon)}
								<label class="offerBox offer6" data-offer="6">
									<input type="radio" name="offers" value="{$page.meta.offer6id}" class="offer"/>
									<p><strong>{if $page.meta.offer6name!=""}{$page.meta.offer6name}{else}{if $metadata.default_offer_name}{$metadata.default_offer_name}{else}Price{/if}{/if}</strong><br/>
									{$page.meta.offer6desc}</p>
									<div class="priceBox">
									<p><span class="bookingPrice">{if $metadata.price_loading_text}{$metadata.price_loading_text}{else}Getting latest price{/if}</span></p>
									</div>
									<div class="messages"></div>
								</label>
								{/if}

								<input type="hidden" name="deposit" value="{$page.meta.deposit}"/>
								{if $page.meta.deposit=="101"}
									<p>{if $metadata.first_night_deposit_message}{$metadata.first_night_deposit_message}{else}First night's fee as deposit required, balance will be due subject to terms and conditions{/if}</p>
								{else}
									{if $page.meta.deposit<100&&$page.meta.deposit>0}
										<p>{$page.meta.deposit}{if $metadata.percentage_deposit_message}{$metadata.percentage_deposit_message}{else}% deposit required, balance will be due subject to terms and conditions{/if}</p>

									{/if}
								{/if}


<div class="unavailable" style="display:none">
<p class="Icon_Alert">

{*
								{if $page.meta.auxtext!=""}
								{$page.meta.auxtext}
								{else}
								*}
								{if $metadata.unavailable_message}{$metadata.unavailable_message}{else}Your stay is unavailable for these dates.{/if}
								{*
								{/if}
								*}
</p>
{*
<p class="Button_Medium"><a href="" onclick="window.history.back();return false;">{if $metadata.go_back_button}{$metadata.go_back_button}{else}Go Back{/if}</a></p>
*}
</div>
<div class="clear">
</div>
<div class="priceandbutton">
								{assign var=upsells value=$page.meta.upsells|json_decode:true}
								{assign var='upsellcount' value=0}
								{foreach from=$upsells item="upsell"}
										{counter assign="upsellcount"}
								{/foreach}
								{if $upsellcount>0}
								<input type="hidden" name="upsells" value="{$page.meta.upsells|htmlspecialchars}"/>
								{*<p><span style="text-decoration:underline">Additional items:</span><p/>*}

								{else}
								{*<p>The price quoted above is inclusive of all Fees and taxes</p>*}
								{/if}
{*
								{foreach from=$upsells item="upsell"}
									{if $upsell.type=="2"||$upsell.type=="7"||$upsell.type=="8"}
										{if $upsell.unit==0&&$upsell.period==0}
										<p>{$upsell.description.EN}:
										{if $page.meta.property_currency=="EUR"}€{elseif $page.meta.property_currency=="GBP"}£{else}&dollar;{/if}{$upsell.price|string_format:"%.2f"}</p>
										{/if}
										{if $upsell.unit==0&&$upsell.period==1}
										<p>{$upsell.description.EN}:
										{if $page.meta.property_currency=="EUR"}€{elseif $page.meta.property_currency=="GBP"}£{else}&dollar;{/if}{$upsell.price|string_format:"%.2f"}/day</p>
										{/if}
										{if $upsell.unit==0&&$upsell.period==2}
										<p>{$upsell.description.EN}:
										{if $page.meta.property_currency=="EUR"}€{elseif $page.meta.property_currency=="GBP"}£{else}&dollar;{/if}{$upsell.price|string_format:"%.2f"}/week</p>
										{/if}
										{if $upsell.unit==1&&$upsell.period==1}
										<p>{$upsell.description.EN}:
										{if $page.meta.property_currency=="EUR"}€{elseif $page.meta.property_currency=="GBP"}£{else}&dollar;{/if}{$upsell.price|string_format:"%.2f"}/person/day</p>
										{/if}
										{if $upsell.unit==1&&$upsell.period==2}
										<p>{$upsell.description.EN}:
										{if $page.meta.property_currency=="EUR"}€{elseif $page.meta.property_currency=="GBP"}£{else}&dollar;{/if}{$upsell.price|string_format:"%.2f"}/person/week</p>
										{/if}
										{if $upsell.unit==1&&$upsell.period==0}
										<p>{$upsell.description.EN}:
										{if $page.meta.property_currency=="EUR"}€{elseif $page.meta.property_currency=="GBP"}£{else}&dollar;{/if}{$upsell.price|string_format:"%.2f"}/person</p>
										{/if}
									{/if}
									{if $upsell.type=="6"||$upsell.type=="4"}
										<p>{$upsell.description.EN}:
										{if $page.meta.property_currency=="EUR"}€{elseif $page.meta.property_currency=="GBP"}£{else}&dollar;{/if}<span class="percenttax" data-pc="{$upsell.price}"></span></p>
									{/if}
								{/foreach}
								{foreach from=$upsells item="upsell"}
									{if $upsell.type=="1"||$upsell.type=="3"}
										{if $upsell.unit==0&&$upsell.period==0}
										{/if}
										{if $upsell.unit==0&&$upsell.period==1}
										{assign var="append" value="/day"}
										{/if}
										{if $upsell.unit==0&&$upsell.period==2}
										{assign var="append" value="/person/week"}
										{/if}
										{if $upsell.unit==1&&$upsell.period==1}
										{assign var="append" value="/person/day"}
										{/if}
										{if $upsell.unit==1&&$upsell.period==2}
										{assign var="append" value="/person/week"}
										{/if}
										{if $upsell.unit==1&&$upsell.period==0}
										{assign var="append" value="/person"}
										{/if}
									<p><input type="checkbox" name="optional[]" value="{$upsell.description.EN}"/> {$upsell.description.EN}:
									{if $page.meta.property_currency=="EUR"}€{elseif $page.meta.property_currency=="GBP"}£{else}&dollar;{/if}{$upsell.price|string_format:"%.2f"}{$append}</p>
									{/if}
									{if $upsell.type=="5"}
										<p><input type="checkbox" name="optional[]" value="{$upsell.description.EN}"/> {$upsell.description.EN}:
										{if $page.meta.property_currency=="EUR"}€{elseif $page.meta.property_currency=="GBP"}£{else}&dollar;{/if}{$upsell.price|string_format:"%.2f"}{$append}</p>
									{/if}
								{/foreach}
								*}

								{if $page.meta.auxtext!=""&&$metadata.showaux}
								<p>{$page.meta.auxtext}</p>
								{/if}
									<p class="Button_Small submit_form book_stay_button"><a href="#">{if $metadata.book_stay_button}{$metadata.book_stay_button}{else}Book your Stay{/if}</a></p>
								</div>
							</form>
 </div>                                                                                                      
 </div>                                                                                                      
 </div>        
								{*
						<p>{$page.meta.location|nl2br}</p>
						*}
						<br/>
					</div>
			{* related *}
	{if $metadata.show_rel}
	{pages_by_tag tags=$metadata.tagids assign=related direction=asc filter_meta_city=$page.meta.city limit=4}
	{if $related}
		<h2>{if $metadata.related_properties_heading}{$metadata.related_properties_heading}{else}Related properties{/if}</h2>
	<div id="related_props">
		{foreach from=$related item=$rel}
			{assign var="images" value=$page.meta.images_json|json_decode:true}
			<div class="related-prop">
				<div class="rel-prop-img" style="background-image:url({$images[0][0]});background-position:50% 50%;background-size:cover;"><img src="/graphics/x.gif" width="400" height="300"></div>
				<p><a href="/properties/{$rel.url_str}/">{$rel.pagetitle}</a></p>
			</div>
		{/foreach}
	</div>
	{/if}
	{/if}
<br/>
<br/>

{else}
{/if}
		
<script type="text/javascript">
	{literal}
	function equalHeightProps() {
	/*
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
		*/
	}
	$(window).resize(function(){
		equalHeightProps();
	});
	$(window).load(function(){
		equalHeightProps();
	});
	// Helper function to get URL parameter
	function getUrlParameter(name) {
		name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
		var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
		var results = regex.exec(location.search);
		return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
	}

	// Populate dates from URL or cookies
	function populateDatesFromUrlOrCookies() {
		// Check URL parameters first, then fall back to cookies
		var startdate = getUrlParameter('start') || readCookie("startdate");
		var enddate = getUrlParameter('end') || readCookie("enddate");
		var adults = getUrlParameter('adults') || readCookie("adults");
		var children = getUrlParameter('children');

		// If we got dates from URL, update the cookies for consistency
		if (getUrlParameter('start')) {
			createCookie("startdate", startdate, 0);
			createCookie("enddate", enddate, 0);
			createCookie("adults", adults, 0);
		}

		if (startdate){
			$(".startrange").val(startdate).parents("form").find(".submit_form a").text("{/literal}{if $metadata.continue_booking_button}{$metadata.continue_booking_button|escape:'javascript'}{else}Continue Booking{/if}{literal}");
			$(".formDaterangeStartValue").text(startdate);
			$(".endrange").val(enddate);
			$(".formDaterangeEndValue").text(enddate);
		}
		if (adults){
			$("select[name='adults']").val(adults);
			$(".adultsPropBox .value").text(adults);
		}
		if (children){
			$("select[name='children']").val(children);
			$(".childrenPropBox .value").text(children);
		}

		// After populating dates, trigger price calculation if getPrice function exists
		if (startdate && enddate && typeof getPrice === 'function') {
			$(".propSearchForm").each(function(){
				getPrice($(this));
			});
		}
	}

	// Run on document ready with a slight delay to ensure search.js has initialized first
	$(document).ready(function(){
		// Use setTimeout to ensure this runs after search.js propSearchForm initialization
		setTimeout(function(){
			populateDatesFromUrlOrCookies();
		}, 100);
	});

	// Also run on window load as a fallback
	$(window).on('load', function(){
		populateDatesFromUrlOrCookies();
	});
	{/literal}
</script>

{* Hostvana Chat Popup *}
{if $metadata.hostvana}
<!-- Chat Badge Button -->
<div id="hv-chat-badge" class="hv-chat-badge">
	<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
		<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
	</svg>
</div>

<!-- Chat Popup Modal -->
<div id="hv-chat-popup" class="hv-chat-popup">
	<div class="hv-chat-header">
		<div class="hv-chat-title">
			<strong>{$metadata.agent}</strong>
			<span class="hv-status">{if $metadata.agent_online_status}{$metadata.agent_online_status}{else}Online{/if}</span>
		</div>
		<button class="hv-close-btn" id="hv-close-chat">&times;</button>
	</div>
	<div class="hv-chat-body">
		<div class="hv-greeting">
			<p>{if $metadata.agent_greeting}{$metadata.agent_greeting}{else}I'm here to answer any listing questions{/if}</p>
		</div>
		<div id="hvqmsgs"></div>
		<div id="hvqthinking"></div>
	</div>
	<div class="hv-chat-footer">
		<form action="{$metadata.mystays_destination}" method="POST" id="hvq" data-agent="{$metadata.agent}">
			<input type="hidden" name="propertyid_1" value="{$page.meta.propkey}" />
			<input type="hidden" name="roomid_1" value="{$page.meta.roomid}" />
			<input type="hidden" name="bookid_1" id="hvq_book_id" value="" />
			<input type="text" id="booking-question" name="q" placeholder="{if $metadata.chat_placeholder}{$metadata.chat_placeholder}{else}Type your question here{/if}" />
			<button type="submit">{if $metadata.chat_submit_button}{$metadata.chat_submit_button}{else}Submit{/if}</button>
		</form>
	</div>
</div>

<style>
{literal}
/* Chat Badge */
.hv-chat-badge {
	position: fixed;
	bottom: 60px;
	right: 20px;
	width: 60px;
	height: 60px;
	background: #007bff;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	cursor: pointer;
	box-shadow: 0 4px 12px rgba(0,0,0,0.15);
	z-index: 9998;
	transition: all 0.3s ease;
	color: white;
}

.hv-chat-badge:hover {
	transform: scale(1.1);
	box-shadow: 0 6px 16px rgba(0,0,0,0.2);
}

/* Chat Popup */
.hv-chat-popup {
	position: fixed;
	bottom: 90px;
	right: 20px;
	width: 380px;
	max-width: calc(100vw - 40px);
	height: 500px;
	max-height: calc(100vh - 120px);
	background: white;
	border-radius: 12px;
	box-shadow: 0 8px 24px rgba(0,0,0,0.2);
	z-index: 9999;
	display: none;
	flex-direction: column;
	overflow: hidden;
}

.hv-chat-popup.active {
	display: flex;
}

.hv-chat-header {
	background: #007bff;
	color: white;
	padding: 16px 20px;
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.hv-chat-title {
	display: flex;
	flex-direction: column;
}

.hv-chat-title strong {
	color: white;
}

.hv-status {
	font-size: 12px;
	opacity: 0.9;
	color: white;
}

.hv-close-btn {
	background: none;
	border: none;
	color: white;
	font-size: 28px;
	cursor: pointer;
	line-height: 1;
	padding: 0;
	width: 30px;
	height: 30px;
	display: flex;
	align-items: center;
	justify-content: center;
}

.hv-close-btn:hover {
	opacity: 0.8;
}

.hv-chat-body {
	flex: 1;
	overflow-y: auto;
	padding: 20px;
	background: #f5f5f5;
}

.hv-greeting {
	background: white;
	padding: 12px 16px;
	border-radius: 8px;
	margin-bottom: 16px;
	box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.hv-greeting p {
	margin: 0;
	color: #333;
}

#hvqmsgs {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

#hvqthinking {
	margin-top: 12px;
}

.hvqmsg {
	padding: 12px 16px;
	border-radius: 12px;
	max-width: 70%;
	word-wrap: break-word;
	box-shadow: 0 2px 6px rgba(0,0,0,0.1);
	width: fit-content;
}

.hvqsourcehost {
	background: white;
	align-self: flex-start;
	border: 1px solid #e0e0e0;
	margin-right: auto;
}

.hvqsourceuser {
	background: #007bff;
	color: white;
	align-self: flex-end;
	border: 1px solid #0056b3;
	box-shadow: 0 2px 6px rgba(0,123,255,0.3);
	margin-left: auto;
}

.hv-chat-footer {
	padding: 16px;
	background: white;
	border-top: 1px solid #e0e0e0;
}

.hv-chat-footer form {
	display: flex;
	gap: 8px;
}

.hv-chat-footer input[type="text"] {
	flex: 1;
	padding: 10px 14px;
	border: 1px solid #ddd;
	border-radius: 6px;
	font-size: 14px;
	height: 40px;
	box-sizing: border-box;
}

.hv-chat-footer input[type="text"]:focus {
	outline: none;
	border-color: #007bff;
}

.hv-chat-footer button {
	padding: 10px 20px;
	background: #007bff;
	color: white;
	border: none;
	border-radius: 6px;
	cursor: pointer;
	font-size: 14px;
	font-weight: 500;
	transition: background 0.3s ease;
	height: 40px;
	box-sizing: border-box;
}

.hv-chat-footer button:hover {
	background: #0056b3;
}

/* Mobile Responsive */
@media (max-width: 480px) {
	.hv-chat-popup {
		bottom: 80px;
		right: 10px;
		left: 10px;
		width: auto;
		max-width: none;
	}

	.hv-chat-badge {
		bottom: 50px;
		right: 10px;
	}
}
{/literal}
</style>

<script>
{literal}
$(document).ready(function() {
	// Open chat popup
	$('#hv-chat-badge').on('click', function() {
		$('#hv-chat-popup').addClass('active');
		$('#booking-question').focus();
	});

	// Close chat popup
	$('#hv-close-chat').on('click', function() {
		$('#hv-chat-popup').removeClass('active');
	});

	// Close on outside click
	$(document).on('click', function(e) {
		if (!$(e.target).closest('#hv-chat-popup, #hv-chat-badge').length) {
			$('#hv-chat-popup').removeClass('active');
		}
	});
});
{/literal}
</script>
{/if}

{if $smarty.request.rebuild}
{flush_cache}
{/if}
{/if}
