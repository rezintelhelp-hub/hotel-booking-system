# GAS Partner API — Web Builder Field Coverage Report

**Date:** 16 March 2026
**API Base:** `https://admin.gas.travel`
**Auth:** All endpoints require partner API key via `x-api-key` header or URL parameter.

---

## Header

**Dedicated endpoint:** `GET/PUT /api/partner/websites/{websiteId}/header`

| Field | Partner API Key | In Swagger | Notes |
|-------|----------------|-----------|-------|
| site_name | `site_name` | YES | Fallback text when no logo |
| logo_image_url | `logo_image_url` | YES | Main logo (via `/logo` endpoint) |
| logo_size | `logo_size` | YES | Range 20-120px |
| logo_light_image_url | `logo_light_image_url` | YES | Logo for transparent header |
| logo_color | `logo_color` | YES | Text logo colour |
| bg_color | `bg_color` | YES | Header background |
| text_color | `text_color` | YES | Nav link colour |
| underline_color | `underline_color` | YES | Active nav underline |
| cta_button_text | `cta_button_text` | YES | Multilingual: append `-en`, `-fr`, `-es`, `-nl` |
| cta_bg | `cta_bg` | YES | CTA button background |
| cta_text_color | `cta_text_color` | YES | CTA button text |
| cta_link | `cta_link` | YES | CTA button URL path |
| border_color | `border_color` | YES | Bottom border colour |
| border_width | `border_width` | YES | Range 1-5px |
| border_style_type | `border_style_type` | YES | solid/dashed/dotted |
| border_style_color | `border_style_color` | YES | Border colour (hex) |
| font | `font` | YES | Font family slug |
| font_size | `font_size` | YES | Range 12-24px |
| font_weight | `font_weight` | YES | normal/bold/600 |
| text_transform | `text_transform` | YES | none/uppercase/capitalize |
| layout | `layout` | YES | logo-left/center/right |
| sticky | `sticky` | YES | Boolean |
| fixed_header | `fixed_header` | YES | Boolean |
| transparent | `transparent` | YES | Boolean — transparent over hero |
| transparent_opacity | `transparent_opacity` | YES | Range 0-80% |
| border | `border` | YES | Boolean — show bottom border |
| lang_color | `lang_color` | YES | Language selector text |
| lang_dropdown_color | `lang_dropdown_color` | YES | Dropdown text colour |
| lang_dropdown_bg | `lang_dropdown_bg` | YES | Dropdown background |

---

## Hero

**Dedicated endpoint:** `GET /api/partner/websites/{websiteId}/hero`
**Sub-endpoints:** `PUT .../hero/badge`, `PUT .../hero/search`, `PUT .../hero/meta`

| Field | Partner API Key | In Swagger | Notes |
|-------|----------------|-----------|-------|
| headline | `headline` | YES | Multilingual: `-en`, `-fr`, `-es`, `-nl` |
| subheadline | `subheadline` | YES | Multilingual |
| button_text | `button_text` | YES | Multilingual |
| button_link | `button_link` | YES | URL path |
| image_url | `image_url` | YES | Background image |
| mobile_image_url | `mobile_image_url` | YES | Mobile background |
| video_url | `video_url` | YES | Video background URL |
| video_mobile | `video_mobile` | YES | Mobile video toggle |
| background_type | `background_type` | YES | image/video/slider |
| title_color | `title-color` | YES | Headline text colour |
| subtitle_color | `subtitle-color` | YES | Subheadline text colour |
| overlay_color | `overlay_color` | YES | Hex colour |
| overlay | `overlay` | YES | Opacity 0-100% |
| height | `height` | YES | 50-100vh |
| slide_1_url — slide_4_url | `slide_N_url` | YES | Slider images |
| slider_duration | `slider_duration` | YES | Milliseconds |
| slider_transition | `slider_transition` | YES | fade/slide |
| show_badge | `show-badge` | YES | Boolean — show/hide badge |
| badge_bg | Via `/hero/badge` | YES | Badge background (hex + opacity) |
| badge_text | Via `/hero/badge` | YES | Badge text colour |
| badge_border | Via `/hero/badge` | YES | Badge border colour |
| trust_1 — trust_3 | `trust_N` | YES | Multilingual trust badges |
| trust_text_color | `trust_text_color` | YES | Trust badge text colour |
| search_bg | Via `/hero/search` | YES | Search widget background |
| search_label_color | Via `/hero/search` | YES | Label text colour |
| search_opacity | Via `/hero/search` | YES | 0-100% |
| search_radius | Via `/hero/search` | YES | Corner radius px |
| search_padding | Via `/hero/search` | YES | Internal padding px |
| search_max_width | Via `/hero/search` | YES | Max width px |
| search_scale | Via `/hero/search` | YES | Scale 80-120% |
| search_max_guests | Via `/hero/search` | YES | Max guests number |
| search_btn_bg | Via `/hero/search` | YES | Search button background |
| search_btn_text | Via `/hero/search` | YES | Search button text colour |
| search labels | Via `/hero/search` | YES | Multilingual: checkin, checkout, guests, button, date placeholder, guest singular |
| meta_title | Via `/hero/meta` | YES | Homepage SEO title |
| meta_description | Via `/hero/meta` | YES | Homepage SEO description |
| menu_title | Via `/hero/meta` | YES | Multilingual nav label (default: "Home") |
| faq_enabled | Via content endpoint | YES | Boolean |

