
let crimeData = {}; // Store crime data globally
let currentCity = 'london'; // Default city

// City configurations
const cityConfigs = {
  london: {
    center: { lat: 51.509865, lng: -0.118092 },
    zoom: 10,
    dataFile: 'london_crime_data.json',
    geoFile: 'boroughs_crime_score.geojson',
    nameProperty: 'LAD22NM',
    areaType: 'wards',
    areaTypeLabel: 'Ward'
  },
  nyc: {
    center: { lat: 40.7831, lng: -73.9712 },
    zoom: 10,
    dataFile: 'nyc_detailed_crime_data.json',
    geoFile: 'nyc_boroughs_crime_score.geojson',
    nameProperty: 'name',
    areaType: 'precincts',
    areaTypeLabel: 'Precinct'
  }
};

function initMap() {
  // Create city selector on first load
  if (!document.getElementById('city-selector')) {
    createCitySelector();
  }
  
  const config = cityConfigs[currentCity];
  
  // Clear any existing map instance
  if (map && map.data) {
    map.data.forEach(feature => {
      map.data.remove(feature);
    });
  }
  
  map = new google.maps.Map(document.getElementById('map'), {
    center: config.center,
    zoom: config.zoom,
    // Enhanced professional map styling
    styles: [
      {
        "featureType": "all",
        "elementType": "labels",
        "stylers": [
          { "visibility": "on" },
          { "color": "#2c3e50" },
          { "weight": 0.8 }
        ]
      },
      {
        "featureType": "administrative",
        "elementType": "geometry",
        "stylers": [
          { "visibility": "off" }
        ]
      },
      {
        "featureType": "landscape",
        "elementType": "all",
        "stylers": [
          { "color": "#f8f9fa" },
          { "lightness": 20 }
        ]
      },
      {
        "featureType": "poi",
        "elementType": "all",
        "stylers": [
          { "visibility": "simplified" },
          { "color": "#e9ecef" },
          { "lightness": 40 }
        ]
      },
      {
        "featureType": "poi.park",
        "elementType": "all",
        "stylers": [
          { "color": "#a8d5a8" },
          { "visibility": "on" }
        ]
      },
      {
        "featureType": "road",
        "elementType": "all",
        "stylers": [
          { "saturation": -100 },
          { "lightness": 45 },
          { "visibility": "simplified" }
        ]
      },
      {
        "featureType": "road.highway",
        "elementType": "all",
        "stylers": [
          { "visibility": "simplified" },
          { "color": "#ffffff" },
          { "weight": 1.2 }
        ]
      },
      {
        "featureType": "road.arterial",
        "elementType": "labels.icon",
        "stylers": [
          { "visibility": "off" }
        ]
      },
      {
        "featureType": "transit",
        "elementType": "all",
        "stylers": [
          { "visibility": "simplified" },
          { "color": "#dee2e6" }
        ]
      },
      {
        "featureType": "water",
        "elementType": "all",
        "stylers": [
          { "color": "#4a90e2" },
          { "visibility": "on" },
          { "lightness": 30 }
        ]
      }
    ],
    // Remove default UI for cleaner look
    disableDefaultUI: true,
    zoomControl: true,
    zoomControlOptions: {
      position: google.maps.ControlPosition.RIGHT_BOTTOM,
      style: google.maps.ZoomControlStyle.SMALL
    },
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: true,
    fullscreenControlOptions: {
      position: google.maps.ControlPosition.RIGHT_TOP
    }
  });

  // Enhanced info window with custom styling
  const infow = new google.maps.InfoWindow({
    maxWidth: 300,
    pixelOffset: new google.maps.Size(0, -10)
  });

  // 1. Load crime data first
  fetch(config.dataFile)
    .then(r => r.json())
    .then(data => {
      // Create lookup object for borough data
      data.boroughs.forEach(borough => {
        crimeData[borough.name.toUpperCase()] = borough;
      });
      
      // Make crime data globally accessible for colorblind module
      window.crimeData = crimeData;

      // 2. Then load and display the GeoJSON
      return fetch(config.geoFile);
    })
    .then(r => r.json())
    .then(geoData => {
      map.data.addGeoJson(geoData);

      // Use dynamic color palette that can be updated
      let currentPalette = [
        '#1a5f1a', '#2d7a2d', '#4a9d4a', '#6bb86b', '#8dd08d',   // Darker to lighter greens (1-5)
        '#ffd633', '#ffb84d', '#ff9966', '#ff6b7f', '#ff4757'    // Yellow to red (6-10)
      ];

      // Store the map style function for updates
      const updateMapStyle = (palette) => {
        map.data.setStyle(feature => {
          // Handle different score property names
          const score = feature.getProperty('Score') || feature.getProperty('safety_score');
          const colour = palette[score - 1] || '#dee2e6';

          return {
            fillColor: colour,
            fillOpacity: 0.7,
            strokeColor: '#ffffff',
            strokeOpacity: 1,
            strokeWeight: 2
          };
        });
      };

      // Initial map styling
      updateMapStyle(currentPalette);

      // Make the update function globally accessible for colorblind toggle
      window.updateMapColorsFromToggle = (newPalette) => {
        updateMapStyle(newPalette);
      };

      // Initialize colorblind accessibility AFTER map is loaded
      setTimeout(() => {
        if (window.ColorblindAccessibility) {
          window.ColorblindAccessibility.initialize(map);
        }
      }, 100);

      // Enhanced hover effects
      map.data.addListener('mouseover', e => {
        const boroughName = e.feature.getProperty(config.nameProperty);
        const score = e.feature.getProperty('Score') || e.feature.getProperty('safety_score');
        const boroughData = crimeData[boroughName.toUpperCase()];
        
        // Highlight on hover
        map.data.overrideStyle(e.feature, {
          strokeWeight: 3,
          strokeColor: '#2c3e50',
          fillOpacity: 0.85
        });

        // Enhanced info window content
        const safetyLevel = getSafetyLevel(score);
        let totalCrimes = boroughData ? boroughData.totalCrimes : 'N/A';
        
        // For NYC, get crime data from GeoJSON properties if not in JSON
        if (totalCrimes === 'N/A' && currentCity === 'nyc') {
          totalCrimes = e.feature.getProperty('total_crimes') || 'N/A';
        }
        
        const safetyColor = getSafetyColor(score);
        
        infow.setContent(`
          <div style="
            padding: 16px; 
            font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif;
            min-width: 200px;
            background: linear-gradient(135deg, ${safetyColor} 0%, ${safetyColor}CC 100%);
            color: white;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            letter-spacing: -0.01em;
          ">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <h3 style="margin: 0; font-size: 18px; font-weight: 500; letter-spacing: -0.02em;">${boroughName}</h3>
              <div style="
                background: rgba(255,255,255,0.2); 
                padding: 4px 12px; 
                border-radius: 20px; 
                font-size: 14px; 
                font-weight: 600;
                border: 1px solid rgba(255,255,255,0.3);
                letter-spacing: 0;
              ">${score}/10</div>
            </div>
            <div style="margin-bottom: 8px;">
              <span style="font-size: 14px; opacity: 0.9; font-weight: 400;">Safety Level: </span>
              <span style="font-weight: 500; font-size: 14px;">${safetyLevel}</span>
            </div>
            <div>
              <span style="font-size: 14px; opacity: 0.9; font-weight: 400;">Total Crimes: </span>
              <span style="font-weight: 500; font-size: 14px;">${typeof totalCrimes === 'number' ? totalCrimes.toLocaleString() : totalCrimes}</span>
            </div>
            <div style="margin-top: 12px; font-size: 12px; opacity: 0.8; text-align: center; font-weight: 400;">
              Click for detailed breakdown
            </div>
          </div>
        `);
        infow.setPosition(e.latLng);
        infow.open(map);
      });

      map.data.addListener('mouseout', e => {
        // Reset styling
        map.data.revertStyle(e.feature);
        infow.close();
      });

      // Add click handler for dashboard
      map.data.addListener('click', e => {
        const boroughName = e.feature.getProperty(config.nameProperty);
        let boroughData = crimeData[boroughName.toUpperCase()];
        
        // For NYC, if no crime data found in JSON, use GeoJSON properties
        if (!boroughData && currentCity === 'nyc') {
          boroughData = {
            name: boroughName,
            total_crimes: e.feature.getProperty('total_crimes'),
            safety_score: e.feature.getProperty('safety_score'),
            safety_level: e.feature.getProperty('safety_level'),
            crime_breakdown: e.feature.getProperty('crime_breakdown')
          };
        }
        
        if (boroughData) {
          showDashboard(boroughData);
        }
      });

      // Add loading indicator removal
      hideLoadingIndicator();
      
      // Initialize search functionality
      initializeSearch();
      
      // Rebuild search index after data is loaded
      buildSearchIndex();
    })
    .catch(error => {
      console.error('Error loading data:', error);
      showErrorMessage('Failed to load crime data. Please try again later.');
    });
}



