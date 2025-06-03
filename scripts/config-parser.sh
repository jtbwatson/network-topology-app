#!/bin/bash

# Config Parser Wrapper Script
# Runs the config-parser.py with virtual environment

echo "🔧 Running Config Parser..."

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Change to project root
cd "$PROJECT_ROOT"

# Check if virtual environment exists
if [ ! -d ".venv" ]; then
    echo "❌ Virtual environment not found. Running setup..."
    npm run setup
fi

# Activate virtual environment and run config parser
source .venv/bin/activate

# Default values for the GNS3 lab site
DEFAULT_CONFIG_DIR="sites/gns3-lab/configs"
DEFAULT_OUTPUT_DIR="sites/gns3-lab"
DEFAULT_SITE_NAME="GNS3 Lab Network"
DEFAULT_LOCATION="Lab Environment"

# Use provided arguments or defaults
CONFIG_DIR="${1:-$DEFAULT_CONFIG_DIR}"
OUTPUT_DIR="${2:-$DEFAULT_OUTPUT_DIR}"
SITE_NAME="${3:-$DEFAULT_SITE_NAME}"
LOCATION="${4:-$DEFAULT_LOCATION}"

echo "📁 Config directory: $CONFIG_DIR"
echo "📂 Output directory: $OUTPUT_DIR"
echo "🏢 Site: $SITE_NAME"
echo "📍 Location: $LOCATION"

python scripts/config-parser.py \
    --config-dir "$CONFIG_DIR" \
    --output-dir "$OUTPUT_DIR" \
    --site-name "$SITE_NAME" \
    --location "$LOCATION" \
    --description "Auto-generated from device configurations"

echo "✅ Config parsing complete!"