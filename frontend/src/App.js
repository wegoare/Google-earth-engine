// import React from "react";
// import Home from "./pages/home";
// import Navbar from "./components/navbar";

// function App() {
//   return (
//     <div>
//     <Navbar/>
//       <Home/>
//     </div>
//   );
// }

// export default App;
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/navbar";
import Home from "./pages/home";
import Map from "./components/MapView";
import YieldAnalysis from "./components/YieldAnalysis";
import ShapefileAnalyzer from "./components/ShapefileAnalyzer"; // Corrected import
import Login from "./pages/auth/signin";
import Signup from "./pages/auth/signup";
import YieldPredictor from './components/YieldPredictor';
import LandClassification from "./components/LandClassification";
import EnvironmentalYield from './components/EnvironmentalYield';

function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/home" element={<Home />} />
        <Route path="/map" element={<Map />} />
        <Route path="/shapefile-analyzer" element={<ShapefileAnalyzer />} />
        <Route path="/yield-analysis" element={<YieldAnalysis />} />
        <Route path="/signin" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/predict-yield" element={<YieldPredictor />} />
        <Route path="/land-classification" element={<LandClassification />} />
        <Route path="/environment-yield" element={<EnvironmentalYield />} />
      </Routes>
    </>
  );
}

export default App;

