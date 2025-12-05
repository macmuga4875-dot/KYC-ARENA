#!/usr/bin/env bash
set -euo pipefail

# Usage: ./scripts/build_android.sh [--release]
# This script builds the web app and prepares an Android project with Capacitor.
# It does NOT run Gradle to produce an APK since that requires Android SDK/JDK on the host.

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo "1) Install Capacitor CLI and Core (if not already installed)"
npm install @capacitor/cli @capacitor/core --save-dev

echo "2) Build the web app (Vite production build)"
npm run build || {
  echo "Failed to build web app. Make sure frontend builds successfully first." >&2
  exit 1
}

echo "3) Initialize Capacitor app (if not already initialized)"
if [ ! -f capacitor.config.json ]; then
  npx cap init kyc-app com.example.kyc
fi

echo "4) Add Android platform (if not already added)"
if [ ! -d android ]; then
  npx cap add android
fi

echo "5) Copy web assets into native project"
npx cap copy android

echo "Now you can open the Android project in Android Studio with:\n  npx cap open android\nOr assemble a release APK (requires Android SDK/JDK):\n  cd android && ./gradlew assembleRelease\nThe assembled APK will be under android/app/build/outputs/apk/"
