import { formatDistanceToNowStrict } from 'date-fns';
import { ru } from 'date-fns/locale';
import type { AppRole, NotificationRouteTarget } from '@/types/app';

export function getDefaultRouteForRole(role?: AppRole | null) {
  return role === 'supplier' ? '/supplier' : '/buyer';
}

export function getDashboardMode(role?: AppRole | null): 'buyer' | 'supplier' {
  return role === 'supplier' ? 'supplier' : 'buyer';
}

export function formatDate(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('ru-RU');
}

export function formatDateTime(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString('ru-RU');
}

export function formatCurrency(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return `${Number(value).toLocaleString('ru-RU')} ₽`;
}

export function formatRelativeTime(value?: string | null) {
  if (!value) return '—';
  return formatDistanceToNowStrict(new Date(value), {
    addSuffix: true,
    locale: ru,
  });
}

export function normalizeText(value?: string | null) {
  return value?.trim().toLowerCase() ?? '';
}

export function getNotificationHref(
  role: AppRole | null | undefined,
  entityType: NotificationRouteTarget,
  entityId?: string | null,
) {
  if (!entityId) {
    return getDefaultRouteForRole(role);
  }

  switch (entityType) {
    case 'rfq':
      return role === 'supplier' ? `/supplier/rfq/${entityId}` : `/buyer/rfq/${entityId}`;
    case 'quote':
      return role === 'supplier' ? `/supplier/rfq/${entityId}` : `/buyer/rfq/${entityId}`;
    case 'order':
      return role === 'supplier' ? `/supplier/orders/${entityId}` : `/buyer/orders/${entityId}`;
    case 'shipment':
      return role === 'supplier' ? `/supplier/shipments/${entityId}` : `/buyer/shipments/${entityId}`;
    case 'profile':
      return '/settings/profile';
    case 'company':
      return '/settings/company';
    case 'system':
    default:
      return getDefaultRouteForRole(role);
  }
}
