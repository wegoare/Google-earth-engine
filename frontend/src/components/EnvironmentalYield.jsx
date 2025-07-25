import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  MapPin, BarChart2, Droplet, Wind, Cloud, Sun,
  ChevronDown, ChevronUp, ThermometerSun, ThermometerSnowflake
} from 'lucide-react';
import './EnvironmentYield.css';

const EnvironmentYield = () => {
  console.log('[Frontend] Component initialized');
  const { state: locationState } = useLocation();
  
  const getInitialData = () => {
    console.log('[Frontend] Getting initial data');
    try {
      // First check for state from navigation
      if (locationState) {
        console.log('Found data in location state:', {
          ndvi: locationState.ndvi,
          location: locationState.location,
          polygon: locationState.polygon ? 'defined' : 'undefined'
        });
        return locationState;
      }
      
      // Fallback to URL params
      const urlParams = new URLSearchParams(window.location.search);
      const data = {};
      if (urlParams.get('ndvi')) {
        data.ndvi = parseFloat(urlParams.get('ndvi'));
        console.log(`Found NDVI in URL: ${data.ndvi}`);
      }
      if (urlParams.get('lat') && urlParams.get('lng')) {
        data.location = {
          lat: parseFloat(urlParams.get('lat')),
          lng: parseFloat(urlParams.get('lng'))
        };
        console.log(`Found location in URL: ${JSON.stringify(data.location)}`);
      }
      return data;
    } catch (error) {
      console.error("[Frontend] Error parsing data:", error);
      return {};
    }
  };

  const initialData = getInitialData();
  console.log('Initial data:', initialData);

  const [polygon, setPolygon] = useState(initialData.polygon || null);
  const [cropType, setCropType] = useState('wheat');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [ndvi, setNdvi] = useState(initialData.ndvi || null);
  const [location, setLocation] = useState(initialData.location || { lat: 27.175, lng: 78.016 });
  const [showDetailedWeather, setShowDetailedWeather] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    console.log('[Frontend] Component mounted');
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    
    const formatDateForInput = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    const formattedEnd = formatDateForInput(end);
    const formattedStart = formatDateForInput(start);
    
    console.log(`Setting default date range: ${formattedStart} to ${formattedEnd}`);
    setEndDate(formattedEnd);
    setStartDate(formattedStart);
    setIsInitialized(true);

    if (initialData.ndvi !== null && initialData.ndvi !== undefined) {
      console.log('Initial NDVI detected, will analyze after initialization');
      const timer = setTimeout(() => {
        console.log('Auto-triggering analysis after initialization');
        handleGenerate();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, []);

  const handleGenerate = async () => {
    if (!isInitialized) {
      console.warn('Attempted generate before initialization complete');
      return;
    }

    console.log('[Frontend] Generate button clicked');
    console.log('Current state:', {
      polygon: polygon ? 'defined' : 'null',
      cropType,
      startDate,
      endDate,
      ndvi,
      location
    });

    // Validate all required fields
    const errors = [];
    if (!polygon && !location) errors.push('Location data is required');
    if (!startDate) errors.push('Start date is required');
    if (!endDate) errors.push('End date is required');
    if (!cropType) errors.push('Crop type is required');

    if (errors.length > 0) {
      console.error('Validation failed:', errors);
      alert(`Please fix the following:\n${errors.join('\n')}`);
      return;
    }

    // Validate date range
    if (new Date(startDate) > new Date(endDate)) {
      console.error('Invalid date range', { startDate, endDate });
      alert('End date must be after start date');
      return;
    }

    setLoading(true);
    console.log('Loading started - making API request');
    
    try {
      const requestData = {
        cropType,
        startDate,
        endDate,
        ndvi: ndvi !== null ? ndvi : 0.65,
        location,
        ...(polygon && { polygon })
      };

      console.log('Request payload:', JSON.stringify(requestData, null, 2));
      
      const apiUrl = 'http://localhost:4000/api/environment-yield/analyze';
      console.log(`Making POST request to: ${apiUrl}`);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });
      
      console.log(`Received response, status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', {
          status: response.status,
          statusText: response.statusText,
          errorText
        });
        throw new Error(errorText || 'Error analyzing environment data');
      }
      
      const responseData = await response.json();
      console.log('API Response:', responseData);
      
      // Format results for UI
      const apiResults = {
        vegetationIndices: responseData.data.vegetationIndices,
        weatherData: responseData.data.weatherData,
        environmentYield: responseData.data.environmentYield,
        totalProduction: responseData.data.totalProduction,
        location: responseData.data.location,
        areaHectares: responseData.data.area,
        environment: {
          max_temperature: responseData.data.weatherData.avgTemp + 3,
          min_temperature: responseData.data.weatherData.avgTemp - 3,
          wind_speed: responseData.data.weatherData.windSpeed,
          cloud_cover: responseData.data.weatherData.cloudCover,
          precipitation: responseData.data.weatherData.precipitation,
          surface_pressure: responseData.data.weatherData.surfacePressure,
          relative_humidity: responseData.data.weatherData.relHumidity
        },
        predicted_yield: responseData.data.environmentYield
      };
      
      console.log('Formatted results:', apiResults);
      setResults(apiResults);
      
    } catch (error) {
      console.error('Analysis failed:', {
        error: error.message,
        stack: error.stack
      });
      alert('Analysis failed: ' + error.message);
    } finally {
      console.log('Loading complete');
      setLoading(false);
    }
  };

  const handleCreatePolygon = () => {
    console.log('[Frontend] Creating polygon from location');
    if (!location) {
      console.error('No location data available');
      alert('No location data available');
      return;
    }
    
    const offset = 0.005;
    const newPolygon = {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [[
          [location.lng - offset, location.lat - offset],
          [location.lng + offset, location.lat - offset],
          [location.lng + offset, location.lat + offset],
          [location.lng - offset, location.lat + offset],
          [location.lng - offset, location.lat - offset]
        ]]
      }
    };
    
    console.log('Created new polygon:', newPolygon);
    setPolygon(newPolygon);
  };

  return (
    <div className="yield-container">
      <div className="yield-card">
        <div className="yield-header">
          <h1>Environment Yield Analysis</h1>
          <p>Get crop yield predictions based on environmental factors</p>
        </div>

        <div className="yield-content">
          <div className="location-info info-box">
            <div className="info-detail">
              <MapPin className="info-icon" />
              <span className="info-label">Location:</span>
              <span className="info-value">
                {location ? `Lat: ${location.lat.toFixed(4)}, Lng: ${location.lng.toFixed(4)}` : 'Not specified'}
              </span>
            </div>
            {ndvi !== null && (
              <div className="info-detail ndvi-info">
                <BarChart2 className="info-icon" />
                <span className="info-label">NDVI:</span>
                <span className="info-value">{ndvi.toFixed(4)}</span>
              </div>
            )}
          </div>

          {polygon ? (
            <div className="polygon-info info-box">
              <div className="info-detail">
                <svg className="info-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                <span>Polygon with {polygon.geometry?.coordinates?.[0]?.length || 0} points</span>
              </div>
            </div>
          ) : (
            <div className="no-polygon-info info-box">
              <div className="info-detail">
                <svg className="info-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>No polygon defined</span>
              </div>
              <button 
                onClick={handleCreatePolygon}
                className="create-polygon-btn"
              >
                Create Polygon
              </button>
            </div>
          )}

          <div className="form-grid">
            <div className="form-group">
              <label>Crop Type</label>
              <select 
                value={cropType}
                onChange={(e) => {
                  console.log(`Crop type changed to: ${e.target.value}`);
                  setCropType(e.target.value);
                }}
              >
                {['wheat', 'rice', 'maize', 'cotton', 'soybean'].map(crop => (
                  <option key={crop} value={crop}>
                    {crop.charAt(0).toUpperCase() + crop.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Start Date</label>
              <input 
                type="date"
                value={startDate}
                onChange={(e) => {
                  console.log(`Start date changed to: ${e.target.value}`);
                  setStartDate(e.target.value);
                }}
                required
              />
            </div>

            <div className="form-group">
              <label>End Date</label>
              <input 
                type="date"
                value={endDate}
                onChange={(e) => {
                  console.log(`End date changed to: ${e.target.value}`);
                  setEndDate(e.target.value);
                }}
                required
                min={startDate}
              />
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading || !isInitialized}
            className={`generate-btn ${loading || !isInitialized ? 'btn-disabled' : ''}`}
          >
            {loading ? (
              <>
                <svg className="spinner" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="spinner-circle" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="spinner-path" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Analyzing...
              </>
            ) : !isInitialized ? (
              'Initializing...'
            ) : (
              <>
                <BarChart2 className="btn-icon" />
                Generate Report
              </>
            )}
          </button>

          {results && (
            <div className="results-container">
              <h3 className="results-heading">
                Predicted Yield: <span>{results.predicted_yield?.toFixed(2)} tons/hectare</span>
              </h3>
              {results.areaHectares > 1 && (
                <p className="total-production">
                  Total Production: {results.totalProduction?.toFixed(2)} tons (Area: {results.areaHectares} hectares)
                </p>
              )}

              <button
                onClick={() => {
                  console.log(`Toggling weather details. Current state: ${showDetailedWeather}`);
                  setShowDetailedWeather(!showDetailedWeather);
                }}
                className="toggle-details-btn"
              >
                {showDetailedWeather ? <ChevronUp className="toggle-icon" /> : <ChevronDown className="toggle-icon" />}
                {showDetailedWeather ? 'Hide Environmental Details' : 'Show Environmental Details'}
              </button>

              {showDetailedWeather && results.environment && (
                <div className="environmental-details">
                  <div className="env-grid">
                    <div className="env-item">
                      <ThermometerSun className="env-icon temp-high" />
                      <span>Max Temp: {results.environment.max_temperature.toFixed(2)}°C</span>
                    </div>
                    <div className="env-item">
                      <ThermometerSnowflake className="env-icon temp-low" />
                      <span>Min Temp: {results.environment.min_temperature.toFixed(2)}°C</span>
                    </div>
                    <div className="env-item">
                      <Wind className="env-icon" />
                      <span>Wind Speed: {results.environment.wind_speed.toFixed(2)} m/s</span>
                    </div>
                    <div className="env-item">
                      <Cloud className="env-icon" />
                      <span>Cloud Cover: {results.environment.cloud_cover.toFixed(2)}%</span>
                    </div>
                    <div className="env-item">
                      <Droplet className="env-icon precip" />
                      <span>Precipitation: {results.environment.precipitation.toFixed(2)} mm</span>
                    </div>
                    <div className="env-item">
                      <Sun className="env-icon pressure" />
                      <span>Surface Pressure: {results.environment.surface_pressure.toFixed(2)} hPa</span>
                    </div>
                    <div className="env-item">
                      <Droplet className="env-icon humidity" />
                      <span>Humidity: {results.environment.relative_humidity.toFixed(2)}%</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EnvironmentYield;