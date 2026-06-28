// Status labels used across the app — kept here for backward compatibility
export const statusLabels: Record<string, string> = {
  draft: 'Черновик',
  published: 'Ожидает предложений',
  quoted: 'Есть предложения',
  closed: 'Закупка завершена',
  cancelled: 'Отменён',
  sent: 'Предложение отправлено',
  accepted: 'Выбрано покупателем',
  rejected: 'Не выбрано',
  expired: 'Срок истёк',
  confirmed: 'Заказ подтверждён',
  in_progress: 'Готовится к отгрузке',
  shipped: 'Отправлен покупателю',
  received: 'Получен покупателем',
  pending: 'Ожидает оплаты',
  invoiced: 'Счёт выставлен',
  partially_paid: 'Частично оплачено',
  paid: 'Оплачен',
  overdue: 'Просрочен',
  planned: 'Создана на складе',
  ready: 'Готова к отгрузке',
  in_transit: 'Машина в пути',
  delivered: 'Получено покупателем',
  failed: 'Проблема доставки',
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
