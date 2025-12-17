-- Migration: Create gas_sync_logs table
-- This table is used by the SyncManager to track sync operations

CREATE TABLE IF NOT EXISTS gas_sync_logs (
  id SERIAL PRIMARY KEY,
  connection_id INTEGER REFERENCES gas_sync_connections(id),
  sync_type VARCHAR(50),
  status VARCHAR(50),
  records_synced INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  duration_seconds NUMERIC
);

CREATE INDEX IF NOT EXISTS idx_gas_sync_logs_connection_id ON gas_sync_logs(connection_id);
CREATE INDEX IF NOT EXISTS idx_gas_sync_logs_started_at ON gas_sync_logs(started_at);
