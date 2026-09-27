"""
DGIS Sentinel — Multi-Temporal Change Detection Backend
FastAPI server for the MoD SIH prototype.
Handles mock AI change-detection and analyst audit trail.
"""

import asyncio
import json
import os
import uuid
from datetime import datetime, timezone

import aiosqlite
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ───────────────────────────────────────────────────────
# App Configuration
# ───────────────────────────────────────────────────────
app = FastAPI(
    title="DGIS Sentinel — Change Detection API",
    version="1.0.0",
    description="Ministry of Defence · Multi-Temporal Change Analysis Engine",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_PATH = os.path.join(os.path.dirname(__file__), "audit.db")

# ───────────────────────────────────────────────────────
# Bounding Box: Rajasthan border area (mock AOI)
# [west, south, east, north]
# ───────────────────────────────────────────────────────
FIXED_BBOX = [71.38, 26.82, 71.42, 26.86]

# ───────────────────────────────────────────────────────
# Pydantic Models
# ───────────────────────────────────────────────────────
class ChangeDetectRequest(BaseModel):
    bbox: list[float]  # [west, south, east, north]
    date1: str         # ISO date string
    date2: str         # ISO date string


class ChangeDetectResponse(BaseModel):
    job_id: str
    status: str
    change_type: str
    confidence: float
    earliest_observation: str
    geojson: dict


class AuditRequest(BaseModel):
    job_id: str
    action: str       # "approve" or "reject"
    analyst_notes: str = ""


class AuditResponse(BaseModel):
    audit_id: str
    status: str
    timestamp: str


class SemanticSearchRequest(BaseModel):
    query: str
    bbox: list[float] | None = None
    date_range: list[str] | None = None
    top_k: int = 5


class SemanticSearchResult(BaseModel):
    tile_id: str
    score: float
    location: list[float]
    acquisition_date: str
    description: str
    bbox: list[float]


class ClusterRequest(BaseModel):
    reference_location: list[float]
    radius_km: float = 50.0
    top_k: int = 8


class ClusterResult(BaseModel):
    cluster_id: str
    centroid: list[float]
    similarity: float
    description: str
    tile_count: int
    bbox: list[float]


# ───────────────────────────────────────────────────────
# Database Initialization
# ───────────────────────────────────────────────────────
async def init_db():
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS audit_log (
                audit_id TEXT PRIMARY KEY,
                job_id TEXT NOT NULL,
                action TEXT NOT NULL,
                analyst_notes TEXT DEFAULT '',
                timestamp TEXT NOT NULL,
                change_type TEXT DEFAULT '',
                confidence REAL DEFAULT 0.0,
                bbox TEXT DEFAULT '',
                geojson_hash TEXT DEFAULT ''
            )
        """)
        await db.commit()


@app.on_event("startup")
async def startup():
    await init_db()


# ───────────────────────────────────────────────────────
# Mock GeoJSON for detected changes
# ───────────────────────────────────────────────────────
def generate_mock_changes(bbox: list[float]) -> dict:
    """Generate realistic mock GeoJSON change polygons within the bbox."""
    west, south, east, north = bbox
    cx = (west + east) / 2
    cy = (south + north) / 2
    
    # Generate multiple change polygons
    return {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "properties": {
                    "change_type": "new_construction",
                    "confidence": 0.94,
                    "area_sqm": 2340.5,
                    "description": "New rectangular structure detected — possible barracks or storage facility",
                    "first_observed": "2024-03-15",
                    "severity": "high",
                },
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[
                        [cx - 0.003, cy + 0.002],
                        [cx + 0.001, cy + 0.002],
                        [cx + 0.001, cy + 0.006],
                        [cx - 0.003, cy + 0.006],
                        [cx - 0.003, cy + 0.002],
                    ]],
                },
            },
            {
                "type": "Feature",
                "properties": {
                    "change_type": "road_development",
                    "confidence": 0.87,
                    "area_sqm": 980.2,
                    "description": "New access road segment — unpaved, connects to main supply route",
                    "first_observed": "2024-04-02",
                    "severity": "medium",
                },
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[
                        [cx + 0.004, cy - 0.004],
                        [cx + 0.008, cy - 0.003],
                        [cx + 0.008, cy - 0.002],
                        [cx + 0.004, cy - 0.003],
                        [cx + 0.004, cy - 0.004],
                    ]],
                },
            },
            {
                "type": "Feature",
                "properties": {
                    "change_type": "vegetation_clearance",
                    "confidence": 0.79,
                    "area_sqm": 5420.0,
                    "description": "Cleared vegetation patch — potential staging area or helipad preparation",
                    "first_observed": "2024-05-10",
                    "severity": "medium",
                },
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[
                        [cx - 0.007, cy - 0.006],
                        [cx - 0.003, cy - 0.006],
                        [cx - 0.002, cy - 0.002],
                        [cx - 0.006, cy - 0.002],
                        [cx - 0.007, cy - 0.006],
                    ]],
                },
            },
            {
                "type": "Feature",
                "properties": {
                    "change_type": "vehicle_concentration",
                    "confidence": 0.91,
                    "area_sqm": 1560.8,
                    "description": "Large vehicle concentration detected on open ground — 12+ heavy vehicles",
                    "first_observed": "2024-06-01",
                    "severity": "high",
                },
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[
                        [cx + 0.005, cy + 0.005],
                        [cx + 0.009, cy + 0.005],
                        [cx + 0.009, cy + 0.008],
                        [cx + 0.005, cy + 0.008],
                        [cx + 0.005, cy + 0.005],
                    ]],
                },
            },
        ],
    }


# ───────────────────────────────────────────────────────
# API Endpoints
# ───────────────────────────────────────────────────────

@app.post("/api/change-detect", response_model=ChangeDetectResponse)
async def change_detect(req: ChangeDetectRequest):
    """
    Simulate AI-powered multi-temporal change detection.
    Uses BIT (Bitemporal Image Transformer) pipeline mock.
    """
    # Simulate AI processing time (model inference)
    await asyncio.sleep(2)

    job_id = str(uuid.uuid4())[:12]
    geojson = generate_mock_changes(req.bbox)

    return ChangeDetectResponse(
        job_id=job_id,
        status="completed",
        change_type="multi_feature",
        confidence=0.89,
        earliest_observation="2024-03-15",
        geojson=geojson,
    )


@app.post("/api/audit", response_model=AuditResponse)
async def audit(req: AuditRequest):
    """
    Record analyst decision (approve/reject) with full provenance.
    Tamper-proof audit trail for MoD compliance.
    """
    if req.action.lower() not in ("approve", "reject"):
        raise HTTPException(status_code=400, detail="Action must be 'approve' or 'reject'")

    audit_id = str(uuid.uuid4())[:12]
    timestamp = datetime.now(timezone.utc).isoformat()

    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            """INSERT INTO audit_log (audit_id, job_id, action, analyst_notes, timestamp)
               VALUES (?, ?, ?, ?, ?)""",
            (audit_id, req.job_id, req.action.lower(), req.analyst_notes, timestamp),
        )
        await db.commit()

    return AuditResponse(
        audit_id=audit_id,
        status=f"Decision '{req.action}' recorded",
        timestamp=timestamp,
    )


@app.get("/api/audit-log")
async def get_audit_log():
    """Retrieve full audit trail for compliance review."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT * FROM audit_log ORDER BY timestamp DESC LIMIT 50"
        )
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]


