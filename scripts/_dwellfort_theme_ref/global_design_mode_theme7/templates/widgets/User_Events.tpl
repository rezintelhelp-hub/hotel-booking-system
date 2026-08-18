{* @@@
{
        "widget_info":{
                "title":"User Events"
                ,"title_info":"Enter a name for this instance of the User Events widget."
                ,"category":"setup" 
        },
        "meta_data":[{
                "name":"Add events to calendar"
                ,"type": "calendar_list"
                ,"var": "calendar"
                ,"default":"0"
        }],
        "inner_templates":{
        }
}
@@@ *}
{if $metadata.calendar=="0"}
<p class="Icon_Alert">Widget not configured. Please ensure this widget has a calendar selected in its settings.</p>
{else}
{if $content.logged_in_user.id!=""}

{if $smarty.post.title}
{add_event 
title=$smarty.post.title
date=$smarty.post.date
link=$smarty.post.link
time=$smarty.post.time
duration=$smarty.post.duration
summary=$smarty.post.summary
repeat=$smarty.post.repeat
repeat_end=$smarty.post.repeat_end
belongs_to_category=$metadata.calendar
}
{if $added}
{add_user_child_data 
userid=$content.logged_in_user.id
data=$smarty.post
more_data_event_id=$added
type="customevent"
show_in_activity=false
}
<p class="Icon_Tick">Event added successfully</p>
{else}
<p class="Icon_Alert">Error. Please check your event details for errors.</p>
{/if}
{/if}
{if $smarty.get.delete_event}
{get_user_child_data 
type="customevent"
userid=$content.logged_in_user.id
assign=checkevents
}
{assign var=test value=$smarty.get.delete_event}
{if $checkevents.$test.event_id==$smarty.get.eventid}

{delete_user_child_data
id=$smarty.get.delete_event
userid=$content.logged_in_user.id
}
{delete_event
id=$smarty.get.eventid
}
<p class="Icon_Info">Your event has been removed.</p>
{else}
<p class="Icon_Alert">Error. You don't own this event.</p>
{/if}
{/if}
{get_user_child_data 
type="customevent"
userid=$content.logged_in_user.id
}
<div class="yourevents">
<p class="Button_Medium" id="addnewevent"><a href="#">Add new event</a></p>
<h2>Your Events</h2>
{if !$user_child_data}
<p class="Icon_Alert">You haven't added any events yet.</p>
{else}
{foreach from=$user_child_data item=data key=key}
<div class="styleBox custom_event">
<p class="Button_Small custom_event_buttons" >
<a href="?delete_event={$key}&eventid={$data.event_id}">Delete event</a>
</p>
<p class="custom_event_data">
<span class="custom_event_label">Title:</span> {$data.title}<br/>
{if $data.date!=""}<span class="custom_event_label">Date:</span>  {$data.date|date_format:"jS F Y"}<br/>{/if}
{if $data.link!=""}<span class="custom_event_label">Link:</span>  {$data.link}<br/>{/if}
{if $data.time!=""}<span class="custom_event_label">Time:</span>  {$data.time}<br/>{/if}
{if $data.duration!=""}<span class="custom_event_label">Duration:</span>  {$data.duration}<br/>{/if}
{if $data.summary!=""}<span class="custom_event_label">Summary:</span>  {$data.summary}<br/>{/if}
{if $data.repeat!=""}<span class="custom_event_label">Repeat:</span> {$data.repeat}, ending: {$data.repeat_end}<br/>{/if}
</div>
{/foreach}
{/if}
</div>
<div class="addnewevent">
<div class="closeaddnewevent">X</div>
<h2>Add New Event</h2>
<form action="" method="POST">
<label>Event Title
<input type="text" name="title"/>
</label>
<label>Date
<input type="text" name="date" class="default_datepicker "/>
</label>
<label>Link
<input type="text" name="link"/>
</label>
<label>Time
<input type="text" name="time"/>
</label>
<label>Duration (enter whole numbers and the units written after, for example: '2 hours' or '30 minutes')
<input type="text" name="duration"/>
</label>
<label>Event Description
<textarea name="summary"></textarea>
</label>
<label>Repeat</label>
<select class="add_event_repeat_select" name="repeat">
<option value="">None</option>
<option value="daily">Daily</option>
<option value="weekly">Weekly</option>
<option value="monthly">Monthly</option>
<option value="yearly">Yearly</option>
</select>
<label class="add_event_repeat_end" style="display:none">Repeat end
<input name="repeat_end" type="text"/>
</label>
<input type="submit" value="Add event"/>
</form>
</div>
<style>
{literal}

.custom_event_buttons {
float:right;
}
.custom_event_buttons  + p {
margin-top:0px;
}
.custom_event_label {
width:100px;
text-align:right;
padding-right:5px;
color:#888;
display:inline-block;
}
.yourevents {
padding:5px 20px 20px 0;
}
.yourevents h2 {
margin-top:0;
}
.closeaddnewevent {
position:absolute;
top:10px;
right:10px;
width:20px;
height:20px;
font-family:ssicons;
cursor:pointer;
}
.addnewevent {
display:none;
box-shadow:3px 3px 10px rgba(0,0,0,0.5);
position:fixed;
overflow:auto;
top:50%;
left:50%;
max-width:80%;
width:320px;
height:600px;
max-height:80%;
transform:translateX(-50%) translateY(-50%);
padding:5px 20px 20px;
box-sizing:border-box;
background:#cfcfcf;
z-index:20000;
}
#addnewevent {
float:right;
margin-top:5px;
margin-bottom:0px;
}
.addnewevent label {
font-size:12px;
line-height:16px;
}
.addnewevent input[type=text] {
font-size:13px;
margin-bottom:3px;
line-height:16px;
}
{/literal}
</style>
<script type="text/javascript">
{literal}
$(document).ready(function(){

	$('#addnewevent a').click(function() {
		$('.addnewevent').show();
		$('.addnewevent').parents('.container').css({"overflow":"visible"});
		return false;
	});
	$('.closeaddnewevent').click(function(){
		$('.addnewevent').hide();
		return false;
	});
	$('.add_event_repeat_select').change(function(){
	if ($(this).val()!="") {
		$(".add_event_repeat_end").show();
	} else {
		$(".add_event_repeat_end").hide();
	}
	if (typeof moduleHeights != "unedfined") {
	moduleHeights();
	}
	});
});
{/literal}
</script>
{else}
<p class="Icon_Info">Please log in to add events</a>
{/if}
{/if}
