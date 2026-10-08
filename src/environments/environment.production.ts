export const environment = {
  production: true,
  apiUrl: "/api",
  wsUrl: "/ws",
  auth: {
    storageType: 'cookie' as const,
    cookieFallback: true
  }
};
