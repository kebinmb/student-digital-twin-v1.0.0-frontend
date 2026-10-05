export const environment = {
  production: true,
  apiUrl: "/api",
  auth: {
    storageType: 'cookie' as const,
    cookieFallback: true
  }
};
