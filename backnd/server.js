const express = require("express");
const cors = require("cors");
require("dotenv").config();
const geeRoutes = require("./routes/geeRoutes");
const yieldAnalysisRoutes = require("./routes/YieldAnalysisRoute"); 
// const { initializeGEE } = require("./services/geeService");
const { initializeGEE, getLayerURL } = require("./services/geeService");
const mongoose = require("mongoose");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const predictRoute = require('./routes/predictYield');
const environmentAnalysisRoutes = require('./routes/environmentAnalysis');


const app = express(); // ✅ Define Express app before importing shpjs
app.use(cors());
app.use(express.json());

// Configure Multer storage and file filtering
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "upload/"); // Directory where files will be stored
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}_${file.originalname}`); // Filename with timestamp
    }
});

const fileFilter = (req, file, cb) => {
    // Only allow shapefiles (e.g., .shp, .shx, .dbf files)
    if (file.mimetype === "application/x-zip-compressed" || file.originalname.endsWith(".shp")) {
        cb(null, true); // Accept the file
    } else {
        cb(new Error("Only shapefiles are allowed!"), false); // Reject if not a shapefile
    }
};

// Initialize multer upload
const upload = multer({ storage, fileFilter });

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.error("❌ MongoDB Connection Error:", err));

// Routes
app.use("/auth", require("./routes/auth"));
app.use('/api/predict-yield', predictRoute);
app.use('/api/environment-yield', environmentAnalysisRoutes);

// Start the server after initializing Google Earth Engine (GEE)
async function startServer() {
    try {
        const shp = await import("shpjs"); // ✅ Import inside async function

        await initializeGEE(); // Ensure GEE initialization before starting server
        console.log("✅ Google Earth Engine initialized successfully!");

        app.use("/gee", geeRoutes); // ✅ Register routes AFTER initialization
        app.post("/yield-estimation", getLayerURL);
        app.use("/api", yieldAnalysisRoutes);

        // Shapefile Upload Route
        app.post("/upload-shapefile", upload.single("shapefile"), async (req, res) => {
            if (!req.file) {
                return res.status(400).json({ error: "No file uploaded" });
            }

            const shapefilePath = path.join(__dirname, req.file.path);

            try {
                console.log("Uploaded file:", req.file);

                const isZipFile = path.extname(req.file.originalname).toLowerCase() === ".zip";

                if (isZipFile) {
                    const fileBuffer = fs.readFileSync(shapefilePath);
                    const geojson = await shp.parseZip(fileBuffer);

                    console.log("GeoJSON parsed successfully:", geojson);
                    fs.unlinkSync(shapefilePath);

                    res.json({
                        message: "Shapefile uploaded and processed successfully",
                        geojson: geojson,
                    });
                } else {
                    res.status(400).json({ error: "Uploaded file is not a ZIP shapefile" });
                }
            } catch (error) {
                console.error("Error parsing shapefile:", error.message);
                res.status(500).json({ error: `Failed to parse shapefile: ${error.message}` });
            }
        });

        const PORT = process.env.PORT || 4000;
        app.listen(PORT, () => {
            console.log(`🚀 Server running on http://localhost:${PORT}`);
        });

    } catch (error) {
        console.error("❌ Failed to initialize Google Earth Engine:", error);
        process.exit(1);
    }
}

startServer(); // Start the server
