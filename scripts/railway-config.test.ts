import { describe, expect, it } from 'vitest';
import { createRailwayContext, project } from 'railway/iac';
import config from '../.railway/railway';

describe('Railway preparation', () => {
  it('defines only one web service without provisioning a DB, bucket or domain', async () => {
    const definition = await config(createRailwayContext({ command: 'plan', environment: 'staging' }), project);
    expect(definition.name).toBe('genova');
    expect(definition.resources).toHaveLength(1);
    expect(definition.resources?.[0]).toMatchObject({ name: 'genova-app', type: 'service' });
    expect(definition.resources?.[0]).not.toHaveProperty('source');
    expect(definition.resources?.[0]).not.toHaveProperty('domains');
    expect(definition.resources?.[0]).not.toHaveProperty('variables');
  });

  it('packages static assets and uses the standalone server', async () => {
    const definition = await config(createRailwayContext(), project);
    expect(definition.resources?.[0]).toMatchObject({
      build: { buildCommand: 'pnpm build && node scripts/prepare-standalone.mjs' },
      deploy: {
        startCommand: 'HOSTNAME=0.0.0.0 node .next/standalone/server.js',
        healthcheckPath: '/login',
        healthcheckTimeout: 120,
        numReplicas: 1,
        sleepApplication: true,
        restartPolicyMaxRetries: 3,
      },
    });
  });

  it('never runs the shared production database migration during deployment', async () => {
    const definition = await config(createRailwayContext({ environment: 'production' }), project);
    expect(definition.resources?.[0]).not.toHaveProperty('deploy.preDeployCommand');
    expect(JSON.stringify(definition)).not.toMatch(/supabase db|apply_migration|SERVICE_ROLE_KEY/);
  });
});
