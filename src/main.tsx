import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Session } from "@supabase/supabase-js";
import {
  AirVent, Home, Users, ClipboardList, DollarSign, CalendarDays, Settings,
  Plus, Menu, Search, MessageCircle, Bell, ChevronRight, X, CheckCircle2,
  Building2, Pencil, Trash2, Save, LogOut, Lock, Mail, UserRound, ShieldCheck,
  FileText, Wrench, Receipt, ImagePlus, Camera, BarChart3, Download
} from "lucide-react";
import { supabase, supabaseConfigured } from "./supabase";
import "./styles.css";

type Company={id:string;owner_id:string;name:string;cnpj:string;phone:string;email:string;address:string;city:string;logo_data:string};
type Client={id:string;owner_id:string;name:string;phone:string;email:string;address:string;city:string;notes:string};
type Equipment={id:string;owner_id:string;client_id:string;brand:string;model:string;btu:string;type:string;gas:string;serial:string;location:string;install_date:string|null;notes:string};
type Service={id:string;owner_id:string;client_id:string;equipment_id:string|null;quote_id:string|null;number:string;date:string;time:string;status:string;problem:string;diagnosis:string;solution:string;parts:string;parts_total:number;labor:number;travel:number;discount:number;total:number;notes:string};
type Quote={id:string;owner_id:string;client_id:string;equipment_id:string|null;number:string;date:string;valid_until:string|null;discount:number;status:string;notes:string};
type QuoteItem={id:string;owner_id:string;quote_id:string;description:string;type:string;quantity:number;unit_price:number};
type Photo={id:string;owner_id:string;entity_type:string;entity_id:string;storage_path:string;caption:string;category:string;created_at:string};

const money=(n:number)=>Number(n||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const today=()=>new Date().toISOString().slice(0,10);
const fmt=(v:string|null|undefined)=>v?new Date(v+"T12:00:00").toLocaleDateString("pt-BR"):"—";
const emptyCompany:Company={id:"",owner_id:"",name:"Minha Empresa de Climatização",cnpj:"",phone:"",email:"",address:"",city:"",logo_data:""};

function App(){
 const [session,setSession]=useState<Session|null>(null);
 const [loading,setLoading]=useState(true);
 useEffect(()=>{
   supabase.auth.getSession().then(({data})=>{setSession(data.session);setLoading(false)});
   const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,s)=>setSession(s));
   return()=>subscription.unsubscribe();
 },[]);
 if(!supabaseConfigured) return <SetupNotice/>;
 if(loading) return <div className="loading"><AirVent/><b>Carregando CLIMA TECH...</b></div>;
 return session?<DashboardApp session={session}/>:<Auth/>;
}

function SetupNotice(){
 return <div className="authPage"><div className="authCard"><div className="authLogo"><AirVent/></div><h1>CLIMA TECH</h1><p>O aplicativo está pronto, mas falta conectar o Supabase.</p><div className="notice"><ShieldCheck size={18}/><div><b>Configuração necessária</b><span>Adicione VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY nas variáveis do Vercel.</span></div></div><p className="muted">Depois do Redeploy, esta tela será substituída pelo login.</p></div></div>
}

function Auth(){
 const [mode,setMode]=useState<"login"|"signup">("login");
 const [email,setEmail]=useState("");
 const [password,setPassword]=useState("");
 const [name,setName]=useState("");
 const [company,setCompany]=useState("");
 const [busy,setBusy]=useState(false);
 const [msg,setMsg]=useState("");
 async function submit(e:React.FormEvent){
   e.preventDefault();setBusy(true);setMsg("");
   if(mode==="login"){
     const {error}=await supabase.auth.signInWithPassword({email,password});
     if(error)setMsg(error.message);
   }else{
     const {error}=await supabase.auth.signUp({email,password,options:{data:{full_name:name,company_name:company||"Minha Empresa de Climatização"}}});
     if(error)setMsg(`${error.message}${error.code?` (${error.code})`:""}`); else setMsg("Conta criada. Se a confirmação de e-mail estiver ativa, confira sua caixa de entrada.");
   }
   setBusy(false);
 }
 return <div className="authPage"><div className="authCard">
   <div className="authLogo"><AirVent/></div><h1>CLIMA TECH</h1><p>Gestão profissional para técnicos de ar-condicionado.</p>
   <div className="authTabs"><button className={mode==="login"?"active":""} onClick={()=>setMode("login")}>Entrar</button><button className={mode==="signup"?"active":""} onClick={()=>setMode("signup")}>Criar conta</button></div>
   <form onSubmit={submit}>
    {mode==="signup"&&<><Field label="Seu nome" value={name} onChange={setName} placeholder="João da Silva"/><Field label="Nome da empresa" value={company} onChange={setCompany} placeholder="Clima Tech Serviços"/></>}
    <label className="field"><span>E-mail</span><div className="inputIcon"><Mail size={16}/><input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="voce@empresa.com"/></div></label>
    <label className="field"><span>Senha</span><div className="inputIcon"><Lock size={16}/><input type="password" required minLength={6} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Mínimo de 6 caracteres"/></div></label>
    {msg&&<div className="authMsg">{msg}</div>}
    <button className="primary full authSubmit" disabled={busy}>{busy?"Aguarde...":mode==="login"?"Entrar no CLIMA TECH":"Criar minha conta"}</button>
   </form>
   <small className="authFoot">Seus dados ficam separados por conta.</small>
 </div></div>
}
function Field({label,value,onChange,placeholder=""}:{label:string;value:string;onChange:(v:string)=>void;placeholder?:string}){return <label className="field"><span>{label}</span><input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}/></label>}

