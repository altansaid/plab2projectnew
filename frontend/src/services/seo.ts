export const siteUrl = 'https://plab2practice.com';

export const buildCanonical = (path: string) => {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${siteUrl}${normalized}`;
};

