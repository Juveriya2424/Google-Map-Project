// Configuration template for SafeWorld Crime Map
// Copy this file to config.js and add your actual API key

const CONFIG = {
  GOOGLE_MAPS_API_KEY: 'YOUR_GOOGLE_MAPS_API_KEY_HERE'
};

// Function to load Google Maps script dynamically
function loadGoogleMapsScript() {
  console.log('Loading Google Maps script...');
  
  return new Promise((resolve, reject) => {
    if (window.google && window.google.maps) {
      console.log('Google Maps already loaded');
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${CONFIG.GOOGLE_MAPS_API_KEY}&callback=initMap&libraries=geometry`;
    
    script.onload = () => {
      console.log('Google Maps script loaded successfully');
      resolve();
    };
    
    script.onerror = (error) => {
      console.error('Failed to load Google Maps script:', error);
      reject(error);
    };

    document.head.appendChild(script);
  });
}

// Make sure initMap is available globally
window.initMap = function() {
  console.log('initMap called - Google Maps API ready');
  if (typeof startApp === 'function') {
    startApp();
  }
};