function DashboardApp({session}:{session:Session}){
 const [page,setPage]=useState("dashboard");
 const [company,setCompany]=useState<Company>(emptyCompany);
 const [clients,setClients]=useState<Client[]>([]);
 const [equipment,setEquipment]=useState<Equipment[]>([]);
 const [services,setServices]=useState<Service[]>([]);
 const [quotes,setQuotes]=useState<Quote[]>([]);
 const [quoteItems,setQuoteItems]=useState<Record<string,QuoteItem[]>>({});
 const [busy,setBusy]=useState(true);
 const [menu,setMenu]=useState(false);
 const [modal,setModal]=useState<null|"client"|"equipment"|"service"|"quote"|"photos">(null);
 const [photoTarget,setPhotoTarget]=useState<{entityType:string;entityId:string;title:string}|null>(null);
 const [editing,setEditing]=useState<any>(null);
 const [toast,setToast]=useState("");

 const owner=session.user.id;
 const nav=[["dashboard","Dashboard",Home],["clients","Clientes",Users],["equipment","Equipamentos",AirVent],["services","Ordens de Serviço",ClipboardList],["quotes","Orçamentos",DollarSign],["calendar","Agenda",CalendarDays]] as const;
 const title=nav.find(n=>n[0]===page)?.[1]||"Minha empresa";

 useEffect(()=>{loadAll()},[]);
 useEffect(()=>{if(toast){const t=setTimeout(()=>setToast(""),2600);return()=>clearTimeout(t)}},[toast]);

 async function loadAll(){
   setBusy(true);
   const [co,cl,eq,se,qu]=await Promise.all([
     supabase.from("companies").select("*").eq("owner_id",owner).maybeSingle(),
     supabase.from("clients").select("*").eq("owner_id",owner).order("name"),
     supabase.from("equipment").select("*").eq("owner_id",owner).order("created_at",{ascending:false}),
     supabase.from("services").select("*").eq("owner_id",owner).order("date",{ascending:false}),
     supabase.from("quotes").select("*").eq("owner_id",owner).order("date",{ascending:false})
   ]);
   if(co.data)setCompany(co.data as Company);
   setClients((cl.data||[]) as Client[]);setEquipment((eq.data||[]) as Equipment[]);setServices((se.data||[]) as Service[]);setQuotes((qu.data||[]) as Quote[]);
   if(qu.data?.length){
     const ids=(qu.data as Quote[]).map(q=>q.id);
     const qi=await supabase.from("quote_items").select("*").in("quote_id",ids).eq("owner_id",owner);
     const grouped:Record<string,QuoteItem[]>={};((qi.data||[]) as QuoteItem[]).forEach(i=>(grouped[i.quote_id]??=[]).push(i));setQuoteItems(grouped);
   }
   setBusy(false);
 }
 function cname(id:string){return clients.find(c=>c.id===id)?.name||"Cliente";}
 function eqname(id:string|null){const e=equipment.find(x=>x.id===id);return e?`${e.brand} ${e.model} • ${e.btu} BTU`:"Sem equipamento";}
 function go(p:string){setPage(p);setMenu(false)}
 async function logout(){await supabase.auth.signOut()}
 async function del(table:string,id:string){if(!confirm("Excluir este registro?"))return;const {error}=await supabase.from(table).delete().eq("id",id).eq("owner_id",owner);if(error)setToast(error.message);else{setToast("Registro excluído.");loadAll()}}
 function wa(phone:string,msg:string){window.open("https://wa.me/55"+phone.replace(/\D/g,"")+"?text="+encodeURIComponent(msg),"_blank")}
 function esc(v:string){return String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}
 function printDocument(title:string,number:string,body:string){
   const w=window.open("","_blank","width=900,height=1000");
   if(!w){setToast("O navegador bloqueou a janela do documento. Permita pop-ups para o CLIMA TECH.");return}
   w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)} ${esc(number)}</title><style>
   *{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:#173b39;margin:0;background:#fff} .page{width:210mm;min-height:297mm;margin:0 auto;padding:16mm 15mm} .top{display:flex;justify-content:space-between;gap:20px;background:#0f766e;color:#fff;padding:18px 20px;border-radius:12px;margin-bottom:20px}.brand{font-size:22px;font-weight:800}.doc{font-size:12px;text-align:right}.section{margin:18px 0}.section h2{font-size:14px;margin:0 0 8px;border-bottom:2px solid #dcebea;padding-bottom:6px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:7px 22px}.label{font-size:10px;color:#68807d}.value{font-size:12px;font-weight:600;white-space:pre-wrap}.full{grid-column:1/-1}.table{width:100%;border-collapse:collapse;font-size:11px}.table th,.table td{padding:8px;border-bottom:1px solid #dcebea;text-align:left}.table th{font-size:10px;color:#52706c}.right{text-align:right!important}.total{margin-left:auto;width:250px;border-top:2px solid #0f766e;padding-top:8px}.total div{display:flex;justify-content:space-between;margin:6px 0}.grand{font-size:16px;font-weight:800;color:#0f766e}.note{background:#f2f7f6;border-radius:8px;padding:10px;font-size:11px;white-space:pre-wrap}.footer{margin-top:30px;padding-top:10px;border-top:1px solid #dcebea;font-size:9px;color:#78908d;text-align:center}@media print{body{background:#fff}.page{margin:0;width:auto;min-height:auto;padding:10mm 12mm}.no-print{display:none}}@page{size:A4;margin:0}</style></head><body><div class="page">${body}<div class="footer">Documento gerado pelo CLIMA TECH • ${new Date().toLocaleDateString("pt-BR")}</div></div><script>window.onload=()=>{setTimeout(()=>window.print(),250)}</script></body></html>`);
   w.document.close();
 }
 function line(label:string,value:string){return `<div><div class="label">${esc(label)}</div><div class="value">${esc(value||"—")}</div></div>`}
 function header(title:string,number:string){return `<div class="top"><div><div class="brand">${esc(company.name||"CLIMA TECH")}</div><div>${esc(title)}</div></div><div class="doc"><b>${esc(number)}</b><br>${esc(company.phone||"")}<br>${esc(company.email||"")}</div></div>`}
 function downloadQuotePDF(q:Quote){
   const client=clients.find(c=>c.id===q.client_id);const eq=equipment.find(e=>e.id===q.equipment_id);const items=quoteItems[q.id]||[];const subtotal=items.reduce((a,i)=>a+Number(i.quantity)*Number(i.unit_price),0);
   const rows=items.map(i=>`<tr><td>${esc(i.description)}</td><td>${esc(i.type)}</td><td class="right">${esc(String(i.quantity))}</td><td class="right">${money(Number(i.quantity)*Number(i.unit_price))}</td></tr>`).join("");
   const eqBlock=eq?`<div class="section"><h2>Equipamento</h2><div class="grid">${line("Aparelho",`${eq.brand} ${eq.model}`)}${line("BTU",eq.btu)}${line("Nº de série",eq.serial)}${line("Local",eq.location)}</div></div>`:"";
   const body=header("ORÇAMENTO",q.number)+`<div class="section"><h2>Cliente</h2><div class="grid">${line("Nome",client?.name||"")}${line("WhatsApp",client?.phone||"")}${line("E-mail",client?.email||"")}${line("Endereço",client?.address||client?.city||"")}</div></div>${eqBlock}<div class="section"><h2>Itens do orçamento</h2><table class="table"><thead><tr><th>Descrição</th><th>Tipo</th><th class="right">Qtd.</th><th class="right">Valor</th></tr></thead><tbody>${rows||'<tr><td colspan="4">Nenhum item informado.</td></tr>'}</tbody></table></div><div class="total"><div><span>Subtotal</span><b>${money(subtotal)}</b></div><div><span>Desconto</span><b>${money(Number(q.discount)||0)}</b></div><div class="grand"><span>TOTAL</span><span>${money(quoteTotal(q,items))}</span></div></div><div class="section"><h2>Condições</h2><div class="grid">${line("Data",fmt(q.date))}${line("Validade",fmt(q.valid_until))}${line("Status",q.status)}${q.notes?`<div class="full"><div class="label">Observações</div><div class="note">${esc(q.notes)}</div></div>`:""}</div></div>`;
   printDocument("Orçamento",q.number,body);
 }
 function downloadServicePDF(s:Service){
   const client=clients.find(c=>c.id===s.client_id);const eq=equipment.find(e=>e.id===s.equipment_id);
   const eqBlock=eq?`<div class="section"><h2>Equipamento</h2><div class="grid">${line("Aparelho",`${eq.brand} ${eq.model}`)}${line("BTU",eq.btu)}${line("Nº de série",eq.serial)}${line("Local",eq.location)}</div></div>`:"";
   const body=header("ORDEM DE SERVIÇO",s.number)+`<div class="section"><h2>Cliente e atendimento</h2><div class="grid">${line("Cliente",client?.name||"")}${line("WhatsApp",client?.phone||"")}${line("E-mail",client?.email||"")}${line("Data / hora",`${fmt(s.date)} ${s.time||""}`)}${line("Status",s.status)}</div></div>${eqBlock}<div class="section"><h2>Relatório técnico</h2><div class="grid">${line("Problema",s.problem)}${line("Diagnóstico",s.diagnosis)}${line("Serviço realizado",s.solution)}${line("Peças / materiais",s.parts)}</div></div><div class="section"><h2>Valores</h2><div class="total">${`<div><span>Peças / materiais</span><b>${money(Number(s.parts_total))}</b></div><div><span>Mão de obra</span><b>${money(Number(s.labor))}</b></div><div><span>Deslocamento</span><b>${money(Number(s.travel))}</b></div><div><span>Desconto</span><b>${money(Number(s.discount))}</b></div><div class="grand"><span>TOTAL</span><span>${money(Number(s.total))}</span></div>`}</div></div>${s.notes?`<div class="section"><h2>Observações</h2><div class="note">${esc(s.notes)}</div></div>`:""}`;
   printDocument("Ordem de Serviço",s.number,body);
 }
 const revenue=services.reduce((a,s)=>a+Number(s.total||0),0);
 const pending=quotes.filter(q=>q.status==="Aguardando").length;
 async function convertQuoteToService(q:Quote){
   if(q.status!=="Aprovado"){setToast("Apenas orçamentos aprovados podem gerar OS.");return}
   const existing=services.find(s=>s.quote_id===q.id);
   if(existing){setToast(`Este orçamento já gerou a OS ${existing.number}.`);setPage("services");return}
   const its=quoteItems[q.id]||[];
   const serviceTexts=its.filter(i=>i.type!=="Peça"&&i.type!=="Deslocamento").map(i=>`${i.description} (${i.quantity}x)`).join("\n");
   const partsTexts=its.filter(i=>i.type==="Peça").map(i=>`${i.description} (${i.quantity}x)`).join("\n");
   const labor=its.filter(i=>i.type==="Mão de obra").reduce((a,i)=>a+Number(i.quantity||0)*Number(i.unit_price||0),0);
   const travel=its.filter(i=>i.type==="Deslocamento").reduce((a,i)=>a+Number(i.quantity||0)*Number(i.unit_price||0),0);
   const partsTotal=its.filter(i=>i.type==="Peça").reduce((a,i)=>a+Number(i.quantity||0)*Number(i.unit_price||0),0);
   const total=quoteTotal(q,its);
   const {data,error}=await supabase.from("services").insert({owner_id:owner,client_id:q.client_id,equipment_id:q.equipment_id||null,quote_id:q.id,number:"OS-"+Date.now().toString().slice(-5),date:today(),time:"",status:"Agendado",problem:`Execução conforme orçamento ${q.number}`,diagnosis:"",solution:serviceTexts,parts:partsTexts,parts_total:partsTotal,labor,travel,discount:Number(q.discount)||0,total,notes:q.notes||""}).select().single();
   if(error){setToast(error.message);return}
   setToast(`OS ${data.number} criada a partir do orçamento.`);setPage("services");loadAll();
 }
 function openPhotos(entityType:string,entityId:string,title:string){setPhotoTarget({entityType,entityId,title});setModal("photos")}
 return <div className="app">
  <aside className={"side "+(menu?"open":"")}>
   <div className="brand"><div className="logo">{company.logo_data?<img src={company.logo_data} alt="Logo"/>:<AirVent/>}</div><div><b>CLIMA TECH</b><small>Gestão para técnicos</small></div><button className="close" onClick={()=>setMenu(false)}><X/></button></div>
   <div className="companyMini">{company.name||"Sua empresa"}</div>
   <nav>{nav.map(([k,l,I])=><button key={k} className={page===k?"active":""} onClick={()=>go(k)}><I size={18}/>{l}</button>)}</nav>
   <div className="accountBox"><div className="accountAvatar"><UserRound size={16}/></div><div className="accountInfo"><b>{session.user.user_metadata?.full_name||"Técnico"}</b><span>{session.user.email||""}</span></div></div>
  <div className="bottom"><button className={page==="settings"?"active":""} onClick={()=>go("settings")}><Settings size={18}/>Minha empresa</button><button className="logoutBtn" onClick={logout}><LogOut size={18}/>Sair da conta</button></div>
  </aside>
  {menu&&<div className="overlay" onClick={()=>setMenu(false)}/>}
  <main>
   <header><button className="hamb" onClick={()=>setMenu(true)}><Menu/></button><div><em>PAINEL DO TÉCNICO</em><h1>{title}</h1></div><div className="headerCompany">{company.logo_data&&<img src={company.logo_data} alt=""/>}<b>{company.name||"Sua empresa"}</b><button className="bell" title="Notificações"><Bell size={18}/></button><button className="headerLogout" onClick={logout} title="Sair da conta"><LogOut size={17}/><span>Sair</span></button></div></header>
   {busy?<div className="loadingArea"><AirVent/><b>Sincronizando seus dados...</b></div>:
    <>
     {page==="dashboard"&&<DashboardHome company={company} clients={clients} equipment={equipment} services={services} quotes={quotes} pending={pending} revenue={revenue} cname={cname} go={go} newItem={(m:any)=>{setEditing(null);setModal(m)}}/>}
     {page==="clients"&&<Clients clients={clients} cname={cname} newItem={()=>{setEditing(null);setModal("client")}} edit={(x:any)=>{setEditing(x);setModal("client")}} del={(id:string)=>del("clients",id)} wa={wa}/>}
     {page==="equipment"&&<EquipmentPage equipment={equipment} clients={clients} cname={cname} newItem={()=>{setEditing(null);setModal("equipment")}} edit={(x:any)=>{setEditing(x);setModal("equipment")}} del={(id:string)=>del("equipment",id)} photos={openPhotos}/>}
     {page==="services"&&<ServicesPage services={services} cname={cname} eqname={eqname} newItem={()=>{setEditing(null);setModal("service")}} edit={(x:any)=>{setEditing(x);setModal("service")}} del={(id:string)=>del("services",id)} photos={openPhotos} pdf={downloadServicePDF}/>}
     {page==="quotes"&&<QuotesPage quotes={quotes} items={quoteItems} clients={clients} equipment={equipment} cname={cname} newItem={()=>{setEditing(null);setModal("quote")}} edit={(x:any)=>{setEditing(x);setModal("quote")}} del={(id:string)=>del("quotes",id)} wa={wa} photos={openPhotos} convert={convertQuoteToService} services={services} pdf={downloadQuotePDF}/>}
     {page==="calendar"&&<CalendarPage services={services} cname={cname} eqname={eqname}/>}
     {page==="settings"&&<SettingsPage company={company} owner={owner} refresh={loadAll} toast={setToast}/>}
    </>
   }
  </main>
  {modal==="client"&&<ClientModal item={editing} owner={owner} close={()=>setModal(null)} saved={()=>{setModal(null);setToast("Cliente salvo.");loadAll()}}/>}
  {modal==="equipment"&&<EquipmentModal item={editing} owner={owner} clients={clients} close={()=>setModal(null)} saved={()=>{setModal(null);setToast("Equipamento salvo.");loadAll()}}/>}
  {modal==="service"&&<ServiceModal item={editing} owner={owner} clients={clients} equipment={equipment} close={()=>setModal(null)} saved={()=>{setModal(null);setToast("Ordem de serviço salva.");loadAll()}}/>}
  {modal==="quote"&&<QuoteModal item={editing} owner={owner} clients={clients} equipment={equipment} existingItems={editing?quoteItems[editing.id]||[]:[]} close={()=>setModal(null)} saved={()=>{setModal(null);setToast("Orçamento salvo.");loadAll()}}/>}
  {modal==="photos"&&photoTarget&&<PhotoModal owner={owner} entityType={photoTarget.entityType} entityId={photoTarget.entityId} title={photoTarget.title} close={()=>setModal(null)} />}
  {toast&&<div className="toast"><CheckCircle2 size={16}/>{toast}</div>}
 </div>
}

