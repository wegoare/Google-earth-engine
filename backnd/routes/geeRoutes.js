const express = require("express");
const router = express.Router();
const ee = require("@google/earthengine");
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require("path");
require("dotenv").config();


// ✅ Load Service Account Key
const keyPath = path.resolve(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
console.log("🔹 Loading Service Account Key from:", keyPath);

const privateKey = require(keyPath);

// ✅ Initialize Google Earth Engine (Only Once)
const initializeGEE = () => {
    return new Promise((resolve, reject) => {
        if (ee.data.getAuthToken()) {
            console.log("✅ GEE Already Initialized");
            return resolve();
        }

        console.log("🔹 Initializing Google Earth Engine...");
        ee.data.authenticateViaPrivateKey(privateKey, () => {
            ee.initialize(null, null, () => {
                console.log("✅ GEE Initialized");
                resolve();
            }, reject);
        }, reject);
    });
};

// ✅ List of all supported indices
const indicesList = ["NDVI", "SAVI", "EVI", "GNDVI", "NDWI", "GCI", "NBR", "NDMI", "NDSI", "RVI"];

// ✅ Function to get the requested index layer
const getLayer = async (index, point) => {
    console.log(`🔹 Fetching ${index || "RGB"} layer for point:`, point.getInfo());

    const dataset = ee.ImageCollection("LANDSAT/LC08/C02/T1_TOA")
        .filterBounds(point)
        .filterDate("2023-01-01", "2023-12-31")
        .median();

    let image, visParams, valueImage;

    if (index === "NDVI") {
        console.log("🔹 Computing NDVI Layer...");
        image = dataset.expression("(NIR - RED) / (NIR + RED)", {
            NIR: dataset.select("B5"),
            RED: dataset.select("B4"),
        }).rename("NDVI");

        visParams = { min: -1, max: 1, palette: ["blue", "white", "green"] };
        valueImage = image;
    } 
    else if (index === "SAVI") {
        console.log("🔹 Computing SAVI Layer...");
        const L = 0.5;
        image = dataset.expression("((NIR - RED) / (NIR + RED + L)) * (1 + L)", {
            NIR: dataset.select("B5"),
            RED: dataset.select("B4"),
            L: ee.Number(L),
        }).rename("SAVI");

        visParams = { min: -1, max: 1, palette: ["yellow", "green", "darkgreen"] };
        valueImage = image;
    } 
    else if (index === "EVI") {
        console.log("🔹 Computing EVI Layer...");
        const G = 2.5, C1 = 6, C2 = 7.5, L = 1;
        image = dataset.expression(
            "G * ((NIR - RED) / (NIR + C1 * RED - C2 * BLUE + L))",
            {
                NIR: dataset.select("B5"),
                RED: dataset.select("B4"),
                BLUE: dataset.select("B2"),
                G: ee.Number(G),
                C1: ee.Number(C1),
                C2: ee.Number(C2),
                L: ee.Number(L),
            }
        ).rename("EVI");

        visParams = { min: -1, max: 1, palette: ["purple", "blue", "lightgreen", "darkgreen"] };
        valueImage = image;
    } 
    else if (index === "GNDVI") {
        console.log("🔹 Computing GNDVI Layer...");
        image = dataset.expression("(NIR - GREEN) / (NIR + GREEN)", {
            NIR: dataset.select("B5"),
            GREEN: dataset.select("B3"),
        }).rename("GNDVI");

        visParams = { min: -1, max: 1, palette: ["blue", "white", "green"] };
        valueImage = image;
    }
    else if (index === "NDWI") {
        console.log("🔹 Computing NDWI Layer...");
        image = dataset.expression("(GREEN - SWIR1) / (GREEN + SWIR1)", {
            GREEN: dataset.select("B3"),
            SWIR1: dataset.select("B6"),
        }).rename("NDWI");

        visParams = { min: -1, max: 1, palette: ["blue", "white", "green"] };
        valueImage = image;
    }
    else if (index === "GCI") {
        console.log("🔹 Computing GCI Layer...");
        image = dataset.expression("GREEN / RED - 1", {
            GREEN: dataset.select("B3"),
            RED: dataset.select("B4"),
        }).rename("GCI");

        visParams = { min: -1, max: 1, palette: ["yellow", "green", "darkgreen"] };
        valueImage = image;
    }
    else if (index === "NBR") {
        console.log("🔹 Computing NBR Layer...");
        image = dataset.normalizedDifference(["B5", "B7"]).rename("NBR");

        visParams = { min: -1, max: 1, palette: ["black", "red", "yellow"] };
        valueImage = image;
    }
    else if (index === "NDMI") {
        console.log("🔹 Computing NDMI Layer...");
        image = dataset.normalizedDifference(["B5", "B6"]).rename("NDMI");

        visParams = { min: -1, max: 1, palette: ["blue", "white", "green"] };
        valueImage = image;
    }
    else if (index === "NDSI") {
        console.log("🔹 Computing NDSI Layer...");
        image = dataset.normalizedDifference(["B3", "B6"]).rename("NDSI");

        visParams = { min: -1, max: 1, palette: ["blue", "white", "green"] };
        valueImage = image;
    }
    else if (index === "RVI") {
        console.log("🔹 Computing RVI Layer...");
        image = dataset.expression("NIR / RED", {
            NIR: dataset.select("B5"),
            RED: dataset.select("B4"),
        }).rename("RVI");

        visParams = { min: 0, max: 10, palette: ["blue", "green", "yellow", "red"] };
        valueImage = image;
    }
    else {
        console.log("🔹 Fetching RGB Visualization...");
        image = dataset;
        visParams = { bands: ["B4", "B3", "B2"], min: 0, max: 3000 };
        valueImage = null;
    }

    return { image, visParams, valueImage };
};

// ✅ Main API Route for single layer

// ✅ Area analysis for single index

router.post('/yield-analysis', async (req, res) => {
    try {
      const { indexData, location, polygon, area } = req.body;
      
      if (!indexData || !location || !polygon || !area) {
        return res.status(400).json({ error: 'Missing required data for yield analysis' });
      }
      
      // Extract individual indices
      const { 
        ndvi = 0, 
        savi = 0, 
        evi = 0, 
        gndvi = 0, 
        ndwi = 0, 
        gci = 0, 
        nbr = 0, 
        ndmi = 0, 
        ndsi = 0, 
        rvi = 0 
      } = indexData;
      
      // Calculate weighted average of indices for yield estimation
      // These weights should be calibrated based on specific crops and regions
      const weights = {
        ndvi: 0.35,  // NDVI has highest correlation with yield
        evi: 0.20,   // Enhanced Vegetation Index
        savi: 0.15,  // Soil Adjusted Vegetation Index
        gndvi: 0.10, // Green NDVI
        ndwi: 0.05,  // Water content
        gci: 0.05,   // Green Chlorophyll Index
        nbr: 0.025,  // Normalized Burn Ratio
        ndmi: 0.025, // Normalized Difference Moisture Index
        ndsi: 0.025, // Normalized Difference Snow Index
        rvi: 0.025   // Ratio Vegetation Index
      };
      
      // Calculate weighted score (0-1 scale)
      let weightedScore = 0;
      const indices = {};
      
      // Process each index
      Object.entries({ ndvi, savi, evi, gndvi, ndwi, gci, nbr, ndmi, ndsi, rvi }).forEach(([index, value]) => {
        // Normalize value (assuming indices range from -1 to 1)
        const normalizedValue = (parseFloat(value) + 1) / 2;
        weightedScore += normalizedValue * weights[index];
        
        // Determine impact for each index
        let impact;
        if (normalizedValue > 0.7) impact = 'Very positive';
        else if (normalizedValue > 0.5) impact = 'Positive';
        else if (normalizedValue > 0.3) impact = 'Neutral';
        else if (normalizedValue > 0.1) impact = 'Concerning';
        else impact = 'Critical';
        
        indices[index] = {
          value: parseFloat(value),
          impact
        };
      });
      
      // Convert weighted score to yield estimate (tons/hectare)
      // This is a simplified model - in reality, you would need crop-specific calibration
      const baseYield = 5; // Base yield in tons/hectare
      const maxYieldMultiplier = 2; // Maximum multiplier
      const estimatedYield = (baseYield * (1 + weightedScore * maxYieldMultiplier)).toFixed(2);
      
      // Determine overall health status
      let healthStatus;
      if (weightedScore > 0.7) healthStatus = 'Good';
      else if (weightedScore > 0.4) healthStatus = 'Average';
      else healthStatus = 'Poor';
      
      // Generate recommendations based on indices
      const recommendations = [];
      
      if (indices.ndvi.value < 0.3) {
        recommendations.push('Low vegetation density detected. Consider additional fertilization or checking for pest damage.');
      }
      
      if (indices.ndwi.value < -0.3) {
        recommendations.push('Low water content detected. Irrigation may be necessary to improve crop health.');
      }
      
      if (indices.savi.value < 0.2) {
        recommendations.push('Soil conditions may be affecting plant growth. Consider soil analysis and amendment.');
      }
      
      if (indices.gci.value < 1.5) {
        recommendations.push('Low chlorophyll content detected. Consider nitrogen supplementation.');
      }
      
      // Add general recommendation if everything seems good
      if (recommendations.length === 0) {
        recommendations.push('All vegetation indices show good crop health. Continue current management practices.');
      }
      
      // Create response object
      const response = {
        estimatedYield,
        healthStatus,
        indices,
        recommendations,
        areaAnalyzed: area,
        location: {
          lat: location.lat,
          lng: location.lng
        }
      };
      
      res.json(response);
      
    } catch (err) {
      console.error('Error in yield analysis:', err);
      res.status(500).json({ error: 'Failed to generate yield analysis' });
    }
  });
router.post("/area-layer", async (req, res) => {
    const { polygon, index } = req.body;

    if (!polygon || polygon.length < 3) {
        return res.status(400).json({ error: "Invalid polygon coordinates" });
    }

    try {
        await initializeGEE();
        const geometry = ee.Geometry.Polygon([polygon]);
        const { image, visParams, valueImage } = await getLayer(index, geometry);

        const [tileUrl, indexValue] = await Promise.all([
            new Promise((resolve, reject) => {
                image.getMap(visParams, (mapId, error) => {
                    error ? reject("Failed to load map layers") : resolve(mapId.urlFormat);
                });
            }),
            valueImage ? new Promise((resolve, reject) => {
                valueImage.reduceRegion({
                    reducer: ee.Reducer.mean(),
                    geometry: geometry,
                    scale: 30,
                    maxPixels: 1e9,
                }).evaluate((result, err) => {
                    err ? reject(err) : resolve({ [index]: result?.[index]?.toFixed(4) || "N/A" });
                });
            }) : Promise.resolve({ [index]: "N/A" })
        ]);

        return res.json({ tileUrl, indexValue });
    } catch (error) {
        console.error("Error:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

// ✅ Area analysis for all indices
router.post("/all-area-layers", async (req, res) => {
    const { polygon } = req.body;

    if (!polygon || polygon.length < 3) {
        return res.status(400).json({ error: "Invalid polygon coordinates" });
    }

    try {
        await initializeGEE();
        const geometry = ee.Geometry.Polygon([polygon]);
        
        const results = await Promise.all(
            indicesList.map(async (index) => {
                try {
                    const { image, visParams, valueImage } = await getLayer(index, geometry);
                    
                    const [tileUrl, value] = await Promise.all([
                        new Promise((resolve, reject) => {
                            image.getMap(visParams, (mapId, error) => {
                                error ? reject(`Failed to load ${index} layer`) : resolve(mapId.urlFormat);
                            });
                        }),
                        valueImage ? new Promise((resolve, reject) => {
                            valueImage.reduceRegion({
                                reducer: ee.Reducer.mean(),
                                geometry: geometry,
                                scale: 30,
                                maxPixels: 1e9,
                            }).evaluate((result, err) => {
                                err ? reject(err) : resolve(result?.[index]?.toFixed(4) || "N/A");
                            });
                        }) : Promise.resolve("N/A")
                    ]);

                    return { index, tileUrl, value };
                } catch (error) {
                    console.error(`Error processing ${index}:`, error);
                    return { index, tileUrl: null, value: "Error" };
                }
            })
        );

        return res.json({
            indices: results.reduce((acc, { index, tileUrl, value }) => {
                acc[index] = { tileUrl, value };
                return acc;
            }, {})
        });
    } catch (error) {
        console.error("Error:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});
router.get("/layer", async (req, res) => {
    const { lat, lng, index } = req.query;

    console.log("🔹 Received request:", { lat, lng, index });

    if (!lat || !lng) {
        return res.status(400).json({ error: "Missing latitude or longitude" });
    }

    try {
        const latitude = parseFloat(lat);
        const longitude = parseFloat(lng);

        if (isNaN(latitude) || isNaN(longitude)) {
            return res.status(400).json({ error: "Invalid latitude or longitude format" });
        }

        console.log(`🔹 Processing request for (${latitude}, ${longitude}), Index: ${index || "RGB"}`);

        // ✅ Initialize GEE (Only once)
        await initializeGEE();

        const point = ee.Geometry.Point([longitude, latitude]);

        // ✅ Get image layer and numerical value
        const { image, visParams, valueImage } = await getLayer(index, point);

        // 🟢 Create Promises for both Tile URL & Index Value
        const tileUrlPromise = new Promise((resolve, reject) => {
            image.getMap(visParams, (mapId, error) => {
                if (error) {
                    reject("Failed to load map layers.");
                } else {
                    resolve(mapId.urlFormat);
                }
            });
        });

        const indexValuePromise = valueImage
            ? new Promise((resolve, reject) => {
                valueImage.reduceRegion({
                    reducer: ee.Reducer.mean(),
                    geometry: point.buffer(100),
                    scale: 30,
                    maxPixels: 1e9,
                }).evaluate((result, err) => {
                    if (err) {
                        reject(err);
                    } else {
                        console.log(`🔹 ${index} Raw Data:`, result);
                        const value = result?.[index];
                        resolve(value !== null && value !== undefined ? { [index]: value.toFixed(4) } : { [index]: "N/A" });
                    }
                });
            })
            : Promise.resolve({ [index]: "N/A" });

        // ✅ Wait for both results
        const [tileUrl, indexValue] = await Promise.all([tileUrlPromise, indexValuePromise]);

        console.log("✅ Final Response:", { tileUrl, indexValue });

        return res.json({ tileUrl, indexValue });
    } catch (error) {
        console.error("❌ Error:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

router.get('/health-check', (req, res) => {
    res.status(200).json({ status: 'ok' });
  });

router.post('/yield-estimation', async (req, res) => {
    const { geometry, cropType, startDate, endDate } = req.body;
    
    if (!geometry || !cropType || !startDate || !endDate) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    try {
      const result = await calculateYieldAndIndices(geometry, cropType, startDate, endDate);
      res.json(result);
    } catch (error) {
      console.error('Error estimating yield:', error);
      res.status(500).json({ error: 'Failed to estimate yield' });
    }
  });


// ✅ NEW API Route for all layers at once
router.get("/all-layers", async (req, res) => {
    const { lat, lng } = req.query;

    console.log("🔹 Received request for ALL indices:", { lat, lng });

    if (!lat || !lng) {
        return res.status(400).json({ error: "Missing latitude or longitude" });
    }

    try {
        const latitude = parseFloat(lat);
        const longitude = parseFloat(lng);

        if (isNaN(latitude) || isNaN(longitude)) {
            return res.status(400).json({ error: "Invalid latitude or longitude format" });
        }

        console.log(`🔹 Processing ALL indices for (${latitude}, ${longitude})`);

        // ✅ Initialize GEE (Only once)
        await initializeGEE();

        const point = ee.Geometry.Point([longitude, latitude]);
        
        // Process all indices in parallel
        const results = await Promise.all(
            indicesList.map(async (index) => {
                try {
                    // Get image layer and numerical value for each index
                    const { image, visParams, valueImage } = await getLayer(index, point);

                    // Get tile URL
                    const tileUrl = await new Promise((resolve, reject) => {
                        image.getMap(visParams, (mapId, error) => {
                            if (error) {
                                reject("Failed to load map layers for " + index);
                            } else {
                                resolve(mapId.urlFormat);
                            }
                        });
                    });

                    // Get index value
                    const indexValue = valueImage
                        ? await new Promise((resolve, reject) => {
                            valueImage.reduceRegion({
                                reducer: ee.Reducer.mean(),
                                geometry: point.buffer(100),
                                scale: 30,
                                maxPixels: 1e9,
                            }).evaluate((result, err) => {
                                if (err) {
                                    reject(err);
                                } else {
                                    console.log(`🔹 ${index} Raw Data:`, result);
                                    const value = result?.[index];
                                    resolve(value !== null && value !== undefined ? value.toFixed(4) : "N/A");
                                }
                            });
                        })
                        : "N/A";

                    console.log(`✅ Processed ${index}:`, { tileUrl, indexValue });
                    
                    return {
                        index,
                        tileUrl,
                        value: indexValue
                    };
                } catch (error) {
                    console.error(`❌ Error processing ${index}:`, error);
                    return {
                        index,
                        tileUrl: null,
                        value: "Error"
                    };
                }
            })
        );

        // Transform array of results into an object for easier frontend consumption
        const response = {
            indices: results.reduce((acc, item) => {
                acc[item.index] = {
                    tileUrl: item.tileUrl,
                    value: item.value
                };
                return acc;
            }, {})
        };

        console.log("✅ Final ALL indices response prepared");
        return res.json(response);

    } catch (error) {
        console.error("❌ Error:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});


const landCoverClasses = {
  0: { name: "Water", color: "#0000FF" },
  1: { name: "Evergreen Needleleaf Forest", color: "#006400" },
  2: { name: "Evergreen Broadleaf Forest", color: "#008000" },
  3: { name: "Deciduous Needleleaf Forest", color: "#90EE90" },
  4: { name: "Deciduous Broadleaf Forest", color: "#ADFF2F" },
  5: { name: "Mixed Forests", color: "#FFFF00" },
  6: { name: "Closed Shrublands", color: "#FFA500" },
  7: { name: "Open Shrublands", color: "#FF4500" },
  8: { name: "Woody Savannas", color: "#A52A2A" },
  9: { name: "Savannas", color: "#FFC0CB" },
  10: { name: "Grasslands", color: "#7CFC00" },
  11: { name: "Permanent Wetlands", color: "#00CED1" },
  12: { name: "Croplands", color: "#FFFFE0" },
  13: { name: "Urban and Built-Up", color: "#D3D3D3" },
  14: { name: "Cropland/Natural Vegetation Mosaic", color: "#F5DEB3" },
  15: { name: "Snow and Ice", color: "#FFFFFF" },
  16: { name: "Barren or Sparsely Vegetated", color: "#808080" }
};


// Example backend route (Node.js with Express)
router.post('/land-classification', async (req, res) => {
  try {
    const { polygon } = req.body;
    
    // Validate polygon input
    if (
  !polygon ||
  !polygon.coordinates ||
  !Array.isArray(polygon.coordinates) ||
  !Array.isArray(polygon.coordinates[0]) ||
  polygon.coordinates[0].length < 3
) {
  return res.status(400).json({ error: "Invalid polygon coordinates" });
}

    // Convert polygon to Earth Engine geometry
    const eePolygon = ee.Geometry.Polygon(polygon.coordinates);
    
    // Get land cover data (using MODIS Land Cover Type)
    const landCover = ee.ImageCollection('MODIS/006/MCD12Q1')
      .filterDate('2020-01-01', '2020-12-31')
      .first()
      .select('LC_Type1');
    
    // Clip to the polygon
    const classifiedImage = landCover.clip(eePolygon);
    
    // Calculate area by class - using the corrected function
    const areaStats = await new Promise((resolve, reject) => {
      calculateAreaByClass(classifiedImage, eePolygon)
        .then(resolve)
        .catch(reject);
    });

    // Visualization parameters
    const visParams = {
      min: 0,
      max: 9,
      palette: Object.values(landCoverClasses).map(c => c.color)
    };
    
    // Get tile URL with proper error handling
    const tileUrl = await new Promise((resolve, reject) => {
      classifiedImage.getMapId(visParams, (mapId, error) => {
        if (error) {
          reject(new Error('Failed to generate map tiles'));
        } else {
          resolve(mapId.urlFormat);
        }
      });
    });
    
    res.json({
      success: true,
      classifiedImage: tileUrl,
      areaStats,
      classes: landCoverClasses, // Include class definitions in response
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Land classification error:', error);
    res.status(500).json({ 
      success: false,
      error: "Land classification failed",
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Corrected calculateAreaByClass function
async function calculateAreaByClass(image, region) {
  const areaImage = ee.Image.pixelArea().addBands(image);
  
  return new Promise((resolve, reject) => {
    areaImage.reduceRegion({
      reducer: ee.Reducer.sum().group({
        groupField: 1,
        groupName: 'class'
      }),
      geometry: region,
      scale: 500,
      maxPixels: 1e13
    }).evaluate(
      (result) => {
        try {
          const stats = {};
          if (result.groups && Array.isArray(result.groups)) {
            result.groups.forEach(group => {
              stats[group.class] = group.sum / 10000; // Convert to hectares
            });
            resolve(stats);
          } else {
            reject(new Error('Invalid data format from Earth Engine'));
          }
        } catch (parseError) {
          reject(parseError);
        }
      },
      (error) => reject(error)
    );
  });
}

module.exports = router;