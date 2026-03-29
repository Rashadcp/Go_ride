import express from "express";
import axios from "axios";
import { getCache, setCache } from "../config/redis";

const router = express.Router();
const MAP_CACHE_TTL_SECONDS = 300;

const buildCacheKey = (prefix: string, payload: Record<string, unknown>) => {
    const params = new URLSearchParams();

    Object.entries(payload).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
            params.set(key, String(value));
        }
    });

    return `goride:${prefix}:${params.toString()}`;
};

// Forward Geocoding using Nominatim (OSM)
router.get("/suggestions", async (req, res) => {
    try {
        const { q, limit, lat, lon } = req.query;
        const cacheKey = buildCacheKey("maps:suggestions", { q, limit, lat, lon });
        const cached = await getCache(cacheKey);

        if (cached) {
            return res.json(JSON.parse(cached));
        }
        
        console.log(`Nominatim search for: ${q} at [${lat}, ${lon}]`);
        
        const response = await axios.get(`https://nominatim.openstreetmap.org/search`, {
            params: {
                q,
                format: "json",
                limit: limit || 10,
                addressdetails: 1,
                countrycodes: "in", // Bias to India
                lat,
                lon
            },
            headers: {
                'User-Agent': 'GoRideApp/1.0'
            }
        });

        // Convert Nominatim format to a clean GeoJSON-like format for the frontend
        const features = response.data.map((item: any) => {
            const addr = item.address;
            const name = item.display_name.split(',')[0];
            const city = addr.city || addr.town || addr.village || addr.suburb || addr.municipality || addr.county || "";
            
            return {
                type: "Feature",
                geometry: {
                    type: "Point",
                    coordinates: [parseFloat(item.lon), parseFloat(item.lat)]
                },
                properties: {
                    name: name,
                    city: city,
                    state: addr.state || "",
                    country: addr.country || ""
                }
            };
        });

        const payload = { features };
        await setCache(cacheKey, JSON.stringify(payload), MAP_CACHE_TTL_SECONDS);
        res.json(payload);

    } catch (error: any) {
        console.error("Nominatim geocoding error:", error.message);
        res.status(500).json({ message: "Failed to fetch suggestions" });
    }
});

// Reverse Geocoding using Nominatim (OSM)
router.get("/reverse-geocode", async (req, res) => {
    try {
        const { lat, lon } = req.query;
        const cacheKey = buildCacheKey("maps:reverse", { lat, lon });
        const cached = await getCache(cacheKey);

        if (cached) {
            return res.json(JSON.parse(cached));
        }

        const response = await axios.get(`https://nominatim.openstreetmap.org/reverse`, {
            params: {
                lat,
                lon,
                format: "json",
                addressdetails: 1
            },
            headers: { 
                'User-Agent': 'GoRideApp/1.0' 
            }
        });
        
        const addr = response.data.address;
        const result = {
            locality: addr.suburb || addr.neighbourhood || addr.village || addr.city_district || "",
            city: addr.city || addr.town || addr.municipality || addr.county || "",
            principalSubdivision: addr.state || "",
        };
        await setCache(cacheKey, JSON.stringify(result), MAP_CACHE_TTL_SECONDS);
        res.json(result);

    } catch (error: any) {
        console.error("Nominatim reverse geocoding error:", error.message);
        res.status(500).json({ message: "Failed to resolve location" });
    }
});

export default router;
