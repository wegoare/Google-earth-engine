


import React, { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, LayersControl, GeoJSON, useMap, Marker, Popup } from "react-leaflet";
import L from 'leaflet';
import "leaflet/dist/leaflet.css";
import { Spinner, Card, Row, Col, Badge, ProgressBar, Button, Form } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { PDFDownloadLink, Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

// Fix for default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png')
});

const { BaseLayer, Overlay } = LayersControl;

// Define index palettes for visualization
const indexPalettes = {
    NDVI: ["blue", "white", "green"],
    SAVI: ["yellow", "green", "darkgreen"],
    EVI: ["purple", "blue", "lightgreen", "darkgreen"],
    GNDVI: ["blue", "white", "green"],
    NDWI: ["blue", "white", "green"],
    GCI: ["yellow", "green", "darkgreen"],
    NBR: ["black", "red", "yellow"],
    NDMI: ["blue", "white", "green"],
    NDSI: ["blue", "white", "green"],
    RVI: ["blue", "green", "yellow", "red"],
};

// Index reference ranges
const indexRanges = {
    NDVI: { low: [0, 0.2], good: [0.2, 0.6], high: [0.6, 1] },
    SAVI: { low: [0, 0.2], good: [0.2, 0.6], high: [0.6, 1] },
    EVI: { low: [0, 0.2], good: [0.2, 0.6], high: [0.6, 1] },
    GNDVI: { low: [0, 0.2], good: [0.2, 0.6], high: [0.6, 1] },
    NDWI: { low: [-1, -0.3], good: [-0.3, 0.3], high: [0.3, 1] },
    GCI: { low: [0, 1], good: [1, 3], high: [3, 10] },
    NBR: { low: [-1, -0.2], good: [-0.2, 0.1], high: [0.1, 1] },
    NDMI: { low: [-1, 0], good: [0, 0.4], high: [0.4, 1] },
    NDSI: { low: [-1, 0], good: [0, 0.4], high: [0.4, 1] },
    RVI: { low: [0, 2], good: [2, 6], high: [6, 15] }
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

// Get recommendations based on index values
const getRecommendations = (index, value) => {
    const status = getIndexStatus(index, value);
    
    switch(index) {
        case "NDVI":
            if (status === "low") return "Consider irrigation and nitrogen application to improve plant health.";
            if (status === "good") return "Maintain current farm practices; vegetation appears healthy.";
            if (status === "high") return "Excellent vegetation density; monitor for optimal harvest timing.";
            return "Insufficient data to provide recommendations.";
        
        case "SAVI":
            if (status === "low") return "Soil conditions may be affecting plant growth; consider soil amendments.";
            if (status === "good") return "Good balance between soil and vegetation; continue current practices.";
            if (status === "high") return "Excellent vegetation coverage despite soil conditions.";
            return "Insufficient data to provide recommendations.";
            
        case "EVI":
            if (status === "low") return "Review canopy structure and leaf area; consider additional nutrients.";
            if (status === "good") return "Vegetation is responding well to current conditions.";
            if (status === "high") return "Exceptional vegetation productivity; optimal growing conditions.";
            return "Insufficient data to provide recommendations.";
        case "GNDVI":
            if (status === "low") return "Chlorophyll levels may be suboptimal; consider nitrogen application.";
            if (status === "good") return "Adequate chlorophyll content; plants are photosynthesizing well.";
            if (status === "high") return "High chlorophyll activity; excellent photosynthetic capacity.";
            return "Insufficient data to provide recommendations.";
        case "NDWI":
            if (status === "low") return "Area appears dry; consider irrigation if growing crops.";
            if (status === "good") return "Balanced moisture conditions suitable for most crops.";
            if (status === "high") return "High moisture or standing water present; monitor drainage if needed.";
            return "Insufficient data to provide recommendations.";
            
        case "GCI":
            if (status === "low") return "Low chlorophyll index; nitrogen deficiency may be present.";
            if (status === "good") return "Adequate chlorophyll levels for healthy plant growth.";
            if (status === "high") return "High chlorophyll content indicates excellent nitrogen uptake.";
            return "Insufficient data to provide recommendations.";
            
        case "NBR":
            if (status === "low") return "Recently burned area detected; monitor for erosion risks.";
            if (status === "good") return "No significant burn signature detected.";
            if (status === "high") return "Area shows vegetation regrowth after previous disturbance.";
            return "Insufficient data to provide recommendations.";
            
        case "NDMI":
            if (status === "low") return "Low vegetation moisture content; irrigation may be needed.";
            if (status === "good") return "Adequate moisture in vegetation tissue.";
            if (status === "high") return "High moisture content in vegetation; good water availability.";
            return "Insufficient data to provide recommendations.";
            
        case "NDSI":
            if (status === "low") return "No significant snow cover detected.";
            if (status === "good") return "Partial snow cover present; monitor for melt timing.";
            if (status === "high") return "Significant snow cover detected; consider impacts on runoff.";
            return "Insufficient data to provide recommendations.";
            
        case "RVI":
            if (status === "low") return "Sparse vegetation; consider soil testing and fertility management.";
            if (status === "good") return "Moderate vegetation density suitable for most crops.";
            if (status === "high") return "Dense vegetation suggests excellent growing conditions.";
            return "Insufficient data to provide recommendations.";
            
        default:
            return "No specific recommendations available.";
    }
};

// Determines the status of the index
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

// Handles map centering on updates
const MapUpdater = ({ center, zoom }) => {
    const map = useMap();
    
    useEffect(() => {
        if (center && center.length === 2) {
            map.setView(center, zoom || map.getZoom());
        }
    }, [center, map, zoom]);
    
    return null;
};

// Indicator component for index status
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
                <span>{typeof value === 'number' ? value.toFixed(2) : value}</span>
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

// New component for external layer control
const ExternalLayerControl = ({ mapLayers, activeLayers, onLayerToggle }) => {
    return (
        <div className="mb-3">
            <h6 className="mb-2">Map Layers</h6>
            <div className="d-flex flex-wrap gap-2">
                {mapLayers.map(layer => (
                    <Button 
                        key={layer.id}
                        size="sm"
                        variant={activeLayers.includes(layer.id) ? "primary" : "outline-primary"}
                        onClick={() => onLayerToggle(layer.id)}
                    >
                        {layer.name}
                    </Button>
                ))}
            </div>
        </div>
    );
};

// Styles for PDF report
const pdfStyles = StyleSheet.create({
    page: {
        padding: 30,
        backgroundColor: '#ffffff'
    },
    header: {
        fontSize: 24,
        textAlign: 'center',
        marginBottom: 20,
        color: '#2e7d32'
    },
    subheader: {
        fontSize: 18,
        marginBottom: 10,
        marginTop: 15,
        color: '#1b5e20',
        borderBottomWidth: 1,
        borderBottomColor: '#e8f5e9',
        paddingBottom: 5
    },
    section: {
        margin: 10,
        padding: 10,
        flexGrow: 1
    },
    fieldRow: {
        flexDirection: 'row',
        marginBottom: 5
    },
    fieldLabel: {
        width: '30%',
        fontWeight: 'bold'
    },
    fieldValue: {
        width: '70%'
    },
    table: {
        display: 'table',
        width: '100%',
        borderStyle: 'solid',
        borderWidth: 1,
        borderColor: '#e0e0e0',
        marginVertical: 10
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0'
    },
    tableHeader: {
        backgroundColor: '#f5f5f5',
        fontWeight: 'bold'
    },
    tableCell: {
        padding: 5,
        fontSize: 10,
        textAlign: 'left',
        borderRightWidth: 1,
        borderRightColor: '#e0e0e0'
    },
    tableCellWide: {
        width: '35%',
        padding: 5,
        fontSize: 10,
        textAlign: 'left',
        borderRightWidth: 1,
        borderRightColor: '#e0e0e0'
    },
    tableCellNarrow: {
        width: '15%',
        padding: 5,
        fontSize: 10,
        textAlign: 'left',
        borderRightWidth: 1,
        borderRightColor: '#e0e0e0'
    },
    tableCellNoBorder: {
        padding: 5,
        fontSize: 10,
        textAlign: 'left'
    },
    indexCard: {
        marginVertical: 10,
        padding: 10,
        backgroundColor: '#f9f9f9',
        borderRadius: 5
    },
    indexTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 5
    },
    indexValue: {
        fontSize: 12,
        marginBottom: 2
    },
    statusLow: {
        color: '#d32f2f'
    },
    statusGood: {
        color: '#388e3c'
    },
    statusHigh: {
        color: '#1976d2'
    },
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 30,
        right: 30,
        textAlign: 'center',
        fontSize: 10,
        color: '#757575'
    },
    recommendations: {
        marginTop: 5,
        paddingTop: 5,
        fontSize: 11,
        fontStyle: 'italic'
    }
});

