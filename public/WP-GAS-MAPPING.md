# WordPress Customizer → GAS Admin Complete Mapping

## Overview
This document maps every WordPress Customizer field to GAS Admin fields.
All colors must be in HEX format.

---

## 1. HEADER & LOGO (GAS: `wb-header`)

### Logo Section
| WP Setting | WP Control Type | GAS Field ID | GAS Type | Default |
|------------|-----------------|--------------|----------|---------|
| `custom_logo` | Image Upload | `wb-header-logo` | File Upload | - |
| `blogname` | Text | `wb-header-site-name` | Text | - |
| `blogdescription` | Text | `wb-header-tagline` | Text | - |

### Header Colors
| WP Setting | WP Control Type | GAS Field ID | GAS Type | Default |
|------------|-----------------|--------------|----------|---------|
| `developer_header_bg_color` | Color | `wb-header-bg-color` | Color+Hex | #ffffff |
| `developer_header_text_color` | Color | `wb-header-text-color` | Color+Hex | #1e293b |
| `developer_header_logo_color` | Color | `wb-header-logo-color` | Color+Hex | #1e293b |
| `developer_header_cta_bg` | Color | `wb-header-cta-bg` | Color+Hex | #2563eb |
| `developer_header_cta_text` | Color | `wb-header-cta-text` | Color+Hex | #ffffff |
| `developer_header_border_color` | Color | `wb-header-border-color` | Color+Hex | #e5e7eb |

### Header Typography
| WP Setting | WP Control Type | GAS Field ID | GAS Type | Default |
|------------|-----------------|--------------|----------|---------|
| `developer_header_font` | Select | `wb-header-font` | Select | Inter |
| `developer_header_font_size` | Range (12-24) | `wb-header-font-size` | Range | 15 |
| `developer_header_font_weight` | Select | `wb-header-font-weight` | Select | 500 |
| `developer_header_text_transform` | Select | `wb-header-text-transform` | Select | none |

### Header Options
| WP Setting | WP Control Type | GAS Field ID | GAS Type | Default |
|------------|-----------------|--------------|----------|---------|
| `developer_menu_layout` | Select | `wb-header-layout` | Select | logo-left |
| `developer_header_transparent` | Checkbox | `wb-header-transparent` | Checkbox | true |
| `developer_header_sticky` | Checkbox | `wb-header-sticky` | Checkbox | true |
| `developer_header_border` | Checkbox | `wb-header-border` | Checkbox | false |

### Navigation Menu (Custom - not in WP Customizer)
| GAS Field ID | GAS Type | Purpose |
|--------------|----------|---------|
| `wb-header-show-rooms` | Checkbox | Show "Rooms" link |
| `wb-header-show-about` | Checkbox | Show "About" link |
| `wb-header-show-contact` | Checkbox | Show "Contact" link |
| `wb-header-show-blog` | Checkbox | Show "Blog" link |
| `wb-header-book-button` | Text | Book Now button text |

---

## 2. HERO SECTION (GAS: `wb-hero`)

### Hero Content
| WP Setting | WP Control Type | GAS Field ID | GAS Type | Default |
|------------|-----------------|--------------|----------|---------|
| `developer_hero_title` | Text | `wb-hero-headline` | Text | Find Your Perfect... |
| `developer_hero_subtitle` | Text | `wb-hero-subheadline` | Text | Discover stunning... |
| `developer_hero_badge` | Text | `wb-hero-button-text` | Text | Welcome to Paradise |
| `developer_hero_badge_link` | Text | `wb-hero-button-link` | Text | - |

### Hero Image & Overlay
| WP Setting | WP Control Type | GAS Field ID | GAS Type | Default |
|------------|-----------------|--------------|----------|---------|
| `developer_hero_bg` | Image | `wb-hero-image-url` | File+URL | - |
| `developer_hero_overlay_color` | Color | `wb-hero-overlay-color` | Color+Hex | #0f172a |
| `developer_hero_opacity` | Range (0-100) | `wb-hero-overlay` | Range | 30 |
| `developer_hero_height` | Range (50-100) | `wb-hero-height` | Range | 90 |

