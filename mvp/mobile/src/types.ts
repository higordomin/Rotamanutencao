export type Category = 'Lubrificação' | 'Mecânica' | 'Elétrica' | 'Inspeção';
export type Priority = 'Baixa' | 'Média' | 'Alta';
export type OrderStatus = 'pending' | 'completed';

export type Asset = {
  id: string;
  code: string;
  name: string;
  area: string;
  created_at: string;
};

export type WorkOrder = {
  id: string;
  title: string;
  description: string;
  category: Category;
  priority: Priority;
  asset_id: string | null;
  asset_name: string | null;
  recurrence_days: number;
  due_date: string;
  status: OrderStatus;
  created_at: string;
  updated_at: string;
};

export type Execution = {
  id: string;
  order_id: string;
  order_title: string;
  notes: string;
  executed_at: string;
  previous_due_date: string;
  next_due_date: string | null;
};

export type AssetDraft = Pick<Asset, 'name' | 'code' | 'area'>;
export type OrderDraft = Pick<WorkOrder,
  'title' | 'description' | 'category' | 'priority' | 'asset_id' | 'recurrence_days' | 'due_date'
>;
