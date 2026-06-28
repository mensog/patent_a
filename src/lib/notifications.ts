import { supabase } from '@/integrations/supabase/client';
import type { NotificationType } from '@/types/app';

interface DemoNotificationPayload {
  type?: NotificationType;
  title: string;
  body?: string | null;
  related_entity_id?: string | null;
  related_entity_type?: string | null;
}

export async function createNotificationsForUsers(userIds: string[], payload: DemoNotificationPayload) {
  const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)));

  if (!uniqueUserIds.length) {
    return;
  }

  const rpcPayload = {
    _user_ids: uniqueUserIds,
    _type: payload.type ?? 'system',
    _title: payload.title,
    _body: payload.body ?? null,
    _related_entity_id: payload.related_entity_id ?? null,
    _related_entity_type: payload.related_entity_type ?? payload.type ?? null,
  };

  const { error: rpcError } = await supabase.rpc('notify_users', rpcPayload);

  if (!rpcError) {
    return;
  }

  // Fallback keeps older local/demo databases working before the RPC migration is applied.
  const { error } = await supabase.from('notifications').insert(
    uniqueUserIds.map((userId) => ({
      user_id: userId,
      type: payload.type ?? 'system',
      title: payload.title,
      body: payload.body ?? null,
      related_entity_id: payload.related_entity_id ?? null,
      related_entity_type: payload.related_entity_type ?? payload.type ?? null,
    })),
  );

  if (error) {
    console.warn('Не удалось создать уведомления:', error.message || rpcError.message);
  }
}

export async function createNotificationsForCompanyUsers(companyIds: string[], payload: DemoNotificationPayload) {
  const uniqueCompanyIds = Array.from(new Set(companyIds.filter(Boolean)));

  if (!uniqueCompanyIds.length) {
    return;
  }

  const { error: rpcError } = await supabase.rpc('notify_company_users', {
    _company_ids: uniqueCompanyIds,
    _type: payload.type ?? 'system',
    _title: payload.title,
    _body: payload.body ?? null,
    _related_entity_id: payload.related_entity_id ?? null,
    _related_entity_type: payload.related_entity_type ?? payload.type ?? null,
  });

  if (!rpcError) {
    return;
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .in('company_id', uniqueCompanyIds);

  if (error) {
    console.warn('Не удалось найти получателей уведомлений:', error.message || rpcError.message);
    return;
  }

  await createNotificationsForUsers((data ?? []).map((profile) => profile.id), payload);
}
