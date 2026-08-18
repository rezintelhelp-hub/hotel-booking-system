{* @@@
{
	"widget_info":{
		"title":"Shop"
		,"title_info":"Enter a name for this instance of the Shop widget. This is just used for reference."
		,"category":"setup"
		,"include_js":"owl.carousel.min.js,zoom.js"
	},
	"meta_data":[{
		"name":"Tag"
		,"type": "pagetagmulti"
		,"var": "tagids"
		,"notes":"Important: Each widget template that exposes 'inner_templates' must have its primary listing tag set with the var name of tagids - this is so the system can find the full URLs for each inner page."
	},{
		"name":"Quick-add tag"
		,"info":"Enter the name for this tag. This tag will be created and set for the Tag item above. All pages with this tag will be treated as product pages for this instace of the Shop widget."
		,"type": "quickaddtag"
		,"destvar": "tagids"
		,"needsparent": "false"
		,"onlyone":"true"
	},{
		"name":"Categories"
		,"type": "pagetagmulti"
		,"var": "publiccats"
	},{
		"name":"Quick-add category tag"
		,"info":"Enter the name for this tag. This tag will be created and set as a Cateogory for this instance of the Shop. Users working with shop pages in the CMS will be able to choose from any 'Category' tag added here."
		,"type": "quickaddtag"
		,"destvar": "publiccats"
		,"needsparent": "true"
		,"parent_tag_append": "sidebar categories"
		,"onlyone":"false"
	},{
		"name":"Related products tags"
		,"type": "pagetagmulti"
		,"var": "related"
	},{
		"name":"Quick-add related products tag"
		,"type": "quickaddtag"
		,"info":"Enter the name for this tag. This tag will be created and set as a 'related product tag' for this instance of the Shop. Users working with product pages in the CMS will be able to choose from any 'related product tag' tag added here."
		,"destvar": "related"
		,"needsparent": "true"
		,"parent_tag_append": "product tags"
		,"onlyone":"false"
	},{
		"name":"Read more text"
		,"type": "text"
		,"info":"Enter the text to use for the Read More button"
		,"var": "read_more_text"
		,"default":"Read more"
		,"design":"true"
	},{
		"name":"Show products as category preview"
		,"type": "tick"
		,"var": "showcatsaspreview"
		,"default":0
	},{
		"name":"Show categories heading"
		,"type": "tick"
		,"var": "show_categories_heading"
		,"default":1
	},{
		"name":"Sidebar categories text"
		,"type": "text"
		,"info":"Enter the title to use for the Categories sidebar section"
		,"var": "sidebar_categories_text"
		,"default":"Categories"
		,"design":"true"
	},{
		"name":"Show search"
		,"type": "tick"
		,"var": "showsearch"
		,"default":0
	},{
		"name":"Show image"
		,"type": "tick"
		,"var": "showimage"
		,"default":1
	},{
		"name":"Search result text"
		,"type": "text"
		,"info": "Text explaining the visitors that their default search results are limited to the articles in this instance of the shop widget. Change if required."
		,"var": "limited_string"
		,"default":"You are viewing results from the shop only."
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
		"name":"Hide future dated products"
		,"type": "tick"
		,"var": "hidefuture"
		,"default":0
	},{
		"name":"Enable reviews"
		,"type": "tick"
		,"var": "showreviews"
		,"default":1
	},{
		"name":"Reviews require approval"
		,"type": "tick"
		,"var": "reviewapproval"
		,"default":1
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
		"name":"Force index page"
		,"info":"In some situations the pages widget won't generate the full page address. If this happens you can enter the first part of the page addresses here."
		,"type": "text"
		,"default":""
		,"var": "index"
		,"design":"true"
	}],
	"inner_templates":{
		"autoshop": {
			"name":"Product page",
			"add_title":"Add new product page",
			"add_info":"Enter a name for your product page.",
			"template_sections":[
				["","Description","1"],
				["Poster_Image","Preview Image","0"]
			],
			"meta_data":[
				{
					"name":"Description"
					,"info":"Enter your product description here"
					,"type":"text"
					,"var":"description"
				},{
					"name":"Created date"
					,"info":"Enter the date that this product was added. Ensure the date is in this format: YYYY-MM-DD HH:MM"
					,"type":"date"
					,"var":"date"
				},{
					"name":"Belongs to shop"
					,"type":"tagchooser"
					,"onlyshow":"tagids"
				},{
					"name":"Categories"
					,"type":"tagchooser"
					,"onlyshow":"publiccats"
				},{
					"name":"Related product tags"
					,"type":"tagchooser_withquickadd"
					,"onlyshow":"related"
				},{
					"name":"Gallery"
					,"type":"imagetagchooser_withquickadd"
					,"var":"gallerytags"
				},{
					"name":"Files"
					,"type":"filetagchooser_withquickadd"
					,"var":"filestags"
				},{
					"name":"Stock"
					,"info":"Enter your product's stock here"
					,"type":"text"
					,"var":"stock"
				},{
					"name":"Code"
					,"info":"Enter a unique code for the product"
					,"type":"text"
					,"var":"code"
				},{
					"name":"Variant"
					,"info":"Enter a variant to show with this product."
					,"type":"text"
					,"var":"variant"
				},{
					"name":"Unavailable"
					,"type": "tick"
					,"var": "unavailable"
					,"default":"0"
				},{
					"name":"Unavailable Message"
					,"type": "text"
					,"info":"Ente text to show when unavailable"
					,"var": "unavailable_msg"
					,"default":""
				},{
					"name":"Price"
					,"info":"Enter your product's price here"
					,"type":"text"
					,"var":"price"
				},{
					"name":"Options"
					,"info":"Enter comma separated list of options and prices here. If this is populated the normal Price value is ignored. Format like this: Small:9.99,Medium:15.99,Large:19.99"
					,"type":"text"
					,"var":"variants"
				},{
					"name":"Limit to x in basket"
					,"info":"Enter a number to limit the basket quantity to. Enter 0 for no limit."
					,"type":"text"
					,"var":"onlyone"
					,"default":"0"
				},{
					"name":"Original Price"
					,"info":"Enter your product's original price here. If you leave this as 0 only one price will show on the site."
					,"type":"text"
					,"var":"orig_price"
				}
			],
			"child_data":{
				"review":{
					"approved":{"type":"tick","label":"Approved"},
					"name":{"type":"text","label":"Name"},
					"email":{"type":"text","label":"Email"},
					"review":{"type":"text","label":"Review"}
				}
			}
		}
	}
}
@@@ *}
{* Logic *}
{tags assign=cats langs=$langs assign_flat=flat_cats only_include_in_flat=$metadata.publiccats}
{if $vars[0]} {* If showing single article *}
	{page_by_slug slug=$vars[0] assign=page thispage=$content.id}
	{assign var=singlepage value=true}
	{if $smarty.post.addreview && $smarty.post.data.review!=""}
		{if $metadata.reviewapproval}
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
			activity_name="Product review"
			type="review"}
		{if $child_data_exists}
			{redirect location="?exists=1"}
		{/if}
		{if $child_data_added}
			{redirect location="?added=1"}
		{/if}
	{/if}
{else}

	{if $metadata.hidefuture}
	{assign var=onlyhistorical value=true}
	{else}
	{assign var=onlyhistorical value=false}
	{/if}
	{if !$smarty.request.start}
	{assign var=start value=0}
	{else}
	{assign var=start value=$smarty.request.start}
	{/if}
	{if $smarty.get.category}

		{foreach from=$flat_cats item=tag}
			{if $tag.name|css_safe==$smarty.get.category} 
				{assign var=cattag value=$tag.id}
			{/if}
		{/foreach}
		{assign var="publiccats" value=","|explode:$metadata.publiccats}
		{foreach from=$cats item=test}
			{foreach from=$test.children item=test}
				{if $test.id|in_array:$publiccats&&$smarty.request.category==$test.name|css_safe}
				{foreach from=$test.children item=test}
					{if $test.id|in_array:$publiccats}
					{$subcats[] = $test}
					{/if}
				{/foreach}
				{/if}
			{/foreach}
		{/foreach}
		{pages_by_tag tags=$metadata.tagids additionaltags=$cattag omit=$metadata.pinnedtagids assign=pages onlyhistorical=$onlyhistorical}
		{assign var=totalpages value=$pages|@count}
		{pages_by_tag tags=$metadata.tagids additionaltags=$cattag omit=$metadata.pinnedtagids assign=pages onlyhistorical=$onlyhistorical start=$start limit=20}
	{else}

		{assign var="publiccats" value=","|explode:$metadata.publiccats}
		{foreach from=$cats item=test}
			{foreach from=$test.children item=test}
				{if $test.id|in_array:$publiccats}
				{$subcats[] = $test}
				{/if}
			{/foreach}
		{/foreach}
		{pages_by_tag tags=$metadata.tagids omit=$metadata.pinnedtagids assign=pages onlyhistorical=$onlyhistorical}
		{assign var=totalpages value=$pages|@count}
		{pages_by_tag tags=$metadata.tagids omit=$metadata.pinnedtagids assign=pages onlyhistorical=$onlyhistorical start=$start limit=20}
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
<div class="shop {if $singlepage}displaying-shop-product{else}displaying-shop-product{/if} {if $metadata.grid}shop_grid{/if}">
	<p class="Button_Medium Align_Center showcats"><a href="#">Show {$metadata.sidebar_categories_text}</a></p>
	<nav id="sidebarNav">
	<div id="sidebarInner">
		{if $metadata.showsearch}
			<form action="/actions/SearchForward/" method="post" class="sidebar-shop-search">
				<input type="hidden" name="language" value="{$content.language}"/>
				<input type="hidden" name="limittext" value="{$metadata.limited_string}"/>
				<input type="hidden" name="limittags" value="{$metadata.tagids}"/>
				<input type="text" name="string" value="" maxlength="60" title="{$langs.Search}" id="pagesearch" placeholder="{$langs.Search}"/>
				<p class="submit_form Button_Medium"><a href="#">{$langs.Search}</a></p>
			</form>
		{/if}
		{if $metadata.show_categories_heading}
		<h4><a href="{$content.fullUrl}">{$metadata.sidebar_categories_text}</a></h4>
		{/if}
		<ul class="shop-categories">
		{assign var="parent" value=""}
		{assign var="subs" value=""}
		{assign var="foundinstack" value=false}
		{assign var="foundinsubstack" value=false}
		{assign var="foundinsubsubstack" value=false}
		{assign var="wasin3" value=false}
		{assign var="outputall" value=true}
		{foreach from=$flat_cats item=tag}
			{if $tag.depth=="1"}
				{$parent}
				{assign var="parent" value=""}
				{if $outputall || $foundinstack || $foundinsubstack || $foundinsubsubstack}
					{$subs}
				{/if}
				{if $wasin3&&($foundinsubsubstack||$justfoundsubparent)}
					{assign var="justfoundsubparent" value=false}
					{$subsubs}
				{/if}
				{assign var="subsubs" value=""}
				{assign var="subs" value=""}
				{assign var="foundinstack" value=false}
				{assign var="foundinsubstack" value=false}
				{assign var="foundinsubsubstack" value=false}
			{/if}
			{capture assign="output"}
			<li class="depth-{$tag.depth} shop-category-{$tag.name|css_safe} 
			 {if $tag.name|css_safe==$smarty.get.category}
			 {if $tag.depth=="1"}{assign var="foundinstack" value=true}{/if}
			 {if $tag.depth=="2"}
				{assign var="foundinsubstack" value=true}
				{assign var="justfoundsubparent" value=$tag.name|css_safe}
			 {/if}
			 {if $tag.depth=="3"}{assign var="foundinsubsubstack" value=true}{/if}
			 current
			 {else}

			 {/if}
			"
			><a href="{$content.fullUrl}?category={$tag.name|css_safe}">{$tag.name}</a></li>
			{/capture}
			{if $tag.depth=="3"}
			{assign var="subsubs" value="`$subsubs``$output`"}
			{assign var="wasin3" value=true}
			{/if}
			{if $tag.depth=="2"}
				{if $wasin3&&($outputall||$foundinsubsubstack||($justfoundsubparent!=$tag.name|css_safe&&$justfoundsubparent))}
					{assign var="subs" value="`$subs``$subsubs`"}
					{assign var="subsubs" value=""}
					{assign var="foundinsubsubstack" value=false}
					{assign var="foundinsubstack" value=true}
				{/if}
			{/if}
			{if $tag.depth=="2"&&$justfoundsubparent!=$tag.name|css_safe&&$justfoundsubparent}
				{assign var="justfoundsubparent" value=false}
			{/if}
			{if $tag.depth=="2"||$tag.depth=="1"}
				{assign var="subsubs" value=""}
				{assign var="wasin3" value=false}
			{/if}
			{if $tag.depth=="2"}
				{assign var="subs" value="`$subs``$output`"}
			{/if}
			{if $tag.depth=="1"}
				{if $parent==""}
					{assign var="parent" value=$output}
				{/if}
			{/if}
		{/foreach}
		{$parent}
		{assign var="parent" value=""}
		{if $outputall || $foundinstack || $foundinsubstack || $foundinsubsubstack}
			{$subs}
		{/if}
		{if $wasin3&&($foundinsubsubstack||$justfoundsubparent)}
			{assign var="justfoundsubparent" value=false}
			{$subsubs}
		{/if}
		</ul>
		</div>
	</nav>
	<div class="content-block-with-sidebar">
	{if $singlepage}
		<h1>{$page.title}</h1>
		{if $page.meta.variant}
		<p class="shop-variant">{$page.meta.variant}</p>
		{/if}
		<p class="shop-categories">
		{assign var="cattags" value=""}
		{foreach from=$page.tags item=tag name=loop1}
		{foreach from=$flat_cats item=all name=loop2}
		{if $all.id==$tag}
		<a href="{$content.fullUrl}?category={$all.name|css_safe}"><span>{$all.name}</span></a>
		{if $cattags!=""}
		{assign var="cattags" value="`$cattags`,"}
		{/if}
		{assign var="cattags" value="`$cattags``$all.id`"}
		{/if}
		{/foreach}
		{/foreach}
		{assign var="relatedtags" value=$cattags}
		{foreach from=$page.tags item=tag name=loop1}
		{foreach from=","|explode:$metadata.related item=related name=loop2}
		{if $related==$tag&&$tag!=0}
		{if $relatedtags!=""}
		{assign var="relatedtags" value="`$relatedtags`,"}
		{/if}
		{assign var="relatedtags" value="`$relatedtags``$related`"}
		{/if}
		{/foreach}
		{/foreach}
		</p>
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


		<div class="column_row magic-heights-wrap">
		<div class='column twoThirds first magic-heights'>
			{storage_by_tag tags=$page.meta.gallerytags assign="images"}
			{if $images}

			<div class="withZoom galleryWithThumbs" id="galId{$page.id}gallery">
				<div class="enlarge">

				</div>
				<div class="owl-gallery-thumbs">
					{foreach from=$images item=item key=key name=loop1}
					{if !$pic}
					{assign var="pic" value="/images/galleries/`$item.filename`"}
					{/if}
						<a class="item {if $item.external}external_image{/if} galleryitem{$item.id}" href="{if $item.external}{$item.external_path}{else}/images/galleries/{$item.filename}?width=1000&amp;height={if $style=="thumbs_gallery_crop"||$style=="thumbs_gallery_landscape_crop"}700&shrink=false{else}auto{/if}{/if}">
						<img src="{if $item.external}{$item.external_path}{else}/images/galleries/{$item.filename}?width=220&amp;height={if $style=="thumbs_gallery_landscape"||$style=="thumbs_gallery_landscape_crop"}165{else}220{/if}&amp;shrink=false{/if}" alt="{$item.caption|htmlspecialchars}" />

						</a>
					{/foreach}
				</div>
			</div>
				{/if}
		</div>
		<div class='column thirdsCol last magic-heights'>
			{if $metadata.share_above_content}
			{$page.contentSplit.normal}
			{/if}
			{if $page.meta.description}
			<p>{$page.meta.description}</p>
			{/if}
			<div class="simpleProduct clearfix" data-datalayer-price="{$price}" data-datalayer-name="{$name}" data-datalayer-productid="{$code}">
				
				<div class="productInner">
				{if $page.meta.variants==''}
				<p class="stockAndPrice">
				<span class="price">{$content.currency_sym}{$page.meta.price}{if $checkout_tax && $add_tax && $indicate_net&&!$tax_exempt} <span class="salestax">+ {$sales_tax_name}</span>{/if}
				{if $theme_vars_show_oxipay_prices}
				<script id="oxipay-price-info" src="https://widgets.oxipay.co.nz/content/scripts/payments.js?productPrice={$price}"></script>
				{/if}
				</span> 
				{*
				{if !$digital}
				{if $in_stock<$hide_stock_threshold && $theme_vars_hide_stock_levels==0}
				<span class="stock {if $in_stock<$warning_stock_threshold}warning{/if}">{$langs.In_Stock}: <strong>{$in_stock}</strong></span>
				{/if}
				{/if}
				*}
				</p>
				{/if}
				{*
				{if $theme_vars_show_qty_inputs}
				<label class="label product-quantity-label"><span>{$langs.Quantity}: </span>
					<input type="text" maxlength="4" {if $only_sell_if_in_stock}data-max="{$in_stock}"{/if} title="{$langs.Quantity}" name="quantity" class="input product-quantity-input" value="1"/>
					<span class="product-quantity-plus">+</span>
					<span class="product-quantity-minus">-</span>
				</label>
				<div class="clear"></div>
				{/if}
				{if $only_sell_if_in_stock && $in_stock==0}
					{if $theme_vars_hide_stock_levels==1}
					<p class="Icon_Alert">{if $sold_out_message==""}{$langs.Currently_Unavailable}{else}{$sold_out_message}{/if}</p>
					{/if}
				{else}
				*}
					{if !$page.meta.unavailable}
					<form action="" method="post">
					<input type="hidden" name="addtobasket" value="true"/>
					<input type="hidden" name="nocache" value="1"/>
					{if $page.meta.variants!=''}
					<select name="variant">
					{assign var="variants" value=","|explode:$page.meta.variants}
					{foreach key=key from=$variants item=variant}
					{assign var="variantname" value=":"|explode:$variant}
					<option value="{$key}">{$variantname[0]} ({$content.currency_sym}{$variantname[1]|number_format:2})</option>
					{/foreach}
					</select>
					{/if}
					<label class="label product-quantity-label"><span>{$langs.Quantity}: </span>
						<input type="text" maxlength="4" title="{$langs.Quantity}" name="quantity" class="input product-quantity-input" value="1"/>
						<span class="product-quantity-plus">+</span>
						<span class="product-quantity-minus">-</span>
					</label>
					<div class="clear"></div>
					<p class="Button_Medium submit_form"><a href="#">Add to basket</a></p>
					</form>
					{else}
					<p class="Icon_Alert">Product is unavailable</p>
					{if $page.meta.unavailable_msg}<p>{$page.meta.unavailable_msg}</p>{/if}
					{/if}
					{if $smarty.request.addtobasket}
						{assign var="cur" value=$content.currency_code}
						{assign var="price" value=$page.meta.price}
						{assign var="variant" value=$page.meta.variant}
						{if $page.meta.variants!=''}
							{foreach key=key from=$variants item=variantitem}
								{if $smarty.request.variant==$key}
									{assign var="varianta" value=":"|explode:$variantitem}
									{assign var="price" value=$varianta[1]}
									{assign var="variant" value=$varianta[0]}
								{/if}
							{/foreach}
						{/if}
						{add_to_basket
							name=$page.title
							price=$price
							original_price=$page.meta.origprice
							quantity=$smarty.request.quantity
							currency=$cur
							pic_url=$pic
							variant=$variant
							url_str=$url_str
							custom_code=$page.meta.code
							allow_one=$page.meta.onlyone
						}
						{if $added}
						<p class="Icon_Info">Added to basket. <a href="/{$content.basket_link}">Go to checkout</a></p>
						{/if}
					{/if}
					{*
				{/if}
				*}

				</div>
			</div>
			{storage_by_tag tags=$page.meta.filestags assign="files"}
			{if $files}
				<h4>Downloads</h4>
				{foreach from=$files item=item key=key name=loop1}
					{if $item.filetype=="file"}
					<p class="Button_Medium shop-download"><a target="_blank" href="/downloads/{$item.filename}">{$item.caption}</a></p>
					{/if}
				{/foreach}
			{/if}
			</div>
		</div>


		&nbsp;
		{pages_by_tag tags=$relatedtags additionaltags=$pagemeta.tagids assign=related onlyhistorical=$onlyhistorical start=0 limit=20}
		{foreach from=$related name=loop item=featuredpage}
			{if $featuredpage.static_pagesid!=$page.id&&$page.template==$featuredpage.template}
				{assign var="showrelated" value=true}
			{/if}
		{/foreach}
		{if $showrelated}
		<div id="relatedProducts">
		<h4>Related Products</h4>
			<div class="magic-heights-wrap shop-related-products clearfix">
			{foreach from=$related name=loop item=featuredpage}
				{if $featuredpage.static_pagesid!=$page.id&&$page.template==$featuredpage.template}
				<div class="shop-article clearfix styleBox magic-heights">
				<div class="magic-heights-inner clearfix shop-title-and-date">
					{if $metadata.showimage}
					{assign var="images" value=""}
					{storage_by_tag tags=$featuredpage.meta.gallerytags assign="images"}
					<div class="shop-index-image">
						{if $images}
						<div class="magic-heights-inner-2 bpe_image"><a href="/{$content.url}/{$featuredpage.url_str}"><img src='/images/galleries/{$images[0].filename}?width={if $metadata.grid}{$metadata.main_image_width_grid}&height={$metadata.main_image_height_grid}{else}{$metadata.main_image_width}&height={$metadata.main_image_height}{/if}&shrink=false' class="shopBanner"/></a></div>
						{else}
						{if $theme_vars_placeholder_image}
						<div class="bpe_image magic-heights-inner-2"><a href="/{$content.url}/{$featuredpage.url_str}"><img src='/images/themegraphics/{$theme_vars_placeholder_image}?width={if $metadata.grid}{$metadata.main_image_width_grid}&height={$metadata.main_image_height_grid}{else}{$metadata.main_image_width}&height={$metadata.main_image_height}{/if}&shrink=false' class="shopBanner"/></a></div>
						{/if}
						{/if}
					</div>
					<div class="shop-index-with-image">
					{else}
						{if $metadata.grid}<a href="/{$content.url}/{$featuredpage.url_str}" style="display:block;line-height:0;" class="placeholderimage"><img src="/graphics/x.gif" width="450" height="450" class="shopBanner" alt="{$featuredpage.pagetitle}"/></a>{/if}
					{/if}
					<div class="magic-heights-inner">
					<h4 class="shopTitle"><a href="/{$content.url}/{$featuredpage.url_str}">{$featuredpage.pagetitle}</a></h4>
					</div>
					{if $metadata.showimage}
					</div>
					{/if}
				</div>
				</div>
				{/if}
			{/foreach}
			</div>
		</div>
		{/if}
		{if $metadata.showreviews}
		{if $page.page_child_data.review}
		<h2>Reviews</h2>
		{/if}

		{foreach from=$page.page_child_data.review item=item key=key name=loop1}
			{if $item.values.approved}
			<div class="shop-comment styleBox">
				<p>
					<span class="shop-comment-author">
					{if $item.owner.avatar!=""}<img src="/images/{$item.owner.avatar}?width=100&height=100&shrink=false" alt="{$item.owner.name}" class="avatar"/>{/if}
					<strong>
						{if $item.owner.id==0}{$item.values.name}{else}{$item.owner.name}{/if}
					</strong></span> 
					{$item.values.message}
					<span class="shop-comment-date">{$item.created|date_format:"%A, %B %e, %Y"}</span>
				</p>
				{*{if $item.owner==$content.logged_in_user.id}
				Edit
				{/if}*}
			</div>
			{/if}
		{/foreach}
		<div class="clear"></div>
		<h4> {$langs.Add_Review}</h4>
		{if $smarty.get.exists}
		<p class="Icon_Alert">You’ve already added this review.</p>
		{/if}
		{if $smarty.get.added}
		<p class="Icon_Tick">You’ve successfully added this review. {if $metadata.reviewapproval==1}Your review will be published here if approved.{/if}</p>
		{/if}
		<div class="styleBox">
		<form action="" method="post" class="shop-comment-form">
			<input type="hidden" name="addreview" value="1" />
			<label for="email1" class="fakeemail">Are you human?<br/>
			Leave this empty if you are a human. This is to prevent spam.
			</label>
			<input type="text" maxlength="256" id="email1" name="email1" value="" class="email1 input"/>
			{if $content.logged_in_user.id==""}
				<div class="input-wrapper input-wrapper-width-50 input-wrapper-type-name input-wrapper-required" >
					<label class="label_Your_name " for="shop_com_name">Your name:</label>
					<input id="shop_com_name" type="text" maxlength="256" title="Your name:" name="data[name]" class="input required" value=""/>
				</div>

				<div class="input-wrapper input-wrapper-width-50 input-wrapper-type-name input-wrapper-required" >
					<label class="label_Email " for="shop_com_email">Email:</label>
					<input id="shop_com_email" type="text" maxlength="256" title="Email:" name="data[email]" class="input required" value=""/>
				</div>
				<div class="input-wrapper input-wrapper-width-100 input-wrapper-type-short input-wrapper-required" >
					<label class="label_Message" for="shop_com_message">Review:</label>
					<textarea id="shop_com_message" type="text" name="data[review]" class="input required"></textarea>
				</div>
			{else}

			<div class="input-wrapper input-wrapper-width-100 input-wrapper-type-short input-wrapper-required" >
				<label class="label_Message" for="shop_com_message">Leave review as {$content.logged_in_user.name}:</label>
				<textarea id="shop_com_message" type="text" name="data[review]" class="input required"></textarea>
			</div>
			{/if}

			
			<div class="clear"></div>

			<p class="Icon_Alert cf_contains_errors" >* Please fill out all required fields</p>

			<p class="button submit_form hide_if_no_js">
			<a href="#" class=''>Add review</a>
			</p>

			<input type="submit" value="Submit" class="contact-form-hide-with-js"/>

		</form>
		</div>
		{/if}
	{else}

	{$editable.above_index}
		{if $smarty.get.category||!$smarty.get.category}
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
		{foreach from=$featured item=featuredpage}
		<div class="carousel_slide carousel_slide_autoscroll">
			<div class="styleBox shop-recent-item clearfix align-image-text">
				{if $metadata.showimage}{if $featuredpage.pic_url!=""}<div class="bpe_image Left_Image"><a href="{$featuredpage.url_str}/"><img src='{$featuredpage.pic_url}{if $featuredpage.pic_url|starts_with:"/images"}?width={$metadata.featured_image_width}&height={$metadata.featured_image_height}{/if}' width="150"/></a></div>{else}{if $theme_vars_placeholder_image}<div class="bpe_image Left_Image"><a href="{$featuredpage.url_str_full}/"><img src='/images/themegraphics/{$theme_vars_placeholder_image}?width={$metadata.featured_image_width}&height={$metadata.featured_image_height}' width="150"/></a></div>{/if}{/if}{/if}
				<h4><a href="{$featuredpage.url_str}">{$featuredpage.pagetitle}</a></h4>
				{if $metadata.showsummary && $featuredpage.meta.ss_page_desc!=""}<p>{$featuredpage.meta.ss_page_desc}</p>{/if}
			</div>
		</div>
		{/foreach}
		{if $smarty.get.category}
		<div class="magic-heights-wrap clearfix">
		{assign var="doneinindex" value=[]}
		{foreach from=$pages item=page name=loop}
			{if !$page.static_pagesid|in_array:$doneinindex}
			<div class="shop-article clearfix styleBox magic-heights {if $smarty.foreach.loop.iteration % 2 == 1}odd{/if} {if $smarty.foreach.loop.iteration % 3 == 2}middle-of-three{/if}

				{foreach from=$page.tags_array item=tag name=loop1}
				{foreach from=$flat_cats item=all name=loop2}
				{if $all.id==$tag}
				in-shop-category-{$all.name|css_safe}
				{/if}
				{/foreach}
				{/foreach}
			"> 
				<div class="clearfix shop-title-and-date magic-heights-inner">
					{assign var="images" value=""}
					{storage_by_tag tags=$page.meta.gallerytags assign="images"}
					{if $metadata.showimage}
					<div class="shop-index-image">
						{if $images}
						<div class="magic-heights-inner-2 bpe_image"><a href="{$page.url_str}/"><img src='/images/galleries/{$images[0].filename}?width={if $metadata.grid}{$metadata.main_image_width_grid}&height={$metadata.main_image_height_grid}{else}{$metadata.main_image_width}&height={$metadata.main_image_height}{/if}&shrink=false' class="shopBanner"/></a></div>
						{else}
						{if $theme_vars_placeholder_image}
						<div class="bpe_image magic-heights-inner-2"><a href="{$page.url_str}/"><img src='/images/themegraphics/{$theme_vars_placeholder_image}?width={if $metadata.grid}{$metadata.main_image_width_grid}&height={$metadata.main_image_height_grid}{else}{$metadata.main_image_width}&height={$metadata.main_image_height}{/if}&shrink=false' class="shopBanner"/></a></div>
						{/if}
						{/if}
					</div>
					<div class="shop-index-with-image">
					{else}
						{if $metadata.grid}<a href="{$page.url_str_full}" style="display:block;line-height:0;" class="placeholderimage"><img src="/graphics/x.gif" width="450" height="450" class="shopBanner" alt="{$page.title}"/></a>{/if}
					{/if}
					<h4 class="shopTitle"><a href="{$page.url_str}/">{$page.pagetitle}</a></h4>

					{*<p class="shop-date">
						{$page.meta.date|date_format:"%b %e, %Y %H:%M"}
					</p>*}
					{if $metadata.showsummary && $page.meta.ss_page_desc!=""}<p class="shop-desc">{$page.meta.ss_page_desc}</p>{/if}
					{if $metadata.showimage}
					</div>
					{/if}
				</div>
			</div>
			{/if}
		{/foreach}
		</div>
		{if $start + 20 < $totalpages||$start>0}
		<p class="shop-pages clearfix">
		{if $start + 20 < $totalpages}
		<a class="shop-pages-next" href="?start={$start+20}{if $smarty.get.category}&category={$smarty.get.category}{/if}{if $smarty.get.astag}&astag=true{/if}">Next</a>
		{/if}
		{if $start>0}
		<a class="shop-pages-prev" href="?start={$start-20}{if $smarty.get.category}&category={$smarty.get.category}{/if}{if $smarty.get.astag}&astag=true{/if}">Prev</a>
		{/if}
		</p>
		{/if}
		{/if}
			{if $subcats}
				{if $metadata.showcatsaspreview}
					{foreach from=$subcats item="subcat"}
						{pages_by_tag tags=$subcat.id assign=totalincat onlyhistorical=$onlyhistorical}
						{assign var=totalincat value=$totalincat|count}
						{pages_by_tag tags=$subcat.id assign=subcatpages onlyhistorical=$onlyhistorical limit=8}
						{if $subcatpages}
						<h3>{$subcat.name}</h3>
						<div class="magic-heights-wrap clearfix">
						{foreach from=$subcatpages item="subcatpage" name="loop"}
						{append var="doneinindex" value=$subcatpage.static_pagesid}
						<div class="shop-article clearfix styleBox magic-heights {if $smarty.foreach.loop.iteration % 2 == 1}odd{/if} {if $smarty.foreach.loop.iteration % 3 == 2}middle-of-three{/if}">
							<div class="shop-title-and-date clearfix magic-heights-inner">
								{if $metadata.showimage}
								{assign var="images" value=""}
								{storage_by_tag tags=$subcatpage.meta.gallerytags assign="images"}
								<div class="shop-index-image">
									{if $images}
									<div class="magic-heights-inner-2 bpe_image"><a href="/{$content.url}/{$subcatpage.url_str}"><img src='/images/galleries/{$images[0].filename}?width={if $metadata.grid}{$metadata.main_image_width_grid}&height={$metadata.main_image_height_grid}{else}{$metadata.main_image_width}&height={$metadata.main_image_height}{/if}&shrink=false' class="shopBanner"/></a></div>
									{else}
									{if $theme_vars_placeholder_image}
									<div class="bpe_image magic-heights-inner-2"><a href="/{$content.url}/{$subcatpage.url_str}"><img src='/images/themegraphics/{$theme_vars_placeholder_image}?width={if $metadata.grid}{$metadata.main_image_width_grid}&height={$metadata.main_image_height_grid}{else}{$metadata.main_image_width}&height={$metadata.main_image_height}{/if}&shrink=false' class="shopBanner"/></a></div>
									{/if}
									{/if}
								</div>
								<div class="shop-index-with-image">
								{else}
									{if $metadata.grid}<a href="/{$content.url}/{$subcatpage.url_str}" style="display:block;line-height:0;" class="placeholderimage"><img src="/graphics/x.gif" width="450" height="450" class="shopBanner" alt="{$subcatpage.pagetitle}"/></a>{/if}
								{/if}
								<h4 class="shopTitle"><a href="/{$content.url}/{$subcatpage.url_str}">{$subcatpage.pagetitle}</a></h4>
								</div>
							</div>
						</div>
						{/foreach}

						</div>
						{if $totalincat>8}
						<p class="Button_Medium"><a href="?category={$subcat.name|css_safe}">See more</a></p>
						{/if}
						{/if}
					{/foreach}
				{else}
					<div class="magic-heights-wrap clearfix">
					{foreach from=$subcats item="subcat"}

						<div class="shop-article clearfix styleBox magic-heights {if $smarty.foreach.loop.iteration % 2 == 1}odd{/if} {if $smarty.foreach.loop.iteration+1 % 4 == 2}last-of-four{/if}">
						{pages_by_tag tags=$subcat.id assign=subcatfirst onlyhistorical=$onlyhistorical}
						<div class="shop-title-and-date clearfix magic-heights-inner">
							{if $metadata.showimage}
							{assign var="images" value=""}
							{storage_by_tag tags=$subcatfirst[0].meta.gallerytags assign="images"}
							<div class="shop-index-image">
								{if $images}
								<div class="magic-heights-inner-2 bpe_image"><a href="?category={$subcat.name|css_safe}"><img src='/images/galleries/{$images[0].filename}?width={if $metadata.grid}{$metadata.main_image_width_grid}&height={$metadata.main_image_height_grid}{else}{$metadata.main_image_width}&height={$metadata.main_image_height}{/if}&shrink=false' class="shopBanner"/></a></div>
								{else}
								{if $theme_vars_placeholder_image}
								<div class="bpe_image magic-heights-inner-2"><a href="?category={$subcat.name|css_safe}"><img src='/images/themegraphics/{$theme_vars_placeholder_image}?width={if $metadata.grid}{$metadata.main_image_width_grid}&height={$metadata.main_image_height_grid}{else}{$metadata.main_image_width}&height={$metadata.main_image_height}{/if}&shrink=false' class="shopBanner"/></a></div>
								{/if}
								{/if}
							</div>
							<div class="shop-index-with-image">
							{else}
								{if $metadata.grid}<a href="?category={$subcat.name|css_safe}" style="display:block;line-height:0;" class="placeholderimage"><img src="/graphics/x.gif" width="450" height="450" class="shopBanner" alt="{$subcat.name}"/></a>{/if}
							{/if}
							<h4 class="shopTitle"><a href="?category={$subcat.name|css_safe}">{$subcat.name}</a></h4>
							{if $metadata.showimage}
							</div>
							{/if}
						</div>
						</div>
					{/foreach}
					</div>
				{/if}
			{/if}
		{/if}



	{/if}
