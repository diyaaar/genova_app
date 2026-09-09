const { AndroidConfig, withAndroidManifest, withDangerousMod } = require('expo/config-plugins');
const fs = require('node:fs');
const path = require('node:path');

const ACCEPTANCE_FLAG = 'GENOVA_021_ANDROID_LOOPBACK';
const RESOURCE_NAME = 'genova_021_loopback_network_security';
const RESOURCE_XML = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <base-config cleartextTrafficPermitted="false" />
  <domain-config cleartextTrafficPermitted="true">
    <domain includeSubdomains="false">127.0.0.1</domain>
    <domain includeSubdomains="false">localhost</domain>
  </domain-config>
</network-security-config>
`;

function requireGuardedLoopbackEnvironment(environment = process.env) {
  if (environment[ACCEPTANCE_FLAG] !== '1') {
    return false;
  }

  const rawUrl = environment.EXPO_PUBLIC_SUPABASE_URL;
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error(`${ACCEPTANCE_FLAG}=1 requires a valid EXPO_PUBLIC_SUPABASE_URL`);
  }

  const loopback = url.hostname === '127.0.0.1' || url.hostname === 'localhost';
  if (url.protocol !== 'http:' || !loopback || url.port !== '54321') {
    throw new Error(`${ACCEPTANCE_FLAG}=1 permits only http://127.0.0.1:54321 or localhost`);
  }

  return true;
}

function withLocalLoopbackNetwork(config) {
  const enabled = requireGuardedLoopbackEnvironment();

  config = withAndroidManifest(config, (androidConfig) => {
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(
      androidConfig.modResults,
    );
    if (enabled) {
      application.$['android:networkSecurityConfig'] = `@xml/${RESOURCE_NAME}`;
    } else if (application.$['android:networkSecurityConfig'] === `@xml/${RESOURCE_NAME}`) {
      delete application.$['android:networkSecurityConfig'];
    }
    return androidConfig;
  });

  return withDangerousMod(config, [
    'android',
    async (androidConfig) => {
      const resourceDirectory = path.join(
        androidConfig.modRequest.platformProjectRoot,
        'app',
        'src',
        'main',
        'res',
        'xml',
      );
      const resourcePath = path.join(resourceDirectory, `${RESOURCE_NAME}.xml`);
      if (enabled) {
        fs.mkdirSync(resourceDirectory, { recursive: true });
        fs.writeFileSync(resourcePath, RESOURCE_XML);
      } else {
        fs.rmSync(resourcePath, { force: true });
      }
      return androidConfig;
    },
  ]);
}

module.exports = withLocalLoopbackNetwork;
module.exports.requireGuardedLoopbackEnvironment = requireGuardedLoopbackEnvironment;