// Helper function to determine safety level
function getSafetyLevel(score) {   //ll
  if (score <= 3) return 'Very Safe';
  if (score <= 5) return 'Safe';
  if (score <= 7) return 'Moderate';
  if (score <= 8) return 'Caution';
  return 'High Risk';
}

// Replace your existing createLegend function with this:
function createLegend(map) {
  const legend = document.createElement('div');
  legend.id = 'map-legend';
  
  // Start with standard colors - the colorblind module will update this later
  updateLegendColors(legend, false);
  
  map.controls[google.maps.ControlPosition.LEFT_BOTTOM].push(legend);
}

// Add this new helper function
function updateLegendColors(legend, isColorblindMode) {
  const palette = isColorblindMode ? 
    ['#08306b', '#08519c', '#2171b5', '#4292c6', '#6baed6', '#fd8d3c', '#f16913', '#d94801', '#a63603', '#7f2704'] :
    ['#1a5f1a', '#2d7a2d', '#4a9d4a', '#6bb86b', '#8dd08d', '#ffd633', '#ffb84d', '#ff9966', '#ff6b7f', '#ff4757'];
  
  const modeText = isColorblindMode ? 'Colorblind Friendly' : 'Standard';
  
  legend.innerHTML = `
    <div style="
      background: rgba(255, 255, 255, 0.95);
      padding: 20px;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255,255,255,0.2);
    ">
      <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 500; color: #2c3e50; letter-spacing: -0.01em;">Crime Safety Index</h3>
      <p style="margin: 0 0 16px 0; font-size: 11px; color: #64748b; font-style: italic;">${modeText} Mode</p>
      <div style="display: flex; flex-direction: column; gap: 8px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="width: 20px; height: 12px; background: ${palette[0]}; border-radius: 2px;"></div>
          <span style="font-size: 12px; color: #2c3e50; font-weight: 400;">1-2 Very Safe</span>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="width: 20px; height: 12px; background: ${palette[2]}; border-radius: 2px;"></div>
          <span style="font-size: 12px; color: #2c3e50; font-weight: 400;">3-4 Safe</span>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="width: 20px; height: 12px; background: ${palette[4]}; border-radius: 2px;"></div>
          <span style="font-size: 12px; color: #2c3e50; font-weight: 400;">5 Moderate</span>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="width: 20px; height: 12px; background: ${palette[6]}; border-radius: 2px;"></div>
          <span style="font-size: 12px; color: #2c3e50; font-weight: 400;">6-7 Caution</span>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="width: 20px; height: 12px; background: ${palette[8]}; border-radius: 2px;"></div>
          <span style="font-size: 12px; color: #2c3e50; font-weight: 400;">8-9 High Risk</span>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="width: 20px; height: 12px; background: ${palette[9]}; border-radius: 2px;"></div>
          <span style="font-size: 12px; color: #2c3e50; font-weight: 400;">10 Very High Risk</span>
        </div>
      </div>
    </div>
  `;
}