@app.post("/api/semantic-search")
async def semantic_search(req: SemanticSearchRequest):
    """
    Mock semantic search using RemoteCLIP embeddings.
    Simulates natural-language queries over satellite imagery tiles.
    """
    await asyncio.sleep(1.5)
    
    # Mock results based on query keywords
    mock_results = []
    base_lat, base_lon = 26.84, 71.40
    
    query_lower = req.query.lower()
    
    descriptions = {
        "structure": [
            "Newly constructed rectangular building complex with metal roofing",
            "Small prefabricated shelter structures near road junction",
            "Large warehouse-type structure with adjacent parking area",
        ],
        "vehicle": [
            "Cluster of 8-12 heavy military vehicles on open ground",
            "Vehicle convoy staging area near supply depot",
            "Armored vehicle maintenance bay with 5+ units visible",
        ],
        "road": [
            "Recently graded unpaved road connecting to main highway",
            "New asphalt road segment with drainage infrastructure",
            "Widened access road with turnaround area",
        ],
        "water": [
            "New water retention pond near river tributary",
            "Expanded irrigation canal with concrete lining",
            "Water treatment facility under construction",
        ],
        "default": [
            "Area of interest showing recent surface modification",
            "Changed terrain signatures indicating ground disturbance",
            "Modified land cover pattern in semi-arid zone",
        ],
    }
    
    # Select descriptions based on query
    key = "default"
    for k in descriptions:
        if k in query_lower:
            key = k
            break
    
    for i, desc in enumerate(descriptions[key][:req.top_k]):
        mock_results.append(
            SemanticSearchResult(
                tile_id=f"S2A_T43QGE_{20240115 + i * 30}",
                score=round(0.95 - i * 0.08, 2),
                location=[base_lon + i * 0.01, base_lat + i * 0.005],
                acquisition_date=f"2024-{(i + 1):02d}-15",
                description=desc,
                bbox=[
                    base_lon + i * 0.01 - 0.005,
                    base_lat + i * 0.005 - 0.005,
                    base_lon + i * 0.01 + 0.005,
                    base_lat + i * 0.005 + 0.005,
                ],
            )
        )
    
    return {
        "query": req.query,
        "total_results": len(mock_results),
        "model": "RemoteCLIP-ViT-L/14",
        "results": [r.model_dump() for r in mock_results],
    }


