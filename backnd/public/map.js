const map = L.map('map').setView([27.1751, 78.0421], 10);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

function fetchData() {
    const lat = document.getElementById("latitude").value;
    const lon = document.getElementById("longitude").value;

    fetch("http://localhost:5000/gee/map", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat: lat, lon: lon })
    })
    .then(response => response.json())
    .then(data => {
        const ndviLayer = L.tileLayer(data.layers.NDVI, { attribution: "NDVI Layer" });
        const saviLayer = L.tileLayer(data.layers.SAVI, { attribution: "SAVI Layer" });
        const eviLayer = L.tileLayer(data.layers.EVI, { attribution: "EVI Layer" });

        const baseMaps = {
            "NDVI": ndviLayer,
            "SAVI": saviLayer,
            "EVI": eviLayer
        };

        L.control.layers(baseMaps).addTo(map);
        ndviLayer.addTo(map);
    })
    .catch(error => console.error("Error loading map layers:", error));
}
