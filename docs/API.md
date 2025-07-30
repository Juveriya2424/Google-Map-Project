# SafeWorld API Documentation

## Google Maps JavaScript API Integration

SafeWorld uses the Google Maps JavaScript API to provide interactive crime data visualization. This document outlines the API features used and how to integrate them.

## API Key Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing project
3. Enable the Maps JavaScript API
4. Create credentials (API key)
5. Replace `YOUR_API_KEY` in the HTML files with your actual API key

## Maps API Features Used

### 1. Map Initialization
```javascript
const map = new google.maps.Map(document.getElementById("map"), {
    zoom: 10,
    center: { lat: 51.5074, lng: -0.1278 }, // London center
    styles: mapStyles // Custom styling
});
```

### 2. Data Layer for GeoJSON
```javascript
map.data.loadGeoJson('path/to/crime-data.geojson');
map.data.setStyle((feature) => {
    const crimeScore = feature.getProperty('Score');
    return {
        fillColor: getColorForScore(crimeScore),
        fillOpacity: 0.7,
        strokeWeight: 1
    };
});
```

### 3. Info Windows
```javascript
const infoWindow = new google.maps.InfoWindow();
map.data.addListener('click', (event) => {
    const borough = event.feature.getProperty('Borough');
    const crimes = event.feature.getProperty('Crimes12M');
    infoWindow.setContent(`<h3>${borough}</h3><p>Crimes: ${crimes}</p>`);
    infoWindow.setPosition(event.latLng);
    infoWindow.open(map);
});
```

### 4. Custom Controls
```javascript
const legendDiv = document.createElement('div');
const legend = new Legend(legendDiv, map);
map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(legendDiv);
```

### 5. Event Handling
```javascript
// Map click events
map.addListener('click', handleMapClick);

// Data layer events
map.data.addListener('mouseover', handleMouseOver);
map.data.addListener('mouseout', handleMouseOut);
```

## Data Processing API

### Crime Data Processor

```python
from src.data_processing.crime_data_processor import CrimeDataProcessor

processor = CrimeDataProcessor(data_dir="./data")

# Process London data
london_df = processor.process_london_crime_data("london_crimes.csv")

# Fetch NYC data
nyc_data = processor.fetch_nyc_crime_data()
nyc_df = processor.process_nyc_crime_data(nyc_data)

# Generate analysis
analysis = processor.analyze_crime_patterns(london_df, 'london')
```

### GeoJSON Builder

```python
from src.data_processing.geojson_builder import GeoJSONBuilder

builder = GeoJSONBuilder(data_dir="./data")

# Build London GeoJSON
builder.build_london_geojson(
    crime_csv="crime_data.csv",
    boundaries_file="boundaries.geojson", 
    output_file="london_map.geojson"
)

# Build NYC GeoJSON
builder.build_nyc_geojson(
    crime_csv="nyc_crimes.csv",
    output_file="nyc_map.geojson"
)
```

## Data Sources API

### London Crime Data
- **Source**: gov.uk Crime Statistics
- **URL**: https://www.gov.uk/government/collections/crime-statistics
- **Format**: CSV with columns: Borough, Crimes12M, Score
- **Update Frequency**: Monthly

### NYC Crime Data  
- **Source**: NYC Open Data Portal
- **URL**: https://data.cityofnewyork.us/Public-Safety/NYPD-Complaint-Data-Current-Year-To-Date-/5uac-w243
- **Format**: JSON via SODA API
- **Update Frequency**: Daily

## Color Scheme API

SafeWorld uses a color-blind accessible palette:

```javascript
function getColorForScore(score) {
    const colors = {
        1: '#10b981', // Safe - Green
        2: '#34d399', // Safe - Light Green  
        3: '#6ee7b7', // Safe - Very Light Green
        4: '#fbbf24', // Moderate - Yellow
        5: '#f59e0b', // Moderate - Orange Yellow
        6: '#f97316', // Moderate - Orange
        7: '#ef4444', // High - Red
        8: '#dc2626', // High - Dark Red
        9: '#b91c1c', // Very High - Very Dark Red
        10: '#7f1d1d' // Extreme - Darkest Red
    };
    return colors[score] || '#6b7280'; // Default gray
}
```

## Performance Optimization

### 1. Data Chunking
```javascript
// Load large GeoJSON files in chunks
function loadGeoJSONChunks(urls) {
    urls.forEach((url, index) => {
        setTimeout(() => {
            map.data.loadGeoJson(url);
        }, index * 100); // Stagger loading
    });
}
```

### 2. Event Throttling
```javascript
// Throttle expensive operations
let timeout;
map.addListener('zoom_changed', () => {
    clearTimeout(timeout);
    timeout = setTimeout(updateVisibleFeatures, 150);
});
```

## Error Handling

```javascript
// Handle API loading errors
function initMap() {
    try {
        const map = new google.maps.Map(/* ... */);
        loadCrimeData(map);
    } catch (error) {
        console.error('Map initialization failed:', error);
        showFallbackContent();
    }
}

// Handle data loading errors
function loadCrimeData(map) {
    map.data.loadGeoJson('crime-data.geojson', null, (error) => {
        if (error) {
            console.error('Failed to load crime data:', error);
            showErrorMessage('Crime data temporarily unavailable');
        }
    });
}
```

## Accessibility Features

### 1. Keyboard Navigation
```javascript
// Enable keyboard navigation
map.setOptions({
    keyboardShortcuts: true,
    scrollwheel: true
});

// Custom keyboard handlers
document.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && event.target.classList.contains('borough')) {
        showBoroughDetails(event.target.dataset.borough);
    }
});
```

### 2. Screen Reader Support
```html
<div id="map" 
     role="application" 
     aria-label="Interactive crime data map"
     aria-describedby="map-description">
</div>

<div id="map-description" class="sr-only">
    Interactive map showing crime data across London boroughs. 
    Use arrow keys to navigate and Enter to select boroughs.
</div>
```

## Rate Limiting

When fetching data from external APIs:

```python
import time
import requests

class RateLimitedFetcher:
    def __init__(self, requests_per_minute=60):
        self.min_interval = 60.0 / requests_per_minute
        self.last_request = 0
    
    def fetch(self, url):
        now = time.time()
        time_since_last = now - self.last_request
        if time_since_last < self.min_interval:
            time.sleep(self.min_interval - time_since_last)
        
        self.last_request = time.time()
        return requests.get(url)
```

## Testing

### Unit Tests
```python
import unittest
from src.data_processing.crime_data_processor import CrimeDataProcessor

class TestCrimeDataProcessor(unittest.TestCase):
    def setUp(self):
        self.processor = CrimeDataProcessor("./test_data")
    
    def test_process_london_data(self):
        # Test data processing
        pass
    
    def test_calculate_safety_score(self):
        # Test score calculation
        pass
```

### Integration Tests
```javascript
// Test map functionality
describe('Map Integration', () => {
    let map;
    
    beforeEach(() => {
        map = new google.maps.Map(document.createElement('div'));
    });
    
    it('should load crime data successfully', (done) => {
        map.data.loadGeoJson('test-data.geojson', null, (error) => {
            expect(error).toBeNull();
            done();
        });
    });
});
```