---

## Styles

**Dedicated endpoint:** `GET/PUT /api/partner/websites/{websiteId}/styles`

| Field | Partner API Key | In Swagger | Notes |
|-------|----------------|-----------|-------|
| primary_color | `primary_color` | YES | Primary brand colour |
| secondary_color | `secondary_color` | YES | Secondary colour |
| accent_color | `accent_color` | YES | Accent colour |
| link_color | `link_color` | YES | Link text colour |
| heading_font | `heading_font` | YES | Font slug (Inter, Playfair Display, etc.) |
| subheading_font | `subheading_font` | YES | Font slug |
| body_font | `body_font` | YES | Font slug |
| title_size | `title_size` | YES | H1 font size |
| subheading_size | `subheading_size` | YES | H2/H3 font size |
| body_size | `body_size` | YES | Paragraph font size |
| btn_primary_bg | `btn_primary_bg` | YES | Button background |
| btn_primary_text | `btn_primary_text` | YES | Button text |
| btn_radius | `btn_radius` | YES | Button corner radius px |
| featured_bg | `featured_bg` | YES | Featured section background |
| about_bg | `about_bg` | YES | About section background |
| testimonials_bg | `testimonials_bg` | YES | Testimonials section background |
| cta_bg | `cta_bg` | YES | CTA section background |
| section_spacing | `section_spacing` | YES | Space between sections px |
| spinner_style | `spinner_style` | YES | Loading spinner style |
| custom_css | `custom_css` | YES | Custom CSS textarea |

---

## Footer

**Available via:** `PUT /api/partner/websites/{websiteId}/content/footer`

| Field | Partner API Key | In Swagger | Notes |
|-------|----------------|-----------|-------|
| bg | `bg` | YES | Background colour |
| text | `text` | YES | Text colour |
| layout | `layout` | YES | standard/centered/minimal |
| email | `email` | YES | Contact email |
| phone | `phone` | YES | Contact phone |
| address | `address` | YES | Address text |
| copyright | `copyright-en` | YES | Multilingual: `-en`, `-fr`, `-es`, `-nl` |
| heading_quicklinks | `heading-quicklinks-en` | YES | Multilingual |
| heading_legal | `heading-legal-en` | YES | Multilingual |
| company_number_label | `company-number-label-en` | YES (content) | Multilingual |
| company_number | `company-number-en` | YES (content) | Multilingual |
| tax_number_label | `tax-number-label-en` | YES (content) | Multilingual |
| tax_number | `tax-number-en` | YES (content) | Multilingual |
| show_powered_by | `show-powered-by` | YES | Boolean |
| social_facebook | `social-facebook` | YES | URL |
| social_instagram | `social-instagram` | YES | URL |
| social_twitter | `social-twitter` | YES | URL |
| social_youtube | `social-youtube` | YES | URL |
| social_linkedin | `social-linkedin` | YES | URL |
| social_pinterest | `social-pinterest` | YES | URL |
| social_tiktok | `social-tiktok` | YES | URL |
| social_tripadvisor | `social-tripadvisor` | YES | URL |

