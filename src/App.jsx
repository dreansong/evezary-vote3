import { useState, useEffect, useRef } from "react";

const CANDIDATES = [
  { id:"a", name:"이브의숲1호재단",        en:"EVE FOREST No.1 Foundation",       color:"#2E6B3E", accent:"#4CAF50" },
  { id:"b", name:"이브탄소숲1호재단",       en:"EVE CARBON FOREST No.1 Foundation", color:"#1B5E20", accent:"#388E3C" },
  { id:"c", name:"이브꿈의숲재단",          en:"EVE DREAM FOREST Foundation",       color:"#33691E", accent:"#7CB342" },
  { id:"d", name:"이브슬립숲재단",          en:"EVE SLEEP FOREST Foundation",       color:"#37474F", accent:"#78909C" },
  { id:"e", name:"이브자리탄소상쇄숲1호재단", en:"EVEZARY Carbon Offset Forest No.1", color:"#4E342E", accent:"#8D6E63" },
];

const VOTE_KEY   = "evezary-votes-v2";
const DONATE_KEY = "evezary-donations-v2";
const GOAL       = 10000000;
const ADMIN_PW   = "evezary2026";

function formatWon(n) {
  if (n >= 100000000) return `${(n/100000000).toFixed(1)}억원`;
  if (n >= 10000000)  return `${(n/10000000).toFixed(1)}천만원`;
  if (n >= 1000000)   return `${(n/1000000).toFixed(1)}백만원`;
  if (n >= 10000)     return `${Math.floor(n/10000).toLocaleString()}만원`;
  return `${n.toLocaleString()}원`;
}
function now() { return new Date().toLocaleString("ko-KR"); }

// ─────────────────────────────────────────────
export default function App() {
  const [tab, setTab]         = useState("main"); // main | admin
  const [adminPw, setAdminPw] = useState("");
  const [adminOk, setAdminOk] = useState(false);
  const [adminErr, setAdminErr] = useState(false);

  return tab === "admin"
    ? <AdminPanel
        adminOk={adminOk} adminPw={adminPw} adminErr={adminErr}
        setAdminPw={setAdminPw} setAdminOk={setAdminOk} setAdminErr={setAdminErr}
        onBack={()=>setTab("main")}
      />
    : <MainApp onAdmin={()=>setTab("admin")} />;
}

