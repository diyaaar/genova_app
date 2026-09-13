const { AndroidConfig, withAndroidManifest, withDangerousMod } = require('expo/config-plugins');
const fs = require('node:fs');
const path = require('node:path');

const ACCEPTANCE_FLAG = 'GENOVA_033_ANDROID_LOOPBACK';
const RESOURCE_NAME = 'genova_033_loopback_network_security';
const RESOURCE_XML = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <base-config cleartextTrafficPermitted="false" />
  <domain-config cleartextTrafficPermitted="true">
    <domain includeSubdomains="false">127.0.0.1</domain>
  </domain-config>
</network-security-config>
`;

function isExactOrigin(value, port) {
  let url;
  try { url = new URL(value); } catch { return false; }
  return url.protocol === 'http:' && url.hostname === '127.0.0.1' && url.port === port
    && !url.username && !url.password && (url.pathname === '/' || url.pathname === '')
    && !url.search && !url.hash;
}

function requireGuardedComposedLoopback(environment = process.env) {
  if (environment[ACCEPTANCE_FLAG] !== '1') return false;
  if (environment.EXPO_PUBLIC_GENOVA_033_ACCEPTANCE !== '1'
    || !isExactOrigin(environment.EXPO_PUBLIC_GENOVA_033_APP_ORIGIN, '18033')
    || !isExactOrigin(environment.EXPO_PUBLIC_SUPABASE_URL, '54321')) {
    throw new Error(`${ACCEPTANCE_FLAG}=1 permits only the exact guarded 033 loopback environment`);
  }
  return true;
}

function withComposedWebViewLoopback(config) {
  const enabled = requireGuardedComposedLoopback();
  config = withAndroidManifest(config, (androidConfig) => {
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(androidConfig.modResults);
    if (enabled) application.$['android:networkSecurityConfig'] = `@xml/${RESOURCE_NAME}`;
    else if (application.$['android:networkSecurityConfig'] === `@xml/${RESOURCE_NAME}`) {
      delete application.$['android:networkSecurityConfig'];
    }
    return androidConfig;
  });
  return withDangerousMod(config, ['android', async (androidConfig) => {
    const resourceDirectory = path.join(androidConfig.modRequest.platformProjectRoot, 'app', 'src', 'main', 'res', 'xml');
    const resourcePath = path.join(resourceDirectory, `${RESOURCE_NAME}.xml`);
    if (enabled) {
      fs.mkdirSync(resourceDirectory, { recursive: true });
      fs.writeFileSync(resourcePath, RESOURCE_XML);
    } else fs.rmSync(resourcePath, { force: true });
    return androidConfig;
  }]);
}

module.exports = withComposedWebViewLoopback;
module.exports.requireGuardedComposedLoopback = requireGuardedComposedLoopback;
