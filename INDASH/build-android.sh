#!/bin/bash
set -e

echo "=== INDASH Android Build Script ==="
echo ""

# Configuration
BUILD_TYPE=${1:-debug}

echo "Build type: $BUILD_TYPE"
echo ""

# Step 1: Build Angular
echo ">>> Step 1: Building Angular app (production)..."
npm run build -- --configuration production

# Step 2: Sync to Android
echo ""
echo ">>> Step 2: Syncing to Android..."
npx cap sync android

# Step 3: Build APK
echo ""
echo ">>> Step 3: Building APK..."
cd android

if [ "$BUILD_TYPE" = "release" ]; then
    ./gradlew assembleRelease
    APK_PATH="app/build/outputs/apk/release/app-release-unsigned.apk"
elif [ "$BUILD_TYPE" = "bundle" ]; then
    ./gradlew bundleRelease
    APK_PATH="app/build/outputs/bundle/release/app-release.aab"
else
    ./gradlew assembleDebug
    APK_PATH="app/build/outputs/apk/debug/app-debug.apk"
fi

cd ..

echo ""
echo "==================================="
echo "Build complete!"
echo "Output: android/$APK_PATH"
echo "==================================="
