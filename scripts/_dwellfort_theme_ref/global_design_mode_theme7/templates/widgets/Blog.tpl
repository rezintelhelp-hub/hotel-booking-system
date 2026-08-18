{* @@@
{
	"widget_info":{
		"title":"Blog"
		,"title_info":"Enter a name for this instance of the Blog widget. This is just used for reference."
		,"category":"setup"
	},
	"meta_data":[{
		"name":"Tag"
		,"type": "pagetagmulti"
		,"var": "tagids"
		,"notes":"Important: Each widget template that exposes 'inner_templates' must have its primary listing tag set with the var name of tagids - this is so the system can find the full URLs for each inner page."
	},{
		"name":"Quick Add Tag"
		,"info":"Enter the name for this tag. This tag will be created and set for the Tag item above. All pages with this tag will be treated as blog articles for this instace of the Blog widget."
		,"type": "quickaddtag"
		,"destvar": "tagids"
		,"needsparent": "false"
		,"onlyone":"true"
	},{
		"name":"Tag for pinned articles"
		,"type": "pagetagmulti"
		,"var": "pinnedtagids"
	},{
		"name":"Quick Add pinned article Tag"
		,"type": "quickaddtag"
		,"info":"Enter the name for this tag. This tag will be created and set for the 'Tag for pinned articles' item above. All pages with this tag will be treated as pinned articles for this instace of the Blog widget."
		,"destvar": "pinnedtagids"
		,"needsparent": "false"
		,"onlyone":"true"
	},{
		"name":"Sidebar categories"
		,"type": "pagetagmulti"
		,"var": "publiccats"
	},{
		"name":"Quick Add sidebar category Tag"
		,"info":"Enter the name for this tag. This tag will be created and set as a Cateogory for this instance of the Blog. Users working with blog articles in the CMS will be able to choose from any 'Sidebar category' tag added here."
		,"type": "quickaddtag"
		,"destvar": "publiccats"
		,"needsparent": "true"
		,"parent_tag_append": "sidebar categories"
		,"onlyone":"false"
	},{
		"name":"Categories in separate column"
		,"type": "tick"
		,"var": "separatecats"
		,"default":0
	},{
		"name":"Sidebar lables Tags"
		,"type": "pagetagmulti"
		,"var": "publictags"
	},{
		"name":"Quick Add sidebar lable Tag"
		,"type": "quickaddtag"
		,"info":"Enter the name for this tag. This tag will be created and set as a 'Sidebar tag' for this instance of the Blog. Users working with blog articles in the CMS will be able to choose from any 'Sidebar tag' tag added here."
		,"destvar": "publictags"
		,"needsparent": "true"
		,"parent_tag_append": "sidebar labels"
		,"onlyone":"false"
	},{
		"name":"Enable comments"
		,"type": "tick"
		,"var": "enablecomments"
		,"default":1
	},{
		"name":"Show website field"
		,"type": "tick"
		,"var": "enablewebsite"
		,"default":0
	},{
		"name":"Comments require approval"
		,"type": "tick"
		,"var": "commentsapproval"
		,"default":1
	},{
		"name":"Sidebar recent articles"
		,"type": "tick"
		,"var": "showrecents"
		,"default":1
	},{
		"name":"Number of recent articles to show"
		,"type": "text"
		,"info":"Enter the numbr of articles to show in the sidebar."
		,"default":"3"
		,"var": "toshow"
	},{
		"name":"Show search"
		,"type": "tick"
		,"var": "showsearch"
		,"default":0
	},{
		"name":"Search result text"
		,"type": "text"
		,"info": "Text explaining to the visitors that their default search results are limited to the articles in this instance of the blog widget. Change if required."
		,"var": "limited_string"
		,"default":"You are viewing results from the blog only."
	},{
		"name":"Sidebar featured"
		,"type": "tick"
		,"var": "showfeatured"
		,"default":1
	},{
		"name":"Show image"
		,"type": "tick"
		,"var": "showimage"
		,"default":1
	},{
		"name":"Show summary"
		,"type": "tick"
		,"var": "showsummary"
		,"default":1
	},{
		"name":"Grid mode"
		,"type": "tick"
		,"var": "grid"
		,"default":0
	},{
		"name":"Show share links"
		,"type": "tick"
		,"var": "showshare"
		,"default":1
	},{
		"name":"Show categories in sidebar"
		,"type": "tick"
		,"var": "showcats"
		,"default":1
	},{
		"name":"Show tag cloud in sidebar"
		,"type": "tick"
		,"var": "showtags"
		,"default":1
	},{
		"name":"Hide future dated articles"
		,"type": "tick"
		,"var": "hidefuture"
		,"default":0
	},{
	     "name":"Date Format"
             ,"type":"text"
             ,"info":"Display format for dates"
             ,"var":"date_format"
             ,"design":"true"
             ,"default":"%A, %B %e, %Y"
	},{
		"name":"Share icons above conent"
		,"type": "tick"
		,"var": "share_above_content"
		,"default":1
		,"design":"true"
	},{
		"name":"Sidebar latest articles text"
		,"type": "text"
		,"info": "Enter the title to use for the Recent Articles sidebar section"
		,"var": "sidebar_recent_articles_text"
		,"default":"Recent Articles"
		,"design":"true"
	},{
		"name":"Sidebar featured articles text"
		,"type": "text"
		,"info":"Enter the title to use for the Featured Articles sidebar section"
		,"var": "sidebar_featured_articles_text"
		,"default":"Featured Articles"
		,"design":"true"
	},{
		"name":"Sidebar categories text"
		,"type": "text"
		,"info":"Enter the title to use for the Categories sidebar section"
		,"var": "sidebar_categories_text"
		,"default":"Categories"
		,"design":"true"
	},{
		"name":"Sidebar tag cloud text"
		,"type": "text"
		,"info":"Enter the title to use for the Tag Cloud sidebar section"
		,"var": "sidebar_tag_cloud_text"
		,"default":"Tag Cloud"
		,"design":"true"
	},{
		"name":"Read more text"
		,"type": "text"
		,"info":"Enter the text to use for the Read More button"
		,"var": "read_more_text"
		,"default":"Read more"
		,"design":"true"
	},{
		"name":"Pinned item image width"
		,"info":"Enter a pixel width for featured article images. Enter dimensions twice the display size for retina quality."
		,"type": "text"
		,"var": "featured_image_width"
		,"default":"300"
		,"design":"true"
	},{
		"name":"Pinned item image height"
		,"type": "text"
		,"info":"Enter a pixel height for featured article images. Enter dimensions twice the display size for retina quality."
		,"var": "featured_image_height"
		,"default":"250"
		,"design":"true"
	},{
		"name":"Main index image width"
		,"type": "text"
		,"info":"Enter a pixel width for main index item images. Enter dimensions twice the display size for retina quality."
		,"var": "main_image_width"
		,"default":"400"
		,"design":"true"
	},{
		"name":"Main index image height"
		,"type": "text"
		,"info":"Enter a pixel height for main index item images. Enter dimensions twice the display size for retina quality."
		,"var": "main_image_height"
		,"default":"300"
		,"design":"true"
	},{
		"name":"Main index image width (grid)"
		,"type": "text"
		,"info":"Enter a pixel width for main index item images when using grid mode. Enter dimensions twice the display size for retina quality."
		,"var": "main_image_width_grid"
		,"default":"450"
		,"design":"true"
	},{
		"name":"Main index image height (grid)"
		,"info":"Enter a pixel height for main index item images with using grid mode. Enter dimensions twice the display size for retina quality."
		,"type": "text"
		,"var": "main_image_height_grid"
		,"default":"300"
		,"design":"true"
	},{
		"name":"Sidebar image width"
		,"info":"Enter a pixel width for sidebar item images. Enter dimensions twice the display size for retina quality."
		,"type": "text"
		,"var": "sidebar_image_width"
		,"default":"400"
		,"design":"true"
	},{
		"name":"Sidebar image height"
		,"info":"Enter a pixel width for sidebar item images. Enter dimensions twice the display size for retina quality."
		,"type": "text"
		,"var": "sidebar_image_height"
		,"default":"300"
		,"design":"true"
	},{
		"name":"Force index page"
		,"info":"In some situations the pages widget won't generate the full page address. If this happens you can enter the first part of the page addresses here."
		,"type": "text"
		,"default":""
		,"var": "index"
		,"design":"true"
	}],
	"inner_templates":{
		"bloginner": {
			"name":"Blog article",
			"add_title":"Add new blog article",
			"add_info":"Enter a name for your blog article. This will be used as the visible title.",
			"template_sections":[
				["","Article content","1"],
				["Poster_Image","Preview Image","0"],
				["Sidebar_Content","Sidebar content","0"]
			],
			"meta_data":[
				{
					"name":"Author"
					,"info":"Enter a name for the author of this blog article."
					,"type":"text"
					,"var":"author"
				},{
					"name":"Published date"
					,"info":"Enter the date that this article should show. More recent dates will bring posts to the top of the page. Ensure the date is in this format: YYYY-MM-DD HH:MM"
					,"type":"date"
					,"var":"date"
				}
				,{
					"name":"Belongs to blog"
					,"type":"tagchooser"
					,"onlyshow":"tagids"
				}
				,{
					"name":"Sidebar categories"
					,"type":"tagchooser"
					,"onlyshow":"publiccats"
				}
				,{
					"name":"Sidebar lables"
					,"type":"tagchooser_withquickadd"
					,"onlyshow":"publictags"
				}
			],
			"child_data":{
				"blogcomment":{
					"approved":{"type":"tick","label":"Approved"},
					"name":{"type":"text","label":"Name"},
					"email":{"type":"text","label":"Email"},
					"website":{"type":"text","label":"Website"},
					"message":{"type":"text","label":"Comment"}
				}
			}
		}
	}
}
@@@ *}
{* Logic *}
{tags assign=cats langs=$langs assign_flat=flat_cats only_include_in_flat=$metadata.publiccats}
{tags assign=publictags langs=$langs assign_flat=flat_publictags only_include_in_flat=$metadata.publictags}
{if $metadata.hidefuture}
{assign var=onlyhistorical value=true}
{else}
{assign var=onlyhistorical value=false}
{/if}
{if $vars[0]} {* If showing single article *}
	{page_by_slug slug=$vars[0] assign=page thispage=$content.id}
	{assign var=singlepage value=true}
	{if $smarty.post.addcomment && $smarty.post.data.message!=""}
		{if $metadata.commentsapproval}
		{assign var=approved value=0}
		{else}
		{assign var=approved value=1}
		{/if}
		{add_page_child_data
			pageid=$page.id 
			userid=$content.logged_in_user.id 
			data=$smarty.post.data 
			more_data_approved=$approved
			show_in_activity=1
			activity_name="Blog comment"
			type="blogcomment"}
		{if $child_data_exists}
			{redirect location="?exists=1"}
		{/if}
		{if $child_data_added}
			{redirect location="?added=1"}
		{/if}
	{/if}
{else}

	{if !$smarty.request.start}
	{assign var=start value=0}
	{else}
	{assign var=start value=$smarty.request.start}
	{/if}
	{if $smarty.get.category}

		{if $smarty.get.astag}

		{foreach from=$flat_publictags item=tag}
			{if $tag.name|css_safe==$smarty.get.category} 
				{assign var=cattag value=$tag.id}
			{/if}
		{/foreach}
		{else}

		{foreach from=$flat_cats item=tag}
			{if $tag.name|css_safe==$smarty.get.category} 
				{assign var=cattag value=$tag.id}
			{/if}
		{/foreach}

		{/if}

		{pages_by_tag tags=$metadata.tagids additionaltags=$cattag omit=$metadata.pinnedtagids assign=pages sortbymeta=date onlyhistorical=$onlyhistorical}
		{assign var=totalpages value=$pages|@count}
		{pages_by_tag tags=$metadata.tagids additionaltags=$cattag omit=$metadata.pinnedtagids assign=pages sortbymeta=date onlyhistorical=$onlyhistorical start=$start limit=20}
	{else}
		
		{pages_by_tag tags=$metadata.tagids omit=$metadata.pinnedtagids assign=pages sortbymeta=date onlyhistorical=$onlyhistorical}
		{assign var=totalpages value=$pages|@count}
		{pages_by_tag tags=$metadata.tagids omit=$metadata.pinnedtagids assign=pages sortbymeta=date onlyhistorical=$onlyhistorical start=$start limit=20}
	{/if}