// PDF Report Component
const AnalysisReport = ({ indices, shapefileCoordinates, currentDate }) => (
    <Document>
        <Page size="A4" style={pdfStyles.page}>
            <Text style={pdfStyles.header}>Agricultural Field Analysis Report</Text>
            
            <View style={pdfStyles.section}>
                <Text style={pdfStyles.subheader}>Report Information</Text>
                <View style={pdfStyles.fieldRow}>
                    <Text style={pdfStyles.fieldLabel}>Generated Date:</Text>
                    <Text style={pdfStyles.fieldValue}>{currentDate}</Text>
                </View>
                {shapefileCoordinates && (
                    <View style={pdfStyles.fieldRow}>
                        <Text style={pdfStyles.fieldLabel}>Field Location:</Text>
                        <Text style={pdfStyles.fieldValue}>
                            Lat: {shapefileCoordinates[1].toFixed(6)}, Long: {shapefileCoordinates[0].toFixed(6)}
                        </Text>
                    </View>
                )}
            </View>

            <View style={pdfStyles.section}>
                <Text style={pdfStyles.subheader}>Analysis Results</Text>
                {Object.entries(indices).map(([index, data]) => {
                    const status = getIndexStatus(index, data.value);
                    let statusStyle;
                    switch(status) {
                        case 'low': statusStyle = pdfStyles.statusLow; break;
                        case 'good': statusStyle = pdfStyles.statusGood; break;
                        case 'high': statusStyle = pdfStyles.statusHigh; break;
                        default: statusStyle = {}; break;
                    }
                    
                    return (
                        <View key={index} style={pdfStyles.indexCard}>
                            <Text style={pdfStyles.indexTitle}>{index}</Text>
                            <View style={pdfStyles.fieldRow}>
                                <Text style={pdfStyles.fieldLabel}>Value:</Text>
                                <Text style={{...pdfStyles.fieldValue, ...statusStyle}}>
                                    {typeof data.value === 'number' ? data.value.toFixed(2) : data.value} 
                                    ({status.toUpperCase()})
                                </Text>
                            </View>
                            <View style={pdfStyles.fieldRow}>
                                <Text style={pdfStyles.fieldLabel}>Description:</Text>
                                <Text style={pdfStyles.fieldValue}>{getIndexDescription(index)}</Text>
                            </View>
                            <View style={pdfStyles.fieldRow}>
                                <Text style={pdfStyles.fieldLabel}>Optimal Range:</Text>
                                <Text style={pdfStyles.fieldValue}>{getOptimalRangeDescription(index)}</Text>
                            </View>
                            <Text style={pdfStyles.recommendations}>
                                <Text style={{fontWeight: 'bold'}}>Recommendation: </Text>
                                {getRecommendations(index, data.value)}
                            </Text>
                        </View>
                    );
                })}
            </View>

            <View style={pdfStyles.section}>
                <Text style={pdfStyles.subheader}>Index Reference Guide</Text>
                <View style={pdfStyles.table}>
                    <View style={{...pdfStyles.tableRow, ...pdfStyles.tableHeader}}>
                        <Text style={pdfStyles.tableCellNarrow}>Index</Text>
                        <Text style={pdfStyles.tableCellNarrow}>Low Range</Text>
                        <Text style={pdfStyles.tableCellNarrow}>Good Range</Text>
                        <Text style={pdfStyles.tableCellNarrow}>High Range</Text>
                        <Text style={pdfStyles.tableCellWide}>Description</Text>
                    </View>
                    
                    {Object.keys(indexRanges).map(index => {
                        const ranges = indexRanges[index];
                        return (
                            <View key={index} style={pdfStyles.tableRow}>
                                <Text style={pdfStyles.tableCellNarrow}>{index}</Text>
                                <Text style={pdfStyles.tableCellNarrow}>
                                    {ranges.low[0]} to {ranges.low[1]}
                                </Text>
                                <Text style={pdfStyles.tableCellNarrow}>
                                    {ranges.good[0]} to {ranges.good[1]}
                                </Text>
                                <Text style={pdfStyles.tableCellNarrow}>
                                    {ranges.high[0]} to {ranges.high[1]}
                                </Text>
                                <Text style={pdfStyles.tableCellWide}>{getIndexDescription(index)}</Text>
                            </View>
                        );
                    })}
                </View>
            </View>
            
            <Text style={pdfStyles.footer}>
                Generated by Agricultural Field Analysis Tool • {currentDate}
            </Text>
        </Page>
    </Document>
);

