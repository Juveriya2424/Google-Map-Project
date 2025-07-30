#!/usr/bin/env python3
"""
GeoJSON Builder for SafeWorld
Handles creation of GeoJSON files for map visualization
"""

import pandas as pd
import geopandas as gpd
import requests
import json
import os
from typing import Dict, Optional
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class GeoJSONBuilder:
    """Class for building GeoJSON files from crime data and geographic boundaries"""
    
    def __init__(self, data_dir: str = "../../data"):
        """
        Initialize the GeoJSON builder
        
        Args:
            data_dir: Base directory for data storage
        """
        self.data_dir = data_dir
        self.raw_dir = os.path.join(data_dir, "raw")
        self.processed_dir = os.path.join(data_dir, "processed")

    def build_london_geojson(self, 
                           crime_csv: str, 
                           boundaries_file: str, 
                           output_file: str) -> bool:
        """
        Build London GeoJSON with crime data merged into borough boundaries
        
        Args:
            crime_csv: Path to CSV file with crime data
            boundaries_file: Path to GeoJSON file with London borough boundaries
            output_file: Path for output GeoJSON file
            
        Returns:
            True if successful, False otherwise
        """
        logger.info("Building London GeoJSON...")
        
        try:
            # Read crime data
            crime_data = pd.read_csv(crime_csv)
            logger.info(f"Loaded {len(crime_data)} crime records")
            
            # Read geographic boundaries
            geo_data = gpd.read_file(boundaries_file)
            logger.info(f"Loaded {len(geo_data)} geographic boundaries")
            
            # Normalize borough names for matching
            geo_data['Borough'] = geo_data['LAD22NM'].str.upper().str.strip()
            crime_data['Borough'] = crime_data['Borough'].str.upper().str.strip()
            
            # Filter to only London boroughs that exist in our crime data
            london_geo = geo_data[geo_data['Borough'].isin(crime_data['Borough'])]
            logger.info(f"Filtered to {len(london_geo)} London boroughs")
            
            # Merge crime data with geographic boundaries
            merged = london_geo.merge(crime_data, on='Borough', how='left')
            
            # Fill any missing crime data with 0
            merged['Crimes12M'] = merged['Crimes12M'].fillna(0)
            merged['Score'] = merged['Score'].fillna(1)  # Default to safest score
            
            # Add additional properties for the map
            merged['CrimeLevel'] = merged['Score'].apply(self._get_crime_level)
            merged['Description'] = merged.apply(self._create_borough_description, axis=1)
            
            # Select columns for final GeoJSON
            columns_to_keep = [
                'Borough', 'Crimes12M', 'Score', 'CrimeLevel', 'Description', 'geometry'
            ]
            final_data = merged[columns_to_keep]
            
            # Save as GeoJSON
            final_data.to_file(output_file, driver='GeoJSON')
            logger.info(f"London GeoJSON saved to {output_file}")
            
            return True
            
        except Exception as e:
            logger.error(f"Error building London GeoJSON: {e}")
            return False

    def fetch_nyc_boundaries(self) -> Optional[Dict]:
        """
        Fetch NYC borough boundaries from NYC Open Data API
        
        Returns:
            GeoJSON data or None if failed
        """
        logger.info("Fetching NYC borough boundaries...")
        
        url = "https://data.cityofnewyork.us/resource/tqmj-j8zm.geojson"
        
        try:
            response = requests.get(url, timeout=30)
            response.raise_for_status()
            
            geojson_data = response.json()
            logger.info(f"Fetched {len(geojson_data.get('features', []))} NYC boundaries")
            
            # Save raw boundaries
            boundaries_file = os.path.join(self.raw_dir, "nyc", "nyc_boundaries.geojson")
            with open(boundaries_file, 'w') as f:
                json.dump(geojson_data, f, indent=2)
            
            return geojson_data
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Error fetching NYC boundaries: {e}")
            return self._create_fallback_nyc_boundaries()

    def build_nyc_geojson(self, crime_csv: str, output_file: str) -> bool:
        """
        Build NYC GeoJSON with crime data
        
        Args:
            crime_csv: Path to CSV file with NYC crime data
            output_file: Path for output GeoJSON file
            
        Returns:
            True if successful, False otherwise
        """
        logger.info("Building NYC GeoJSON...")
        
        try:
            # Read crime data
            crime_data = pd.read_csv(crime_csv)
            
            # Fetch boundaries
            boundaries = self.fetch_nyc_boundaries()
            if not boundaries:
                return False
            
            # Convert boundaries to GeoDataFrame
            geo_df = gpd.GeoDataFrame.from_features(boundaries['features'])
            
            # Normalize borough names
            geo_df['Borough'] = geo_df['boro_name'].str.upper().str.strip()
            crime_data['Borough'] = crime_data['Borough'].str.upper().str.strip()
            
            # Merge crime data
            merged = geo_df.merge(crime_data, on='Borough', how='left')
            
            # Fill missing data
            merged['Crimes12M'] = merged['Crimes12M'].fillna(0)
            merged['Score'] = merged['Score'].fillna(1)
            
            # Add map properties
            merged['CrimeLevel'] = merged['Score'].apply(self._get_crime_level)
            merged['Description'] = merged.apply(self._create_borough_description, axis=1)
            
            # Select columns for output
            columns_to_keep = [
                'Borough', 'Crimes12M', 'Score', 'CrimeLevel', 'Description', 'geometry'
            ]
            final_data = merged[columns_to_keep]
            
            # Save as GeoJSON
            final_data.to_file(output_file, driver='GeoJSON')
            logger.info(f"NYC GeoJSON saved to {output_file}")
            
            return True
            
        except Exception as e:
            logger.error(f"Error building NYC GeoJSON: {e}")
            return False

    def _get_crime_level(self, score: int) -> str:
        """
        Convert numeric score to descriptive crime level
        
        Args:
            score: Safety score (1-10)
            
        Returns:
            Descriptive crime level
        """
        if score <= 3:
            return "Low"
        elif score <= 6:
            return "Moderate"
        elif score <= 8:
            return "High"
        else:
            return "Very High"

    def _create_borough_description(self, row) -> str:
        """
        Create a description for the borough based on crime data
        
        Args:
            row: DataFrame row with borough data
            
        Returns:
            Formatted description string
        """
        borough = row['Borough']
        crimes = int(row['Crimes12M']) if pd.notna(row['Crimes12M']) else 0
        score = int(row['Score']) if pd.notna(row['Score']) else 1
        level = row.get('CrimeLevel', 'Low')
        
        return f"{borough}: {crimes:,} crimes reported (Safety Score: {score}/10 - {level})"

    def _create_fallback_nyc_boundaries(self) -> Dict:
        """
        Create simplified NYC borough boundaries as fallback
        
        Returns:
            Basic GeoJSON structure for NYC boroughs
        """
        logger.info("Creating fallback NYC boundaries...")
        
        # Simplified borough boundaries (these are approximate)
        fallback = {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "properties": {"boro_name": "Manhattan"},
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[
                            [-74.0479, 40.6829], [-73.9067, 40.6829],
                            [-73.9067, 40.8820], [-74.0479, 40.8820],
                            [-74.0479, 40.6829]
                        ]]
                    }
                },
                {
                    "type": "Feature",
                    "properties": {"boro_name": "Brooklyn"},
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[
                            [-74.0479, 40.5000], [-73.8333, 40.5000],
                            [-73.8333, 40.7396], [-74.0479, 40.7396],
                            [-74.0479, 40.5000]
                        ]]
                    }
                },
                {
                    "type": "Feature",
                    "properties": {"boro_name": "Queens"},
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[
                            [-73.9622, 40.5469], [-73.7004, 40.5469],
                            [-73.7004, 40.8007], [-73.9622, 40.8007],
                            [-73.9622, 40.5469]
                        ]]
                    }
                },
                {
                    "type": "Feature",
                    "properties": {"boro_name": "Bronx"},
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[
                            [-73.9339, 40.7856], [-73.7654, 40.7856],
                            [-73.7654, 40.9176], [-73.9339, 40.9176],
                            [-73.9339, 40.7856]
                        ]]
                    }
                },
                {
                    "type": "Feature",
                    "properties": {"boro_name": "Staten Island"},
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[
                            [-74.2591, 40.4774], [-74.0524, 40.4774],
                            [-74.0524, 40.6514], [-74.2591, 40.6514],
                            [-74.2591, 40.4774]
                        ]]
                    }
                }
            ]
        }
        
        return fallback

    def build_all_geojson(self) -> bool:
        """
        Build all GeoJSON files for both London and NYC
        
        Returns:
            True if all builds successful, False otherwise
        """
        logger.info("Building all GeoJSON files...")
        
        success = True
        
        # Build London GeoJSON
        london_crime = os.path.join(self.processed_dir, "london", "london_crime_processed.csv")
        london_boundaries = os.path.join(self.raw_dir, "london", "LAD_Dec_2022_UK_BUC.geojson")
        london_output = os.path.join(self.processed_dir, "london", "london_crime_map.geojson")
        
        if os.path.exists(london_crime) and os.path.exists(london_boundaries):
            success &= self.build_london_geojson(london_crime, london_boundaries, london_output)
        else:
            logger.warning("London data files not found")
            success = False
        
        # Build NYC GeoJSON
        nyc_crime = os.path.join(self.processed_dir, "nyc", "nyc_crime_processed.csv")
        nyc_output = os.path.join(self.processed_dir, "nyc", "nyc_crime_map.geojson")
        
        if os.path.exists(nyc_crime):
            success &= self.build_nyc_geojson(nyc_crime, nyc_output)
        else:
            logger.warning("NYC crime data not found")
            success = False
        
        return success


def main():
    """Main function to build GeoJSON files"""
    builder = GeoJSONBuilder()
    
    if builder.build_all_geojson():
        logger.info("All GeoJSON files built successfully!")
    else:
        logger.error("Some GeoJSON builds failed. Check logs for details.")


if __name__ == "__main__":
    main()