{/if}

{if $metadata.showfeatured && $metadata.pinnedtagids!=""}
{pages_by_tag tags=$metadata.tagids additionaltags=$metadata.pinnedtagids assign=featured sortbymeta=date onlyhistorical=$onlyhistorical}
{if $metadata.showrecents}
{pages_by_tag tags=$metadata.tagids assign=recents omit=$metadata.pinnedtagids sortbymeta=date limit=$metadata.toshow onlyhistorical=$onlyhistorical}
{/if}
{else}
{if $metadata.showrecents}
{pages_by_tag tags=$metadata.tagids assign=recents sortbymeta=date limit=$metadata.toshow onlyhistorical=$onlyhistorical}
{/if}
{/if}


{* Display *}
{if $smarty.get.app}
	{if $singlepage}

	{else}
		{if $featured}
		{$featured|@json_encode}
		{/if}
		{if $pages}
		{$pages|@json_encode}
		{/if}
	{/if}
{else}
<div class="{if $singlepage}displaying-blog-article{else}displaying-blog-index{/if} {if $metadata.grid}blog_grid{/if}">
{if !$singlepage}
{$editable.above_index}
{/if}
{if $singlepage || $metadata.publiccats || $metadata.showsearch}
	{if $metadata.separatecats}
	<div class="content-block-with-sidebar">
	{/if}
	{if 
	$metadata.showsearch||
	($metadata.showfeatured && $metadata.pinnedtagids)||
	($singlepage&&$metadata.showrecents)||
	($metadata.publiccats&&!$metadata.separatecats&&$metadata.showcats)||
	($metadata.publictags&&$metadata.showtags)
	}
	<div class="column_row">
