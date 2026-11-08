#!/bin/sh
# Empaqueta las funciones del panel para Vercel (api/**.js, CommonJS, un archivo por ruta).
# Fuentes: vercel-api/** (adaptadores que reutilizan functions/ de Cloudflare). Ejecutar tras cambiar functions/ o lib/server/.
set -e
cd "$(dirname "$0")/.."
rm -rf api
for f in vercel-api/*/*.ts; do
  out="api/${f#vercel-api/}"; out="${out%.ts}.js"
  npx --yes esbuild@0.24.0 "$f" --bundle --platform=node --target=node20 --format=cjs --log-level=warning --outfile="$out"
done
echo "api/ generado: $(find api -name '*.js' | wc -l | tr -d ' ') funciones"
