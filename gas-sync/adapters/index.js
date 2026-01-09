/**
 * GasSync Adapter Registry
 * 
 * Central registry for all channel manager adapters
 * Provides factory function to instantiate adapters by type
 */

const { Beds24Adapter } = require('./beds24-adapter');
const { HostawayAdapter } = require('./hostaway-adapter');

// Try to load Calry adapter (optional)
let CalryAdapter = null;
let CALRY_SUPPORTED_PMS = [];
try {
  const calryModule = require('./calry-adapter');
  CalryAdapter = calryModule.CalryAdapter;
  CALRY_SUPPORTED_PMS = calryModule.CALRY_SUPPORTED_PMS || [];
  console.log('Calry adapter loaded successfully');
} catch (e) {
  console.log('Calry adapter not available:', e.message);
}

// =====================================================
// ADAPTER REGISTRY
// =====================================================

const adapters = {
  beds24: Beds24Adapter,
  hostaway: HostawayAdapter
};

// Add Calry if available
if (CalryAdapter) {
  adapters.calry = CalryAdapter;
}

// PMS types that should route through Calry
const calryRoutedPMS = CALRY_SUPPORTED_PMS;

// =====================================================
// FACTORY FUNCTION
// =====================================================

/**
 * Get an adapter instance for a specific channel manager
 * 
 * @param {string} type - The adapter type (e.g., 'beds24', 'guesty')
 * @param {object} config - Configuration including credentials
 * @returns {BaseAdapter} - Adapter instance
 */
function getAdapter(type, config) {
  const normalizedType = type.toLowerCase();
  
  // Check if we have a direct adapter
  if (adapters[normalizedType]) {
    return new adapters[normalizedType](config);
  }
  
  // Check if this should route through Calry
  if (CalryAdapter && calryRoutedPMS.includes(normalizedType)) {
    return new CalryAdapter({
      ...config,
      pmsType: normalizedType
    });
  }
  
  throw new Error(`Unknown adapter type: ${type}. Available: ${getAvailableAdapters().join(', ')}`);
}

/**
 * Get list of all available adapters
 */
function getAvailableAdapters() {
  const direct = Object.keys(adapters);
  const viaCalry = calryRoutedPMS.map(pms => `${pms} (via Calry)`);
  return [...direct, ...viaCalry];
}

/**
 * Check if an adapter type is available
 */
function isAdapterAvailable(type) {
  const normalizedType = type.toLowerCase();
  return adapters[normalizedType] || calryRoutedPMS.includes(normalizedType);
}

/**
 * Get adapter info
 */
function getAdapterInfo(type) {
  const normalizedType = type.toLowerCase();
  
  if (adapters[normalizedType]) {
    const adapter = new adapters[normalizedType]({});
    return {
      type: normalizedType,
      name: adapter.name,
      version: adapter.version,
      capabilities: adapter.capabilities,
      routedVia: null
    };
  }
  
  if (calryRoutedPMS.includes(normalizedType)) {
    return {
      type: normalizedType,
      name: normalizedType,
      version: '2.0.0',
      capabilities: ['properties', 'room_types', 'availability', 'rates', 'reservations', 'conversations'],
      routedVia: 'calry'
    };
  }
  
  return null;
}

/**
 * Get all adapter types grouped by routing
 */
function getAdapterGroups() {
  return {
    direct: Object.keys(adapters).map(type => ({
      type,
      name: type.charAt(0).toUpperCase() + type.slice(1),
      description: `Direct ${type} integration`
    })),
    viaCalry: calryRoutedPMS.map(type => ({
      type,
      name: type.charAt(0).toUpperCase() + type.slice(1),
      description: `${type} via Calry Unified API`
    }))
  };
}

// =====================================================
// SYNC MANAGER
// =====================================================

/**
 * SyncManager - Orchestrates sync operations across adapters
 */
class SyncManager {
  constructor(pool) {
    this.pool = pool;
  }
  
  /**
   * Get adapter for a connection
   */
  async getAdapterForConnection(connectionId) {
    const result = await this.pool.query(`
      SELECT c.*
      FROM gas_sync_connections c
      WHERE c.id = $1
    `, [connectionId]);
    
    if (result.rows.length === 0) {
      throw new Error(`Connection not found: ${connectionId}`);
    }
    
    const connection = result.rows[0];
    const credentials = typeof connection.credentials === 'string' 
      ? JSON.parse(connection.credentials) 
      : (connection.credentials || {});
    
    console.log('getAdapterForConnection:', {
      connectionId,
      adapter_code: connection.adapter_code,
      hasAccessToken: !!connection.access_token,
      accessTokenLength: connection.access_token?.length || 0,
      hasRefreshToken: !!connection.refresh_token,
      credentialsKeys: Object.keys(credentials)
    });
    
    return getAdapter(connection.adapter_code, {
      token: connection.access_token || credentials.token,
      refreshToken: connection.refresh_token || credentials.refreshToken,
      apiKey: credentials.v1ApiKey || credentials.apiKey,
      propKey: credentials.propKey,
      workspaceId: credentials.workspaceId,
      integrationAccountId: credentials.integrationAccountId,
      // Hostaway specific
      accountId: credentials.accountId || credentials.clientId,
      pool: this.pool,
      connectionId: connectionId
    });
  }
  