<div class='column thirdsCol last reverse-col'>
	{if $metadata.showsearch}
		<div class="styleBox">
		<form action="/actions/SearchForward/" method="post">
			<input type="hidden" name="language" value="{$content.language}"/>
			<input type="hidden" name="limittext" value="{$metadata.limited_string}"/>
			<input type="hidden" name="limittags" value="{$metadata.tagids}"/>
			<input type="text" name="string" value="" maxlength="60" title="{$langs.Search}" id="pagesearch" placeholder="{$langs.Search}"/>
			<p class="submit_form Button_Medium"><a href="#">{$langs.Search}</a></p>
		</form>
		</div>
	{/if}
	{if $metadata.showfeatured && $metadata.pinnedtagids!=""}
	<h4>{$metadata.sidebar_featured_articles_text}</h4>
	{foreach from=$featured item=recentpage key=key name=loop1}

	<div class="styleBox blog-recent-item clearfix align-image-text
	">
		{if $metadata.showimage && $recentpage.pic_url!=""}<div class="bpe_image Left_Image"><a href="{$recentpage.url_str_full}"><img src='{if $recentpage.pic_url!=""&& $recentpage.pic_url!="/images"}{$recentpage.pic_url}{if $recentpage.pic_url|starts_with:"/images"}?width={$metadata.sidebar_image_width}&height={$metadata.sidebar_image_height}{/if}{else}{if $theme_vars_placeholder_image}/images/themegraphics/{$theme_vars_placeholder_image}?width={$metadata.sidebar_image_width}&height={$metadata.sidebar_image_height}&shrink=false{/if}{/if}' width="150"/></a></div>{/if}
		<h4><a href="{$recentpage.url_str_full}">{$recentpage.pagetitle}</a></h4>
	</div>

	{/foreach}
	{/if}
	{if $metadata.publiccats&&!$metadata.separatecats&&$metadata.showcats}
	<h4>{$metadata.sidebar_categories_text}</h4>
	<ul class="blog-categories">
	{foreach from=$flat_cats item=tag}
		<li class="blog-category-{$tag.name|css_safe}"><a href="{$content.fullUrl}?category={$tag.name|css_safe}">{$tag.name}</a></li>
	{/foreach}
	</ul>
	{/if}
	{if $metadata.publictags&&$metadata.showtags}
	<h4>{$metadata.sidebar_tag_cloud_text}</h4>
	<ul class='blog-tag-cloud'>
	{foreach from=$flat_publictags item=tag}
		<li><a href="{$content.fullUrl}?category={$tag.name|css_safe}&astag=true">{$tag.name}</a></li>
	{/foreach}
	</ul>
	{/if}
	{if $singlepage}
		{if $metadata.showrecents}
		<h4>{$metadata.sidebar_recent_articles_text}</h4>
		{foreach from=$recents item=recentpage key=key name=loop1}

		<div class="styleBox blog-recent-item clearfix align-image-text

		{foreach from=$recentpage.tags_array item=tag name=loop1}
		tag-{$tag|css_safe}
		{/foreach}
		"
		>
			{if $metadata.showimage && $recentpage.pic_url!=""&&$recentpage.pic_url!="/images"}<div class="bpe_image Left_Image"><a href="{$metadata.index}{$recentpage.url_str_full}"><img src='{$recentpage.pic_url}{if $recentpage.pic_url|starts_with:"/images"}?width={$metadata.sidebar_image_width}&height={$metadata.sidebar_image_height}&shrink=false{/if}' width="150"/></a></div>{/if}
			<h4><a href="{$metadata.index}{$recentpage.url_str_full}">{$recentpage.pagetitle}</a></h4>
		    <p class="mini-blog-feed-date"><a href="{$metadata.index}{$recentpage.url_str_full}"><span class="recent-blog-date">{$recentpage.meta.date|date_format:$metadata.date_format}</span></a></p>
		</div>

		{/foreach}
		{/if}
	{/if}

	{$editable.sidebar_content}

	{if $vars[0]}
		{$page.contentSplit.Sidebar_Content}
	{/if}
