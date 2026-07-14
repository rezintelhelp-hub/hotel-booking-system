# Repuso — client onboarding

How to connect a client's Repuso reviews to GAS so the ⭐ Reviews report
and the Insights view see *every* review (including moderated ≤3-star
ones the public widget API filters out).

---

## The two pieces of Repuso we use

| | Public widget | Private admin API |
|---|---|---|
| **URL** | `api.thereviewsplace.com` | `api.revue.us` |
| **Auth** | Widget key (public) | HTTP Basic (session-derived token) |
| **Returns** | Only approved 4-5★ reviews | Every review, including moderated ≤3★ |
| **Used for** | Reviews block on the client's website | GAS Reports + Insights analysis |
| **Field in GAS** | Repuso Widget Key (Display) | Basic auth header + Website ID (Analytics) |

The **public widget** was already wired — every existing Repuso site has
a widget key set. The **private admin API** is the new bit and needs to
be captured per client.

---

## Capture the Basic auth token (5 minutes per client)

You need two values from Repuso's admin panel:

1. The `Authorization` header — a string starting with `Basic ` followed
   by a long base64 blob
2. The website ID — a short integer like `9094`

Steps:

1. Log in to https://repuso.com/app with the client's account
2. Open **DevTools** — right-click anywhere, then Inspect (or `F12`)
3. Click the **Network** tab
4. Tick **Preserve log** so requests survive page reloads
5. In the filter box type `revue.us`
6. In Repuso, click any tab that loads reviews (e.g. Reviews → All)
7. In DevTools you should now see a request like
   `posts/all?before_ts=…&website=9094`
8. Click that request → **Headers** panel on the right
9. Under **Request Headers**, find `Authorization:` — copy the full value
   (starts with `Basic ` — capital B, one space, then the base64 blob).
   Right-click the header row → **Copy value** is easiest.
10. Under **Query String Parameters** find `website:` — that's the
    Website ID.

## Paste into GAS

1. GAS Admin → select the client's account
2. **Generators → Reviews → Settings**
3. Set **Source** to `Repuso`
4. Paste the Basic string into **Authorization header**
5. Paste the number into **Website ID**
6. Click **Save analytics settings** → **Sync now**

You'll see something like `249 reviews stored · last synced ...`.

---

## What the Basic string actually is

Decoded, it's `:{api-token}` — an empty username, colon, then a long hex
token. That token is the real credential; the "Basic" wrapping is
HTTP-Basic-Auth compliant packaging. Repuso doesn't (yet) expose the
raw token in their dashboard, which is why DevTools is the only way in.

Ask Repuso support for a proper API key — this saves 5 minutes per
client onboarding and removes the session-expiry risk (see below).

---

## Watch-outs

- **Token expiry**: the Basic string is derived from the operator's
  logged-in session. When the client logs out of Repuso, or their
  session times out, sync will start returning 401. Re-capture the
  token the same way.

- **One token per client**: each client's Repuso login has its own
  token — you cannot use one token across accounts.

- **Treat like a password**: the Basic string grants full admin access
  to that Repuso account. Don't screenshot it, don't paste it into
  channels or tickets.

- **Widget key stays**: don't disturb the existing public widget key
  when adding the analytics credentials. The two coexist.

---

## Troubleshooting

**`need either (repuso_basic_auth + repuso_website_id) or repuso_analytics_widget_key`**
The save didn't persist. Reload the page and check the two fields are
in the visible **Generators → Reviews → Settings** panel (not any old
Apps → Reviews view).

**`column "repuso_analytics_widget_key" does not exist`**
The DB migration hasn't run against this Railway deploy yet. Hit
`https://admin.gas.travel/api/setup-accounts-billing` once (idempotent)
then retry.

**Sync says `0 reviews stored`**
Either the Basic token expired (re-capture), or the Website ID is wrong.
Cross-check the `website=NNNN` query param in DevTools.

**Only seeing TripAdvisor / one source**
That's likely genuinely the mix on the client's Repuso account. Check
their Repuso dashboard → Sources tab.

---

## Related

- Schema + endpoints: `server.js` — search for `repuso_reviews` /
  `syncRepusoReviewsForAccount`
- UI: `public/gas-admin.html` — Generators → Reviews → Settings section
