{* @@@
{
        "widget_info":{
                "title":"Training Module Question Status"
                ,"title_info":"Enter a name for this instance of the widget."
        },
        "meta_data":[{
                "name":"Retest pool tag"
                ,"type": "pagetagmulti"
                ,"var": "retest_question_tag"
                ,"default":""
	}],
        "inner_templates":{
        }
}
@@@ *}
{if $content.logged_in_user}
{* Count number of retest questions *}
	{count_live_widgets
	var=retest_pool
	template="Training_Module.tpl"
	value=$metadata.retest_question_tag
	}
	{assign var=number_in_pool value=$count}

{assign var=attempts value=0} {* Used to count attepts from pool *}
{assign var=pass value=false} {* Used to check if any question in the pool is a pass. Stop any other questions if so *}
{assign var=hasanswered value=false}
{assign var=keephidden value=false}

{assign var=showtest value=true}
{assign var=beforethis value=true}

{* Loop throuth all pool instances *}
{foreach from=$instance_ids item=pool name=instances}
		{get_user_child_data
			userid=$content.logged_in_user.id
			type="training_question_`$pool`"
			assign=thisanswer
		}
		{if $thisanswer}
			{foreach from=$thisanswer item=answer}
				{assign var=hasanswered value=true}
				{assign var=attempts value=$attempts+1}
				{assign var=keephidden value=true}
				{if $answer.result}
					{assign var=pass value=true}
				{/if}
			{/foreach}
		{/if}
{/foreach}
{* Count others in test to show stats *}
{if $attempts==0}
<div class="styleBox pool-stats">
{$editable.not_started}
</div>
{else}
{if $attempts<$number_in_pool&&!$pass}
<div class="styleBox pool-stats">
{$editable.started}
</div>
{/if}
{/if}
{if $attempts>=$number_in_pool&&!$pass}
<div class="styleBox pool-stats">
{$editable.all_wrong}
</div>
{/if}
{if $pass}
<div class="styleBox pool-stats">
{$editable.pass}
</div>
{/if}
{/if}