---

## USP (Unique Selling Points)

**Available via:** `PUT /api/partner/websites/{websiteId}/content/usp`

| Field | Partner API Key | In Swagger | Notes |
|-------|----------------|-----------|-------|
| enabled | `enabled` | YES | Boolean |
| title | `title-en` | YES | Multilingual: `-en`, `-fr`, `-es`, `-nl` |
| subtitle | `subtitle-en` | YES | Multilingual |
| bg_color | `bg-color` | YES | Section background |
| title_color | `title-color` | YES | Title text colour |
| text_color | `text-color` | YES | Body text colour |
| card_bg | `card-bg` | YES | Card background |
| card_title_size | `card-title-size` | YES | Card title font size px |
| item_1 — item_6 icon | `item-N-icon` | YES | Emoji icon |
| item_1 — item_6 image | `item-N-image-url` | YES | Card image URL |
| item_1 — item_6 title | `item-N-title-en` | YES | Multilingual card title |
| item_1 — item_6 text | `item-N-text-en` | YES | Multilingual card description |

---

## Featured Properties

**Available via:** `PUT /api/partner/websites/{websiteId}/content/featured`

| Field | Partner API Key | In Swagger | Notes |
|-------|----------------|-----------|-------|
| enabled | `enabled` | YES | Boolean |
| title | `title-en` | YES | Multilingual: `-en`, `-fr`, `-es`, `-nl` |
| subtitle | `subtitle-en` | YES | Multilingual |
| bg | `bg` | YES | Section background |
| title_color | `title-color` | YES | Title text colour |
| subtitle_color | `subtitle-color` | YES | Subtitle text colour |
| mode | `mode` | YES | latest/featured/specific |
| count | `count` | YES | Number of properties (1-12) |
| columns | `columns` | YES | 2/3/4 |
| layout_style | `layout-style` | YES | card/minimal/overlay |
| ids | `ids` | YES | Comma-separated property IDs (specific mode) |
| btn_enabled | `btn-enabled` | YES | Boolean — show "View All" button |
| btn_text | `btn-text-en` | YES | Multilingual button label |
| btn_url | `btn-url` | YES | URL path |
| btn_bg | `btn-bg` | YES | Button background |
| btn_text_color | `btn-text-color` | YES | Button text colour |

---

## About (Homepage Section)

**Available via:** `PUT /api/partner/websites/{websiteId}/content/about`

| Field | Partner API Key | In Swagger | Notes |
|-------|----------------|-----------|-------|
| enabled | `enabled` | YES | Boolean |
| title | `title-en` | YES | Multilingual: `-en`, `-fr`, `-es`, `-nl` |
| text | `text-en` | YES | Multilingual |
| image_url | `image-url` | YES | Primary image |
| image_2_url — image_4_url | `image-2-url` etc. | YES | Additional images |
| layout | `layout` | YES | image-left/image-right |
| bg | `bg` | YES | Background colour |
| title_color | `title-color` | YES | Title text colour |
| text_color | `text-color` | YES | Body text colour |
| title_size | `title-size` | YES | Font size |
| text_size | `text-size` | YES | Font size |
| feature_1 — feature_6 | `feature-N-en` | YES | Multilingual feature text |
| show_btn | `show-btn` | YES | Boolean |
| btn_text | `btn-text-en` | YES | Multilingual |
| btn_url | `btn-url` | YES | URL path |
| btn_bg | `btn-bg` | YES | Button background |
| btn_text_color | `btn-text-color` | YES | Button text colour |

---

## Services

**Dedicated endpoint:** `GET/PUT /api/partner/websites/{websiteId}/services`

