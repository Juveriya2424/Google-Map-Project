#!/usr/bin/env python3
"""
Setup script for SafeWorld project
Handles initial setup and data processing
"""

import os
import sys
import subprocess
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def install_requirements():
    """Install required Python packages"""
    logger.info("Installing requirements...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "../requirements.txt"])
        logger.info("Requirements installed successfully")
        return True
    except subprocess.CalledProcessError as e:
        logger.error(f"Failed to install requirements: {e}")
        return False


def setup_directories():
    """Ensure all necessary directories exist"""
    logger.info("Setting up directories...")
    
    directories = [
        "../data/raw/london",
        "../data/raw/nyc", 
        "../data/processed/london",
        "../data/processed/nyc",
        "../src/web/assets/css",
        "../src/web/assets/js"
    ]
    
    for directory in directories:
        os.makedirs(directory, exist_ok=True)
        logger.info(f"Created directory: {directory}")


def create_gitkeep_files():
    """Create .gitkeep files to preserve directory structure"""
    logger.info("Creating .gitkeep files...")
    
    directories = [
        "../data/raw/london",
        "../data/raw/nyc",
        "../data/processed/london", 
        "../data/processed/nyc"
    ]
    
    for directory in directories:
        gitkeep_path = os.path.join(directory, ".gitkeep")
        with open(gitkeep_path, 'w') as f:
            f.write("# This file ensures the directory is tracked by git\n")


def run_data_processing():
    """Run the data processing pipeline"""
    logger.info("Running data processing...")
    
    # Add src to Python path
    sys.path.insert(0, "../src")
    
    try:
        from data_processing.crime_data_processor import CrimeDataProcessor
        from data_processing.geojson_builder import GeoJSONBuilder
        
        # Process crime data
        processor = CrimeDataProcessor("../data")
        
        # Check if London data exists and process it
        london_csv = "../data/raw/london/borough_crimes.csv"
        if os.path.exists(london_csv):
            london_df = processor.process_london_crime_data(london_csv)
            processor.analyze_crime_patterns(london_df, 'london')
        
        # Fetch and process NYC data
        nyc_data = processor.fetch_nyc_crime_data()
        if nyc_data:
            nyc_df = processor.process_nyc_crime_data(nyc_data)
            processor.analyze_crime_patterns(nyc_df, 'nyc')
        
        # Build GeoJSON files
        builder = GeoJSONBuilder("../data")
        builder.build_all_geojson()
        
        # Generate summary
        print("\n" + processor.generate_summary_report())
        
        return True
        
    except Exception as e:
        logger.error(f"Data processing failed: {e}")
        return False


def main():
    """Main setup function"""
    print("SafeWorld Project Setup")
    print("=" * 30)
    
    # Step 1: Setup directories
    setup_directories()
    create_gitkeep_files()
    
    # Step 2: Install requirements
    if not install_requirements():
        print("❌ Setup failed at requirements installation")
        return False
    
    # Step 3: Run data processing
    if not run_data_processing():
        print("⚠️  Setup completed but data processing failed")
        print("You may need to manually add data files and run processing later")
        return False
    
    print("✅ SafeWorld setup completed successfully!")
    print("\nNext steps:")
    print("1. Add your Google Maps API key to the HTML files")
    print("2. Open src/web/landing.html in your browser")
    print("3. Navigate to the map to see your crime data visualization")
    
    return True


if __name__ == "__main__":
    main()
