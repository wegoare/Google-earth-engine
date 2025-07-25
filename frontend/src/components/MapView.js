





import React, { useState, useEffect, useRef } from "react";
import { 
  MapContainer, 
  TileLayer, 
  LayersControl, 
  Polygon, 
  useMap,
  FeatureGroup
} from "react-leaflet";
import { EditControl } from "react-leaflet-draw";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import { Spinner, Card, Row, Col, Badge, ProgressBar } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { PDFDownloadLink } from "@react-pdf/renderer";
import html2canvas from "html2canvas";
import LandAnalysisReport from "./LandAnalysisReport";

const { BaseLayer, Overlay } = LayersControl;

// Palette colors for different indices (for the legend)
const indexPalettes = {
    "NDVI": ["blue", "white", "green"],
    "SAVI": ["yellow", "green", "darkgreen"],
    "EVI": ["purple", "blue", "lightgreen", "darkgreen"],
    "GNDVI": ["blue", "white", "green"],
    "NDWI": ["blue", "white", "green"],
    "GCI": ["yellow", "green", "darkgreen"],
    "NBR": ["black", "red", "yellow"],
    "NDMI": ["blue", "white", "green"],
    "NDSI": ["blue", "white", "green"],
    "RVI": ["blue", "green", "yellow", "red"]
};

// Reference ranges for each index to determine if value is low, good, or high
const indexRanges = {
    "NDVI": { low: [0, 0.2], good: [0.2, 0.6], high: [0.6, 1] },
    "SAVI": { low: [0, 0.2], good: [0.2, 0.6], high: [0.6, 1] },
    "EVI": { low: [0, 0.2], good: [0.2, 0.6], high: [0.6, 1] },
    "GNDVI": { low: [0, 0.2], good: [0.2, 0.6], high: [0.6, 1] },
    "NDWI": { low: [-1, -0.3], good: [-0.3, 0.3], high: [0.3, 1] },
    "GCI": { low: [0, 1], good: [1, 3], high: [3, 10] },
    "NBR": { low: [-1, -0.2], good: [-0.2, 0.1], high: [0.1, 1] },
    "NDMI": { low: [-1, 0], good: [0, 0.4], high: [0.4, 1] },
    "NDSI": { low: [-1, 0], good: [0, 0.4], high: [0.4, 1] },
    "RVI": { low: [0, 2], good: [2, 6], high: [6, 15] }
};

// Get descriptions for indices
const getIndexDescription = (index) => {
    switch(index) {
        case "NDVI": return "Measures vegetation health and density";
        case "SAVI": return "Minimizes soil brightness influence on vegetation";
        case "EVI": return "Enhanced vegetation detection with reduced atmospheric influence";
        case "GNDVI": return "Uses green band, sensitive to chlorophyll variation";
        case "NDWI": return "Detects water bodies and moisture content";
        case "GCI": return "Measures chlorophyll content in leaves";
        case "NBR": return "Identifies burned areas and fire severity";
        case "NDMI": return "Assesses vegetation water content";
        case "NDSI": return "Detects snow cover";
        case "RVI": return "Simple ratio-based vegetation index";
        default: return "";
    }
};

// Get optimal range description for each index
const getOptimalRangeDescription = (index) => {
    switch(index) {
        case "NDVI": return "Healthy vegetation: 0.2-0.6, Dense vegetation: >0.6";
        case "SAVI": return "Moderate vegetation: 0.2-0.6, Dense vegetation: >0.6";
        case "EVI": return "Good vegetation: 0.2-0.6, High productivity: >0.6";
        case "GNDVI": return "Moderate greenness: 0.2-0.6, High chlorophyll: >0.6";
        case "NDWI": return "Dry soil: <-0.3, Mixed areas: -0.3-0.3, Water bodies: >0.3";
        case "GCI": return "Low chlorophyll: <1, Moderate: 1-3, High: >3";
        case "NBR": return "Burned areas: <-0.2, Unburned: -0.2-0.1, Regrowth: >0.1";
        case "NDMI": return "Low moisture: <0, Moderate: 0-0.4, High moisture: >0.4";
        case "NDSI": return "No snow: <0, Partial snow: 0-0.4, Snow-covered: >0.4";
        case "RVI": return "Sparse vegetation: <2, Moderate: 2-6, Dense vegetation: >6";
        default: return "";
    }
};

// Function to determine index status
const getIndexStatus = (index, value) => {
    if (value === undefined || value === null || isNaN(value)) return "unknown";
    
    const ranges = indexRanges[index];
    if (!ranges) return "unknown";
    
    const numValue = parseFloat(value);
    
    if (numValue >= ranges.low[0] && numValue <= ranges.low[1]) return "low";
    if (numValue > ranges.good[0] && numValue <= ranges.good[1]) return "good";
    if (numValue > ranges.high[0] && numValue <= ranges.high[1]) return "high";
    
    return "unknown";
};

