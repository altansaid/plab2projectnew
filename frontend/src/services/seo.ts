export const siteUrl = 'https://plab2practice.com';
export const siteName = 'PLAB 2 Practice';
export const defaultDescription = 'Practice PLAB 2 exam scenarios with real-time sessions, feedback, and analytics. Prepare effectively for PLAB 2 with our interactive platform.';
export const defaultImage = `${siteUrl}/og-image.png`;

export const buildCanonical = (path: string) => {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${siteUrl}${normalized}`;
};

export const buildOgImage = (imagePath?: string) => {
  if (!imagePath) return defaultImage;
  if (imagePath.startsWith('http')) return imagePath;
  const normalized = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
  return `${siteUrl}${normalized}`;
};

export const seoConfig = {
  home: {
    title: 'PLAB 2 Practice – Online Practice Sessions, Cases, and Feedback',
    description: 'Prepare for PLAB 2 with interactive practice sessions, real clinical cases, role-based scenarios, and detailed feedback. Build confidence and track progress.',
    canonical: siteUrl,
  },
  login: {
    title: 'Login - PLAB 2 Practice',
    description: 'Sign in to your PLAB 2 Practice account to access practice sessions and track your progress.',
    robots: 'noindex, follow',
  },
  register: {
    title: 'Create Account - PLAB 2 Practice',
    description: 'Join PLAB 2 Practice for free. Create your account and start preparing for PLAB 2 exam with interactive sessions.',
    robots: 'noindex, follow',
  },
  dashboard: {
    title: 'Dashboard - PLAB 2 Practice',
    description: 'View your practice history, track progress, and manage your PLAB 2 preparation journey.',
    robots: 'noindex, nofollow',
  },
  profile: {
    title: 'My Profile - PLAB 2 Practice',
    description: 'Manage your PLAB 2 Practice account settings and profile information.',
    robots: 'noindex, nofollow',
  },
};

export const keywords = [
  'PLAB 2',
  'PLAB 2 practice',
  'PLAB 2 exam',
  'medical exam preparation',
  'clinical skills',
  'OSCE practice',
  'UK medical license',
  'GMC registration',
  'PLAB 2 cases',
  'PLAB 2 stations',
];
