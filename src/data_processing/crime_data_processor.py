#!/usr/bin/env python3
"""
Crime Data Processor for SafeWorld
Handles processing of crime data from various sources and generates safety scores
"""

import pandas as pd
import requests
import json
import os
from typing import Dict, List, Optional, Tuple
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class CrimeDataProcessor:
    """Main class for processing crime data and generating safety scores"""
    
    def __init__(self, data_dir: str = "../../data"):
        """
        Initialize the crime data processor
        
        Args:
            data_dir: Base directory for data storage
        """
        self.data_dir = data_dir
        self.raw_dir = os.path.join(data_dir, "raw")
        self.processed_dir = os.path.join(data_dir, "processed")
        
        # Ensure directories exist
        os.makedirs(os.path.join(self.raw_dir, "london"), exist_ok=True)
        os.makedirs(os.path.join(self.raw_dir, "nyc"), exist_ok=True)
        os.makedirs(os.path.join(self.processed_dir, "london"), exist_ok=True)
        os.makedirs(os.path.join(self.processed_dir, "nyc"), exist_ok=True)

    def fetch_nyc_crime_data(self) -> Optional[Dict]:
        """
        Fetch NYC crime data from NYC Open Data API
        
        Returns:
            Dictionary containing crime data or None if failed
        """
        logger.info("Fetching NYC crime data...")
        
        # NYC Open Data API endpoint for NYPD Complaint Data
        url = "https://data.cityofnewyork.us/resource/5uac-w243.json"
        
        # Parameters to limit data and get recent crimes
        params = {
            "$limit": 10000,
            "$where": "cmplnt_fr_dt > '2023-01-01'",
            "$select": "boro_nm,ofns_desc,law_cat_cd,latitude,longitude,cmplnt_fr_dt"
        }
        
        try:
            response = requests.get(url, params=params, timeout=30)
            response.raise_for_status()
            
            data = response.json()
            logger.info(f"Successfully fetched {len(data)} NYC crime records")
            
            # Save raw data
            raw_file = os.path.join(self.raw_dir, "nyc", "nyc_crime_raw.json")
            with open(raw_file, 'w') as f:
                json.dump(data, f, indent=2)
            
            return data
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Error fetching NYC crime data: {e}")
            return None

    def process_london_crime_data(self, csv_file: str) -> pd.DataFrame:
        """
        Process London crime data from CSV file
        
        Args:
            csv_file: Path to London crime CSV file
            
        Returns:
            Processed DataFrame with borough crime scores
        """
        logger.info(f"Processing London crime data from {csv_file}")
        
        try:
            # Read the crime data
            df = pd.read_csv(csv_file)
            
            # Ensure required columns exist
            required_cols = ['Borough', 'Crimes12M']
            if not all(col in df.columns for col in required_cols):
                raise ValueError(f"CSV must contain columns: {required_cols}")
            
            # Clean borough names
            df['Borough'] = df['Borough'].str.strip().str.title()
            
            # Calculate safety score (1-10, where 1 is safest)
            # Using quantile-based scoring
            df['Score'] = pd.qcut(df['Crimes12M'], 
                                q=10, 
                                labels=range(1, 11),
                                duplicates='drop').astype(int)
            
            # Add crime rate per 1000 residents (if population data available)
            # This is a simplified calculation - in reality you'd use actual population data
            df['CrimeRate'] = df['Crimes12M'] / 1000  # Placeholder
            
            # Save processed data
            processed_file = os.path.join(self.processed_dir, "london", "london_crime_processed.csv")
            df.to_csv(processed_file, index=False)
            
            logger.info(f"Processed {len(df)} London boroughs")
            return df
            
        except Exception as e:
            logger.error(f"Error processing London crime data: {e}")
            raise

    def process_nyc_crime_data(self, crime_data: List[Dict]) -> pd.DataFrame:
        """
        Process NYC crime data and calculate borough safety scores
        
        Args:
            crime_data: List of crime records from NYC API
            
        Returns:
            DataFrame with NYC borough crime scores
        """
        logger.info("Processing NYC crime data...")
        
        try:
            # Convert to DataFrame
            df = pd.DataFrame(crime_data)
            
            # Clean and filter data
            df = df.dropna(subset=['boro_nm'])
            df['boro_nm'] = df['boro_nm'].str.strip().str.title()
            
            # Count crimes by borough
            borough_counts = df.groupby('boro_nm').size().reset_index(name='Crimes12M')
            
            # Calculate safety scores
            borough_counts['Score'] = pd.qcut(borough_counts['Crimes12M'], 
                                            q=5, 
                                            labels=range(1, 6),
                                            duplicates='drop').astype(int) * 2  # Scale to 1-10
            
            # Rename columns to match London format
            borough_counts.rename(columns={'boro_nm': 'Borough'}, inplace=True)
            
            # Save processed data
            processed_file = os.path.join(self.processed_dir, "nyc", "nyc_crime_processed.csv")
            borough_counts.to_csv(processed_file, index=False)
            
            logger.info(f"Processed {len(borough_counts)} NYC boroughs")
            return borough_counts
            
        except Exception as e:
            logger.error(f"Error processing NYC crime data: {e}")
            raise

    def analyze_crime_patterns(self, df: pd.DataFrame, city: str) -> Dict:
        """
        Analyze crime patterns and generate insights
        
        Args:
            df: DataFrame with crime data
            city: City name ('london' or 'nyc')
            
        Returns:
            Dictionary with analysis results
        """
        logger.info(f"Analyzing crime patterns for {city}")
        
        analysis = {
            'city': city,
            'total_boroughs': len(df),
            'safest_borough': df.loc[df['Score'].idxmin(), 'Borough'],
            'highest_risk_borough': df.loc[df['Score'].idxmax(), 'Borough'],
            'average_score': df['Score'].mean(),
            'total_crimes': df['Crimes12M'].sum(),
            'score_distribution': df['Score'].value_counts().to_dict()
        }
        
        # Save analysis
        analysis_file = os.path.join(self.processed_dir, city, f"{city}_analysis.json")
        with open(analysis_file, 'w') as f:
            json.dump(analysis, f, indent=2)
        
        return analysis

    def generate_summary_report(self) -> str:
        """
        Generate a summary report of all processed data
        
        Returns:
            Formatted summary report string
        """
        report = []
        report.append("SafeWorld Crime Data Processing Summary")
        report.append("=" * 40)
        
        # Check for processed data files
        for city in ['london', 'nyc']:
            processed_file = os.path.join(self.processed_dir, city, f"{city}_crime_processed.csv")
            analysis_file = os.path.join(self.processed_dir, city, f"{city}_analysis.json")
            
            if os.path.exists(processed_file):
                df = pd.read_csv(processed_file)
                report.append(f"\n{city.upper()} Data:")
                report.append(f"  - Boroughs processed: {len(df)}")
                report.append(f"  - Total crimes: {df['Crimes12M'].sum():,}")
                report.append(f"  - Average safety score: {df['Score'].mean():.1f}/10")
                
                if os.path.exists(analysis_file):
                    with open(analysis_file, 'r') as f:
                        analysis = json.load(f)
                    report.append(f"  - Safest area: {analysis['safest_borough']}")
                    report.append(f"  - Highest risk area: {analysis['highest_risk_borough']}")
        
        return "\n".join(report)


def main():
    """Main function to run the crime data processing pipeline"""
    processor = CrimeDataProcessor()
    
    # Process London data if available
    london_csv = os.path.join(processor.raw_dir, "london", "borough_crimes.csv")
    if os.path.exists(london_csv):
        london_df = processor.process_london_crime_data(london_csv)
        processor.analyze_crime_patterns(london_df, 'london')
    else:
        logger.warning("London crime data not found. Please add borough_crimes.csv to data/raw/london/")
    
    # Fetch and process NYC data
    nyc_data = processor.fetch_nyc_crime_data()
    if nyc_data:
        nyc_df = processor.process_nyc_crime_data(nyc_data)
        processor.analyze_crime_patterns(nyc_df, 'nyc')
    
    # Generate summary report
    print("\n" + processor.generate_summary_report())


if __name__ == "__main__":
    main()
