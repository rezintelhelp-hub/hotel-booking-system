# Gallery, Offers & Dining Pages — Tuesday 25 March 2026

## Status: WAITING — Do not implement until after Elevate show

### Why waiting
Elevate has a big show on Sunday 23 March. The Section Builder refactor (generalizing `aboutSbSections` to support multiple pages) touches core working code. Risk of breaking existing About page Section Builder for live clients.

### Plan file
Full implementation plan: `.claude/plans/eventual-chasing-lantern.md`

### Summary
- **Gallery** — Section Builder page (same as About)
- **Dining** — Section Builder page (same as About)
- **Special Offers** — data-driven, pulls from existing offers/vouchers via `[gas_offers]` shortcode

### Key risk
Step 1 refactors all SB functions from hardcoded `aboutSbSections` to `sbState[slug]`. This is the core change that enables Gallery and Dining. Must be done carefully with backward-compat shims.

### Ready to go
- Plan is fully researched and approved
- All existing infrastructure identified (SECTION_DEFAULTS, nav menu items, shortcodes, API endpoints)
- Just needs implementation time with no live event pressure