function DashboardHome({company,clients,equipment,services,quotes,pending,revenue,cname,go,newItem}:any){
 const next=[...services].sort((a:Service,b:Service)=>a.date.localeCompare(b.date)).slice(0,4);
 return <section className="page">
  <div className="hero"><div className="heroIdentity">{company.logo_data?<img src={company.logo_data} alt="Logo"/>:<div className="heroLogo"><Building2/></div>}<div><span>PAINEL DA EMPRESA</span><h2>{company.name||"Sua Empresa de Climatização"}</h2><p>Controle clientes, equipamentos, serviços e orçamentos em um só lugar.</p></div></div><div className="heroActions"><button onClick={()=>newItem("service")}><Plus/> Nova OS</button><button onClick={()=>newItem("quote")}><DollarSign/> Orçamento</button></div></div>
  <div className="stats"><Stat I={Users} label="Clientes" value={clients.length} note="cadastros" click={()=>go("clients")}/><Stat I={AirVent} label="Equipamentos" value={equipment.length} note="aparelhos" click={()=>go("equipment")}/><Stat I={ClipboardList} label="Ordens de serviço" value={services.length} note="atendimentos" click={()=>go("services")}/><Stat I={DollarSign} label="Faturamento" value={money(revenue)} note="total das OS" click={()=>go("services")}/></div>
  <div className="quickGrid"><Quick I={Users} title="Novo cliente" text="Cadastrar cliente" onClick={()=>newItem("client")}/><Quick I={AirVent} title="Novo equipamento" text="Registrar aparelho" onClick={()=>newItem("equipment")}/><Quick I={FileText} title="Nova ordem de serviço" text="Abrir atendimento" onClick={()=>newItem("service")}/><Quick I={DollarSign} title="Novo orçamento" text="Montar proposta" onClick={()=>newItem("quote")}/></div>
  <div className="dashGrid"><div className="panel"><PanelHead title="Próximos atendimentos" sub="Agenda e status"/>{next.length?next.map((s:Service)=><div className="dashRow" key={s.id}><div className="dateBox"><b>{s.date.slice(8,10)}</b><small>{new Date(s.date+"T12:00:00").toLocaleDateString("pt-BR",{month:"short"}).replace(".","").toUpperCase()}</small></div><div className="rowMain"><b>{s.problem||"Atendimento técnico"}</b><span>{cname(s.client_id)} • {fmt(s.date)}</span></div><Status v={s.status}/></div>):<Empty icon={CalendarDays} text="Nenhum atendimento cadastrado." button="Criar OS" onClick={()=>newItem("service")}/>}</div>
   <div className="panel"><PanelHead title="Orçamentos" sub="Acompanhe suas propostas"/><div className="quoteBig"><b>{pending}</b><span>aguardando resposta</span></div><div className="miniStats"><div><b>{quotes.length}</b><span>total</span></div><div><b>{quotes.filter((q:Quote)=>q.status==="Aprovado").length}</b><span>aprovados</span></div><div><b>{money(quotes.reduce((a:number,q:Quote)=>a+quoteTotal(q,[]),0))}</b><span>propostas</span></div></div><button className="outline" onClick={()=>newItem("quote")}>Criar orçamento <Plus size={14}/></button></div>
  </div>
  <div className="tip"><ShieldCheck/><div><b>Seus dados estão isolados por conta.</b><span>O CLIMA TECH usa autenticação e RLS para impedir que um técnico veja os dados de outro.</span></div></div>
 </section>
}
function Stat({I,label,value,note,click}:any){return <button className="stat" onClick={click}><div className="statIcon"><I size={18}/></div><small>{label}</small><strong>{value}</strong><em>{note}</em></button>}
function Quick({I,title,text,onClick}:any){return <button className="quick" onClick={onClick}><span><I size={18}/></span><div><b>{title}</b><small>{text}</small></div><ChevronRight size={15}/></button>}
function PanelHead({title,sub}:{title:string;sub:string}){return <div className="panelHead"><div><h3>{title}</h3><p>{sub}</p></div></div>}
function Status({v}:{v:string}){return <span className="status">{v}</span>}
function Empty({icon:Icon,text,button,onClick}:any){return <div className="empty"><Icon size={25}/><p>{text}</p><button className="primary" onClick={onClick}><Plus size={14}/>{button}</button></div>}

