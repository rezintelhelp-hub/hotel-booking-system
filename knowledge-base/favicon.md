# How to Add a Favicon and Apple Touch Icon

**Category:** Websites
**Keywords:** favicon, icon, browser icon, tab icon, apple touch icon, iOS icon, home screen, brand icon

A favicon is the small icon that appears in the browser tab next to your site name. The Apple Touch Icon appears when guests save your site to their iPhone or iPad home screen.

## Step 1 — Go to your website settings

1. In GAS Admin, go to Create Websites
2. Find your site and click Edit or Settings
3. Click the **Header & Logo** tab
4. Scroll down to the Favicon and Icons section

## Step 2 — Upload your Favicon

1. Click the upload button next to **Favicon**
2. Select your favicon image file
3. Recommended size: 32x32px or 64x64px
4. Recommended format: PNG or ICO
5. A preview will appear once uploaded
6. Click Save

## Step 3 — Upload your Apple Touch Icon

1. Click the upload button next to **Apple Touch Icon**
2. Select your icon image file
3. Recommended size: 180x180px
4. Recommended format: PNG
5. This icon appears when guests add your site to their iPhone or iPad home screen
6. Click Save

## Tips for a good favicon

- Use a simple version of your logo or just your initials
- It must be recognisable at very small sizes
- Square images work best
- Transparent background PNG recommended

Once saved, your favicon appears in the browser tab within a few minutes. Clear your browser cache if you do not see it immediately (Ctrl+Shift+R).

## Partner API

Partners can also set icons programmatically:

```
PUT /api/partner/websites/{websiteId}/icons
{
  "favicon_url": "https://example.com/favicon.png",
  "apple_icon_url": "https://example.com/apple-touch-icon.png"
}
```

Need help? Contact the GAS team at hello@gas.travel
