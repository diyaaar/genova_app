import { defineRailway, project, service } from 'railway/iac';

// Preparation only: no database, bucket, domain, repository source or secrets
// are provisioned here. Review `railway config plan` against a NEW Genova project.
// Never apply this single-service graph to a project containing unrelated resources.
export default defineRailway(() => {
  const web = service('genova-app', {
    build: 'pnpm build && node scripts/prepare-standalone.mjs',
    start: 'HOSTNAME=0.0.0.0 node .next/standalone/server.js',
    healthcheck: '/login',
    healthcheckTimeout: 120,
    replicas: 1,
    deploy: {
      sleepApplication: true,
      restartPolicyType: 'ON_FAILURE',
      restartPolicyMaxRetries: 3,
    },
  });

  return project('genova', { resources: [web] });
});
