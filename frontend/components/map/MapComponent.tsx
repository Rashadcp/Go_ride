"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline, ZoomControl } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useState } from "react";
import { Target, MapPin } from "lucide-react";

// Fix for default marker icons
const DefaultIcon = L.icon({
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});

// Stop/Waypoint Icon (Gold)
const StopIcon = L.icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});

// Destination Icon (Red)
const DestIcon = L.icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});

// Custom Driver Icon (Car)
const DriverMarkerIcon = L.divIcon({
    html: `<div style="
        background-color: white; 
        width: 36px; 
        height: 36px; 
        border-radius: 12px; 
        display: flex; 
        items-center: center; 
        justify-content: center; 
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        border: 2px solid #0A192F;
        font-size: 20px;
        line-height: 1;
        padding-top: 4px;
    ">🚕</div>`,
    className: "custom-driver-icon",
    iconSize: [36, 36],
    iconAnchor: [18, 18],
});

L.Marker.prototype.options.icon = DefaultIcon;

// Helper to auto-fit map bounds
function BoundsHandler({ points }: { points: [number, number][] }) {
    const map = useMap();
    // Use a stringified version of points to ensure the hook only runs when coordinates actually change
    const pointsKey = JSON.stringify(points);

    useEffect(() => {
        if (points.length > 0) {
            try {
                const bounds = L.latLngBounds(points);
                map.fitBounds(bounds, { padding: [80, 80], animate: true });
            } catch (err) {
                console.warn("Map Bounds Error:", err);
            }
        }
    }, [pointsKey, map]); // Use string key for deep comparison
    return null;
}

// Separate component for centering on user location specifically
function RecenterHandler({ center }: { center: [number, number] | null }) {
    const map = useMap();
    const centerKey = center ? center.join(',') : '';

    useEffect(() => {
        if (center) {
            map.flyTo(center, map.getZoom(), { animate: true, duration: 1 });
        }
    }, [centerKey, map]); // Use stable string key
    return null;
}

interface MapProps {
    userLoc: [number, number] | null;
    stops: [number, number][]; // Array of stops (can include destination)
    onLocate: () => void;
    onRouteInfo?: (distance: number, duration: number) => void;
    showUserMarker?: boolean;
    nearbyDrivers?: { 
        driverId: string; 
        location: { lat: number; lng: number };
        name?: string;
        photo?: string;
        rating?: number;
    }[];
    rideStatus?: "ACCEPTED" | "ARRIVED" | "STARTED" | "COMPLETED" | null;
    passengerLoc?: [number, number] | null;
}

