# Per-site Custom CSS backup

Repo copies of the CSS pushed via `wp_update_custom_css_post()` to specific
WordPress sites on the multisite VPS. These blocks are written to the
`custom_css` post type per site (WP Customizer → Additional CSS), NOT to
the theme itself.

## Why keep copies here?

- **Rollback / reapply** — if the DB row gets wiped, the file here can be
  pushed back with one `wp eval-file` command.
- **Cross-reference** — when another client needs similar tweaks, copy
  from an existing site's file rather than reinventing.
- **Audit trail** — commit history shows when a rule was added/removed.

## How to reapply a file to its site

```bash
scp docs/per-site-css/<domain>.css root@72.61.207.109:/tmp/
ssh root@72.61.207.109 "cd /var/www/wordpress && wp --allow-root eval \
  \"echo (wp_update_custom_css_post(file_get_contents('/tmp/<domain>.css')))->ID;\" \
  --url=<domain>"
```

## Live sites with per-site CSS

| Site | File | Notes |
|---|---|---|
| dwellfortcom.sites.gas.travel | `dwellfortcom.sites.gas.travel.css` | Bespoke tweaks matching Anton's SetSeed global_design_mode_theme7 design (nav buttons black + 5px radius, hero Lora 44/Muli 20, hide cart, search pill button #69695e) |
