export function requireSetting(name, minimumLength = 1) {
  const value = process.env[name];
  if (!value || value.length < minimumLength) throw new Error(`${name} must be configured with at least ${minimumLength} characters`);
  return value;
}

export const jwtSecret = () => requireSetting('JWT_SECRET', 32);
export const databaseUrl = () => requireSetting('DATABASE_URL');
