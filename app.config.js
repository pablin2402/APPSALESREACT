export default () => ({
    name: "cellphoneapp",
    slug: "cellphoneapp",
    version: "1.0.0",
    orientation: "portrait",
    userInterfaceStyle: "light",
    icon: "./icons/aplicaciones.png",

    updates: {
      fallbackToCacheTimeout: 0
    },
    assetBundlePatterns: ["**/*"],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.tesis.cellphoneapp"
    },
    android: {
      edgeToEdge: true,
      package: "com.tesis.cellphoneapp",
      permissions: []
    },
    extra: {
        eas: {
          projectId: "4c8091a4-f0dc-4ba5-8005-d7a8bbc0c4bc"
        }
    },
    plugins: [] 
  });
  