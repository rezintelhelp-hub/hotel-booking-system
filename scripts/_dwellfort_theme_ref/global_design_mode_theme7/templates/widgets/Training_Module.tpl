{* @@@
{
        "widget_info":{
                "title":"Multi Choice Question"
                ,"title_info":"Enter a name for this instance of the widget."
        },
        "meta_data":[{
                "name":"Belongs to test group"
                ,"type": "pagetagmulti"
                ,"var": "belongs_to_test"
                ,"default":""
        },{
		"name":"Quickadd tag for Test",
		"info":"Enter the name for your new tag. This will be used to group questions as part of a test.",
		"type":"quickaddtag",
		"destvar":"belongs_to_test",
		"onlyone":"true"
	},{
                "name":"Retest pool"
                ,"type": "pagetagmulti"
                ,"var": "retest_pool"
                ,"default":""
        },{
		"name":"Quickadd tag for retest pool",
		"info":"Enter the name for your new tag. This will be used to create a collection of variants of this question - only one will show at a time.",
		"type":"quickaddtag",
		"destvar":"retest_pool",
		"onlyone":"true"
	},{
		"name":"Show stats",
		"type":"tick",
		"var":"showstats",
		"default":"1"
	},{
		"name":"Correct Answer 1",
		"type":"text",
		"var":"answer1",
		"info":"Please enter the answer for this question.",
		"default":""
	},{
		"name":"Correct Answer 2",
		"type":"text",
		"var":"answer2",
		"info":"Please enter an optional second correct answer. If this is populated then two answers will need to be ticked to complete the question.",
		"default":""
	},{
		"name":"Distractor 1",
		"type":"text",
		"var":"distractor1",
		"info":"Please enter a distractor to be shown in the list of available answers to tick.",
		"default":""
	},{
		"name":"Distractor 2",
		"type":"text",
		"var":"distractor2",
		"info":"Please enter an optional second distractor to be shown in the list of available answers to tick.",
		"default":""
	},{
		"name":"Distractor 3",
		"type":"text",
		"var":"distractor3",
		"info":"Please enter an optional third distractor to be shown in the list of available answers to tick.",
		"default":""
	},{
		"name":"Distractor 4",
		"type":"text",
		"var":"distractor4",
		"info":"Please enter an optional fourth distractor to be shown in the list of available answers to tick.",
		"default":""
	}],
        "inner_templates":{
        }
}
@@@ *}
{if $content.logged_in_user}
{* Count number of retest questions *}
{if $metadata.retest_pool!=""}
	{count_live_widgets
	var=retest_pool
	template="Training_Module.tpl"
	value=$metadata.retest_pool
	}
	{assign var=number_in_pool value=$count}
{else}

	{assign var=number_in_pool value=0}
{/if}
{assign var=attempts value=0} {* Used to count attepts from pool *}
{assign var=pass value=false} {* Used to check if any question in the pool is a pass. Stop any other questions if so *}
{assign var=hasanswered value=false}
{assign var=keephidden value=false}

{assign var=showtest value=true}
{assign var=beforethis value=true}

{* Loop throuth all pool instances, one will be this one. *}
{foreach from=$instance_ids item=pool name=instances}
		{if $pool==$metadata.instance_id}
			{if $smarty.foreach.instances.first}
			{assign var=isfirst value=true}
			{/if}
			{assign var=beforethis value=false}
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
		{/if}
		{if $beforethis}
			{get_user_child_data
				userid=$content.logged_in_user.id
				type="training_question_`$pool`"
				assign=otherhistory
			}

			{if $otherhistory}
				{foreach from=$otherhistory item=answer}
					{if $answer.result}
						{assign var=keephidden value=true}
					{/if}

				{/foreach}
			{else}
				{assign var=keephidden value=true}
			{/if}
		{/if}

