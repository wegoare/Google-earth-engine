



import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function YieldPredictor() {
  const location = useLocation();
  const navigate = useNavigate();
  const [cropType, setCropType] = useState('');
  const [ndvi, setNdvi] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [recommendedCrop, setRecommendedCrop] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [recommendLoading, setRecommendLoading] = useState(false);
  const [error, setError] = useState('');
  
  // New state for NDVI time series
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [ndviHistory, setNdviHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const CROP_TYPES = [
    { value: "Wheat", label: "Wheat" },
    { value: "Rice", label: "Rice" },
    { value: "Maize", label: "Maize" },
    { value: "Millet", label: "Millet" },
    { value: "Barley", label: "Barley" }
  ];

  useEffect(() => {
    if (location.state?.ndvi !== undefined) {
      setNdvi(location.state.ndvi);
    } else {
      alert("NDVI value is missing. Go back and calculate NDVI first.");
      navigate(-1);
    }
    
    // Set default date range (last 30 days)
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    setEndDate(today.toISOString().split('T')[0]);
    setStartDate(thirtyDaysAgo.toISOString().split('T')[0]);
  }, [location.state, navigate]);

  const getNdviValue = () => {
    const val = typeof ndvi === 'object' ? ndvi.value : ndvi;
    const parsed = parseFloat(val);
    return isNaN(parsed) ? null : parsed;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setPrediction(null);

    const ndviValue = getNdviValue();

    if (ndviValue === null || cropType === '') {
      setError("Please select a crop and ensure NDVI is valid.");
      return;
    }

    const payload = {
      crop_type: cropType,
      ndvi: ndviValue
    };

    setIsLoading(true);

    try {
      const res = await axios.post('http://localhost:8000/api/predict-yield', payload);
      const yieldValue = res.data.predicted_yield || res.data.prediction;
      setPrediction(parseFloat(yieldValue).toFixed(2));
    } catch (err) {
      const msg = err?.response?.data?.detail ||
                  JSON.stringify(err?.response?.data) ||
                  err.message || 'Prediction failed.';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
      console.error("Prediction Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const getRecommendedCrop = async () => {
    setRecommendedCrop(null);
    setError('');

    const ndviValue = getNdviValue();
    if (ndviValue === null) {
      setError("Valid NDVI value is required for crop recommendation.");
      return;
    }

    setRecommendLoading(true);

    try {
      const res = await axios.post('http://localhost:8000/api/recommended-crop', {
        ndvi: ndviValue
      });

      setRecommendedCrop({
        crop: res.data.recommended_crop,
        yield: res.data.predicted_yield
      });
    } catch (err) {
      const msg = err?.response?.data?.detail ||
                  JSON.stringify(err?.response?.data) ||
                  err.message || 'Recommendation failed.';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
      console.error("Recommendation Error:", err);
    } finally {
      setRecommendLoading(false);
    }
  };

  // New function to fetch NDVI history
  const fetchNdviHistory = async () => {
    if (!startDate || !endDate) {
      setError("Please select both start and end dates.");
      return;
    }

    setHistoryLoading(true);
    setError('');

    try {
      const res = await axios.get('http://localhost:8000/api/ndvi-history', {
        params: {
          start_date: startDate,
          end_date: endDate
        }
      });

      setNdviHistory(res.data.history || []);
    } catch (err) {
      const msg = err?.response?.data?.detail ||
                  JSON.stringify(err?.response?.data) ||
                  err.message || 'Failed to fetch NDVI history.';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
      console.error("NDVI History Error:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Function to get color based on NDVI value
  const getNdviColor = (value) => {
    if (value < 0.2) return "#FF0000"; // Poor vegetation - Red
    if (value < 0.4) return "#FFA500"; // Moderate vegetation - Orange
    if (value < 0.6) return "#FFFF00"; // Good vegetation - Yellow
    if (value < 0.8) return "#90EE90"; // Very good vegetation - Light green
    return "#008000"; // Excellent vegetation - Dark green
  };

  return (
    <div className="container mt-5">
      <div className="card shadow p-4">
        <h2 className="text-center mb-4">🌾 Crop Yield Predictor</h2>

        <div className="mb-3">
          <label className="form-label">Current NDVI Value:</label>
          <input
            type="text"
            className="form-control"
            value={ndvi?.value ?? ndvi ?? ''}
            disabled
          />
        </div>

        {error && (
          <div className="alert alert-danger mb-3">
            <strong>Error:</strong> {String(error)}
          </div>
        )}

        <div className="row mb-4">
          <div className="col-md-6">
            <div className="card h-100">
              <div className="card-header bg-success text-white">
                <h5 className="mb-0">Predict Specific Crop Yield</h5>
              </div>
              <div className="card-body">
                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label className="form-label">Select Crop Type:</label>
                    <select
                      className="form-select"
                      value={cropType}
                      onChange={(e) => setCropType(e.target.value)}
                      required
                    >
                      <option value="">-- Choose a crop --</option>
                      {CROP_TYPES.map(crop => (
                        <option key={crop.value} value={crop.value}>
                          {crop.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="btn btn-success w-100"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Calculating...' : 'Predict Yield'}
                  </button>
                </form>

                {prediction && (
                  <div className="alert alert-info mt-3 text-center">
                    🌱 <strong>Predicted Yield:</strong> {prediction} tons/hectare
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="col-md-6">
            <div className="card h-100">
              <div className="card-header bg-primary text-white">
                <h5 className="mb-0">Get Crop Recommendation</h5>
              </div>
              <div className="card-body">
                <p className="card-text">
                  Based on your field's NDVI value, we can recommend the best crop to maximize your yield.
                </p>

                <button
                  onClick={getRecommendedCrop}
                  className="btn btn-primary w-100"
                  disabled={recommendLoading}
                >
                  {recommendLoading ? 'Finding Best Crop...' : 'Recommend Best Crop'}
                </button>

                {recommendedCrop && (
                  <div className="alert alert-info mt-3 text-center">
                    🌿 <strong>Recommended Crop:</strong> {recommendedCrop.crop}<br />
                    🌱 <strong>Expected Yield:</strong> {recommendedCrop.yield} tons/hectare
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* New section for NDVI History */}
        <div className="card mb-4">
          <div className="card-header bg-info text-white">
            <h5 className="mb-0">NDVI History</h5>
          </div>
          <div className="card-body">
            <div className="row mb-3">
              <div className="col-md-5">
                <label className="form-label">Start Date:</label>
                <input
                  type="date"
                  className="form-control"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="col-md-5">
                <label className="form-label">End Date:</label>
                <input
                  type="date"
                  className="form-control"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div className="col-md-2 d-flex align-items-end">
                <button
                  className="btn btn-info w-100"
                  onClick={fetchNdviHistory}
                  disabled={historyLoading}
                >
                  {historyLoading ? 'Loading...' : 'Get History'}
                </button>
              </div>
            </div>
            
            {ndviHistory.length > 0 ? (
              <>
                <div className="mb-3">
                  <h6 className="mb-2">NDVI Trend Over Time</h6>
                  <div style={{ height: '300px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={ndviHistory}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis domain={[0, 1]} />
                        <Tooltip 
                          formatter={(value) => [value.toFixed(2), "NDVI"]}
                          labelFormatter={(label) => `Date: ${label}`}
                        />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="ndvi" 
                          stroke="#8884d8" 
                          strokeWidth={2}
                          dot={{ 
                            stroke: '#8884d8', 
                            strokeWidth: 2, 
                            r: 4,
                            fill: ({ payload }) => getNdviColor(payload.ndvi) 
                          }}
                          activeDot={{ r: 8 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="mb-3">
                  <h6>NDVI Color Legend</h6>
                  <div className="d-flex justify-content-between">
                    <div>
                      <span className="badge rounded-pill me-1" style={{ backgroundColor: "#FF0000" }}>&nbsp;</span>
                      Poor (&lt;0.2)
                    </div>
                    <div>
                      <span className="badge rounded-pill me-1" style={{ backgroundColor: "#FFA500" }}>&nbsp;</span>
                      Moderate (0.2-0.4)
                    </div>
                    <div>
                      <span className="badge rounded-pill me-1" style={{ backgroundColor: "#FFFF00" }}>&nbsp;</span>
                      Good (0.4-0.6)
                    </div>
                    <div>
                      <span className="badge rounded-pill me-1" style={{ backgroundColor: "#90EE90" }}>&nbsp;</span>
                      Very Good (0.6-0.8)
                    </div>
                    <div>
                      <span className="badge rounded-pill me-1" style={{ backgroundColor: "#008000" }}>&nbsp;</span>
                      Excellent (&gt;0.8)
                    </div>
                  </div>
                </div>
              </>
            ) : (
              !historyLoading && <p className="text-center">No history data available. Select a date range and click "Get History".</p>
            )}
          </div>
        </div>

        <div className="d-flex justify-content-center">
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => navigate('/')}
          >
            🏠 Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}