export default function MapComponent({
    userLoc,
    stops,
    onLocate,
    onRouteInfo,
    showUserMarker = true,
    nearbyDrivers = [],
    rideStatus = null,
    passengerLoc = null,
}: MapProps) {
    const [routeData, setRouteData] = useState<[number, number][]>([]);
    const [mapMounted, setMapMounted] = useState(false);

    useEffect(() => {
        setMapMounted(true);
        return () => setMapMounted(false);
    }, []);

    // Fetch Route from OSRM
    useEffect(() => {
        const fetchRoute = async () => {
            // Find active driver if in ride
            const activeDriver = nearbyDrivers?.length === 1 ? nearbyDrivers[0] : null;

            let waypoints: [number, number][] = [];

            if (rideStatus === "ACCEPTED" || rideStatus === "ARRIVED") {
                // Route from Driver to Passenger
                if (activeDriver && (passengerLoc || userLoc)) {
                    waypoints = [
                        [activeDriver.location.lat, activeDriver.location.lng],
                        (passengerLoc || userLoc)!
                    ];
                }
            } else if (rideStatus === "STARTED") {
                // Route from Passenger to Destination
                if ((passengerLoc || userLoc) && stops.length > 0) {
                    waypoints = [(passengerLoc || userLoc)!, stops[stops.length - 1]];
                }
            } else {
                // Standard mode: Route from user through all added stops in order
                if (userLoc && stops.length > 0) {
                    waypoints = [userLoc, ...stops];
                }
            }

            if (waypoints.length < 2) {
                setRouteData([]);
                onRouteInfo?.(0, 0);
                return;
            }

            const coordsString = waypoints.map(p => `${p[1]},${p[0]}`).join(';');

            try {
                const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${coordsString}?overview=full&geometries=geojson`);

                if (!response.ok) {
                    setRouteData([]);
                    onRouteInfo?.(0, 0);
                    return;
                }

                const data = await response.json();
                if (data.code === "Ok" && data.routes.length > 0) {
                    const route = data.routes[0];
                    const coords = route.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]);
                    setRouteData(coords);
                    
                    const distanceKm = route.distance / 1000;
                    const durationMins = route.duration / 60;
                    onRouteInfo?.(distanceKm, durationMins);
                } else {
                    setRouteData([]);
                    onRouteInfo?.(0, 0);
                }
            } catch (err) {
                setRouteData([]);
                onRouteInfo?.(0, 0);
            }
        };

        const timer = setTimeout(fetchRoute, 500);
        return () => clearTimeout(timer);
    }, [userLoc, stops, onRouteInfo, rideStatus, nearbyDrivers, passengerLoc]);

    if (!mapMounted) {
        return <div className="w-full h-full bg-slate-100 animate-pulse flex items-center justify-center font-medium text-slate-400">Initializing Map...</div>;
    }

    const defaultCenter: [number, number] = [40.73061, -73.935242]; // Default: NYC
    const center = userLoc || defaultCenter;

    return (
        <div className="w-full h-full relative z-0 group">
            <MapContainer
                key="driver-main-map"
                center={center}
                zoom={13}
                scrollWheelZoom={true}
                className="w-full h-full"
                zoomControl={false}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <ZoomControl position="bottomright" />

                {/* User Marker */}
                {showUserMarker && userLoc && (
                    <Marker position={userLoc}>
                        <Popup className="font-bold">Dispatch Location</Popup>
                    </Marker>
                )}

                {/* Waypoints/Stops Markers */}
                {stops.map((stop, idx) => (
                    <Marker
                        key={`stop-${idx}-${stop.join('-')}`}
                        position={stop}
                        icon={idx === stops.length - 1 ? DestIcon : StopIcon}
                    >
                        <Popup className="font-bold">
                            {idx === stops.length - 1 ? `Final Destination` : `Stop ${idx + 1}`}
                        </Popup>
                    </Marker>
                ))}

                {/* Nearby Online Drivers */}
                {nearbyDrivers.filter((driver) => driver.location?.lat != null && driver.location?.lng != null).map((driver, idx) => (
                    <Marker
                        key={`driver-marker-${driver.driverId || idx}`}
                        position={[driver.location.lat, driver.location.lng]}
                        icon={DriverMarkerIcon}
                    >
                        <Popup className="font-bold">
                            <div className="flex flex-col items-center gap-1">
                                <span>{driver.name || "Available Driver"}</span>
                                <span className="text-[10px] text-slate-400 font-medium">Verified Driver</span>
                            </div>
                        </Popup>
                    </Marker>
                ))}

                {/* Road Route Line */}
                {routeData.length > 0 && (
                    <Polyline
                        positions={routeData}
                        color="#0A192F"
                        weight={6}
                        opacity={0.9}
                    />
                )}

                {/* Decorative Inner Line */}
                {routeData.length > 0 && (
                    <Polyline
                        positions={routeData}
                        color="#FFD700"
                        weight={3}
                        opacity={1}
                        dashArray="1, 8"
                    />
                )}

                {/* Adjust View to fit all points */}
                <BoundsHandler points={stops.length > 0 && userLoc ? [userLoc, ...stops] : []} />

                {/* Specifically center on user if no stops are active */}
                {stops.length === 0 && <RecenterHandler center={userLoc} />}
            </MapContainer>

            {/* Locate Button Overlay */}
            <div className="absolute bottom-10 left-8 z-[400] pointer-events-auto">
                <button
                    onClick={onLocate}
                    className="w-14 h-14 bg-white rounded-2xl shadow-2xl flex items-center justify-center text-[#0A192F] hover:bg-[#FFD700] hover:text-[#0A192F] transition-all active:scale-90 group"
                    title="Locate Me"
                >
                    <Target className="w-6 h-6 group-hover:rotate-12 transition-transform" />
                </button>
            </div>

            <style jsx global>{`
        .leaflet-container {
          background: #f5f5f5;
        }
        .leaflet-overlay-pane path {
           stroke-linejoin: round;
           stroke-linecap: round;
        }
      `}</style>
        </div>
    );
}
