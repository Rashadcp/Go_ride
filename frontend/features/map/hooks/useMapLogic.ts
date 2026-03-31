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
        // We can't check store's userLoc here without adding it to deps, 
        // but we can just use the setter if it's currently null? 
        // Better: just let the store handle it.
        return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newLoc: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setUserLoc(newLoc);
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
  }, [setUserLoc]);

  // Automatic Location Update every second
  useEffect(() => {
    if (!("geolocation" in navigator)) return;

    // Initial locate
    handleLocate();

    // Start interval for automatic updates every 3 seconds
    const intervalId = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLoc([pos.coords.latitude, pos.coords.longitude]);
        },
        (err) => {
          // Log only major errors, ignore minor timeouts in background
          if (err.code !== err.TIMEOUT) {
            console.error("Auto-location error:", err);
          }
        },
        // More relaxed settings for the background poll
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 2000 }
      );
    }, 3000);

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
      if (intervalId) clearInterval(intervalId);
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
    setDriverDest((prev: any) => ({ ...prev, query: query || '', showSuggestions: (query || '').length >= 3 }));
    setIsDriverTripActive(false);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => fetchDriverSuggestions(query || '', biasLat, biasLon), 300);
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
