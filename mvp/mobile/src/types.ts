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

export type OrderEvent = {
  id: string;
  order_id: string;
  event_type: 'blocked' | 'released' | 'executed';
  order_title?: string;
  reason: string;
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
  block_reason: string;
  blocked_at: string | null;
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
  asset_label: string;
  category: string;
  photo_count: number;
};

export type ExecutionPhoto = {
  id: string;
  execution_id: string;
  filename: string;
  mime_type: 'image/jpeg' | 'image/png';
  created_at: string;
};

export type PhotoDraft = {uri: string; mime_type: string};
export type AssetDraft = Pick<Asset, 'name' | 'code' | 'area'>;
export type OrderDraft = Pick<WorkOrder,
  'title' | 'description' | 'category' | 'priority' | 'asset_id' | 'recurrence_days' | 'due_date'
>;

export type BackupData = {
  format: 'rotamanutencao-offline';
  version: 2 | 3;
  exported_at: string;
  assets: Asset[];
  work_orders: Omit<WorkOrder, 'asset_name'>[];
  executions: Omit<Execution, 'photo_count'>[];
  photos: Array<ExecutionPhoto & {base64: string}>;
  order_events?: OrderEvent[];
};
