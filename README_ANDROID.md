KYC Arena — Android packaging (Capacitor)
=========================================

This project is a web app (Vite + React) with a Node/Express backend. The easiest way to produce an Android APK from this repo is to wrap the built web app using Capacitor and then build the Android project with Gradle/Android Studio.

Important: I cannot build the final APK here because producing an Android release requires the Android SDK, JDK, and Gradle on your machine.

What I added
- `capacitor.config.json` — Capacitor configuration pointing at `dist/` (the Vite build output).
- `scripts/build_android.sh` — helper script that installs Capacitor, builds the web app, initializes Capacitor (if needed), adds Android platform (if needed), and copies web assets.
- `package.json` scripts to help with typical Capacitor steps (`android:init`, `android:add`, `android:copy`, `android:open`, `android:sync`, `android:assemble`).

Prerequisites (on your machine)
- Node.js (>=16)
- npm/yarn
- Android Studio with SDK & command-line tools installed OR
  Android SDK + Gradle + JDK available in PATH

Quick steps to produce an APK locally

1) Install dependencies

```bash
cd "$(pwd)"
npm install
```

2) Build web assets (production)

```bash
npm run build
```

3) Initialize Capacitor (only once)

```bash
npm run android:init
npx cap init kyc-app com.example.kyc
```

4) Add Android platform (only once)

```bash
npm run android:add
```

5) Copy web assets into the native project

```bash
npm run android:copy
```

6) Open Android Studio and build the APK (recommended)

```bash
npm run android:open
# then use Android Studio to Build > Build Bundle(s) / APK(s) > Build APK(s)
```

Or build from CLI (requires SDK/JDK/Gradle):

```bash
cd android
./gradlew assembleRelease
# the APK will be under android/app/build/outputs/apk/release/
```

Notes & troubleshooting
- If your web app fetches APIs at `/api`, when running as an Android app you must ensure the backend is reachable from the device (use full URL like `https://yourserver` or run the backend on the device/emulator). You can optionally set a runtime config to override API_BASE in the app.
- If you get issues with missing environment variables, set them before running the build or inject via runtime config.
- Capacitor includes plugins for native features — add them as needed.

If you'd like, I can:
- Add a small runtime config to switch API base URL between development and production.
- Attempt to run the full Android Gradle build here, but I will need your confirmation and the environment (Android SDK) present on this machine — usually it's easier for you to run the final step on your machine or in CI.

Happy to help with any of the steps above.
