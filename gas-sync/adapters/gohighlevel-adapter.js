/**
 * GoHighLevel (GHL) Adapter — read-only mirror for GAS CRM transition.
 *
 * Pulls contacts / tags / opportunities / workflows from a Lehmann-style GHL
 * location into GAS so we can build GAS-native CRM features against real data
 * while GHL keeps running their existing automations. Two-way push happens
 * later (Spark form submissions → GHL contact create); read-only for now.
 *
 * API: https://services.leadconnectorhq.com (v2 / LeadConnector)
 * Auth: Bearer token from a Private Integration (Settings → Private
 *       Integrations) — locationId is sent as a query param.
 *
 * Required env or per-account credentials:
 *   accounts.ghl_location_id  = "51mL3spsuRYulAjj8tGN" (URL fragment)
 *   accounts.ghl_private_token = "pit-…" (Private Integration token)
 */

const axios = require('axios');

const BASE = 'https://services.leadconnectorhq.com';
const API_VERSION = '2021-07-28';   // GHL's required Version header

class GoHighLevelAdapter {
  constructor({ locationId, privateToken }) {
    if (!locationId) throw new Error('GHL: locationId required');
    if (!privateToken) throw new Error('GHL: privateToken required');
    this.locationId = locationId;
    this.privateToken = privateToken;
    this.client = axios.create({
      baseURL: BASE,
      headers: {
        Authorization: `Bearer ${privateToken}`,
        Version: API_VERSION,
        Accept: 'application/json'
      },
      timeout: 30000
    });
  }

  // ── Connectivity check (used by the GAS Admin "Test connection" button) ──
  async testConnection() {
    try {
      const r = await this.client.get('/locations/' + this.locationId);
      return { success: true, name: r.data?.location?.name || r.data?.name };
    } catch (e) {
      return { success: false, error: this._fmtError(e) };
    }
  }

  // ── Contacts ──
  // Paginates through every contact in the location. Returns flat array.
  // Use `updatedAfter` (ISO) for delta syncs after the initial pull.
  async fetchContacts({ updatedAfter = null, pageLimit = 100 } = {}) {
    const out = [];
    let startAfterId = null;
    let startAfter = null;
    while (true) {
      const params = {
        locationId: this.locationId,
        limit: pageLimit
      };
      if (startAfterId) params.startAfterId = startAfterId;
      if (startAfter) params.startAfter = startAfter;
      if (updatedAfter) params.query = `updatedAt:>${updatedAfter}`;
      const r = await this.client.get('/contacts/', { params });
      const rows = r.data?.contacts || [];
      if (rows.length === 0) break;
      for (const c of rows) out.push(this._normaliseContact(c));
      // Cursor — GHL paginates via last contact's id/dateAdded.
      const last = rows[rows.length - 1];
      if (rows.length < pageLimit) break;
      startAfterId = last.id;
      startAfter = last.dateAdded;
    }
    return out;
  }

  // Per-contact fetch (used when we want fields not returned by list endpoint,
  // e.g. full custom field map).
  async fetchContact(contactId) {
    const r = await this.client.get(`/contacts/${contactId}`);
    return this._normaliseContact(r.data?.contact || r.data);
  }

  // ── Tags (definitions) ──
  async fetchTags() {
    const r = await this.client.get('/locations/' + this.locationId + '/tags');
    return r.data?.tags || [];
  }

  // ── Custom fields (definitions) ──
  async fetchCustomFields() {
    const r = await this.client.get('/locations/' + this.locationId + '/customFields');
    return r.data?.customFields || [];
  }

  // ── Opportunities / pipelines ──
  async fetchPipelines() {
    const r = await this.client.get('/opportunities/pipelines', { params: { locationId: this.locationId } });
    return r.data?.pipelines || [];
  }

  async fetchOpportunities({ pipelineId = null } = {}) {
    const params = { location_id: this.locationId, limit: 100 };
    if (pipelineId) params.pipeline_id = pipelineId;
    const r = await this.client.get('/opportunities/search', { params });
    return r.data?.opportunities || [];
  }

  // ── Workflows (read-only enumeration — execution stays in GHL for now) ──
  async fetchWorkflows() {
    const r = await this.client.get('/workflows/', { params: { locationId: this.locationId } });
    return r.data?.workflows || [];
  }

  // ── Conversations (email / SMS / WhatsApp threads) ──
  async fetchConversations({ contactId = null, limit = 100 } = {}) {
    const params = { locationId: this.locationId, limit };
    if (contactId) params.contactId = contactId;
    const r = await this.client.get('/conversations/search', { params });
    return r.data?.conversations || [];
  }

  // ── Calendars ──
  async fetchCalendars() {
    const r = await this.client.get('/calendars/', { params: { locationId: this.locationId } });
    return r.data?.calendars || [];
  }

  // ── PUSH (used later for Spark form → GHL contact create) ──
  async upsertContact(payload) {
    const body = { locationId: this.locationId, ...payload };
    const r = await this.client.post('/contacts/upsert', body);
    return r.data;
  }

  // ── Internal: normalise GHL contact to GAS shape ──
  _normaliseContact(c) {
    if (!c) return null;
    const customFields = {};
    if (Array.isArray(c.customFields)) {
      for (const f of c.customFields) {
        if (f.id) customFields[f.id] = f.value ?? f.fieldValue ?? null;
      }
    }
    return {
      ghl_contact_id: c.id,
      email: c.email || null,
      phone: c.phone || null,
      first_name: c.firstName || null,
      last_name: c.lastName || null,
      full_name: c.contactName || `${c.firstName || ''} ${c.lastName || ''}`.trim() || null,
      tags: Array.isArray(c.tags) ? c.tags : [],
      source: c.source || null,
      type: c.type || null,
      country: c.country || null,
      city: c.city || null,
      address: c.address1 || null,
      postcode: c.postalCode || null,
      dnd: !!c.dnd,
      date_added: c.dateAdded || c.createdAt || null,
      date_updated: c.dateUpdated || c.updatedAt || null,
      custom_fields: customFields,
      assigned_to: c.assignedTo || null
    };
  }

  _fmtError(e) {
    if (e.response) {
      const status = e.response.status;
      const data = e.response.data;
      return `GHL ${status}: ${typeof data === 'string' ? data : JSON.stringify(data).slice(0, 300)}`;
    }
    return e.message || String(e);
  }
}

module.exports = { GoHighLevelAdapter };