</div>
	<div class='column twoThirds first reverse-column '>
	{/if}
{/if}
	{if $singlepage}
		{if $onlyhistorical && $page.meta.date|strtotime < $smarty.now || !$onlyhistorical}
		<h1>{$page.title}</h1>
		{foreach from=$page.tags item=tag name=loop1}
		{foreach from=$flat_publictags item=all name=loop2}
		{if $all.id==$tag}
		{assign var=hastags value=true}
		{/if}
		{/foreach}
		{/foreach}
		{if $page.meta.author}
                <p class="blog-author">{$page.meta.author}</p>
                  {/if}
		<p class="blog-categories">
		{foreach from=$page.tags item=tag name=loop1}
		{foreach from=$flat_cats item=all name=loop2}
		{if $all.id==$tag}
		<a href="{$content.fullUrl}?category={$all.name|css_safe}" class="blog-categories-{$all.name|css_safe}">{$all.name}</a>
		{/if}
		{/foreach}
		{/foreach}
		</p>
		{if $hastags}
		<p class="blog-tags">
		{foreach from=$page.tags item=tag name=loop1}
		{foreach from=$flat_publictags item=all name=loop2}
		{if $all.id==$tag}
		<a href="{$content.fullUrl}?category={$all.name|css_safe}&astag=true" class="blog-tags-{$all.name|css_safe}">{$all.name}</a>
		{/if}
		{/foreach}
		{/foreach}
		</p>
		{/if}
		{if !$metadata.share_above_content}
		{$page.contentSplit.normal}
		{/if}
		{if $metadata.showshare}
		<p class="share-links styleBox clearfix social-links size-large style-icons align-clearfix">
		<span class="social-link social-links-intro">Share this page:</span>
			<a rel="nofollow" href="https://www.facebook.com/sharer/sharer.php?u={$content.protocol|urlencode}{$content.http_host|urlencode}{$content.fullUrl|urlencode}{$page.url|urlencode}%2F" title="Share this page on Facebook (Opens new window)" class="social-link-facebook social-link" target="_blank">Facebook</a>
			<a rel="nofollow" href="https://www.linkedin.com/shareArticle?mini=true&url={$content.protocol|urlencode}{$content.http_host|urlencode}{$content.fullUrl|urlencode}{$page.url|urlencode}%2F&title={$page.title|urlencode}&summary=&source=" title="Share this page on LinkedIn (Opens new window)" class="social-link-linkedin social-link" target="_blank">LinkedIn</a>
			{if $page.imgUrl!=""}
			<a rel="nofollow" href="https://pinterest.com/pin/create/button/?url={$content.protocol|urlencode}{$content.http_host|urlencode}{$content.fullUrl|urlencode}{$page.url|urlencode}%2F&media={$content.protocol|urlencode}{$content.http_host|urlencode}{$page.imgUrl}&description=" title="Share this page Pinterest (Opens new window)" class="social-link-pinterest social-link" target="_blank">Pinterest</a>
			{/if}
			<a rel="nofollow" href="https://twitter.com/intent/tweet?text={$content.protocol|urlencode}{$content.http_host|urlencode}{$content.fullUrl|urlencode}{$page.url|urlencode}%2F" title="Share this page on Twitter (Opens new window)" class="social-link-twitter social-link" target="_blank">Twitter</a>
		</p>
		{/if}
		{if $metadata.share_above_content}
		{$page.contentSplit.normal}
		{/if}
		&nbsp;
		{foreach from=$page.page_child_data.blogattachments item=item key=key name=loop1}
			
			<div class="blog-attachment">
				{if $item.values.ext=="jpeg"||$item.values.ext=="jpg"||$item.values.ext=="png"||$item.values.ext=="gif"}
				<p class="Popup_Link"><a href="/images/{$item.values.filename}"><img src="/images/{$item.values.filename}?width=150&height=150"/></a></p>
				{else}

				<p class="Button_Small"><a href="/downloads/{$item.values.filename}">{$item.values.filename}</a></p>
				{/if}
			</div>

		{/foreach}
		{if $metadata.enablecomments}

		{foreach from=$page.page_child_data.blogcomment item=item key=key name=loop1}
			{if $item.values.approved}
			<div class="blog-comment styleBox">
				<p>
					<span class="blog-comment-author">
					{if $item.owner.avatar!=""}<img src="/images/{$item.owner.avatar}?width=100&height=100&shrink=false" alt="{$item.owner.name}" class="avatar"/>{/if}
					<strong>
						{if $item.owner.id==0}{$item.values.name}{else}{$item.owner.name}{/if}
					</strong></span> 
					{$item.values.message}
					<span class="blog-comment-date">{$item.created|date_format:$metadata.date_format}</span>
				</p>
				{*{if $item.owner==$content.logged_in_user.id}
				Edit
				{/if}*}
			</div>
			{/if}
		{/foreach}
		<div class="clear"></div>
		<h4> {$langs.Add_Comment}</h4>
		{if $smarty.get.exists}
		<p class="Icon_Alert">You’ve already added this comment.</p>
		{/if}
		{if $smarty.get.added}
		<p class="Icon_Tick">You’ve successfully added this comment. {if $metadata.commentsapproval==1}Your comment will be published here if approved.{/if}</p>		
		{/if}
		<div class="styleBox">
		<form action="" method="post" class="blog-comment-form">
			<input type="hidden" name="addcomment" value="1" />
			<label for="email1" class="fakeemail">Are you human?<br/>
			Leave this empty if you are a human. This is to prevent spam.
			</label>
			<input type="text" maxlength="256" id="email1" name="email1" value="" class="email1 input"/>
			{if $content.logged_in_user.id==""}
				<div class="input-wrapper input-wrapper-width-50 input-wrapper-type-name input-wrapper-required" >
					<label class="label_Your_name " for="blog_com_name">Your name:</label>
					<input id="blog_com_name" type="text" maxlength="256" title="Your name:" name="data[name]" class="input required" value=""/>
				</div>

				<div class="input-wrapper input-wrapper-width-50 input-wrapper-type-name input-wrapper-required" >
					<label class="label_Email " for="blog_com_email">Email:</label>
					<input id="blog_com_email" type="text" maxlength="256" title="Email:" name="data[email]" class="input required" value=""/>
				</div>
			{if $metadata.enablewebsite}
				<div class="input-wrapper input-wrapper-width-100 input-wrapper-type-name input-wrapper-required" >
					<label class="label_Website " for="blog_com_email">Website:</label>
					<input id="blog_com_website" type="text" maxlength="256" title="Email:" name="data[website]" class="input required" value=""/>
				</div>
			{/if}
				<div class="input-wrapper input-wrapper-width-100 input-wrapper-type-short input-wrapper-required" >
					<label class="label_Message" for="blog_com_message">Message:</label>
					<textarea id="blog_com_message" type="text" name="data[message]" class="input required"></textarea>
				</div>
			{else}
			
			<div class="input-wrapper input-wrapper-width-100 input-wrapper-type-short input-wrapper-required" >
				<label class="label_Message" for="blog_com_message">Comment as {$content.logged_in_user.name}:</label>
				<textarea id="blog_com_message" type="text" name="data[message]" class="input required"></textarea>
			</div>
			{/if}
			
			
			<div class="clear"></div>

			<p class="Icon_Alert cf_contains_errors" >* Please fill out all required fields</p>

			<p class="button submit_form hide_if_no_js">
			<a href="#" class=''>Add Comment</a>
			</p>

			<input type="submit" value="Submit" class="contact-form-hide-with-js"/>

		</form>
		</div>
		{/if}
		{/if}
	{else}
	
		{if $smarty.get.category}
			{if $smarty.get.astag}
				{foreach from=$flat_publictags item=tag}
					{if $tag.name|css_safe==$smarty.get.category} 
						<p class="Icon_Info">You are browsing by <strong>{$tag.name}</strong></p>
					{/if}
				{/foreach}
			{else}
				{foreach from=$flat_cats item=tag}
					{if $tag.name|css_safe==$smarty.get.category} 
						<p class="Icon_Info">You are browsing by <strong>{$tag.name}</strong></p>
					{/if}
				{/foreach}
			{/if}
		{/if}
	

		{foreach from=$featured item=featuredpage}
		<div class="carousel_slide carousel_slide_autoscroll">
			<div class="styleBox blog-recent-item clearfix align-image-text">
				{if $metadata.showimage}{if $featuredpage.pic_url!=""}<div class="bpe_image Left_Image"><a href="{$featuredpage.url_str}/"><img src='{$featuredpage.pic_url}{if $featuredpage.pic_url|starts_with:"/images"}?width={$metadata.featured_image_width}&height={$metadata.featured_image_height}{/if}' width="150"/></a></div>{else}{if $theme_vars_placeholder_image}<div class="bpe_image Left_Image"><a href="{$featuredpage.url_str_full}/"><img src='/images/themegraphics/{$theme_vars_placeholder_image}?width={$metadata.featured_image_width}&height={$metadata.featured_image_height}' width="150"/></a></div>{/if}{/if}{/if}
				<h4><a href="{$featuredpage.url_str}">{$featuredpage.pagetitle}</a></h4>
				{if $metadata.showsummary && $featuredpage.meta.ss_page_desc!=""}<p>{$featuredpage.meta.ss_page_desc}</p>{/if}
			</div>
		</div>
		{/foreach}
		<div class="magic-heights-wrap clearfix">
		{foreach from=$pages item=page name=loop}
			<div class="blog-article clearfix styleBox magic-heights {if $smarty.foreach.loop.iteration % 2 == 1}odd{/if} {if $smarty.foreach.loop.iteration % 3 == 2}middle-of-three{/if}

				{foreach from=$page.tags_array item=tag name=loop1}
				{foreach from=$flat_cats item=all name=loop2}
				{if $all.id==$tag}
				in-blog-category-{$all.name|css_safe}
				{/if}
				{/foreach}
				{/foreach}
			"> 
				<div class="blog-title-and-date">
					{if $metadata.showimage}
					<div class="blog-index-image">
						{if $page.pic_url!="" && $page.pic_url!="/images"}
						<div class="magic-heights-inner-2 bpe_image"><a href="{$page.url_str}/"><img src='{$page.pic_url}{if $page.pic_url|starts_with:"/images"}?width={if $metadata.grid}{$metadata.main_image_width_grid}&height={$metadata.main_image_height_grid}{else}{$metadata.main_image_width}&height={$metadata.main_image_height}{/if}&shrink=false{/if}' class="blogBanner"/></a></div>
						{else}
						{if $theme_vars_placeholder_image}
						<div class="bpe_image magic-heights-inner-2"><a href="{$page.url_str}/"><img src='/images/themegraphics/{$theme_vars_placeholder_image}?width={if $metadata.grid}{$metadata.main_image_width_grid}&height={$metadata.main_image_height_grid}{else}{$metadata.main_image_width}&height={$metadata.main_image_height}{/if}&shrink=false' class="blogBanner"/></a></div>
						{/if}
						{/if}
					</div>
					<div class="blog-index-with-image">
					{else}
						{if $metadata.grid}<a href="{$page.url_str_full}" style="display:block;line-height:0;" class="placeholderimage"><img src="/graphics/x.gif" width="450" height="450" class="blogBanner" alt="{$page.title}"/></a>{/if}
					{/if}
					<div class="magic-heights-inner">
					<h4 class="blogTitle"><a href="{$page.url_str}/">{$page.pagetitle}</a></h4>
					
					<p class="blog-date">
						{$page.meta.date|date_format:$metadata.date_format}
					</p>
					{if $metadata.showsummary && $page.meta.ss_page_desc!=""}<p class="blog-desc">{$page.meta.ss_page_desc}</p>{/if}
					</div>
					<p class="blog-read-more"><a href="{$page.url_str}/">{$metadata.read_more_text}</a></p>
					{if $metadata.showimage}
					</div>
					{/if}
				</div>
			</div>
		{/foreach}
		</div>
		{if $start + 20 < $totalpages||$start>0}
		<p class="blog-pages clearfix">
		{if $start + 20 < $totalpages}
		<a class="blog-pages-next" href="?start={$start+20}{if $smarty.get.category}&category={$smarty.get.category}{/if}{if $smarty.get.astag}&astag=true{/if}">Next</a>
		{/if}
		{if $start>0}
		<a class="blog-pages-prev" href="?start={$start-20}{if $smarty.get.category}&category={$smarty.get.category}{/if}{if $smarty.get.astag}&astag=true{/if}">Prev</a>
		{/if}
		</p>
		{/if}

	{/if}
{if $singlepage || $metadata.publiccats || $metadata.showsearh}
	{if 
	$metadata.showsearch||
	($singlepage&&$metadata.showrecents)||
	($metadata.showfeatured && $metadata.pinnedtagids)||
	($metadata.publiccats&&!$metadata.separatecats&&$metadata.showcats)||
	($metadata.publictags&&$metadata.showtags)
	}
</div>
</div>
{/if}
{/if}
{if $metadata.separatecats && $metadata.publiccats}
</div>
<nav id="sidebarNav">
<div id="sidebarInner">
	<h4><a href="{$content.fullUrl}">{$metadata.sidebar_categories_text}</a></h4>
	<ul class="blog-categories">
	{foreach from=$flat_cats item=tag}
		<li class="blog-category-{$tag.name|css_safe} 
		{if $tag.name|css_safe==$smarty.get.category}current{/if}"
		><a href="{$content.fullUrl}?category={$tag.name|css_safe}">{$tag.name}</a></li>
	{/foreach}
	</ul>
	</div>
</div>
</nav>
{/if}
</div>
<script type="text/javascript">
	{literal}
	$(document).ready(function(){
		if ($(".blog-comment-form").length>0) {
			$(".email1").css({
				"position":"absolute"
				,"top":"-4000px"
				,"left":"-1000px"
			});
			$(".fakeemail").hide();
		}
	});
	{/literal}
</script>
<style type="text/css" media="screen">
	{literal}
	.blog-comment-date {
		display:block;
		font-size:75%;
	}
	
	{/literal}
</style>
{/if}
