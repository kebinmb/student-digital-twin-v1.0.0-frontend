export const environment = {
  production: false,
  apiUrl: "/api",
  wsUrl: "/ws",
  auth: {
    storageType: 'localStorage' as const,
    cookieFallback: true
  }
};
