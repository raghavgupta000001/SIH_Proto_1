/**
 * DGIS Sentinel — Control Panel
 * Left sidebar with all analyst controls.
 */

import { useState } from 'react';
import {
  Radar,
  Play,
  CheckCircle,
  XCircle,
  Clock,
  Shield,
  Satellite,
  Activity,
  Search,
  Layers,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Loader2,
  MapPin,
  Eye,
  FileText,
} from 'lucide-react';

// ─── Severity Badge ───────────────────────────
function SeverityBadge({ severity }) {
  const colors = {
    high: 'bg-red-500/20 text-red-400 border-red-500/30',
    medium: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    low: 'bg-green-500/20 text-green-400 border-green-500/30',
  };
  return (
    <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${colors[severity] || colors.low}`}>
      {severity}
    </span>
  );
}

// ─── Change Type Icon ─────────────────────────
function ChangeTypeIcon({ type }) {
  const icons = {
    new_construction: '🏗️',
    road_development: '🛣️',
    vegetation_clearance: '🌿',
    vehicle_concentration: '🚛',
  };
  return <span className="text-lg">{icons[type] || '📍'}</span>;
}

export default function ControlPanel({
  date1,
  date2,
  onDate1Change,
  onDate2Change,
  opacity,
  onOpacityChange,
  onRunDetection,
  isProcessing,
  detectionResult,
  onConfirm,
  onReject,
  auditLog,
  selectedFeature,
  onFeatureSelect,
  onSemanticSearch,
  searchResults,
  isSearching,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [analystNotes, setAnalystNotes] = useState('');
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [activeTab, setActiveTab] = useState('detect');
  const [auditSubmitting, setAuditSubmitting] = useState(false);

  const handleSearch = () => {
    if (searchQuery.trim()) {
      onSemanticSearch(searchQuery.trim());
    }
  };

  const handleConfirm = async () => {
    setAuditSubmitting(true);
    await onConfirm(analystNotes);
    setAnalystNotes('');
    setAuditSubmitting(false);
  };

  const handleReject = async () => {
    setAuditSubmitting(true);
    await onReject(analystNotes);
    setAnalystNotes('');
    setAuditSubmitting(false);
  };

  return (
    <div className="w-[420px] min-w-[420px] h-full flex flex-col bg-[#0b1120] border-r border-[var(--border-subtle)] overflow-hidden">
      
      {/* ── Header ── */}
      <div className="px-5 py-4 border-b border-[var(--border-subtle)] bg-gradient-to-r from-[#0b1120] to-[#111d33]">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white">DGIS SENTINEL</h1>
            <p className="text-[10px] text-slate-400 tracking-[0.2em] uppercase font-medium">Multi-Temporal Change Analysis</p>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] text-emerald-400 font-medium uppercase tracking-wider">System Operational</span>
          <span className="text-[10px] text-slate-500 ml-auto font-mono">v1.0.0</span>
        </div>
      </div>

      {/* ── Tab Navigation ── */}
      <div className="flex border-b border-[var(--border-subtle)]">
        {[
          { id: 'detect', label: 'Detection', icon: Radar },
          { id: 'search', label: 'Search', icon: Search },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === tab.id
                ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-500/5'
                : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.02]'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Scrollable Content ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

        {activeTab === 'detect' && (
          <>
            {/* ── Temporal Selection ── */}
            <section className="glass-card p-4 space-y-3 animate-fade-in">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-cyan-400" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">Temporal Selection</h2>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider font-medium mb-1 block">Baseline (T₁)</label>
                  <input
                    type="date"
                    value={date1}
                    onChange={(e) => onDate1Change(e.target.value)}
                    className="w-full bg-[#0d1525] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/20 transition-all"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider font-medium mb-1 block">Target (T₂)</label>
                  <input
                    type="date"
                    value={date2}
                    onChange={(e) => onDate2Change(e.target.value)}
                    className="w-full bg-[#0d1525] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/20 transition-all"
                  />
                </div>
              </div>
            </section>

            {/* ── Imagery Opacity Slider ── */}
            <section className="glass-card p-4 space-y-3 animate-fade-in" style={{ animationDelay: '0.05s' }}>
              <div className="flex items-center gap-2 mb-1">
                <Layers className="w-4 h-4 text-purple-400" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">Imagery Blend</h2>
              </div>
              
              <div className="flex items-center justify-between text-[10px] text-slate-500 uppercase tracking-wider mb-1">
                <span className="flex items-center gap-1">
                  <Satellite className="w-3 h-3" /> T₁ Baseline
                </span>
                <span className="flex items-center gap-1">
                  T₂ Target <Satellite className="w-3 h-3" />
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={opacity}
                onChange={(e) => onOpacityChange(parseFloat(e.target.value))}
                className="w-full"
              />
              <div className="text-center">
                <span className="font-mono text-xs text-blue-400">{Math.round(opacity * 100)}%</span>
                <span className="text-[10px] text-slate-600 ml-1">target visibility</span>
              </div>
            </section>

            {/* ── Run Detection Button ── */}
            <button
              onClick={onRunDetection}
              disabled={isProcessing}
              className={`w-full py-3.5 rounded-xl font-bold text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                isProcessing
                  ? 'bg-blue-500/20 text-blue-300 cursor-wait'
                  : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 active:scale-[0.98]'
              }`}
              style={{ animationDelay: '0.1s' }}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing BIT Model...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Run AI Change Detection
                </>
              )}
            </button>

            {/* ── Processing Indicator ── */}
            {isProcessing && (
              <div className="glass-card p-4 animate-fade-in">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Activity className="w-4 h-4 text-blue-400 animate-pulse" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-200">BIT Transformer Active</p>
                    <p className="text-[10px] text-slate-500">Analyzing bi-temporal change signatures...</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {['Loading Sentinel-2 bands...', 'Co-registration alignment...', 'Running change inference...'].map((step, i) => (
                    <div key={i} className="flex items-center gap-2 text-[10px]">
                      <div className={`w-1.5 h-1.5 rounded-full ${i < 2 ? 'bg-emerald-400' : 'bg-blue-400 animate-pulse'}`} />
                      <span className={i < 2 ? 'text-emerald-400' : 'text-blue-300'}>{step}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full shimmer" style={{ width: '65%' }} />
                </div>
              </div>
            )}

            {/* ── Detection Results / Analyst Review Queue ── */}
            {detectionResult && !isProcessing && (
              <section className="glass-card overflow-hidden animate-fade-in border-blue-500/20">
                <div className="px-4 py-3 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-b border-[var(--border-subtle)]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">Analyst Review Queue</h2>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500">JOB #{detectionResult.job_id}</span>
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  {/* Summary stats */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-[#0d1525] rounded-lg p-2.5 text-center">
                      <p className="text-lg font-bold text-white">{detectionResult.geojson.features.length}</p>
                      <p className="text-[9px] text-slate-500 uppercase tracking-wider">Changes</p>
                    </div>
                    <div className="bg-[#0d1525] rounded-lg p-2.5 text-center">
                      <p className="text-lg font-bold text-emerald-400">{Math.round(detectionResult.confidence * 100)}%</p>
                      <p className="text-[9px] text-slate-500 uppercase tracking-wider">Confidence</p>
                    </div>
                    <div className="bg-[#0d1525] rounded-lg p-2.5 text-center">
                      <p className="text-lg font-bold text-amber-400">
                        {detectionResult.geojson.features.filter(f => f.properties.severity === 'high').length}
                      </p>
                      <p className="text-[9px] text-slate-500 uppercase tracking-wider">High Sev</p>
                    </div>
                  </div>

                  {/* Feature list */}
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {detectionResult.geojson.features.map((feature, idx) => (
                      <div
                        key={idx}
                        onClick={() => onFeatureSelect(feature)}
                        className={`p-3 rounded-lg cursor-pointer transition-all ${
                          selectedFeature?.properties.change_type === feature.properties.change_type
                            ? 'bg-blue-500/15 border border-blue-500/30'
                            : 'bg-[#0d1525] hover:bg-[#131d2e] border border-transparent'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <ChangeTypeIcon type={feature.properties.change_type} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-[11px] font-semibold text-slate-200 capitalize">
                                {feature.properties.change_type.replace(/_/g, ' ')}
                              </span>
                              <SeverityBadge severity={feature.properties.severity} />
                            </div>
                            <p className="text-[10px] text-slate-400 leading-relaxed truncate">
                              {feature.properties.description}
                            </p>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-[9px] text-slate-500 font-mono">
                                {Math.round(feature.properties.confidence * 100)}% conf
                              </span>
                              <span className="text-[9px] text-slate-500 font-mono">
                                {feature.properties.area_sqm} m²
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Analyst notes */}
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase tracking-wider font-medium mb-1 block">
                      <FileText className="w-3 h-3 inline mr-1" />
                      Analyst Notes
                    </label>
                    <textarea
                      value={analystNotes}
                      onChange={(e) => setAnalystNotes(e.target.value)}
                      placeholder="Enter review notes for audit trail..."
                      className="w-full bg-[#0d1525] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-xs text-slate-200 focus:border-blue-500/50 focus:outline-none resize-none h-16"
                    />
                  </div>

                  {/* Approve / Reject buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleConfirm}
                      disabled={auditSubmitting}
                      className="py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      Confirm
                    </button>
                    <button
                      onClick={handleReject}
                      disabled={auditSubmitting}
                      className="py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Reject
                    </button>
                  </div>
                </div>
              </section>
            )}

            {/* ── Audit Log ── */}
            {auditLog.length > 0 && (
              <section className="glass-card overflow-hidden animate-fade-in">
                <button
                  onClick={() => setShowAuditLog(!showAuditLog)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/[0.02] transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-purple-400" />
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">Audit Trail</h2>
                    <span className="text-[10px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded-full font-mono">
                      {auditLog.length}
                    </span>
                  </div>
                  {showAuditLog ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                </button>
                
                {showAuditLog && (
                  <div className="px-4 pb-3 space-y-2 max-h-[200px] overflow-y-auto">
                    {auditLog.map((entry, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 bg-[#0d1525] rounded-lg">
                        {entry.action === 'approve' ? (
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-semibold uppercase ${entry.action === 'approve' ? 'text-emerald-400' : 'text-red-400'}`}>
                              {entry.action}
                            </span>
                            <span className="text-[9px] text-slate-600 font-mono">{entry.job_id}</span>
                          </div>
                          <p className="text-[9px] text-slate-500 font-mono">
                            {new Date(entry.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}
          </>
        )}

        {activeTab === 'search' && (
          <>
            {/* ── Semantic Search ── */}
            <section className="glass-card p-4 space-y-3 animate-fade-in">
              <div className="flex items-center gap-2 mb-1">
                <Search className="w-4 h-4 text-cyan-400" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">Semantic Search</h2>
              </div>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                Query satellite imagery using natural language. Powered by RemoteCLIP-ViT-L/14.
              </p>
              
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder='e.g. "newly built structures near river"'
                  className="flex-1 bg-[#0d1525] border border-[var(--border-subtle)] rounded-lg px-3 py-2.5 text-xs text-slate-200 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 transition-all placeholder:text-slate-600"
                />
                <button
                  onClick={handleSearch}
                  disabled={isSearching || !searchQuery.trim()}
                  className="px-4 rounded-lg bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/25 transition-all cursor-pointer disabled:opacity-40"
                >
                  {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </button>
              </div>

              {/* Quick query suggestions */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  'newly built structures',
                  'vehicle concentrations',
                  'road development',
                  'water body changes',
                ].map((q) => (
                  <button
                    key={q}
                    onClick={() => { setSearchQuery(q); onSemanticSearch(q); }}
                    className="text-[9px] px-2 py-1 rounded-full bg-slate-800 text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all cursor-pointer border border-transparent hover:border-cyan-500/20"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </section>

            {/* ── Search Results ── */}
            {searchResults && (
              <section className="glass-card overflow-hidden animate-fade-in">
                <div className="px-4 py-3 border-b border-[var(--border-subtle)] bg-cyan-500/5">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                      Results ({searchResults.total_results})
                    </h2>
                    <span className="text-[9px] text-slate-500 font-mono">{searchResults.model}</span>
                  </div>
                </div>
                <div className="p-3 space-y-2 max-h-[350px] overflow-y-auto">
                  {searchResults.results.map((result, idx) => (
                    <div key={idx} className="p-3 bg-[#0d1525] rounded-lg hover:bg-[#131d2e] transition-all cursor-pointer">
                      <div className="flex items-start justify-between mb-1">
                        <span className="text-[10px] font-mono text-cyan-400">{result.tile_id}</span>
                        <span className="text-[10px] font-bold text-emerald-400">{Math.round(result.score * 100)}%</span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed mb-1.5">{result.description}</p>
                      <div className="flex items-center gap-3 text-[9px] text-slate-500">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-2.5 h-2.5" />
                          {result.location[1].toFixed(3)}°N, {result.location[0].toFixed(3)}°E
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          {result.acquisition_date}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="px-4 py-3 border-t border-[var(--border-subtle)] bg-[#080e1a]">
        <div className="flex items-center justify-between text-[9px] text-slate-600">
          <span>Ministry of Defence · DGIS</span>
          <span className="flex items-center gap-1">
            <Eye className="w-2.5 h-2.5" />
            RESTRICTED
          </span>
        </div>
      </div>
    </div>
  );
}