function Clients({clients,newItem,edit,del,wa}:any){
 const [q,setQ]=useState("");
 const list=clients.filter((c:Client)=>(c.name+" "+c.phone+" "+c.city).toLowerCase().includes(q.toLowerCase()));
 return <section className="page"><PageTitle title="Clientes" text="Cada técnico possui sua própria base de clientes." action={newItem} label="Novo cliente"/><div className="search"><Search size={16}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar cliente..."/></div>{list.length?<Table><thead><tr><th>Cliente</th><th>WhatsApp</th><th>Cidade</th><th>Ações</th></tr></thead><tbody>{list.map((c:Client)=><tr key={c.id}><td><b>{c.name}</b><small>{c.email||"Sem e-mail"}</small></td><td>{c.phone}</td><td>{c.city||"—"}</td><td><Actions edit={()=>edit(c)} del={()=>del(c.id)} wa={()=>wa(c.phone,`Olá, ${c.name}! Aqui é da assistência técnica.`)}/></td></tr>)}</tbody></Table>:<Empty icon={Users} text="Nenhum cliente cadastrado." button="Cadastrar cliente" onClick={newItem}/>}</section>
}
function EquipmentPage({equipment,clients,cname,newItem,edit,del,photos}:any){return <section className="page"><PageTitle title="Equipamentos" text="Histórico, cadastro e fotos dos aparelhos." action={clients.length?newItem:undefined} label="Novo equipamento"/>{equipment.length?<div className="grid">{equipment.map((e:Equipment)=><div className="card" key={e.id}><div className="equipTop"><div className="equipIcon"><AirVent/></div><span>{e.btu||"BTU"} BTU</span></div><h3>{e.brand} {e.model}</h3><p>{e.type} • {e.gas||"Gás não informado"}</p><hr/><small>CLIENTE</small><b>{cname(e.client_id)}</b><small>Nº DE SÉRIE</small><b>{e.serial||"—"}</b><small>LOCAL</small><b>{e.location||"—"}</b><div className="cardActions"><button className="outline" onClick={()=>edit(e)}><Pencil size={13}/> Editar</button><button className="outline" onClick={()=>photos("equipment",e.id,`${e.brand} ${e.model}`)}><Camera size={13}/> Fotos</button><button className="iconAction red" onClick={()=>del(e.id)}><Trash2 size={15}/></button></div></div>)}</div>:<Empty icon={AirVent} text={clients.length?"Nenhum equipamento cadastrado.":"Cadastre um cliente antes de adicionar um equipamento."} button={clients.length?"Adicionar equipamento":"Cadastrar cliente"} onClick={newItem}/>}</section>}
function ServicesPage({services,cname,eqname,newItem,edit,del,photos,pdf}:any){return <section className="page"><PageTitle title="Ordens de Serviço" text="Execução, diagnóstico, valores e fotos do atendimento." action={newItem} label="Nova OS"/>{services.length?<Table><thead><tr><th>OS</th><th>Cliente</th><th>Data</th><th>Problema</th><th>Total</th><th>Status</th><th>Ações</th></tr></thead><tbody>{services.map((s:Service)=><tr key={s.id}><td><b>{s.number}</b>{s.quote_id&&<small>Do orçamento</small>}</td><td><b>{cname(s.client_id)}</b><small>{eqname(s.equipment_id)}</small></td><td>{fmt(s.date)}<small>{s.time}</small></td><td>{s.problem||"—"}<small>{s.diagnosis||""}</small></td><td><b>{money(Number(s.total))}</b></td><td><Status v={s.status}/></td><td><div className="actions"><button className="iconAction green" onClick={()=>pdf(s)} title="Gerar PDF"><Download size={15}/></button><button className="iconAction green" onClick={()=>photos("service",s.id,s.number)} title="Fotos"><Camera size={15}/></button><button className="iconAction" onClick={()=>edit(s)}><Pencil size={15}/></button><button className="iconAction red" onClick={()=>del(s.id)}><Trash2 size={15}/></button></div></td></tr>)}</tbody></Table>:<Empty icon={ClipboardList} text="Nenhuma ordem de serviço cadastrada." button="Criar OS" onClick={newItem}/>}</section>}
function QuotesPage({quotes,items,clients,equipment,cname,newItem,edit,del,wa,photos,convert,services,pdf}:any){return <section className="page"><PageTitle title="Orçamentos" text="Propostas com itens, fotos, validade e geração de OS." action={newItem} label="Novo orçamento"/>{quotes.length?<Table><thead><tr><th>Nº</th><th>Cliente</th><th>Data</th><th>Itens</th><th>Total</th><th>Status</th><th>Ações</th></tr></thead><tbody>{quotes.map((q:Quote)=>{const existing=services.find((s:Service)=>s.quote_id===q.id);return <tr key={q.id}><td><b>{q.number}</b>{q.equipment_id&&<small>Equipamento vinculado</small>}</td><td>{cname(q.client_id)}</td><td>{fmt(q.date)}</td><td>{(items[q.id]||[]).length}</td><td><b>{money(quoteTotal(q,items[q.id]||[]))}</b></td><td><Status v={q.status}/></td><td><div className="actions"><button className="iconAction green" onClick={()=>pdf(q)} title="Gerar PDF"><Download size={15}/></button><button className="iconAction green" onClick={()=>photos("quote",q.id,q.number)} title="Fotos"><Camera size={15}/></button>{q.status==="Aprovado"&&!existing&&<button className="iconAction green" onClick={()=>convert(q)} title="Gerar OS"><Wrench size={15}/></button>}{existing&&<button className="iconAction" title={`OS ${existing.number} já criada`} onClick={()=>{}}><CheckCircle2 size={15}/></button>}<button className="iconAction" onClick={()=>edit(q)}><Pencil size={15}/></button><button className="iconAction red" onClick={()=>del(q.id)}><Trash2 size={15}/></button></div></td></tr>})}</tbody></Table>:<Empty icon={DollarSign} text="Nenhum orçamento cadastrado." button="Criar orçamento" onClick={newItem}/>}</section>}
const clientsPlaceholder:Client|undefined=undefined;
function CalendarPage({services,cname,eqname}:any){const list=[...services].sort((a:Service,b:Service)=>a.date.localeCompare(b.date));return <section className="page"><PageTitle title="Agenda" text="Atendimentos registrados nas suas ordens de serviço."/><div className="calendarList">{list.length?list.map((s:Service)=><div className="agenda" key={s.id}><strong>{s.date.slice(8,10)}<small>{new Date(s.date+"T12:00:00").toLocaleDateString("pt-BR",{month:"short"}).replace(".","").toUpperCase()}</small></strong><div><b>{s.problem||"Atendimento"}</b><p>{cname(s.client_id)} • {eqname(s.equipment_id)}</p></div><time>{s.time||"—"}</time><Status v={s.status}/></div>):<Empty icon={CalendarDays} text="Sua agenda está vazia." button="A agenda será preenchida pelas OS" onClick={()=>{}}/>}</div></section>}
function SettingsPage({company,owner,refresh,toast}:any){
 const [f,setF]=useState<Company>(company);useEffect(()=>setF(company),[company]);
 function logo(e:React.ChangeEvent<HTMLInputElement>){const file=e.target.files?.[0];if(!file)return;if(file.size>900000){toast("Use uma imagem de até 900 KB.");return}const r=new FileReader();r.onload=()=>setF({...f,logo_data:String(r.result)});r.readAsDataURL(file)}
 async function save(){const {error}=await supabase.from("companies").update({name:f.name,cnpj:f.cnpj,phone:f.phone,email:f.email,address:f.address,city:f.city,logo_data:f.logo_data,updated_at:new Date().toISOString()}).eq("id",f.id).eq("owner_id",owner);if(error)toast(error.message);else{toast("Empresa atualizada.");refresh()}}
 return <section className="page"><PageTitle title="Minha empresa" text="Esses dados pertencem somente à sua conta."/><div className="settingsCard"><div className="logoUpload"><div className="logoPreview">{f.logo_data?<img src={f.logo_data} alt="Logo"/>:<ImagePlus size={28}/>}</div><div><b>Logo da empresa</b><p>PNG/JPG até 900 KB.</p><label className="uploadBtn"><Camera size={14}/> Escolher imagem<input type="file" accept="image/*" onChange={logo}/></label></div></div><div className="formGrid"><Field label="Nome da empresa" value={f.name} onChange={v=>setF({...f,name:v})}/><Field label="CNPJ" value={f.cnpj} onChange={v=>setF({...f,cnpj:v})}/><Field label="WhatsApp" value={f.phone} onChange={v=>setF({...f,phone:v})}/><Field label="E-mail" value={f.email} onChange={v=>setF({...f,email:v})}/><Field label="Endereço" value={f.address} onChange={v=>setF({...f,address:v})}/><Field label="Cidade / UF" value={f.city} onChange={v=>setF({...f,city:v})}/></div><button className="primary" onClick={save}><Save size={15}/> Salvar empresa</button><div className="security"><ShieldCheck size={17}/><div><b>Conta isolada</b><span>As consultas usam owner_id + RLS no Supabase.</span></div></div></div></section>
}
function PageTitle({title,text,action,label="Novo"}:any){return <div className="head"><div><h2>{title}</h2><p>{text}</p></div>{action&&<button className="primary" onClick={action}><Plus size={16}/>{label}</button>}</div>}
function Table({children}:any){return <div className="table"><table>{children}</table></div>}
function Actions({edit,del,wa}:any){return <div className="actions">{wa&&<button className="iconAction green" onClick={wa}><MessageCircle size={15}/></button>}<button className="iconAction" onClick={edit}><Pencil size={15}/></button><button className="iconAction red" onClick={del}><Trash2 size={15}/></button></div>}