### Hero Badge Styling
| WP Setting | WP Control Type | GAS Field ID | GAS Type | Default |
|------------|-----------------|--------------|----------|---------|
| `developer_hero_badge_bg` | Text (rgba) | `wb-hero-badge-bg` | Color+Hex | rgba(255,255,255,0.15) |
| `developer_hero_badge_text` | Color | `wb-hero-badge-text` | Color+Hex | #ffffff |
| `developer_hero_badge_border` | Text (rgba) | `wb-hero-badge-border` | Color+Hex | rgba(255,255,255,0.3) |

### Trust Badges
| WP Setting | WP Control Type | GAS Field ID | GAS Type | Default |
|------------|-----------------|--------------|----------|---------|
| `developer_hero_trust_1` | Text | `wb-hero-trust-1` | Text | Instant Booking |
| `developer_hero_trust_2` | Text | `wb-hero-trust-2` | Text | Best Price Guarantee |
| `developer_hero_trust_3` | Text | `wb-hero-trust-3` | Text | 24/7 Support |

---

## 3. SEARCH WIDGET (GAS: `wb-hero` - subsection)

| WP Setting | WP Control Type | GAS Field ID | GAS Type | Default |
|------------|-----------------|--------------|----------|---------|
| `developer_search_bg` | Color | `wb-hero-search-bg` | Color+Hex | #ffffff |
| `developer_search_opacity` | Range (0-100) | `wb-hero-search-opacity` | Range | 100 |
| `developer_search_radius` | Range (0-32) | `wb-hero-search-radius` | Range | 16 |
| `developer_search_padding` | Range (0-48) | `wb-hero-search-padding` | Range | 24 |
| `developer_search_max_width` | Range (600-1200) | `wb-hero-search-max-width` | Range | 900 |
| `developer_search_scale` | Range (80-120) | `wb-hero-search-scale` | Range | 100 |
| `developer_search_btn_bg` | Color | `wb-hero-search-btn-bg` | Color+Hex | #2563eb |
| `developer_search_btn_text` | Color | `wb-hero-search-btn-text` | Color+Hex | #ffffff |
| `developer_search_below_text` | Text | `wb-hero-search-below-text` | Text | - |

---

## 4. INTRO SECTION (GAS: `wb-intro`)

| WP Setting | WP Control Type | GAS Field ID | GAS Type | Default |
|------------|-----------------|--------------|----------|---------|
| `developer_intro_enabled` | Checkbox | `wb-intro-enabled` | Checkbox | true |
| `developer_intro_bg` | Color | `wb-intro-bg` | Color+Hex | #ffffff |
| `developer_intro_text_color` | Color | `wb-intro-text-color` | Color+Hex | #1e293b |
| `developer_intro_title` | Text | `wb-intro-title` | Text | Welcome to... |
| `developer_intro_title_size` | Range (24-72) | `wb-intro-title-size` | Range | 36 |
| `developer_intro_text` | Textarea | `wb-intro-text` | Textarea | We are delighted... |
| `developer_intro_text_size` | Range (14-24) | `wb-intro-text-size` | Range | 18 |
| `developer_intro_max_width` | Range (600-1200) | `wb-intro-max-width` | Range | 800 |
| `developer_intro_btn_text` | Text | `wb-intro-btn-text` | Text | - |
| `developer_intro_btn_url` | Text | `wb-intro-btn-url` | Text | - |
| `developer_intro_btn_bg` | Color | `wb-intro-btn-bg` | Color+Hex | #2563eb |
| `developer_intro_btn_text_color` | Color | `wb-intro-btn-text-color` | Color+Hex | #ffffff |

---

## 5. FEATURED PROPERTIES (GAS: `wb-featured`)

| WP Setting | WP Control Type | GAS Field ID | GAS Type | Default |
|------------|-----------------|--------------|----------|---------|
| `developer_featured_mode` | Select | `wb-featured-mode` | Select | all |
| `developer_featured_count` | Range (1-12) | `wb-featured-count` | Range | 3 |
| `developer_featured_ids` | Room Selector | `wb-featured-ids` | Multi-select | - |
| `developer_featured_title` | Text | `wb-featured-title` | Text | Featured Properties |
| `developer_featured_subtitle` | Textarea | `wb-featured-subtitle` | Textarea | Discover our... |
| `developer_featured_btn_text` | Text | `wb-featured-btn-text` | Text | View All Properties |
| `developer_featured_btn_url` | Text | `wb-featured-btn-url` | Text | /book-now/ |
| `developer_featured_btn_bg` | Color | `wb-featured-btn-bg` | Color+Hex | #2563eb |
| `developer_featured_btn_text_color` | Color | `wb-featured-btn-text-color` | Color+Hex | #ffffff |

