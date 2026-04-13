// --- Types ---
export type RfqStatus = 'draft' | 'published' | 'quoted' | 'closed';
export type QuoteStatus = 'sent' | 'accepted' | 'rejected';
export type OrderStatus = 'confirmed' | 'in_progress' | 'shipped' | 'received';
export type PaymentStatus = 'pending' | 'invoiced' | 'partially_paid' | 'paid' | 'overdue';

export interface KPI {
  label: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon?: string;
}

export interface RFQ {
  id: number;
  title: string;
  status: RfqStatus;
  created: string;
  deadline: string;
  positions: number;
  quotesCount: number;
  buyer?: string;
  totalVolume?: string;
}

export interface Supplier {
  id: number;
  name: string;
  city: string;
  rating: number;
  inn?: string;
}

export interface Material {
  id: number;
  name: string;
  category: string;
  unit: string;
  minOrder: string;
  gost?: string;
}

export interface Quote {
  id: number;
  rfqId: number;
  supplier: Supplier;
  price: number;
  nds: boolean;
  minVolume: string;
  stock: string;
  deliveryDays: number;
  status: QuoteStatus;
  validUntil?: string;
}

export interface Order {
  id: number;
  rfqId: number;
  supplier: string;
  total: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  created: string;
  deliveryDate?: string;
  items: { name: string; qty: string; price: string; sum?: string }[];
}

export interface Activity {
  id: number;
  text: string;
  time: string;
  type?: 'info' | 'success' | 'warning' | 'error';
}

// --- Mock Data ---
export const suppliers: Supplier[] = [
  { id: 1, name: 'ПАО «Северсталь-Метиз»', city: 'Череповец', rating: 4.9, inn: '3528000597' },
  { id: 2, name: 'ООО «Уралхимпласт»', city: 'Нижний Тагил', rating: 4.7, inn: '6623000782' },
  { id: 3, name: 'АО «Сибирский цемент»', city: 'Новосибирск', rating: 4.6, inn: '5407270287' },
  { id: 4, name: 'ООО «ТД Балтийская сталь»', city: 'Санкт-Петербург', rating: 4.8, inn: '7802456123' },
  { id: 5, name: 'ПАО «Новолипецкий МК»', city: 'Липецк', rating: 4.9, inn: '4823006703' },
];

export const materials: Material[] = [
  { id: 1, name: 'Арматура А500С ∅12 мм', category: 'Металлопрокат', unit: 'тонна', minOrder: '5 т', gost: 'ГОСТ 34028-2016' },
  { id: 2, name: 'Труба проф. 60×40×3 мм', category: 'Металлопрокат', unit: 'тонна', minOrder: '2 т', gost: 'ГОСТ 30245-2003' },
  { id: 3, name: 'Лист г/к ст3сп 4×1500×6000', category: 'Металлопрокат', unit: 'тонна', minOrder: '3 т', gost: 'ГОСТ 19903-2015' },
  { id: 4, name: 'Портландцемент ЦЕМ I 42,5Н', category: 'Стройматериалы', unit: 'тонна', minOrder: '20 т', gost: 'ГОСТ 31108-2020' },
  { id: 5, name: 'Щебень гр. фр. 5–20 мм', category: 'Стройматериалы', unit: 'м³', minOrder: '50 м³', gost: 'ГОСТ 8267-93' },
  { id: 6, name: 'Кабель ВВГнг(А)-LS 3×2,5', category: 'Электрика', unit: 'м', minOrder: '500 м', gost: 'ГОСТ 31996-2012' },
  { id: 7, name: 'Полиэтилен ПНД ПЭ100 SDR17', category: 'Полимеры', unit: 'тонна', minOrder: '1 т', gost: 'ГОСТ 18599-2001' },
  { id: 8, name: 'Натр едкий технический', category: 'Химия', unit: 'тонна', minOrder: '1 т', gost: 'ГОСТ 2263-79' },
];

