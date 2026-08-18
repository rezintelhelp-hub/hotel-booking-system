# Dwellfort Design Spec

**Source:** `global_elegant` SetSeed theme (2011 Skeleton-based) + live www.dwellfort.com pages
**Extracted:** 2026-08-18T09:23:42.184Z

## Palette (most-used colours)

| Colour | Usage count |
|---|---|
| `#fff` | 870 |
| `#000` | 354 |
| `#ccc` | 229 |
| `#ffffff` | 170 |
| `#444` | 97 |
| `rgba(0,0,0,.5)` | 96 |
| `#ddd` | 87 |
| `rgba(0,0,0,.1)` | 78 |
| `rgba(0,0,0,.2)` | 78 |
| `#333` | 68 |
| `rgba(0,0,0,.3)` | 60 |
| `rgba(255,255,255,0.6)` | 60 |
| `#999` | 49 |
| `#f3f3f3` | 48 |
| `#7d7e7d` | 48 |
| `#252317` | 48 |
| `#0e0e0e` | 42 |
| `#888` | 40 |
| `#c7c7c7` | 36 |
| `rgba(0,0,0,0.6)` | 36 |
| `rgba(0,0,0,0.8)` | 36 |
| `#777` | 33 |
| `#f4f4f4` | 26 |
| `#555` | 25 |
| `#0093ef` | 24 |
| `#e7e7e7` | 24 |
| `#e7e0db` | 24 |
| `rgba(255,255,255,.1)` | 24 |
| `rgba(255,255,255,.3)` | 24 |
| `rgba(255,255,255,.8)` | 24 |
| `#c4c4c4` | 18 |
| `#666` | 18 |
| `#06c` | 18 |
| `#dc3545` | 18 |
| `#0c0` | 18 |
| `#d0b58e` | 18 |
| `rgba(0,0,0,.4)` | 18 |
| `rgb(241,241,241)` | 18 |
| `rgba(241,241,241,1)` | 18 |
| `rgba(221,221,221,1)` | 18 |

## Font families

| Family | Usage count |
|---|---|
| "icomoon" | 245 |
| 'Lora' | 24 |
| 'Muli' | 24 |
| 'Lora', serif | 24 |
| 'icomoon' | 13 |
| 'Muli', sans-serif | 12 |
| "Open Sans", sans-serif !important | 6 |
| icomoon | 6 |
| "kbfont" | 6 |
| arial,sans-serif | 6 |
| 'Fjord One', serif | 1 |

### Google Fonts loaded on live site

- fonts.googleapis.com/css?family=Open+Sans:300,400

## Font sizes (most-used)

| Size | Usage count |
|---|---|
| 12px | 275 |
| 14px | 255 |
| 16px | 199 |
| 13px | 96 |
| 30px | 80 |
| 18px | 80 |
| 20px | 77 |
| 15px | 72 |
| 11px | 66 |
| 25px | 60 |
| 22px | 50 |
| 120% | 32 |
| 19px | 30 |
| 40px | 25 |
| 80% | 25 |
| 24px | 24 |
| 26px | 19 |
| 80px | 19 |
| 100% | 13 |
| 90% | 13 |
| 150% | 13 |
| 10px | 13 |
| 70% | 12 |
| .8em | 12 |
| 75% | 12 |

## Button rules (11)


### `/* ==== base.css ==== */
/*
* Skeleton V1.2
* Copyright 2011, Dave Gamache
* www.getskeleton.com
* Free to use under the MIT license.
* http://www.opensource.org/licenses/mit-license.php
* 6/20/2012
*/


/* Table of Content
==================================================
	#Reset & Basics
	#Basic Styles
	#Typography
	#Links
	#Lists
	#Images
	#Buttons
	#Misc */


/* #Reset & Basics (Inspired by E. Meyers)
================================================== */

	@font-face`
```css
font-family: 'icomoon';
		src:url('iconfont/icomoon.eot');
		src:url('iconfont/icomoon.eot?#iefix') format('embedded-opentype'),
			url('iconfont/icomoon.woff') format('woff'),
			url('iconfont/icomoon.ttf') format('truetype'),
			url('iconfont/icomoon.svg#icomoon') format('svg');
		font-weight: normal;
		font-style: normal;
```

### `/* #Buttons
================================================== */
	.Button_Small`
```css
padding:0px 0;
```

### `.Button_Large`
```css
padding:6px 0;
```

### `#commentFormForm input[type="submit"]
	,#miniBasket2 .Button_Small a
	,#miniBasket2 .Button_Medium a
	,#miniBasket2 .Button_Large a
	,#basketWrapper .Button_Small a
	,#basketWrapper .Button_Medium a
	,#basketWrapper .Button_Large a`
```css
background: #222;
		color:#fff;
```

### `p.Button_Small a`
```css
font-size: 16px;
		line-height: 24px;
		padding: 0px 5px;
		font-weight: normal;
```

### `.button a:hover,
	.Button_Small a:hover,
	.Button_Medium a:hover,
	.Button_Large a:hover,
	button:hover,
	input[type="submit"]:hover,
	input[type="reset"]:hover,
	input[type="button"]:hover`
```css
background: #c14200;
```

### `footer .button a:hover,
	footer .Button_Small a:hover,
	footer .Button_Medium a:hover,
	footer .Button_Large a:hover,
	footer button:hover,
	footer input[type="submit"]:hover,
	footer input[type="reset"]:hover,
	footer input[type="button"]:hover`
```css
background: #4d4d4d;
```

### `/* Fix for odd Mozilla border & padding issues */
	button::-moz-focus-inner,
	input::-moz-focus-inner`
```css
border: 0;
    padding: 0;
```

### `#fullWidthBanner .button a,
#fullWidthBanner .Button_Small a,
#fullWidthBanner .Button_Medium a,
#fullWidthBanner .Button_Large a,
#fullWidthBanner button,
#fullWidthBanner input[type="submit"],
#fullWidthBanner input[type="reset"],
#fullWidthBanner input[type="button"]`
```css
background: #fff;
	background: rgba(255,255,255,0.8);
	text-decoration: underline;
```

### `.callout .button a,
.callout .Button_Small a,
.callout .Button_Medium a,
.callout .Button_Large a,
.callout button,
.callout input[type="submit"],
.callout input[type="reset"],
.callout input[type="button"]`
```css
background: #444;
	color:#fff;
```

### `p#miniCheckoutButton.Button_Large`
```css
margin:2px 10px 0px;
		text-align: center;
		padding:0;
```
