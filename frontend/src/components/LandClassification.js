import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import { Spinner, Card, Button, Alert } from "react-bootstrap";
import "leaflet/dist/leaflet.css";

const LandClassification = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [classificationData, setClassificationData] = useState(null);
  const [error, setError] = useState(null);
  const [mapCenter, setMapCenter] = useState([27.1751, 78.0421]);
  const [areaStats, setAreaStats] = useState(null);

  useEffect(() => {
    if (!location.state?.polygon) {
      navigate("/map-view");
      return;
    }

    const processPolygonAndFetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const polygonFeature = location.state.polygon;
        const coordinates = polygonFeature.geometry?.coordinates;

        if (!coordinates || !Array.isArray(coordinates[0])) {
          throw new Error("Invalid polygon coordinates format");
        }

        const validatedCoordinates = coordinates[0].map(coord => {
          if (!Array.isArray(coord) || coord.length < 2) {
            throw new Error("Each coordinate must be an array of [lng, lat]");
          }
          const [lng, lat] = coord;
          if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
            throw new Error(`Invalid coordinate values: [${lng}, ${lat}]`);
          }
          return [lng, lat];
        });

        const firstPoint = validatedCoordinates[0];
        const lastPoint = validatedCoordinates[validatedCoordinates.length - 1];
        const closedCoordinates = [...validatedCoordinates];
        if (firstPoint[0] !== lastPoint[0] || firstPoint[1] !== lastPoint[1]) {
          closedCoordinates.push(firstPoint);
        }

        const sumLat = closedCoordinates.reduce((sum, point) => sum + point[1], 0);
        const sumLng = closedCoordinates.reduce((sum, point) => sum + point[0], 0);
        setMapCenter([sumLat / closedCoordinates.length, sumLng / closedCoordinates.length]);

        const geoJsonPolygon = {
          type: "Polygon",
          coordinates: [closedCoordinates]
        };

        const response = await fetch("http://localhost:4000/gee/land-classification", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ polygon: geoJsonPolygon })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `Server error: ${response.status}`);
        }

        const data = await response.json();

        if (!data.classifiedImage || !data.areaStats) {
          throw new Error("Invalid response from server");
        }

        setClassificationData({
          tileUrl: data.classifiedImage,
          stats: data.areaStats
        });
        setAreaStats(data.areaStats);
      } catch (err) {
        console.error(err);
        setError(err.message || "Error processing land classification");
      } finally {
        setLoading(false);
      }
    };

    processPolygonAndFetchData();
  }, [location, navigate]);

  const calculateTotalArea = () => {
    if (!areaStats) return 0;
    return Object.values(areaStats).reduce((sum, area) => sum + area, 0);
  };

  return (
    <div className="container mt-4">
      <h2 className="text-center mb-4">Land Cover Classification</h2>

      <Button variant="outline-secondary" onClick={() => navigate("/")} className="mb-3">
        <i className="bi bi-arrow-left me-2"></i> Back to Home
      </Button>

      {error && (
        <Alert variant="danger">
          <strong>Error:</strong> {error}
        </Alert>
      )}

      <div className="row">
        <div className="col-lg-8 mb-4">
          <Card>
            <Card.Body className="p-0" style={{ minHeight: "500px" }}>
              {loading ? (
                <div className="d-flex justify-content-center align-items-center" style={{ height: "500px" }}>
                  <Spinner animation="border" />
                  <span className="ms-2">Analyzing land cover...</span>
                </div>
              ) : (
                <MapContainer center={mapCenter} zoom={12} style={{ height: "500px", width: "100%" }}>
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; OpenStreetMap contributors'
                  />
                  {classificationData?.tileUrl && (
                    <TileLayer url={classificationData.tileUrl} opacity={0.7} />
                  )}
                  {location.state?.polygon && (
                    <GeoJSON
                      data={location.state.polygon}
                      style={{ color: "#3388ff", weight: 3, fillOpacity: 0.1 }}
                    />
                  )}
                </MapContainer>
              )}
            </Card.Body>
          </Card>
        </div>

        <div className="col-lg-4">
          <Card className="h-100">
            <Card.Header>
              <h5>Land Cover Statistics</h5>
            </Card.Header>
            <Card.Body>
              {loading ? (
                <div className="text-center">
                  <Spinner animation="border" />
                </div>
              ) : areaStats ? (
                <>
                  <p><strong>Total Area:</strong> {calculateTotalArea().toFixed(2)} ha</p>
                  <h6>Distribution:</h6>
                  {Object.entries(areaStats)
                    .sort((a, b) => b[1] - a[1])
                    .map(([classId, area]) => {
                      const info = landCoverClasses[Number(classId)] || {};
                      const percentage = (area / calculateTotalArea()) * 100;
                      return (
                        <div key={classId} className="mb-2">
                          <div className="d-flex justify-content-between">
                            <span>
                              <span
                                className="me-2"
                                style={{
                                  display: "inline-block",
                                  width: 12,
                                  height: 12,
                                  backgroundColor: info.color || "#ccc"
                                }}
                              ></span>
                              {info.name || `Unknown Class ${classId}`}
                            </span>
                            <span>{percentage.toFixed(1)}%</span>
                          </div>
                          <div className="progress" style={{ height: "8px" }}>
                            <div
                              className="progress-bar"
                              style={{
                                width: `${percentage}%`,
                                backgroundColor: info.color || "#ccc"
                              }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                </>
              ) : (
                <p>No classification data available</p>
              )}
            </Card.Body>
          </Card>
        </div>
        <div className="mt-4">
  <h5>Land Cover Classes Reference</h5>
  <div className="d-flex flex-wrap">
    {Object.entries(landCoverClasses).map(([classId, info]) => (
      <div
        key={classId}
        className="d-flex align-items-center me-4 mb-2"
        style={{ minWidth: 180 }}
      >
        <span
          style={{
            display: "inline-block",
            width: 20,
            height: 20,
            backgroundColor: info.color,
            border: "1px solid #000",
            marginRight: 8,
          }}
        ></span>
        <div>
          <strong>{info.name}</strong>
          <br />
          <small>{info.description}</small>
        </div>
      </div>
    ))}
  </div>
</div>
      </div>
    </div>
  );
};

// Full land cover classes object for reference
const landCoverClasses = {
  0: { name: "Water", color: "#419BDF", description: "Permanent water bodies" },
  1: { name: "Evergreen Needleleaf Forest", color: "#006400", description: "Evergreen needleleaf forests" },
  2: { name: "Evergreen Broadleaf Forest", color: "#008000", description: "Evergreen broadleaf forests" },
  3: { name: "Deciduous Needleleaf Forest", color: "#90EE90", description: "Deciduous needleleaf forests" },
  4: { name: "Deciduous Broadleaf Forest", color: "#ADFF2F", description: "Deciduous broadleaf forests" },
  5: { name: "Mixed Forests", color: "#FFFF00", description: "Mixed forests" },
  6: { name: "Closed Shrublands", color: "#FFA500", description: "Closed shrublands" },
  7: { name: "Open Shrublands", color: "#FF4500", description: "Open shrublands" },
  8: { name: "Woody Savannas", color: "#A52A2A", description: "Woody savannas" },
  9: { name: "Savannas", color: "#FFC0CB", description: "Savannas" },
  10: { name: "Grasslands", color: "#7CFC00", description: "Grasslands" },
  11: { name: "Permanent Wetlands", color: "#00CED1", description: "Permanent wetlands" },
  12: { name: "Croplands", color: "#FFFFE0", description: "Croplands" },
  13: { name: "Urban and Built-Up", color: "#D3D3D3", description: "Urban and built-up areas" },
  14: { name: "Cropland/Natural Vegetation Mosaic", color: "#F5DEB3", description: "Mixed cropland and vegetation" },
  15: { name: "Snow and Ice", color: "#FFFFFF", description: "Snow and ice" },
  16: { name: "Barren or Sparsely Vegetated", color: "#808080", description: "Barren or sparse vegetation" }
};

export default LandClassification;
