# Dwellfort Design Spec

**Source:** `global_design_mode_theme7` SetSeed theme (2011 Skeleton-based) + live www.dwellfort.com pages
**Extracted:** 2026-08-18T10:08:13.319Z

## Palette (most-used colours)

| Colour | Usage count |
|---|---|
| `#fff` | 911 |
| `#000` | 373 |
| `#ccc` | 237 |
| `#ffffff` | 170 |
| `#444` | 100 |
| `rgba(0,0,0,.5)` | 96 |
| `#ddd` | 89 |
| `rgba(0,0,0,.1)` | 78 |
| `rgba(0,0,0,.2)` | 78 |
| `#333` | 70 |
| `rgba(0,0,0,.3)` | 60 |
| `rgba(255,255,255,0.6)` | 60 |
| `#7d7e7d` | 56 |
| `#999` | 52 |
| `#0e0e0e` | 49 |
| `#252317` | 48 |
| `#f3f3f3` | 46 |
| `#c7c7c7` | 41 |
| `#888` | 39 |
| `rgba(0,0,0,0.8)` | 38 |
| `rgba(0,0,0,0.6)` | 36 |
| `#777` | 35 |
| `#e7e7e7` | 28 |
| `#f4f4f4` | 26 |
| `#555` | 25 |
| `#0093ef` | 24 |
| `#e7e0db` | 24 |
| `rgba(255,255,255,.1)` | 24 |
| `rgba(255,255,255,.3)` | 24 |
| `rgba(255,255,255,.8)` | 24 |
| `rgba(0,0,0,0.1)` | 22 |
| `rgb(241,241,241)` | 20 |
| `rgba(241,241,241,1)` | 20 |
| `rgba(221,221,221,1)` | 20 |
| `#c4c4c4` | 18 |
| `#666` | 18 |
| `#06c` | 18 |
| `#dc3545` | 18 |
| `#0c0` | 18 |
| `#d0b58e` | 18 |

## Font families

| Family | Usage count |
|---|---|
| "icomoon" | 258 |
| 'Lora' | 24 |
| 'Muli' | 24 |
| 'Lora', serif | 24 |
| 'icomoon' | 14 |
| 'Muli', sans-serif | 12 |
| icomoon | 7 |
| "kbfont" | 7 |
| "Open Sans", sans-serif !important | 6 |
| arial,sans-serif | 6 |

### Google Fonts loaded on live site

- fonts.googleapis.com/css?family=Open+Sans:300,400

## Font sizes (most-used)

| Size | Usage count |
|---|---|
| 12px | 289 |
| 14px | 264 |
| 16px | 203 |
| 13px | 105 |
| 30px | 85 |
| 18px | 84 |
| 20px | 77 |
| 15px | 77 |
| 11px | 73 |
| 25px | 66 |
| 22px | 53 |
| 19px | 34 |
| 120% | 33 |
| 40px | 28 |
| 24px | 27 |
| 80% | 25 |
| 80px | 21 |
| 26px | 20 |
| 100% | 14 |
| 90% | 14 |
| 9px | 14 |
| 3vw | 14 |
| .8em | 13 |
| 75% | 13 |
| 150% | 13 |

## Button rules (35)


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
	.admin_info`
```css
background:#fc5603;
		color:#fff;
		padding:0px 9px;
		font-size:11px;
```

### `/* #Buttons
================================================== */
	.SSO_Button a`
```css
display:inline-block;
		padding:8px 15px 8px 8px;
		text-decoration:none;
		font-size:13px;
		box-shadow:1px 1px 3px rgba(0,0,0,0.4);
		background:#fff;
		color:#444;
		width:320px;
		max-width:100%;
```

### `.Button_Small`
```css
padding:0px 0;
```

### `.Button_Large`
```css
padding:6px 0;
```

### `.rounded .button a,
	.rounded .Button_Small a,
	.rounded .Button_Medium a,
	.rounded .Button_Large a,
	.rounded button,
	.rounded input[type="submit"],
	.rounded input[type="reset"],
	.rounded input[type="button"]`
```css
-moz-border-radius:2px;
	  -webkit-border-radius:2px;
	  border-radius:2px;
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
box-shadow:inset 0 0 4px rgba(0,0,0,0.5);
```

### `/* Fix for odd Mozilla border & padding issues */
	button::-moz-focus-inner,
	input::-moz-focus-inner`
```css
border: 0;
    padding: 0;
```

### `.consent_button,.consent_button:hover`
```css
position:relative;
	padding:6px 15px 5px 50px;
	line-height:14px;
	border-radius:50px;
	background:none;
	font-weight:normal;
	color:#000;
	box-shadow:none;
```

### `.consent_button.on:hover:after`
```css
width:17px;
```

### `.consent-disabled .consent_button.on`
```css
cursor:default;
```

### `.consent_button.on:before`
```css
background:#41BE00;
```

### `.consent_button.on:after`
```css
left:19px;
```

### `.consent_button`
```css
font-size:11px;
```
