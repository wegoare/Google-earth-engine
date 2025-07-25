
const ee = require("@google/earthengine");
const fs = require("fs");
const path = require("path");

const CREDENTIALS_PATH = path.resolve(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
console.log("🔹 Loading credentials from:", CREDENTIALS_PATH);
const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, "utf-8"));

let geeInitialized = false;

async function initializeGEE() {
    if (geeInitialized) {
        console.log("✅ GEE already initialized.");
        return;
    }

    return new Promise((resolve, reject) => {
        ee.data.authenticateViaPrivateKey(credentials, () => {
            ee.initialize(null, null, () => {
                console.log("✅ Google Earth Engine initialized successfully!");
                geeInitialized = true;
                resolve();
            }, (err) => {
                console.error("❌ Earth Engine initialization failed:", err);
                reject(err);
            });
        });
    });
}

async function getLayerURL(req, res) {
    try {
        const { lat, lng, index } = req.body;

        if (!lat || !lng) {
            return res.status(400).json({ error: "Latitude and Longitude are required" });
        }

        const point = ee.Geometry.Point([parseFloat(lng), parseFloat(lat)]);

        const image = ee.ImageCollection("COPERNICUS/S2")
            .filterBounds(point)
            .filterDate("2023-01-01", "2023-12-31")
            .sort("CLOUDY_PIXEL_PERCENTAGE")
            .first();

        const ndvi = image.normalizedDifference(["B8", "B4"]).rename("NDVI");
        const savi = image.expression(
            "((B8 - B4) / (B8 + B4 + 0.5)) * 1.5",
            { B8: image.select("B8"), B4: image.select("B4") }
        ).rename("SAVI");
        const evi = image.expression(
            "2.5 * ((B8 - B4) / (B8 + 6 * B4 - 7.5 * B2 + 1))",
            { B8: image.select("B8"), B4: image.select("B4"), B2: image.select("B2") }
        ).rename("EVI");
        const gndvi = image.normalizedDifference(["B8", "B3"]).rename("GNDVI");
        const ndwi = image.normalizedDifference(["B3", "B11"]).rename("NDWI");
        const gci = image.expression("B8 / B3 - 1", {
            B8: image.select("B8"),
            B3: image.select("B3"),
        }).rename("GCI");
        const nbr = image.normalizedDifference(["B11", "B8A"]).rename("NBR");
        const ndmi = image.normalizedDifference(["B8", "B11"]).rename("NDMI");
        const ndsi = image.normalizedDifference(["B3", "B11"]).rename("NDSI");
        const rvi = image.select("B8").divide(image.select("B4")).rename("RVI");

        async function getIndexValue(indexImage, indexName) {
            return new Promise((resolve, reject) => {
                indexImage.reduceRegion({
                    reducer: ee.Reducer.mean(),
                    geometry: point,
                    scale: 30,
                    maxPixels: 1e9,
                }).evaluate((result, err) => {
                    if (err) {
                        console.error(`❌ Error for ${indexName}:`, err);
                        reject(err);
                    } else {
                        resolve(result);
                    }
                });
            });
        }

        const indexValues = await Promise.all([
            getIndexValue(ndvi, "NDVI"),
            getIndexValue(savi, "SAVI"),
            getIndexValue(evi, "EVI"),
            getIndexValue(gndvi, "GNDVI"),
            getIndexValue(ndwi, "NDWI"),
            getIndexValue(gci, "GCI"),
            getIndexValue(nbr, "NBR"),
            getIndexValue(ndmi, "NDMI"),
            getIndexValue(ndsi, "NDSI"),
            getIndexValue(rvi, "RVI"),
        ]);

        const visParams = {
            NDVI: { min: -1, max: 1, palette: ["blue", "white", "green"] },
            SAVI: { min: -1, max: 1, palette: ["red", "yellow", "green"] },
            EVI: { min: -1, max: 1, palette: ["purple", "white", "orange"] },
            GNDVI: { min: -1, max: 1, palette: ["blue", "white", "green"] },
            NDWI: { min: -1, max: 1, palette: ["blue", "white", "green"] },
            GCI: { min: -1, max: 1, palette: ["blue", "white", "green"] },
            NBR: { min: -1, max: 1, palette: ["black", "red", "yellow"] },
            NDMI: { min: -1, max: 1, palette: ["blue", "white", "green"] },
            NDSI: { min: -1, max: 1, palette: ["blue", "white", "green"] },
            RVI: { min: 0, max: 10, palette: ["white", "green"] },
        };

        async function getTileURL(indexImage, vis) {
            return new Promise((resolve, reject) => {
                ee.Image(indexImage.visualize(vis)).getMapId((map, error) => {
                    if (error) reject(error);
                    else resolve(map.urlFormat);
                });
            });
        }

        const layers = [
            { name: "NDVI", value: indexValues[0].NDVI, url: await getTileURL(ndvi, visParams.NDVI) },
            { name: "SAVI", value: indexValues[1].SAVI, url: await getTileURL(savi, visParams.SAVI) },
            { name: "EVI", value: indexValues[2].EVI, url: await getTileURL(evi, visParams.EVI) },
            { name: "GNDVI", value: indexValues[3].GNDVI, url: await getTileURL(gndvi, visParams.GNDVI) },
            { name: "NDWI", value: indexValues[4].NDWI, url: await getTileURL(ndwi, visParams.NDWI) },
            { name: "GCI", value: indexValues[5].GCI, url: await getTileURL(gci, visParams.GCI) },
            { name: "NBR", value: indexValues[6].NBR, url: await getTileURL(nbr, visParams.NBR) },
            { name: "NDMI", value: indexValues[7].NDMI, url: await getTileURL(ndmi, visParams.NDMI) },
            { name: "NDSI", value: indexValues[8].NDSI, url: await getTileURL(ndsi, visParams.NDSI) },
            { name: "RVI", value: indexValues[9].RVI, url: await getTileURL(rvi, visParams.RVI) },
        ];

        const result = layers.reduce((acc, layer) => {
            acc[layer.name.toLowerCase()] = {
                tileUrl: layer.url,
                value: layer.value || "N/A",
            };
            return acc;
        }, {});

        return res.json(result);
    } catch (error) {
        console.error("❌ Error in GEE:", error);
        return res.status(500).json({ error: "Failed to get data", details: error.toString() });
    }
}

module.exports = { initializeGEE, getLayerURL };