function ClientModal({item,owner,close,saved}:any){
 const [f,setF]=useState<Client>(item||{id:"",owner_id:owner,name:"",phone:"",email:"",address:"",city:"",notes:""});
 async function save(){const payload={owner_id:owner,name:f.name,phone:f.phone,email:f.email,address:f.address,city:f.city,notes:f.notes};const q=item?supabase.from("clients").update(payload).eq("id",item.id).eq("owner_id",owner):supabase.from("clients").insert(payload);const {error}=await q;if(error)alert(error.message);else saved()}
 return <Modal title={item?"Editar cliente":"Novo cliente"} close={close}><div className="modalGrid"><Field label="Nome *" value={f.name} onChange={v=>setF({...f,name:v})}/><Field label="WhatsApp *" value={f.phone} onChange={v=>setF({...f,phone:v})}/><Field label="E-mail" value={f.email} onChange={v=>setF({...f,email:v})}/><Field label="Cidade / UF" value={f.city} onChange={v=>setF({...f,city:v})}/><Field label="Endereço" value={f.address} onChange={v=>setF({...f,address:v})}/></div><TextField label="Observações" value={f.notes} onChange={v=>setF({...f,notes:v})}/><button className="primary full" disabled={!f.name||!f.phone} onClick={save}><Save size={15}/> Salvar cliente</button></Modal>
}
function EquipmentModal({item,owner,clients,close,saved}:any){
 const [f,setF]=useState<Equipment>(item||{id:"",owner_id:owner,client_id:clients[0]?.id||"",brand:"",model:"",btu:"",type:"Split Inverter",gas:"",serial:"",location:"",install_date:null,notes:""});
 async function save(){const payload={owner_id:owner,client_id:f.client_id,brand:f.brand,model:f.model,btu:f.btu,type:f.type,gas:f.gas,serial:f.serial,location:f.location,install_date:f.install_date||null,notes:f.notes};const q=item?supabase.from("equipment").update(payload).eq("id",item.id).eq("owner_id",owner):supabase.from("equipment").insert(payload);const {error}=await q;if(error)alert(error.message);else saved()}
 return <Modal title={item?"Editar equipamento":"Novo equipamento"} close={close}><div className="modalGrid"><SelectField label="Cliente *" value={f.client_id} options={clients.map((c:Client)=>[c.id,c.name])} onChange={v=>setF({...f,client_id:v})}/><Field label="Marca *" value={f.brand} onChange={v=>setF({...f,brand:v})}/><Field label="Modelo" value={f.model} onChange={v=>setF({...f,model:v})}/><Field label="BTU" value={f.btu} onChange={v=>setF({...f,btu:v})}/><Field label="Tipo" value={f.type} onChange={v=>setF({...f,type:v})}/><Field label="Gás refrigerante" value={f.gas} onChange={v=>setF({...f,gas:v})}/><Field label="Nº de série" value={f.serial} onChange={v=>setF({...f,serial:v})}/><Field label="Local" value={f.location} onChange={v=>setF({...f,location:v})}/><label className="field"><span>Instalação</span><input type="date" value={f.install_date||""} onChange={e=>setF({...f,install_date:e.target.value})}/></label></div><TextField label="Observações" value={f.notes} onChange={v=>setF({...f,notes:v})}/><button className="primary full" disabled={!f.client_id||!f.brand} onClick={save}><Save size={15}/> Salvar equipamento</button></Modal>
}
function ServiceModal({item,owner,clients,equipment,close,saved}:any){
 const [f,setF]=useState<Service>(item||{id:"",owner_id:owner,client_id:clients[0]?.id||"",equipment_id:null,quote_id:null,number:"OS-"+Date.now().toString().slice(-5),date:today(),time:"",status:"Agendado",problem:"",diagnosis:"",solution:"",parts:"",parts_total:0,labor:0,travel:0,discount:0,total:0,notes:""});
 const clientEq=equipment.filter((e:Equipment)=>e.client_id===f.client_id); const total=Math.max(0,(Number(f.labor)||0)+(Number(f.travel)||0)+(Number(f.parts_total)||0)-(Number(f.discount)||0));
 async function save(){const payload={owner_id:owner,client_id:f.client_id,equipment_id:f.equipment_id||null,quote_id:f.quote_id||null,number:f.number,date:f.date,time:f.time,status:f.status,problem:f.problem,diagnosis:f.diagnosis,solution:f.solution,parts:f.parts,parts_total:Number(f.parts_total)||0,labor:Number(f.labor)||0,travel:Number(f.travel)||0,discount:Number(f.discount)||0,total,notes:f.notes};const q=item?supabase.from("services").update(payload).eq("id",item.id).eq("owner_id",owner):supabase.from("services").insert(payload);const {error}=await q;if(error)alert(error.message);else saved()}
 return <Modal title={item?"Editar OS":"Nova ordem de serviço"} close={close} wide><div className="sectionLabel">Atendimento</div><div className="modalGrid"><Field label="Nº da OS" value={f.number} onChange={v=>setF({...f,number:v})}/><SelectField label="Status" value={f.status} options={["Agendado","Em andamento","Concluído","Cancelado"].map(x=>[x,x])} onChange={v=>setF({...f,status:v})}/><SelectField label="Cliente *" value={f.client_id} options={clients.map((c:Client)=>[c.id,c.name])} onChange={v=>setF({...f,client_id:v,equipment_id:null})}/><SelectField label="Equipamento" value={f.equipment_id||""} options={clientEq.map((e:Equipment)=>[e.id,`${e.brand} ${e.model} • ${e.btu} BTU`])} onChange={v=>setF({...f,equipment_id:v||null})}/><label className="field"><span>Data</span><input type="date" value={f.date} onChange={e=>setF({...f,date:e.target.value})}/></label><Field label="Horário" value={f.time} onChange={v=>setF({...f,time:v})}/></div>{f.quote_id&&<div className="notice"><CheckCircle2 size={17}/><div><b>OS gerada a partir de orçamento</b><span>Os dados comerciais foram pré-preenchidos e podem ser ajustados antes da execução.</span></div></div>}<div className="sectionLabel">Diagnóstico e execução</div><div className="modalGrid"><TextField label="Problema relatado" value={f.problem} onChange={v=>setF({...f,problem:v})}/><TextField label="Diagnóstico técnico" value={f.diagnosis} onChange={v=>setF({...f,diagnosis:v})}/><TextField label="Solução / serviço realizado" value={f.solution} onChange={v=>setF({...f,solution:v})}/><TextField label="Peças / materiais" value={f.parts} onChange={v=>setF({...f,parts:v})}/></div><div className="modalGrid"><NumberField label="Valor das peças/materiais" value={Number(f.parts_total)} onChange={v=>setF({...f,parts_total:v})}/><NumberField label="Desconto" value={Number(f.discount)} onChange={v=>setF({...f,discount:v})}/><NumberField label="Mão de obra" value={Number(f.labor)} onChange={v=>setF({...f,labor:v})}/><NumberField label="Deslocamento" value={Number(f.travel)} onChange={v=>setF({...f,travel:v})}/></div><TextField label="Observações" value={f.notes} onChange={v=>setF({...f,notes:v})}/><div className="grandTotal"><small>Total da OS</small><b>{money(total)}</b></div><button className="primary full" disabled={!f.client_id} onClick={save}><Save size={15}/> Salvar OS</button></Modal>}