// Generate land analysis report based on all indices
const generateLandAnalysisReport = (indexData, lat, lng, polygon = null) => {
    if (!indexData || Object.keys(indexData).length === 0) return {};
    
    // Overall vegetation health assessment
    let vegetationStatus = "unknown";
    if (indexData["NDVI"]?.value !== undefined) {
        const ndviValue = parseFloat(indexData["NDVI"].value);
        if (ndviValue < 0.2) vegetationStatus = "poor";
        else if (ndviValue >= 0.2 && ndviValue < 0.4) vegetationStatus = "fair";
        else if (ndviValue >= 0.4 && ndviValue < 0.6) vegetationStatus = "good";
        else if (ndviValue >= 0.6) vegetationStatus = "excellent";
    }
    
    // Moisture assessment
    let moistureStatus = "unknown";
    if (indexData["NDMI"]?.value !== undefined) {
        const ndmiValue = parseFloat(indexData["NDMI"].value);
        if (ndmiValue < 0) moistureStatus = "dry";
        else if (ndmiValue >= 0 && ndmiValue < 0.2) moistureStatus = "moderate";
        else if (ndmiValue >= 0.2 && ndmiValue < 0.4) moistureStatus = "good";
        else if (ndmiValue >= 0.4) moistureStatus = "high";
    }
    
    // Water presence assessment
    let waterPresence = "unknown";
    if (indexData["NDWI"]?.value !== undefined) {
        const ndwiValue = parseFloat(indexData["NDWI"].value);
        if (ndwiValue < -0.3) waterPresence = "none";
        else if (ndwiValue >= -0.3 && ndwiValue < 0) waterPresence = "low";
        else if (ndwiValue >= 0 && ndwiValue < 0.3) waterPresence = "moderate";
        else if (ndwiValue >= 0.3) waterPresence = "high";
    }
    
    // Chlorophyll assessment
    let chlorophyllLevel = "unknown";
    if (indexData["GCI"]?.value !== undefined) {
        const gciValue = parseFloat(indexData["GCI"].value);
        if (gciValue < 1) chlorophyllLevel = "low";
        else if (gciValue >= 1 && gciValue < 3) chlorophyllLevel = "moderate";
        else if (gciValue >= 3) chlorophyllLevel = "high";
    }
    
    // Fire damage assessment
    let fireDamage = "unknown";
    if (indexData["NBR"]?.value !== undefined) {
        const nbrValue = parseFloat(indexData["NBR"].value);
        if (nbrValue < -0.25) fireDamage = "high";
        else if (nbrValue >= -0.25 && nbrValue < -0.1) fireDamage = "moderate";
        else if (nbrValue >= -0.1 && nbrValue < 0.1) fireDamage = "low/none";
        else if (nbrValue >= 0.1) fireDamage = "regrowth";
    }
    
    // Snow cover assessment
    let snowCover = "unknown";
    if (indexData["NDSI"]?.value !== undefined) {
        const ndsiValue = parseFloat(indexData["NDSI"].value);
        if (ndsiValue < 0) snowCover = "none";
        else if (ndsiValue >= 0 && ndsiValue < 0.4) snowCover = "partial";
        else if (ndsiValue >= 0.4) snowCover = "significant";
    }
    
    // Land use recommendation based on indices
    let landUseRecommendation = [];
    
    // Vegetation-based recommendations
    if (vegetationStatus === "excellent" || vegetationStatus === "good") {
        landUseRecommendation.push("The area shows healthy vegetation and could be suitable for agriculture or forestry.");
    } else if (vegetationStatus === "fair") {
        landUseRecommendation.push("Moderate vegetation health; may require soil amendments for optimal agricultural use.");
    } else if (vegetationStatus === "poor") {
        landUseRecommendation.push("Low vegetation health; consider soil testing and remediation before agricultural use.");
    }
    
    // Water-based recommendations
    if (waterPresence === "high") {
        landUseRecommendation.push("High water presence detected; could be suitable for water-intensive crops or may indicate flooding risks.");
    } else if (waterPresence === "moderate" || waterPresence === "low") {
        landUseRecommendation.push("Limited water presence; consider irrigation systems for agricultural use.");
    } else if (waterPresence === "none") {
        landUseRecommendation.push("Very dry conditions detected; drought-resistant crops or non-agricultural use recommended.");
    }
    
    // Fire damage recommendations
    if (fireDamage === "high" || fireDamage === "moderate") {
        landUseRecommendation.push("Evidence of fire damage; soil rehabilitation may be necessary before agricultural use.");
    } else if (fireDamage === "regrowth") {
        landUseRecommendation.push("Post-fire regrowth detected; the area is in recovery phase.");
    }
    
    // Default recommendation if we don't have enough data
    if (landUseRecommendation.length === 0) {
        landUseRecommendation.push("Insufficient data to make specific land use recommendations. Consider site visit and soil testing.");
    }
    
    // Get area if polygon is provided
    let areaInfo = null;
    if (polygon && polygon.length > 0) {
        // Calculate area in square meters using the Shoelace formula
        const calculatePolygonArea = (coords) => {
            let area = 0;
            const R = 6371000; // Earth radius in meters
            
            if (coords.length < 3) return 0;
            
            for (let i = 0; i < coords.length; i++) {
                const j = (i + 1) % coords.length;
                const xi = coords[i][1] * Math.PI / 180; // lon in radians
                const yi = coords[i][0] * Math.PI / 180; // lat in radians
                const xj = coords[j][1] * Math.PI / 180;
                const yj = coords[j][0] * Math.PI / 180;
                
                area += (xj - xi) * (2 + Math.sin(yi) + Math.sin(yj));
            }
            area = Math.abs(area * R * R / 2);
            return area;
        };
        
        const areaInSqMeters = calculatePolygonArea(polygon);
        const areaInHectares = areaInSqMeters / 10000;
        const areaInAcres = areaInSqMeters / 4046.86;
        
        areaInfo = {
            squareMeters: Math.round(areaInSqMeters),
            hectares: areaInHectares.toFixed(2),
            acres: areaInAcres.toFixed(2)
        };
    }
    
    return {
        location: {
            latitude: lat,
            longitude: lng,
            polygon: polygon,
            area: areaInfo
        },
        date: new Date().toLocaleDateString(),
        summary: {
            vegetationStatus,
            moistureStatus,
            waterPresence,
            chlorophyllLevel,
            fireDamage,
            snowCover
        },
        indexValues: Object.entries(indexData).map(([index, data]) => ({
            name: index,
            value: data.value,
            status: getIndexStatus(index, data.value),
            description: getIndexDescription(index)
        })),
        recommendations: landUseRecommendation
    };
};

