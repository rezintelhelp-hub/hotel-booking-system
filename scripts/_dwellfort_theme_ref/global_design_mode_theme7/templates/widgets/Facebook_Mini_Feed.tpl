{* @@@
{
	"widget_info":{
		"title":"Facebook Mini Feed"
		,"title_info":"Enter a name for this instance of the Facebook Mini Feed widget. This is just used for reference."
		,"category":"setup"
		,"legacy":"true"
	},
	"meta_data":[
	{
                "name":"Account"
                ,"type": "dropdown"
                ,"var": "account"
                ,"default":"1"
                ,"options":[
                        {
                                "label":"Primary"
                                ,"value":"1"
                        },
                        {
                                "label":"Secondary"
                                ,"value":"2"
                        }
                ]
        }
	],
	"inner_templates":{
	}
}
@@@ *}
{facebook show=10 account=$metadata.account}
<div class="social-mini-feed-wrap-outer">
<div class="social-mini-feed-wrap">
<div class="styleBox facebook-mini-feed">
{foreach from=$posts item=post}
<div class="facebook-mini-feed-post">
<img src="{$image}" class="facebook-mini-feed-pic" />
<h2>{$post.title}</h2>
<p class='facebook-mini-feed-date'>{$post.timestamp|date_format:"%e %B %Y %H:%M"}
{$post.html}
</div>
{/foreach}
{if $noconnection}
<p>Facebook feed not configured</p>
{/if}
</div>
</div>
</div>