| Field | Partner API Key | In Swagger | Notes |
|-------|----------------|-----------|-------|
| enabled | `enabled` | YES | Boolean |
| title | `title-en` | YES | Multilingual: `-en`, `-fr`, `-es`, `-nl` |
| bg_image_url | `bg-image-url` | YES | Background image URL |
| overlay_opacity | `overlay-opacity` | YES | Image overlay opacity (0-1) |
| overlay_bg | `overlay-bg` | YES | Overlay colour |
| bg_color | `bg-color` | YES | Section background |
| title_color | `title-color` | YES | Title text colour |
| card_text_color | `card-text-color` | YES | Card body text colour |
| card_bg | `card-bg` | YES | Card background |
| card_hover_bg | `card-hover-bg` | YES | Card hover background |
| item_1 — item_8 icon | `item-N-icon` | YES | Emoji icon |
| item_1 — item_8 image | `item-N-image-url` | YES | Card image URL |
| item_1 — item_8 title | `item-N-title-en` | YES | Multilingual card title |
| item_1 — item_8 text | `item-N-text-en` | YES | Multilingual card description |

---

## CTA (Call to Action)

**Available via:** `PUT /api/partner/websites/{websiteId}/content/cta`

| Field | Partner API Key | In Swagger | Notes |
|-------|----------------|-----------|-------|
| enabled | `enabled` | YES | Boolean |
| title | `title-en` | YES | Multilingual: `-en`, `-fr`, `-es`, `-nl` |
| text | `text-en` | YES | Multilingual description |
| background | `background` | YES | Section background colour |
| text_color | `text-color` | YES | Text colour |
| title_size | `title-size` | YES | Title font size px |
| text_size | `text-size` | YES | Body font size px |
| btn_text | `btn-text-en` | YES | Multilingual button label |
| btn_url | `btn-url` | YES | URL path |
| btn_bg | `btn-bg` | YES | Button background |
| btn_text_color | `btn-text-color` | YES | Button text colour |

---

## Rooms Page

**Dedicated endpoint:** `GET/PUT /api/partner/websites/{websiteId}/rooms-page`

| Field | Partner API Key | In Swagger | Notes |
|-------|----------------|-----------|-------|
| enabled | `enabled` | YES | Boolean |
| title | `title` | YES | Maps to `-en` |
| subtitle | `subtitle` | YES | Maps to `-en` |
| menu_title | `menu_title` | YES | Maps to `-en` |
| columns | `columns` | YES | 2/3/4 |
| layout_style | `layout_style` | YES | auto/grid/row |
| show_search | `show_search` | YES | Boolean |
| show_amenity_filter | `show_amenity_filter` | YES | Boolean |
| show_location_filter | `show_location_filter` | YES | Boolean |
| show_map | `show_map` | YES | Boolean |
| show_filters | `show_filters` | YES | Boolean — master filter bar toggle |
| show_property_filter | `show_property_filter` | YES | Boolean |
| show_date_filters | `show_date_filters` | YES | Boolean |
| show_guest_filter | `show_guest_filter` | YES | Boolean |
| filter_bg | `filter_bg` | YES | Filter bar background |
| bg_color | `bg_color` | YES | Page background |
| text_color | `text_color` | YES | Page text colour |
| transparent_header | `transparent_header` | YES | Boolean |
| search_btn_bg | `search_btn_bg` | YES | Search button colour |
| search_btn_text | `search_btn_text` | YES | Search button text |
| menu_order | `menu_order` | YES | Navigation position |
| faq_enabled | `faq_enabled` | YES | Boolean |
| meta_title | `meta_title` | YES | SEO title |
| meta_description | `meta_description` | YES | SEO description |

---

## Contact Page

**Dedicated endpoint:** `GET/PUT /api/partner/websites/{websiteId}/contact-page`

