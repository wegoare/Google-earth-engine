

const express = require('express');
const axios = require('axios');
const router = express.Router();

// Constants for validation
const VALID_CROPS = ['Wheat', 'Rice', 'Maize', 'Millet', 'Barley'];
const MIN_NDVI = 0;
const MAX_NDVI = 1;

// Middleware for input validation
const validatePredictInput = (req, res, next) => {
  const { crop_type, ndvi } = req.body;

  if (!crop_type || typeof ndvi !== 'number') {
    return res.status(400).json({
      error: 'Invalid input',
      details: {
        crop_type: crop_type ? 'Valid' : 'Missing',
        ndvi: typeof ndvi === 'number' ? 'Valid' : 'Missing or invalid type'
      }
    });
  }

  if (!VALID_CROPS.includes(crop_type)) {
    return res.status(400).json({
      error: 'Invalid crop type',
      validCrops: VALID_CROPS,
      received: crop_type
    });
  }

  // if (ndvi < MIN_NDVI || ndvi > MAX_NDVI) {
  //   return res.status(400).json({
  //     error: 'Invalid NDVI value',
  //     message: `NDVI must be between ${MIN_NDVI} and ${MAX_NDVI}`,
  //     received: ndvi
  //   });
  // }

  next();
};

// Middleware for recommended crop validation
const validateRecommendedCropInput = (req, res, next) => {
  const { ndvi } = req.body;

  if (typeof ndvi !== 'number') {
    return res.status(400).json({
      error: 'Invalid input',
      details: {
        ndvi: 'Must be a number'
      }
    });
  }

  // if (ndvi < MIN_NDVI || ndvi > MAX_NDVI) {
  //   return res.status(400).json({
  //     error: 'Invalid NDVI value',
  //     message: `NDVI must be between ${MIN_NDVI} and ${MAX_NDVI}`,
  //     received: ndvi
  //   });
  // }

  next();
};

// Middleware for NDVI history validation
const validateNdviHistoryInput = (req, res, next) => {
  const { start_date, end_date } = req.query;

  if (!start_date || !end_date) {
    return res.status(400).json({
      error: 'Invalid input',
      details: {
        start_date: start_date ? 'Valid' : 'Missing',
        end_date: end_date ? 'Valid' : 'Missing'
      }
    });
  }

  // Validate date format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(start_date) || !dateRegex.test(end_date)) {
    return res.status(400).json({
      error: 'Invalid date format',
      message: 'Dates should be in YYYY-MM-DD format',
      received: { start_date, end_date }
    });
  }

  // Check if start date is before end date
  const startDateObj = new Date(start_date);
  const endDateObj = new Date(end_date);
  
  if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
    return res.status(400).json({
      error: 'Invalid date values',
      message: 'One or both dates are invalid',
      received: { start_date, end_date }
    });
  }

  if (startDateObj > endDateObj) {
    return res.status(400).json({
      error: 'Invalid date range',
      message: 'Start date must be before or equal to end date',
      received: { start_date, end_date }
    });
  }

  next();
};

// Predict yield endpoint
router.post('/', validatePredictInput, async (req, res) => {
  const { crop_type, ndvi } = req.body;

  try {
    console.log(`Making prediction request for ${crop_type} with NDVI ${ndvi}`);
    const response = await axios.post('http://localhost:8000/api/predict-yield', {
      crop_type: crop_type,
      ndvi: ndvi
    }, {
      timeout: 5000 // 5 second timeout
    });

    console.log('Prediction successful:', response.data);
    res.json({
      success: true,
      ...response.data
    });

  } catch (error) {
    console.error('Prediction API error:', error.message);

    if (error.response) {
      // Forward the error from the prediction service
      res.status(error.response.status).json({
        error: 'Prediction service error',
        details: error.response.data
      });
    } else if (error.request) {
      // No response received
      res.status(503).json({ 
        error: 'Prediction service unavailable',
        message: 'The prediction service did not respond'
      });
    } else {
      // Other errors
      res.status(500).json({ 
        error: 'Internal server error',
        details: error.message
      });
    }
  }
});

// Recommended crop endpoint
router.post('/recommended-crop', validateRecommendedCropInput, async (req, res) => {
  const { ndvi } = req.body;

  try {
    console.log(`Requesting recommended crop for NDVI ${ndvi}`);
    const response = await axios.post('http://localhost:8000/api/recommended-crop', {
      ndvi: ndvi
    }, {
      timeout: 5000 // 5 second timeout
    });

    console.log('Recommended crop successful:', response.data);
    res.json({
      success: true,
      ...response.data
    });

  } catch (error) {
    console.error('Recommended crop API error:', error.message);

    if (error.response) {
      // Forward the error from the recommendation service
      res.status(error.response.status).json({
        error: 'Recommendation service error',
        details: error.response.data
      });
    } else if (error.request) {
      // No response received
      res.status(503).json({ 
        error: 'Recommendation service unavailable',
        message: 'The recommendation service did not respond'
      });
    } else {
      // Other errors
      res.status(500).json({ 
        error: 'Internal server error',
        details: error.message
      });
    }
  }
});

// New endpoint for NDVI history
router.get('/ndvi-history', validateNdviHistoryInput, async (req, res) => {
  const { start_date, end_date } = req.query;

  try {
    console.log(`Requesting NDVI history from ${start_date} to ${end_date}`);
    const response = await axios.get('http://localhost:8000/api/ndvi-history', {
      params: {
        start_date: start_date,
        end_date: end_date
      },
      timeout: 5000 // 5 second timeout
    });

    console.log('NDVI history retrieval successful');
    res.json({
      success: true,
      ...response.data
    });

  } catch (error) {
    console.error('NDVI history API error:', error.message);

    if (error.response) {
      // Forward the error from the history service
      res.status(error.response.status).json({
        error: 'NDVI history service error',
        details: error.response.data
      });
    } else if (error.request) {
      // No response received
      res.status(503).json({ 
        error: 'NDVI history service unavailable',
        message: 'The NDVI history service did not respond'
      });
    } else {
      // Other errors
      res.status(500).json({ 
        error: 'Internal server error',
        details: error.message
      });
    }
  }
});

module.exports = router;