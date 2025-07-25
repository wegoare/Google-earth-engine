



// ==================================================================================
const express = require('express');
const router = express.Router();
/**
 * @api {post} /api/yield-analysis Calculate crop yield estimate with heatmap data
 * @apiName CalculateYieldWithHeatmap
 * @apiGroup YieldAnalysis
 * 
 * @apiParam {Object} geometry GeoJSON Polygon object
 * @apiParam {String} geometry.type Must be "Polygon"
 * @apiParam {Array} geometry.coordinates Array of coordinate rings
 * @apiParam {Object} indexData Vegetation indices data
 * @apiParam {String} [cropType="wheat"] Type of crop (default: wheat)
 * @apiParam {String} [startDate="2024-01-01"] Analysis start date (YYYY-MM-DD)
 * @apiParam {String} [endDate="2024-03-31"] Analysis end date (YYYY-MM-DD)
 * 
 * @apiSuccess {String} estimatedYield Estimated yield in tons/hectare
 * @apiSuccess {String} healthStatus Overall health status (Good/Average/Poor)
 * @apiSuccess {Object} indices Vegetation indices analysis
 * @apiSuccess {Array} recommendations Farming recommendations
 * @apiSuccess {Object} heatmap Heatmap data configuration
 * @apiSuccess {Array} heatmap.points Array of heatmap points with coordinates and intensity
 * @apiSuccess {Number} heatmap.radius Heatmap point radius
 * @apiSuccess {Object} bounds Bounding box for heatmap
 * 
 * @apiError (400) {String} error Missing or invalid data
 * @apiError (500) {String} error Server error
 */
