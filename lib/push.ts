import webpush from 'web-push';
import type { SupabaseClient } from '@supabase/supabase-js';

// Configure VAPID once per lambda. The subject must be a mailto: or https URL.
let configured = false;
function configure() {
  if (configured) return;
  const raw = process.env.VAPID_EMAIL ?? '';
  const subject = raw.startsWith('mailto:') || raw.startsWith('http') ? raw : `mailto:${raw || 'admin@example.com'}`;
  webpush.setVapidDetails(
    subject,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  configured = true;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

interface SubRow {
  id: string;
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

/**
 * Send a web-push notification to every registered device for a user.
 * Prunes subscriptions the push service reports as gone (404/410).
 * Requires a service-role Supabase client (reads/deletes across users).
 */
export async function sendPushToUser(
  db: SupabaseClient,
  userId: string,
  payload: PushPayload,
): Promise<{ sent: number; pruned: number }> {
  configure();

  const { data: subs } = await db
    .from('push_subscriptions')
    .select('id, endpoint, keys')
    .eq('user_id', userId);

  let sent = 0;
  let pruned = 0;

  await Promise.all(((subs as SubRow[] | null) ?? []).map(async (s) => {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: s.keys },
        JSON.stringify(payload),
      );
      sent++;
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        await db.from('push_subscriptions').delete().eq('id', s.id);
        pruned++;
      } else {
        console.error('push send failed', status, err);
      }
    }
  }));

  return { sent, pruned };
}
