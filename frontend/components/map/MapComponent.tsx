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

const DriverMarkerIcon = L.divIcon({
    html: `
        <div style="transform: rotate(0deg); transition: transform 0.3s ease;">
            <svg width="34" height="34" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <!-- Shadow -->
                <ellipse cx="50" cy="55" rx="35" ry="40" fill="black" fill-opacity="0.2"/>
                <!-- Car Body -->
                <path d="M30 25C30 15 35 10 50 10C65 10 70 15 70 25L75 45V80C75 85.5228 70.5228 90 65 90H35C29.4772 90 25 85.5228 25 80V45L30 25Z" fill="#0A192F"/>
                <!-- Windows -->
                <path d="M35 30L65 30L68 45H32L35 30Z" fill="#FFD700" fill-opacity="0.6"/>
                <rect x="30" y="50" width="40" height="25" rx="2" fill="#FFD700" fill-opacity="0.4"/>
                <!-- Headlights -->
                <rect x="32" y="15" width="8" height="4" rx="1" fill="white" fill-opacity="0.9"/>
                <rect x="60" y="15" width="8" height="4" rx="1" fill="white" fill-opacity="0.9"/>
                <!-- Tail Lights -->
                <rect x="28" y="85" width="10" height="3" rx="1" fill="#FF4444"/>
                <rect x="62" y="85" width="10" height="3" rx="1" fill="#FF4444"/>
            </svg>
        </div>
    `,
    className: "",
    iconSize: [34, 34],
    iconAnchor: [17, 17],
});

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
function BoundsHandler({ points }: { points: [number, number][] }) {
    const map = useMap();
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
    }, [pointsKey, map]);
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
            // Find ANY valid driver info to start the route from your position
            const activeDriver = nearbyDrivers?.[0] || (userLoc ? { location: { lat: userLoc[0], lng: userLoc[1] } } : null);

            let waypoints: [number, number][] = [];

            if (rideStatus === "ACCEPTED" || rideStatus === "ARRIVED") {
                // Route from Driver to Passenger Pickup
                const destination = passengerLoc || (stops.length > 0 ? stops[0] : null);
                if (activeDriver?.location && destination) {
                    waypoints = [
                        [activeDriver.location.lat, activeDriver.location.lng],
                        destination
                    ];
                }
            } else if (rideStatus === "STARTED") {
                // Route from current position to Destination
                const pickup = passengerLoc || userLoc;
                const destination = stops.length > 0 ? stops[stops.length - 1] : null;
                if (pickup && destination) {
                    waypoints = [pickup, destination];
                }
            } else {
                // Standard mode: Route through all stops
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

            // If the leg is extremely long (e.g., cross-continent), OSRM often returns 400.
            // Fallback to a straight line approximation to avoid spamming failed requests.
            const toRad = (deg: number) => deg * Math.PI / 180;
            const haversine = (a: [number, number], b: [number, number]) => {
                const R = 6371; // km
                const dLat = toRad(b[0] - a[0]);
                const dLon = toRad(b[1] - a[1]);
                const lat1 = toRad(a[0]);
                const lat2 = toRad(b[0]);
                const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
                return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
            };
            const approxDistanceKm = haversine(waypoints[0], waypoints[waypoints.length - 1]);
            if (approxDistanceKm > 2000) {
                setRouteData([...waypoints]);
                const estDurationMins = (approxDistanceKm / 60) * 60; // assume 60km/h
                onRouteInfo?.(approxDistanceKm, estDurationMins);
                return;
            }

            const coordsString = waypoints.map(p => `${p[1]},${p[0]}`).join(';');

            try {
                const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${coordsString}?overview=full&geometries=geojson`);

                if (!response.ok) {
                    setRouteData([...waypoints]);
                    onRouteInfo?.(approxDistanceKm, (approxDistanceKm / 50) * 60);
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
                    setRouteData([...waypoints]);
                    onRouteInfo?.(approxDistanceKm, (approxDistanceKm / 50) * 60);
                }
            } catch (err) {
                setRouteData([...waypoints]);
                onRouteInfo?.(approxDistanceKm, (approxDistanceKm / 50) * 60);
            }
        };

        const timer = setTimeout(fetchRoute, 500);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userLoc, JSON.stringify(stops), rideStatus, passengerLoc, JSON.stringify(nearbyDrivers)]);

    if (!mapMounted) {
        return <div className="w-full h-full bg-slate-100 animate-pulse flex items-center justify-center font-medium text-slate-400">Initializing Map...</div>;
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
                    if (idx === 0 && userLoc && stop[0] === userLoc[0] && stop[1] === userLoc[1]) {
                        return null; // Avoid rendering a redundant 'Pick-up' pin explicitly over the active 'Your Location' pulse pin
                    }
                    
                    return (
                        <Marker
                            key={`stop-${idx}-${stop.join('-')}`}
                            position={stop}
                            icon={idx === stops.length - 1 ? DestIcon : StopIcon}
                        >
                            <Popup className="font-bold">
                                {idx === stops.length - 1 ? `Final Destination` : (idx === 0 ? "Pick-up Location" : `Stop ${idx}`)}
                            </Popup>
                        </Marker>
                    );
                })}

                {/* Nearby Online Drivers */}
                {nearbyDrivers.filter((driver) => driver.location?.lat != null && driver.location?.lng != null).map((driver, idx) => (
                    <Marker
                        key={`driver-${driver.driverId || idx}-${driver.location.lat}-${driver.location.lng}`}
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
                <BoundsHandler points={allPoints} />

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
