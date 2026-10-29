/* Prueba persistencia API REST simulada: node tests-persistencia.cjs.
 * No requiere internet, npm ni cuenta Supabase; simula las operaciones HTTP PostgREST.
 */
const ts=require('typescript');
const Module=require('node:module'),fs=require('fs'),path=require('path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const cookies=new Map();
const stubs={cookies:async()=>({get:k=>cookies.has(k)?{value:cookies.get(k)}:undefined,set:(k,v)=>cookies.set(k,v),delete:k=>cookies.delete(k)})};
const root=__dirname,orig=Module._resolveFilename,oldLoad=Module._load;
Module._load=function(request,parent,isMain){
 if(request==='next/headers')return stubs;
 if(request==='server-only')return {};
 return oldLoad.call(this,request,parent,isMain);
};
Module._resolveFilename=function(request,parent,...rest){
 if(request.startsWith('@/'))request=path.resolve(root,request.substring(2));
 return orig.call(this,request,parent,...rest);
};
require.extensions['.ts']=function(m,f){const js=ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;m._compile(js,f);};

process.env.SUPABASE_URL='https://proyecto-prueba.supabase.co';
process.env.SUPABASE_SECRET_KEY='sb_secret_mock-pruebas';
process.env.DEMO_ACCESS_CODE='CLAVE-PRIVADA-UNI-2026';
const table={portal_usuarios:[],portal_sesiones:[],portal_solicitudes:[],portal_eventos:[]};
function user(id,role,email,pass,extras={}){const salt=crypto.randomBytes(16).toString('hex');return {id,role,nombre:id,correo:email,salt,hash:crypto.scryptSync(pass,salt,64).toString('hex'),intentos:0,bloqueado_hasta:null,...extras};}
table.portal_usuarios.push(user('doc1','medico','doctor@test.local','clave123',{cmp:'CMP-1'}),user('doc2','medico','doctor2@test.local','clave456',{cmp:'CMP-2'}),user('pac1','paciente','pac@test.local','paciente123',{dni:'90000001'}));
function match(row,k,ex){if(k==='select'||k==='limit'||k==='order')return true;
 if(k==='or')return /\((.*)\)/.test(ex)&&RegExp.$1.split(',').some(condition=>{const [col,,...rest]=condition.split('.');return String(row[col]??'')===rest.join('.');});
 const [op,...right]=String(ex).split('.');const val=right.join('.');
 if(op==='eq')return String(row[k])===val;
 if(op==='gt')return Date.parse(row[k])>Date.parse(val);
 if(op==='gte')return Date.parse(row[k])>=Date.parse(val);
 throw Error('Operador inesperado '+ex);
}
const calls=[];
globalThis.fetch=async function(raw,opts){const url=new URL(raw),tab=url.pathname.split('/').pop();assert.equal(url.origin,'https://proyecto-prueba.supabase.co');assert.equal(opts.headers.apikey,process.env.SUPABASE_SECRET_KEY);calls.push({tab,method:opts.method});
 let all=table[tab];if(!all)return new Response(JSON.stringify({code:'42P01'}),{status:404});
 const filters=[...url.searchParams.entries()].filter(([k])=>!['select','limit','order'].includes(k));
 const selected=()=>all.filter(r=>filters.every(([k,v])=>match(r,k,v))).map(x=>({...x}));
 let result;
 if(opts.method==='GET'){result=selected();if(url.searchParams.get('order')?.endsWith('.desc'))result.reverse();if(url.searchParams.get('limit'))result=result.slice(0,Number(url.searchParams.get('limit')));if(url.searchParams.get('select')?.includes(',')||url.searchParams.get('select')==='id'){const cols=url.searchParams.get('select').split(',');result=result.map(row=>Object.fromEntries(cols.map(c=>[c,row[c]])));}}
 if(opts.method==='POST'){result=JSON.parse(opts.body);for(const r of result){if(tab==='portal_solicitudes'&&all.some(x=>x.doctor_id===r.doctor_id&&x.patient_id===r.patient_id&&x.estado==='pendiente'))return new Response(JSON.stringify({code:'23505'}),{status:409});all.push({...r,...(tab==='portal_solicitudes'?{creada:new Date().toISOString()}:{}),...(tab==='portal_eventos'?{cuando:new Date().toISOString()}:{}),});}}
 if(opts.method==='PATCH'){result=selected();const patch=JSON.parse(opts.body);for(const r of all)if(filters.every(([k,v])=>match(r,k,v)))Object.assign(r,patch);result=result.map(r=>({...r,...patch}));}
 if(opts.method==='DELETE'){result=selected();table[tab]=all.filter(r=>!filters.every(([k,v])=>match(r,k,v)));}
 if(opts.headers.Prefer!=='return=representation'&&opts.method!=='GET')return new Response(null,{status:204});
 return new Response(JSON.stringify(result),{status:200,headers:{'content-type':'application/json'}});
};
(async()=>{try{
 const a=require('./lib/server/auth.ts');const doc=table.portal_usuarios[0],doc2=table.portal_usuarios[1],patient=table.portal_usuarios[2];
 assert.ok(!(await a.authenticate(doc.correo,'clave123','medico','CMP-1','incorrecto')).token);
 assert.equal(calls.length,0,'Código invitación rechaza antes de consultar la BD');
 const login=await a.authenticate(doc.correo,'clave123','medico','CMP-1',process.env.DEMO_ACCESS_CODE);assert.ok(login.token);await a.setSession(login.token);assert.equal((await a.session()).id,doc.id);
 assert.equal(await a.hasPermission(doc,'90000001'),false);
 await a.requestAccess(doc,'90000001','Continuidad asistencial para prueba sintética');
 let req=(await a.userRequests(patient))[0];assert.equal(req.estado,'pendiente');
 await a.decide(patient,req.id,'aprobar',1);assert.equal(await a.hasPermission(doc,'90000001'),true);assert.equal(await a.hasPermission(doc2,'90000001'),false);
 await a.registerAccess(doc,patient.id,true);assert.ok((await a.userEvents(patient)).some(e=>e.accion==='historia_consultada'));
 await a.decide(patient,req.id,'revocar');assert.equal(await a.hasPermission(doc,'90000001'),false);
 await assert.rejects(()=>a.decide(patient,req.id,'revocar'));
 await a.endSession();assert.equal(await a.session(),null);
 assert.equal(a.checkOrigin({headers:{get:k=>k==='origin'?'https://malo.example':null},url:'https://mi-app.com/api/portal/login'}),false);
 assert.ok(calls.some(x=>x.tab==='portal_solicitudes'&&x.method==='PATCH'));
 console.log('OK: persistencia remota simulada, segundo factor demo, login, cookie, solicitudes, autorización, revocación, aislamiento entre médicos y auditoría.');
}finally{/* Restituir únicamente al salir del test. */}})().catch(e=>{console.error(e);process.exitCode=1;});
