{* @@@
{
        "widget_info":{
                "title":"Training Results"
                ,"title_info":"Enter a name for this instance of the widget."
                ,"category":"setup" 
        },
        "meta_data":[{
                "name":"Test group"
                ,"type": "pagetagmulti"
                ,"var": "belongs_to_test"
                ,"default":""
        },{
                "name":"Reset other test groups"
                ,"type": "pagetagmulti"
                ,"var": "other_tests"
                ,"default":""
        },{
                "name":"Display name"
                ,"type": "text"
                ,"info": "Enter a name for this test."
                ,"var": "display_name"
                ,"default":""
        },{
                "name":"Pass threshold"
                ,"type": "text"
                ,"info": "Enter a percentage needed for the user to pass this test. Enter just a whole number without the % symbol."
                ,"var": "threshold"
                ,"default":"100"
        },{
                "name":"Redirect on reset link"
                ,"type": "linkpageonly"
		,"info":"Please choose a page that the user will be taken to when they retake the test."
                ,"var": "first_question"
		,"default":""
        },{
                "name":"Redirect on reset all link"
                ,"type": "linkpageonly"
		,"info":"Please choose a page that the user will be taken to when they reset all tests (requires other test groups to be selected in 'Reset other test groups')."
                ,"var": "first_question_all"
		,"default":""
        },{
                "name":"Expiry"
                ,"type": "text"
                ,"info": "Enter number of months that the test result will be valid for. Enter 0 to have to expiry (expiry SMS and emails won't be sent)."
                ,"var": "expiremonths"
                ,"default":"0"
        },{
                "name":"Expiry SMS text"
                ,"type": "text"
                ,"info": "Enter text to send to users who have SMS numbers 7 days before expiry"
                ,"var": "expiresms"
                ,"default":""
        },{
                "name":"Expire email"
                ,"type": "choose_email"
                ,"info": "Choose an email to be sent 7 days before a user's test expires"
                ,"var": "email"
                ,"default":"0"
        }],
        "inner_templates":{
        },
	"user_child_data_labels":{
		"pass_test":{
			"date":{"type":"text","label":"Date completed"}
		}
	}
}
@@@ *}
{delete_user_child_data
	userid=$content.logged_in_user.id
	type="training_question_last_edited"
}
{add_user_child_data
	type="training_question_last_edited"
	more_data_page=$content.fullUrl
	userid=$content.logged_in_user.id
}
{if $content.logged_in_user}
{if $smarty.request.reset}
	{assign var="toreset" value=$metadata.belongs_to_test}
	{if $metadata.other_tests!=""&&$smarty.request.resetall}
		{assign var="toreset" value="`$toreset`,`$metadata.other_tests`"}
	{/if}
	{foreach from=","|explode:$toreset item="other"}
		{delete_user_child_data
			userid=$content.logged_in_user.id
			type="pass_test_`$other`"
		}
		{count_live_widgets
		var=belongs_to_test
		template="Training_Module.tpl"
		value=$other
		}
		{foreach from=$instance_ids item=group}
				{delete_user_child_data
					userid=$content.logged_in_user.id
					type="training_question_`$group`"
				}
		{/foreach}
	{/foreach}
	{if $smarty.request.resetall}
	{redirect location=$metadata.first_question_all}
	{else}
	{redirect location=$metadata.first_question}
	{/if}
{else}
	{count_live_widgets
	var=belongs_to_test
	template="Training_Module.tpl"
	value=$metadata.belongs_to_test
	groupby="retest_pool"
	}
	{assign var=pass value=true}
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
			{if $history|count==0}
				{assign var=qanswered value=false}
			{/if}
			
			{foreach from=$history item=history_item}
				{if $history_item.result}
				{assign var=passthis value=true}
				{/if}
			{/foreach}

		{/foreach}
		{if !$passthis}
			{assign var=pass value=false}
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
	<div class="styleBox clearfix">
	<p>You have answered {$answered} question{if $answered!=1}s{/if} of {$count} in this test.</p>
		{math equation="x / y * 100" x=$passed y=$count assign=pcc}
		{math equation="x / y * 100" x=$failed y=$count assign=pcf}
		<div class="trainingpc"><div class="trainingfail" style="width:{$pcf}%"></div><div class="trainingcorrect" style="width:{$pcc}%"></div></div>
	{if $answered == $count}
	{math equation="x / y * 100" x=$passed y=$count assign=pcf}
	<p class="training-score {if $pcf<$metadata.threshold}fail{else}pass{/if}">You got {$passed} correct and {$failed} wrong. Your score: <span>{$pcf|round}%</span> {if $pcf<$metadata.threshold}({$metadata.threshold}% required to pass){/if}</p>
	{/if}
	</div>

	{get_user_child_data
		userid=$content.logged_in_user.id
		type="pass_test_`$metadata.belongs_to_test`"
	}
	{if $pcf>=$metadata.threshold&&$answered==$count}
	<div class="styleBox clearfix">
		{$editable.pass_content}
		<p class="reset-test Button_Large"><a href="?reset=1">Take {if $metadata.other_tests}this {/if}test again</a>{if $metadata.other_tests!=""} or <a href="?reset=1&resetall=1">Reset all tests{/if}</p>
	</div>
	{/if}
	{if $pcf>=$metadata.threshold&&$answered==$count&&!$user_child_data}
		{add_user_child_data
			type="pass_test_`$metadata.belongs_to_test`"
			more_data_date=$smarty.now|date_format:"%Y-%m-%d %H:%M:%S"
			userid=$content.logged_in_user.id
			show_in_activity=1
			activity_name="User passed test: `$metadata.display_name`"
		}
		{assign var="passdate" value=$smarty.now|date_format:"%Y-%m-%d %H:%M:%S"}
		{add_user_custom_fields userid=$content.logged_in_user.id name="Failed Test: `$metadata.display_name`" value=""}
		{add_user_custom_fields userid=$content.logged_in_user.id name="Passed Test: `$metadata.display_name`" value="`$passdate`"}
		{if $metadata.expiremonths>0}
		{math assign="expire" equation="n + e * 2629656" n=$smarty.now e=$metadata.expiremonths}
		{assign var="date" value=$expire|date_format:"%Y-%m-%d %H:%M:%S"}
		{math assign="expire" equation="e - 604800" e=$expire}
		{assign var="date_less_7days" value=$expire|date_format:"%Y-%m-%d %H:%M:%S"}
		{add_user_custom_fields userid=$content.logged_in_user.id name="Test Expires: `$metadata.display_name`" value="`$date`"} 
		{if $content.logged_in_user.email!="None"}
			{email_send 
				send_date=$date_less_7days 
				sendid="`$metadata.instance_id`_training_id_email_`$passdate`" 
				pageid=$metadata.email
				subject=$metadata.email_subject
				email=$content.logged_in_user.email
				name="`$content.logged_in_user.first_name` `$content.logged_in_user.last_name`"
			}
		{/if}
		{if $content.logged_in_user.sms_number!=""}
			{email_send 
				send_date=$date_less_7days 
				sendid="`$metadata.instance_id`_training_id_sms_`$passdate`" 
				pageid=$metadata.email
				subject=$metadata.email_subject
				sms=$content.logged_in_user.sms_number
				name="`$content.logged_in_user.first_name` `$content.logged_in_user.last_name`"
			}
		{/if}
		{/if}
	{/if}
	{if $pcf<$metadata.threshold&&$answered==$count}
		{assign var="date" value=$smarty.now|date_format:"%Y-%m-%d %H:%M:%S"}
		{add_user_custom_fields userid=$content.logged_in_user.id name="Passed Test: `$metadata.display_name`" value=""}
		{add_user_custom_fields userid=$content.logged_in_user.id name="Failed Test: `$metadata.display_name`" value="`$date`"}
	<div class="styleBox clearfix">
	{$editable.fail_content}
	<p class="reset-test Button_Large"><a href="?reset=1">Take {if $metadata.other_tests}this {/if}test again</a>{if $metadata.other_tests!=""} or <a href="?reset=1&resetall=1">Reset all tests{/if}</p>
	</div>
	{/if}
	{if $answered!=$count}
	<div class="styleBox training-results-incomplete">
	{$editable.incomplete_content}
	</div>
	{/if}
{/if}
{/if}
