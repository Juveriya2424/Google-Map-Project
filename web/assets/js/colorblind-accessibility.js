// Visual Inclusivity Module
class VisualInclusivity {
  constructor() {
    this.isVisualInclusiveMode = false;
    this.map = null;
    
    // Standard color palette (existing)
    this.standardPalette = [
      '#1a5f1a', '#2d7a2d', '#4a9d4a', '#6bb86b', '#8dd08d',   // Greens (1-5)
      '#ffd633', '#ffb84d', '#ff9966', '#ff6b7f', '#ff4757'    // Yellow to red (6-10)
    ];
    
    // Visual inclusive palette using blue-orange contrast
    this.visualInclusivePalette = [
      '#08306b', '#08519c', '#2171b5', '#4292c6', '#6baed6',   // Blues (safe - 1-5)
      '#fd8d3c', '#f16913', '#d94801', '#a63603', '#7f2704'    // Oranges (danger - 6-10)
    ];
  }

  initialize(map) {
    this.map = map;
    this.createToggleButton();
    
    // Create the legend first
    if (window.createLegend) {
      window.createLegend(map);
    }
    
    // Check if user has a saved preference and apply it
    const savedMode = localStorage.getItem('visualInclusiveMode');
    if (savedMode === 'true') {
      this.isVisualInclusiveMode = true;
      this.updateToggleVisuals();
      this.updateMapColors();
      this.updateLegend();
    }
  }

  createToggleButton() {
    const toggleContainer = document.createElement('div');
    toggleContainer.innerHTML = `
      <div style="
        background: rgba(255, 255, 255, 0.95);
        padding: 16px;
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif;
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255,255,255,0.2);
        margin-bottom: 16px;
      ">
        <h4 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 500; color: #2c3e50;">Accessibility</h4>
        <label style="
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          font-size: 13px;
          color: #475569;
          user-select: none;
        ">
          <div class="toggle-switch" style="
            position: relative;
            width: 44px;
            height: 24px;
            background: #e2e8f0;
            border-radius: 12px;
            transition: all 0.3s ease;
            ${this.isVisualInclusiveMode ? 'background: #3b82f6;' : ''}
          ">
            <div class="toggle-slider" style="
              position: absolute;
              top: 2px;
              left: ${this.isVisualInclusiveMode ? '22px' : '2px'};
              width: 20px;
              height: 20px;
              background: white;
              border-radius: 50%;
              transition: all 0.3s ease;
              box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            "></div>
          </div>
          <span class="toggle-label">Visual Inclusive</span>
        </label>
      </div>
    `;

    // Add click handler
    const toggle = toggleContainer.querySelector('label');
    toggle.addEventListener('click', () => this.toggleVisualInclusiveMode());

    // Add to map controls
    this.map.controls[google.maps.ControlPosition.LEFT_TOP].push(toggleContainer);
    this.toggleContainer = toggleContainer;
  }

  toggleVisualInclusiveMode() {
    this.isVisualInclusiveMode = !this.isVisualInclusiveMode;
    
    // Update visual state of toggle
    this.updateToggleVisuals();
    
    // Update map colors
    this.updateMapColors();
    
    // Update legend
    this.updateLegend();
    
    // Update dashboard if it's currently open
    this.updateDashboard();
    
    // Save preference
    localStorage.setItem('visualInclusiveMode', this.isVisualInclusiveMode.toString());
    
    // Show feedback
    this.showModeChangeNotification();
  }

  updateToggleVisuals() {
    const toggleSwitch = this.toggleContainer.querySelector('.toggle-switch');
    const toggleSlider = this.toggleContainer.querySelector('.toggle-slider');
    
    if (this.isVisualInclusiveMode) {
      toggleSwitch.style.background = '#3b82f6';
      toggleSlider.style.left = '22px';
    } else {
      toggleSwitch.style.background = '#e2e8f0';
      toggleSlider.style.left = '2px';
    }
  }

  updateMapColors() {
    const palette = this.isVisualInclusiveMode ? this.visualInclusivePalette : this.standardPalette;
    
    // Update map style using the global function
    if (window.updateMapColorsFromToggle) {
      window.updateMapColorsFromToggle(palette);
    }
  }

  updateLegend() {
    const legend = document.getElementById('map-legend');
    if (legend && window.updateLegendColors) {
      window.updateLegendColors(legend, this.isVisualInclusiveMode);
    }
  }

  updateDashboard() {
    const dashboard = document.getElementById('dashboard');
    if (dashboard && dashboard.style.display === 'block') {
      // Find the currently displayed borough data and refresh the dashboard
      const boroughName = dashboard.querySelector('.dashboard-header h2');
      if (boroughName && window.crimeData) {
        const boroughData = window.crimeData[boroughName.textContent.toUpperCase()];
        if (boroughData && window.showDashboard) {
          // Re-render the dashboard with new colors
          window.showDashboard(boroughData);
        }
      }
    }
  }

  showModeChangeNotification() {
    const notification = document.createElement('div');
    const modeText = this.isVisualInclusiveMode ? 'Visual Inclusive' : 'Standard';
    
    notification.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: ${this.isVisualInclusiveMode ? '#dbeafe' : '#dcfce7'};
        color: ${this.isVisualInclusiveMode ? '#1e40af' : '#166534'};
        padding: 12px 20px;
        border-radius: 8px;
        border: 1px solid ${this.isVisualInclusiveMode ? '#bfdbfe' : '#bbf7d0'};
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        z-index: 2000;
        font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif;
        font-weight: 500;
        font-size: 14px;
        animation: slideDown 0.3s ease;
      ">
        <span style="margin-right: 8px;">${this.isVisualInclusiveMode ? '🔵' : '🟢'}</span>
        Switched to ${modeText} color mode
      </div>
    `;
    
    // Add animation CSS if not exists
    if (!document.getElementById('notification-styles')) {
      const style = document.createElement('style');
      style.id = 'notification-styles';
      style.textContent = `
        @keyframes slideDown {
          from {
            transform: translateX(-50%) translateY(-20px);
            opacity: 0;
          }
          to {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
          }
        }
      `;
      document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
      notification.style.animation = 'slideDown 0.3s ease reverse';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  // Method to get current palette (useful for other components)
  getCurrentPalette() {
    return this.isVisualInclusiveMode ? this.visualInclusivePalette : this.standardPalette;
  }

  // Method to check if visual inclusive mode is active
  isVisualInclusiveModeActive() {
    return this.isVisualInclusiveMode;
  }
}

// Create global instance
window.VisualInclusivity = new VisualInclusivity();
