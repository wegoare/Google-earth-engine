import React, { lazy, Suspense } from "react";

// Lazy load the MapView component
const MapView = lazy(() => import("../components/MapView"));

const Home = () => {
    return (
        <div>
            <h1 className="text-center my-4">Welcome to the Vegetation Index Map</h1>

            {/* Suspense ensures the component loads properly */}
            <Suspense fallback={<div>Loading Map...</div>}>
                <MapView />
            </Suspense>
        </div>
    );
};

export default Home;
