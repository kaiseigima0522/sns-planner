import { useState, useEffect } from "react";

/* ══════════════════════════════════════════
   定数
══════════════════════════════════════════ */
const WEEKDAYS = ["日","月","火","水","木","金","土"];
const PLATFORMS = ["Instagram","X","TikTok","Facebook","YouTube","LINE"];

const CAT_META = {
  shoot: { label:"撮影", grad:"linear-gradient(135deg,#5bc8f5 0%,#7ab3f5 50%,#a78bfa 100%)" },
  edit:  { label:"編集", grad:"linear-gradient(135deg,#9b59f5 0%,#a78bfa 50%,#c084fc 100%)" },
  post:  { label:"投稿", grad:"linear-gradient(135deg,#f97316 0%,#fb923c 40%,#fbbf24 100%)" },
};

const todayMidnight = () => { const d=new Date(); d.setHours(0,0,0,0); return d; };
const daysLeft = d => d ? Math.ceil((new Date(d)-todayMidnight())/86400000) : 999;
const toISO = d => { try{ return new Date(d).toISOString().slice(0,10); }catch{ return ""; } };
const fmtDate = d => {
  if(!d) return "─";
  const x = new Date(d);
  return `${x.getMonth()+1}月${x.getDate()}日（${WEEKDAYS[x.getDay()]}曜日）`;
};

let _id = Date.now();
const uid = () => String(++_id);

const makeSample = () => {
  const ad = n => { const d=todayMidnight(); d.setDate(d.getDate()+n); return d.toISOString(); };
  return [
    { id:uid(), cat:"shoot", client:"@cafe_lumiere",  platform:"Instagram", date:ad(1), timeStart:"10:00", timeEnd:"13:00", count:"10", draftDate:"",   videoName:"", materialUrl:"", postUrl:"", note:"新メニュー撮影", comments:[], done:false },
    { id:uid(), cat:"edit",  client:"@studio_nord",   platform:"X",         date:ad(2), timeStart:"",      timeEnd:"",      count:"3",  draftDate:ad(4), videoName:"", materialUrl:"https://drive.google.com/", postUrl:"", note:"リール編集3本", comments:[], done:false },
    { id:uid(), cat:"post",  client:"@run.fit",        platform:"TikTok",    date:ad(3), timeStart:"18:00", timeEnd:"",      count:"",   draftDate:"",   videoName:"週次ランニング動画", materialUrl:"", postUrl:"", note:"週次投稿", comments:[], done:false },
    { id:uid(), cat:"shoot", client:"@patisserie_k",   platform:"Instagram", date:ad(1), timeStart:"14:00", timeEnd:"17:00", count:"8",  draftDate:"",   videoName:"", materialUrl:"", postUrl:"", note:"店舗外観", comments:[], done:false },
  ];
};

const LS = "sns_planner_v4";
const loadLS = () => { try{ const s=localStorage.getItem(LS); return s?JSON.parse(s):null; }catch{ return null; } };
const saveLS = v => { try{ localStorage.setItem(LS,JSON.stringify(v)); }catch{} };

const BLANK_TASK = (clients) => ({
  id:uid(), cat:"shoot", client:clients[0]??"", platform:"Instagram",
  date: (() => { const d=new Date(); d.setDate(d.getDate()+1); return d.toISOString(); })(),
  timeStart:"", timeEnd:"", count:"", draftDate:"", videoName:"",
  materialUrl:"", postUrl:"", note:"", comments:[], done:false
});

