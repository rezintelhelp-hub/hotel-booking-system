{* @@@
{
	"widget_info":{
		"title":"Responsive Iframe Wrapper"
		,"title_info":"Enter a name for this instance of the widget. This is just used for reference."
		,"works_in_email":"both"
		,"show_in_search":"true"
	},
	"meta_data":[{
		"name":"Embed Code"
		,"type": "code"
        ,"info":"Paste in the embed code here."
		,"var": "code"
        ,"default":""
	}],
	"inner_templates":{	}
}
@@@ *}

<style>{literal}.embed-container { position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%; } .embed-container iframe, .embed-container object, .embed-container embed { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }{/literal}</style><div class='embed-container'>{$metadata.code}</div>
