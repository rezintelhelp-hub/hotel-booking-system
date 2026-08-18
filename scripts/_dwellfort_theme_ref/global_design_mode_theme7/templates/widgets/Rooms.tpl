{* @@@
{
	"widget_info":{
		"title":"Property Rooms"
		,"title_info":"Enter a name for this instance of a multi-room property."
	},
	"meta_data":[{
		"name":"User ID"
		,"info":"User ID"
		,"type": "text"
		,"var": "userid"
		,"design":"true"
	},{
		"name":"Property name"
		,"info":"Property Name"
		,"type": "text"
		,"var": "propertyname"
		,"design":"true"
	},{
		"name":"Property ID"
		,"info": "Property ID"
		,"type": "text"
		,"var": "propertyid"
		,"design":"true"
	},{
		"name":"Book Now Page URL"
		,"type":"text"
		,"info":"URL to the book now page"
		,"var":"book_now_url"
		,"default":"/book-now/"
	}],
	"inner_templates":{
	}
}
@@@ *}

{* Logic *}
{delete_page_child_data pageid=$content.id type="propertyroom"}
		{beds24 action="getProperties" userid=$metadata.userid}
		{foreach from=$properties item=property}
			{if $property.propId==$metadata.propertyid}
					{add_widget_meta instance_id=$metadata.instance_id name="propertyname" value=$property.name}
					{beds24 action="getPropertyRooms" propkey=$property.propKey}
					{foreach from=$propertyRooms item=propertyContents}
						{add_page_child_data
						pageid=$content.id
						type="propertyroom"
						show_in_activity=0
						more_data_lastupdated=$smarty.now|date_format:"%Y-%m-%d %H:%M"
						more_data_name=$propertyContents.name
						more_data_lastupdated=$smarty.now|date_format:"%Y-%m-%d %H:%M"
						more_data_bedrooms=$propertyContents.bedrooms
						more_data_roomid=$propertyContents.roomId
						more_data_bathrooms=$propertyContents.bathrooms
						more_data_allowchildren=$propertyContents.allowchildren
						more_data_allowinfants=$propertyContents.allowinfants
						more_data_allowsmoking=$propertyContents.allowsmoking
						more_data_allowpets=$propertyContents.allowpets
						more_data_street_address=$propertyContents.address
						more_data_city=$propertyContents.city
						more_data_images_json=$propertyContents.images|json_encode
						more_data_state=$propertyContents.state
						more_data_postcode=$propertyContents.postcode
						more_data_latitude=$propertyContents.latitude
						more_data_longditude=$propertyContents.longitude
						more_data_person_capacity=$propertyContents.maxPeople
						}
					{/foreach}
			{/if}
		{/foreach}
<h2>{$metadata.propertyname}</h2>
{foreach from=$content.page_child_data.propertyroom item=room}
<div class="styleBox">
	<h2>{$room.values.name}</h2>
	{assign var="images" value=$room.values.images_json|json_decode}
	<img src="{$images[0]}" width="400" style="float:right"/>
				<p class="Button_Large"><a href="{$metadata.book_now_url}?property={$metadata.propertyid}&roomid={$room.values.roomid}&name={$metadata.propertyname}%20-%20{$room.values.name|htmlentities}">Book Now</a></p>

				<p class><strong>Allow pets? <strong> {if $room.values.allowpets == "1"}Yes pets are allowed{else}We are sorry pets are not allowed{/if}</p>
				<p class><strong>Allow Infants? <strong> {if $room.values.allowinfants == "1"}Yes infants are allowed{else}We are sorry infants are not allowed{/if}</p>
				<p class><strong>Allow Children? <strong> {if $room.values.allowchildren == "1"}Yes children are allowed{else}We are sorry children are not allowed{/if}</p>
				<p class><strong>Allow Smoking? <strong> {if $room.values.allowsmoking == "1"}Yes smoking is allowed{else}We are sorry smoking is not allowed{/if}</p>
				<div class="clear"></div>
				<H2>Location</H2>	
					<iframe 
					width="100%" 
					height="250" 
					frameborder="0" 
					scrolling="no" 
					marginheight="0" 
					marginwidth="0" 
					src="https://maps.google.com/maps?q={$room.values.latitude},{$room.values.longditude}&hl=es;z=14&amp;output=embed"
					>
					</iframe>
</div>
{/foreach}
