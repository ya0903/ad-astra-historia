#!/bin/bash
# shared/eras/download.sh
# Downloads Natural Earth 110m country polygons and creates all era GeoJSON files.
# Run once: bash shared/eras/download.sh
# Re-running is safe — exits early if modern.geojson already exists.

set -e
cd "$(dirname "$0")"

if [ -f modern.geojson ]; then
  echo "modern.geojson already exists. Delete it manually to re-download."
  exit 0
fi

echo "Downloading Natural Earth 110m countries..."
curl -L "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson" \
  -o modern.geojson

# Validate the download is real GeoJSON before copying
node -e "const d=JSON.parse(require('fs').readFileSync('modern.geojson','utf8')); if(d.type!=='FeatureCollection'||!d.features.length){process.exit(1)}" \
  || { echo "Downloaded file is not valid GeoJSON. Aborting."; rm modern.geojson; exit 1; }

echo "Download verified ($(node -e "const d=JSON.parse(require('fs').readFileSync('modern.geojson','utf8'));process.stdout.write(String(d.features.length))" ) features)."

# Copy modern as base for other eras (historical adjustments applied server-side in routes/game.ts)
for era in 2010s 1990s 1960s 1945; do
  if [ ! -f "${era}.geojson" ]; then
    cp modern.geojson "${era}.geojson"
    echo "Created ${era}.geojson"
  else
    echo "${era}.geojson already exists — skipping."
  fi
done

echo "All era files ready. Historical border adjustments are handled server-side in routes/game.ts"