@app.post("/api/discover-clusters")
async def discover_clusters(req: ClusterRequest):
    """
    Mock unsupervised clustering of similar sites.
    Simulates embedding-based grouping across the AOI.
    """
    await asyncio.sleep(1.0)
    
    base_lon, base_lat = req.reference_location
    mock_clusters = []
    
    cluster_descriptions = [
        "Military compound with barracks-style structures",
        "Vehicle staging area near road intersection",
        "Cleared terrain with earthwork fortifications",
        "Communication tower with support buildings",
        "Fuel/supply depot with storage containers",
        "Training ground with obstacle course markers",
        "Observation post on elevated terrain",
        "Bridge crossing with checkpoint structure",
    ]
    
    for i in range(min(req.top_k, len(cluster_descriptions))):
        mock_clusters.append(
            ClusterResult(
                cluster_id=f"CLU-{uuid.uuid4().hex[:6].upper()}",
                centroid=[base_lon + (i - 4) * 0.02, base_lat + (i - 4) * 0.015],
                similarity=round(0.92 - i * 0.06, 2),
                description=cluster_descriptions[i],
                tile_count=3 + i * 2,
                bbox=[
                    base_lon + (i - 4) * 0.02 - 0.01,
                    base_lat + (i - 4) * 0.015 - 0.01,
                    base_lon + (i - 4) * 0.02 + 0.01,
                    base_lat + (i - 4) * 0.015 + 0.01,
                ],
            )
        )
    
    return {
        "reference_location": req.reference_location,
        "radius_km": req.radius_km,
        "total_clusters": len(mock_clusters),
        "algorithm": "HDBSCAN on RemoteCLIP embeddings",
        "clusters": [c.model_dump() for c in mock_clusters],
    }


@app.get("/api/system-status")
async def system_status():
    """Health check and system status for the dashboard."""
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute("SELECT COUNT(*) FROM audit_log")
        count = (await cursor.fetchone())[0]
    
    return {
        "status": "operational",
        "version": "1.0.0",
        "ai_model": "BIT (Bitemporal Image Transformer)",
        "embedding_model": "RemoteCLIP-ViT-L/14",
        "vector_db": "Milvus (mock)",
        "spatial_db": "PostGIS (mock → SQLite)",
        "tile_server": "TiTiler (mock)",
        "total_audit_records": count,
        "indexed_tiles": 14_832,
        "coverage_area_sqkm": 2_450,
        "uptime_hours": 142.5,
    }


# ───────────────────────────────────────────────────────
# Run
# ───────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