function QuoteModal({item,owner,clients,equipment,existingItems,close,saved}:any){
 const [f,setF]=useState<Quote>(item||{id:"",owner_id:owner,client_id:clients[0]?.id||"",equipment_id:null,number:"ORC-"+Date.now().toString().slice(-5),date:today(),valid_until:null,discount:0,status:"Aguardando",notes:""});
 const [items,setItems]=useState<QuoteItem[]>(existingItems.length?existingItems:[{id:"",owner_id:owner,quote_id:"",description:"",type:"Serviço",quantity:1,unit_price:0}]);
 const total=Math.max(0,items.reduce((a,i)=>a+(Number(i.quantity)||0)*(Number(i.unit_price)||0),0)-(Number(f.discount)||0));
 const clientEq=equipment.filter((e:Equipment)=>e.client_id===f.client_id);
 async function save(){let quoteId=item?.id;const payload={owner_id:owner,client_id:f.client_id,equipment_id:f.equipment_id||null,number:f.number,date:f.date,valid_until:f.valid_until||null,discount:Number(f.discount)||0,status:f.status,notes:f.notes};if(item){const r=await supabase.from("quotes").update(payload).eq("id",item.id).eq("owner_id",owner).select().single();if(r.error){alert(r.error.message);return}}else{const r=await supabase.from("quotes").insert(payload).select().single();if(r.error){alert(r.error.message);return}quoteId=r.data.id}if(!quoteId){alert("Não foi possível identificar o orçamento.");return}await supabase.from("quote_items").delete().eq("quote_id",quoteId).eq("owner_id",owner);const rows=items.filter(i=>i.description.trim()).map(i=>({owner_id:owner,quote_id:quoteId,description:i.description,type:i.type,quantity:Number(i.quantity)||1,unit_price:Number(i.unit_price)||0}));if(rows.length){const r=await supabase.from("quote_items").insert(rows);if(r.error){alert(r.error.message);return}}saved()}
 function add(){setItems([...items,{id:"",owner_id:owner,quote_id:"",description:"",type:"Serviço",quantity:1,unit_price:0}])}
 return <Modal title={item?"Editar orçamento":"Novo orçamento"} close={close} wide><div className="modalGrid"><Field label="Nº" value={f.number} onChange={v=>setF({...f,number:v})}/><SelectField label="Cliente *" value={f.client_id} options={clients.map((c:Client)=>[c.id,c.name])} onChange={v=>setF({...f,client_id:v,equipment_id:null})}/><SelectField label="Equipamento" value={f.equipment_id||""} options={clientEq.map((e:Equipment)=>[e.id,`${e.brand} ${e.model} • ${e.btu} BTU`])} onChange={v=>setF({...f,equipment_id:v||null})}/><label className="field"><span>Data</span><input type="date" value={f.date} onChange={e=>setF({...f,date:e.target.value})}/></label><label className="field"><span>Validade</span><input type="date" value={f.valid_until||""} onChange={e=>setF({...f,valid_until:e.target.value||null})}/></label><SelectField label="Status" value={f.status} options={["Aguardando","Aprovado","Recusado","Expirado"].map(x=>[x,x])} onChange={v=>setF({...f,status:v})}/></div><div className="itemsHead"><div><b>Itens</b><small>Peças, serviços, mão de obra e outros custos.</small></div><button className="outline addItem" onClick={add}><Plus size={14}/> Adicionar item</button></div><div className="items">{items.map((i,index)=><div className="itemRow" key={i.id||index}><input placeholder="Descrição" value={i.description} onChange={e=>setItems(items.map((x,j)=>j===index?{...x,description:e.target.value}:x))}/><select value={i.type} onChange={e=>setItems(items.map((x,j)=>j===index?{...x,type:e.target.value}:x))}><option>Serviço</option><option>Peça</option><option>Mão de obra</option><option>Deslocamento</option><option>Outro</option></select><input type="number" min="1" value={i.quantity} onChange={e=>setItems(items.map((x,j)=>j===index?{...x,quantity:Number(e.target.value)}:x))}/><input type="number" min="0" step="0.01" value={i.unit_price} onChange={e=>setItems(items.map((x,j)=>j===index?{...x,unit_price:Number(e.target.value)}:x))}/><b>{money((Number(i.quantity)||0)*(Number(i.unit_price)||0))}</b><button className="iconAction red" onClick={()=>setItems(items.filter((_,j)=>j!==index))}><Trash2 size={14}/></button></div>)}</div><NumberField label="Desconto" value={Number(f.discount)} onChange={v=>setF({...f,discount:v})}/><div className="grandTotal"><small>Total do orçamento</small><b>{money(total)}</b></div><TextField label="Observações / condições" value={f.notes} onChange={v=>setF({...f,notes:v})}/><button className="primary full" disabled={!f.client_id} onClick={save}><Save size={15}/> Salvar orçamento</button></Modal>}

