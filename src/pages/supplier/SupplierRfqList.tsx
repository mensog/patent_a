import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/DashboardLayout';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { formatDate } from '@/lib/app-utils';
import type { Quote, SupplierRfqListItem } from '@/types/app';

type QuotePreview = Pick<Quote, 'id' | 'rfq_id' | 'status' | 'total_amount' | 'created_at'>;

function getRequestHint(rfqStatus: string, quote?: QuotePreview) {
  if (quote?.status === 'accepted') return 'Ваше предложение выбрано, можно готовить заказ';
  if (quote?.status === 'sent') return 'Предложение отправлено, ждём решение покупателя';
  if (quote?.status === 'draft') return 'Черновик предложения — нужно отправить покупателю';
  if (quote?.status === 'rejected') return 'Покупатель выбрал другого поставщика';
  if (rfqStatus === 'closed') return 'Закупка завершена';
  if (rfqStatus === 'cancelled') return 'Покупатель отменил закупку';
  return 'Нужно подготовить коммерческое предложение';
}

export default function SupplierRfqList() {
  const { profile } = useAuth();
  const companyId = profile?.company_id;

  const { data, isLoading, error } = useQuery({
    queryKey: ['supplier-rfq-list-with-quotes', companyId],
    queryFn: async () => {
      if (!companyId) return { rfqs: [] as SupplierRfqListItem[], quotesByRfqId: {} as Record<string, QuotePreview> };

      const { data: invites, error: invitesError } = await supabase
        .from('rfq_suppliers')
        .select('rfq_id')
        .eq('supplier_company_id', companyId);

      if (invitesError) throw invitesError;
      if (!invites?.length) return { rfqs: [] as SupplierRfqListItem[], quotesByRfqId: {} as Record<string, QuotePreview> };

      const rfqIds = invites.map((item) => item.rfq_id);
      const [{ data: rfqRows, error: rfqError }, { data: quoteRows, error: quoteError }] = await Promise.all([
        supabase
          .from('rfqs')
          .select('id, title, status, needed_by, created_at, buyer_company_id, description, companies!rfqs_buyer_company_id_fkey(name)')
          .in('id', rfqIds)
          .order('created_at', { ascending: false }),
        supabase
          .from('quotes')
          .select('id, rfq_id, status, total_amount, created_at')
          .eq('supplier_company_id', companyId)
          .in('rfq_id', rfqIds),
      ]);

      if (rfqError) throw rfqError;
      if (quoteError) throw quoteError;

      const quotesByRfqId = (quoteRows ?? []).reduce<Record<string, QuotePreview>>((acc, quote) => {
        acc[quote.rfq_id] = quote as QuotePreview;
        return acc;
      }, {});

      return {
        rfqs: (rfqRows ?? []) as SupplierRfqListItem[],
        quotesByRfqId,
      };
    },
    enabled: !!companyId,
  });

  const rfqs = data?.rfqs ?? [];
  const quotesByRfqId = data?.quotesByRfqId ?? {};

  return (
    <DashboardLayout mode="supplier">
      <div className="space-y-6">
        <div>
          <h1 className="page-title">Запросы покупателей на закупку (RFQ)</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Здесь показаны только запросы, куда пригласили вашу компанию. RFQ — это запрос покупателя на коммерческое предложение.
          </p>
        </div>

        <div className="card-panel">
          {isLoading ? (
            <p className="py-16 text-center text-sm text-muted-foreground">Загрузка…</p>
          ) : error ? (
            <p className="py-16 text-center text-sm text-destructive">Не удалось загрузить запросы покупателей.</p>
          ) : rfqs.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">Покупатели пока не приглашали вашу компанию в закупки</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="table-header px-5 py-3 text-left">Что хочет купить покупатель</th>
                  <th className="table-header px-5 py-3 text-left">Покупатель</th>
                  <th className="table-header px-5 py-3 text-left">Что от вас требуется</th>
                  <th className="table-header px-5 py-3 text-center">Состояние закупки</th>
                  <th className="table-header px-5 py-3 text-right">Срок поставки</th>
                  <th className="table-header px-5 py-3 text-right">Действие</th>
                </tr>
              </thead>
              <tbody>
                {rfqs.map((rfq) => {
                  const quote = quotesByRfqId[rfq.id];
                  return (
                    <tr key={rfq.id} className="border-b last:border-0 hover:bg-muted/40 transition-colors">
                      <td className="px-5 py-3.5">
                        <Link to={`/supplier/rfq/${rfq.id}`} className="font-medium text-foreground transition-colors hover:text-primary">
                          {rfq.title}
                        </Link>
                        {rfq.description && <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{rfq.description}</p>}
                      </td>
                      <td className="px-5 py-3.5 text-muted-foreground">{rfq.companies?.name ?? '—'}</td>
                      <td className="px-5 py-3.5 text-muted-foreground">{getRequestHint(rfq.status, quote)}</td>
                      <td className="px-5 py-3.5 text-center"><StatusBadge status={quote?.status ?? rfq.status} /></td>
                      <td className="px-5 py-3.5 text-right text-muted-foreground">{formatDate(rfq.needed_by)}</td>
                      <td className="px-5 py-3.5 text-right">
                        <Button asChild size="sm" variant={quote?.status === 'sent' || quote?.status === 'accepted' ? 'outline' : 'default'} className="h-8 text-xs">
                          <Link to={`/supplier/rfq/${rfq.id}`}>
                            {quote ? 'Открыть предложение' : 'Ответить покупателю'}
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
