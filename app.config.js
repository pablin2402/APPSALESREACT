export default () => ({
  name: "Imcabez",
  slug: "cellphoneapp",
  version: "1.0.0",
  orientation: "portrait",
  userInterfaceStyle: "light",
  icon: "./icons/aplicaciones.png",
  updates: {
    fallbackToCacheTimeout: 0
  },
  splash: {
      image: "./icons/splash.png",
      resizeMode: "cover",
      backgroundColor: "#C43B37"
    },
  assetBundlePatterns: ["**/*"],
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.tesis.cellphoneapp",
    config: {
      googleMapsApiKey: "AIzaSyCW710mvm2N7d2LD1YlgjIgyxKMiyP2E2I"
    }
  },
  android: {
    edgeToEdge: true,
    package: "com.tesis.cellphoneapp",
    permissions: [
      "INTERNET",
      "ACCESS_NETWORK_STATE",
      "ACCESS_FINE_LOCATION",
      "ACCESS_COARSE_LOCATION"
    ],
    statusBar: {
      backgroundColor: "#D3423E",
      translucent: true
    },  
    adaptiveIcon: {
        foregroundImage: "./icons/adaptive-icon.png",
        backgroundColor: "#C43B37"
    },
    config: {
      googleMaps: {
        apiKey: "AIzaSyCW710mvm2N7d2LD1YlgjIgyxKMiyP2E2I"
      },
      networkSecurityConfig: "./assets/network_security_config.xml"
    }
  },
  extra: {
    eas: {
      projectId: "4c8091a4-f0dc-4ba5-8005-d7a8bbc0c4bc"
    }
  },
  plugins: [
    [
      "expo-build-properties",
      {
        "android": {
          "usesCleartextTraffic": true
        }
      }
    ],
    [
      "expo-location",
      {
        "locationAlwaysAndWhenInUsePermission": "Permitir a la app acceder a tu ubicación para mostrar mapas y rutas."
      }
    ]
  ]
});