export const buyerRfqs: RFQ[] = [
  { id: 1001, title: 'Арматура А500С для ЖК «Речной»', status: 'quoted', created: '04.03.2025', deadline: '18.03.2025', positions: 3, quotesCount: 4, totalVolume: '30 т' },
  { id: 1002, title: 'Профтруба для каркаса цеха №4', status: 'published', created: '07.03.2025', deadline: '21.03.2025', positions: 2, quotesCount: 1, totalVolume: '12 т' },
  { id: 1003, title: 'Цемент и щебень — пл. Q2-2025', status: 'draft', created: '10.03.2025', deadline: '—', positions: 5, quotesCount: 0, totalVolume: '280 т' },
  { id: 1004, title: 'Кабельная продукция объект «Ладога»', status: 'closed', created: '12.02.2025', deadline: '26.02.2025', positions: 4, quotesCount: 6, totalVolume: '8 200 м' },
  { id: 1005, title: 'Листовой прокат Q1 пополнение', status: 'quoted', created: '01.03.2025', deadline: '15.03.2025', positions: 6, quotesCount: 3, totalVolume: '45 т' },
];

export const quotes: Quote[] = [
  { id: 1, rfqId: 1001, supplier: suppliers[0], price: 48500, nds: true, minVolume: '5 т', stock: '120 т', deliveryDays: 3, status: 'sent', validUntil: '25.03.2025' },
  { id: 2, rfqId: 1001, supplier: suppliers[1], price: 47200, nds: true, minVolume: '10 т', stock: '85 т', deliveryDays: 5, status: 'sent', validUntil: '22.03.2025' },
  { id: 3, rfqId: 1001, supplier: suppliers[3], price: 49100, nds: true, minVolume: '3 т', stock: '200 т', deliveryDays: 2, status: 'accepted', validUntil: '28.03.2025' },
  { id: 4, rfqId: 1001, supplier: suppliers[4], price: 46800, nds: false, minVolume: '20 т', stock: '50 т', deliveryDays: 7, status: 'rejected', validUntil: '20.03.2025' },
];

export const orders: Order[] = [
  {
    id: 2401, rfqId: 1001, supplier: 'ООО «ТД Балтийская сталь»', total: '1 473 000 ₽', status: 'in_progress', paymentStatus: 'invoiced',
    created: '12.03.2025', deliveryDate: '19.03.2025',
    items: [
      { name: 'Арматура А500С ∅12 мм', qty: '15 т', price: '49 100 ₽/т', sum: '736 500 ₽' },
      { name: 'Арматура А500С ∅16 мм', qty: '10 т', price: '49 800 ₽/т', sum: '498 000 ₽' },
      { name: 'Проволока Вр-1 ∅5 мм', qty: '5 т', price: '47 700 ₽/т', sum: '238 500 ₽' },
    ],
  },
];

export const buyerKPIs: KPI[] = [
  { label: 'Активные запросы', value: '12', change: '+3 за неделю', changeType: 'positive' },
  { label: 'Ожидают ответа', value: '8', change: '2 просрочено', changeType: 'negative' },
  { label: 'Заказы в работе', value: '5', change: 'на 4,2 млн ₽', changeType: 'neutral' },
  { label: 'Ближ. поставка', value: '2 дня', change: 'Балт. сталь · 19.03', changeType: 'neutral' },
];

export const supplierKPIs: KPI[] = [
  { label: 'Новые запросы', value: '18', change: '+5 за сутки', changeType: 'positive' },
  { label: 'КП на рассмотрении', value: '14', change: '3 истекают сегодня', changeType: 'negative' },
  { label: 'К отгрузке', value: '7', change: 'на 3,8 млн ₽', changeType: 'neutral' },
  { label: 'Прайс-лист', value: '1 247', change: 'Обн. 10.03.2025', changeType: 'positive' },
];

