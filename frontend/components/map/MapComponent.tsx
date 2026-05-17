"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline, ZoomControl } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useState } from "react";
import { Target, MapPin, Navigation } from "lucide-react";

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

const iconCache: Record<string, L.DivIcon> = {};

const getMarkerIcon = (type: string = 'go', rotation: number = 0) => {
    const color = "#0A192F";
    const highlight = "#FFD700";
    
    // Normalize rotation to nearest 5 degrees to avoid excessive cache entries
    // and keep transitions smooth but stable
    const normalizedRotation = Math.round(rotation / 5) * 5;
    const cacheKey = `${type}-${normalizedRotation}`;
    
    if (iconCache[cacheKey]) return iconCache[cacheKey];

    let iconHtml = '';
    
    if (type === 'bike') {
        iconHtml = `
            <div style="transform: rotate(${normalizedRotation}deg); transition: transform 0.5s ease-out;">
                <svg width="40" height="40" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <ellipse cx="50" cy="85" rx="30" ry="10" fill="black" fill-opacity="0.2"/>
                    <path d="M20 70H80V60C80 50 70 45 60 45H40C30 45 20 50 20 60V70Z" fill="#FFD700"/>
                    <path d="M35 45L45 25H55L65 45" stroke="#FFD700" stroke-width="8" stroke-linecap="round"/>
                    <circle cx="25" cy="70" r="12" fill="#0A192F" stroke="white" stroke-width="3"/>
                    <circle cx="75" cy="70" r="12" fill="#0A192F" stroke="white" stroke-width="3"/>
                    <rect x="40" y="40" width="20" height="8" rx="2" fill="#0A192F"/>
                    <path d="M55 25L65 20" stroke="#0A192F" stroke-width="4" stroke-linecap="round"/>
                </svg>
            </div>
        `;
    } else if (type === 'auto') {
        iconHtml = `
            <div style="transform: rotate(${normalizedRotation}deg); transition: transform 0.5s ease-out;">
                <svg width="38" height="38" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="25" y="20" width="50" height="60" rx="10" fill="${color}"/>
                    <rect x="30" y="30" width="40" height="25" rx="5" fill="${highlight}" fill-opacity="0.7"/>
                    <circle cx="50" cy="85" r="8" fill="black"/>
                    <rect x="30" y="20" width="40" height="5" rx="2" fill="${highlight}"/>
                </svg>
            </div>
        `;
    } else {
        iconHtml = `
            <div style="transform: rotate(${normalizedRotation}deg); transition: transform 0.5s ease-out;">
                <svg width="32" height="32" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="25" y="10" width="50" height="80" rx="15" fill="${color}"/>
                    <rect x="30" y="25" width="40" height="15" rx="4" fill="${highlight}" fill-opacity="0.6"/>
                    <circle cx="35" cy="18" r="4" fill="white" fill-opacity="0.9"/>
                    <circle cx="65" cy="18" r="4" fill="white" fill-opacity="0.9"/>
                </svg>
            </div>
        `;
    }

    const icon = L.divIcon({
        html: iconHtml,
        className: "smooth-marker",
        iconSize: type === 'bike' ? [40, 40] : (type === 'auto' ? [38, 38] : [32, 32]),
        iconAnchor: type === 'bike' ? [20, 20] : (type === 'auto' ? [19, 19] : [16, 16]),
    });

    iconCache[cacheKey] = icon;
    return icon;
};

const UserMarkerIcon = L.divIcon({
    html: `
        <div class="user-marker-pulse">
            <div class="pulse-ring"></div>
            <div class="dot"></div>
        </div>
    `,
    className: "custom-div-icon-user",
    iconSize: [30, 30],
    iconAnchor: [15, 15],
});

// Helper to auto-fit map bounds
function BoundsHandler({ points, stopsCount }: { points: [number, number][], stopsCount: number }) {
    const map = useMap();
    const [lastStopsCount, setLastStopsCount] = useState(-1);

    useEffect(() => {
        // Only trigger fitBounds if the number of stops changes (e.g. new destination or trip started)
        // or if it's the first time the map is mounting with points.
        if (points.length > 0 && stopsCount !== lastStopsCount) {
            try {
                const bounds = L.latLngBounds(points);
                map.fitBounds(bounds, { padding: [80, 80], animate: true, duration: 1.5 });
                setLastStopsCount(stopsCount);
            } catch (err) {
                console.warn("Map Bounds Error:", err);
            }
        }
    }, [points, stopsCount, lastStopsCount, map]);
    return null;
}

