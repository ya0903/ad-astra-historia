#!/bin/bash
# shared/eras/download.sh
# Downloads Natural Earth 110m country polygons and saves as modern.geojson
# Run once: bash shared/eras/download.sh

set -e
cd "$(dirname "$0")"

echo "Downloading Natural Earth 110m countries..."
curl -L "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson" \
  -o modern.geojson

echo "Done. modern.geojson saved."
echo "For era-specific borders, copy modern.geojson and adjust manually or use historical datasets."

# Copy modern as base for other eras (historical adjustments applied in game.ts route)
cp modern.geojson 2010s.geojson
cp modern.geojson 1990s.geojson
cp modern.geojson 1960s.geojson
cp modern.geojson 1945.geojson

echo "All era files created. Historical border adjustments are handled server-side in routes/game.ts"
