# Travel Agent Distribution System - Structure Reference

## Overview

The Travel Agent system allows property owners to grant booking access to Travel Agents. This mirrors the Agency Management system but works in reverse - property owners control which Travel Agents can access their inventory.

---

## Database Structure

### Existing Tables Used

```sql
-- accounts table (role = 'travel_agent')
-- Properties with travel agent role can book on behalf of guests

-- distribution_access table (already created)
CREATE TABLE distribution_access (
    id SERIAL PRIMARY KEY,
    property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    travel_agent_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending',  -- pending, approved, rejected, revoked
    commission_rate DECIMAL(5,2),          -- Optional: % commission for agent
    notes TEXT,
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMP,
    CONSTRAINT unique_property_agent UNIQUE (property_id, travel_agent_id)
);
```

### Key Fields on Properties Table
```sql
-- Already exists
distribution_mode VARCHAR(20) DEFAULT 'private'  -- 'open', 'request', 'private'
owner_price DECIMAL(10,2)                        -- Base price owner wants
```

---

## Flow Comparison

### Agency Management (What We Built)
```
┌─────────────────┐         ┌─────────────────┐
│  Property Owner │ ──────► │     Agency      │
│  (Admin)        │ REQUEST │  (Agency Admin) │
└─────────────────┘         └─────────────────┘
                                    │
                                 APPROVE
                                    │
                                    ▼
                    Agency can now VIEW/MANAGE
                    all of Property Owner's data
```

**Key Points:**
- Owner REQUESTS to be managed
- Agency APPROVES/REJECTS
- Uses `managed_by_id` on accounts table
- Uses `management_requests` table
- Agency sees ALL properties from managed accounts

---

### Travel Agent Distribution (To Build)
```
┌─────────────────┐         ┌─────────────────┐
│  Property Owner │ ◄────── │  Travel Agent   │
│  (Admin)        │ REQUEST │ (travel_agent)  │
└─────────────────┘         └─────────────────┘
        │
     APPROVE
        │
        ▼
Travel Agent can now BOOK
specific properties only
```

**Key Points:**
- Travel Agent REQUESTS access to specific properties
- Property Owner APPROVES/REJECTS per-property
- Uses `distribution_access` table (property-level, not account-level)
- Travel Agent only sees properties they have access to

---

## Distribution Modes

| Mode | Description | Travel Agent Action |
|------|-------------|---------------------|
| `private` | No distribution | Cannot see property |
| `request` | Request required | Can request access, owner approves |
| `open` | Auto-approve | Instant access granted |

---

## API Endpoints Needed

### For Travel Agents

```javascript
// Search available properties (respects distribution_mode)
GET /api/distribution/properties
    ?city=&country=&property_type=&amenity=

// Request access to a property
POST /api/distribution/request
    { property_id, message }

// View my access requests
GET /api/distribution/my-requests
    ?status=pending|approved|rejected

// View properties I have access to
GET /api/distribution/my-properties
```

### For Property Owners

```javascript
// View access requests for my properties
GET /api/distribution/requests
    ?property_id=&status=

// Approve/Reject request
POST /api/distribution/requests/:id/respond
    { status: 'approved'|'rejected', notes }

// Revoke access
POST /api/distribution/access/:id/revoke

// Set property distribution mode
PUT /api/properties/:id/distribution
    { distribution_mode, owner_price }
```

---

## UI Components Needed

### 1. Property Owner Side (Admin Dashboard)

**Location:** Property Edit Modal → New "Distribution" tab

