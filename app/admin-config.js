// Paste the web-app config from a NEW Firebase project here (see ADMIN-SETUP.md).
// Web config is public. Never put passwords, service-account keys, or private tokens here.
export const config = {apiKey:'',authDomain:'',projectId:'',appId:''};
export const configured = !!(config.apiKey && config.authDomain && config.projectId && config.appId && config.projectId !== 'wny-photo-of-the-week');
export const announcements = Object.freeze({none:'',update:'A new WNY 3RD ALARM app update is available. Check Settings for updates.',photos:'Explore our photography in the Gallery tab.',maintenance:'Some app features may be temporarily unavailable during maintenance.',thanks:'Thank you for supporting WNY 3RD ALARM and your local fire departments.'});
export const photoLabels = Object.freeze({'rescue7':'Rescue 7','scene':'On the scene','night':'After dark','engine4':'Engine 4','rescue':'Rescue truck','police':'Buffalo Police'});
export const categories = Object.freeze({'STRUCTURE FIRE':'Structure fire','VEHICLE FIRE':'Vehicle fire','BRUSH FIRE':'Brush fire','OUTSIDE FIRE':'Outside fire','FIRE':'Fire'});
