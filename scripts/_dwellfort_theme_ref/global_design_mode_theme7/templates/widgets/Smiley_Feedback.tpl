{* @@@
{
        "widget_info":{
                "title":"Smiley Feedback"
                ,"title_info":"Enter a name for this instance of you widget. This is just for your reference and isn’t displayed publicly."
                ,"category":"forms" 
        },
        "meta_data":[],
        "inner_templates":{
        }
	,"page_child_data_labels":{
		"smiley_feedback":{
			"score":{"type":"text","label":"Score","show_aggregate":"true"}
		}
	}
}
@@@ *}
{if $smarty.post.data&&$smarty.post.id==$metadata.instance_id}
{add_page_child_data
 pageid=$content.id 
 data=$smarty.post.data
 show_in_activity=1
 activity_name="Smiley Feedback: `$metadata.instance_title`"
 type="smiley_feedback_`$metadata.instance_title|css_safe`"}
{/if}
<div class="smiley_feedback" data-id="{$metadata.instance_id}">
<div class="smiley_score smiley_score_score0" data-score="Least happy">
</div>
<div class="smiley_score smiley_score_score1" data-score="Unhappy">
</div>
<div class="smiley_score smiley_score_score2" data-score="Neutral">
</div>
<div class="smiley_score smiley_score_score3" data-score="Happy">
</div>
<div class="smiley_score smiley_score_score4" data-score="Very Happy">
</div>
<div class="save_score_done">Thanks. Your score has been saved.</div>
</div>