---

## 6. ABOUT SECTION (GAS: `wb-about`)

| WP Setting | WP Control Type | GAS Field ID | GAS Type | Default |
|------------|-----------------|--------------|----------|---------|
| `developer_about_image` | Image | `wb-about-image-url` | File+URL | - |
| `developer_about_title` | Text | `wb-about-title` | Text | Experience Luxury... |
| `developer_about_title_size` | Range (24-72) | `wb-about-title-size` | Range | 36 |
| `developer_about_text` | Textarea | `wb-about-text` | Textarea | Our carefully curated... |
| `developer_about_text_size` | Range (14-24) | `wb-about-text-size` | Range | 16 |
| `developer_about_layout` | Select | `wb-about-layout` | Select | image-left |
| `developer_about_btn_text` | Text | `wb-about-btn-text` | Text | Learn More |
| `developer_about_btn_url` | Text | `wb-about-btn-url` | Text | /about/ |
| `developer_about_btn_bg` | Color | `wb-about-btn-bg` | Color+Hex | #2563eb |
| `developer_about_btn_text_color` | Color | `wb-about-btn-text-color` | Color+Hex | #ffffff |

### About Features (Checkmarks)
| WP Setting | WP Control Type | GAS Field ID | GAS Type | Default |
|------------|-----------------|--------------|----------|---------|
| `developer_about_feature_1` | Text | `wb-about-feature-1` | Text | Spacious Bedrooms |
| `developer_about_feature_2` | Text | `wb-about-feature-2` | Text | Luxury Bathrooms |
| `developer_about_feature_3` | Text | `wb-about-feature-3` | Text | Prime Locations |
| `developer_about_feature_4` | Text | `wb-about-feature-4` | Text | Full Amenities |
| `developer_about_feature_5` | Text | `wb-about-feature-5` | Text | Entertainment Areas |
| `developer_about_feature_6` | Text | `wb-about-feature-6` | Text | Private Parking |

---

## 7. REVIEWS SECTION (GAS: `wb-reviews`)

| WP Setting | WP Control Type | GAS Field ID | GAS Type | Default |
|------------|-----------------|--------------|----------|---------|
| `developer_reviews_enabled` | Checkbox | `wb-reviews-enabled` | Checkbox | false |
| `developer_reviews_title` | Text | `wb-reviews-title` | Text | What Our Guests Say |
| `developer_reviews_subtitle` | Text | `wb-reviews-subtitle` | Text | Real reviews from... |
| `developer_reviews_bg` | Color | `wb-reviews-bg` | Color+Hex | #0f172a |
| `developer_reviews_text_color` | Color | `wb-reviews-text-color` | Color+Hex | #ffffff |
| `developer_reviews_widget` | Textarea (HTML) | `wb-reviews-widget` | Textarea | - |

---

## 8. CTA SECTION (GAS: `wb-cta`)

| WP Setting | WP Control Type | GAS Field ID | GAS Type | Default |
|------------|-----------------|--------------|----------|---------|
| `developer_cta_enabled` | Checkbox | `wb-cta-enabled` | Checkbox | true |
| `developer_cta_title` | Text | `wb-cta-title` | Text | Ready to Book? |
| `developer_cta_title_size` | Range (24-72) | `wb-cta-title-size` | Range | 36 |
| `developer_cta_text` | Textarea | `wb-cta-text` | Textarea | Find your perfect... |
| `developer_cta_text_size` | Range (14-24) | `wb-cta-text-size` | Range | 18 |
| `developer_cta_background` | Color | `wb-cta-background` | Color+Hex | #2563eb |
| `developer_cta_text_color` | Color | `wb-cta-text-color` | Color+Hex | #ffffff |
| `developer_cta_btn_text` | Text | `wb-cta-btn-text` | Text | Browse Properties |
| `developer_cta_btn_url` | Text | `wb-cta-btn-url` | Text | /book-now/ |
| `developer_cta_btn_bg` | Color | `wb-cta-btn-bg` | Color+Hex | #ffffff |
| `developer_cta_btn_text_color` | Color | `wb-cta-btn-text-color` | Color+Hex | #2563eb |

