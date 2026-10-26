import test from 'node:test';
import assert from 'node:assert/strict';
import {sameRecordCounts,totalRecords} from '../src/maintenancePlan.ts';

const before={assets:120,workOrders:43,executions:212,routes:14,routeRuns:80,photos:301};
test('manutenção não destrutiva confere todas as contagens',()=>{
 assert.equal(sameRecordCounts(before,{...before}),true);
 assert.equal(sameRecordCounts(before,{...before,photos:300}),false);
 assert.equal(sameRecordCounts(before,{...before,executions:211}),false);
});
test('nenhum dado anterior é ignorado na soma',()=>{
 assert.equal(totalRecords(before),770);
 assert.equal(sameRecordCounts(before,{...before,routes:-1}),false);
});
