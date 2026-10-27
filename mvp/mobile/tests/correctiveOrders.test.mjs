import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
const source=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('anomalia só gera corretiva após confirmação, por transação e com TAG',()=>{
  const service=source('src/correctiveOrders.ts');
  const ui=source('src/RoutesScreen.tsx');
  assert.ok(service.includes("item.status!=='anomaly'"));
  assert.ok(service.includes('item.recorded_at'));
  assert.ok(service.includes("SELECT order_id FROM route_corrective_links WHERE item_id=?"));
  assert.ok(service.includes('db.withExclusiveTransactionAsync'));
  assert.ok(service.includes('SELECT id FROM assets WHERE id=?'));
  assert.ok(service.includes("recurrence_days,due_date,status,created_at,updated_at)"));
  assert.ok(service.includes("VALUES(?,?,?,?,?,?,0,?,'pending',?,?)"));
  assert.ok(ui.includes("Alert.alert('Criar OS corretiva?'"));
  assert.ok(ui.includes('Confirmar criação da OS'));
  assert.ok(ui.includes('Segurança'));
});
test('uma ocorrência acompanha a OS sem finalizar rota ou apagar registros',()=>{
  const db=source('src/db.ts');
  const route=source('src/routes.ts');
  const ui=source('src/RoutesScreen.tsx');
  assert.ok(db.includes('item_id TEXT PRIMARY KEY NOT NULL REFERENCES route_run_items(id) ON DELETE CASCADE'));
  assert.ok(db.includes('order_id TEXT NOT NULL UNIQUE REFERENCES work_orders(id) ON DELETE CASCADE'));
  assert.ok(route.includes("SELECT order_id FROM route_corrective_links WHERE item_id=?"));
  assert.ok(ui.includes('Ocorrências registradas'));
  assert.ok(ui.includes('OS concluída'));
  assert.ok(ui.includes('não elimina automaticamente a pendência da rota'));
});
test('backup v11 exporta e restaura vínculos em ordem de dependências',()=>{
  const backup=source('src/backup.ts');
  const db=source('src/db.ts');
  const validator=source('src/backupValidation.ts');
  assert.ok(backup.includes('version: 12'));
  assert.ok(backup.includes('route_corrective_links: rows.route_corrective_links'));
  assert.ok(db.includes('SELECT * FROM route_corrective_links'));
  assert.ok(db.includes("DELETE FROM route_corrective_links"));
  assert.ok(db.includes('INSERT INTO route_corrective_links(item_id,order_id,created_at)'));
  assert.ok(db.indexOf('for (const link of data.route_corrective_links')>
    db.indexOf('for (const o of data.work_orders)'));
  assert.ok(validator.includes('Vínculo de OS corretiva inválido'));
});