```
┌─────────────────────────────────────────────┐
│ 🌐 Distribution Settings                    │
├─────────────────────────────────────────────┤
│ Distribution Mode: [Private ▼]              │
│   ○ Private - Not available to agents       │
│   ○ Request - Agents must request access    │
│   ○ Open - Auto-approve all requests        │
│                                             │
│ Base Price: £[____] per night               │
├─────────────────────────────────────────────┤
│ 🧳 Travel Agent Access (3 agents)           │
│ ┌─────────────────────────────────────────┐ │
│ │ Agent Name     │ Status   │ Actions     │ │
│ │ TravelCo       │ Approved │ [Revoke]    │ │
│ │ BookingsPlus   │ Pending  │ [✓] [✗]     │ │
│ │ HolidayHub     │ Approved │ [Revoke]    │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

**Location:** Sidebar → New "Distribution Requests" page

```
┌─────────────────────────────────────────────┐
│ 📋 Distribution Requests                    │
├─────────────────────────────────────────────┤
│ Filter: [All Properties ▼] [All Status ▼]  │
├─────────────────────────────────────────────┤
│ Property        │ Agent      │ Status │ Act │
│ Beach Villa    │ TravelCo   │ Pending│[✓][✗]│
│ City Apartment │ BookingsPlus│ Pending│[✓][✗]│
│ Lake House     │ HolidayHub │ Approved│     │
└─────────────────────────────────────────────┘
```

### 2. Travel Agent Side (Agent Dashboard)

**Location:** Sidebar → "Available Properties" (search/browse)

```
┌─────────────────────────────────────────────┐
│ 🔍 Find Properties                          │
├─────────────────────────────────────────────┤
│ City: [________] Country: [________]        │
│ Type: [Any ▼]   Amenities: [Select...]      │
│                              [Search]       │
├─────────────────────────────────────────────┤
│ 🏨 Beach Villa - Marbella, Spain            │
│    🛏️ 3 beds | 👥 6 guests | ⭐ 4.8        │
│    Status: 🟢 Open Access                   │
│    [Request Access] or [Book Now]           │
├─────────────────────────────────────────────┤
│ 🏨 City Loft - London, UK                   │
│    🛏️ 1 bed | 👥 2 guests | ⭐ 4.5         │
│    Status: 🟡 Request Required              │
│    [Request Access]                         │
└─────────────────────────────────────────────┘
```

**Location:** Sidebar → "My Properties" (properties I can book)

```
┌─────────────────────────────────────────────┐
│ 🧳 My Properties (12)                       │
├─────────────────────────────────────────────┤
│ Property        │ Owner      │ Commission  │
│ Beach Villa    │ SunStays   │ 10%         │  [Book]
│ City Apartment │ CityLets   │ 12%         │  [Book]
│ Lake House     │ LakeRetreat│ 8%          │  [Book]
└─────────────────────────────────────────────┘
```

**Location:** Sidebar → "My Requests" (pending access requests)

```
┌─────────────────────────────────────────────┐
│ 📋 My Access Requests                       │
├─────────────────────────────────────────────┤
│ Property        │ Owner      │ Status      │
│ Mountain Chalet │ AlpineStays│ ⏳ Pending  │ [Cancel]
│ Desert Villa   │ SandDunes  │ ❌ Rejected │
│ Seaside Cottage│ CoastalCo  │ ✅ Approved │
└─────────────────────────────────────────────┘
```

---

## Server Logic for Properties (Travel Agent View)

```javascript
// Similar to agency logic in /api/db/properties
app.get('/api/distribution/my-properties', async (req, res) => {
  const { travel_agent_id } = req.query;
  
  // Get properties where travel agent has approved access
  const result = await pool.query(`
    SELECT p.*, da.commission_rate, a.name as owner_name
    FROM properties p
    JOIN distribution_access da ON p.id = da.property_id
    JOIN accounts a ON p.account_id = a.id
    WHERE da.travel_agent_id = $1 
      AND da.status = 'approved'
    ORDER BY p.name
  `, [travel_agent_id]);
  
  res.json({ success: true, properties: result.rows });
});
```

---

## Booking Flow for Travel Agents

```
1. Travel Agent selects property from "My Properties"
2. Searches availability (same as regular booking)
3. Enters guest details (booking on behalf of)
4. Books with:
   - guest_name, guest_email, guest_phone
   - booked_by_agent_id = travel_agent_id
   - agent_commission = calculated from rate
5. Owner sees booking with "Booked by: TravelCo" tag
6. Commission tracking for reporting
```

### Booking Table Additions
```sql
ALTER TABLE bookings ADD COLUMN booked_by_agent_id INTEGER REFERENCES accounts(id);
ALTER TABLE bookings ADD COLUMN agent_commission DECIMAL(10,2);
```

---

## Permission Matrix

| Action | Property Owner | Travel Agent | Agency Admin | Master Admin |
|--------|---------------|--------------|--------------|--------------|
| Set distribution mode | ✅ Own properties | ❌ | ✅ Managed | ✅ All |
| View distribution requests | ✅ Own | ❌ | ✅ Managed | ✅ All |
| Approve/Reject requests | ✅ Own | ❌ | ✅ Managed | ✅ All |
| Request property access | ❌ | ✅ | ❌ | ❌ |
| View available properties | ❌ | ✅ | ❌ | ✅ |
| Book as agent | ❌ | ✅ Approved only | ❌ | ❌ |

---

## Implementation Phases

### Phase 1: Property Distribution Settings
- [ ] Add distribution mode UI to property edit
- [ ] Add owner_price field
- [ ] Create distribution settings endpoint

### Phase 2: Travel Agent Requests
- [ ] Create travel agent role/account type
- [ ] Build "Available Properties" search page
- [ ] Build request access flow
- [ ] Build "My Requests" page

### Phase 3: Property Owner Approvals
- [ ] Build "Distribution Requests" page for owners
- [ ] Add approve/reject functionality
- [ ] Add revoke access functionality

### Phase 4: Travel Agent Booking
- [ ] Build "My Properties" page for agents
- [ ] Modify booking flow for agent bookings
- [ ] Add commission tracking
- [ ] Add "Booked by Agent" display for owners

### Phase 5: Reporting
- [ ] Agent commission reports
- [ ] Owner distribution analytics
- [ ] Booking source breakdown

---

## Reusable Patterns from Agency Management

| Agency Pattern | Travel Agent Equivalent |
|---------------|------------------------|
| `management_requests` table | `distribution_access` table |
| `managed_by_id` on accounts | `distribution_access` links (property-level) |
| Agency sees all managed properties | Agent sees only approved properties |
| Request → Approve → Access | Request → Approve → Book |
| `loadManagementRequests()` | `loadDistributionRequests()` |
| `saveAgencyAssignment()` | `approveDistributionAccess()` |

---

## Files to Modify

1. **server.js** - Add distribution endpoints
2. **gas-admin.html** - Add Travel Agent UI components
3. **Database** - Tables already exist, may need booking columns

---

## Notes

- Unlike Agency Management (account-level), Distribution is property-level
- A Travel Agent might have access to some properties from Owner A, but not others
- Commission rates can vary per property-agent relationship
- Consider: Auto-expire access after X months? Renewal flow?