// Main component
const ShapefileAnalyzer = () => {
    const navigate = useNavigate();
    const [geojson, setGeojson] = useState(null);
    const [loading, setLoading] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [selectedIndices, setSelectedIndices] = useState([]);
    const [indices, setIndices] = useState({});
    const [errorMessage, setErrorMessage] = useState(null);
    const [mapCenter, setMapCenter] = useState([20, 78]);
    const [shapefileCoordinates, setShapefileCoordinates] = useState(null);
    const [mapZoom, setMapZoom] = useState(8);
    const [currentDate] = useState(new Date().toLocaleDateString('en-US', {
        year: 'numeric', 
        month: 'long', 
        day: 'numeric'
    }));
    const [reportName, setReportName] = useState("agricultural_field_analysis");
    const [mapLoaded, setMapLoaded] = useState(false);
    const mapInstance = useRef(null);

    // Base map layers
    const baseMaps = [
        { id: "osm", name: "OpenStreetMap", url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" },
        { id: "satellite", name: "Satellite", url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" },
        { id: "topo", name: "Topographic", url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png" },
        { id: "terrain", name: "Terrain", url: "https://stamen-tiles-{s}.a.ssl.fastly.net/terrain/{z}/{x}/{y}{r}.png" }
    ];
    
    // Map overlay layers
    const overlayLayers = [
        { id: "shapefile", name: "Shapefile", type: "geojson" },
        { id: "markers", name: "Markers", type: "marker" },
        { id: "grid", name: "Grid", type: "grid" }
    ];
    
    const [selectedBaseMap, setSelectedBaseMap] = useState("osm");
    const [activeOverlays, setActiveOverlays] = useState(["shapefile"]);

    // Define all supported indices for selection
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

    useEffect(() => {
        setMapLoaded(true);
        return () => {
            if (mapInstance.current) {
                mapInstance.current.remove();
            }
        };
    }, []);

    // Extract coordinates from GeoJSON
    const extractCoordinates = (geojson) => {
        if (!geojson || !geojson.features || !geojson.features.length) return null;
        
        const feature = geojson.features[0];
        if (!feature.geometry) return null;
        
        // Handle different geometry types
        switch (feature.geometry.type) {
            case 'Point':
                return feature.geometry.coordinates;
            case 'Polygon':
                // Calculate centroid for polygons
                const coords = feature.geometry.coordinates[0];
                if (!coords || !coords.length) return null;
                
                const sumLat = coords.reduce((sum, coord) => sum + coord[1], 0);
                const sumLng = coords.reduce((sum, coord) => sum + coord[0], 0);
                
                return [sumLng / coords.length, sumLat / coords.length];
            case 'MultiPolygon':
                // Use first polygon in multipolygon
                const firstPoly = feature.geometry.coordinates[0][0];
                if (!firstPoly || !firstPoly.length) return null;
                
                const polyLat = firstPoly.reduce((sum, coord) => sum + coord[1], 0);
                const polyLng = firstPoly.reduce((sum, coord) => sum + coord[0], 0);
                
                return [polyLng / firstPoly.length, polyLat / firstPoly.length];
            default:
                return null;
        }
    };

    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setLoading(true);
        setErrorMessage(null);

        try {
            const formData = new FormData();
            formData.append("shapefile", file);

            const response = await fetch("http://localhost:4000/upload-shapefile", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) throw new Error("Failed to process shapefile");

            const data = await response.json();
            setGeojson(data.geojson);
            
            // Update map center based on geojson center if available
            if (data.center && Array.isArray(data.center) && data.center.length === 2) {
                setMapCenter(data.center);
            }
            
            // Extract coordinates from GeoJSON
            const coords = extractCoordinates(data.geojson);
            if (coords) {
                setShapefileCoordinates(coords);
            }
            
            // Set default report name based on file name
            if (file.name) {
                const baseName = file.name.split('.')[0];
                setReportName(`${baseName}_analysis`);
            }
        } catch (error) {
            console.error("Error uploading file:", error);
            setErrorMessage("Failed to upload shapefile. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const analyzeShapefile = async () => {
        if (!geojson) return;
        setAnalyzing(true);

        try {
            // In a real application, you would send the GeoJSON to the server
            // For simulation, we're generating random values within the expected ranges
            const simulatedResults = {};
            selectedIndices.forEach((index) => {
                const { low, high } = indexRanges[index] || { low: [0, 0], high: [0, 0] };
                simulatedResults[index] = {
                    value: parseFloat((low[0] + Math.random() * (high[1] - low[0])).toFixed(2)),
                    tileUrl: null // Would come from server in real implementation
                };
            });

            // Simulate API delay
            await new Promise((resolve) => setTimeout(resolve, 1500));
            setIndices(simulatedResults);
        } catch (error) {
            console.error("Error analyzing shapefile:", error);
            setErrorMessage("Error analyzing data. Please try again.");
        } finally {
            setAnalyzing(false);
        }
    };

    const handleIndexChange = (event) => {
        const { value, checked } = event.target;
        setSelectedIndices((prev) =>
            checked ? [...prev, value] : prev.filter((i) => i !== value)
        );
    };

    const handleBaseMapChange = (event) => {
        setSelectedBaseMap(event.target.value);
    };

    const handleOverlayToggle = (layerId) => {
        setActiveOverlays(prev => 
            prev.includes(layerId) 
                ? prev.filter(id => id !== layerId) 
                : [...prev, layerId]
        );
    };

    const handleMapViewRedirect = () => {
        navigate("/");  // Assuming the root path is for MapView
    };
    
    const handleReportNameChange = (e) => {
        setReportName(e.target.value);
    };

    return (
        <div className="container mt-5">
            <h2 className="text-center mb-4 fw-bold text-success">🗺️ Shapefile Analyzer for Agriculture</h2>
            
            {errorMessage && <div className="alert alert-danger shadow-sm rounded-3">{errorMessage}</div>}

            {/* File Upload Card */}
            <div className="card shadow p-4 mb-4 border-0">
                <h5 className="card-title text-center mb-3">Upload Your Shapefile</h5>
                <div className="row g-3">
                    <div className="col-md-8">
                        <input 
                            type="file" 
                            className="form-control rounded-pill" 
                            onChange={handleFileUpload} 
                            accept=".shp,.zip" 
                            disabled={loading} 
                        />
                        <small className="text-muted mt-1 d-block">
                            Upload a .shp file or a .zip containing shapefile components
                        </small>
                    </div>
                    <div className="col-md-4">
                        <button 
                            className="btn btn-warning px-4 py-2 rounded-pill shadow-sm fw-bold w-100"
                            onClick={handleMapViewRedirect}
                        >
                            <i className="bi bi-map me-2"></i>
                            Back to Map View
                        </button>
                    </div>
                </div>
                {loading && (
                    <div className="text-center mt-3">
                        <Spinner animation="border" variant="primary" />
                        <p className="text-muted mt-2">Processing shapefile...</p>
                    </div>
                )}
            </div>

            {/* Display area when geojson is loaded */}
            {geojson && (
                <>
                    {/* Map Layer Controls - Moved Above Map */}
                    <div className="card shadow p-3 border-0 mb-4">
                        <h5 className="card-title text-center mb-3">Map Controls</h5>
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label><strong>Base Map</strong></Form.Label>
                                    <Form.Select 
                                        value={selectedBaseMap} 
                                        onChange={handleBaseMapChange}
                                    >
                                        {baseMaps.map(map => (
                                            <option key={map.id} value={map.id}>{map.name}</option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <div className="mb-3">
                                    <strong className="d-block mb-2">Map Overlays</strong>
                                    <ExternalLayerControl 
                                        mapLayers={overlayLayers}
                                        activeLayers={activeOverlays}
                                        onLayerToggle={handleOverlayToggle}
                                    />
                                </div>
                            </Col>
                        </Row>
                    </div>

                    {/* Main Content Row */}
                    <Row className="g-4">
                        {/* Map Column */}
                        <Col lg={7}>
                            <Card className="shadow border-0 h-100">
                                <Card.Body>
                                    <Card.Title className="text-center mb-3">Field Map</Card.Title>
                                    <div style={{ height: "500px", width: "100%" }}>
                                        {mapLoaded && (
                                            <MapContainer
                                                center={mapCenter}
                                                zoom={mapZoom}
                                                style={{ height: "100%", width: "100%" }}
                                                className="rounded shadow-sm"
                                                whenCreated={(map) => {
                                                    mapInstance.current = map;
                                                }}
                                            >
                                                <MapUpdater center={mapCenter} zoom={mapZoom} />
                                                
                                                {/* Base Layers */}
                                                <LayersControl position="topright">
                                                    {baseMaps.map(map => (
                                                        <BaseLayer 
                                                            key={map.id} 
                                                            name={map.name} 
                                                            checked={selectedBaseMap === map.id}
                                                        >
                                                            <TileLayer url={map.url} />
                                                        </BaseLayer>
                                                    ))}
                                                    
                                                    {/* GeoJSON Overlay */}
                                                    {geojson && (
                                                        <Overlay checked={activeOverlays.includes("shapefile")} name="Shapefile">
                                                            <GeoJSON 
                                                                data={geojson} 
                                                                style={() => ({
                                                                    color: '#ff7800',
                                                                    weight: 2,
                                                                    opacity: 0.65,
                                                                    fillOpacity: 0.4
                                                                })}
                                                            />
                                                        </Overlay>
                                                    )}
                                                    
                                                    {/* Field Center Marker */}
                                                    {shapefileCoordinates && activeOverlays.includes("markers") && (
                                                        <Overlay checked name="Field Center">
                                                            <Marker position={[shapefileCoordinates[1], shapefileCoordinates[0]]}>
                                                                <Popup>
                                                                    Field Center<br/>
                                                                    Lat: {shapefileCoordinates[1].toFixed(6)}<br/>
                                                                    Long: {shapefileCoordinates[0].toFixed(6)}
                                                                </Popup>
                                                            </Marker>
                                                        </Overlay>
                                                    )}
                                                </LayersControl>
                                            </MapContainer>
                                        )}
                                    </div>
                                </Card.Body>
                            </Card>
                        </Col>

                        {/* Analysis Control Column */}
                        <Col lg={5}>
                            <Card className="shadow border-0 mb-4">
                                <Card.Body>
                                    <Card.Title className="text-center mb-3">Analysis Controls</Card.Title>
                                    
                                    <h6 className="mb-2">Select Indices to Analyze</h6>
                                    <div className="d-flex flex-wrap gap-2 mb-3">
                                        {indicesList.map((index) => (
                                            <Form.Check
                                                key={index.value}
                                                type="checkbox"
                                                id={`index-${index.value}`}
                                                label={index.label}
                                                value={index.value}
                                                checked={selectedIndices.includes(index.value)}
                                                onChange={handleIndexChange}
                                                className="me-3"
                                            />
                                        ))}
                                    </div>
                                    
                                    <div className="d-grid mb-3">
                                        <Button 
                                            variant="success" 
                                            size="lg"
                                            onClick={analyzeShapefile}
                                            disabled={analyzing || selectedIndices.length === 0}
                                            className="rounded-pill fw-bold py-2"
                                        >
                                            {analyzing ? (
                                                <>
                                                    <Spinner 
                                                        as="span" 
                                                        animation="border" 
                                                        size="sm" 
                                                        role="status" 
                                                        aria-hidden="true" 
                                                        className="me-2"
                                                    />
                                                    Analyzing...
                                                </>
                                            ) : (
                                                <>
                                                    <i className="bi bi-play-circle me-2"></i>
                                                    Run Analysis
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </Card.Body>
                            </Card>

                            {/* Results Card - Show when analysis is done */}
                            {Object.keys(indices).length > 0 && (
                                <Card className="shadow border-0 mb-4">
                                    <Card.Body>
                                        <Card.Title className="text-center mb-3">Analysis Results</Card.Title>
                                        
                                        {Object.entries(indices).map(([index, data]) => (
                                            <div key={index} className="mb-4">
                                                <h6 className="fw-bold">
                                                    {index} 
                                                    <Badge 
                                                        bg="light" 
                                                        text="dark" 
                                                        className="ms-2 rounded-pill"
                                                    >
                                                        {typeof data.value === 'number' ? data.value.toFixed(2) : data.value}
                                                    </Badge>
                                                </h6>
                                                
                                                <p className="small text-muted mb-1">{getIndexDescription(index)}</p>
                                                <p className="small text-muted mb-2">{getOptimalRangeDescription(index)}</p>
                                                
                                                <IndexStatusIndicator index={index} value={data.value} />
                                                
                                                <div className="mt-2 p-2 rounded bg-light">
                                                    <small className="fst-italic">
                                                        <strong>Recommendation:</strong> {getRecommendations(index, data.value)}
                                                    </small>
                                                </div>
                                            </div>
                                        ))}
                                        
                                        {/* Report Generation */}
                                        <div className="mt-4">
                                            <h6 className="mb-2">Generate Report</h6>
                                            <Form.Group className="mb-3">
                                                <Form.Label>Report Filename</Form.Label>
                                                <Form.Control 
                                                    type="text" 
                                                    value={reportName}
                                                    onChange={handleReportNameChange}
                                                />
                                            </Form.Group>
                                            
                                            <div className="d-grid">
                                                <PDFDownloadLink
                                                    document={
                                                        <AnalysisReport 
                                                            indices={indices}
                                                            shapefileCoordinates={shapefileCoordinates}
                                                            currentDate={currentDate}
                                                        />
                                                    }
                                                    fileName={`${reportName}.pdf`}
                                                    className="btn btn-primary rounded-pill fw-bold"
                                                >
                                                    {({ blob, url, loading, error }) =>
                                                        loading ? (
                                                            <>
                                                                <Spinner as="span" animation="border" size="sm" className="me-2" />
                                                                Preparing PDF...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <i className="bi bi-file-earmark-pdf me-2"></i>
                                                                Download PDF Report
                                                            </>
                                                        )
                                                    }
                                                </PDFDownloadLink>
                                            </div>

                                            {/* Added Navigation Buttons */}
                                            <div className="d-flex gap-2 mt-3">
                                                <Button 
                                                    variant="info"
                                                    className="flex-grow-1"
                                                    onClick={() => {
                                                        if (!geojson) {
                                                            alert("Please upload and analyze a shapefile first");
                                                            return;
                                                        }
                                                        navigate("/land-classification", { 
                                                            state: { 
                                                                polygon: geojson,
                                                                location: shapefileCoordinates ? { 
                                                                    lat: shapefileCoordinates[1], 
                                                                    lng: shapefileCoordinates[0] 
                                                                } : null,
                                                                area: null
                                                            } 
                                                        });
                                                    }}
                                                >
                                                    <i className="bi bi-map me-2"></i>
                                                    Land Classification
                                                </Button>

                                                <Button 
                                                    variant="success"
                                                    className="flex-grow-1"
                                                    onClick={() => {
                                                        if (!geojson) {
                                                            alert("Please upload and analyze a shapefile first");
                                                            return;
                                                        }
                                                        navigate("/environment-yield", {
                                                            state: {
                                                                ndvi: indices?.NDVI?.value || 0,
                                                                location: shapefileCoordinates ? { 
                                                                    lat: shapefileCoordinates[1], 
                                                                    lng: shapefileCoordinates[0] 
                                                                } : null,
                                                                polygon: geojson
                                                            }
                                                        });
                                                    }}
                                                >
                                                    <i className="bi bi-bar-chart-line me-2"></i>
                                                    Environment Yield
                                                </Button>
                                            </div>
                                        </div>
                                    </Card.Body>
                                </Card>
                            )}
                        </Col>
                    </Row>
                </>
            )}
            
            {/* Info Section when nothing is uploaded */}
            {!geojson && !loading && (
                <div className="card shadow p-4 border-0 text-center mt-4">
                    <div className="display-6 mb-3 text-muted">📁</div>
                    <h5>Upload a shapefile to begin analysis</h5>
                    <p className="text-muted">
                        This tool analyzes agricultural fields using remote sensing indices. 
                        Upload a shapefile to view your field on the map and run analysis.
                    </p>
                    <div className="row gx-4 gy-3 mt-2">
                        {indicesList.map((index, idx) => (
                            <div key={idx} className="col-md-6 col-lg-4">
                                <div className="p-3 rounded bg-light h-100">
                                    <h6 className="fw-bold">{index.value}</h6>
                                    <p className="small mb-0">{getIndexDescription(index.value)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ShapefileAnalyzer;