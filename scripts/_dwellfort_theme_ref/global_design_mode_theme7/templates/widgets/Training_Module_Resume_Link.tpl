{* @@@
{
        "widget_info":{
                "title":"Resume Training Button"
                ,"title_info":"Enter a name for this instance of the widget."
        },
        "meta_data":[{
                "name":"Button text"
                ,"type": "text"
                ,"info": ""
                ,"var": "text"
                ,"default":"Resume test"
        },{
                "name":"Button align"
                ,"type": "dropdown"
                ,"var": "align"
                ,"default":""
                ,"options":[
                        {
                                "label":"Default"
                                ,"value":""
                        },
                        {
                                "label":"Left"
                                ,"value":"left"
                        },
                        {
                                "label":"Middle"
                                ,"value":"center"
                        },
                        {
                                "label":"Right"
                                ,"value":"right"
                        }

                ]
        }],
        "inner_templates":{
        }
}
@@@ *}
{get_user_child_data
	userid=$content.logged_in_user.id
	type="training_question_last_edited"
	assign=last_edited
}
{foreach from=$last_edited item=le}
{assign var="last_page" value=$le.page}
{/foreach}
{if $last_edited}
{$editable.above_resume_button}
<p class="Button_Medium "{if $metadata.align} style="text-align:{$metadata.align}"{/if}><a href="{$last_page}">{$metadata.text}</a></p>
{else}
{$editable.not_started}
{/if}
