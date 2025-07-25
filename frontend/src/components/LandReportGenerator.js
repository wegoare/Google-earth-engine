import React, { useState, useRef } from 'react';
import { Button, Card, Spinner, Alert } from 'react-bootstrap';
import { PDFDownloadLink } from '@react-pdf/renderer';
import LandAnalysisReport from './LandAnalysisReport';
import html2canvas from 'html2canvas';

const LandReportGenerator = ({ indexData, location, mapRef }) => {
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [mapImage, setMapImage] = useState(null);

  const getIndexStatus = (index, value) => {
    if (value === undefined || value === null || isNaN(value)) return "unknown";
    
    const ranges = {
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
    
    const numValue = parseFloat(value);
    const range = ranges[index] || ranges.NDVI;
    
    if (numValue >= range.low[0] && numValue <= range.low[1]) return "low";
    if (numValue > range.good[0] && numValue <= range.good[1]) return "good";
    if (numValue > range.high[0] && numValue <= range.high[1]) return "high";
    
    return "unknown";
  };

  const getIndexDescription = (index) => {
    const descriptions = {
      "NDVI": "Vegetation health and density",
      "SAVI": "Soil-adjusted vegetation index",
      "EVI": "Enhanced vegetation index",
      "GNDVI": "Green normalized difference vegetation index",
      "NDWI": "Water body detection",
      "GCI": "Green chlorophyll index",
      "NBR": "Burn severity assessment",
      "NDMI": "Vegetation water content",
      "NDSI": "Snow cover detection",
      "RVI": "Ratio vegetation index"
    };
    return descriptions[index] || "Vegetation index";
  };

  const captureMap = async () => {
    if (!mapRef.current) return null;
    
    try {
      // Wait for map tiles to load
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const mapContainer = mapRef.current.querySelector('.leaflet-container');
      if (!mapContainer) return null;
      
      const canvas = await html2canvas(mapContainer, {
        useCORS: true,
        scale: 2,
        logging: false,
        allowTaint: true,
        backgroundColor: '#FFFFFF'
      });
      
      return canvas.toDataURL('image/png');
    } catch (error) {
      console.error("Map capture error:", error);
      return null;
    }
  };

  const generateReportData = () => {
    if (!indexData || Object.keys(indexData).length === 0) return null;
    
    // Vegetation assessment
    let vegetationStatus = "unknown";
    const ndviValue = parseFloat(indexData["NDVI"]?.value);
    if (!isNaN(ndviValue)) {
      if (ndviValue < 0.2) vegetationStatus = "poor";
      else if (ndviValue < 0.4) vegetationStatus = "fair";
      else if (ndviValue < 0.6) vegetationStatus = "good";
      else vegetationStatus = "excellent";
    }
    
    // Create recommendations
    const recommendations = [];
    if (vegetationStatus === "excellent" || vegetationStatus === "good") {
      recommendations.push("Ideal for agriculture - supports most crop types");
    } else if (vegetationStatus === "fair") {
      recommendations.push("Moderate soil quality - may need amendments");
    } else if (vegetationStatus === "poor") {
      recommendations.push("Poor vegetation - consider soil testing before use");
    }
    
    return {
      location: location,
      date: new Date().toLocaleDateString(),
      summary: {
        vegetationStatus,
        // Add other summary fields
      },
      indexValues: Object.entries(indexData).map(([index, data]) => ({
        name: index,
        value: data.value,
        status: getIndexStatus(index, data.value),
        description: getIndexDescription(index)
      })),
      recommendations
    };
  };

  const handleGenerateReport = async () => {
    if (!indexData || Object.keys(indexData).length === 0) return;
    
    setGeneratingReport(true);
    
    try {
      // Capture map first
      const capturedMap = await captureMap();
      setMapImage(capturedMap);
      
      // Generate report data
      const report = generateReportData();
      setReportData(report);
    } catch (error) {
      console.error("Report generation failed:", error);
      alert("Failed to generate report. Please try again.");
    } finally {
      setGeneratingReport(false);
    }
  };

  return (
    <Card className="mt-4 shadow-sm">
      <Card.Header className="bg-success text-white">
        <h5 className="mb-0">Land Analysis Report</h5>
      </Card.Header>
      <Card.Body>
        {reportData ? (
          <div className="text-center">
            <PDFDownloadLink
              document={<LandAnalysisReport data={reportData} mapImage={mapImage} />}
              fileName="land-analysis-report.pdf"
              className="btn btn-primary"
            >
              {({ loading }) => (
                loading ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Preparing PDF...
                  </>
                ) : (
                  <>
                    <i className="bi bi-file-pdf me-2"></i>
                    Download Report
                  </>
                )
              )}
            </PDFDownloadLink>
            <Button 
              variant="outline-secondary" 
              className="ms-3"
              onClick={() => setReportData(null)}
            >
              New Report
            </Button>
          </div>
        ) : (
          <>
            <p className="text-muted mb-4">
              Generate a comprehensive PDF report with analysis results and map.
            </p>
            <div className="text-center">
              <Button
                variant="success"
                onClick={handleGenerateReport}
                disabled={generatingReport || !indexData || Object.keys(indexData).length === 0}
              >
                {generatingReport ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Generating...
                  </>
                ) : (
                  <>
                    <i className="bi bi-file-earmark-text me-2"></i>
                    Generate Report
                  </>
                )}
              </Button>
            </div>
          </>
        )}
        
        {(!indexData || Object.keys(indexData).length === 0) && (
          <Alert variant="warning" className="mt-3">
            No analysis data available. Please analyze an area first.
          </Alert>
        )}
      </Card.Body>
    </Card>
  );
};

export default LandReportGenerator;