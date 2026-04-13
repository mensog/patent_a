// Status labels used across the app — kept here for backward compatibility
export const statusLabels: Record<string, string> = {
  draft: 'Черновик',
  published: 'Опубликован',
  quoted: 'Есть КП',
  closed: 'Закрыт',
  cancelled: 'Отменён',
  sent: 'Отправлено',
  accepted: 'Принято',
  rejected: 'Отклонено',
  expired: 'Истёк',
  confirmed: 'Подтверждён',
  in_progress: 'В работе',
  shipped: 'Отгружен',
  received: 'Получен',
  pending: 'Ожидание',
  invoiced: 'Счёт выставлен',
  partially_paid: 'Част. оплата',
  paid: 'Оплачен',
  overdue: 'Просрочен',
  planned: 'Запланировано',
  ready: 'Готов',
  in_transit: 'В пути',
  delivered: 'Доставлено',
  failed: 'Ошибка',
};

// KPI type — used by KPICard
export interface KPI {
  label: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
}

// Activity type — used by ActivityFeed
export interface Activity {
  id: number | string;
  text: string;
  time: string;
  type?: 'info' | 'success' | 'warning' | 'error';
}
