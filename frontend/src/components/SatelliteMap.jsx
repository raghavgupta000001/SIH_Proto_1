/**
 * DGIS Sentinel — Satellite Map Viewer
 * MapLibre GL + Deck.gl integration with BitmapLayer and GeoJsonLayer.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Deck } from '@deck.gl/core';
import { BitmapLayer, GeoJsonLayer } from '@deck.gl/layers';

// Fixed bounding box: [west, south, east, north]
export const FIXED_BBOX = [71.38, 26.82, 71.42, 26.86];

const INITIAL_VIEW = {
  longitude: (FIXED_BBOX[0] + FIXED_BBOX[2]) / 2,
  latitude: (FIXED_BBOX[1] + FIXED_BBOX[3]) / 2,
  zoom: 13.5,
  pitch: 0,
  bearing: 0,
};

export default function SatelliteMap({ opacity, changeGeoJson, selectedFeature, onFeatureClick }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const deckRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);

  // Initialize MapLibre with blank dark style
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: {
        version: 8,
        name: 'DGIS Dark Blank',
        sources: {},
        layers: [
          {
            id: 'background',
            type: 'background',
            paint: { 'background-color': '#080c14' },
          },
        ],
      },
      center: [INITIAL_VIEW.longitude, INITIAL_VIEW.latitude],
      zoom: INITIAL_VIEW.zoom,
      pitch: INITIAL_VIEW.pitch,
      bearing: INITIAL_VIEW.bearing,
      attributionControl: false,
      maxZoom: 18,
      minZoom: 10,
    });

    map.on('load', () => {
      mapRef.current = map;
      setMapReady(true);
    });

    return () => {
      if (deckRef.current) {
        deckRef.current.finalize();
        deckRef.current = null;
      }
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Initialize and update Deck.gl layers
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;

    const map = mapRef.current;

    const layers = buildLayers(opacity, changeGeoJson, selectedFeature, onFeatureClick);

    if (!deckRef.current) {
      const deck = new Deck({
        parent: mapContainerRef.current,
        controller: false,
        style: { position: 'absolute', top: 0, left: 0, pointerEvents: 'none' },
        layers,
        // Sync view state with MapLibre
        viewState: {
          longitude: map.getCenter().lng,
          latitude: map.getCenter().lat,
          zoom: map.getZoom(),
          pitch: map.getPitch(),
          bearing: map.getBearing(),
        },
      });

      deckRef.current = deck;

      // Sync MapLibre moves to Deck.gl
      const syncDeck = () => {
        if (!deckRef.current) return;
        deckRef.current.setProps({
          viewState: {
            longitude: map.getCenter().lng,
            latitude: map.getCenter().lat,
            zoom: map.getZoom(),
            pitch: map.getPitch(),
            bearing: map.getBearing(),
          },
        });
      };

      map.on('move', syncDeck);
      map.on('zoom', syncDeck);
    } else {
      deckRef.current.setProps({ layers });
    }
  }, [mapReady, opacity, changeGeoJson, selectedFeature, onFeatureClick]);

  return (
    <div ref={mapContainerRef} className="w-full h-full relative" />
  );
}

function buildLayers(opacity, changeGeoJson, selectedFeature, onFeatureClick) {
  const layers = [];

  // Date 1 satellite image (opacity is inverted — 0 = full date1, 1 = full date2)
  layers.push(
    new BitmapLayer({
      id: 'sentinel-date1',
      bounds: FIXED_BBOX,
      image: '/sentinel_date1.png',
      opacity: 1 - opacity,
      desaturate: 0,
      transparentColor: [0, 0, 0, 0],
    })
  );

  // Date 2 satellite image
  layers.push(
    new BitmapLayer({
      id: 'sentinel-date2',
      bounds: FIXED_BBOX,
      image: '/sentinel_date2.png',
      opacity: opacity,
      desaturate: 0,
      transparentColor: [0, 0, 0, 0],
    })
  );

  // Change detection GeoJSON overlay
  if (changeGeoJson) {
    layers.push(
      new GeoJsonLayer({
        id: 'change-detection-layer',
        data: changeGeoJson,
        pickable: true,
        stroked: true,
        filled: true,
        extruded: false,
        lineWidthMinPixels: 2,
        getFillColor: (f) => {
          const isSelected = selectedFeature && 
            f.properties.change_type === selectedFeature.properties.change_type;
          const severity = f.properties.severity;
          if (isSelected) return [255, 59, 59, 140];
          if (severity === 'high') return [239, 68, 68, 90];
          return [245, 158, 11, 70];
        },
        getLineColor: (f) => {
          const isSelected = selectedFeature && 
            f.properties.change_type === selectedFeature.properties.change_type;
          const severity = f.properties.severity;
          if (isSelected) return [255, 100, 100, 255];
          if (severity === 'high') return [239, 68, 68, 200];
          return [245, 158, 11, 180];
        },
        getLineWidth: (f) => {
          const isSelected = selectedFeature && 
            f.properties.change_type === selectedFeature.properties.change_type;
          return isSelected ? 3 : 2;
        },
        onClick: (info) => {
          if (info.object && onFeatureClick) {
            onFeatureClick(info.object);
          }
        },
        updateTriggers: {
          getFillColor: [selectedFeature],
          getLineColor: [selectedFeature],
          getLineWidth: [selectedFeature],
        },
      })
    );
  }

  return layers;
}