router.post('/yield-analysis', async (req, res) => {
    try {
      // Log incoming request for debugging
      console.log('Yield analysis request received:', {
        body: req.body,
        timestamp: new Date().toISOString()
      });
  
      // Destructure and validate request body
      const { 
        geometry, 
        indexData = {}, 
        cropType = 'wheat', 
        startDate = '2024-01-01', 
        endDate = '2024-03-31' 
      } = req.body;
  
      // Validate required fields
      if (!geometry || !indexData) {
        console.error('Missing required fields');
        return res.status(400).json({ 
          error: 'Missing required fields: geometry and indexData are required' 
        });
      }
  
      // Validate GeoJSON polygon structure
      if (geometry.type !== 'Polygon' || !Array.isArray(geometry.coordinates)) {
        console.error('Invalid geometry format:', geometry);
        return res.status(400).json({ 
          error: 'Invalid geometry format. Expected GeoJSON Polygon with coordinates array' 
        });
      }
  
      // Validate coordinates (must have at least 4 points to form a closed polygon)
      const coords = geometry.coordinates[0];
      if (coords.length < 4) {
        console.error('Insufficient polygon points:', coords.length);
        return res.status(400).json({ 
          error: 'Polygon must have at least 4 points (first and last should be identical)' 
        });
      }
  
      // Validate first and last points match (closed polygon)
      const first = coords[0];
      const last = coords[coords.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) {
        console.error('Polygon not closed:', { first, last });
        return res.status(400).json({ 
          error: 'Polygon must be closed (first and last coordinates must match)' 
        });
      }
  
      // Validate index data
      if (typeof indexData !== 'object' || Object.keys(indexData).length === 0) {
        console.error('Invalid indexData:', indexData);
        return res.status(400).json({ 
          error: 'indexData must be an object with vegetation index values' 
        });
      }
  
      // Extract and normalize index values
      const normalizedIndices = {};
      const validIndices = [
        'ndvi', 'savi', 'evi', 'gndvi', 'ndwi', 
        'gci', 'nbr', 'ndmi', 'ndsi', 'rvi'
      ];
  
      // Process each index with validation
      validIndices.forEach(index => {
        const value = parseFloat(indexData[index]) || 0;
        
        // Validate value range (most indices range from -1 to 1)
        if (value < -1 || value > 1) {
          console.warn(`Index ${index} value ${value} is outside typical range (-1 to 1)`);
        }
        
        normalizedIndices[index] = value;
      });
  
      // Calculate weighted average of indices for yield estimation
      const weights = {
        ndvi: 0.35,  // Highest correlation with yield
        evi: 0.20,
        savi: 0.15,
        gndvi: 0.10,
        ndwi: 0.05,
        gci: 0.05,
        nbr: 0.025,
        ndmi: 0.025,
        ndsi: 0.025,
        rvi: 0.025
      };
  
      // Calculate weighted score (0-1 scale)
      let weightedScore = 0;
      const indices = {};
      
      Object.entries(normalizedIndices).forEach(([index, value]) => {
        // Normalize value to 0-1 range (assuming original range -1 to 1)
        const normalizedValue = (value + 1) / 2;
        weightedScore += normalizedValue * weights[index];
        
        // Determine impact for each index
        let impact;
        if (normalizedValue > 0.7) impact = 'Very positive';
        else if (normalizedValue > 0.5) impact = 'Positive';
        else if (normalizedValue > 0.3) impact = 'Neutral';
        else if (normalizedValue > 0.1) impact = 'Concerning';
        else impact = 'Critical';
  
        indices[index] = { value, impact };
      });
  
      // Convert weighted score to yield estimate (tons/hectare)
      const baseYield = getBaseYieldForCrop(cropType); // Dynamic base yield based on crop
      const maxYieldMultiplier = 2;
      const estimatedYield = (baseYield * (1 + weightedScore * maxYieldMultiplier)).toFixed(2);
  
      // Determine overall health status
      let healthStatus;
      if (weightedScore > 0.7) healthStatus = 'Good';
      else if (weightedScore > 0.4) healthStatus = 'Average';
      else healthStatus = 'Poor';
  
      // Generate recommendations based on indices and crop type
      const recommendations = generateRecommendations(indices, cropType);
  
      // Generate heatmap data points
      const heatmapPoints = generateHeatmapData(coords, weightedScore);
      
      // Calculate bounding box for the heatmap
      const bounds = calculateBoundingBox(coords);
  
      // Create response object with heatmap data
      const response = {
        success: true,
        estimatedYield: `${estimatedYield} tons/hectare`,
        healthStatus,
        indices,
        recommendations,
        heatmap: {
          points: heatmapPoints,
          radius: 25, // Optimal radius for visualization
          gradient: { 
            0.4: 'blue',
            0.6: 'cyan',
            0.7: 'lime',
            0.8: 'yellow',
            1.0: 'red'
          }
        },
        bounds,
        metadata: {
          cropType,
          analysisPeriod: `${startDate} to ${endDate}`,
          coordinates: first // Return first coordinate as reference point
        },
        timestamp: new Date().toISOString()
      };
  
      // Log successful response
      console.log('Yield analysis with heatmap completed:', {
        response: {
          ...response,
          heatmap: { ...response.heatmap, points: '[...]' } // Truncate points for logging
        }
      });
  
      res.json(response);
  
    } catch (err) {
      console.error('Error in yield analysis:', {
        error: err.message,
        stack: err.stack,
        timestamp: new Date().toISOString()
      });
      
      res.status(500).json({ 
        success: false,
        error: 'Failed to generate yield analysis',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  });
  
  // Helper function to generate heatmap data points
  // Updated generateHeatmapData function
function generateHeatmapData(coordinates, weightedScore) {
    const points = [];
    const numPoints = Math.min(200, coordinates.length); // Increased point count
    
    // Calculate center point for radial intensity variation
    const bounds = calculateBoundingBox(coordinates);
    const center = bounds.center;
    
    // Generate points with spatial variation
    for (let i = 0; i < numPoints; i++) {
      // Distribute points more evenly
      const index = Math.floor((i / numPoints) * (coordinates.length - 1));
      const [lng, lat] = coordinates[index];
      
      // Calculate distance from center (0-1 normalized)
      const distanceFromCenter = Math.sqrt(
        Math.pow(lat - center.lat, 2) + 
        Math.pow(lng - center.lng, 2)
      ) / Math.max(
        Math.abs(bounds.maxLat - bounds.minLat),
        Math.abs(bounds.maxLng - bounds.minLng)
      );
      
      // Create intensity based on distance and random variation
      const radialEffect = 1 - (distanceFromCenter * 0.5); // 50% intensity drop at edges
      const randomVariation = 0.9 + Math.random() * 0.2; // 10% variation
      const intensity = weightedScore * radialEffect * randomVariation;
      
      points.push({
        lat,
        lng,
        intensity: Math.min(1, Math.max(0, intensity)) // Clamp between 0-1
      });
    }
    
    return points;
  }
  
  // Helper function to calculate bounding box
  function calculateBoundingBox(coordinates) {
    let minLat = Infinity, maxLat = -Infinity;
    let minLng = Infinity, maxLng = -Infinity;
    
    coordinates.forEach(([lng, lat]) => {
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
    });
    
    return {
      minLat,
      maxLat,
      minLng,
      maxLng,
      center: {
        lat: (minLat + maxLat) / 2,
        lng: (minLng + maxLng) / 2
      }
    };
  }
  
  // Helper function to get base yield for different crops
  function getBaseYieldForCrop(cropType) {
    const cropYields = {
      wheat: 5,
      corn: 8,
      rice: 6,
      soybean: 3,
      barley: 4,
      cotton: 2
    };
    
    return cropYields[cropType.toLowerCase()] || 5; // Default to wheat yield
  }
  
  // Helper function to generate crop-specific recommendations
  function generateRecommendations(indices, cropType) {
    const recommendations = [];
    
    // General recommendations based on indices
    if (indices.ndvi.value < 0.3) {
      recommendations.push('Low vegetation density detected. Consider additional fertilization or checking for pest damage.');
    }
    
    if (indices.ndwi.value < -0.3) {
      recommendations.push('Low water content detected. Irrigation may be necessary to improve crop health.');
    }
    
    if (indices.savi.value < 0.2) {
      recommendations.push('Soil conditions may be affecting plant growth. Consider soil analysis and amendment.');
    }
    
    // Crop-specific recommendations
    switch(cropType.toLowerCase()) {
      case 'wheat':
        if (indices.gci.value < 1.5) {
          recommendations.push('Low chlorophyll detected in wheat. Consider nitrogen-rich fertilizer application.');
        }
        break;
        
      case 'corn':
        if (indices.evi.value < 0.4) {
          recommendations.push('Corn shows reduced vigor. Check for nutrient deficiencies or water stress.');
        }
        break;
        
      case 'rice':
        if (indices.ndwi.value > 0.4) {
          recommendations.push('High water content detected. Ensure proper drainage for rice paddies.');
        }
        break;
    }
    
    // Add general recommendation if everything seems good
    if (recommendations.length === 0) {
      recommendations.push('All vegetation indices show good crop health. Continue current management practices.');
    }
    
    return recommendations;
  }
  
  module.exports = router;