// Separate component for centering on a single point
function RecenterHandler({ center }: { center: [number, number] | null }) {
    const map = useMap();
    const centerKey = center ? center.join(",") : "";

    useEffect(() => {
        if (center) {
            map.flyTo(center, map.getZoom(), { animate: true, duration: 1 });
        }
    }, [centerKey, map]);
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
        location: { lat: number; lng: number; heading?: number };
        name?: string;
        photo?: string;
        rating?: number;
        vehicleType?: string;
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
    const [mapLoading, setMapLoading] = useState(true);

    useEffect(() => {
        setMapMounted(true);
        const timer = setTimeout(() => {
            setMapLoading(false);
        }, 1500);
        return () => {
            setMapMounted(false);
            clearTimeout(timer);
        };
    }, []);

    // Fetch Route from OSRM
    useEffect(() => {
        const fetchRoute = async () => {
            // The assigned driver is passed as the first element in nearbyDrivers when a ride is active
            const activeDriver = nearbyDrivers?.[0] || null;

            let waypoints: [number, number][] = [];

            if (rideStatus === "ACCEPTED" || rideStatus === "ARRIVED") {
                const destination = passengerLoc || (stops.length > 0 ? stops[0] : null);
                if (activeDriver?.location && destination) {
                    waypoints = [
                        [activeDriver.location.lat, activeDriver.location.lng],
                        destination
                    ];
                }
            } else if (rideStatus === "STARTED") {
                const pickup = passengerLoc || userLoc;
                const destination = stops.length > 0 ? stops[stops.length - 1] : null;
                if (pickup && destination) {
                    waypoints = [pickup, destination];
                }
            } else {
                if (stops.length >= 2) {
                    waypoints = [...stops];
                } else if (userLoc && stops.length === 1) {
                    waypoints = [userLoc, stops[0]];
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
                if (!response.ok) return;

                const data = await response.json();
                if (data.code === "Ok" && data.routes.length > 0) {
                    const route = data.routes[0];
                    const coords = route.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]);
                    setRouteData(coords);
                    onRouteInfo?.(route.distance / 1000, route.duration / 60);
                }
            } catch (err) {
                console.error("OSRM Error:", err);
            }
        };

        const timer = setTimeout(fetchRoute, 500);
        return () => clearTimeout(timer);
    }, [
        userLoc?.[0], userLoc?.[1], 
        JSON.stringify(stops), 
        rideStatus, 
        passengerLoc?.[0], passengerLoc?.[1],
        nearbyDrivers?.[0]?.driverId // Only re-run if the assigned driver changes, not on every move
    ]);

    if (!mapMounted) {
        return (
            <div className="w-full h-full bg-[#0A192F] flex flex-col items-center justify-center gap-6 select-none font-[family-name:var(--font-montserrat)] rounded-[32px] overflow-hidden">
                <div className="relative flex items-center justify-center">
                    <div className="absolute w-24 h-24 rounded-full border border-[#FFD700]/10 animate-ping duration-1000" />
                    <div className="absolute w-16 h-16 rounded-full border-2 border-t-[#FFD700] border-r-transparent border-b-transparent border-l-transparent animate-spin duration-700" />
                    <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center shadow-2xl relative z-10">
                        <Navigation className="w-6 h-6 text-[#FFD700] fill-current animate-pulse" />
                    </div>
                </div>
                <div className="text-center space-y-1.5 z-10">
                    <h2 className="text-white font-black text-xs uppercase tracking-[0.3em]">GO<span className="text-[#FFD700]">RIDE</span></h2>
                    <p className="text-slate-400 font-semibold text-[9px] uppercase tracking-widest animate-pulse">Initializing Live Map...</p>
                </div>
            </div>
        );
    }

    const driverPoints = nearbyDrivers
        .filter((driver) => driver.location?.lat != null && driver.location?.lng != null)
        .map((driver) => [driver.location.lat, driver.location.lng] as [number, number]);

    const allPoints: [number, number][] = [];
    if (userLoc) allPoints.push(userLoc);
    allPoints.push(...stops);
    allPoints.push(...driverPoints);

    const defaultCenter: [number, number] = [40.73061, -73.935242]; // Default: NYC
    const center = userLoc || driverPoints[0] || defaultCenter;

    return (
        <div className="w-full h-full relative z-0 group rounded-[32px] overflow-hidden">
            {/* Elegant glassmorphic Map Loader Overlay */}
            <div className={`absolute inset-0 bg-[#0A192F] flex flex-col items-center justify-center gap-6 z-[9999] transition-all duration-700 pointer-events-none select-none font-[family-name:var(--font-montserrat)] ${
                mapLoading ? "opacity-100 scale-100" : "opacity-0 scale-105"
            }`}>
                <div className="relative flex items-center justify-center">
                    <div className="absolute w-24 h-24 rounded-full border border-[#FFD700]/10 animate-ping duration-1000" />
                    <div className="absolute w-16 h-16 rounded-full border-2 border-t-[#FFD700] border-r-transparent border-b-transparent border-l-transparent animate-spin duration-700" />
                    <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center shadow-2xl relative z-10">
                        <Navigation className="w-6 h-6 text-[#FFD700] fill-current animate-pulse" />
                    </div>
                </div>
                <div className="text-center space-y-1.5 z-10">
                    <h2 className="text-white font-black text-xs uppercase tracking-[0.3em]">GO<span className="text-[#FFD700]">RIDE</span></h2>
                    <p className="text-slate-400 font-semibold text-[9px] uppercase tracking-widest animate-pulse">Loading Live Map...</p>
                </div>
            </div>

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

                {/* User/Driver Current Marker */}
                {showUserMarker && userLoc && (
                    <Marker position={userLoc} icon={UserMarkerIcon}>
                        <Popup className="font-bold">Your Location</Popup>
                    </Marker>
                )}

                {/* Passenger Pick-up Marker (Visible when heading to pickup) */}
                {passengerLoc && (rideStatus === "ACCEPTED" || rideStatus === "ARRIVED") && (
                    <Marker position={passengerLoc} icon={StopIcon}>
                        <Popup className="font-bold">Pick-up Location</Popup>
                    </Marker>
                )}

                {/* Waypoints/Stops Markers */}
                {stops.map((stop, idx) => {
                    if (!stop || stop.length < 2 || (stop[0] === 0 && stop[1] === 0)) return null;

                    if (idx === 0 && userLoc && stop[0] === userLoc[0] && stop[1] === userLoc[1]) {
                        return null; // Avoid rendering a redundant 'Pick-up' pin
                    }

                    return (
                        <Marker
                            key={`stop-${idx}-${stop.join('-')}`}
                            position={stop}
                            icon={StopIcon}
                        >
                            <Popup className="font-bold">
                                {idx === stops.length - 1 ? `Destination` : (idx === 0 ? "Pick-up Point" : `Stop ${idx}`)}
                            </Popup>
                        </Marker>
                    );
                })}

                {/* Nearby Online Drivers & Active Trip Driver */}
                {nearbyDrivers.filter((driver) => driver.location?.lat != null && driver.location?.lng != null).map((driver, idx) => (
                    <Marker
                        key={`driver-${driver.driverId || idx}`}
                        position={[driver.location.lat, driver.location.lng]}
                        icon={getMarkerIcon(driver.vehicleType, driver.location.heading)}
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

                {/* Adjust View only when route structure changes (stops) */}
                <BoundsHandler points={allPoints} stopsCount={stops.length + (passengerLoc ? 1 : 0)} />

                {/* Specifically center when nothing to fit yet */}
                {allPoints.length === 0 && <RecenterHandler center={center} />}
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
        .leaflet-marker-icon {
            transition: transform 0.8s linear, left 0.8s linear, top 0.8s linear;
        }
        .user-marker-pulse {
            position: relative;
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .dot {
            width: 12px;
            height: 12px;
            background-color: #3B82F6;
            border: 2px solid white;
            border-radius: 50%;
            z-index: 2;
            box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);
        }
        .pulse-ring {
            position: absolute;
            width: 30px;
            height: 30px;
            background-color: rgba(59, 130, 246, 0.4);
            border-radius: 50%;
            animation: pulse 2s infinite;
            z-index: 1;
        }
        @keyframes pulse {
            0% {
                transform: scale(0.5);
                opacity: 0.8;
            }
            100% {
                transform: scale(2.5);
                opacity: 0;
            }
        }
      `}</style>
        </div>
    );
}