/* ══════════════════════════════════════════
   App
══════════════════════════════════════════ */
export default function App() {
  const [tasks,   setTasks]   = useState(() => loadLS()?.tasks   ?? makeSample());
  const [clients, setClients] = useState(() => loadLS()?.clients ?? ["@cafe_lumiere","@studio_nord","@run.fit","@patisserie_k"]);
  const [catFilter, setCatFilter] = useState(null); // null=all, "shoot"|"edit"|"post"
  const [modal,  setModal]    = useState(null);
  const [cmtOpen,setCmtOpen]  = useState(null);
  const [cmtText,setCmtText]  = useState("");
  const [tab,    setTab]      = useState("home"); // "home"|"calendar"|"profile"
  const [showCM, setShowCM]   = useState(false);
  const [newCl,  setNewCl]    = useState("");

  useEffect(()=>{ saveLS({tasks,clients}); },[tasks,clients]);

  const upd  = (id,p) => setTasks(ts=>ts.map(t=>t.id===id?{...t,...p}:t));
  const del  = id => setTasks(ts=>ts.filter(t=>t.id!==id));
  const done = id => upd(id,{done:true});

  const openAdd  = (cat=null) => setModal({ mode:"add",  task:{ ...BLANK_TASK(clients), ...(cat?{cat}:{}) } });
  const openEdit = t => setModal({ mode:"edit", task:{...t} });
  const mSet = p => setModal(m=>({...m, task:{...m.task,...p}}));
  const saveModal = () => {
    if(!modal.task.client||!modal.task.date) return;
    if(modal.mode==="add") setTasks(ts=>[...ts,modal.task]);
    else setTasks(ts=>ts.map(t=>t.id===modal.task.id?modal.task:t));
    setModal(null);
  };

  const addCmt = id => {
    if(!cmtText.trim()) return;
    const t=tasks.find(x=>x.id===id);
    upd(id,{comments:[...(t.comments??[]),{id:uid(),text:cmtText.trim(),at:new Date().toLocaleString("ja-JP",{month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit"})}]});
    setCmtText("");
  };
  const delCmt = (tid,cid) => { const t=tasks.find(x=>x.id===tid); upd(tid,{comments:t.comments.filter(c=>c.id!==cid)}); };

  const addCl = () => { const v=newCl.trim(); if(v&&!clients.includes(v)) setClients(c=>[...c,v]); setNewCl(""); };
  const delCl = c => setClients(cs=>cs.filter(x=>x!==c));

  const today = new Date();
  const todayLabel = `${today.getMonth()+1}月${today.getDate()}日[${["sun","mon","tue","wed","thu","fri","sat"][today.getDay()]}]`;
  const urgentCount = tasks.filter(t=>!t.done&&daysLeft(t.date)<=2).length;

  const sorted = [...tasks].filter(t=>!t.done).sort((a,b)=>new Date(a.date)-new Date(b.date));
  const visible = catFilter ? sorted.filter(t=>t.cat===catFilter) : sorted;

  /* ── Card component ── */
  const TaskCard = ({task}) => {
    const dl = daysLeft(task.date);
    const isUrgent = dl<=2;
    const isOpen = cmtOpen===task.id;
    const meta = CAT_META[task.cat];
    const cmtLen = task.comments?.length??0;

    return (
      <div style={{position:"relative", borderRadius:20, marginBottom:12, overflow:"hidden",
        boxShadow:"0 4px 20px rgba(0,0,0,0.35)"}}>
        {/* Urgent badge */}
        {isUrgent && (
          <div style={{position:"absolute",top:10,right:10,background:"#ff4d6d",color:"#fff",
            fontSize:11,fontWeight:800,padding:"3px 10px",borderRadius:20,zIndex:2}}>
            期限間近
          </div>
        )}

        {/* Card body */}
        <div style={{background:meta.grad, padding:"14px 16px 12px", cursor:"pointer"}} onClick={()=>openEdit(task)}>
          {/* Row 1 */}
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
            <span style={{fontSize:12,fontWeight:800,color:"rgba(255,255,255,0.9)",
              background:"rgba(0,0,0,0.2)",padding:"2px 10px",borderRadius:20}}>
              {meta.label}
            </span>
            <span style={{fontSize:13,fontWeight:700,color:"#fff"}}>クライアント名: {task.client}</span>
          </div>

          {/* Row 2: date + time/draftDate */}
          <div style={{display:"flex",alignItems:"flex-start",gap:12,flexWrap:"wrap",marginBottom:4}}>
            <div style={{fontSize:13,fontWeight:700,color:"#fff"}}>
              日付: {fmtDate(task.date)}
            </div>
            {task.cat!=="edit" && (task.timeStart) && (
              <div style={{fontSize:13,fontWeight:700,color:"#fff"}}>
                時間: {task.timeStart}{task.timeEnd?` 〜 ${task.timeEnd}`:""}
              </div>
            )}
            {task.cat==="edit" && task.draftDate && (
              <div style={{fontSize:13,fontWeight:700,color:"#fff"}}>
                初稿: {fmtDate(task.draftDate)}
              </div>
            )}
          </div>

          {/* Row 3: count / videoName / note */}
          {task.cat==="shoot" && task.count && (
            <div style={{fontSize:13,color:"rgba(255,255,255,0.85)",marginBottom:4}}>撮影本数: {task.count}本</div>
          )}
          {task.cat==="edit" && task.count && (
            <div style={{fontSize:13,color:"rgba(255,255,255,0.85)",marginBottom:4}}>編集本数: {task.count}本</div>
          )}
          {task.cat==="post" && task.videoName && (
            <div style={{fontSize:13,color:"rgba(255,255,255,0.85)",marginBottom:4}}>投稿動画名: {task.videoName}</div>
          )}
          {task.note && (
            <div style={{fontSize:12,color:"rgba(255,255,255,0.75)",marginBottom:4}}>{task.note}</div>
          )}
          {task.materialUrl && (
            <a href={task.materialUrl} target="_blank" rel="noreferrer"
              style={{fontSize:11,color:"rgba(255,255,255,0.85)",display:"block",marginBottom:4,wordBreak:"break-all"}}
              onClick={e=>e.stopPropagation()}>
              📁 {task.materialUrl}
            </a>
          )}
          {task.cat==="post" && task.postUrl && (
            <a href={task.postUrl} target="_blank" rel="noreferrer"
              style={{fontSize:11,color:"rgba(255,255,255,0.85)",display:"block",marginBottom:4,wordBreak:"break-all"}}
              onClick={e=>e.stopPropagation()}>
              🔗 {task.postUrl}
            </a>
          )}

          {/* Bottom row: comment + done */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:6}}>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <button
                style={{background:"rgba(0,0,0,0.45)",color:"#fff",border:"none",borderRadius:20,
                  padding:"5px 13px",fontSize:12,fontWeight:700,cursor:"pointer"}}
                onClick={e=>{e.stopPropagation();setCmtOpen(isOpen?null:task.id);setCmtText("");}}>
                +コメント {cmtLen>0?`(${cmtLen})`:""}
              </button>
              <button
                style={{background:"rgba(0,0,0,0.25)",color:"rgba(255,255,255,0.7)",border:"none",
                  borderRadius:20,padding:"5px 10px",fontSize:11,cursor:"pointer"}}
                onClick={e=>{e.stopPropagation();del(task.id);}}>
                削除
              </button>
            </div>
            <button
              style={{background:"#ef4444",color:"#fff",border:"none",borderRadius:14,
                padding:"8px 22px",fontSize:15,fontWeight:900,cursor:"pointer",
                boxShadow:"0 2px 10px rgba(239,68,68,0.5)"}}
              onClick={e=>{e.stopPropagation();done(task.id);}}>
              完了
            </button>
          </div>
        </div>

        {/* Comment panel */}
        {isOpen && (
          <div style={{background:"#1e2030",padding:"12px 16px"}}>
            {cmtLen===0 && <div style={{fontSize:12,color:"#64748b",marginBottom:6}}>コメントはまだありません</div>}
            {task.comments?.map(cm=>(
              <div key={cm.id} style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",
                gap:8,padding:"5px 0",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
                <span style={{fontSize:12,color:"#cbd5e1",flex:1}}>{cm.text}</span>
                <span style={{fontSize:10,color:"#475569",whiteSpace:"nowrap"}}>{cm.at}</span>
                <button style={{background:"transparent",border:"none",color:"#475569",cursor:"pointer",fontSize:13}} onClick={()=>delCmt(task.id,cm.id)}>✕</button>
              </div>
            ))}
            <div style={{display:"flex",gap:8,marginTop:8}}>
              <input
                style={{flex:1,background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.12)",
                  borderRadius:10,padding:"8px 11px",color:"#e2e8f0",fontSize:13,outline:"none"}}
                placeholder="コメントを入力…"
                value={cmtText}
                onChange={e=>setCmtText(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&addCmt(task.id)}
              />
              <button
                style={{background:"#6366f1",color:"#fff",border:"none",borderRadius:10,
                  padding:"8px 16px",fontSize:13,fontWeight:700,cursor:"pointer"}}
                onClick={()=>addCmt(task.id)}>送信</button>
            </div>
          </div>
        )}
      </div>
    );
  };

  /* ── Done list ── */
  const doneTasks = tasks.filter(t=>t.done);

  /* ── Modal ── */
  const Modal = () => {
    if(!modal) return null;
    const t = modal.task;
    const inp = {
      width:"100%", background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.12)",
      borderRadius:10, padding:"9px 12px", color:"#e2e8f0", fontSize:14, outline:"none",
      boxSizing:"border-box", colorScheme:"dark", marginBottom:2
    };
    const lbl = { fontSize:11, color:"#94a3b8", fontWeight:700, letterSpacing:.8,
      display:"block", marginTop:12, marginBottom:4 };
    return (
      <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.82)",backdropFilter:"blur(6px)",
        display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:14}}
        onClick={()=>setModal(null)}>
        <div style={{background:"#161826",border:"1px solid rgba(255,255,255,0.1)",borderRadius:22,
          padding:"22px 20px",width:"min(460px,100%)",maxHeight:"92vh",overflowY:"auto",
          boxShadow:"0 20px 60px rgba(0,0,0,0.7)"}}
          onClick={e=>e.stopPropagation()}>
          <div style={{fontSize:17,fontWeight:900,color:"#fff",marginBottom:18}}>
            {modal.mode==="add"?"タスクを追加":"タスクを編集"}
          </div>

          {/* Cat selector */}
          <label style={lbl}>種別</label>
          <div style={{display:"flex",gap:6,marginBottom:2}}>
            {Object.entries(CAT_META).map(([k,v])=>(
              <button key={k} style={{flex:1,padding:"8px 0",borderRadius:10,border:"2px solid",
                borderColor:t.cat===k?"rgba(255,255,255,0.5)":"rgba(255,255,255,0.1)",
                background:t.cat===k?v.grad:"transparent",
                color:"#fff",cursor:"pointer",fontSize:13,fontWeight:700,transition:"all .15s"}}
                onClick={()=>mSet({cat:k})}>
                {v.label}
              </button>
            ))}
          </div>

          <label style={lbl}>クライアント</label>
          <select style={inp} value={t.client} onChange={e=>mSet({client:e.target.value})}>
            {clients.map(c=><option key={c}>{c}</option>)}
          </select>

          <label style={lbl}>プラットフォーム</label>
          <select style={inp} value={t.platform} onChange={e=>mSet({platform:e.target.value})}>
            {PLATFORMS.map(p=><option key={p}>{p}</option>)}
          </select>

          <label style={lbl}>日付</label>
          <input type="date" style={inp} value={toISO(t.date)} onChange={e=>mSet({date:new Date(e.target.value).toISOString()})} />

          {/* Time (shoot & post) */}
          {(t.cat==="shoot"||t.cat==="post") && <>
            <label style={lbl}>時間</label>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <input type="time" style={{...inp,flex:1,marginBottom:0}} value={t.timeStart||""} onChange={e=>mSet({timeStart:e.target.value})} />
              <span style={{color:"#64748b"}}>〜</span>
              <input type="time" style={{...inp,flex:1,marginBottom:0}} value={t.timeEnd||""} onChange={e=>mSet({timeEnd:e.target.value})} />
            </div>
          </>}

          {/* Count (shoot & edit) */}
          {(t.cat==="shoot"||t.cat==="edit") && <>
            <label style={lbl}>{t.cat==="shoot"?"撮影本数":"編集本数"}</label>
            <input type="number" style={inp} placeholder="例: 10" value={t.count||""} onChange={e=>mSet({count:e.target.value})} />
          </>}

          {/* Draft date (edit only) */}
          {t.cat==="edit" && <>
            <label style={lbl}>初稿日</label>
            <input type="date" style={inp} value={toISO(t.draftDate)} onChange={e=>mSet({draftDate:new Date(e.target.value).toISOString()})} />
          </>}

          {/* Video name (post only) */}
          {t.cat==="post" && <>
            <label style={lbl}>投稿動画名</label>
            <input style={inp} placeholder="例: 週次ランニング動画" value={t.videoName||""} onChange={e=>mSet({videoName:e.target.value})} />
          </>}

          {/* Material URL (shoot & edit) */}
          {(t.cat==="shoot"||t.cat==="edit") && <>
            <label style={lbl}>📁 素材URL</label>
            <input style={inp} placeholder="https://drive.google.com/..." value={t.materialUrl||""} onChange={e=>mSet({materialUrl:e.target.value})} />
          </>}

          {/* Post URL (post only) */}
          {t.cat==="post" && <>
            <label style={lbl}>🔗 投稿URL</label>
            <input style={inp} placeholder="https://www.instagram.com/p/..." value={t.postUrl||""} onChange={e=>mSet({postUrl:e.target.value})} />
          </>}

          <label style={lbl}>メモ</label>
          <input style={inp} placeholder="備考など" value={t.note||""} onChange={e=>mSet({note:e.target.value})} />

          <div style={{display:"flex",gap:8,marginTop:20,justifyContent:"flex-end"}}>
            <button style={{padding:"10px 18px",borderRadius:12,border:"1px solid rgba(255,255,255,0.1)",
              background:"transparent",color:"#64748b",cursor:"pointer",fontSize:13}}
              onClick={()=>setModal(null)}>キャンセル</button>
            <button style={{padding:"10px 24px",borderRadius:12,border:"none",
              background:"linear-gradient(135deg,#818cf8,#6366f1)",color:"#fff",
              cursor:"pointer",fontSize:13,fontWeight:700}}
              onClick={saveModal}>
              {modal.mode==="add"?"追加する":"保存する"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  /* ── Client Modal ── */
  const ClientModal = () => (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",backdropFilter:"blur(4px)",
      display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:14}}
      onClick={()=>setShowCM(false)}>
      <div style={{background:"#161826",border:"1px solid rgba(255,255,255,0.1)",borderRadius:22,
        padding:"22px 20px",width:"min(380px,100%)",maxHeight:"80vh",overflowY:"auto"}}
        onClick={e=>e.stopPropagation()}>
        <div style={{fontSize:17,fontWeight:900,color:"#fff",marginBottom:16}}>👥 クライアント管理</div>
        {clients.map(c=>(
          <div key={c} style={{display:"flex",justifyContent:"space-between",alignItems:"center",
            padding:"8px 0",borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
            <span style={{fontSize:14,color:"#e2e8f0"}}>{c}</span>
            <button style={{background:"transparent",border:"none",color:"#ef4444",cursor:"pointer",fontSize:18}} onClick={()=>delCl(c)}>×</button>
          </div>
        ))}
        <div style={{display:"flex",gap:8,marginTop:12}}>
          <input style={{flex:1,background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.12)",
            borderRadius:10,padding:"8px 11px",color:"#e2e8f0",fontSize:13,outline:"none"}}
            placeholder="@new_client" value={newCl} onChange={e=>setNewCl(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addCl()} />
          <button style={{background:"#6366f1",color:"#fff",border:"none",borderRadius:10,
            padding:"8px 14px",cursor:"pointer",fontSize:13,fontWeight:700}} onClick={addCl}>追加</button>
        </div>
        <div style={{display:"flex",justifyContent:"flex-end",marginTop:18}}>
          <button style={{padding:"9px 20px",borderRadius:12,border:"1px solid rgba(255,255,255,0.1)",
            background:"transparent",color:"#64748b",cursor:"pointer",fontSize:13}} onClick={()=>setShowCM(false)}>閉じる</button>
        </div>
      </div>
    </div>
  );

  /* ── Calendar view (simple month grid) ── */
  const CalendarView = () => {
    const [viewDate,setViewDate] = useState(new Date());
    const year = viewDate.getFullYear(), month = viewDate.getMonth();
    const first = new Date(year,month,1).getDay();
    const days = new Date(year,month+1,0).getDate();
    const cells = [];
    for(let i=0;i<first;i++) cells.push(null);
    for(let i=1;i<=days;i++) cells.push(i);

    const taskDots = {};
    tasks.forEach(t => {
      if(!t.date) return;
      const d = new Date(t.date);
      if(d.getFullYear()===year&&d.getMonth()===month){
        const key=d.getDate();
        if(!taskDots[key]) taskDots[key]=[];
        taskDots[key].push(t.cat);
      }
    });

    const catDotColor = {shoot:"#5bc8f5",edit:"#a78bfa",post:"#f97316"};

    return (
      <div style={{padding:"0 16px 20px"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
          <button style={{background:"rgba(255,255,255,0.08)",border:"none",color:"#fff",borderRadius:10,
            padding:"8px 14px",cursor:"pointer",fontSize:16}} onClick={()=>setViewDate(d=>{const x=new Date(d);x.setMonth(x.getMonth()-1);return x;})}>‹</button>
          <span style={{fontSize:16,fontWeight:800,color:"#fff"}}>{year}年{month+1}月</span>
          <button style={{background:"rgba(255,255,255,0.08)",border:"none",color:"#fff",borderRadius:10,
            padding:"8px 14px",cursor:"pointer",fontSize:16}} onClick={()=>setViewDate(d=>{const x=new Date(d);x.setMonth(x.getMonth()+1);return x;})}>›</button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4,marginBottom:6}}>
          {["日","月","火","水","木","金","土"].map((w,i)=>(
            <div key={w} style={{textAlign:"center",fontSize:12,fontWeight:700,
              color:i===0?"#f87171":i===6?"#60a5fa":"#64748b",padding:"4px 0"}}>{w}</div>
          ))}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4}}>
          {cells.map((d,i)=>{
            const dots = d ? (taskDots[d]||[]) : [];
            const isToday = d && new Date().getDate()===d && new Date().getMonth()===month && new Date().getFullYear()===year;
            return (
              <div key={i} style={{minHeight:44,background:d?"rgba(255,255,255,0.05)":"transparent",
                borderRadius:10,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"flex-start",
                padding:"5px 2px",border:isToday?"1px solid #818cf8":"1px solid transparent"}}>
                {d && <span style={{fontSize:13,fontWeight:isToday?800:400,color:isToday?"#818cf8":"#cbd5e1"}}>{d}</span>}
                {d && dots.length>0 && (
                  <div style={{display:"flex",gap:2,marginTop:2,flexWrap:"wrap",justifyContent:"center"}}>
                    {[...new Set(dots)].map(cat=>(
                      <div key={cat} style={{width:6,height:6,borderRadius:"50%",background:catDotColor[cat]}}/>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  /* ── Profile view ── */
  const ProfileView = () => (
    <div style={{padding:"0 16px 20px"}}>
      <div style={{background:"rgba(255,255,255,0.05)",borderRadius:18,padding:"20px 18px",marginBottom:12}}>
        <div style={{fontSize:15,fontWeight:800,color:"#fff",marginBottom:14}}>📊 サマリー</div>
        {Object.entries(CAT_META).map(([k,v])=>(
          <div key={k} style={{display:"flex",justifyContent:"space-between",alignItems:"center",
            padding:"8px 0",borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
            <span style={{fontSize:13,color:"#e2e8f0"}}>{v.label}</span>
            <span style={{fontSize:14,fontWeight:800,color:"#fff"}}>{tasks.filter(t=>t.cat===k&&!t.done).length}件待ち</span>
          </div>
        ))}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0"}}>
          <span style={{fontSize:13,color:"#e2e8f0"}}>完了済み</span>
          <span style={{fontSize:14,fontWeight:800,color:"#34d399"}}>{tasks.filter(t=>t.done).length}件</span>
        </div>
      </div>
      {doneTasks.length>0 && (
        <div style={{background:"rgba(255,255,255,0.05)",borderRadius:18,padding:"16px 18px"}}>
          <div style={{fontSize:14,fontWeight:800,color:"#94a3b8",marginBottom:10}}>✅ 完了済みタスク</div>
          {doneTasks.map(t=>(
            <div key={t.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",
              padding:"7px 0",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
              <div>
                <span style={{fontSize:11,color:t.cat==="shoot"?"#5bc8f5":t.cat==="edit"?"#a78bfa":"#f97316",fontWeight:700}}>
                  {CAT_META[t.cat].label}
                </span>
                <span style={{fontSize:13,color:"#94a3b8",marginLeft:8}}>{t.client}</span>
              </div>
              <button style={{background:"transparent",border:"1px solid rgba(255,255,255,0.15)",
                color:"#64748b",borderRadius:8,padding:"3px 9px",cursor:"pointer",fontSize:11}}
                onClick={()=>upd(t.id,{done:false})}>戻す</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  /* ── Main render ── */
  return (
    <div style={{minHeight:"100vh",background:"#2a2a2a",
      fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif",
      display:"flex",flexDirection:"column",maxWidth:600,margin:"0 auto",position:"relative"}}>

      {/* ─ Header ─ */}
      <header style={{background:"#1a1a1a",padding:"14px 16px 12px",
        display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",
        borderBottom:"1px solid rgba(255,255,255,0.08)",position:"sticky",top:0,zIndex:30}}>
        <span style={{fontSize:17,fontWeight:900,color:"#fff",letterSpacing:1}}>SNSスケジュール</span>
        <div style={{flex:1,textAlign:"center"}}>
          <span style={{fontSize:13,color:"#94a3b8",display:"block",fontSize:10,marginBottom:1}}>日付：</span>
          <span style={{fontSize:14,fontWeight:800,color:"#fff"}}>{todayLabel}</span>
        </div>
        {urgentCount>0 && (
          <div style={{background:"rgba(255,255,255,0.15)",borderRadius:20,padding:"5px 12px",
            display:"flex",alignItems:"center",gap:6}}>
            <div style={{width:8,height:8,background:"#94a3b8",borderRadius:"50%"}}/>
            <span style={{fontSize:12,color:"#fff",fontWeight:700}}>{urgentCount}件期限間近</span>
          </div>
        )}
      </header>

      {/* ─ Scrollable content ─ */}
      <div style={{flex:1,overflowY:"auto",paddingBottom:80}}>

        {tab==="calendar" ? (
          <>
            <div style={{padding:"14px 16px 0"}}>
              <div style={{fontSize:15,fontWeight:800,color:"#fff",marginBottom:12}}>📅 カレンダー</div>
            </div>
            <CalendarView/>
          </>
        ) : tab==="profile" ? (
          <>
            <div style={{padding:"14px 16px 10px"}}>
              <div style={{fontSize:15,fontWeight:800,color:"#fff",marginBottom:0}}>👤 プロフィール</div>
            </div>
            <ProfileView/>
          </>
        ) : (
          <>
            {/* ─ Sub header bar ─ */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
              padding:"12px 16px",gap:8,flexWrap:"wrap"}}>
              <button style={{background:"rgba(255,255,255,0.1)",color:"#fff",border:"none",
                borderRadius:20,padding:"7px 16px",fontSize:13,fontWeight:700,cursor:"pointer"}}
                onClick={()=>setTab("calendar")}>
                📅 カレンダー
              </button>
              <div style={{display:"flex",gap:8}}>
                <button style={{background:"rgba(255,255,255,0.1)",color:"#fff",border:"none",
                  borderRadius:20,padding:"7px 14px",fontSize:13,fontWeight:700,cursor:"pointer"}}
                  onClick={()=>setShowCM(true)}>
                  +クライアント
                </button>
                <button style={{background:"linear-gradient(135deg,#818cf8,#6366f1)",color:"#fff",border:"none",
                  borderRadius:20,padding:"7px 14px",fontSize:13,fontWeight:700,cursor:"pointer"}}
                  onClick={()=>openAdd()}>
                  +タスク追加
                </button>
              </div>
            </div>

            {/* ─ Category filter buttons ─ */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,padding:"0 16px 16px"}}>
              {Object.entries(CAT_META).map(([k,v])=>(
                <button key={k}
                  style={{background: catFilter===k ? v.grad : "rgba(255,255,255,0.08)",
                    border: catFilter===k ? "2px solid rgba(255,255,255,0.3)" : "2px solid transparent",
                    borderRadius:18,padding:"18px 0",color:"#fff",fontSize:17,fontWeight:900,cursor:"pointer",
                    boxShadow:catFilter===k?"0 4px 20px rgba(0,0,0,0.4)":"none",transition:"all .2s"}}
                  onClick={()=>setCatFilter(catFilter===k?null:k)}>
                  {v.label}
                </button>
              ))}
            </div>

            {/* ─ TODO list ─ */}
            <div style={{padding:"0 16px"}}>
              <div style={{fontSize:18,fontWeight:900,color:"#fff",marginBottom:14}}>直近のTODO</div>
              {visible.length===0 && (
                <div style={{textAlign:"center",color:"#475569",padding:"40px 0",fontSize:15}}>
                  タスクがありません 🎉
                </div>
              )}
              {visible.map(task=><TaskCard key={task.id} task={task}/>)}
            </div>

            {/* ─ Add button ─ */}
            <div style={{padding:"4px 16px 16px"}}>
              <button
                style={{width:"100%",padding:"18px 0",background:"transparent",
                  border:"2px dashed rgba(255,255,255,0.25)",borderRadius:18,
                  color:"rgba(255,255,255,0.6)",fontSize:17,fontWeight:800,cursor:"pointer",
                  transition:"all .2s"}}
                onClick={()=>openAdd()}>
                ＋追加
              </button>
            </div>
          </>
        )}
      </div>

      {/* ─ Bottom nav ─ */}
      <nav style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",
        width:"min(600px,100%)",background:"#1a1a1a",borderTop:"1px solid rgba(255,255,255,0.08)",
        display:"flex",justifyContent:"space-around",padding:"10px 0 14px",zIndex:30}}>
        {[
          {key:"calendar",icon:"📅"},
          {key:"home",    icon:"🏠"},
          {key:"profile", icon:"👤"},
        ].map(n=>(
          <button key={n.key}
            style={{background: tab===n.key ? "rgba(255,255,255,0.12)" : "transparent",
              border:"none",cursor:"pointer",borderRadius:14,padding:"8px 20px",
              display:"flex",flexDirection:"column",alignItems:"center",transition:"all .2s"}}
            onClick={()=>setTab(n.key)}>
            <span style={{fontSize:22}}>{n.icon}</span>
          </button>
        ))}
      </nav>

      {/* Modals */}
      <Modal/>
      {showCM && <ClientModal/>}
    </div>
  );
}