// Component to handle map updating
const MapUpdater = ({ center }) => {
    const map = useMap();
    
    useEffect(() => {
        if (center && center.length === 2) {
            map.setView(center);
        }
    }, [center, map]);
    
    return null;
};

// Visual indicator component for index status
const IndexStatusIndicator = ({ index, value }) => {
    const status = getIndexStatus(index, value);
    
    // Define colors for different statuses
    const statusColors = {
        low: "danger",
        good: "success",
        high: "primary",
        unknown: "secondary"
    };
    
    // Define labels for different statuses
    const statusLabels = {
        low: "Low",
        good: "Good",
        high: "High",
        unknown: "Unknown"
    };
    
    // Calculate progress percentage based on index type and value
    const calculateProgress = () => {
        if (status === "unknown" || value === undefined || value === null || isNaN(value)) return 0;
        
        const ranges = indexRanges[index];
        if (!ranges) return 0;
        
        const numValue = parseFloat(value);
        const min = ranges.low[0];
        const max = ranges.high[1];
        const range = max - min;
        
        return Math.min(100, Math.max(0, ((numValue - min) / range) * 100));
    };
    
    return (
        <div className="index-status-indicator">
            <div className="d-flex justify-content-between align-items-center mb-1">
                <span>{value}</span>
                <Badge bg={statusColors[status]}>{statusLabels[status]}</Badge>
            </div>
            <ProgressBar>
                <ProgressBar variant="danger" now={33} key={1} />
                <ProgressBar variant="success" now={34} key={2} />
                <ProgressBar variant="primary" now={33} key={3} />
            </ProgressBar>
            <div className="position-relative">
                <div 
                    className="position-absolute" 
                    style={{ 
                        left: `${calculateProgress()}%`, 
                        top: "-15px", 
                        transform: "translateX(-50%)" 
                    }}
                >
                    <span className="text-dark">▼</span>
                </div>
            </div>
        </div>
    );
};

