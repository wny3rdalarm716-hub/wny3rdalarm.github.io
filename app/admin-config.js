
// WNY 3RD ALARM V2.4 Admin Configuration

export const config = {
  apiKey: "AIzaSyBtKHkJ-W4ilUUViPYS0RgTUMIoW4lj5jE",
  authDomain: "wny-3rd-alarm-admin.firebaseapp.com",
  projectId: "wny-3rd-alarm-admin",
  storageBucket: "wny-3rd-alarm-admin.firebasestorage.app",
  messagingSenderId: "151707007448",
  appId: "1:151707007448:web:cb4cb845483a1979f05aad",
  measurementId: "G-R469KT5S5M"
};

export const configured = !!(
  config.apiKey &&
  config.authDomain &&
  config.projectId &&
  config.appId &&
  config.projectId !== 'wny-photo-of-the-week'
);

export const announcements = Object.freeze({
  none: '',
  update: 'A new WNY 3RD ALARM app update is available. Check Settings for updates.',
  photos: 'Explore our photography in the Gallery tab.',
  maintenance: 'Some app features may be temporarily unavailable during maintenance.',
  thanks: 'Thank you for supporting WNY 3RD ALARM and your local fire departments.'
});

export const photoLabels = Object.freeze({
  rescue7: 'Rescue 7',
  scene: 'On the scene',
  night: 'After dark',
  engine4: 'Engine 4',
  rescue: 'Rescue truck',
  police: 'Buffalo Police'
});

export const categories = Object.freeze({
  'STRUCTURE FIRE': 'Structure fire',
  'VEHICLE FIRE': 'Vehicle fire',
  'BRUSH FIRE': 'Brush fire',
  'OUTSIDE FIRE': 'Outside fire',
  'FIRE': 'Fire'
});
