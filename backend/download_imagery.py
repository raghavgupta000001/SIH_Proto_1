"""
Download REAL Sentinel-2 satellite imagery from AWS public COGs.
Uses the Element84 Earth Search STAC API to find scenes,
then crops the True Color Image (TCI) COGs to our AOI using rasterio.
Handles CRS transformation (WGS84 → UTM) and proper color balancing.
"""

import json
import sys
import os
import urllib.request

# ─── Configuration ───────────────────────────────────
BBOX = [71.38, 26.82, 71.42, 26.86]  # [west, south, east, north] in WGS84

# Two time windows — same location, different dates
DATE_RANGE_1 = "2023-11-01T00:00:00Z/2024-01-31T23:59:59Z"
DATE_RANGE_2 = "2024-04-01T00:00:00Z/2024-06-30T23:59:59Z"

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'frontend', 'public')
STAC_URL = "https://earth-search.aws.element84.com/v1/search"


def search_stac(date_range, limit=5):
    """Search for Sentinel-2 L2A scenes via STAC API."""
    body = json.dumps({
        "collections": ["sentinel-2-l2a"],
        "bbox": BBOX,
        "datetime": date_range,
        "limit": limit,
    }).encode()

    req = urllib.request.Request(
        STAC_URL,
        data=body,
        headers={"Content-Type": "application/json"}
    )

    try:
        resp = urllib.request.urlopen(req, timeout=30)
        data = json.loads(resp.read())
        features = data.get("features", [])
        features.sort(key=lambda f: f["properties"].get("eo:cloud_cover", 100))
        return features
    except Exception as e:
        print(f"  ✗ STAC API request failed: {e}")
        return []


def transform_bbox_to_utm(bbox, target_crs):
    """Transform bbox from WGS84 (EPSG:4326) to the target CRS."""
    from rasterio.warp import transform_bounds
    west, south, east, north = bbox
    return transform_bounds("EPSG:4326", target_crs, west, south, east, north)


def enhance_satellite_image(rgb_array):
    """
    Apply proper color enhancement to Sentinel-2 TCI imagery.
    Performs gentle contrast stretching and color balancing.
    """
    import numpy as np
    
    result = rgb_array.astype(np.float32)
    
    # Sentinel-2 TCI images are often already scaled, but might lack contrast
    # A mild 1% to 99% stretch on the overall image (not per channel, to preserve color balance)
    valid = result[result > 0]
    if len(valid) > 0:
        p1 = np.percentile(valid, 1)
        p99 = np.percentile(valid, 99)
        
        if p99 - p1 > 1:
            result = (result - p1) / (p99 - p1) * 255.0
            
    # Gentle gamma for slightly deeper shadows
    result = np.clip(result, 0, 255)
    result = 255.0 * (result / 255.0) ** 1.1
    
    return np.clip(result, 0, 255).astype(np.uint8)


def download_and_crop_cog(tci_url, output_path, bbox):
    """Download and crop the TCI COG to our AOI using rasterio."""
    import rasterio
    from rasterio.windows import from_bounds
    import numpy as np
    from PIL import Image

    print(f"  → Opening COG via HTTP range requests...")
    print(f"    URL: {tci_url[:100]}...")

    with rasterio.open(tci_url) as src:
        crs = src.crs
        print(f"    CRS: {crs}")
        print(f"    Full scene size: {src.width}×{src.height}")

        # Transform bbox from WGS84 to the COG's CRS (typically UTM)
        if str(crs) != "EPSG:4326":
            utm_bbox = transform_bbox_to_utm(bbox, crs)
            print(f"    UTM bbox: [{utm_bbox[0]:.1f}, {utm_bbox[1]:.1f}, {utm_bbox[2]:.1f}, {utm_bbox[3]:.1f}]")
        else:
            utm_bbox = bbox

        window = from_bounds(utm_bbox[0], utm_bbox[1], utm_bbox[2], utm_bbox[3], src.transform)
        print(f"    Window: {window.width:.0f}×{window.height:.0f} pixels")

        if window.width < 10 or window.height < 10:
            print(f"  ✗ Window too small")
            return False

        # Read at native resolution
        out_h = min(1024, int(window.height))
        out_w = min(1024, int(window.width))

        print(f"  → Reading {out_w}×{out_h} pixels...")
        data = src.read(
            window=window,
            out_shape=(src.count, out_h, out_w),
            resampling=rasterio.enums.Resampling.bilinear
        )

        # Convert bands to (H, W, 3) RGB
        rgb = np.moveaxis(data[:3], 0, -1)

        # Apply proper color enhancement
        rgb = enhance_satellite_image(rgb)

        img = Image.fromarray(rgb)
        img = img.resize((1024, 1024), Image.LANCZOS)
        img.save(output_path, 'PNG')
        print(f"  ✓ Saved: {output_path} ({img.size[0]}×{img.size[1]})")
        return True


def process_date(date_range, output_filename, label):
    """Find and download imagery for a date range."""
    print(f"\n{'═'*60}")
    print(f"  {label}")
    print(f"  Date range: {date_range}")
    print(f"{'═'*60}")

    scenes = search_stac(date_range)
    if not scenes:
        print(f"  ✗ No scenes found")
        return False

    print(f"  Found {len(scenes)} scenes (sorted by cloud cover)")

    for i, scene in enumerate(scenes):
        props = scene.get("properties", {})
        cloud = props.get("eo:cloud_cover", 100)
        date = props.get("datetime", "?")[:10]
        scene_id = scene.get("id", "unknown")

        print(f"\n  [{i+1}] {scene_id}")
        print(f"      Date: {date}  |  Cloud: {cloud:.1f}%")

        if cloud > 25:
            print(f"      ⤳ Skipping (too cloudy)")
            continue

        assets = scene.get("assets", {})
        if "visual" not in assets:
            continue

        tci_url = assets["visual"]["href"]
        output_path = os.path.join(OUTPUT_DIR, output_filename)

        try:
            if download_and_crop_cog(tci_url, output_path, BBOX):
                return True
        except Exception as e:
            print(f"  ✗ Failed: {e}")
            continue

    print(f"  ✗ Could not download imagery for {label}")
    return False


if __name__ == "__main__":
    print("╔══════════════════════════════════════════════════════════╗")
    print("║  DGIS SENTINEL — Real Sentinel-2 Imagery Downloader    ║")
    print("║  Source: Copernicus Sentinel-2 L2A COGs (AWS)           ║")
    print("║  AOI: Rajasthan [71.38, 26.82, 71.42, 26.86]           ║")
    print("╚══════════════════════════════════════════════════════════╝")

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    ok1 = process_date(DATE_RANGE_1, "sentinel_date1.png", "BASELINE (T₁) — Winter 2023/24")
    ok2 = process_date(DATE_RANGE_2, "sentinel_date2.png", "TARGET (T₂) — Summer 2024")

    if ok1 and ok2:
        print("\n" + "═"*60)
        print("✅ Both images downloaded successfully!")
        print("═"*60)
    else:
        print("\n⚠️  Some downloads failed.")
        sys.exit(1)