  /**
   * Run sync for a connection
   */
  async syncConnection(connectionId, syncType = 'incremental') {
    const logId = await this.startSyncLog(connectionId, syncType);
    
    try {
      const adapter = await this.getAdapterForConnection(connectionId);
      
      let result;
      if (syncType === 'full') {
        result = await adapter.fullSync();
      } else {
        // Get last sync time
        const lastSync = await this.getLastSyncTime(connectionId);
        result = await adapter.incrementalSync(lastSync);
      }
      
      await this.completeSyncLog(logId, 'success', result.stats);
      await this.updateConnectionSyncTime(connectionId);
      
      return result;
    } catch (error) {
      await this.completeSyncLog(logId, 'error', null, error.message);
      throw error;
    }
  }
  
  /**
   * Process webhook event
   */
  async processWebhook(connectionId, payload, headers) {
    const adapter = await this.getAdapterForConnection(connectionId);
    const event = adapter.parseWebhookPayload(payload, headers);
    
    // Log the webhook
    await this.pool.query(`
      INSERT INTO gas_sync_webhook_events (connection_id, event_type, event_id, payload, headers, received_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (connection_id, event_id) DO NOTHING
    `, [connectionId, event.event, event.externalId, JSON.stringify(payload), JSON.stringify(headers)]);
    
    // Process based on event type
    switch (event.event) {
      case 'reservation.created':
      case 'reservation.updated':
        await this.syncReservation(adapter, event.data);
        break;
      case 'reservation.cancelled':
        await this.cancelReservation(adapter, event.data);
        break;
      case 'availability.updated':
        await this.syncAvailability(adapter, event.data);
        break;
    }
    
    return event;
  }
  
  // Helper methods
  async startSyncLog(connectionId, syncType) {
    const result = await this.pool.query(`
      INSERT INTO gas_sync_logs (connection_id, sync_type, status, started_at)
      VALUES ($1, $2, 'started', NOW())
      RETURNING id
    `, [connectionId, syncType]);
    return result.rows[0].id;
  }
  
  async completeSyncLog(logId, status, stats, errorMessage = null) {
    await this.pool.query(`
      UPDATE gas_sync_logs SET
        status = $2,
        records_synced = $3,
        error_message = $4,
        completed_at = NOW(),
        duration_seconds = EXTRACT(EPOCH FROM (NOW() - started_at))
      WHERE id = $1
    `, [
      logId,
      status,
      (stats?.properties?.synced || 0) + (stats?.roomTypes?.synced || 0),
      errorMessage
    ]);
  }
  
  async getLastSyncTime(connectionId) {
    const result = await this.pool.query(`
      SELECT last_sync_at FROM gas_sync_connections WHERE id = $1
    `, [connectionId]);
    return result.rows[0]?.last_sync_at;
  }
  
  async updateConnectionSyncTime(connectionId) {
    await this.pool.query(`
      UPDATE gas_sync_connections SET
        last_sync_at = NOW(),
        next_sync_at = NOW() + (sync_interval_minutes || ' minutes')::interval,
        status = 'connected'
      WHERE id = $1
    `, [connectionId]);
  }
  
  async syncReservation(adapter, data) {
    const reservation = await adapter.getReservation(data.id || data.externalId);
    if (reservation.success) {
      await adapter.syncReservationToDatabase(reservation.data);
    }
  }
  
  async cancelReservation(adapter, data) {
    await this.pool.query(`
      UPDATE gas_sync_reservations SET status = 'cancelled', updated_at = NOW()
      WHERE connection_id = $1 AND external_id = $2
    `, [adapter.connectionId, data.id || data.externalId]);
  }
  
  async syncAvailability(adapter, data) {
    // Re-sync availability for affected room type
    const roomTypeId = data.roomTypeId || data.roomId;
    if (roomTypeId) {
      const today = new Date().toISOString().split('T')[0];
      const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const availability = await adapter.getAvailability(roomTypeId, today, futureDate);
      // Store in database...
    }
  }
}

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
  adapters,
  getAdapter,
  getAvailableAdapters,
  isAdapterAvailable,
  getAdapterInfo,
  getAdapterGroups,
  SyncManager,
  // Re-export individual adapters
  Beds24Adapter,
  HostawayAdapter,
  ...(CalryAdapter ? { CalryAdapter, CALRY_SUPPORTED_PMS } : {})
};
