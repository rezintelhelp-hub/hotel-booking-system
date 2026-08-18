{* @@@
{
        "widget_info":{
                "title":"Training Reset"
                ,"title_info":"Enter a name for this instance of the widget."
                ,"category":"setup" 
        },
        "meta_data":[{
                "name":"Reset test groups"
                ,"type": "pagetagmulti"
                ,"var": "testtags"
                ,"default":""
        },{
                "name":"Redirect on reset link"
                ,"type": "linkpageonly"
		,"info":"Please choose a page that the user will be taken to when they click the reset button."
                ,"var": "redirect"
		,"default":""
        },{
		"name":"Reset button button",
		"type":"text",
		"var":"button_text",
		"info":"Please enter text for the reset button.",
		"default":"Reset"
	},{
		"name":"Reset videos viewed",
		"type":"tick",
		"var":"incvids",
		"default":"0"
	}],
        "inner_templates":{
        }
}
@@@ *}
{if $content.logged_in_user}
	{if $smarty.request.reset==$metadata.instance_id}
	{assign var="toreset" value=$metadata.testtags}
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
	{if $metadata.incvids}
	{delete_user_child_data userid=$content.logged_in_user.id type_starts_with="seenvid"}
	{/if}
	<script type="text/javascript">
		window.location.href="{$metadata.redirect}";
	</script>
	{else}
	<p class="Button_Medium"><a href="?reset={$metadata.instance_id}">{$metadata.button_text}</a></p>
	{/if}
{/if}


