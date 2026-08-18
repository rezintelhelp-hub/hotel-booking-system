<?xml version="1.0" ?><rss version="2.0">
<channel>
	<title><![CDATA[{$title}]]</title>    
	<link>{$url}</link>
	<description><![CDATA[{$description}]]></description>
	{foreach from=$recentArticles item=entry}
	<item>
		<title><![CDATA[{$entry.name}]]</title>
		<link>{$entry.url}</link>
		<description><![CDATA[{$entry.content|replace:'&nbsp;':' '}]]></description>
	  	<guid isPermaLink="false">{$url}{$entry.id}</guid>
		<pubDate>{$entry.timestamp|date_format:"%a, %e %b %Y %T %Z"}</pubDate>
	</item>
	{/foreach}
	</channel>
</rss>