{/foreach}
{* Count others in test to show stats *}
{if $isfirst}
	{count_live_widgets
		var=belongs_to_test
		template="Training_Module.tpl"
		value=$metadata.belongs_to_test
		groupby="retest_pool"
	}
	{assign var=answered value=0}
	{assign var=passed value=0}
	{assign var=failed value=0}
	{foreach from=$instance_ids item=group key=key}
		{assign var=passthis value=false}
		{assign var=qanswered value=true}
		{foreach from=$group item=id}
			{assign var=history value=false}
			{get_user_child_data
				userid=$content.logged_in_user.id
				type="training_question_`$id`"
				assign=history
			}
			{if $history!==false}

				{foreach from=$history item=history_item}
					{if $history_item.result}
					{assign var=passthis value=true}
					{/if}
				{/foreach}
			{else}
				{assign var=qanswered value=false}
			{/if}

		{/foreach}
		{if !$passthis}
			{if $qanswered}
			{assign var=failed value=$failed+1}
			{/if}
		{else}
			{assign var=passed value=$passed+1}
		{/if}
		{if $qanswered||$passthis}
			{assign var=answered value=$answered+1}
		{/if}
	{/foreach}
	{if $metadata.showstats}
	<div class="styleBox training-question-results">
	{math equation="x / y * 100" x=$passed y=$count assign=pcc}
	{math equation="x / y * 100" x=$failed y=$count assign=pcf}
	<div class="trainingpc"><div class="trainingfail" style="width:{$pcf}%"></div><div class="trainingcorrect" style="width:{$pcc}%"></div></div>
	<p>You have answered {$answered} question{if $answered!=1}s{/if} of {$count} in this test.</p>
	</div>
	{/if}
{/if}
{if $metadata.retest_pool==""}
	{count_live_widgets
		var=belongs_to_test
		template="Training_Module.tpl"
		value=$metadata.belongs_to_test
	}
	{assign var=answered value=0}
	{assign var=passed value=0}
	{assign var=failed value=0}
	{assign var=passthis value=false}
	{assign var=history value=false}

	{foreach from=$instance_ids item=others key=key}
		{assign var=passthis value=false}
		{assign var=qanswered value=true}

		{get_user_child_data
			userid=$content.logged_in_user.id
			type="training_question_`$others`"
			assign=history
		}
		{if $history!==false}

			{foreach from=$history item=history_item}
				{if $history_item.result}
				{assign var=passthis value=true}
				{/if}
			{/foreach}
			{if $metadata.instance_id==$others}
                        {assign var=hasanswered value=true}
                        {/if}
		{else}
			{assign var=qanswered value=false}
		{/if}
		{if !$passthis}
			{if $qanswered}
			{assign var=failed value=$failed+1}
			{/if}
		{else}
			{assign var=passed value=$passed+1}
			{if $metadata.instance_id==$others}
			{assign var=pass value=true}
			{assign var=hasanswered value=true}
			{/if}
		{/if}
		{if $qanswered||$passthis}
			{assign var=answered value=$answered+1}
		{/if}
	{/foreach}
	{if $metadata.showstats}
	<div class="styleBox training-question-results">
	{math equation="x / y * 100" x=$passed y=$count assign=pcc}
	{math equation="x / y * 100" x=$failed y=$count assign=pcf}
	<div class="trainingpc"><div class="trainingfail" style="width:{$pcf}%"></div><div class="trainingcorrect" style="width:{$pcc}%"></div></div>
	<p>You have answered {$answered} question{if $answered!=1}s{/if} of {$count} in this test.</p>
	</div>
	{/if}
{/if}

{* Check if posting *}
{if $smarty.post.answers && $smarty.post.answering==$metadata.instance_id}
	{if $metadata.answer2}
	{assign var=continue value=false}
		{if $smarty.post.answers|count > 1}
		{assign var=continue value=true}
		{assign var=showtest value=false}
		<p>Your answers:</p>
		{else}
		<p>You must choose two answers. Please try again.</p>
		{/if}

	{else}
	{assign var=continue value=true}
	<p>Your answer:</p>
	{/if}
	{if $continue}
		{assign var=result value=true}
		{foreach from=$smarty.post.answers item=answer}
		<p class="q_answer">{$answer} <span class="result">
		{if $answer==$metadata.answer1||$answer==$metadata.answer2}
		Correct
		{else}
		Incorrect
		{assign var=result value=false}
		{/if}
		</span></p>
		{/foreach}
		{add_user_child_data
			type="training_question_`$metadata.instance_id`"
			more_data_result=$result
			more_data_date=$smarty.now|date_format:"%Y-%m-%d %H:%M:%S"
			userid=$content.logged_in_user.id
		}
		{assign var=keephidden value=true}
		{redirect location="?"}
	{/if}
{/if}

{delete_user_child_data
	userid=$content.logged_in_user.id
	type="training_question_last_edited"
}
{add_user_child_data
	type="training_question_last_edited"
	more_data_page=$content.fullUrl
	userid=$content.logged_in_user.id
}
{if $pass}
	<div class="styleBox training-question training-question-correct">
	{if !$smarty.post.answering&&$metadata.retest_pool!=""}
	<p>Result of your correct attempt:</p>
	{/if}
	{$editable.pass_content}
	</div>
{/if}
{if $hasanswered&&!$pass}
	<div class="styleBox training-question training-question-incorrect">
	{if !$smarty.post.answering&&$metadata.retest_pool!=""}
	<p>Result of your previous attempt:</p>
	{/if}
	{$editable.fail_content}
	</div>
{/if}
{if !$hasanswered&&!$keephidden}
	<div class="styleBox training-question">
	{$editable.question}
	{append var=out value=$metadata.answer1}
	{if $metadata.answer2}
	<p>Please select 2 answers:</p>
	{append var=out value=$metadata.answer2}
	{/if}
	{append var=out value=$metadata.distractor1}
	{if $metadata.distractor2}
	{append var=out value=$metadata.distractor2}
	{/if}
	{if $metadata.distractor3}
	{append var=out value=$metadata.distractor3}
	{/if}
	{if $metadata.distractor4}
	{append var=out value=$metadata.distractor4}
	{/if}
	{assign var=rand value=$out|randomize}
	{counter assign=qc1}
	<form action="" method="post" class="form noAjax">
	<input type="hidden" name="answering" value="{$metadata.instance_id}"/>
	{foreach from=$rand item=q}
	<div class="input-wrapper clearfix input-wrapper-width-0 input-wrapper-type-{if $metadata.answer2}checkbox{else}radiogroup{/if} input-wrapper-label-{$q|css_safe}" >
	{if $metadata.answer2}
	<input id="qi{$qc1}" type="checkbox" name="answers[]" class="checkbox checkbox_{$q|css_safe}" value="{$q}" >
	{else}
	<input id="qi{$qc1}" type="radio" name="answers[]" value="{$q}" class="radio radio_{$q|css_safe}" />
	{/if}
	<label for="qi{$qc1}"><span>{$q}</span></label>
	</div>
	{counter assign=qc1}
	{/foreach}
	<p class="Button_Medium submit_form"><a href="#">Go</a></p>
	</form>
	</div>
{/if}
{/if}