---

## 9. FOOTER (GAS: `wb-footer`)

| WP Setting | WP Control Type | GAS Field ID | GAS Type | Default |
|------------|-----------------|--------------|----------|---------|
| `developer_footer_bg` | Color | `wb-footer-bg` | Color+Hex | #0f172a |
| `developer_footer_text` | Color | `wb-footer-text` | Color+Hex | #ffffff |
| `developer_footer_layout` | Select | `wb-footer-layout` | Select | default |
| `developer_footer_copyright` | Text | `wb-footer-copyright` | Text | © 2025 All rights... |

---

## 10. CONTACT INFO (GAS: `wb-contact` or `wb-footer`)

| WP Setting | WP Control Type | GAS Field ID | GAS Type | Default |
|------------|-----------------|--------------|----------|---------|
| `developer_email` | Text | `wb-contact-email` | Text | - |
| `developer_phone` | Text | `wb-contact-phone` | Text | - |
| `developer_address` | Textarea | `wb-contact-address` | Textarea | - |

---

## 11. SOCIAL MEDIA (GAS: `wb-social` or `wb-footer`)

| WP Setting | WP Control Type | GAS Field ID | GAS Type | Default |
|------------|-----------------|--------------|----------|---------|
| `developer_social_facebook` | Text | `wb-social-facebook` | Text | - |
| `developer_social_instagram` | Text | `wb-social-instagram` | Text | - |
| `developer_social_twitter` | Text | `wb-social-twitter` | Text | - |
| `developer_social_linkedin` | Text | `wb-social-linkedin` | Text | - |
| `developer_social_youtube` | Text | `wb-social-youtube` | Text | - |
| `developer_social_tiktok` | Text | `wb-social-tiktok` | Text | - |
| `developer_social_pinterest` | Text | `wb-social-pinterest` | Text | - |
| `developer_social_tripadvisor` | Text | `wb-social-tripadvisor` | Text | - |

---

## 12. GLOBAL STYLES (GAS: `wb-styles`)

### Colors
| WP Setting | WP Control Type | GAS Field ID | GAS Type | Default |
|------------|-----------------|--------------|----------|---------|
| `developer_primary_color` | Color | `wb-styles-primary-color` | Color+Hex | #2563eb |
| `developer_secondary_color` | Color | `wb-styles-secondary-color` | Color+Hex | #7c3aed |
| `developer_accent_color` | Color | `wb-styles-accent-color` | Color+Hex | #f59e0b |
| `developer_link_color` | Color | `wb-styles-link-color` | Color+Hex | #2563eb |

### Typography
| WP Setting | WP Control Type | GAS Field ID | GAS Type | Default |
|------------|-----------------|--------------|----------|---------|
| `developer_heading_font` | Select | `wb-styles-heading-font` | Select | Inter |
| `developer_body_font` | Select | `wb-styles-body-font` | Select | Inter |
| `developer_page_title_size` | Range (24-72) | `wb-styles-title-size` | Range | 48 |
| `developer_body_text_size` | Range (14-20) | `wb-styles-body-size` | Range | 16 |

### Buttons
| WP Setting | WP Control Type | GAS Field ID | GAS Type | Default |
|------------|-----------------|--------------|----------|---------|
| `developer_btn_primary_bg` | Color | `wb-styles-btn-primary-bg` | Color+Hex | #2563eb |
| `developer_btn_primary_text` | Color | `wb-styles-btn-primary-text` | Color+Hex | #ffffff |
| `developer_btn_secondary_bg` | Color | `wb-styles-btn-secondary-bg` | Color+Hex | transparent |
| `developer_btn_secondary_text` | Color | `wb-styles-btn-secondary-text` | Color+Hex | #2563eb |
| `developer_btn_radius` | Range (0-24) | `wb-styles-btn-radius` | Range | 8 |

