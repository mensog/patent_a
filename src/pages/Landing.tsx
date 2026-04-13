import { Link } from 'react-router-dom';
import { ArrowRight, Search, FileText, BarChart3, Truck, Shield, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

const benefits = [
  { icon: <Search className="h-5 w-5" />, title: 'Каталог и поиск', desc: 'Сырьё и промышленные материалы от верифицированных поставщиков. ГОСТ, остатки, минимальные партии — вся информация в одном окне.' },
  { icon: <FileText className="h-5 w-5" />, title: 'RFQ и сравнение КП', desc: 'Создание запросов, автоматический сбор предложений и табличное сравнение цен, сроков и условий поставки.' },
  { icon: <BarChart3 className="h-5 w-5" />, title: 'Аналитика и контроль', desc: 'Дашборды с KPI по закупкам, отслеживание бюджета, сроков и качества поставок в реальном времени.' },
  { icon: <Truck className="h-5 w-5" />, title: 'Логистика и VRP', desc: 'Планирование маршрутов доставки, отслеживание отгрузок и приёмки с полным документооборотом.' },
  { icon: <Shield className="h-5 w-5" />, title: 'Документооборот', desc: 'Счета-фактуры, УПД, ТТН, акты — формирование, хранение и передача документов в электронном виде.' },
  { icon: <Zap className="h-5 w-5" />, title: 'Автоматизация', desc: 'Импорт прайсов из Excel, автоответы на запросы, уведомления по событиям — экономия до 60% рабочего времени.' },
];

const steps = [
  { num: '01', title: 'Сформируйте запрос', desc: 'Укажите наименования, объёмы и сроки — система подберёт подходящих поставщиков.' },
  { num: '02', title: 'Сравните предложения', desc: 'Получите КП от нескольких поставщиков, сравните цены, НДС, сроки и остатки в одной таблице.' },
  { num: '03', title: 'Подтвердите заказ', desc: 'Выберите лучшее предложение, оформите заказ и отслеживайте исполнение до приёмки.' },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-card">
      <nav className="sticky top-0 z-50 flex h-14 items-center justify-between border-b bg-card/95 backdrop-blur-sm px-8">
        <span className="text-sm font-bold text-primary tracking-tight">EcaMarket</span>
        <div className="flex items-center gap-6">
          <a href="#benefits" className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">Возможности</a>
          <a href="#workflow" className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">Как это работает</a>
          <Link to="/buyer">
            <Button size="sm" className="text-xs h-8">Кабинет покупателя</Button>
          </Link>
          <Link to="/supplier">
            <Button size="sm" variant="outline" className="text-xs h-8">Кабинет поставщика</Button>
          </Link>
        </div>
      </nav>

      <section className="mx-auto max-w-4xl px-8 py-24 text-center">
        <div className="inline-block rounded-md bg-primary/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary mb-6">
          B2B-платформа промышленных закупок
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-foreground leading-tight">
          Закупки сырья и материалов<br />
          <span className="text-primary">с полным контролем процесса</span>
        </h1>
        <p className="mt-5 text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          EcaMarket — платформа для промышленных закупок. Запросы, сравнение КП, управление заказами, отгрузки и документооборот — всё в одной системе.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link to="/buyer">
            <Button className="gap-2 text-xs h-9">
              Начать закупки <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
          <Link to="/supplier">
            <Button variant="outline" className="text-xs h-9">
              Для поставщиков
            </Button>
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-8 pb-20">
        <div className="grid grid-cols-3 gap-5">
          {[
            { title: 'Каталог материалов', desc: 'Металлопрокат, химия, стройматериалы — 50 000+ позиций от 1 200 поставщиков с ГОСТ и сертификатами', link: '/buyer/catalog' },
            { title: 'Сравнение КП', desc: 'До 10 предложений на один запрос. Табличное сравнение цен, сроков, остатков и условий НДС', link: '/buyer/rfq/1' },
            { title: 'Панель поставщика', desc: 'Управление прайсами, ответы на RFQ, контроль отгрузок и планирование маршрутов доставки', link: '/supplier' },
          ].map((c, i) => (
            <Link key={i} to={c.link} className="group card-panel p-6 hover:shadow-md transition-shadow">
              <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{c.title}</h3>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{c.desc}</p>
              <span className="mt-4 inline-flex items-center text-xs font-medium text-primary gap-1">
                Открыть <ArrowRight className="h-3 w-3" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section id="benefits" className="bg-background py-20">
        <div className="mx-auto max-w-5xl px-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-foreground">Возможности платформы</h2>
            <p className="mt-2 text-sm text-muted-foreground">Полный цикл промышленных закупок в одной системе</p>
          </div>
          <div className="mt-12 grid grid-cols-3 gap-5">
            {benefits.map((b, i) => (
              <div key={i} className="card-panel p-5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/8 text-primary">{b.icon}</div>
                <h3 className="mt-3 text-sm font-semibold text-foreground">{b.title}</h3>
                <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="workflow" className="py-20">
        <div className="mx-auto max-w-4xl px-8 text-center">
          <h2 className="text-2xl font-bold text-foreground">Как это работает</h2>
          <p className="mt-2 text-sm text-muted-foreground">Три шага до оптимальной закупки</p>
          <div className="mt-12 grid grid-cols-3 gap-8">
            {steps.map(s => (
              <div key={s.num} className="text-left">
                <span className="text-3xl font-bold text-primary/15">{s.num}</span>
                <h3 className="mt-1 text-sm font-semibold text-foreground">{s.title}</h3>
                <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t bg-card py-8">
        <div className="mx-auto max-w-5xl px-8 flex items-center justify-between">
          <span className="text-xs font-semibold text-foreground">EcaMarket</span>
          <span className="text-[11px] text-muted-foreground">© 2025 EcaMarket. Все права защищены.</span>
        </div>
      </footer>
    </div>
  );
}
