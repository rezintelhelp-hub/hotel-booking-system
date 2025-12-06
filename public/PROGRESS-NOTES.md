# GAS Admin Restructure - Progress Notes
## Session: 2025-12-06

---

## ✅ COMPLETED - Phase 1: Amenities Restructure

### New Amenities Structure (4 Tabs)

**Tab 1: 🛏️ Rooms**
- Bed configuration (add/remove beds with type & quantity)
- Room amenities checklist (beds, linens, essentials, laundry)

**Tab 2: 🚿 Bathrooms**
- Bathroom type selection (Ensuite/Adjacent/Shared)
- Bathroom amenities checklist

**Tab 3: 📺 In-Room Features**
- Entertainment, kitchen, wellness, work, safety, outdoor, parking amenities

**Tab 4: 📋 Terms & Policies**
- ⏰ Check-in/Check-out times (from/until, late fees)
- 🚭 Smoking policy (no/designated/allowed + fine)
- 🐕 Pet policy (no/yes/request + deposit, fee, pet types, max pets)
- 👨‍👩‍👧 Children policy (all ages/5+/12+/adults only + cots, highchairs)
- 🎉 Events policy (no/small gatherings/by arrangement)
- ♿ Accessibility options (7 checkboxes)
- 🏠 House rules (quiet hours, outside guests, ID required, additional notes)

### JavaScript Functions Added
- `switchAmenityTab(tabName)` - Tab switching
- `addBedRow()` / `removeBedRow()` - Bed configuration
- `saveAllAmenities()` - Saves all terms + room amenities
- `loadPropertyTerms(propertyId)` - Loads saved terms when property selected
- Pet policy auto-shows details when "yes" or "request" selected

### Link to Marketing Features
- Purple CTA card at bottom of Amenities
- Links correctly to Marketing Features & Tags section

---

## ✅ COMPLETED - Phase 2: Marketing Features Enhancement

### Added Sections

**🏛️ Property Type & Style**
- Property Type dropdown (Hotel, B&B, Guest House, etc.)
- Style checkboxes (Modern, Traditional, Rustic, Minimalist, Quirky, Cozy)

**🗺️ Nearby (within 15 mins)**
- Beach, Train Station, Airport, Public Transport
- Restaurants, Shopping, Golf, Ski, Hiking, Attractions

**🏆 Awards & Recognition**
- TripAdvisor CoE, Booking.com Award, Green Tourism, Michelin, AA Rated
- Star Rating dropdown (1-5 stars)
- Year Established field

### Existing Sections (already in place)
- 🏃 Activities & Experiences
- 👥 Guest Types & Accessibility  
- ✨ Themes & Experiences
- 📍 Location & Setting
- 🏠 Notable Amenities
- ➕ Custom Features

---

## 🔄 REMAINING - Phase 3: Website Builder Updates

### Still Todo:
1. Add Branding section (merge from Content → Branding)
2. Update Footer to pull contact from Properties
3. Update Terms page to auto-generate from Amenities → Terms
4. Update Privacy page with AI generation

---

## 🔄 REMAINING - Phase 4: Remove Content Section

### Still Todo:
1. Verify all data has new homes
2. Remove Content from nav
3. Remove Content views from HTML

---

## FILES UPDATED

- [gas-admin.html](computer:///mnt/user-data/outputs/gas-admin.html) - Amenities restructured, Marketing enhanced

---

## QUESTIONS/NOTES FOR YOU

1. **API Endpoints Needed**: The new Terms & Policies will need:
   - `GET /api/admin/properties/{id}/terms` - Load saved terms
   - `PUT /api/admin/properties/{id}/terms` - Save terms + beds

2. **Database**: May need a `property_terms` table or add JSON column to properties table

3. **Terms are Property-Level**: Check-in times, smoking, pets etc. are per-property, not per-room
   (Room-specific amenities like TV, WiFi are still per-room)

4. **Marketing Features**: Already has save/load functions (`savePropertyFeatures`, `loadPropertyFeatures`)

---

## NEXT STEPS WHEN YOU RETURN

1. Review the new Amenities tabs - do they look right?
2. Decide on Phases 3 & 4 (Website Builder + Remove Content)
3. Create the API endpoints for property terms
