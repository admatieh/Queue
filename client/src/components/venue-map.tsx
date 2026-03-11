/**
 * VenueMap — uses vanilla Leaflet (no react-leaflet) to avoid
 * the react-leaflet v5 / React 18 incompatibility ("render2 is not a function").
 *
 * Two modes:
 *  • readonly  – static map with a fixed marker
 *  • interactive – draggable marker + click-to-pin; calls onMove(lat, lng)
 */
import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix broken default icon URLs when bundled with Vite/webpack
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface VenueMapProps {
    lat: number;
    lng: number;
    interactive?: boolean;
    /** Called when the user clicks or drags the marker (interactive mode only) */
    onMove?: (lat: number, lng: number) => void;
    className?: string;
}

export function VenueMap({ lat, lng, interactive = false, onMove, className }: VenueMapProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<L.Map | null>(null);
    const markerRef = useRef<L.Marker | null>(null);

    // Initialize the map once on mount
    useEffect(() => {
        if (!containerRef.current || mapRef.current) return;

        const map = L.map(containerRef.current, {
            center: [lat, lng],
            zoom: 15,
            scrollWheelZoom: interactive,
            dragging: interactive,
            zoomControl: interactive,
            doubleClickZoom: interactive,
            keyboard: interactive,
            touchZoom: interactive,
        });

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(map);

        const marker = L.marker([lat, lng], { draggable: interactive }).addTo(map);

        if (interactive && onMove) {
            marker.on("dragend", () => {
                const { lat: mLat, lng: mLng } = marker.getLatLng();
                onMove(mLat, mLng);
            });
            map.on("click", (e: L.LeafletMouseEvent) => {
                marker.setLatLng(e.latlng);
                onMove(e.latlng.lat, e.latlng.lng);
            });
        }

        mapRef.current = map;
        markerRef.current = marker;

        return () => {
            map.remove();
            mapRef.current = null;
            markerRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Fly to new coords when lat/lng props change externally (e.g. after geocode)
    useEffect(() => {
        if (!mapRef.current || !markerRef.current) return;
        mapRef.current.flyTo([lat, lng], mapRef.current.getZoom(), { duration: 0.8 });
        markerRef.current.setLatLng([lat, lng]);
    }, [lat, lng]);

    return <div ref={containerRef} className={className} style={{ minHeight: "200px" }} />;
}