</div>
</div>
<script type="text/javascript">
	{literal}
	function setShopMenus() {

		$(".depth-2,.depth-3",".shop-categories").hide();
		if ($(".shop-categories .current").length){
			var d = $(".shop-categories .current").attr("class").split("depth-");
			d = d[1].split(" ");
			d = d[0];
		}
		$(".shop-categories .current").prevAll("li").each(function(){
			var td = $(this).attr("class").split("depth-");
			td = td[1].split(" ");
			td = td[0];
			if (td<d){
				d=td;
				$(this).addClass("current");
			}

		});
		$(".shop-categories li.current").each(function(){
			var d = $(this).attr("class").split("depth-");
			d = d[1].split(" ");
			d = parseInt(d[0]);
			var ok = true;
			$(this).show();
			$(this).nextAll().each(function(){
				var td = $(this).attr("class").split("depth-");
				td = td[1].split(" ");
				td = td[0];
				if (ok&&td==d+1){
					$(this).show();
				}
				if (td<=d){
					ok=false;
				}
			});

		});
	}
	$(document).ready(function(){
		if ($(".shop-comment-form").length>0) {
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
	.shop-categories li {
		position:relative;
	}
	.shop-categories li.current span {
		background:#ddd;
	}
	.shop-categories li span {
		position:absolute;
		top:5px;
		right:5px;
		width:35px;
		height:35px;
		border:1px solid #333;
		border-radius:5px;
		cursor:pointer;
	}
	.shop-categories li span:after {
		content:"";
		position:absolute;
		top:14px;
		left:10px;
		border:6px solid transparent;
		width:1px;height:1px;
		border-top:6px solid #666;
	}
	.depth-2,.depth-3 {
		display:none;
	}
	.shop-comment-date {
		display:block;
		font-size:75%;
	}
	
	{/literal}
</style>
{/if}