// Enhanced dashboard with modern design
function showDashboard(boroughData) {
  const dashboard = document.getElementById('dashboard') || createDashboard();
  
  // Handle different data structures for London vs NYC
  const totalCrimes = boroughData.totalCrimes || boroughData.total_crimes;
  const score = boroughData.score || boroughData.safety_score;
  const safetyLevel = boroughData.safety_level || getSafetyLevel(score);
  const safetyColor = getSafetyColor(score);
  
  // Set CSS custom properties for the header color
  document.documentElement.style.setProperty('--header-color', safetyColor);
  document.documentElement.style.setProperty('--header-color-light', safetyColor + 'CC');
  
  dashboard.innerHTML = `
    <div class="dashboard-container">
      <div class="dashboard-header">
        <div>
          <h2>${boroughData.name}</h2>
          <p class="safety-level" style="color: ${safetyColor};">${safetyLevel}</p>
        </div>
        <button onclick="closeDashboard()" class="close-btn">×</button>
      </div>
      
      <div class="score-section" style="background: linear-gradient(135deg, ${safetyColor}22 0%, ${safetyColor}44 100%);">
        <div class="score-circle" style="border-color: ${safetyColor}; background: ${safetyColor}22;">
          <div class="score-number" style="color: ${safetyColor};">${score}</div>
          <div class="score-label">Crime Score</div>
        </div>
        <div class="total-crimes">
          <div class="crimes-number">${totalCrimes.toLocaleString()}</div>
          <div class="crimes-label">Total Crimes Reported</div>
        </div>
      </div>
      
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">${boroughData[cityConfigs[currentCity].areaType] ? boroughData[cityConfigs[currentCity].areaType].length : 0}</div>
          <div class="stat-label">${cityConfigs[currentCity].areaTypeLabel}s</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${boroughData[cityConfigs[currentCity].areaType] ? Math.round(totalCrimes / boroughData[cityConfigs[currentCity].areaType].length) : 0}</div>
          <div class="stat-label">Avg per ${cityConfigs[currentCity].areaTypeLabel}</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${getTopCrimeType(boroughData)}</div>
          <div class="stat-label">Top Crime Type</div>
        </div>
      </div>
      
      <div class="wards-section">
        <h3>${cityConfigs[currentCity].areaTypeLabel} Breakdown</h3>
        <div class="wards-container">
          ${(boroughData[cityConfigs[currentCity].areaType] || []).slice(0, 10).map(area => {
            const crimeEntries = Object.entries(area.crimeTypes || {});
            const topCrimes = crimeEntries
              .sort((a, b) => b[1] - a[1])
              .slice(0, 3);
            
            return `
              <div class="ward-card">
                <div class="ward-header">
                  <h4>${area.name}</h4>
                  <span class="ward-total">${area.totalCrimes}</span>
                </div>
                <div class="crime-bars">
                  ${topCrimes.map(([type, count]) => {
                    const percentage = Math.round((count / area.totalCrimes) * 100);
                    return `
                      <div class="crime-item">
                        <div class="crime-info">
                          <span class="crime-type">${formatCrimeType(type)}</span>
                          <span class="crime-count">${count} (${percentage}%)</span>
                        </div>
                        <div class="progress-bar">
                          <div class="progress-fill" style="width: ${percentage}%; background: ${getCrimeTypeColor(type)}"></div>
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `;
  
  dashboard.style.display = 'block';
  
  // Add animation
  setTimeout(() => {
    dashboard.style.transform = 'translateX(0)';
    dashboard.style.opacity = '1';
  }, 10);
}

// Helper functions
function getSafetyColor(score) {
  // Check if colorblind mode is active and use appropriate palette
  const isColorblindMode = window.ColorblindAccessibility && window.ColorblindAccessibility.isColorblindModeActive();
  
  if (isColorblindMode) {
    // Colorblind-friendly blue-orange palette
    if (score <= 3) return '#08306b'; // Dark blue
    if (score <= 5) return '#2171b5'; // Medium blue
    if (score <= 7) return '#fd8d3c'; // Light orange
    if (score <= 8) return '#d94801'; // Medium orange
    return '#7f2704'; // Dark orange
  } else {
    // Standard green-red palette
    if (score <= 3) return '#1a5f1a';
    if (score <= 5) return '#4a9d4a';
    if (score <= 7) return '#ffd633';
    if (score <= 8) return '#ff9966';
    return '#ff4757';
  }
}

function getTopCrimeType(boroughData) {
  let allCrimes = {};
  
  // Handle different data structures
  if (currentCity === 'nyc' && boroughData.crime_breakdown) {
    // For NYC, use crime_breakdown directly from GeoJSON
    allCrimes = boroughData.crime_breakdown;
  } else {
    // For London, aggregate from areas
    const areas = boroughData[cityConfigs[currentCity].areaType] || [];
    areas.forEach(area => {
      Object.entries(area.crimeTypes || {}).forEach(([type, count]) => {
        allCrimes[type] = (allCrimes[type] || 0) + count;
      });
    });
  }
  
  const topCrime = Object.entries(allCrimes).sort((a, b) => b[1] - a[1])[0];
  return topCrime ? formatCrimeType(topCrime[0]) : 'N/A';
}

function getCrimeBreakdownHTML(boroughData, totalCrimes) {
  let crimeData = {};
  
  // Handle different data structures
  if (currentCity === 'nyc' && boroughData.crime_breakdown) {
    crimeData = boroughData.crime_breakdown;
  } else {
    // For London, aggregate from areas
    const areas = boroughData[cityConfigs[currentCity].areaType] || [];
    areas.forEach(area => {
      Object.entries(area.crimeTypes || {}).forEach(([type, count]) => {
        crimeData[type] = (crimeData[type] || 0) + count;
      });
    });
  }
  
  return Object.entries(crimeData)
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => {
      const percentage = Math.round((count / totalCrimes) * 100);
      return `
        <div class="ward-card">
          <div class="ward-header">
            <span class="ward-name">${formatCrimeType(type)}</span>
            <span class="ward-total">${count.toLocaleString()}</span>
          </div>
          <div class="crime-bars">
            <div class="crime-bar">
              <span class="crime-type">${percentage}% of total crimes</span>
              <div class="crime-bar-container">
                <div class="crime-bar-fill" style="width: ${percentage}%"></div>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
}

function formatCrimeType(type) {
  // Handle common crime type patterns
  const crimeTypeMap = {
    'VIOLENCEAGAINSTTHEPERSON': 'Violence Against Person',
    'VEHICLEOFFENCES': 'Vehicle Offences',
    'VEHICLE OFFENCES': 'Vehicle Offences',
    'BURGLARY': 'Burglary',
    'THEFT': 'Theft',
    'ROBBERY': 'Robbery',
    'DRUGOFFENCES': 'Drug Offences',
    'DRUG OFFENCES': 'Drug Offences',
    'PUBLICORDEROFFENCES': 'Public Order',
    'PUBLIC ORDER': 'Public Order',
    'CRIMINALOFFENCES': 'Criminal Offences',
    'CRIMINAL DAMAGE': 'Criminal Damage',
    'FRAUD': 'Fraud',
    'SEXUALOFFENCES': 'Sexual Offences',
    'SEXUAL OFFENCES': 'Sexual Offences',
    'ASSAULT': 'Assault',
    'WEAPONS OFFENCES': 'Weapons Offences',
    'HARASSMENT': 'Harassment',
    'TRESPASSING': 'Trespassing',
    'HOMICIDE': 'Homicide',
    'ARSON': 'Arson',
    'KIDNAPPING': 'Kidnapping',
    'GAMBLING': 'Gambling',
    'ALCOHOL OFFENCES': 'Alcohol Offences',
    'REGULATORY VIOLATIONS': 'Regulatory Violations',
    'CUSTODY OFFENCES': 'Custody Offences',
    'MISCELLANEOUS': 'Miscellaneous',
    'OTHER': 'Other'
  };
  
  const upperType = type.toUpperCase().replace(/\s+/g, '');
  return crimeTypeMap[upperType] || crimeTypeMap[type.toUpperCase()] || type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
}


function getCrimeTypeColor(type) {
  // Check if colorblind mode is active
  const isColorblindMode = window.ColorblindAccessibility && window.ColorblindAccessibility.isColorblindModeActive();
  
  if (isColorblindMode) {
    // Colorblind-friendly colors using blue-orange spectrum
    const colors = {
      'violence': '#7f2704', // Dark orange (most serious)
      'assault': '#7f2704',  // Dark orange (most serious)
      'homicide': '#7f2704', // Dark orange (most serious)
      'kidnapping': '#7f2704', // Dark orange (most serious)
      'weapons': '#a63603',  // Dark orange
      'sexual': '#a63603',   // Dark orange
      'robbery': '#a63603',  // Dark orange
      'arson': '#d94801',    // Medium orange
      'burglary': '#d94801', // Medium orange
      'theft': '#fd8d3c',    // Light orange
      'vehicle': '#fd8d3c',  // Light orange
      'criminal': '#fd8d3c', // Light orange
      'drugs': '#2171b5',    // Medium blue
      'drug': '#2171b5',     // Medium blue
      'fraud': '#4292c6',    // Light blue
      'gambling': '#4292c6', // Light blue
      'alcohol': '#4292c6',  // Light blue
      'harassment': '#6baed6', // Very light blue
      'trespassing': '#6baed6', // Very light blue
      'public': '#6baed6',   // Very light blue
      'regulatory': '#08519c', // Dark blue
      'custody': '#08519c',  // Dark blue
      'miscellaneous': '#08306b', // Very dark blue
      'other': '#08306b'     // Very dark blue
    };
    
    const lowerType = type.toLowerCase();
    for (const [key, color] of Object.entries(colors)) {
      if (lowerType.includes(key)) return color;
    }
    return '#2171b5'; // Default blue
  } else {
    // Standard colors
    const colors = {
      'violence': '#ff4757',
      'assault': '#ff4757',
      'homicide': '#8b0000',    // Dark red (most serious)
      'kidnapping': '#8b0000',  // Dark red (most serious)
      'weapons': '#ff3838',
      'sexual': '#e74c3c',
      'robbery': '#ff3838',
      'arson': '#ff6348',
      'burglary': '#ff6348',
      'theft': '#ffa502',
      'vehicle': '#ffa502',
      'criminal': '#e74c3c',
      'drugs': '#8e44ad',
      'drug': '#8e44ad',
      'fraud': '#f39c12',
      'gambling': '#f39c12',
      'alcohol': '#9b59b6',
      'harassment': '#3498db',
      'trespassing': '#3498db',
      'public': '#3498db',
      'regulatory': '#34495e',
      'custody': '#34495e',
      'miscellaneous': '#95a5a6',
      'other': '#95a5a6'
    };
    
    const lowerType = type.toLowerCase();
    for (const [key, color] of Object.entries(colors)) {
      if (lowerType.includes(key)) return color;
    }
    return '#3498db';
  }
}

function createDashboard() {
  const dashboard = document.createElement('div');
  dashboard.id = 'dashboard';
  dashboard.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    width: 450px;
    max-height: 85vh;
    z-index: 1000;
    display: none;
    font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif;
    transform: translateX(100%);
    opacity: 0;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  `;
  
  // Enhanced CSS styles
  if (!document.getElementById('dashboard-styles')) {
    const styles = document.createElement('style');
    styles.id = 'dashboard-styles';
    styles.textContent = `
      .dashboard-container {
        background: white;
        border-radius: 16px;
        box-shadow: 0 20px 40px rgba(0,0,0,0.1), 0 8px 16px rgba(0,0,0,0.06);
        overflow: hidden;
        border: 1px solid rgba(255,255,255,0.2);
        backdrop-filter: blur(20px);
      }
      
      .dashboard-header {
        background: linear-gradient(135deg, var(--header-color) 0%, var(--header-color-light) 100%);
        color: white;
        padding: 24px;
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
      }
      
      .dashboard-header h2 {
        margin: 0;
        font-size: 22px;
        font-weight: 500;
        letter-spacing: -0.02em;
      }
      
      .safety-level {
        margin: 4px 0 0 0;
        font-size: 14px;
        font-weight: 400;
        opacity: 0.9;
      }
      
      .close-btn {
        background: rgba(255,255,255,0.2);
        border: none;
        font-size: 20px;
        cursor: pointer;
        color: white;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
        backdrop-filter: blur(10px);
      }
      
      .close-btn:hover {
        background: rgba(255,255,255,0.3);
        transform: scale(1.1);
      }
      
      .score-section {
        padding: 24px;
        display: flex;
        gap: 24px;
        align-items: center;
        border-bottom: 1px solid #f1f5f9;
      }
      
      .score-circle {
        text-align: center;
        border-radius: 50%;
        width: 90px;
        height: 90px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        border: 3px solid;
        position: relative;
        overflow: hidden;
      }
      
      .score-number {
        font-size: 32px;
        font-weight: 600;
        line-height: 1;
        z-index: 1;
        letter-spacing: -0.02em;
      }
      
      .score-label {
        font-size: 11px;
        font-weight: 400;
        margin-top: 2px;
        color: #64748b;
        z-index: 1;
      }
      
      .total-crimes {
        flex: 1;
      }
      
      .crimes-number {
        font-size: 32px;
        font-weight: 600;
        line-height: 1;
        color: #1e293b;
        letter-spacing: -0.02em;
      }
      
      .crimes-label {
        font-size: 14px;
        color: #64748b;
        margin-top: 4px;
        font-weight: 400;
      }
      
      .stats-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 1px;
        background: #e2e8f0;
        margin: 0;
      }
      
      .stat-card {
        background: white;
        padding: 20px 16px;
        text-align: center;
        transition: all 0.2s ease;
      }
      
      .stat-card:hover {
        background: #f8fafc;
        transform: translateY(-1px);
      }
      
      .stat-value {
        font-size: 24px;
        font-weight: 500;
        color: #1e293b;
        line-height: 1;
        letter-spacing: -0.01em;
      }
      
      .stat-label {
        font-size: 12px;
        color: #64748b;
        margin-top: 4px;
        font-weight: 400;
      }
      
      .wards-section {
        padding: 24px;
      }
      
      .wards-section h3 {
        margin: 0 0 20px 0;
        font-size: 18px;
        font-weight: 500;
        color: #1e293b;
        letter-spacing: -0.01em;
      }
      
      .wards-container {
        max-height: 400px;
        overflow-y: auto;
        padding-right: 8px;
      }
      
      .wards-container::-webkit-scrollbar {
        width: 6px;
      }
      
      .wards-container::-webkit-scrollbar-track {
        background: #f1f5f9;
        border-radius: 3px;
      }
      
      .wards-container::-webkit-scrollbar-thumb {
        background: #cbd5e1;
        border-radius: 3px;
      }
      
      .wards-container::-webkit-scrollbar-thumb:hover {
        background: #94a3b8;
      }
      
      .ward-card {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        padding: 20px;
        margin-bottom: 16px;
        transition: all 0.2s ease;
        position: relative;
        overflow: hidden;
      }
      
      .ward-card::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 3px;
        background: linear-gradient(90deg, var(--header-color) 0%, var(--header-color-light) 100%);
        opacity: 0;
        transition: opacity 0.2s ease;
      }
      
      .ward-card:hover {
        background: white;
        border-color: #cbd5e1;
        transform: translateY(-2px);
        box-shadow: 0 8px 16px rgba(0,0,0,0.1);
      }
      
      .ward-card:hover::before {
        opacity: 1;
      }
      
      .ward-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
      }
      
      .ward-header h4 {
        margin: 0;
        font-size: 16px;
        font-weight: 500;
        color: #1e293b;
        letter-spacing: -0.01em;
      }
      
      .ward-total {
        background: linear-gradient(135deg, var(--header-color) 0%, var(--header-color-light) 100%);
        color: white;
        padding: 6px 12px;
        border-radius: 20px;
        font-size: 13px;
        font-weight: 500;
        box-shadow: 0 2px 4px rgba(135, 206, 235, 0.3);
      }
      
      .crime-bars {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      
      .crime-item {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      
      .crime-info {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .crime-type {
        font-size: 13px;
        color: #475569;
        font-weight: 400;
      }
      
      .crime-count {
        font-size: 13px;
        color: #1e293b;
        font-weight: 500;
      }
      
      .progress-bar {
        height: 8px;
        background: #e2e8f0;
        border-radius: 4px;
        overflow: hidden;
        position: relative;
      }
      
      .progress-fill {
        height: 100%;
        border-radius: 4px;
        transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
        overflow: hidden;
      }
      
      .progress-fill::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
        animation: shimmer 2s infinite;
      }
      
      @keyframes shimmer {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(100%); }
      }
      
      @media (max-width: 768px) {
        #dashboard {
          width: calc(100vw - 40px) !important;
          right: 20px !important;
          max-height: 80vh !important;
        }
      }
    `;
    document.head.appendChild(styles);
  }
  
  document.body.appendChild(dashboard);
  return dashboard;
}

function closeDashboard() {
  const dashboard = document.getElementById('dashboard');
  dashboard.style.transform = 'translateX(100%)';
  dashboard.style.opacity = '0';
  setTimeout(() => {
    dashboard.style.display = 'none';
  }, 300);
}

// Utility functions for loading states
function showLoadingIndicator() {
  // Add loading indicator to map
  const loading = document.createElement('div');
  loading.id = 'loading-indicator';
  loading.innerHTML = `
    <div style="
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(255, 255, 255, 0.95);
      padding: 20px;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      z-index: 1000;
      text-align: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    ">
      <div style="
        width: 40px;
        height: 40px;
        border: 3px solid #e2e8f0;
        border-top: 3px solid #667eea;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto 16px;
      "></div>
      <div style="color: #64748b; font-weight: 500;">Loading crime data...</div>
    </div>
  `;
  
  const mapElement = document.getElementById('map');
  if (mapElement) {
    mapElement.appendChild(loading);
  }
  
  // Add CSS for spinner animation
  if (!document.getElementById('loading-styles')) {
    const style = document.createElement('style');
    style.id = 'loading-styles';
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  }
}

function hideLoadingIndicator() {
  const loading = document.getElementById('loading-indicator');
  if (loading) {
    loading.remove();
  }
}

function showErrorMessage(message) {
  const error = document.createElement('div');
  error.innerHTML = `
    <div style="
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #fee2e2;
      color: #dc2626;
      padding: 16px 24px;
      border-radius: 8px;
      border: 1px solid #fecaca;
      box-shadow: 0 4px 12px rgba(220, 38, 38, 0.15);
      z-index: 2000;
      font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif;
      font-weight: 400;
    ">
      ⚠️ ${message}
    </div>
  `;
  
  document.body.appendChild(error);
  
  // Auto remove after 5 seconds
  setTimeout(() => {
    error.remove();
  }, 5000);
}

// Search functionality
function initializeSearch() {
  // Only create search box if it doesn't exist
  if (!document.getElementById('search-container')) {
    createSearchBox();
  } else {
    // Update placeholder for current city
    const searchInput = document.getElementById('borough-search');
    if (searchInput) {
      searchInput.placeholder = currentCity === 'london' ? 
        'Search boroughs or wards...' : 
        'Search boroughs, precincts, or numbers (e.g., 14, 75)...';
    }
  }
  buildSearchIndex();
}

function createSearchBox() {
  const searchContainer = document.createElement('div');
  searchContainer.id = 'search-container';
  searchContainer.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 1000;
    font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif;
  `;
  
  searchContainer.innerHTML = `
    <div style="
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(10px);
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      border: 1px solid rgba(255,255,255,0.2);
      overflow: hidden;
      width: 320px;
      transition: all 0.3s ease;
    ">
      <div style="
        display: flex;
        align-items: center;
        padding: 16px;
        gap: 12px;
      ">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
        </svg>
        <input 
          type="text" 
          id="borough-search" 
          placeholder="Search ${currentCity === 'london' ? 'boroughs or wards' : 'boroughs, precincts, or numbers (e.g., 14, 75)'}..."
          style="
            flex: 1;
            border: none;
            outline: none;
            font-size: 14px;
            color: #1e293b;
            background: transparent;
            font-family: inherit;
          "
        />
        <button 
          id="clear-search"
          style="
            background: none;
            border: none;
            cursor: pointer;
            padding: 4px;
            border-radius: 4px;
            display: none;
            color: #64748b;
            transition: all 0.2s ease;
          "
          onclick="clearSearch()"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div id="search-results" style="
        max-height: 300px;
        overflow-y: auto;
        border-top: 1px solid #e2e8f0;
        display: none;
      "></div>
    </div>
  `;
  
  document.body.appendChild(searchContainer);
  
  // Add event listeners
  const searchInput = document.getElementById('borough-search');
  const clearButton = document.getElementById('clear-search');
  
  searchInput.addEventListener('input', handleSearch);
  searchInput.addEventListener('focus', () => {
    if (searchInput.value.trim()) {
      document.getElementById('search-results').style.display = 'block';
    }
  });
  
  // Hide results when clicking outside
  document.addEventListener('click', (e) => {
    if (!searchContainer.contains(e.target)) {
      document.getElementById('search-results').style.display = 'none';
    }
  });
}

let searchIndex = [];

function buildSearchIndex() {
  searchIndex = [];
  const areaType = cityConfigs[currentCity].areaType;
  const areaLabel = cityConfigs[currentCity].areaTypeLabel;
  
  // Check if crimeData is populated
  if (!crimeData || Object.keys(crimeData).length === 0) {
    console.log('No crime data available for search index');
    return;
  }
  
  // Add boroughs to search index
  Object.entries(crimeData).forEach(([boroughName, boroughData]) => {
    if (!boroughData || !boroughData.name) return;
    
    searchIndex.push({
      type: 'borough',
      name: boroughData.name,
      searchName: boroughData.name.toLowerCase(),
      data: boroughData,
      score: boroughData.score || boroughData.safety_score || boroughData.totalCrimes || 0
    });
    
    // Add areas (wards/precincts) to search index
    if (boroughData[areaType] && Array.isArray(boroughData[areaType])) {
      boroughData[areaType].forEach(area => {
        if (!area || !area.name) return;
        
        // For NYC precincts, also add the precinct number as searchable
        let searchTerms = [area.name.toLowerCase()];
        
        if (currentCity === 'nyc' && area.name.includes('Precinct ')) {
          const precinctNum = area.name.replace('Precinct ', '');
          searchTerms.push(precinctNum); // Add just the number
          searchTerms.push(`pct ${precinctNum}`); // Add "pct XX" format
          searchTerms.push(`precinct ${precinctNum}`); // Add "precinct XX" format
        }
        
        searchIndex.push({
          type: areaLabel.toLowerCase(),
          name: area.name,
          searchName: area.name.toLowerCase(),
          searchTerms: searchTerms, // Additional search terms
          borough: boroughData.name,
          data: boroughData, // We'll show borough data for areas
          score: boroughData.score || boroughData.safety_score || boroughData.totalCrimes || 0,
          areaData: area
        });
      });
    }
  });
  
  console.log(`Search index built with ${searchIndex.length} items for ${currentCity}`);
}

function handleSearch(event) {
  const query = event.target.value.trim().toLowerCase();
  const clearButton = document.getElementById('clear-search');
  const resultsContainer = document.getElementById('search-results');
  
  if (query.length === 0) {
    resultsContainer.style.display = 'none';
    clearButton.style.display = 'none';
    return;
  }
  
  clearButton.style.display = 'block';
  
  // Filter search results
  const results = searchIndex
    .filter(item => {
      // Check main search name
      if (item.searchName.includes(query)) return true;
      
      // Check additional search terms for NYC precincts
      if (item.searchTerms) {
        return item.searchTerms.some(term => term.includes(query));
      }
      
      return false;
    })
    .sort((a, b) => {
      // Prioritize exact matches, then borough matches, then alphabetical
      const aExact = a.searchName.startsWith(query) || (a.searchTerms && a.searchTerms.some(term => term.startsWith(query))) ? 0 : 1;
      const bExact = b.searchName.startsWith(query) || (b.searchTerms && b.searchTerms.some(term => term.startsWith(query))) ? 0 : 1;
      if (aExact !== bExact) return aExact - bExact;
      
      const aType = a.type === 'borough' ? 0 : 1;
      const bType = b.type === 'borough' ? 0 : 1;
      if (aType !== bType) return aType - bType;
      
      return a.name.localeCompare(b.name);
    })
    .slice(0, 8); // Limit to 8 results
  
  if (results.length === 0) {
    resultsContainer.innerHTML = `
      <div style="
        padding: 16px;
        text-align: center;
        color: #64748b;
        font-size: 14px;
      ">
        No results found for "${event.target.value}"
      </div>
    `;
  } else {
    resultsContainer.innerHTML = results.map(result => {
      const safetyLevel = getSafetyLevel(result.score);
      const safetyColor = getSafetyColor(result.score);
      
      return `
        <div 
          class="search-result-item"
          onclick="selectSearchResult('${result.data.name}', '${result.type}', '${result.name}')"
          style="
            padding: 12px 16px;
            cursor: pointer;
            border-bottom: 1px solid #f1f5f9;
            transition: all 0.2s ease;
            display: flex;
            justify-content: space-between;
            align-items: center;
          "
          onmouseover="this.style.background='#f8fafc'"
          onmouseout="this.style.background='transparent'"
        >
          <div>
            <div style="
              font-size: 14px;
              font-weight: 500;
              color: #1e293b;
              margin-bottom: 2px;
            ">
              ${result.name}
            </div>
            <div style="
              font-size: 12px;
              color: #64748b;
            ">
              ${result.type === 'borough' ? 'Borough' : `${result.type.charAt(0).toUpperCase() + result.type.slice(1)} in ${result.borough}`} • ${safetyLevel}
            </div>
          </div>
          <div style="
            background: ${safetyColor};
            color: white;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 500;
            min-width: 32px;
            text-align: center;
          ">
            ${result.score}
          </div>
        </div>
      `;
    }).join('');
  }
  
  resultsContainer.style.display = 'block';
}

function selectSearchResult(boroughName, type, itemName) {
  const boroughData = crimeData[boroughName.toUpperCase()];
  
  if (boroughData) {
    showDashboard(boroughData);
    
    // Clear search
    clearSearch();
  } else {
    showErrorMessage('Borough data not found');
  }
}

function clearSearch() {
  const searchInput = document.getElementById('borough-search');
  const clearButton = document.getElementById('clear-search');
  const resultsContainer = document.getElementById('search-results');
  
  searchInput.value = '';
  clearButton.style.display = 'none';
  resultsContainer.style.display = 'none';
  searchInput.blur();
}

function showSuccessMessage(message) {
  const success = document.createElement('div');
  success.innerHTML = `
    <div style="
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #dcfce7;
      color: #166534;
      padding: 16px 24px;
      border-radius: 8px;
      border: 1px solid #bbf7d0;
      box-shadow: 0 4px 12px rgba(22, 101, 52, 0.15);
      z-index: 2000;
      font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif;
      font-weight: 400;
    ">
      ✅ ${message}
    </div>
  `;
  
  document.body.appendChild(success);
  
  // Auto remove after 3 seconds
  setTimeout(() => {
    success.remove();
  }, 3000);
}

// City switching functionality
function switchCity(cityKey) {
  currentCity = cityKey;
  const config = cityConfigs[cityKey];
  
  // Clear existing data and UI
  if (map) {
    map.data.forEach(feature => {
      map.data.remove(feature);
    });
  }
  
  // Clear search if it exists
  if (document.getElementById('borough-search')) {
    clearSearch();
  }
  
  // Clear crime data
  crimeData = {};
  
  // Update search placeholder based on city
  const searchInput = document.getElementById('borough-search');
  if (searchInput) {
    searchInput.placeholder = currentCity === 'london' ? 
      'Search boroughs or wards...' : 
      'Search boroughs, precincts, or numbers (e.g., 14, 75)...';
  }
  
  // Remove and recreate city selector to update active state
  const existingSelector = document.getElementById('city-selector');
  if (existingSelector) {
    existingSelector.remove();
  }
  createCitySelector();
  
  // Reinitialize map for new city
  initMap();
}

function createCitySelector() {
  const selector = document.createElement('div');
  selector.id = 'city-selector';
  selector.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 1000;
    font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif;
  `;
  
  selector.innerHTML = `
    <div style="
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(10px);
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      border: 1px solid rgba(255,255,255,0.2);
      overflow: hidden;
      display: flex;
      gap: 0;
    ">
      <button onclick="switchCity('london')" style="
        background: ${currentCity === 'london' ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'transparent'};
        color: ${currentCity === 'london' ? 'white' : '#64748b'};
        border: none;
        padding: 12px 16px;
        cursor: pointer;
        font-family: inherit;
        font-size: 14px;
        font-weight: 500;
        transition: all 0.2s ease;
        border-radius: 12px 0 0 12px;
        display: flex;
        align-items: center;
        gap: 8px;
      " onmouseover="if('${currentCity}' !== 'london') this.style.background='rgba(255,255,255,0.5)'" 
         onmouseout="if('${currentCity}' !== 'london') this.style.background='transparent'">
        🇬🇧 London
      </button>
      <div style="width: 1px; background: rgba(255,255,255,0.3);"></div>
      <button onclick="switchCity('nyc')" style="
        background: ${currentCity === 'nyc' ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : 'transparent'};
        color: ${currentCity === 'nyc' ? 'white' : '#64748b'};
        border: none;
        padding: 12px 16px;
        cursor: pointer;
        font-family: inherit;
        font-size: 14px;
        font-weight: 500;
        transition: all 0.2s ease;
        border-radius: 0 12px 12px 0;
        display: flex;
        align-items: center;
        gap: 8px;
      " onmouseover="if('${currentCity}' !== 'nyc') this.style.background='rgba(255,255,255,0.5)'" 
         onmouseout="if('${currentCity}' !== 'nyc') this.style.background='transparent'">
        🇺🇸 NYC
      </button>
    </div>
  `;
  
  document.body.appendChild(selector);
}