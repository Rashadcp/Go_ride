import { useCallback, useRef, useEffect } from "react";
import toast from "react-hot-toast";
import api from "@/lib/axios";
import { useRideStore } from "@/features/ride/store/useRideStore";
import { socket } from "@/lib/socket";

export const useMapLogic = () => {
  const {
    setUserLoc,
    setStops,
    setDriverDest,
    setRouteInfo,
    setIsSearchOpen,
    setIsRouteSearched,
    setSearchStarted,
    setLoadingDrivers,
    setDashboardStep,
    resetRideState,
    userLoc
  } = useRideStore();

  const debounceTimer = useRef<any>(null);
  const locationInterval = useRef<NodeJS.Timeout | null>(null);

  const handleLocate = useCallback(() => {
    if (!("geolocation" in navigator)) {
        toast.error("Geolocation is not supported by your browser.");
        return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const newLoc: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setUserLoc(newLoc);

        // Fetch location name for the "Current Location" field
        try {
          const { data } = await api.get(`/map/reverse-geocode`, {
            params: { lat: pos.coords.latitude, lon: pos.coords.longitude }
          });
          const address = data.locality || data.city || data.principalSubdivision || "Current Location";
          
          setStops((prev: any[]) => prev.map(s => 
            s.id === 'pickup' ? { ...s, query: address, coords: newLoc } : s
          ));
        } catch (e) {
          console.error("Reverse geocoding failed", e);
        }
      }, 
      (err) => {
        let errorMsg = "Could not get live location.";
        if (err.code === err.PERMISSION_DENIED) errorMsg = "Location access denied.";
        else if (err.code === err.TIMEOUT) {
            navigator.geolocation.getCurrentPosition(
              (p) => setUserLoc([p.coords.latitude, p.coords.longitude]), 
              () => { /* just skip if second attempt fails */ }, 
              { enableHighAccuracy: false, timeout: 10000 }
            );
            return;
        }
        toast.error(errorMsg);
      }, 
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, [setUserLoc, setStops]);

  // Automatic Location Update
  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    
    // We don't force a high-accuracy current position on mount
    // to avoid "User Gesture" policy violations in some browsers.
    // The explicit 'Locate Me' button still uses high-accuracy handleLocate.

    // Also use watchPosition for real-time reactivity when moving
    // This is more efficient for "every second" style movement
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setUserLoc([pos.coords.latitude, pos.coords.longitude]);
      },
      (err) => {
        if (err.code !== err.TIMEOUT) console.error("Watch-location error:", err);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 1000 }
    );
    
    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [handleLocate, setUserLoc]);

  const fetchSuggestions = async (id: string, query: string, biasLat = 11.0720, biasLon = 76.0740) => {
    if (query.length < 3) {
      setStops((prev: any[]) => prev.map(s => (s.id === id ? { ...s, suggestions: [], showSuggestions: false } : s)));
      return;
    }
    try {
      const { data } = await api.get(`/map/suggestions`, {
        params: { q: query, limit: 10, lat: biasLat, lon: biasLon },
      });
      const suggestions = data.features.map((f: any) => ({
        name: f.properties.name,
        city: f.properties.city || f.properties.state || "",
        country: f.properties.country,
        coords: [f.geometry.coordinates[1], f.geometry.coordinates[0]],
      }));
      setStops((prev: any[]) => prev.map(s => (s.id === id ? { ...s, suggestions, showSuggestions: true } : s)));
    } catch (err) {
      console.error("Autocomplete error:", err);
    }
  };

  const fetchDriverSuggestions = async (query: string, biasLat = 11.0720, biasLon = 76.0740) => {
    if (query.length < 3) {
      setDriverDest((prev: any) => ({ ...prev, suggestions: [], showSuggestions: false }));
      return;
    }
    try {
      const { data } = await api.get(`/map/suggestions`, {
        params: { q: query, limit: 10, lat: biasLat, lon: biasLon },
      });
      const suggestions = data.features.map((f: any) => ({
        name: f.properties.name,
        city: f.properties.city || f.properties.state || "",
        country: f.properties.country,
        coords: [f.geometry.coordinates[1], f.geometry.coordinates[0]],
      }));
      setDriverDest((prev: any) => ({ ...prev, suggestions, showSuggestions: true }));
    } catch (err) {
      console.error("Autocomplete error:", err);
    }
  };

  const handleInputChange = (id: string, query: string, biasLat?: number, biasLon?: number) => {
    setStops((prev: any[]) => {
      const exists = prev.some(s => s.id === id);
      if (!exists) {
        return [...prev, { id, query, coords: null, suggestions: [], showSuggestions: query.length >= 3 }];
      }
      return prev.map(s => s.id === id ? { 
        ...s, 
        query, 
        showSuggestions: query.length >= 3,
        // If query is cleared, clear the coordinates too
        coords: query.length === 0 ? null : s.coords 
      } : s);
    });

    // Reset map route if the destination query is cleared
    if (query.length === 0) {
      setIsRouteSearched(false);
      setSearchStarted(false);
      setLoadingDrivers(false);
    }

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    if (query.length >= 3) {
      debounceTimer.current = setTimeout(() => fetchSuggestions(id, query, biasLat, biasLon), 300);
    }
  };

  const handleDriverInputChange = (query: string, setIsDriverTripActive: (v: boolean) => void, biasLat?: number, biasLon?: number) => {
    const normalizedQuery = query || '';
    const isCleared = normalizedQuery.length === 0;

    setDriverDest((prev: any) => ({
      ...prev,
      query: normalizedQuery,
      coords: isCleared ? null : prev.coords,
      suggestions: isCleared ? [] : prev.suggestions,
      showSuggestions: normalizedQuery.length >= 3
    }));
    setIsDriverTripActive(false);

    if (isCleared) {
      setRouteInfo({ distance: 0, duration: 0 });
    }

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => fetchDriverSuggestions(normalizedQuery, biasLat, biasLon), 300);
  };

  const selectSuggestion = (stopId: string, sug: any) => {
    setStops((prev: any[]) => prev.map((s) => ({
      ...s,
      ...(s.id === stopId ? { query: `${sug.name}${sug.city ? ', ' + sug.city : ''}`, coords: sug.coords } : {}),
      showSuggestions: false,
    })));
    
    setIsSearchOpen(false);
    
    if (stopId !== 'pickup') {
      setSearchStarted(true);
      setLoadingDrivers(true);
      setIsRouteSearched(true);
      setDashboardStep("CHOICE");
      socket.emit("get-active-drivers");
      toast.success("Destination selected");
    } else {
      toast.success("Pickup location updated");
    }
  };

  const selectDriverSuggestion = (sug: any) => {
    setDriverDest((prev: any) => ({ ...prev, query: `${sug.name}${sug.city ? ', ' + sug.city : ''}`, coords: sug.coords, showSuggestions: false }));
    toast.success("Destination selected");
  };

  const removeStop = (id: string) => {
    const state = useRideStore.getState();
    if (state.stops.length === 1) return;
    setStops(state.stops.filter(s => s.id !== id));
    setIsRouteSearched(false);
    setSearchStarted(false);
    setLoadingDrivers(false);
  };

  return {
    handleLocate,
    handleInputChange,
    handleDriverInputChange,
    selectSuggestion,
    selectDriverSuggestion,
    removeStop
  };
};