function PhotoModal({owner,entityType,entityId,title,close}:{owner:string;entityType:string;entityId:string;title:string;close:()=>void}){
 const [photos,setPhotos]=useState<(Photo&{url:string})[]>([]);
 const [category,setCategory]=useState(entityType==="service"?"Antes":"Geral");
 const [caption,setCaption]=useState("");
 const [busy,setBusy]=useState(false);
 useEffect(()=>{load()},[entityId]);
 async function load(){const {data,error}=await supabase.from("photos").select("*").eq("owner_id",owner).eq("entity_type",entityType).eq("entity_id",entityId).order("created_at",{ascending:false});if(error){alert(error.message);return}const list:(Photo&{url:string})[]=[];for(const p of (data||[]) as Photo[]){const r=await supabase.storage.from("clima-photos").createSignedUrl(p.storage_path,3600);if(!r.error&&r.data?.signedUrl)list.push({...p,url:r.data.signedUrl})}setPhotos(list)}
 async function upload(e:React.ChangeEvent<HTMLInputElement>){const files=Array.from(e.target.files||[]);if(!files.length)return;setBusy(true);for(const file of files){if(file.size>6*1024*1024){alert(`A foto ${file.name} excede 6 MB.`);continue}const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,"_");const path=`${owner}/${entityType}/${entityId}/${crypto.randomUUID()}-${safe}`;const up=await supabase.storage.from("clima-photos").upload(path,file,{contentType:file.type||"image/jpeg",upsert:false});if(up.error){alert(up.error.message);continue}const ins=await supabase.from("photos").insert({owner_id:owner,entity_type:entityType,entity_id:entityId,storage_path:path,caption,category});if(ins.error){await supabase.storage.from("clima-photos").remove([path]);alert(ins.error.message)}}setCaption("");e.target.value="";setBusy(false);load()}
 async function remove(p:Photo){if(!confirm("Excluir esta foto?"))return;await supabase.storage.from("clima-photos").remove([p.storage_path]);const r=await supabase.from("photos").delete().eq("id",p.id).eq("owner_id",owner);if(r.error)alert(r.error.message);else load()}
 return <Modal title={`Fotos • ${title}`} close={close} wide><div className="photoTools"><div className="modalGrid"><SelectField label="Categoria" value={category} options={(entityType==="service"?["Antes","Durante","Depois","Geral"]:["Geral","Instalação","Etiqueta","Estado","Local"] as string[]).map(x=>[x,x])} onChange={setCategory}/><Field label="Descrição da foto" value={caption} onChange={setCaption} placeholder="Ex.: etiqueta do equipamento"/></div><label className="uploadBtn photoUpload"><Camera size={15}/>{busy?"Enviando...":"Adicionar fotos"}<input type="file" accept="image/*" multiple disabled={busy} onChange={upload}/></label></div>{photos.length?<div className="photoGrid">{photos.map(p=><div className="photoCard" key={p.id}><img src={p.url} alt={p.caption||p.category}/><div><b>{p.category}</b><small>{p.caption||"Sem descrição"}</small><button className="iconAction red" onClick={()=>remove(p)}><Trash2 size={14}/></button></div></div>)}</div>:<div className="photoEmpty"><Camera size={28}/><b>Nenhuma foto adicionada</b><span>Adicione fotos para registrar o estado e a execução do serviço.</span></div>}</Modal>}