export const buyerActivity: Activity[] = [
  { id: 1, text: 'Новое КП от ПАО «Северсталь-Метиз» по запросу #1001', time: '10 мин назад', type: 'info' },
  { id: 2, text: 'Заказ #2401 — статус: «Комплектация на складе»', time: '1 ч назад', type: 'success' },
  { id: 3, text: 'Запрос #1003 сохранён как черновик', time: '3 ч назад', type: 'info' },
  { id: 4, text: 'Запрос #1004 закрыт — выбран поставщик НЛМК', time: 'Вчера, 16:42', type: 'success' },
  { id: 5, text: 'Срок КП от «Уралхимпласт» истекает завтра', time: 'Вчера, 09:15', type: 'warning' },
];

export const supplierActivity: Activity[] = [
  { id: 1, text: 'Новый RFQ #1002 — профтруба, 12 т, Москва', time: '15 мин назад', type: 'info' },
  { id: 2, text: 'КП #3 принято покупателем — готовить договор', time: '2 ч назад', type: 'success' },
  { id: 3, text: 'Заказ #2401 подтверждён — начать комплектацию', time: '4 ч назад', type: 'warning' },
  { id: 4, text: 'Прайс-лист обновлён: 1 247 позиций, 0 ошибок', time: 'Вчера, 14:20', type: 'info' },
];

export const statusLabels: Record<string, string> = {
  draft: 'Черновик',
  published: 'Опубликован',
  quoted: 'Есть КП',
  closed: 'Закрыт',
  sent: 'Отправлено',
  accepted: 'Принято',
  rejected: 'Отклонено',
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
  in_transit: 'В пути',
  delivered: 'Доставлено',
};

export const categories = ['Все', 'Металлопрокат', 'Стройматериалы', 'Электрика', 'Полимеры', 'Химия'];

export const supplierOffers = [
  { id: 1, material: 'Арматура А500С ∅12 мм', price: '49 100', unit: 'тонна', stock: '200 т', active: true, lastUpdated: '10.03.2025' },
  { id: 2, material: 'Арматура А500С ∅16 мм', price: '49 800', unit: 'тонна', stock: '150 т', active: true, lastUpdated: '10.03.2025' },
  { id: 3, material: 'Проволока Вр-1 ∅5 мм', price: '47 700', unit: 'тонна', stock: '80 т', active: true, lastUpdated: '09.03.2025' },
  { id: 4, material: 'Лист г/к ст3сп 4×1500×6000', price: '55 200', unit: 'тонна', stock: '0 т', active: false, lastUpdated: '05.03.2025' },
  { id: 5, material: 'Труба проф. 60×40×3 мм', price: '62 500', unit: 'тонна', stock: '45 т', active: true, lastUpdated: '10.03.2025' },
  { id: 6, material: 'Швеллер 12П ст3пс5', price: '54 300', unit: 'тонна', stock: '32 т', active: true, lastUpdated: '08.03.2025' },
];

export const deliveries = [
  { id: 1, order: 'ORD-2401', destination: 'Москва, Складской пр-д, д. 15, стр. 2', weight: '15 т', status: 'planned' as const, time: '19.03 · 08:00–12:00', client: 'ООО «СтройКомплект»' },
  { id: 2, order: 'ORD-2403', destination: 'Подольск, ул. Промышленная, д. 8', weight: '8 т', status: 'planned' as const, time: '19.03 · 13:00–16:00', client: 'АО «ПМК-7»' },
  { id: 3, order: 'ORD-2405', destination: 'Химки, Ленинградское ш., д. 120', weight: '22 т', status: 'in_transit' as const, time: '18.03 (в пути)', client: 'ООО «Мегаполис»' },
  { id: 4, order: 'ORD-2407', destination: 'Тула, Промзона «Север», уч. 14', weight: '10 т', status: 'delivered' as const, time: '17.03 — доставлено', client: 'ЗАО «ТулаМет»' },
];
