import React, { useState, useEffect } from 'react';

const CropHeatGraph = ({ indexData, dateRange, crops }) => {
  const [selectedIndex, setSelectedIndex] = useState('ndvi');
  const [heatmapData, setHeatmapData] = useState([]);
  
  const indices = [
    { value: 'ndvi', label: 'NDVI' },
    { value: 'evi', label: 'EVI' },
    { value: 'savi', label: 'SAVI' },
    { value: 'gndvi', label: 'GNDVI' },
    { value: 'ndwi', label: 'NDWI' },
    { value: 'gci', label: 'GCI' },
    { value: 'nbr', label: 'NBR' },
    { value: 'ndmi', label: 'NDMI' },
    { value: 'ndsi', label: 'NDSI' },
    { value: 'rvi', label: 'RVI' }
  ];

  useEffect(() => {
    const generateData = () => {
      const dates = [];
      const start = new Date(dateRange.startDate);
      const end = new Date(dateRange.endDate);
      const dayDiff = Math.floor((end - start) / (1000 * 60 * 60 * 24));
      
      const interval = Math.max(1, Math.floor(dayDiff / 10));
      let currentDate = new Date(start);
      
      while (currentDate <= end) {
        dates.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + interval);
      }

      return crops.map(crop => {
        const baseValue = {
          'wheat': 0.65, 'corn': 0.7, 'rice': 0.6, 'soybean': 0.55, 'barley': 0.63
        }[crop] || 0.5;
        
        return {
          crop,
          values: dates.map(date => {
            const dayOfYear = Math.floor((date - new Date(date.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
            const seasonalFactor = Math.sin((dayOfYear / 365) * Math.PI) * 0.2;
            const randomFactor = (Math.random() - 0.5) * 0.1;
            
            const data = {};
            indices.forEach(index => {
              let multiplier = 1;
              if (index.value === 'ndwi') multiplier = 0.8;
              if (index.value === 'gci') multiplier = 1.2;
              
              data[index.value] = Math.min(1, Math.max(-1, 
                (indexData[index.value] || baseValue) + seasonalFactor + randomFactor * multiplier
              ));
            });
            
            return {
              date: date.toISOString().split('T')[0],
              ...data
            };
          })
        };
      });
    };
    
    setHeatmapData(generateData());
  }, [dateRange, crops, indexData]);

  const getColor = (value) => {
    const normalizedValue = (value + 1) / 2;
    
    if (normalizedValue > 0.8) return '#d73027';
    if (normalizedValue > 0.6) return '#fc8d59';
    if (normalizedValue > 0.4) return '#fee090';
    if (normalizedValue > 0.2) return '#e0f3f8';
    return '#4575b4';
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-lg">
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Vegetation Index:
        </label>
        <select 
          value={selectedIndex} 
          onChange={(e) => setSelectedIndex(e.target.value)}
          className="block w-full rounded-md border-gray-300 shadow-sm p-2 border"
        >
          {indices.map(index => (
            <option key={index.value} value={index.value}>
              {index.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-6 overflow-x-auto">
        <div className="relative">
          <div className="mb-2 flex items-center">
            <span className="text-xs mr-2">-1</span>
            <div className="flex h-4 flex-grow">
              <div style={{ background: '#4575b4', width: '20%' }}></div>
              <div style={{ background: '#e0f3f8', width: '20%' }}></div>
              <div style={{ background: '#fee090', width: '20%' }}></div>
              <div style={{ background: '#fc8d59', width: '20%' }}></div>
              <div style={{ background: '#d73027', width: '20%' }}></div>
            </div>
            <span className="text-xs ml-2">+1</span>
          </div>

          <div className="flex">
            <div className="flex flex-col justify-around pr-2 font-medium text-right min-w-16">
              <div className="h-8"></div>
              {heatmapData.map((cropData, index) => (
                <div key={index} className="h-12 flex items-center justify-end capitalize">
                  {cropData.crop}
                </div>
              ))}
            </div>

            <div className="flex-grow">
              {heatmapData.length > 0 && (
                <div className="flex flex-col">
                  <div className="flex h-8">
                    <div className="w-12"></div>
                    {heatmapData[0].values.map((dateData, dateIndex) => (
                      <div key={dateIndex} className="w-12 text-xs transform -rotate-45 origin-left">
                        {formatDate(dateData.date)}
                      </div>
                    ))}
                  </div>

                  {heatmapData.map((cropData, cropIndex) => (
                    <div key={cropIndex} className="flex">
                      {cropData.values.map((dateData, dateIndex) => (
                        <div 
                          key={dateIndex}
                          className="w-12 h-12 border border-gray-100 relative group"
                          style={{ backgroundColor: getColor(dateData[selectedIndex]) }}
                        >
                          <div className="opacity-0 group-hover:opacity-100 absolute bottom-full left-1/2 transform -translate-x-1/2 bg-black text-white p-2 rounded text-xs whitespace-nowrap z-10">
                            <strong>{cropData.crop}</strong> on {dateData.date}<br/>
                            {selectedIndex.toUpperCase()}: {dateData[selectedIndex].toFixed(2)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CropHeatGraph;