function SelectField({label,value,options,onChange}:{label:string;value:string;options:string[][];onChange:(v:string)=>void}){return <label className="field"><span>{label}</span><select value={value} onChange={e=>onChange(e.target.value)}><option value="">Selecione...</option>{options.map(o=><option value={o[0]} key={o[0]}>{o[1]}</option>)}</select></label>}
function TextField({label,value,onChange}:{label:string;value:string;onChange:(v:string)=>void}){return <label className="field fullField"><span>{label}</span><textarea rows={3} value={value} onChange={e=>onChange(e.target.value)}/></label>}
function NumberField({label,value,onChange}:{label:string;value:number;onChange:(v:number)=>void}){return <label className="field"><span>{label}</span><input type="number" min="0" step="0.01" value={value} onChange={e=>onChange(Number(e.target.value))}/></label>}
function quoteTotal(q:Quote,items:QuoteItem[]){return Math.max(0,items.reduce((a,i)=>a+(Number(i.quantity)||0)*(Number(i.unit_price)||0),0)-(Number(q.discount)||0))}
function Modal({title,close,children,wide=false}:{title:string;close:()=>void;children:React.ReactNode;wide?:boolean}){return <div className="backdrop"><div className={"modal "+(wide?"wide":"")}><div className="modalHead"><h3>{title}</h3><button onClick={close}><X/></button></div>{children}</div></div>}

createRoot(document.getElementById("root")!).render(<App/>);
