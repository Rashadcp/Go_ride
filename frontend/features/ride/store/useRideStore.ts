import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Stop {
  id: string;
  query: string;
  coords: [number, number] | null;
  suggestions: any[];
  showSuggestions: boolean;
}

interface RideState {
  dashboardStep: "SEARCH" | "CHOICE" | "ACTIVE";
  activeTab: string;
  isSidebarExpanded: boolean;
  isNotificationsOpen: boolean;

  // Ride Settings
  vehicleType: "go" | "sedan" | "xl" | "auto" | "bike" | "car";
  isSharedRide: boolean;
  isDriverMode: boolean;
  isDriverTripActive: boolean;
  routeInfo: { distance: number; duration: number };
  seatsAvailable: number;
  bookedCount: number;

  // Location & Search
  userLoc: [number, number] | null;
  stops: Stop[];
  driverDest: Stop;
  searchStarted: boolean;
  isRouteSearched: boolean;
  isSearchOpen: boolean;
  draggedIndex: number | null;

  // Data & Socket State
  visibleNearbyDrivers: any[];
  availableCarpools: any[];
  loadingDrivers: boolean;
  isRequestingRide: boolean;
  activeRide: any | null;
  pendingRideId: string | null;
  incomingCarpoolRequests: any[];
  paymentMethod: "WALLET" | "CASH" | "UPI";

  // Actions
  setDashboardStep: (step: "SEARCH" | "CHOICE" | "ACTIVE") => void;
  setActiveTab: (tab: string) => void;
  setIsSidebarExpanded: (v: boolean) => void;
  setIsNotificationsOpen: (v: boolean) => void;
  
  setVehicleType: (v: "go" | "sedan" | "xl" | "auto" | "bike" | "car") => void;
  setIsSharedRide: (v: boolean) => void;
  setIsDriverMode: (v: boolean) => void;
  setIsDriverTripActive: (v: boolean) => void;
  setRouteInfo: (v: { distance: number; duration: number }) => void;
  setSeatsAvailable: (v: number) => void;
  setBookedCount: (v: number) => void;

  setUserLoc: (v: [number, number] | null) => void;
  setStops: (v: Stop[] | ((prev: Stop[]) => Stop[])) => void;
  setDriverDest: (v: Stop | ((prev: Stop) => Stop)) => void;
  setSearchStarted: (v: boolean) => void;
  setIsRouteSearched: (v: boolean) => void;
  setIsSearchOpen: (v: boolean) => void;
  setDraggedIndex: (v: number | null) => void;

  setVisibleNearbyDrivers: (v: any[]) => void;
  setAvailableCarpools: (v: any[]) => void;
  setLoadingDrivers: (v: boolean) => void;
  setIsRequestingRide: (v: boolean) => void;
  setActiveRide: (v: any | null | ((prev: any) => any)) => void;
  setPendingRideId: (v: string | null) => void;
  setIncomingCarpoolRequests: (v: any[] | ((prev: any[]) => any[])) => void;
  setPaymentMethod: (v: "WALLET" | "CASH" | "UPI") => void;
  resetRideState: () => void;
}

