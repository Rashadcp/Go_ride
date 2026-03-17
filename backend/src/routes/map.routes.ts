import express from "express";
import axios from "axios";

const router = express.Router();

// Forward Geocoding using Nominatim (OSM)
router.get("/suggestions", async (req, res) => {
    try {
        const { q, limit, lat, lon } = req.query;
        
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

        res.json({ features });

    } catch (error: any) {
        console.error("Nominatim geocoding error:", error.message);
        res.status(500).json({ message: "Failed to fetch suggestions" });
    }
});

// Reverse Geocoding using Nominatim (OSM)
router.get("/reverse-geocode", async (req, res) => {
    try {
        const { lat, lon } = req.query;

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
        res.json(result);

    } catch (error: any) {
        console.error("Nominatim reverse geocoding error:", error.message);
        res.status(500).json({ message: "Failed to resolve location" });
    }
});

export default router;
