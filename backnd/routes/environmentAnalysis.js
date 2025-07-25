const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const cors = require('cors');

router.use(cors());

console.log('[Backend] Environment Yield route initialized');

// Mock weather data service
const mockWeatherData = {
  getWeatherForLocation: (lat, lng, startDate, endDate) => {
    console.log(`[Backend] Generating mock weather for ${lat},${lng} from ${startDate} to ${endDate}`);
    return {
      avgTemp: 25 + Math.random() * 7,
      relHumidity: 55 + Math.random() * 20,
      precipitation: 60 + Math.random() * 50,
      cloudCover: 20 + Math.random() * 30,
      windSpeed: 2 + Math.random() * 3,
      surfacePressure: 1010 + Math.random() * 10
    };
  }
};

const CROP_PARAMETERS = {
  wheat: { baseYield: 4.0, ndviMultiplier: 0.8, saviWeight: 0.3, eviWeight: 0.2 },
  rice: { baseYield: 5.5, ndviMultiplier: 0.9, saviWeight: 0.4, eviWeight: 0.2 },
  maize: { baseYield: 6.2, ndviMultiplier: 0.85, saviWeight: 0.3, eviWeight: 0.3 },
  cotton: { baseYield: 2.8, ndviMultiplier: 0.7, saviWeight: 0.2, eviWeight: 0.4 },
  soybean: { baseYield: 3.5, ndviMultiplier: 0.75, saviWeight: 0.25, eviWeight: 0.25 }
};

const calculateVegetationIndices = (ndvi) => {
  console.log(`[Backend] Calculating vegetation indices for NDVI: ${ndvi}`);
  return {
    NDVI: ndvi,
    SAVI: ndvi * 0.82 + 0.05,
    EVI: ndvi * 0.76 + 0.08
  };
};

const calculateYield = (indices, cropType, weatherData) => {
  console.log(`[Backend] Calculating yield for ${cropType}`);
  const params = CROP_PARAMETERS[cropType] || CROP_PARAMETERS.wheat;
  let yield = params.baseYield * (0.8 + indices.NDVI * params.ndviMultiplier);
  yield += indices.SAVI * params.saviWeight + indices.EVI * params.eviWeight;
  const tempFactor = 1 - Math.abs(weatherData.avgTemp - 25) / 40;
  const precipFactor = Math.min(weatherData.precipitation / 100, 1.2);
  return parseFloat((yield * tempFactor * precipFactor).toFixed(2));
};

const processPolygon = (polygon) => {
  if (!polygon?.geometry?.coordinates?.[0]?.length) {
    console.log('[Backend] Invalid or empty polygon provided');
    return { area: 0, centroid: null };
  }
  
  const coords = polygon.geometry.coordinates[0];
  const centroid = coords.reduce((acc, [lng, lat]) => {
    acc.lng += lng;
    acc.lat += lat;
    return acc;
  }, { lng: 0, lat: 0 });
  
  centroid.lng /= coords.length;
  centroid.lat /= coords.length;

  // Simplified area calculation
  const area = coords.slice(0, -1).reduce((sum, [lng1, lat1], i) => {
    const [lng2, lat2] = coords[i + 1];
    return sum + (lng2 - lng1) * (2 + Math.sin(lat1) + Math.sin(lat2));
  }, 0) * 6371000 * 6371000 / 2 / 10000;

  console.log(`[Backend] Processed polygon: ${coords.length} points, area: ${area} hectares`);
  
  return {
    area: parseFloat(Math.abs(area).toFixed(2)),
    centroid
  };
};

router.post('/analyze', [
  check('cropType').notEmpty().withMessage('Crop type is required'),
  check('startDate').notEmpty().withMessage('Start date is required'),
  check('endDate').notEmpty().withMessage('End date is required'),
  check('ndvi').isFloat({ min: -1, max: 1 }).withMessage('Valid NDVI value (-1 to 1) required')
], async (req, res) => {
  console.log('[Backend] Analyze request received');
  
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error('[Backend] Validation errors:', errors.array());
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { cropType, startDate, endDate, ndvi, polygon, location } = req.body;
    console.log('[Backend] Processing request for:', { cropType, startDate, endDate });

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) {
      console.error('[Backend] Invalid date range:', { startDate, endDate });
      return res.status(400).json({ errors: [{ msg: 'End date must be after start date' }] });
    }

    // Process location
    const { centroid: analysisLocation, area: areaHectares = 1 } = polygon ? 
      processPolygon(polygon) : { centroid: location };
    
    if (!analysisLocation) {
      console.error('[Backend] Missing location data');
      return res.status(400).json({ errors: [{ msg: 'Location data required' }] });
    }

    console.log(`[Backend] Analysis location: ${JSON.stringify(analysisLocation)}`);

    // Get weather data
    const weatherData = mockWeatherData.getWeatherForLocation(
      analysisLocation.lat, 
      analysisLocation.lng,
      startDate,
      endDate
    );

    // Calculate vegetation indices
    const vegetationIndices = calculateVegetationIndices(ndvi);

    // Calculate yield
    const environmentYield = calculateYield(vegetationIndices, cropType, weatherData);
    const totalProduction = environmentYield * areaHectares;

    console.log('[Backend] Analysis completed successfully');
    
    res.json({
      success: true,
      data: {
        location: analysisLocation,
        area: areaHectares,
        vegetationIndices,
        weatherData,
        environmentYield,
        totalProduction: parseFloat(totalProduction.toFixed(2)),
        cropType,
        analysisRange: { startDate, endDate }
      }
    });
    
  } catch (err) {
    console.error('[Backend] Analysis error:', err.stack);
    res.status(500).json({ 
      errors: [{ msg: 'Server error processing environment yield analysis' }] 
    });
  }
});

router.get('/crops', (req, res) => {
  console.log('[Backend] Getting crop list');
  res.json({
    success: true,
    data: Object.keys(CROP_PARAMETERS).map(crop => ({
      id: crop,
      name: crop.charAt(0).toUpperCase() + crop.slice(1)
    }))
  });
});

module.exports = router;