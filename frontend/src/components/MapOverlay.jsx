/**
 * DGIS Sentinel — Map HUD Overlay
 * Heads-up display elements overlaid on the map viewport.
 */

import { Activity, Navigation, Crosshair, Satellite } from 'lucide-react';

export default function MapOverlay({ detectionResult, isProcessing, opacity }) {
  return (
    <>
      {/* ── Top-left: Coordinates & AOI Info ── */}
      <div className="absolute top-4 left-4 z-10 pointer-events-none">
        <div className="glass-card px-3 py-2 flex items-center gap-3">
          <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
          <div className="text-[10px] font-mono text-slate-400">
            <span className="text-slate-200">26.84°N</span>
            <span className="text-slate-600 mx-1">|</span>
            <span className="text-slate-200">71.40°E</span>
            <span className="text-slate-600 mx-1">|</span>
            <span className="text-cyan-400">AOI LOCKED</span>
          </div>
        </div>
      </div>

      {/* ── Top-right: Source Info ── */}
      <div className="absolute top-4 right-4 z-10 pointer-events-none">
        <div className="glass-card px-3 py-2">
          <div className="flex items-center gap-2 text-[10px]">
            <Satellite className="w-3.5 h-3.5 text-purple-400" />
            <div className="font-mono">
              <span className="text-purple-400">Sentinel-2</span>
              <span className="text-slate-600 mx-1">·</span>
              <span className="text-slate-400">B04/B03/B02</span>
              <span className="text-slate-600 mx-1">·</span>
              <span className="text-slate-300">{Math.round(opacity * 100)}% T₂</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom-left: Detection Status ── */}
      {(isProcessing || detectionResult) && (
        <div className="absolute bottom-6 left-4 z-10 pointer-events-none">
          <div className={`glass-card px-3 py-2 flex items-center gap-2 ${isProcessing ? 'animate-pulse-glow' : ''}`}>
            <Activity className={`w-3.5 h-3.5 ${isProcessing ? 'text-blue-400 animate-pulse' : 'text-emerald-400'}`} />
            <span className="text-[10px] font-mono">
              {isProcessing ? (
                <span className="text-blue-300">AI INFERENCE IN PROGRESS...</span>
              ) : (
                <span className="text-emerald-400">
                  {detectionResult.geojson.features.length} CHANGES DETECTED · CONF {Math.round(detectionResult.confidence * 100)}%
                </span>
              )}
            </span>
          </div>
        </div>
      )}

      {/* ── Bottom-right: Scale / Compass ── */}
      <div className="absolute bottom-6 right-4 z-10 pointer-events-none">
        <div className="glass-card px-3 py-2 flex items-center gap-3">
          <Navigation className="w-3.5 h-3.5 text-slate-400" />
          <div className="text-[10px] font-mono text-slate-500">
            <span className="text-slate-300">N</span>
            <span className="mx-2">·</span>
            <span>10m/px</span>
          </div>
        </div>
      </div>

      {/* ── Scanning line effect during processing ── */}
      {isProcessing && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-5">
          <div 
            className="w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent"
            style={{
              animation: 'scan-line 3s linear infinite',
            }}
          />
        </div>
      )}
    </>
  );
}
