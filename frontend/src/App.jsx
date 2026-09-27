/**
 * DGIS SENTINEL — Multi-Temporal Change Analysis Dashboard
 * Ministry of Defence · Indian Army (DGIS)
 * SIH Problem Statement #26227
 *
 * Main application shell: split-screen layout
 * LEFT: Control Panel (analyst controls)
 * RIGHT: Satellite Map (MapLibre + Deck.gl)
 */

import { useState, useCallback } from 'react';
import SatelliteMap, { FIXED_BBOX } from './components/SatelliteMap';
import ControlPanel from './components/ControlPanel';
import MapOverlay from './components/MapOverlay';
import { runChangeDetection, submitAudit, getAuditLog, semanticSearch } from './services/api';

export default function App() {
  // Temporal controls
  const [date1, setDate1] = useState('2024-01-15');
  const [date2, setDate2] = useState('2024-06-15');

  // Imagery blend (0 = full T1, 1 = full T2)
  const [opacity, setOpacity] = useState(0.5);

  // AI Detection state
  const [isProcessing, setIsProcessing] = useState(false);
  const [detectionResult, setDetectionResult] = useState(null);
  const [selectedFeature, setSelectedFeature] = useState(null);

  // Audit trail
  const [auditLog, setAuditLog] = useState([]);

  // Semantic search
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);

  // Toast notifications
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // ── Run Change Detection ──
  const handleRunDetection = useCallback(async () => {
    setIsProcessing(true);
    setDetectionResult(null);
    setSelectedFeature(null);
    
    try {
      const result = await runChangeDetection(FIXED_BBOX, date1, date2);
      setDetectionResult(result);
      showToast(`${result.geojson.features.length} changes detected with ${Math.round(result.confidence * 100)}% confidence`, 'success');
    } catch (err) {
      showToast('Change detection failed. Check backend connection.', 'error');
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  }, [date1, date2, showToast]);

  // ── Audit Actions ──
  const handleConfirm = useCallback(async (notes) => {
    if (!detectionResult) return;
    try {
      const result = await submitAudit(detectionResult.job_id, 'approve', notes);
      showToast('Changes confirmed and logged to audit trail', 'success');
      // Refresh audit log
      const log = await getAuditLog();
      setAuditLog(log);
    } catch (err) {
      showToast('Audit submission failed', 'error');
      console.error(err);
    }
  }, [detectionResult, showToast]);

  const handleReject = useCallback(async (notes) => {
    if (!detectionResult) return;
    try {
      const result = await submitAudit(detectionResult.job_id, 'reject', notes);
      showToast('Changes rejected and logged to audit trail', 'warning');
      const log = await getAuditLog();
      setAuditLog(log);
    } catch (err) {
      showToast('Audit submission failed', 'error');
      console.error(err);
    }
  }, [detectionResult, showToast]);

  // ── Semantic Search ──
  const handleSemanticSearch = useCallback(async (query) => {
    setIsSearching(true);
    try {
      const results = await semanticSearch(query, FIXED_BBOX);
      setSearchResults(results);
      showToast(`Found ${results.total_results} matching tiles`, 'info');
    } catch (err) {
      showToast('Semantic search failed', 'error');
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  }, [showToast]);

  // ── Feature Selection ──
  const handleFeatureSelect = useCallback((feature) => {
    setSelectedFeature((prev) =>
      prev?.properties.change_type === feature.properties.change_type ? null : feature
    );
  }, []);

  return (
    <div className="h-full w-full flex overflow-hidden bg-[#080c14]">
      {/* ── LEFT: Control Panel ── */}
      <ControlPanel
        date1={date1}
        date2={date2}
        onDate1Change={setDate1}
        onDate2Change={setDate2}
        opacity={opacity}
        onOpacityChange={setOpacity}
        onRunDetection={handleRunDetection}
        isProcessing={isProcessing}
        detectionResult={detectionResult}
        onConfirm={handleConfirm}
        onReject={handleReject}
        auditLog={auditLog}
        selectedFeature={selectedFeature}
        onFeatureSelect={handleFeatureSelect}
        onSemanticSearch={handleSemanticSearch}
        searchResults={searchResults}
        isSearching={isSearching}
      />

      {/* ── RIGHT: Map Viewport ── */}
      <div className="flex-1 relative">
        <SatelliteMap
          opacity={opacity}
          changeGeoJson={detectionResult?.geojson || null}
          selectedFeature={selectedFeature}
          onFeatureClick={handleFeatureSelect}
        />
        <MapOverlay
          detectionResult={detectionResult}
          isProcessing={isProcessing}
          opacity={opacity}
        />

        {/* ── Toast Notification ── */}
        {toast && (
          <div className={`absolute top-4 left-1/2 -translate-x-1/2 z-50 animate-fade-in`}>
            <div className={`glass-card px-5 py-3 shadow-2xl flex items-center gap-2 ${
              toast.type === 'success' ? 'border-emerald-500/30' :
              toast.type === 'error' ? 'border-red-500/30' :
              toast.type === 'warning' ? 'border-amber-500/30' :
              'border-blue-500/30'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                toast.type === 'success' ? 'bg-emerald-400' :
                toast.type === 'error' ? 'bg-red-400' :
                toast.type === 'warning' ? 'bg-amber-400' :
                'bg-blue-400'
              }`} />
              <span className="text-xs text-slate-200 font-medium">{toast.message}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
