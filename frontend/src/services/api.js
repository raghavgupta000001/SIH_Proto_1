/**
 * DGIS Sentinel — API Service Layer
 * Handles all communication with the FastAPI backend.
 */

const API_BASE = '/api';

export async function runChangeDetection(bbox, date1, date2) {
  const res = await fetch(`${API_BASE}/change-detect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bbox, date1, date2 }),
  });
  if (!res.ok) throw new Error(`Change detection failed: ${res.status}`);
  return res.json();
}

export async function submitAudit(jobId, action, analystNotes = '') {
  const res = await fetch(`${API_BASE}/audit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      job_id: jobId,
      action,
      analyst_notes: analystNotes,
    }),
  });
  if (!res.ok) throw new Error(`Audit submission failed: ${res.status}`);
  return res.json();
}

export async function getAuditLog() {
  const res = await fetch(`${API_BASE}/audit-log`);
  if (!res.ok) throw new Error(`Audit log fetch failed: ${res.status}`);
  return res.json();
}

export async function semanticSearch(query, bbox = null, dateRange = null, topK = 5) {
  const res = await fetch(`${API_BASE}/semantic-search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query,
      bbox,
      date_range: dateRange,
      top_k: topK,
    }),
  });
  if (!res.ok) throw new Error(`Semantic search failed: ${res.status}`);
  return res.json();
}

export async function discoverClusters(referenceLocation, radiusKm = 50, topK = 8) {
  const res = await fetch(`${API_BASE}/discover-clusters`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      reference_location: referenceLocation,
      radius_km: radiusKm,
      top_k: topK,
    }),
  });
  if (!res.ok) throw new Error(`Cluster discovery failed: ${res.status}`);
  return res.json();
}

export async function getSystemStatus() {
  const res = await fetch(`${API_BASE}/system-status`);
  if (!res.ok) throw new Error(`System status fetch failed: ${res.status}`);
  return res.json();
}