| Field | Partner API Key | In Swagger | Notes |
|-------|----------------|-----------|-------|
| enabled | `enabled` | YES | Boolean |
| menu_title | `menu_title` | YES | Maps to `-en` |
| menu_order | `menu_order` | YES | Navigation position |
| title | `title` | YES | Maps to `-en` |
| subtitle | `subtitle` | YES | Maps to `-en` |
| transparent_header | `transparent_header` | YES | Boolean |
| hero_enabled | `hero_enabled` | YES | Boolean |
| hero_image | `hero_image` | YES | URL |
| header_bg | `header_bg` | YES | Hex colour |
| header_text | `header_text` | YES | Hex colour |
| details_title | `details_title` | YES | Maps to `-en` |
| directions_text | `directions_text` | YES | Maps to `-en` |
| map_title | `map_title` | YES | Maps to `-en` |
| form_title | `form_title` | YES | Maps to `-en` |
| show_details | `show_details` | YES | Boolean |
| show_email | `show_email` | YES | Boolean |
| show_phone | `show_phone` | YES | Boolean |
| show_address | `show_address` | YES | Boolean |
| show_map | `show_map` | YES | Boolean |
| show_directions | `show_directions` | YES | Boolean |
| show_contact_form | `show_contact_form` | YES | Boolean |
| show_opening_hours | `show_opening_hours` | YES | Boolean |
| business_name | `business_name` | YES | Text |
| email | `email` | YES | Email address |
| phone | `phone` | YES | Phone number |
| address, city, state, zip, country | Direct keys | YES | Address fields |
| opening_hours | `opening_hours` | YES | Object: `{ monday: "09:00-17:00", ... }` |
| latitude | `latitude` | YES | Map lat |
| longitude | `longitude` | YES | Map lng |
| map_zoom | `map_zoom` | YES | Zoom level |
| map_height | `map_height` | YES | Map container height px |
| button_color | `button_color` | YES | Form submit button |
| faq_enabled | `faq_enabled` | YES | Boolean |
| meta_title | `meta_title` | YES | SEO title |
| meta_description | `meta_description` | YES | SEO description |

---

## About Us Page

**Available via:** `PUT /api/partner/websites/{websiteId}/content/page-about`

| Field | Partner API Key | In Swagger | Notes |
|-------|----------------|-----------|-------|
| enabled | `enabled` | YES | Boolean |
| title | `title-en` | YES | Multilingual |
| subtitle | `subtitle-en` | YES | Multilingual |
| menu_title | `menu-title-en` | YES | Multilingual |
| content_title | `content-title-en` | YES | Multilingual |
| content | `content-en` | YES | Multilingual HTML content |
| content_image | `content-image` | YES | URL |
| content_image_2 | `content-image-2` | YES | URL |
| image_position | `image-position` | YES | left/right |
| image_2_position | `image-2-position` | YES | left/right |
| hero_enabled | `hero-enabled` | YES | Boolean |
| hero_image | `hero-image` | YES | URL |
| header_bg | `header-bg` | YES | Hex colour |
| header_text | `header-text` | YES | Hex colour |
| bg | `bg` | YES | Background colour |
| title_color | `title-color` | YES | Title colour |
| text_color | `text-color` | YES | Text colour |
| transparent_header | `transparent-header` | YES | Boolean |
| menu_order | `menu-order` | YES | Navigation position |
| meta_title | `meta-title` | YES | SEO title |
| meta_description | `meta-description` | YES | SEO description |
| faq_enabled | `faq-enabled` | YES | Boolean |

---

## Blog Page

**Available via:** `PUT /api/partner/websites/{websiteId}/content/page-blog`

| Field | Partner API Key | In Swagger | Notes |
|-------|----------------|-----------|-------|
| enabled | `enabled` | YES | Boolean |
| menu_title | `menu-title-en` | YES | Multilingual: `-en`, `-fr`, `-es`, `-nl`, `-de` |
| title | `title-en` | YES | Multilingual (5 languages) |
| subtitle | `subtitle-en` | YES | Multilingual (5 languages) |
| menu_order | `menu-order` | YES | Navigation position |
| meta_title | `meta-title` | YES | SEO title |
| meta_description | `meta-description` | YES | SEO description |
| faq_enabled | `faq-enabled` | YES | Boolean |
| faq_list | `faq-list` | YES | FAQ items |

---

## Attractions Page

**Available via:** `PUT /api/partner/websites/{websiteId}/content/page-attractions`

