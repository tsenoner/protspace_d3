#!/bin/bash

# Deploy ProtSpace Scatterplot Example to GitHub Pages
# This script builds the workspace and deploys the example to GitHub Pages

set -e

echo "🚀 Starting deployment process for ProtSpace Scatterplot Example..."

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "examples/scatterplot-vite" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo "❌ Error: pnpm is not installed. Please install pnpm first."
    exit 1
fi

echo "📦 Installing dependencies..."
pnpm install --frozen-lockfile

echo "🔨 Building workspace packages..."
pnpm run build

echo "🏗️  Building scatterplot example..."
cd examples/scatterplot-vite
NODE_ENV=production pnpm run build

echo "✅ Build completed successfully!"
echo "📁 Built files are in: examples/scatterplot-vite/dist/"

if [ "$1" = "--preview" ]; then
    echo "🔍 Starting preview server..."
    pnpm run preview
fi