const MapView = () => {
    const navigate = useNavigate();
    const [lat, setLat] = useState(27.1751);
    const [lng, setLng] = useState(78.0421);
    const [selectedIndex, setSelectedIndex] = useState("NDVI");
    const [indexData, setIndexData] = useState({});
    const [showAllIndices, setShowAllIndices] = useState(false);
    const [loading, setLoading] = useState(false);
    const [reportData, setReportData] = useState(null);
    const [mapImage, setMapImage] = useState(null);
    const [generatingReport, setGeneratingReport] = useState(false);
    const mapRef = useRef(null);
    const drawRef = useRef(null);
    const [drawnPolygon, setDrawnPolygon] = useState(null);
    const [calculationMode, setCalculationMode] = useState("point"); // "point" or "area"
    const [areaCalculation, setAreaCalculation] = useState(null);

    // Define all supported indices
    const indicesList = [
        { value: "NDVI", label: "NDVI (Normalized Difference Vegetation Index)" },
        { value: "SAVI", label: "SAVI (Soil Adjusted Vegetation Index)" },
        { value: "EVI", label: "EVI (Enhanced Vegetation Index)" },
        { value: "GNDVI", label: "GNDVI (Green Normalized Difference Vegetation Index)" },
        { value: "NDWI", label: "NDWI (Normalized Difference Water Index)" },
        { value: "GCI", label: "GCI (Green Chlorophyll Index)" },
        { value: "NBR", label: "NBR (Normalized Burn Ratio)" },
        { value: "NDMI", label: "NDMI (Normalized Difference Moisture Index)" },
        { value: "NDSI", label: "NDSI (Normalized Difference Snow Index)" },
        { value: "RVI", label: "RVI (Ratio Vegetation Index)" }
    ];

    // Handle polygon creation and update
    // Handle polygon creation with automatic closure
const onCreated = (e) => {
    const { layerType, layer } = e;
    
    if (layerType === 'polygon') {
      // Get coordinates and ensure they're in [lat, lng] format
      let coords = layer.getLatLngs()[0].map(point => [point.lat, point.lng]);
      
      // Auto-close the polygon if not already closed
      const firstPoint = coords[0];
      const lastPoint = coords[coords.length - 1];
      const distanceThreshold = 0.00001; // ~1 meter threshold
      
      // Calculate distance between first and last points
      const distance = Math.sqrt(
        Math.pow(firstPoint[0] - lastPoint[0], 2) + 
        Math.pow(firstPoint[1] - lastPoint[1], 2)
      );
      
      // If points are close but not identical, snap them together
      if (distance < distanceThreshold && distance > 0) {
        coords[coords.length - 1] = firstPoint; // Snap last to first
      } 
      // If points are not close at all, add closing point
      else if (distance >= distanceThreshold) {
        coords = [...coords, firstPoint]; // Add closing point
      }
      
      setDrawnPolygon(coords);
      setCalculationMode("area");
      
      // Calculate area
      const calculateArea = (coords) => {
        let area = 0;
        const R = 6371000; // Earth radius in meters
        
        if (coords.length < 3) return 0;
        
        for (let i = 0; i < coords.length; i++) {
          const j = (i + 1) % coords.length;
          const xi = coords[i][1] * Math.PI / 180; // lon in radians
          const yi = coords[i][0] * Math.PI / 180; // lat in radians
          const xj = coords[j][1] * Math.PI / 180;
          const yj = coords[j][0] * Math.PI / 180;
          
          area += (xj - xi) * (2 + Math.sin(yi) + Math.sin(yj));
        }
        area = Math.abs(area * R * R / 2);
        return area;
      };
      
      const areaInSqMeters = calculateArea(coords);
      const areaInHectares = areaInSqMeters / 10000;
      const areaInAcres = areaInSqMeters / 4046.86;
      
      setAreaCalculation({
        squareMeters: Math.round(areaInSqMeters),
        hectares: areaInHectares.toFixed(2),
        acres: areaInAcres.toFixed(2)
      });
      
      // Update center coordinates to be the centroid of the polygon
      if (coords.length > 0) {
        const sumLat = coords.reduce((sum, point) => sum + point[0], 0);
        const sumLng = coords.reduce((sum, point) => sum + point[1], 0);
        const centerLat = sumLat / coords.length;
        const centerLng = sumLng / coords.length;
        
        setLat(centerLat);
        setLng(centerLng);
      }
    }
  };
  
  // Handle polygon editing with automatic closure
  const onEdited = (e) => {
    const layers = e.layers;
    layers.eachLayer(layer => {
      let coords = layer.getLatLngs()[0].map(point => [point.lat, point.lng]);
      
      // Auto-close the polygon if not already closed
      const firstPoint = coords[0];
      const lastPoint = coords[coords.length - 1];
      const distanceThreshold = 0.00001; // ~1 meter threshold
      
      // Calculate distance between first and last points
      const distance = Math.sqrt(
        Math.pow(firstPoint[0] - lastPoint[0], 2) + 
        Math.pow(firstPoint[1] - lastPoint[1], 2)
      );
      
      // If points are close but not identical, snap them together
      if (distance < distanceThreshold && distance > 0) {
        coords[coords.length - 1] = firstPoint; // Snap last to first
      } 
      // If points are not close at all, add closing point
      else if (distance >= distanceThreshold) {
        coords = [...coords, firstPoint]; // Add closing point
      }
      
      setDrawnPolygon(coords);
      
      // Recalculate area
      const calculateArea = (coords) => {
        let area = 0;
        const R = 6371000; // Earth radius in meters
        
        if (coords.length < 3) return 0;
        
        for (let i = 0; i < coords.length; i++) {
          const j = (i + 1) % coords.length;
          const xi = coords[i][1] * Math.PI / 180; // lon in radians
          const yi = coords[i][0] * Math.PI / 180; // lat in radians
          const xj = coords[j][1] * Math.PI / 180;
          const yj = coords[j][0] * Math.PI / 180;
          
          area += (xj - xi) * (2 + Math.sin(yi) + Math.sin(yj));
        }
        area = Math.abs(area * R * R / 2);
        return area;
      };
      
      const areaInSqMeters = calculateArea(coords);
      const areaInHectares = areaInSqMeters / 10000;
      const areaInAcres = areaInSqMeters / 4046.86;
      
      setAreaCalculation({
        squareMeters: Math.round(areaInSqMeters),
        hectares: areaInHectares.toFixed(2),
        acres: areaInAcres.toFixed(2)
      });
      
      // Update center coordinates
      if (coords.length > 0) {
        const sumLat = coords.reduce((sum, point) => sum + point[0], 0);
        const sumLng = coords.reduce((sum, point) => sum + point[1], 0);
        const centerLat = sumLat / coords.length;
        const centerLng = sumLng / coords.length;
        
        setLat(centerLat);
        setLng(centerLng);
      }
    });
  };
    
    const onDeleted = () => {
        setDrawnPolygon(null);
        setAreaCalculation(null);
        setCalculationMode("point");
    };
    
    // Clear drawn layers
    const clearDrawings = () => {
        if (drawRef.current) {
            const layers = drawRef.current._layers;
            if (layers) {
                Object.keys(layers).forEach(key => {
                    drawRef.current.removeLayer(layers[key]);
                });
            }
        }
        setDrawnPolygon(null);
        setAreaCalculation(null);
        setCalculationMode("point");
    };

    // Fetch single index data (modified to support both point and area modes)
    const fetchSingleIndex = () => {
        if (calculationMode === "point" && (!lat || !lng)) {
            alert("Please enter valid latitude and longitude.");
            return;
        }
        
        if (calculationMode === "area" && (!drawnPolygon || drawnPolygon.length < 3)) {
            alert("Please draw a valid polygon on the map.");
            return;
        }
    
        setLoading(true);
        setIndexData({});
        setReportData(null);
        
        let endpoint;
        let requestData;
        
        if (calculationMode === "point") {
            endpoint = `http://localhost:4000/gee/layer?lat=${lat}&lng=${lng}&index=${selectedIndex}`;
        } else {
            endpoint = "http://localhost:4000/gee/area-layer";
            requestData = {
                polygon: drawnPolygon,
                index: selectedIndex
            };
        }
    
        const fetchOptions = calculationMode === "area" ? {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(requestData)
        } : undefined;
        
        fetch(endpoint, fetchOptions)
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then((data) => {
                console.log(`🔹 API Response (Single Index - ${calculationMode}):`, data);
                
                // Update state with the single index data
                setIndexData({
                    [selectedIndex]: {
                        tileUrl: data.tileUrl,
                        value: data.indexValue[selectedIndex] || "N/A"
                    }
                });
                
                setShowAllIndices(false);
            })
            .catch((error) => {
                console.error("❌ Error:", error);
                alert(`Failed to load ${selectedIndex} data. Try again.`);
            })
            .finally(() => setLoading(false));
    };

    // Fetch all indices at once (modified to support both point and area modes)
    const fetchAllIndices = () => {
        if (calculationMode === "point" && (!lat || !lng)) {
            alert("Please enter valid latitude and longitude.");
            return;
        }
        
        if (calculationMode === "area" && (!drawnPolygon || drawnPolygon.length < 3)) {
            alert("Please draw a valid polygon on the map.");
            return;
        }
    
        setLoading(true);
        setIndexData({});
        setReportData(null);
        
        let endpoint;
        let requestData;
        
        if (calculationMode === "point") {
            endpoint = `http://localhost:4000/gee/all-layers?lat=${lat}&lng=${lng}`;
        } else {
            console.log("poly")
            console.log(drawnPolygon)
            const revered = drawnPolygon.map(coord => [coord[1], coord[0]]);
            endpoint = "http://localhost:4000/gee/all-area-layers";
            requestData = {
                polygon: revered
            };
        }
    
        const fetchOptions = calculationMode === "area" ? {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(requestData)
        } : undefined;
        
        fetch(endpoint, fetchOptions)
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then((data) => {
                console.log(`🔹 API Response (All Indices - ${calculationMode}):`, data);
                setIndexData(data.indices);
                setShowAllIndices(true);
            })
            .catch((error) => {
                console.error("❌ Error:", error);
                alert("Failed to load indices data. Try again.");
            })
            .finally(() => setLoading(false));
    };

    // Generate PDF report (updated to include polygon data if available)
    const generateReport = async () => {
        if (Object.keys(indexData).length === 0) {
            alert("Please fetch indices data before generating a report.");
            return;
        }
        
        setGeneratingReport(true);
        
        try {
            // Generate report data
            const report = generateLandAnalysisReport(
                indexData, 
                lat, 
                lng, 
                calculationMode === "area" ? drawnPolygon : null
            );
            
            // Capture map as image
            if (mapRef.current) {
                const mapContainer = mapRef.current.querySelector('.leaflet-container');
                if (mapContainer) {
                    const canvas = await html2canvas(mapContainer);
                    const mapImageData = canvas.toDataURL('image/png');
                    setMapImage(mapImageData);
                }
            }
            
            setReportData(report);
        } catch (error) {
            console.error("Error generating report:", error);
            alert("Failed to generate report. Please try again.");
        } finally {
            setGeneratingReport(false);
        }
    };

    // Navigate to shapefile analyzer
    const handleShapefileRedirect = () => {
        navigate("/shapefile-analyzer");
    };

    return (
        <div className="container mt-5">
            <h2 className="text-center mb-4 fw-bold text-success">🌿 Vegetation Index Map</h2>

            {/* Mode Toggle */}
            <div className="card shadow p-4 mb-4 border-0">
                <h5 className="card-title text-center mb-3">Calculation Mode</h5>
                <div className="btn-group w-100" role="group">
                    <input 
                        type="radio" 
                        className="btn-check" 
                        name="calculationMode" 
                        id="pointMode" 
                        autoComplete="off" 
                        checked={calculationMode === "point"} 
                        onChange={() => {
                            setCalculationMode("point");
                            clearDrawings();
                        }}
                    />
                    <label className="btn btn-outline-primary" htmlFor="pointMode">
                        <i className="bi bi-geo-alt me-2"></i>
                        Point Analysis
                    </label>
                    
                    <input 
                        type="radio" 
                        className="btn-check" 
                        name="calculationMode" 
                        id="areaMode" 
                        autoComplete="off" 
                        checked={calculationMode === "area"} 
                        onChange={() => setCalculationMode("area")}
                    />
                    <label className="btn btn-outline-success" htmlFor="areaMode">
                        <i className="bi bi-bounding-box me-2"></i>
                        Area Analysis
                    </label>
                </div>

                {calculationMode === "area" && areaCalculation && (
                    <div className="alert alert-info mt-3 mb-0">
                        <h6 className="alert-heading">Area Calculation</h6>
                        <div className="d-flex justify-content-between">
                            <span><strong>Square Meters:</strong> {areaCalculation.squareMeters}</span>
                            <span><strong>Hectares:</strong> {areaCalculation.hectares}</span>
                            <span><strong>Acres:</strong> {areaCalculation.acres}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Input Form */}
            <div className="card shadow p-4 mb-4 border-0">
                <div className="row g-3">
                {calculationMode === "point" && (
                        <>
                            <div className="col-md-4">
                                <label htmlFor="latitude" className="form-label">Latitude</label>
                                <input
                                    type="number"
                                    className="form-control"
                                    id="latitude"
                                    placeholder="Enter latitude"
                                    value={lat}
                                    onChange={(e) => setLat(parseFloat(e.target.value))}
                                    step="0.0001"
                                />
                            </div>
                            <div className="col-md-4">
                                <label htmlFor="longitude" className="form-label">Longitude</label>
                                <input
                                    type="number"
                                    className="form-control"
                                    id="longitude"
                                    placeholder="Enter longitude"
                                    value={lng}
                                    onChange={(e) => setLng(parseFloat(e.target.value))}
                                    step="0.0001"
                                />
                            </div>
                        </>
                    )}
                    
                    {calculationMode === "area" && (
                        <div className="col-12">
                            <div className="alert alert-primary">
                                <i className="bi bi-info-circle me-2"></i>
                                Use the polygon draw tool in the map to select an area for analysis
                            </div>
                        </div>
                    )}
                    
                    <div className="col-md-4">
                        <label htmlFor="indexSelect" className="form-label">Select Index</label>
                        <select
                            className="form-select"
                            id="indexSelect"
                            value={selectedIndex}
                            onChange={(e) => setSelectedIndex(e.target.value)}
                        >
                            {indicesList.map(index => (
                                <option key={index.value} value={index.value}>
                                    {index.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    
                    <div className="col-12">
                        <div className="d-flex gap-2">
                            <button
                                className="btn btn-success"
                                onClick={fetchSingleIndex}
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <Spinner animation="border" size="sm" className="me-2" />
                                        Loading...
                                    </>
                                ) : (
                                    <>
                                        <i className="bi bi-search me-2"></i>
                                        Analyze Selected Index
                                    </>
                                )}
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={fetchAllIndices}
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <Spinner animation="border" size="sm" className="me-2" />
                                        Loading All...
                                    </>
                                ) : (
                                    <>
                                        <i className="bi bi-collection me-2"></i>
                                        Analyze All Indices
                                    </>
                                )}
                            </button>
                            <button
                                className="btn btn-secondary ms-auto"
                                onClick={handleShapefileRedirect}
                            >
                                <i className="bi bi-file-earmark me-2"></i>
                                Shapefile Analyzer
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Map Container */}
            <div className="row g-4">
                <div className="col-lg-8">
                    <div className="card shadow h-100 border-0" ref={mapRef}>
                        <MapContainer
                            center={[lat, lng]}
                            zoom={13}
                            style={{ height: "500px", width: "100%" }}
                        >
                            <MapUpdater center={[lat, lng]} />
                            
                            <LayersControl position="topright">
                                <BaseLayer checked name="OpenStreetMap">
                                    <TileLayer
                                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                    />
                                </BaseLayer>
                                <BaseLayer name="Satellite">
                                    <TileLayer
                                        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                                        attribution='&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
                                    />
                                </BaseLayer>
                                
                                {/* Show index overlay if available */}
                                {Object.entries(indexData).map(([index, data]) => (
                                    data.tileUrl && (
                                        <Overlay 
                                            key={index} 
                                            checked={selectedIndex === index || showAllIndices} 
                                            name={`${index} Layer`}
                                        >
                                            <TileLayer
                                                url={data.tileUrl}
                                                attribution="Vegetation Analysis"
                                                opacity={0.7}
                                            />
                                        </Overlay>
                                    )
                                ))}
                            </LayersControl>
                            
                            {/* Draw control for area analysis */}
                            {calculationMode === "area" && (
                                <FeatureGroup ref={drawRef}>
                                    <EditControl
                                        position="topleft"
                                        onCreated={onCreated}
                                        onEdited={onEdited}
                                        onDeleted={onDeleted}
                                        draw={{
                                            rectangle: false,
                                            circle: false,
                                            circlemarker: false,
                                            marker: false,
                                            polyline: false,
                                            polygon: {
                                                allowIntersection: false,
                                                drawError: {
                                                    color: '#e1e100',
                                                    message: '<strong>Oh snap!</strong> You can\'t draw that!'
                                                },
                                                shapeOptions: {
                                                    color: '#3388ff',
                                                    fillOpacity: 0.2
                                                }
                                            }
                                        }}
                                    />
                                </FeatureGroup>
                            )}
                            
                            {/* Show drawn polygon if available */}
                            {drawnPolygon && (
                                <Polygon positions={drawnPolygon} />
                            )}
                        </MapContainer>
                    </div>
                </div>
                
                <div className="col-lg-4">
                    <div className="card shadow h-100 border-0">
                        <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
                            <h5 className="m-0 fw-bold text-success">Analysis Results</h5>
                            <div>
                                <button
                                    className="btn btn-sm btn-outline-success"
                                    onClick={generateReport}
                                    disabled={generatingReport || Object.keys(indexData).length === 0}
                                >
                                    {generatingReport ? (
                                        <>
                                            <Spinner animation="border" size="sm" className="me-1" />
                                            Generating...
                                        </>
                                    ) : (
                                        <>
                                            <i className="bi bi-file-earmark-text me-1"></i>
                                            Generate Report
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                        
                        <div className="card-body" style={{ overflowY: "auto", maxHeight: "430px" }}>
                            {loading ? (
                                <div className="text-center py-5">
                                    <Spinner animation="border" role="status" className="mb-3" />
                                    <p className="text-muted">Fetching data from satellites...</p>
                                </div>
                            ) : Object.keys(indexData).length > 0 ? (
                                <>
                                    {showAllIndices ? (
                                        <Row xs={1} className="g-3">
                                            {Object.entries(indexData).map(([index, data]) => (
                                                <Col key={index}>
                                                    <Card className="h-100 border-0 shadow-sm">
                                                        <Card.Body>
                                                            <Card.Title className="d-flex justify-content-between align-items-center">
                                                                <span>{index}</span>
                                                                <Badge bg="secondary" className="px-2 py-1">
                                                                    {data.value}
                                                                </Badge>
                                                            </Card.Title>
                                                            <Card.Text className="small text-muted">
                                                                {getIndexDescription(index)}
                                                            </Card.Text>
                                                            <IndexStatusIndicator index={index} value={data.value} />
                                                            <Card.Text className="mt-2 small">
                                                                <strong>Optimal Range:</strong> {getOptimalRangeDescription(index)}
                                                            </Card.Text>
                                                        </Card.Body>
                                                    </Card>
                                                </Col>
                                            ))}
                                        </Row>
                                    ) : (
                                        <Card className="border-0 shadow-sm">
                                            <Card.Body>
                                                <Card.Title className="d-flex justify-content-between align-items-center">
                                                    <span>{selectedIndex}</span>
                                                    <Badge bg="secondary" className="px-2 py-1">
                                                        {indexData[selectedIndex]?.value || "N/A"}
                                                    </Badge>
                                                </Card.Title>
                                                <Card.Text className="text-muted mb-3">
                                                    {getIndexDescription(selectedIndex)}
                                                </Card.Text>
                                                <IndexStatusIndicator 
                                                    index={selectedIndex} 
                                                    value={indexData[selectedIndex]?.value} 
                                                />
                                                <Card.Text className="mt-3">
                                                    <strong>Optimal Range:</strong> {getOptimalRangeDescription(selectedIndex)}
                                                </Card.Text>
                                            </Card.Body>
                                        </Card>
                                    )}
                                </>
                            ) : (
                                <div className="text-center py-5">
                                    <i className="bi bi-bar-chart-line display-1 text-muted mb-3"></i>
                                    <p className="text-muted">
                                        {calculationMode === "point" ? (
                                            "Enter coordinates and select an index to analyze."
                                        ) : (
                                            "Draw a polygon on the map to analyze an area."
                                        )}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Report Section */}
            {reportData && (
                <div className="mt-4">
                    <div className="card shadow border-0">
                        <div className="card-header bg-success text-white py-3">
                            <h4 className="mb-0">Land Analysis Report</h4>
                        </div>
                        <div className="card-body">
                            <div className="row mb-4">
                                <div className="col-md-6">
                                    <h5>Location Information</h5>
                                    <p><strong>Latitude:</strong> {reportData.location.latitude}</p>
                                    <p><strong>Longitude:</strong> {reportData.location.longitude}</p>
                                    {reportData.location.area && (
                                        <>
                                            <p><strong>Area:</strong> {reportData.location.area.hectares} hectares ({reportData.location.area.acres} acres)</p>
                                        </>
                                    )}
                                    <p><strong>Date:</strong> {reportData.date}</p>
                                </div>
                                <div className="col-md-6">
                                    <h5>Summary</h5>
                                    <p><strong>Vegetation Status:</strong> {reportData.summary.vegetationStatus}</p>
                                    <p><strong>Moisture Status:</strong> {reportData.summary.moistureStatus}</p>
                                    <p><strong>Water Presence:</strong> {reportData.summary.waterPresence}</p>
                                    <p><strong>Chlorophyll Level:</strong> {reportData.summary.chlorophyllLevel}</p>
                                </div>
                            </div>
                            
                            <div className="row mb-4">
                                <div className="col-12">
                                    <h5>Recommendations</h5>
                                    <ul>
                                        {reportData.recommendations.map((rec, index) => (
                                            <li key={index}>{rec}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                            
                            <div className="d-flex justify-content-center gap-3">
    {reportData && mapImage && (
        <PDFDownloadLink
            document={<LandAnalysisReport data={reportData} mapImage={mapImage} />}
            fileName="land-analysis-report.pdf"
            className="btn btn-primary"
        >
            {({ blob, url, loading, error }) =>
                loading ? 'Preparing PDF...' : 'Download PDF Report'
            }
        </PDFDownloadLink>
    )}
    {/* <button 
  className="btn btn-warning"
  onClick={() => {
    // Validate we have a proper polygon
    if (!drawnPolygon || drawnPolygon.length < 3) {
      alert("Please draw a valid polygon with at least 3 points");
      return;
    }

    // Create a properly formatted GeoJSON polygon
    // Convert [lat,lng] to [lng,lat] and ensure it's closed
    const coordinates = drawnPolygon.map(point => [point[1], point[0]]);
    
    // Close the polygon if not already closed
    const firstPoint = coordinates[0];
    const lastPoint = coordinates[coordinates.length - 1];
    if (firstPoint[0] !== lastPoint[0] || firstPoint[1] !== lastPoint[1]) {
      coordinates.push(firstPoint);
    }

    const geoJsonPolygon = {
      type: "Polygon",
      coordinates: [coordinates] // Note the extra array wrapping
    };

    console.log('Navigating with data:', { 
      indexData, 
      location: { lat, lng },
      polygon: geoJsonPolygon,
      area: reportData?.location?.area
    });

    navigate("/yield-analysis", { 
      state: { 
        indexData,
        location: { lat, lng },
        polygon: geoJsonPolygon,
        area: reportData?.location?.area,
        cropType: "wheat",
        startDate: "2024-01-01",
        endDate: "2024-03-31"
      } 
    });
  }}
>
  <i className="bi bi-graph-up me-2"></i>
  Yield Analysis
</button> */}
{/* <button 
  className="btn btn-info"
  onClick={() => {
    const ndvi = indexData?.NDVI;

    if (!ndvi && ndvi !== 0) {
      alert("NDVI value is missing");
      return;
    }

    navigate("/predict-yield", {
      state: {
        ndvi
      }
    });
  }}
>
  <i className="bi bi-bar-chart-line me-2"></i>
  Predict Yield
</button> */}
<button 
  className="btn btn-info"
  onClick={() => {
    if (!drawnPolygon || drawnPolygon.length < 3) {
      alert("Please draw a valid polygon with at least 3 points");
      return;
    }

    const coordinates = drawnPolygon.map(point => [point[1], point[0]]);
    const firstPoint = coordinates[0];
    const lastPoint = coordinates[coordinates.length - 1];
    if (firstPoint[0] !== lastPoint[0] || firstPoint[1] !== lastPoint[1]) {
      coordinates.push(firstPoint);
    }

    const geoJsonPolygon = {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [coordinates]
      }
    };

    // ✅ Debug logs
    console.log("Polygon being sent:", JSON.stringify(geoJsonPolygon, null, 2));
    console.log("Lat/Lng:", lat, lng);
    console.log("Area:", reportData?.location?.area);

    navigate("/land-classification", { 
      state: { 
        polygon: geoJsonPolygon,
        location: { lat, lng },
        area: reportData?.location?.area
      } 
    });
  }}
>
  <i className="bi bi-map me-2"></i>
  Land Classification
</button>
<button 
  className="btn btn-success"
  onClick={() => {
    if (!drawnPolygon || drawnPolygon.length < 3) {
      alert("Please draw a valid polygon with at least 3 points");
      return;
    }

    const coordinates = drawnPolygon.map(point => [point[1], point[0]]);
    const firstPoint = coordinates[0];
    const lastPoint = coordinates[coordinates.length - 1];
    if (firstPoint[0] !== lastPoint[0] || firstPoint[1] !== lastPoint[1]) {
      coordinates.push(firstPoint);
    }

    const geoJsonPolygon = {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [coordinates]
      }
    };

    // Extract NDVI value from indexData safely
    const ndviValue = parseFloat(indexData?.NDVI?.value) || 0;

    console.log("Redirecting to EnvironmentYield with:", {
      ndvi: ndviValue,
      location: { lat, lng },
      polygon: geoJsonPolygon
    });

    navigate("/environment-yield", {
      state: {
        ndvi: ndviValue,
        location: { lat, lng },
        polygon: geoJsonPolygon
      }
    });
  }}
>
  <i className="bi bi-bar-chart-line me-2"></i>
  Environment Yield
</button>





</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MapView;