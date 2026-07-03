#!/bin/bash
# Sync property-level terms for all Vorental (account 239) properties
# 5-minute gaps between each call to avoid Beds24 rate limits
# Property 938 (ID 2194) already synced — skipped

SYNC_IDS=(2168 2169 2170 2171 2172 2173 2174 2175 2176 2177 2178 2179 2180 2181 2182 2183 2184 2185 2186 2187 2188 2189 2190 2191 2192 2193 2195 2196 2197 2198 2199 2200 2203 2204 2205)

TOTAL=${#SYNC_IDS[@]}
LOG="/Users/stevedriver/hotel-booking-system/sync-vorental-terms.log"

echo "=== Vorental terms sync started at $(date) ===" | tee "$LOG"
echo "Total properties to sync: $TOTAL (5 min gaps = ~$(( TOTAL * 5 )) minutes)" | tee -a "$LOG"

for i in "${!SYNC_IDS[@]}"; do
  ID=${SYNC_IDS[$i]}
  NUM=$(( i + 1 ))
  echo "" | tee -a "$LOG"
  echo "[$NUM/$TOTAL] Syncing property ID $ID at $(date '+%H:%M:%S')..." | tee -a "$LOG"

  RESULT=$(curl -s -X POST "https://admin.gas.travel/api/gas-sync/properties/$ID/sync-content" \
    -H "Content-Type: application/json" \
    -d '{"force": true}' 2>/dev/null)

  echo "  Result: $RESULT" | tee -a "$LOG"

  if [ $NUM -lt $TOTAL ]; then
    echo "  Waiting 5 minutes before next sync..." | tee -a "$LOG"
    sleep 300
  fi
done

echo "" | tee -a "$LOG"
echo "=== Vorental terms sync completed at $(date) ===" | tee -a "$LOG"
