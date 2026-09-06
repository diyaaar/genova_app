import { createHandler } from './handler.ts';

Deno.serve(createHandler({
  apiKey: Deno.env.get('GENOVA_RESEND_INBOUND_KEY'),
  webhookSecret: Deno.env.get('GENOVA_RESEND_WEBHOOK_SECRET'),
  forwardTo: Deno.env.get('GENOVA_REPLY_FORWARD_TO'),
}));
