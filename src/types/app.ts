import type { Enums, Tables } from '@/integrations/supabase/types';

export type AppRole = Enums<'app_role'>;
export type CompanyType = Enums<'company_type'>;
export type NotificationType = Enums<'notification_type'>;
export type QuoteStatus = Enums<'quote_status'>;
export type RfqStatus = Enums<'rfq_status'>;
export type ShipmentStatus = Enums<'shipment_status'>;

export type Company = Tables<'companies'>;
export type MaterialCategory = Tables<'material_categories'>;
export type Material = Tables<'materials'>;
export type Notification = Tables<'notifications'>;
export type Order = Tables<'orders'>;
export type OrderItem = Tables<'order_items'>;
export type Profile = Tables<'profiles'>;
export type Quote = Tables<'quotes'>;
export type QuoteItem = Tables<'quote_items'>;
export type Rfq = Tables<'rfqs'>;
export type RfqItem = Tables<'rfq_items'>;
export type Shipment = Tables<'shipments'>;
export type ShipmentItem = Tables<'shipment_items'>;
export type SupplierOffer = Tables<'supplier_offers'>;

export type CompanyPreview = Pick<Company, 'id' | 'name' | 'inn' | 'type'>;
export type MaterialPreview = Pick<Material, 'id' | 'name' | 'sku' | 'unit'>;

export type MaterialWithCategory = Material & {
  material_categories: Pick<MaterialCategory, 'name'> | null;
};

export type SupplierOfferWithMaterial = SupplierOffer & {
  materials: Pick<Material, 'name'> | null;
};

export type SupplierOfferWithCompany = SupplierOffer & {
  companies: Pick<Company, 'name'> | null;
};

export type BuyerOrderListItem = Pick<
  Order,
  'id' | 'order_number' | 'status' | 'payment_status' | 'total_amount' | 'created_at'
> & {
  companies: Pick<Company, 'name'> | null;
};

export type OrderWithCompanies = Order & {
  companies: Pick<Company, 'name'> | null;
  buyer: Pick<Company, 'name'> | null;
};

export type ShipmentWithOrder = Shipment & {
  orders: (Pick<Order, 'order_number' | 'delivery_address' | 'buyer_company_id' | 'created_by'> & {
    companies: Pick<Company, 'name'> | null;
  }) | null;
};

export type ShipmentItemWithOrderItem = ShipmentItem & {
  order_items: Pick<OrderItem, 'material_name' | 'unit'> | null;
};

export type SupplierRfqListItem = Pick<
  Rfq,
  'id' | 'title' | 'status' | 'needed_by' | 'created_at' | 'buyer_company_id' | 'description'
> & {
  companies: Pick<Company, 'name'> | null;
};

export type RfqWithBuyerCompany = Rfq & {
  companies: Pick<Company, 'name' | 'inn'> | null;
};

export type RfqItemWithMaterial = RfqItem & {
  materials: Pick<Material, 'name'> | null;
};

export type QuoteWithCompany = Quote & {
  companies: Pick<Company, 'name'> | null;
  quote_items?: QuoteItem[];
};

export type NotificationRouteTarget = NotificationType | 'profile' | 'company';

export interface SearchResultItem {
  id: string;
  label: string;
  description: string;
  href: string;
  group: string;
}