// ─────────────────────────────────────────────
function MainApp({ onAdmin }) {
  const [voteData,   setVoteData]   = useState({ records:[], summary:{} });
  const [donateData, setDonateData] = useState({ records:[], total:0 });
  const [loading,    setLoading]    = useState(true);

  // vote form
  const [voterName,  setVoterName]  = useState("");
  const [selected,   setSelected]   = useState(null);
  const [voteReason, setVoteReason] = useState("");
  const [submittingV,setSubmittingV]= useState(false);
  const [voteDone,   setVoteDone]   = useState(false);
  const [lastVoted,  setLastVoted]  = useState(null);

  // donate form
  const [donorName,  setDonorName]  = useState("");
  const [donating,   setDonating]   = useState(false);
  const [floats,     setFloats]     = useState([]);
  const [thankMsg,   setThankMsg]   = useState(false);
  const [myDonation, setMyDonation] = useState(0);
  const [donateAnim, setDonateAnim] = useState(false);
  const floatId = useRef(0);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [vr, dr] = await Promise.allSettled([
        window.storage.get(VOTE_KEY, true),
        window.storage.get(DONATE_KEY, true),
      ]);
      if (vr.status==="fulfilled" && vr.value?.value)   setVoteData(JSON.parse(vr.value.value));
      if (dr.status==="fulfilled" && dr.value?.value)   setDonateData(JSON.parse(dr.value.value));
    } catch {}
    setLoading(false);
  }

  async function submitVote() {
    if (!selected || submittingV) return;
    if (!voterName.trim()) { alert("이름을 입력해주세요."); return; }
    setSubmittingV(true);
    try {
      let cur = { ...voteData };
      cur.records = [...(cur.records||[]), { name:voterName.trim(), candidateId:selected, reason:voteReason.trim(), ts:now() }];
      if (cur.records.length > 500) cur.records = cur.records.slice(-500);
      cur.summary = { ...cur.summary, [selected]: (cur.summary[selected]||0)+1 };
      await window.storage.set(VOTE_KEY, JSON.stringify(cur), true);
      setVoteData(cur);
      setLastVoted(selected);
      setVoteDone(true);
      setVoterName(""); setSelected(null); setVoteReason("");
    } catch { alert("저장 오류. 다시 시도해주세요."); }
    setSubmittingV(false);
  }

  async function submitDonate() {
    if (donating) return;
    if (!donorName.trim()) { alert("이름을 입력해주세요."); return; }
    setDonating(true);
    setDonateAnim(true);
    setTimeout(()=>setDonateAnim(false), 600);
    const fid = floatId.current++;
    setFloats(prev=>[...prev, fid]);
    setTimeout(()=>setFloats(prev=>prev.filter(x=>x!==fid)), 1400);
    try {
      let cur;
      try {
        const r = await window.storage.get(DONATE_KEY, true);
        cur = r?.value ? JSON.parse(r.value) : { records:[], total:0 };
      } catch { cur = { records:[], total:0 }; }
      cur.records = [...(cur.records||[]), { name:donorName.trim(), amount:10000, ts:now() }];
      if (cur.records.length > 500) cur.records = cur.records.slice(-500);
      cur.total = (cur.total||0)+10000;
      await window.storage.set(DONATE_KEY, JSON.stringify(cur), true);
      setDonateData(cur);
      setMyDonation(p=>p+10000);
      setThankMsg(true);
      setTimeout(()=>setThankMsg(false), 2800);
    } catch { alert("저장 오류."); }
    setDonating(false);
  }

  const summary   = voteData.summary || {};
  const totalVotes= Object.values(summary).reduce((a,b)=>a+b,0);
  const getP      = id => totalVotes===0 ? 0 : Math.round(((summary[id]||0)/totalVotes)*100);
  const sorted    = [...CANDIDATES].sort((a,b)=>(summary[b.id]||0)-(summary[a.id]||0));
  const winner    = totalVotes===0 ? null : sorted[0];
  const total     = donateData.total||0;
  const goalPct   = Math.min(100, Math.round((total/GOAL)*100));
  const treeCount = Math.max(1, Math.min(20, Math.floor(total/50000)+1));
  const lastC     = CANDIDATES.find(c=>c.id===lastVoted);

  return (
    <div style={S.root}>
      <BgLayer/>
      <Styles/>

      <div style={S.wrap}>
        {/* HEADER */}
        <div style={{textAlign:"center", padding:"36px 0 24px", animation:"fadeUp .8s ease both"}}>
          <div style={S.badge}>🌱 EVEZARY · 공익재단 네이밍 공모 · 2026</div>
          <h1 style={S.h1}>
            재단 이름을 <span style={{color:"#7CB342"}}>한 표</span>로,<br/>
            숲을 <span style={{color:"#D4AC50"}}>1만 원</span>으로 키워주세요
          </h1>
          <p style={S.subp}>대한민국 1호 산림탄소상쇄 기업 이브자리 공익재단<br/>이름 투표 + 나무 한 그루 후원 캠페인</p>

          {!loading && (
            <div style={{display:"flex",justifyContent:"center",gap:24,marginTop:18,flexWrap:"wrap"}}>
              {[
                {val:`${totalVotes}표`,     label:"TOTAL VOTES",   color:"#7CB342"},
                {val:formatWon(total),      label:"후원 의향 총액", color:"#D4AC50"},
                {val:`${(donateData.records||[]).filter((r,i,a)=>a.findIndex(x=>x.name===r.name)===i).length}명`, label:"DONORS", color:"#78909C"},
              ].map(({val,label,color})=>(
                <div key={label} style={{textAlign:"center"}}>
                  <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:24,fontWeight:600,color,lineHeight:1}}>{val}</div>
                  <div style={{fontSize:9,color:"rgba(232,245,233,.3)",letterSpacing:2,marginTop:3}}>{label}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {loading ? <Loader/> : (<>

          {/* ══ DONATION CARD ══ */}
          <Card style={{marginBottom:18, animation:"fadeUp .7s .1s ease both"}}>
            <ShimmerBg/>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:18,gap:12}}>
              <div>
                <div style={S.cardTag}>🌳 1그루 후원 캠페인</div>
                <div style={S.cardTitle}>내 이름 나무 한 그루<br/>심기에 참여해주세요</div>
                <div style={S.cardDesc}>버튼 1회 클릭 = <span style={{color:"#D4AC50",fontWeight:600}}>1만원 후원 의향</span> 등록<br/>재단 출범 첫 기부자 명단에 영구 등재됩니다</div>
              </div>
              <div style={{textAlign:"right",flexShrink:0}}>
                <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:28,fontWeight:700,color:"#D4AC50",lineHeight:1}}>{formatWon(total)}</div>
                <div style={{fontSize:9,color:"rgba(232,245,233,.3)",letterSpacing:1.5,marginTop:4}}>목표 {formatWon(GOAL)}</div>
              </div>
            </div>

            {/* progress */}
            <div style={{marginBottom:16}}>
              <div style={{height:10,background:"rgba(255,255,255,.07)",borderRadius:5,overflow:"hidden",marginBottom:5}}>
                <div style={{height:"100%",borderRadius:5,width:`${goalPct}%`,background:"linear-gradient(90deg,#7a5c18,#D4AC50,#f5d060)",transition:"width 1.2s cubic-bezier(.4,0,.2,1)",boxShadow:goalPct>0?"0 0 12px rgba(212,172,80,.5)":"none"}}/>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"rgba(232,245,233,.25)"}}>
                <span>0원</span><span>{goalPct}% 달성 · 목표 {formatWon(GOAL)}</span>
              </div>
            </div>

            {/* trees */}
            <div style={{display:"flex",alignItems:"flex-end",justifyContent:"center",gap:5,height:48,marginBottom:18}}>
              {[...Array(treeCount)].map((_,i)=>{
                const h=18+(i%5)*7, w=5+(i%3)*2;
                return (
                  <div key={i} style={{display:"flex",flexDirection:"column",alignItems:"center",animation:`treeSway ${2.5+i*0.25}s ease-in-out infinite ${i*0.12}s`}}>
                    <div style={{width:0,height:0,borderLeft:`${w+2}px solid transparent`,borderRight:`${w+2}px solid transparent`,borderBottom:`${h}px solid rgba(107,171,116,${0.45+i*0.025})`}}/>
                    <div style={{width:3,height:4,background:"rgba(101,67,33,.6)",borderRadius:1}}/>
                  </div>
                );
              })}
            </div>

            {/* name input */}
            <input
              value={donorName} onChange={e=>setDonorName(e.target.value)}
              placeholder="후원자 이름을 입력해주세요 (필수)"
              maxLength={20}
              style={{...S.input, marginBottom:10}}
            />

            {myDonation>0 && (
              <div style={S.myBadge}>
                <span style={{fontSize:20}}>🌱</span>
                <div>
                  <div style={{fontSize:10,color:"#D4AC50",fontWeight:600,letterSpacing:1}}>나의 후원 의향</div>
                  <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:16,color:"#fff",fontWeight:600}}>{formatWon(myDonation)} <span style={{fontSize:12,color:"rgba(232,245,233,.45)"}}>({myDonation/10000}그루)</span></div>
                </div>
              </div>
            )}

            {/* recent donors */}
            {donateData.records && donateData.records.length>0 && (
              <div style={{marginBottom:12}}>
                <div style={{fontSize:10,color:"rgba(232,245,233,.3)",letterSpacing:2,marginBottom:8}}>🌿 최근 후원자</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                  {[...donateData.records].reverse().slice(0,8).map((r,i)=>(
                    <span key={i} style={{fontSize:11,padding:"3px 10px",borderRadius:20,background:"rgba(184,148,58,.12)",color:"#D4AC50",border:"1px solid rgba(184,148,58,.2)"}}>
                      {r.name} {formatWon(r.amount)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* donate button */}
            <div style={{position:"relative"}}>
              {floats.map(id=>(
                <div key={id} style={{position:"absolute",top:-16,left:"50%",transform:"translateX(-50%)",fontFamily:"'Cormorant Garamond',serif",fontSize:20,fontWeight:700,color:"#f5c842",pointerEvents:"none",zIndex:30,whiteSpace:"nowrap",animation:"floatUp 1.4s ease-out both",textShadow:"0 2px 8px rgba(0,0,0,.5)"}}>
                  🌳 + 10,000원
                </div>
              ))}
              {thankMsg && (
                <div style={{position:"absolute",bottom:"calc(100% + 12px)",left:"50%",background:"rgba(10,26,14,.96)",border:"1px solid rgba(184,148,58,.5)",borderRadius:12,padding:"10px 20px",fontSize:13,color:"#D4AC50",fontWeight:600,whiteSpace:"nowrap",zIndex:40,animation:"thankSlide 2.8s ease both",boxShadow:"0 4px 20px rgba(0,0,0,.6)",pointerEvents:"none"}}>
                  🌱 감사합니다! 지구의 숲이 한 그루 더 자랍니다
                </div>
              )}
              <button onClick={submitDonate} disabled={donating} className="dbtn" style={{
                ...S.goldBtn,
                animation: donateAnim ? "donateShake .55s ease" : "none",
                opacity: donating ? 0.5 : 1,
              }}>
                {donating ? "⏳ 처리 중..." : "🌳  나무 한 그루 심기  ·  10,000원"}
                {!donating && <Shimmer/>}
              </button>
            </div>
            <div style={{textAlign:"center",marginTop:9,fontSize:11,color:"rgba(232,245,233,.22)",lineHeight:1.6}}>
              ※ 현재는 후원 의향 집계입니다. 실제 결제는 재단 출범 후 별도 안내됩니다.
            </div>
          </Card>

          {/* ══ VOTE CARD ══ */}
          <Card style={{marginBottom:14, animation:"fadeUp .7s .2s ease both"}}>
            <div style={{fontSize:11,letterSpacing:3,color:"rgba(232,245,233,.35)",marginBottom:16}}>
              🗳️ 재단 이름 투표 — 중복 참여 가능합니다
            </div>

            {/* vote success flash */}
            {voteDone && lastC && (
              <div style={{...S.myBadge, marginBottom:14, animation:"popIn .4s ease both", borderColor:`${lastC.accent}66`}}>
                <span style={{fontSize:22}}>✅</span>
                <div>
                  <div style={{fontSize:11,color:"rgba(232,245,233,.5)",marginBottom:2}}>투표 완료!</div>
                  <div style={{fontFamily:"'Noto Serif KR',serif",fontSize:14,fontWeight:700,color:"#fff"}}>{lastC.name}</div>
                  <div style={{fontSize:11,color:"rgba(232,245,233,.4)",marginTop:1}}>현재 {summary[lastC.id]||0}표 · {getP(lastC.id)}% 지지</div>
                </div>
                <button onClick={()=>setVoteDone(false)} style={{marginLeft:"auto",background:"none",border:"none",color:"rgba(232,245,233,.3)",fontSize:16,cursor:"pointer",padding:4}}>×</button>
              </div>
            )}

            {/* name input */}
            <input
              value={voterName} onChange={e=>setVoterName(e.target.value)}
              placeholder="투표자 이름을 입력해주세요 (필수)"
              maxLength={20}
              style={{...S.input, marginBottom:12}}
            />

            {/* candidates */}
            <div style={{display:"flex",flexDirection:"column",gap:9,marginBottom:14}}>
              {CANDIDATES.map((c,i)=>{
                const sel = selected===c.id;
                return (
                  <div key={c.id} className="chov" onClick={()=>setSelected(c.id)} style={{
                    background: sel?`linear-gradient(135deg,${c.color}55,${c.color}22)`:"rgba(255,255,255,.04)",
                    border:`1.5px solid ${sel?c.accent:"rgba(255,255,255,.08)"}`,
                    borderRadius:13, padding:"12px 14px",
                    boxShadow: sel?`0 4px 18px ${c.color}44`:"none",
                    animation:`fadeUp .5s ${.07*i+.1}s ease both`, animationFillMode:"forwards", opacity:0,
                  }}>
                    <div style={{display:"flex",alignItems:"center",gap:11}}>
                      <div style={{width:20,height:20,borderRadius:"50%",flexShrink:0,border:`2px solid ${sel?c.accent:"rgba(255,255,255,.2)"}`,background:sel?c.accent:"transparent",display:"flex",alignItems:"center",justifyContent:"center",animation:sel?"pulse 2s infinite":"none"}}>
                        {sel&&<span style={{fontSize:10,color:"#fff"}}>✓</span>}
                      </div>
                      <div style={{flex:1}}>
                        <div style={{display:"flex",alignItems:"baseline",gap:8,flexWrap:"wrap"}}>
                          <span style={{fontFamily:"'Noto Serif KR',serif",fontSize:15,fontWeight:700,color:sel?"#fff":"#c8e6c9"}}>{c.name}</span>
                          <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:11,fontStyle:"italic",color:"rgba(232,245,233,.28)"}}>{c.en}</span>
                        </div>
                        <div style={{display:"flex",alignItems:"center",gap:8,marginTop:6}}>
                          <div style={{height:5,flex:1,background:"rgba(255,255,255,.06)",borderRadius:3,overflow:"hidden"}}>
                            <div style={{height:"100%",width:`${getP(c.id)}%`,background:`linear-gradient(90deg,${c.color},${c.accent})`,borderRadius:3,transition:"width 1s ease"}}/>
                          </div>
                          <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:15,color:c.accent,minWidth:42,textAlign:"right"}}>{getP(c.id)}%</span>
                          <span style={{fontSize:10,color:"rgba(232,245,233,.3)",minWidth:28}}>{summary[c.id]||0}표</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <textarea
              value={voteReason} onChange={e=>setVoteReason(e.target.value)}
              placeholder="이 이름을 선택한 이유를 남겨주세요 (선택, 최대 100자)"
              maxLength={100} rows={2}
              style={{...S.input, resize:"none", lineHeight:1.6, marginBottom:12}}
            />

            <button onClick={submitVote} disabled={submittingV||!selected} className="chov" style={{
              width:"100%",padding:"15px",
              background:(!selected||submittingV)?"rgba(76,175,80,.25)":"linear-gradient(135deg,#2E6B3E,#4CAF50)",
              border:"none",borderRadius:13,color:"#fff",fontSize:14,fontWeight:700,letterSpacing:1.5,
              cursor:(!selected||submittingV)?"not-allowed":"pointer",
              fontFamily:"'Noto Sans KR',sans-serif",
              boxShadow:selected?"0 6px 20px rgba(76,175,80,.35)":"none",
              position:"relative",overflow:"hidden",transition:"all .2s",
            }}>
              {submittingV ? "⏳ 제출 중..." : selected ? `「${CANDIDATES.find(c=>c.id===selected)?.name}」에 투표하기 →` : "후보를 선택해주세요"}
              {selected && !submittingV && <Shimmer/>}
            </button>

            {/* recent voters */}
            {voteData.records && voteData.records.length>0 && (
              <div style={{marginTop:16}}>
                <div style={{fontSize:10,color:"rgba(232,245,233,.3)",letterSpacing:2,marginBottom:8}}>🗳️ 최근 투표자</div>
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  {[...voteData.records].reverse().slice(0,5).map((r,i)=>{
                    const c=CANDIDATES.find(x=>x.id===r.candidateId);
                    return (
                      <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 12px",background:"rgba(255,255,255,.03)",borderRadius:9,borderLeft:`3px solid ${c?.accent||"#4CAF50"}`}}>
                        <span style={{fontSize:13,fontWeight:600,color:"#e8f5e9",minWidth:60}}>{r.name}</span>
                        <span style={{fontSize:11,color:c?.accent,flex:1}}>→ {c?.name}</span>
                        {r.reason && <span style={{fontSize:10,color:"rgba(232,245,233,.4)",maxWidth:120,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>"{r.reason}"</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </Card>

          <button onClick={loadAll} style={S.refreshBtn}>🔄 결과 새로고침</button>

          {/* admin link */}
          <div style={{textAlign:"center",marginTop:12}}>
            <button onClick={onAdmin} style={{background:"none",border:"none",fontSize:11,color:"rgba(232,245,233,.2)",cursor:"pointer",letterSpacing:2,textDecoration:"underline",fontFamily:"'Noto Sans KR',sans-serif"}}>
              관리자 패널
            </button>
          </div>
        </>)}

        <Footer/>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
function AdminPanel({ adminOk, adminPw, adminErr, setAdminPw, setAdminOk, setAdminErr, onBack }) {
  const [voteData,   setVoteData]   = useState(null);
  const [donateData, setDonateData] = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [activeTab,  setActiveTab]  = useState("votes"); // votes | donors | guide

  async function login() {
    if (adminPw === ADMIN_PW) {
      setAdminOk(true); setAdminErr(false);
      await loadData();
    } else { setAdminErr(true); }
  }

  async function loadData() {
    setLoading(true);
    try {
      const [vr, dr] = await Promise.allSettled([
        window.storage.get(VOTE_KEY, true),
        window.storage.get(DONATE_KEY, true),
      ]);
      if (vr.status==="fulfilled" && vr.value?.value) setVoteData(JSON.parse(vr.value.value));
      if (dr.status==="fulfilled" && dr.value?.value) setDonateData(JSON.parse(dr.value.value));
    } catch {}
    setLoading(false);
  }

  function downloadCSV(rows, filename) {
    const bom = "\uFEFF";
    const csv = bom + rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], {type:"text/csv;charset=utf-8;"});
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href=url; a.download=filename; a.click();
    URL.revokeObjectURL(url);
  }

  function exportVotes() {
    const rows = [["번호","이름","선택한 이름","이유","일시"]];
    (voteData?.records||[]).forEach((r,i)=>{
      const c = CANDIDATES.find(x=>x.id===r.candidateId);
      rows.push([i+1, r.name, c?.name||r.candidateId, r.reason||"", r.ts]);
    });
    downloadCSV(rows, "evezary_votes.csv");
  }

  function exportDonors() {
    const rows = [["번호","후원자 이름","금액","일시"]];
    (donateData?.records||[]).forEach((r,i)=>{
      rows.push([i+1, r.name, r.amount, r.ts]);
    });
    downloadCSV(rows, "evezary_donors.csv");
  }

  const summary = voteData?.summary||{};
  const totalVotes = Object.values(summary).reduce((a,b)=>a+b,0);
  const totalDonate = donateData?.total||0;

  return (
    <div style={S.root}>
      <BgLayer dark/>
      <Styles/>
      <div style={S.wrap}>
        <div style={{display:"flex",alignItems:"center",gap:12,padding:"28px 0 20px",animation:"fadeUp .6s ease both"}}>
          <button onClick={onBack} style={{background:"rgba(255,255,255,.07)",border:"1px solid rgba(255,255,255,.12)",borderRadius:8,color:"rgba(232,245,233,.7)",fontSize:13,padding:"6px 14px",cursor:"pointer",fontFamily:"'Noto Sans KR',sans-serif"}}>← 돌아가기</button>
          <div>
            <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:22,color:"#e8f5e9",letterSpacing:3,fontStyle:"italic"}}>EVEZARY</div>
            <div style={{fontSize:10,color:"rgba(232,245,233,.3)",letterSpacing:3}}>관리자 패널</div>
          </div>
        </div>

        {!adminOk ? (
          <Card>
            <div style={{fontSize:13,color:"rgba(232,245,233,.5)",marginBottom:16,letterSpacing:1}}>🔐 관리자 비밀번호를 입력해주세요</div>
            <input
              type="password" value={adminPw} onChange={e=>setAdminPw(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&login()}
              placeholder="비밀번호"
              style={{...S.input, marginBottom:10}}
            />
            {adminErr && <div style={{fontSize:12,color:"#ef5350",marginBottom:10}}>비밀번호가 올바르지 않습니다.</div>}
            <button onClick={login} style={{...S.goldBtn}}>로그인 →</button>
          </Card>
        ) : (
          <>
            {/* summary */}
            <div style={{display:"flex",gap:12,marginBottom:18,flexWrap:"wrap"}}>
              {[
                {icon:"🗳️", val:`${totalVotes}표`,     label:"총 투표수",     color:"#7CB342"},
                {icon:"💰", val:formatWon(totalDonate), label:"후원 의향 총액", color:"#D4AC50"},
                {icon:"👤", val:`${(donateData?.records||[]).filter((r,i,a)=>a.findIndex(x=>x.name===r.name)===i).length}명`, label:"후원자 수", color:"#78909C"},
              ].map(({icon,val,label,color})=>(
                <div key={label} style={{flex:1,minWidth:120,background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.08)",borderRadius:14,padding:"14px 16px",textAlign:"center"}}>
                  <div style={{fontSize:20,marginBottom:4}}>{icon}</div>
                  <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:22,fontWeight:600,color,lineHeight:1}}>{val}</div>
                  <div style={{fontSize:10,color:"rgba(232,245,233,.35)",marginTop:4,letterSpacing:1}}>{label}</div>
                </div>
              ))}
            </div>

            {/* tabs */}
            <div style={{display:"flex",gap:8,marginBottom:14}}>
              {[["votes","🗳️ 투표 명단"],["donors","🌳 후원 명단"],["guide","📋 구글 시트 연동"]].map(([id,label])=>(
                <button key={id} onClick={()=>setActiveTab(id)} style={{
                  flex:1,padding:"9px 6px",borderRadius:10,border:"none",fontSize:12,fontWeight:600,
                  cursor:"pointer",fontFamily:"'Noto Sans KR',sans-serif",letterSpacing:0.5,
                  background:activeTab===id?"rgba(76,175,80,.25)":"rgba(255,255,255,.05)",
                  color:activeTab===id?"#7CB342":"rgba(232,245,233,.5)",
                  borderBottom:activeTab===id?"2px solid #4CAF50":"2px solid transparent",
                  transition:"all .2s",
                }}>{label}</button>
              ))}
            </div>

            {loading ? <Loader/> : (<>

              {activeTab==="votes" && (
                <Card>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                    <div style={{fontSize:11,color:"rgba(232,245,233,.4)",letterSpacing:2}}>투표 명단 — 총 {(voteData?.records||[]).length}건</div>
                    <button onClick={exportVotes} style={S.exportBtn}>⬇ CSV 다운로드</button>
                  </div>

                  {/* vote summary bars */}
                  <div style={{marginBottom:18}}>
                    {[...CANDIDATES].sort((a,b)=>(summary[b.id]||0)-(summary[a.id]||0)).map(c=>{
                      const pct = totalVotes===0?0:Math.round(((summary[c.id]||0)/totalVotes)*100);
                      return (
                        <div key={c.id} style={{marginBottom:10}}>
                          <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                            <span style={{fontSize:13,color:"#e8f5e9",fontFamily:"'Noto Serif KR',serif"}}>{c.name}</span>
                            <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:16,color:c.accent}}>{pct}% <span style={{fontSize:11,color:"rgba(232,245,233,.4)"}}>{summary[c.id]||0}표</span></span>
                          </div>
                          <div style={{height:6,background:"rgba(255,255,255,.06)",borderRadius:3,overflow:"hidden"}}>
                            <div style={{height:"100%",width:`${pct}%`,background:`linear-gradient(90deg,${c.color},${c.accent})`,borderRadius:3,transition:"width 1s ease"}}/>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* records */}
                  <div style={{maxHeight:360,overflowY:"auto",display:"flex",flexDirection:"column",gap:7}}>
                    {[...(voteData?.records||[])].reverse().map((r,i)=>{
                      const c=CANDIDATES.find(x=>x.id===r.candidateId);
                      return (
                        <div key={i} style={{display:"flex",gap:10,alignItems:"flex-start",padding:"9px 12px",background:"rgba(255,255,255,.03)",borderRadius:9,borderLeft:`3px solid ${c?.accent||"#4CAF50"}`}}>
                          <span style={{fontSize:10,color:"rgba(232,245,233,.25)",minWidth:22,paddingTop:1}}>{(voteData.records.length)-i}</span>
                          <div style={{flex:1}}>
                            <div style={{display:"flex",gap:10,alignItems:"baseline",flexWrap:"wrap"}}>
                              <span style={{fontSize:13,fontWeight:600,color:"#e8f5e9"}}>{r.name}</span>
                              <span style={{fontSize:11,color:c?.accent}}>→ {c?.name}</span>
                            </div>
                            {r.reason && <div style={{fontSize:11,color:"rgba(232,245,233,.45)",marginTop:2}}>"{r.reason}"</div>}
                            <div style={{fontSize:10,color:"rgba(232,245,233,.2)",marginTop:2}}>{r.ts}</div>
                          </div>
                        </div>
                      );
                    })}
                    {!(voteData?.records?.length) && <div style={{textAlign:"center",padding:30,color:"rgba(232,245,233,.3)",fontSize:13}}>아직 투표 데이터가 없습니다.</div>}
                  </div>
                </Card>
              )}

              {activeTab==="donors" && (
                <Card>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                    <div style={{fontSize:11,color:"rgba(232,245,233,.4)",letterSpacing:2}}>후원 명단 — 총 {(donateData?.records||[]).length}건</div>
                    <button onClick={exportDonors} style={S.exportBtn}>⬇ CSV 다운로드</button>
                  </div>

                  {/* donor aggregate */}
                  <div style={{marginBottom:16,padding:"12px 14px",background:"rgba(184,148,58,.08)",border:"1px solid rgba(184,148,58,.2)",borderRadius:12}}>
                    <div style={{fontSize:10,color:"#D4AC50",letterSpacing:2,marginBottom:8}}>후원자별 합계</div>
                    {Object.entries(
                      (donateData?.records||[]).reduce((acc,r)=>{acc[r.name]=(acc[r.name]||0)+r.amount;return acc;},{})
                    ).sort((a,b)=>b[1]-a[1]).map(([name,amt],i)=>(
                      <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid rgba(184,148,58,.1)"}}>
                        <span style={{fontSize:13,color:"#e8f5e9"}}>{name}</span>
                        <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:15,color:"#D4AC50",fontWeight:600}}>{formatWon(amt)} <span style={{fontSize:10,color:"rgba(232,245,233,.4)"}}>({amt/10000}그루)</span></span>
                      </div>
                    ))}
                    {!(donateData?.records?.length) && <div style={{textAlign:"center",padding:16,color:"rgba(232,245,233,.3)",fontSize:13}}>아직 후원 데이터가 없습니다.</div>}
                  </div>

                  <div style={{maxHeight:320,overflowY:"auto",display:"flex",flexDirection:"column",gap:7}}>
                    {[...(donateData?.records||[])].reverse().map((r,i)=>(
                      <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 12px",background:"rgba(255,255,255,.03)",borderRadius:9,borderLeft:"3px solid #D4AC50"}}>
                        <div>
                          <div style={{fontSize:13,fontWeight:600,color:"#e8f5e9"}}>{r.name}</div>
                          <div style={{fontSize:10,color:"rgba(232,245,233,.25)",marginTop:2}}>{r.ts}</div>
                        </div>
                        <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:16,color:"#D4AC50",fontWeight:600}}>{formatWon(r.amount)}</div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {activeTab==="guide" && (
                <Card>
                  <div style={{fontSize:13,color:"#D4AC50",fontWeight:600,marginBottom:16,letterSpacing:1}}>📋 Google Sheets 자동 연동 방법</div>

                  <div style={{display:"flex",flexDirection:"column",gap:14}}>
                    {[
                      {step:"1", title:"Google Sheets 열기", desc:"Google Drive에서 새 스프레드시트를 만들고 시트 이름을 '투표' / '후원'으로 변경합니다."},
                      {step:"2", title:"Apps Script 열기", desc:"상단 메뉴 → 확장 프로그램 → Apps Script를 클릭합니다."},
                      {step:"3", title:"스크립트 붙여넣기", desc:"아래 코드를 붙여넣고 저장합니다. (Ctrl+S)"},
                      {step:"4", title:"웹앱 배포", desc:"배포 → 새 배포 → 유형: 웹앱 → 액세스: 모든 사용자 → 배포 클릭. 생성된 URL을 복사합니다."},
                      {step:"5", title:"앱 코드에 URL 입력", desc:"이 앱의 submitVote / submitDonate 함수 안에 fetch(APPS_SCRIPT_URL, ...) 를 추가하면 자동 저장됩니다."},
                    ].map(({step,title,desc})=>(
                      <div key={step} style={{display:"flex",gap:12,alignItems:"flex-start"}}>
                        <div style={{width:26,height:26,borderRadius:"50%",background:"rgba(184,148,58,.25)",border:"1px solid rgba(184,148,58,.4)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#D4AC50",flexShrink:0,marginTop:1}}>{step}</div>
                        <div>
                          <div style={{fontSize:13,fontWeight:600,color:"#e8f5e9",marginBottom:3}}>{title}</div>
                          <div style={{fontSize:12,color:"rgba(232,245,233,.55)",lineHeight:1.65}}>{desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{marginTop:18,background:"rgba(0,0,0,.3)",borderRadius:10,padding:"14px 16px",fontFamily:"monospace",fontSize:11,color:"#a5d6a7",lineHeight:1.8,overflowX:"auto"}}>
                    <div style={{color:"rgba(232,245,233,.3)",marginBottom:6}}>// Google Apps Script 코드</div>
                    <div>{"function doPost(e) {"}</div>
                    <div>{"  const data = JSON.parse(e.postData.contents);"}</div>
                    <div>{"  const ss = SpreadsheetApp.getActiveSpreadsheet();"}</div>
                    <div>{"  const sheet = ss.getSheetByName(data.type==='vote'?'투표':'후원');"}</div>
                    <div>{"  if(data.type==='vote') {"}</div>
                    <div>{"    sheet.appendRow([data.name, data.candidate, data.reason, data.ts]);"}</div>
                    <div>{"  } else {"}</div>
                    <div>{"    sheet.appendRow([data.name, data.amount, data.ts]);"}</div>
                    <div>{"  }"}</div>
                    <div>{"  return ContentService.createTextOutput('ok');"}</div>
                    <div>{"}"}</div>
                  </div>

                  <div style={{marginTop:14,padding:"12px 14px",background:"rgba(76,175,80,.08)",border:"1px solid rgba(76,175,80,.2)",borderRadius:10}}>
                    <div style={{fontSize:12,color:"#81C784",lineHeight:1.7}}>
                      💡 <strong>당장은 CSV 다운로드로 충분합니다.</strong><br/>
                      투표 명단 / 후원 명단 탭에서 CSV 다운로드 버튼을 누르면<br/>
                      Excel·구글 시트에 바로 붙여넣을 수 있는 파일이 생성됩니다.
                    </div>
                  </div>

                  <button onClick={()=>{ exportVotes(); exportDonors(); }} style={{...S.goldBtn, marginTop:14}}>
                    ⬇ 전체 데이터 CSV 일괄 다운로드
                  </button>
                </Card>
              )}

              <button onClick={loadData} style={{...S.refreshBtn, marginTop:12}}>🔄 데이터 새로고침</button>
            </>)}
          </>
        )}
        <Footer/>
      </div>
    </div>
  );

  function exportVotes() {
    const rows=[["번호","이름","선택한 이름","이유","일시"]];
    (voteData?.records||[]).forEach((r,i)=>{const c=CANDIDATES.find(x=>x.id===r.candidateId);rows.push([i+1,r.name,c?.name||r.candidateId,r.reason||"",r.ts]);});
    dlCSV(rows,"evezary_votes.csv");
  }
  function exportDonors() {
    const rows=[["번호","후원자 이름","금액","일시"]];
    (donateData?.records||[]).forEach((r,i)=>rows.push([i+1,r.name,r.amount,r.ts]));
    dlCSV(rows,"evezary_donors.csv");
  }
  function dlCSV(rows,filename){
    const bom="\uFEFF",csv=bom+rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
    const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8;"}));a.download=filename;a.click();
  }
}

// ─────────────────────────────────────────────
// Shared UI components
function BgLayer({ dark }) {
  return (
    <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0}}>
      {[...Array(12)].map((_,i)=>(
        <div key={i} style={{position:"absolute",bottom:0,left:`${i*9}%`,width:0,height:0,borderLeft:`${20+(i%3)*12}px solid transparent`,borderRight:`${20+(i%3)*12}px solid transparent`,borderBottom:`${80+(i%4)*40}px solid rgba(46,107,62,${dark?0.02:0.04+(i%3)*0.02})`}}/>
      ))}
      {[...Array(6)].map((_,i)=>(
        <div key={i} style={{position:"absolute",width:3,height:3,borderRadius:"50%",background:"#f5c842",boxShadow:"0 0 8px 3px rgba(245,200,66,0.5)",top:`${20+(i*13)%60}%`,left:`${5+(i*17)%90}%`,animation:`ff${i%3} ${3+i*0.7}s ease-in-out infinite ${i*0.4}s`}}/>
      ))}
    </div>
  );
}
function Styles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;700;900&family=Noto+Sans+KR:wght@300;400;500;700&family=Cormorant+Garamond:ital,wght@0,600;1,400&display=swap');
      @keyframes ff0{0%,100%{opacity:0;transform:translate(0,0)}50%{opacity:1;transform:translate(10px,-15px)}}
      @keyframes ff1{0%,100%{opacity:0;transform:translate(0,0)}50%{opacity:.8;transform:translate(-8px,-20px)}}
      @keyframes ff2{0%,100%{opacity:0;transform:translate(0,0)}50%{opacity:.9;transform:translate(12px,-10px)}}
      @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
      @keyframes popIn{0%{transform:scale(.85);opacity:0}100%{transform:scale(1);opacity:1}}
      @keyframes shimmer{0%{left:-100%}100%{left:200%}}
      @keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(76,175,80,.4)}50%{box-shadow:0 0 0 8px rgba(76,175,80,0)}}
      @keyframes floatUp{0%{opacity:1;transform:translateY(0) scale(1)}100%{opacity:0;transform:translateY(-70px) scale(1.4)}}
      @keyframes donateShake{0%,100%{transform:scale(1)}25%{transform:scale(1.07)}60%{transform:scale(.96)}}
      @keyframes thankSlide{0%{opacity:0;transform:translateX(-50%) translateY(8px)}15%{opacity:1;transform:translateX(-50%) translateY(0)}85%{opacity:1}100%{opacity:0;transform:translateX(-50%) translateY(-10px)}}
      @keyframes treeSway{0%,100%{transform:scaleY(1)}50%{transform:scaleY(1.05)}}
      .chov{transition:transform .2s,box-shadow .2s;cursor:pointer}.chov:hover{transform:translateY(-2px)}
      .dbtn{transition:all .2s}.dbtn:hover:not(:disabled){filter:brightness(1.1);transform:translateY(-3px);box-shadow:0 12px 36px rgba(184,148,58,.55)!important}
      ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:#0a1a0e}::-webkit-scrollbar-thumb{background:#2E6B3E;border-radius:3px}
      input::placeholder,textarea::placeholder{color:rgba(232,245,233,.3)}
      input,textarea{color:#e8f5e9!important}
    `}</style>
  );
}
function Card({ children, style }) {
  return (
    <div style={{background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.08)",borderRadius:20,padding:"20px 20px",position:"relative",overflow:"hidden",...style}}>
      {children}
    </div>
  );
}
function ShimmerBg() {
  return <div style={{position:"absolute",top:0,left:"-100%",width:"60%",height:"100%",background:"linear-gradient(90deg,transparent,rgba(184,148,58,.06),transparent)",animation:"shimmer 5s 1s infinite",pointerEvents:"none"}}/>;
}
function Shimmer() {
  return <div style={{position:"absolute",top:0,left:"-100%",width:"60%",height:"100%",background:"linear-gradient(90deg,transparent,rgba(255,255,255,.2),transparent)",animation:"shimmer 2.5s infinite"}}/>;
}
function Loader() {
  return <div style={{textAlign:"center",padding:60,color:"rgba(232,245,233,.4)"}}><div style={{fontSize:32,marginBottom:12}}>🌿</div><div style={{fontSize:13,letterSpacing:2}}>불러오는 중...</div></div>;
}
function Footer() {
  return (
    <div style={{textAlign:"center",marginTop:32,paddingTop:18,borderTop:"1px solid rgba(255,255,255,.06)"}}>
      <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:16,fontStyle:"italic",color:"rgba(232,245,233,.18)",letterSpacing:4}}>EVEZARY</div>
      <div style={{fontSize:10,color:"rgba(232,245,233,.14)",marginTop:4,letterSpacing:2}}>이브자리 공익재단 네이밍 공모 · 2026.03.15 – 04.15</div>
    </div>
  );
}

// ─────────────────────────────────────────────
const S = {
  root:{ minHeight:"100vh", background:"linear-gradient(160deg,#0a1a0e 0%,#0f2515 45%,#162d1a 100%)", fontFamily:"'Noto Sans KR','Apple SD Gothic Neo',sans-serif", color:"#e8f5e9", position:"relative", overflowX:"hidden" },
  wrap:{ position:"relative", zIndex:1, maxWidth:680, margin:"0 auto", padding:"0 16px 72px" },
  badge:{ display:"inline-block", background:"rgba(184,148,58,.15)", border:"1px solid rgba(184,148,58,.4)", borderRadius:20, padding:"5px 18px", fontSize:11, letterSpacing:3, color:"#D4AC50", marginBottom:16, fontWeight:500 },
  h1:{ fontFamily:"'Noto Serif KR',serif", fontSize:"clamp(21px,5vw,29px)", fontWeight:900, color:"#e8f5e9", lineHeight:1.5, margin:"0 0 10px" },
  subp:{ fontSize:13, color:"rgba(232,245,233,.5)", fontWeight:300, lineHeight:1.7, margin:0 },
  cardTag:{ fontSize:11, color:"#D4AC50", letterSpacing:3, fontWeight:600, marginBottom:6 },
  cardTitle:{ fontFamily:"'Noto Serif KR',serif", fontSize:17, fontWeight:700, color:"#fff", lineHeight:1.45 },
  cardDesc:{ fontSize:12, color:"rgba(232,245,233,.5)", marginTop:7, lineHeight:1.7 },
  input:{ width:"100%", background:"rgba(255,255,255,.07)", border:"1px solid rgba(255,255,255,.12)", borderRadius:10, padding:"11px 14px", fontSize:13, fontFamily:"'Noto Sans KR',sans-serif", outline:"none", boxSizing:"border-box", transition:"border .2s" },
  myBadge:{ background:"rgba(184,148,58,.12)", border:"1px solid rgba(184,148,58,.25)", borderRadius:12, padding:"10px 14px", display:"flex", alignItems:"center", gap:10, marginBottom:12 },
  goldBtn:{ width:"100%", padding:"17px", background:"linear-gradient(135deg,#7a5c18,#D4AC50,#c9a030)", border:"none", borderRadius:14, color:"#1a0c00", fontSize:15, fontWeight:700, letterSpacing:1.5, cursor:"pointer", fontFamily:"'Noto Sans KR',sans-serif", boxShadow:"0 6px 24px rgba(184,148,58,.38)", position:"relative", overflow:"hidden", transition:"all .2s" },
  refreshBtn:{ width:"100%", padding:"11px", background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.08)", borderRadius:11, color:"rgba(232,245,233,.45)", fontSize:12, cursor:"pointer", fontFamily:"'Noto Sans KR',sans-serif", letterSpacing:1, transition:"all .2s" },
  exportBtn:{ padding:"6px 14px", background:"rgba(184,148,58,.18)", border:"1px solid rgba(184,148,58,.35)", borderRadius:8, color:"#D4AC50", fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"'Noto Sans KR',sans-serif", letterSpacing:0.5, transition:"all .2s" },
};
