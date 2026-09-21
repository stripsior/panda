// Expo resolves the project root to this workspace root, so it looks for the
// app config here. Re-export the mobile app's config (which sets
// extra.router.root — without it release bundles ship without routes).
module.exports = require('./apps/mobile/app.json');