export const useRideStore = create<RideState>()(
  persist(
    (set) => ({
      dashboardStep: "SEARCH",
      activeTab: "dashboard",
      isSidebarExpanded: false,
      isNotificationsOpen: false,

      vehicleType: "go",
      isSharedRide: false,
      isDriverMode: false,
      isDriverTripActive: false,
      routeInfo: { distance: 0, duration: 0 },
      seatsAvailable: 4,
      bookedCount: 1,

      userLoc: null,
      stops: [
        { id: 'pickup', query: '', coords: null, suggestions: [], showSuggestions: false },
        { id: 'dropoff', query: '', coords: null, suggestions: [], showSuggestions: false }
      ],
      driverDest: { id: 'driver-dest', query: '', coords: null, suggestions: [], showSuggestions: false },
      searchStarted: false,
      isRouteSearched: false,
      isSearchOpen: false,
      draggedIndex: null,

      visibleNearbyDrivers: [],
      availableCarpools: [],
      loadingDrivers: false,
      isRequestingRide: false,
      activeRide: null,
      pendingRideId: null,
      incomingCarpoolRequests: [],
      paymentMethod: "WALLET",

      // Actions
      setDashboardStep: (step) => set({ dashboardStep: step }),
      setActiveTab: (activeTab) => set({ activeTab }),
      setIsSidebarExpanded: (isSidebarExpanded) => set({ isSidebarExpanded }),
      setIsNotificationsOpen: (isNotificationsOpen) => set({ isNotificationsOpen }),

      setVehicleType: (vehicleType) => set({ vehicleType }),
      setIsSharedRide: (isSharedRide) => set({ isSharedRide }),
      setIsDriverMode: (isDriverMode) => set({ isDriverMode }),
      setIsDriverTripActive: (isDriverTripActive) => set({ isDriverTripActive }),
      setRouteInfo: (routeInfo) => set({ routeInfo }),
      setSeatsAvailable: (seatsAvailable) => set({ seatsAvailable }),
      setBookedCount: (bookedCount) => set({ bookedCount }),

      setUserLoc: (userLoc) => set({ userLoc }),
      setStops: (v) => set((state) => ({ stops: typeof v === 'function' ? v(state.stops) : v })),
      setDriverDest: (v) => set((state) => ({ driverDest: typeof v === 'function' ? v(state.driverDest) : v })),
      setSearchStarted: (searchStarted) => set({ searchStarted }),
      setIsRouteSearched: (isRouteSearched) => set({ isRouteSearched }),
      setIsSearchOpen: (isSearchOpen) => set({ isSearchOpen }),
      setDraggedIndex: (draggedIndex) => set({ draggedIndex }),

      setVisibleNearbyDrivers: (visibleNearbyDrivers) => set({ visibleNearbyDrivers }),
      setAvailableCarpools: (availableCarpools) => set({ availableCarpools }),
      setLoadingDrivers: (loadingDrivers) => set({ loadingDrivers }),
      setIsRequestingRide: (isRequestingRide) => set({ isRequestingRide }),
      setActiveRide: (v) => set((state) => ({ activeRide: typeof v === 'function' ? v(state.activeRide) : v })),
      setPendingRideId: (pendingRideId) => set({ pendingRideId }),
      setIncomingCarpoolRequests: (v) => set((state) => ({ incomingCarpoolRequests: typeof v === 'function' ? v(state.incomingCarpoolRequests) : v })),
      setPaymentMethod: (paymentMethod) => set({ paymentMethod }),
      resetRideState: () => set({
        activeRide: null,
        pendingRideId: null,
        isRouteSearched: false,
        searchStarted: false,
        isRequestingRide: false,
        loadingDrivers: false,
        stops: [
          { id: 'pickup', query: '', coords: null, suggestions: [], showSuggestions: false },
          { id: 'dropoff', query: '', coords: null, suggestions: [], showSuggestions: false }
        ],
        routeInfo: { distance: 0, duration: 0 },
        visibleNearbyDrivers: [],
      }),
    }),
    {
      name: "ride-storage",
      partialize: (state) => ({
        isDriverMode: state.isDriverMode,
        vehicleType: state.vehicleType,
        isSharedRide: state.isSharedRide,
        seatsAvailable: state.seatsAvailable,
        isRouteSearched: state.isRouteSearched,
        isDriverTripActive: state.isDriverTripActive,
        stops: state.stops.map(s => ({ id: s.id, query: s.query, coords: s.coords, suggestions: [], showSuggestions: false })),
        driverDest: { id: state.driverDest.id, query: state.driverDest.query, coords: state.driverDest.coords, suggestions: [], showSuggestions: false },
        paymentMethod: state.paymentMethod
      }),
    }
  )
);
