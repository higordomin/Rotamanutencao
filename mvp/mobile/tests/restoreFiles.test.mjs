import test from 'node:test';
import assert from 'node:assert/strict';
import {stagePhotos} from '../src/restoreFiles.ts';
const sample=[{id:'a',mime_type:'image/jpeg',base64:'abc'},{id:'b',mime_type:'image/png',base64:'def'}];
test('estágio mapeia fotos após escrita bem sucedida', async () => {
  const written=[];
  const result=await stagePhotos(sample,(_,i)=>'photo',async (n,b64)=>written.push([n,b64]),async()=>{});
  assert.equal(result.created.length,2);
  assert.deepEqual(written.map(x=>x[1]),['abc','def']);
  assert.equal(result.filenames.size,2);
});
test('falha no segundo arquivo elimina também cópia parcial', async () => {
  let n=0;const written=[],deleted=[];
  await assert.rejects(stagePhotos(sample,()=>`photo${++n}.jpg`,async name=>{written.push(name);if(n===2)throw Error('storage full')},async name=>deleted.push(name)),/storage full/);
  assert.deepEqual(written,['photo1.jpg','photo2.jpg']);
  assert.deepEqual(deleted,['photo1.jpg','photo2.jpg']);
});
test('falha na limpeza não mascara erro original', async () => {
  await assert.rejects(stagePhotos(sample,()=> 'x',async()=>{throw Error('failed write')},async()=>{throw Error('cleanup unavailable')}),/failed write/);
});