### Custom CSS
| WP Setting | WP Control Type | GAS Field ID | GAS Type | Default |
|------------|-----------------|--------------|----------|---------|
| `developer_custom_css` | Textarea | `wb-styles-custom-css` | Textarea | - |

---

## 13. SECTION BACKGROUNDS (GAS: `wb-styles` or separate)

| WP Setting | WP Control Type | GAS Field ID | GAS Type | Default |
|------------|-----------------|--------------|----------|---------|
| `developer_featured_bg` | Color | `wb-styles-featured-bg` | Color+Hex | #ffffff |
| `developer_about_bg` | Color | `wb-styles-about-bg` | Color+Hex | #f8fafc |
| `developer_testimonials_bg` | Color | `wb-styles-testimonials-bg` | Color+Hex | #0f172a |
| `developer_cta_bg` | Color | `wb-styles-cta-bg` | Color+Hex | #2563eb |

---

## SUMMARY: GAS Admin Menu Structure

```
WEBSITE BUILDER
├── 📌 Header & Logo
│   ├── Logo (upload)
│   ├── Site Name
│   ├── Tagline
│   ├── Header Colors (bg, text, logo, cta bg, cta text, border)
│   ├── Typography (font, size, weight, transform)
│   ├── Layout (logo-left, logo-center, logo-right, stacked)
│   ├── Options (transparent, sticky, border)
│   └── Navigation (show rooms, about, contact, blog, book button text)
│
├── 🖼️ Hero Section
│   ├── Headline
│   ├── Subheadline
│   ├── Badge Text & Link
│   ├── Badge Styling (bg, text, border colors)
│   ├── Background Image (upload)
│   ├── Overlay (color, opacity)
│   ├── Height
│   ├── Trust Badges (1, 2, 3)
│   └── Search Widget (bg, opacity, radius, padding, max-width, scale, btn colors, below text)
│
├── 📝 Intro Section
│   ├── Enabled toggle
│   ├── Background & Text colors
│   ├── Title & Title Size
│   ├── Text & Text Size
│   ├── Max Width
│   └── Button (text, url, colors)
│
├── 🏠 Featured Properties
│   ├── Mode (all, count, specific)
│   ├── Count
│   ├── Room IDs
│   ├── Title & Subtitle
│   └── Button (text, url, colors)
│
├── ℹ️ About Section
│   ├── Image (upload)
│   ├── Title & Title Size
│   ├── Text & Text Size
│   ├── Layout (image-left, image-right)
│   ├── Features (1-6)
│   └── Button (text, url, colors)
│
├── ⭐ Reviews Section
│   ├── Enabled toggle
│   ├── Title & Subtitle
│   ├── Background & Text colors
│   └── Widget Code (HTML)
│
├── 📢 CTA Section
│   ├── Enabled toggle
│   ├── Title & Title Size
│   ├── Text & Text Size
│   ├── Background & Text colors
│   └── Button (text, url, colors)
│
├── 🦶 Footer
│   ├── Background & Text colors
│   ├── Layout
│   ├── Copyright
│   ├── Contact (email, phone, address)
│   └── Social Links (8 networks)
│
└── 🎨 Styles & Colors
    ├── Primary/Secondary/Accent/Link colors
    ├── Heading & Body fonts
    ├── Title & Body text sizes
    ├── Button styles (primary, secondary, radius)
    ├── Section backgrounds
    └── Custom CSS
```

---

## TOTAL FIELD COUNT

| Section | Fields |
|---------|--------|
| Header & Logo | 21 |
| Hero Section | 23 |
| Intro Section | 12 |
| Featured Properties | 9 |
| About Section | 14 |
| Reviews Section | 6 |
| CTA Section | 11 |
| Footer + Contact + Social | 16 |
| Styles & Colors | 17 |
| **TOTAL** | **129 fields** |

---

## IMPLEMENTATION NOTES

1. **Color fields**: Always use Color picker + Hex text input side by side
2. **Range fields**: Show current value next to slider
3. **Image fields**: Upload → auto-fill URL field → show preview
4. **All fields must save to `website_settings` table by section**
5. **Sync to WP uses `set_theme_mod()` function**
