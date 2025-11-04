export const decodeSecret = (secret: string) => {
  if (/^[A-Fa-f0-9]+$/.test(secret)) return Buffer.from(secret, 'hex');
  if (/^[A-Za-z0-9+/=]+$/.test(secret)) return Buffer.from(secret, 'base64');
  return Buffer.from(secret, 'utf8');
};
