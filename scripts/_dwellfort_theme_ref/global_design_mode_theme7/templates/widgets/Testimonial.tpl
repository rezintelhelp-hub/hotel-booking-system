{* @@@
{
	"widget_info":{
		"title":"Testimonial"
		,"category":"text"
		,"works_in_email":"both"
	}
}
@@@ *}
<div class="testimonial clearfix">
	<blockquote class="text">
		{$editable.text}
	</blockquote>
	{if $editable.author}
	<cite class="author">
		{$editable.author}
	</cite>
	{/if}
</div>
