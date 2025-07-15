#!/usr/bin/env python3

"""
Convert ProtSpace JSON format to Apache Arrow format

Usage: python convert_json_to_arrow.py <input.json> <output.arrow>
"""

import json
import sys
import os
import pyarrow as pa
import pyarrow.ipc as ipc
import pandas as pd

def convert_protspace_to_arrow(input_path: str, output_path: str):
    """Convert ProtSpace JSON format to Apache Arrow format."""
    
    try:
        # Read the JSON file
        with open(input_path, 'r') as f:
            json_data = json.load(f)
        
        print("📖 Reading ProtSpace JSON data...")
        print(f"   Proteins: {len(json_data['protein_ids'])}")
        print(f"   Features: {', '.join(json_data['features'].keys())}")
        print(f"   Projections: {', '.join([p['name'] for p in json_data['projections']])}")
        
        # Prepare the tabular data
        num_rows = len(json_data['protein_ids'])
        data = {}
        
        # Add protein IDs
        data['protein_id'] = json_data['protein_ids']
        
        # Add all projection coordinates
        for projection in json_data['projections']:
            projection_name = projection['name'].lower()
            
            data[f'{projection_name}_x'] = [coord[0] for coord in projection['data']]
            data[f'{projection_name}_y'] = [coord[1] for coord in projection['data']]
            
            print(f"   Added projection: {projection['name']}")
        
        # Add categorical features
        for feature_name, feature_info in json_data['features'].items():
            feature_labels = []
            feature_indices = json_data['feature_data'][feature_name]
            
            # Map indices to labels
            for i in range(num_rows):
                index = feature_indices[i]
                label = feature_info['items'][index].get('label', None)
                feature_labels.append(label)
            
            data[feature_name] = feature_labels
            print(f"   Feature '{feature_name}': {len(feature_info['items'])} categories")
        
        # Create pandas DataFrame for easier Arrow conversion
        df = pd.DataFrame(data)
        
        print(f"\nDataFrame preview:")
        print(df.head())
        
        # Convert to Arrow table
        table = pa.Table.from_pandas(df)
        
        print(f"\n📊 Arrow Table Created:")
        print(f"   Rows: {table.num_rows}")
        print(f"   Columns: {table.num_columns}")
        print(f"   Schema: {', '.join([f'{field.name}:{field.type}' for field in table.schema])}")
        
        # Write to Arrow file
        with open(output_path, 'wb') as f:
            writer = ipc.new_file(f, table.schema)
            writer.write_table(table)
            writer.close()
        
        file_size_kb = os.path.getsize(output_path) / 1024
        print(f"\n✅ Successfully converted to Arrow format: {output_path}")
        print(f"   File size: {file_size_kb:.2f} KB")
        
        return True
        
    except Exception as e:
        print(f"❌ Error converting file: {str(e)}")
        return False

def main():
    """Main execution function."""
    
    if len(sys.argv) != 3:
        print("Usage: python convert_json_to_arrow.py <input.json> <output.arrow>")
        print("")
        print("Example:")
        print("  python convert_json_to_arrow.py app/public/data/example/basic.json basic.arrow")
        sys.exit(1)
    
    input_path, output_path = sys.argv[1], sys.argv[2]
    
    if not os.path.exists(input_path):
        print(f"❌ Input file not found: {input_path}")
        sys.exit(1)
    
    # Create output directory if it doesn't exist
    output_dir = os.path.dirname(output_path)
    if output_dir and not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    success = convert_protspace_to_arrow(input_path, output_path)
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main() 