| Field | Partner API Key | In Swagger | Notes |
|-------|----------------|-----------|-------|
| enabled | `enabled` | YES | Boolean |
| menu_title | `menu-title-en` | YES | Multilingual: `-en`, `-fr`, `-es`, `-nl`, `-de` |
| title | `title-en` | YES | Multilingual (5 languages) |
| subtitle | `subtitle-en` | YES | Multilingual (5 languages) |
| menu_order | `menu-order` | YES | Navigation position |
| meta_title | `meta-title` | YES | SEO title |
| meta_description | `meta-description` | YES | SEO description |
| faq_enabled | `faq-enabled` | YES | Boolean |
| faq_list | `faq-list` | YES | FAQ items |

---

## Offers Page

**Available via:** `PUT /api/partner/websites/{websiteId}/content/page-offers`

| Field | Partner API Key | In Swagger | Notes |
|-------|----------------|-----------|-------|
| enabled | `enabled` | YES | Boolean |
| menu_title | `menu-title-en` | YES | Multilingual: `-en`, `-fr`, `-es`, `-nl`, `-de` |
| title | `title-en` | YES | Multilingual (5 languages) |
| subtitle | `subtitle-en` | YES | Multilingual (5 languages) |
| menu_order | `menu-order` | YES | Navigation position |
| meta_title | `meta-title` | YES | SEO title |
| meta_description | `meta-description` | YES | SEO description |
| faq_enabled | `faq-enabled` | YES | Boolean |
| content | `content` | YES | Page content HTML |

---

## Terms & Conditions

**Available via:** `PUT /api/partner/websites/{websiteId}/content/page-terms`

| Field | Partner API Key | In Swagger | Notes |
|-------|----------------|-----------|-------|
| title | `title-en` | YES | Multilingual: `-en`, `-fr`, `-es`, `-nl` |
| source | `source` | YES | `custom` or `gas-account` |
| updated | `updated` | YES | Date string |
| content | `content-en` | YES | Multilingual HTML: `-en`, `-fr`, `-es`, `-nl` (custom mode) |
| menu_title | `menu-title-en` | YES | Multilingual |
| use_external | `use-external` | YES | Boolean — link to external T&Cs |
| external_url | `external-url` | YES | External URL |
| meta_title | `meta-title` | YES | SEO title |
| meta_description | `meta-description` | YES | SEO description |
| faq_enabled | `faq-enabled` | YES | Boolean |
| faq_list | `faq-list` | YES | FAQ items |

---

## Privacy Policy

**Dedicated endpoint:** `GET/PUT /api/partner/websites/{websiteId}/privacy`
**Also available via:** `PUT /api/partner/websites/{websiteId}/content/page-privacy`

| Field | Partner API Key | In Swagger | Notes |
|-------|----------------|-----------|-------|
| title | `title-en` | YES | Multilingual: `-en`, `-fr`, `-es`, `-nl` |
| updated | `updated` | YES | Date string |
| effective | `effective` | YES | Effective date |
| menu_title | `menu-title-en` | YES | Multilingual |
| business_name | `business-name` | YES | Company name |
| contact_email | `contact-email` | YES | Privacy contact email |
| business_address | `business-address` | YES | Company address |
| use_external | `use-external` | YES | Boolean |
| external_url | `external-url` | YES | External privacy URL |
| ext_heading | `ext-heading-en` | YES | Multilingual external link heading |
| ext_text | `ext-text-en` | YES | Multilingual external link description |
| meta_title | `meta-title` | YES | SEO title |
| meta_description | `meta-description` | YES | SEO description |
| faq_enabled | `faq-enabled` | YES | Boolean |
| faq_list | `faq-list` | YES | FAQ items |

---

## Icons / Favicon

**Dedicated endpoint:** `GET/PUT /api/partner/websites/{websiteId}/icons`

| Field | Partner API Key | In Swagger | Notes |
|-------|----------------|-----------|-------|
| favicon_url | `favicon_url` | YES | Browser tab icon (32x32 or 64x64 PNG/ICO) |
| apple_icon_url | `apple_icon_url` | YES | iOS home screen icon (180x180 PNG) |

---

## SEO & Analytics

**Available via:** `PUT /api/partner/websites/{websiteId}/content/seo`

