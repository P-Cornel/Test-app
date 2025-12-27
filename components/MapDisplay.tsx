
import React, { useEffect, useRef } from 'react';
import { PlotPoint, StyleConfig, ThemeMode } from '../types';

interface MapDisplayProps {
  points: PlotPoint[];
  styleConfig: StyleConfig;
  theme: ThemeMode;
  onMarkerClick: (point: PlotPoint) => void;
}

declare const L: any; // Leaflet global with MarkerCluster plugin

const DEFAULT_COLOR = '#4f46e5'; // indigo-600

const hexToRgb = (hex: string): string => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? 
    `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : 
    '79, 70, 229';
};

const MapDisplay: React.FC<MapDisplayProps> = ({ points, styleConfig, theme, onMarkerClick }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<any>(null);
  const clusterGroup = useRef<any>(null);
  const tileLayer = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    if (!leafletMap.current) {
      leafletMap.current = L.map(mapRef.current, {
        zoomControl: false,
        maxZoom: 18
      }).setView([20, 0], 2);
      
      L.control.zoom({ position: 'bottomright' }).addTo(leafletMap.current);

      tileLayer.current = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; CartoDB'
      }).addTo(leafletMap.current);
      
      // Initialize Cluster Group
      clusterGroup.current = L.markerClusterGroup({
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        spiderfyOnMaxZoom: true,
        iconCreateFunction: (cluster: any) => {
          const markers = cluster.getAllChildMarkers();
          let totalLatento = 0;
          let hasNumericValue = false;

          markers.forEach((m: any) => {
            const val = m.options.latentoValue;
            if (val !== undefined && val !== null && val !== '') {
              const numericPart = String(val).replace(/[^0-9.-]/g, '');
              const num = parseFloat(numericPart);
              if (!isNaN(num)) {
                totalLatento += num;
                hasNumericValue = true;
              }
            }
          });

          const displayValue = hasNumericValue ? 
            (totalLatento % 1 === 0 ? totalLatento : totalLatento.toFixed(1)) : 
            cluster.getChildCount();

          const isDark = document.documentElement.classList.contains('dark');

          return L.divIcon({ 
            html: `<div><span>${displayValue}</span></div>`, 
            className: `latent-cluster ${isDark ? 'dark-cluster' : ''}`, 
            iconSize: L.point(40, 40) 
          });
        }
      });
      
      leafletMap.current.addLayer(clusterGroup.current);
    }
  }, []);

  // Effect to update tile layer on theme change
  useEffect(() => {
    if (!tileLayer.current) return;
    const lightUrl = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
    const darkUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
    tileLayer.current.setUrl(theme === 'dark' ? darkUrl : lightUrl);
    
    // Refresh clusters to apply dark class if needed
    if (clusterGroup.current) {
      clusterGroup.current.refreshClusters();
    }
  }, [theme]);

  const getMarkerColor = (point: PlotPoint): string => {
    if (!styleConfig.activeColumn || !styleConfig.rule) return DEFAULT_COLOR;
    const value = String(point.data[styleConfig.activeColumn]);
    return styleConfig.rule.colorMap[value] || DEFAULT_COLOR;
  };

  useEffect(() => {
    if (!leafletMap.current || !clusterGroup.current) return;

    clusterGroup.current.clearLayers();

    if (points.length === 0) return;

    points.forEach((point) => {
      const color = getMarkerColor(point);
      const rgb = hexToRgb(color);
      
      const latentoKey = Object.keys(point.data).find(k => k.toLowerCase() === 'latento');
      const latentoValue = latentoKey ? String(point.data[latentoKey]) : '';

      const icon = L.divIcon({
        className: 'latent-marker-wrapper',
        html: `
          <div class="latent-marker-container" style="--marker-color: ${color}; --marker-rgb: ${rgb};">
            <div class="latent-marker-core">
              ${latentoValue}
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const marker = L.marker([point.lat, point.lng], { 
        icon,
        latentoValue: latentoValue 
      });
      
      marker.on('click', () => onMarkerClick(point));
      
      const firstKey = Object.keys(point.data)[0];
      const label = point.data[firstKey] || 'Location';
      
      marker.bindTooltip(`
        <div class="font-sans ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}">
          <div class="font-bold text-sm mb-0.5">${label}</div>
          <div class="text-[10px] opacity-60 font-mono uppercase tracking-wider">
            ${point.lat.toFixed(4)}, ${point.lng.toFixed(4)}
          </div>
          ${latentoKey ? `<div class="mt-1 text-[10px] ${theme === 'dark' ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'} px-1.5 py-0.5 rounded inline-block font-bold">${latentoKey}: ${latentoValue}</div>` : ''}
        </div>
      `, { 
        direction: 'top', 
        offset: [0, -15],
        opacity: 0.95,
        className: theme === 'dark' ? 'dark-tooltip' : ''
      });
      
      clusterGroup.current.addLayer(marker);
    });

    if (points.length > 0) {
      const bounds = clusterGroup.current.getBounds();
      leafletMap.current.fitBounds(bounds, { padding: [100, 100], maxZoom: 14 });
    }
  }, [points, styleConfig, theme, onMarkerClick]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="absolute inset-0 z-0" />
      {points.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-sm z-10 transition-all duration-500">
          <div className="text-center p-8">
            <div className="w-16 h-16 bg-slate-200 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
              <svg className="w-8 h-8 text-slate-400 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <p className="text-slate-500 dark:text-slate-400 font-medium">No valid spatial data detected yet.</p>
            <p className="text-slate-400 dark:text-slate-500 text-xs mt-1 italic">Ensure your sheet has a "Latento" column for labels.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapDisplay;