| Field | Partner API Key | In Swagger | Notes |
|-------|----------------|-----------|-------|
| enabled | `enabled` | YES | Master toggle |
| meta_title | `meta-title` | YES | Default SEO title |
| meta_description | `meta-description` | YES | Default SEO description |
| og_image | `og-image` | YES | Open Graph image URL |
| google_analytics_id | `google-analytics-id` | YES | GA4 measurement ID (G-XXXXXXXXXX) |
| google_tag_manager_id | `google-tag-manager-id` | YES | GTM container ID |
| google_site_verification | `google-site-verification` | YES | Search Console verification |
| facebook_pixel_id | `facebook-pixel-id` | YES | Meta Pixel ID |
| include_schema | `include-schema` | YES | Boolean — JSON-LD schema |
| include_faqs | `include-faqs` | YES | Boolean — FAQ schema |

---

## Currency

**Available via:** `PUT /api/partner/websites/{websiteId}/content/currency`

| Field | Partner API Key | In Swagger | Notes |
|-------|----------------|-----------|-------|
| currency_mode | `currency-mode` | YES | `property` (use each property's currency) or `site` (single currency) |
| site_currency | `site-currency` | YES | ISO code: EUR, GBP, USD, CHF, etc. |

---

## Appendix A — Dedicated Partner Endpoints

| Endpoint | Methods | Status |
|----------|---------|--------|
| `/api/partner/websites/{id}/logo` | GET, PUT, DELETE | Available |
| `/api/partner/websites/{id}/header` | GET, PUT | Available |
| `/api/partner/websites/{id}/icons` | GET, PUT | Available |
| `/api/partner/websites/{id}/hero` | GET | Available |
| `/api/partner/websites/{id}/hero/badge` | PUT, DELETE | Available |
| `/api/partner/websites/{id}/hero/search` | PUT | Available |
| `/api/partner/websites/{id}/hero/meta` | PUT | Available |
| `/api/partner/websites/{id}/styles` | GET, PUT | Available |
| `/api/partner/websites/{id}/services` | GET, PUT | Available |
| `/api/partner/websites/{id}/rooms-page` | GET, PUT | Available |
| `/api/partner/websites/{id}/contact-page` | GET, PUT | Available |
| `/api/partner/websites/{id}/privacy` | GET, PUT | **New — added 16 March 2026** |
| `/api/partner/websites/{id}/content/{section}` | GET, PUT | Generic — covers all 25 sections |

**Not yet available as dedicated endpoints** (use generic `/content/{section}` instead):

- USP (`/content/usp`)
- Featured Properties (`/content/featured`)
- About homepage section (`/content/about`)
- CTA (`/content/cta`)
- Footer (`/content/footer`)
- About Us page (`/content/page-about`)
- Blog page (`/content/page-blog`)
- Attractions page (`/content/page-attractions`)
- Offers page (`/content/page-offers`)
- Terms (`/content/page-terms`)
- SEO (`/content/seo`)
- Currency (`/content/currency`)

---

## Appendix B — Multilingual Support

All text fields support language variants by appending a language suffix:

| Suffix | Language |
|--------|----------|
| `-en` | English (default) |
| `-fr` | French |
| `-es` | Spanish |
| `-nl` | Dutch |
| `-de` | German |

**Example:** To set a blog title in English and French:
```json
{
  "settings": {
    "title-en": "Our Blog",
    "title-fr": "Notre Blog"
  }
}
```

**5-language support:** Blog, Attractions, Offers pages
**4-language support:** Most other sections (en, fr, es, nl)

---

## Appendix C — Recent Changes (16 March 2026)

1. **New endpoint:** `GET/PUT /api/partner/websites/{id}/privacy` — dedicated privacy policy management with structured sub-sections
2. **Blog/Attractions/Offers:** Full multilingual support added (5 languages)
3. **Rooms page:** Filter toggles now available via dedicated PUT endpoint (`show_filters`, `show_property_filter`, `show_date_filters`, `show_guest_filter`)
4. **Contact page:** `map_height` field now accepted via dedicated PUT endpoint
5. **Header:** CTA button text now supports multilingual variants
6. **Swagger:** Updated with multilingual examples for blog, attractions, offers sections

---

*Full interactive API documentation: https://admin.gas.travel/api/docs*
