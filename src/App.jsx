// ✅ Cloudinary 사진 업로드 + Firebase Firestore 연동 완성본
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, addDoc, getDocs, orderBy, query, increment } from "firebase/firestore";
import { useState, useEffect, useRef } from "react";

const firebaseConfig = {
  apiKey: "AIzaSyBWlIBOILJ9MluEyMBeLSSR2DzEBF9xRok",
  authDomain: "evezary-vote3.firebaseapp.com",
  projectId: "evezary-vote3",
  storageBucket: "evezary-vote3.firebasestorage.app",
  messagingSenderId: "641547322677",
  appId: "1:641547322677:web:11479f28ff5e42163d387c"
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

// ── Cloudinary 설정 ──────────────────────────────────────
const CLOUDINARY_CLOUD = "djnqo6kgj";
const CLOUDINARY_PRESET = "evevary_event";

const CANDIDATES = [
  { id:"a", name:"이브자리숲가꾸기재단",         en:"EVEZARY FOREST CARE Foundation",        color:"#2E6B3E", accent:"#4CAF50" },
  { id:"b", name:"이브자리탄소숲1호재단",        en:"EVEZARY CARBON FOREST No.1 Foundation", color:"#1B5E20", accent:"#388E3C" },
  { id:"c", name:"이브자리꿈의숲재단",           en:"EVEZARY DREAM FOREST Foundation",        color:"#33691E", accent:"#7CB342" },
  { id:"d", name:"이브자리시민의숲재단",           en:"EVEZARY Citizens' FOREST Foundation",        color:"#37474F", accent:"#78909C" },
  { id:"e", name:"이브자리탄소상쇄숲1호재단", en:"EVEZARY Carbon Offset Forest No.1",  color:"#4E342E", accent:"#8D6E63" },
];

const GOAL     = 10000000;
const ADMIN_PW = "evezary2026";

function formatWon(n) {
  if (n >= 100000000) return `${(n/100000000).toFixed(1)}억원`;
  if (n >= 10000000)  return `${(n/10000000).toFixed(1)}천만원`;
  if (n >= 1000000)   return `${(n/1000000).toFixed(1)}백만원`;
  if (n >= 10000)     return `${Math.floor(n/10000).toLocaleString()}만원`;
  return `${n.toLocaleString()}원`;
}
function nowStr() { return new Date().toLocaleString("ko-KR"); }

// ── Firebase helpers ──────────────────────────────────────
async function fbAddVote(name, candidateId, reason) {
  await addDoc(collection(db, "votes"), {
    name, candidateId, reason: reason||"", ts: nowStr(), createdAt: Date.now()
  });
  const ref = doc(db, "meta", "summary");
  const snap = await getDoc(ref);
  if (snap.exists()) {
    await updateDoc(ref, { [`votes.${candidateId}`]: increment(1) });
  } else {
    await setDoc(ref, { votes: { [candidateId]: 1 }, donationTotal: 0 });
  }
}

async function fbAddDonate(name) {
  await addDoc(collection(db, "donations"), {
    name, amount: 10000, ts: nowStr(), createdAt: Date.now()
  });
  const ref = doc(db, "meta", "summary");
  const snap = await getDoc(ref);
  if (snap.exists()) {
    await updateDoc(ref, { donationTotal: increment(10000) });
  } else {
    await setDoc(ref, { votes: {}, donationTotal: 10000 });
  }
}

async function fbLoadSummary() {
  const snap = await getDoc(doc(db, "meta", "summary"));
  return snap.exists() ? snap.data() : { votes: {}, donationTotal: 0 };
}

async function fbLoadVotes() {
  const q = query(collection(db, "votes"), orderBy("createdAt", "desc"));
  const snaps = await getDocs(q);
  return snaps.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function fbLoadDonations() {
  const q = query(collection(db, "donations"), orderBy("createdAt", "desc"));
  const snaps = await getDocs(q);
  return snaps.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ── 조성지 데이터 ──────────────────────────────────────────
const SITES = [
  { id:"s0", icon:"🌲", year:1987, label:"기업림 육림활동외 기관기부",         loc:"양평",    trees:15020, area:"6만평", desc:"1987~2013년 기업림 육림활동 15,020주" },
  { id:"s1", icon:"🏔️", year:2014, label:"양평기업림 탄소상쇄숲",   loc:"양평",    trees:1000,  area:"9.97ha", desc:"2014년 조성, 9.97ha" },
  { id:"s2", icon:"🌳", year:2014, label:"암사동 탄소상쇄숲 공원",   loc:"강동구",  trees:900,   area:"0.54ha", desc:"강동구 2014년, 0.54ha" },
  { id:"s3", icon:"🌿", year:2015, label:"둔촌동 탄소상쇄숲 공원",   loc:"강동구",  trees:443,   area:"0.39ha", desc:"강동구 2015년, 0.39ha" },
  { id:"s4", icon:"🍃", year:2016, label:"내곡동 탄소상쇄숲 공원",   loc:"서초구",  trees:1000,  area:"0.63ha", desc:"서초구 2016년, 0.63ha" },
  { id:"s5", icon:"🏞️", year:2017, label:"강서한강 탄소상쇄숲 공원", loc:"한강사업부",trees:4000, area:"5.64ha", desc:"서울시 한강사업부 2017~2021년 5년간, 5.64ha" },
  { id:"s6", icon:"🌱", year:2023, label:"제방녹지공원",             loc:"동대문구", trees:25,    area:"제방",   desc:"동대문구 2023년" },
  { id:"s7", icon:"💧", year:2024, label:"양수리 탄소저감숲",        loc:"한강유역청",trees:2005, area:"0.61ha", desc:"한강유역청 2024년, 0.61ha" },
  { id:"s8", icon:"🌸", year:2024, label:"보라매공원 새록새록 정원", loc:"보라매공원",trees:2000, area:"200평",  desc:"새록새록 정원 200평, 2,000주 식재기증" },
];
const REQUIRED_VISITS = 5;
const EVENT_ADMIN_PW = "evezary2026";

// Firebase helpers for event
// Cloudinary — 사진 업로드 후 URL 반환
async function fbUploadPhoto(siteId, file, submissionId, onProgress) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_PRESET);
  formData.append("folder", `evezary-event/${submissionId}`);
  formData.append("public_id", siteId);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress && onProgress(siteId, Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status === 200) {
        const res = JSON.parse(xhr.responseText);
        resolve(res.secure_url);
      } else {
        reject(new Error(`업로드 실패: ${xhr.statusText}`));
      }
    };
    xhr.onerror = () => reject(new Error("네트워크 오류"));
    xhr.send(formData);
  });
}

async function fbSubmitEvent(data) {
  await addDoc(collection(db, "events"), { ...data, ts: nowStr(), createdAt: Date.now() });
}
async function fbLoadEvents() {
  const q = query(collection(db, "events"), orderBy("createdAt", "desc"));
  const snaps = await getDocs(q);
  return snaps.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ─────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState("main");
  return page === "admin"
    ? <AdminPanel onBack={() => setPage("main")} />
    : page === "event"
    ? <EventPage onBack={() => setPage("main")} />
    : <MainApp onAdmin={() => setPage("admin")} onEvent={() => setPage("event")} />;
}

// ─────────────────────────────────────────────────────────
function MainApp({ onAdmin, onEvent }) {
  const [summary,       setSummary]       = useState({ votes:{}, donationTotal:0 });
  const [recentVotes,   setRecentVotes]   = useState([]);
  const [recentDonates, setRecentDonates] = useState([]);
  const [loading,       setLoading]       = useState(true);

  const [voterName,   setVoterName]   = useState("");
  const [selected,    setSelected]    = useState(null);
  const [voteReason,  setVoteReason]  = useState("");
  const [submittingV, setSubmittingV] = useState(false);
  const [lastVoted,   setLastVoted]   = useState(null);

  const [donorName,  setDonorName]  = useState("");
  const [donating,   setDonating]   = useState(false);
  const [myDonation, setMyDonation] = useState(0);
  const [floats,     setFloats]     = useState([]);
  const [donateAnim, setDonateAnim] = useState(false);
  const [thankMsg,   setThankMsg]   = useState(false);
  const floatId = useRef(0);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [sum, votes, donates] = await Promise.all([
        fbLoadSummary(), fbLoadVotes(), fbLoadDonations()
      ]);
      setSummary(sum);
      setRecentVotes(votes.slice(0, 10));
      setRecentDonates(donates.slice(0, 10));
    } catch(e) { console.error("로드 오류:", e); }
    setLoading(false);
  }

  async function submitVote() {
    if (!selected || submittingV) return;
    if (!voterName.trim()) { alert("이름(대리점명)을 입력해주세요."); return; }
    setSubmittingV(true);
    try {
      await fbAddVote(voterName.trim(), selected, voteReason.trim());
      setSummary(prev => ({ ...prev, votes: { ...prev.votes, [selected]: (prev.votes[selected]||0)+1 } }));
      setRecentVotes(prev => [{ name:voterName.trim(), candidateId:selected, reason:voteReason.trim(), ts:nowStr() }, ...prev].slice(0,10));
      setLastVoted(selected);
      setVoterName(""); setSelected(null); setVoteReason("");
    } catch(e) { console.error(e); alert("저장 오류. 잠시 후 다시 시도해주세요."); }
    setSubmittingV(false);
  }

  async function submitDonate() {
    if (donating) return;
    if (!donorName.trim()) { alert("이름(대리점명)을 입력해주세요."); return; }
    setDonating(true);
    setDonateAnim(true); setTimeout(()=>setDonateAnim(false), 600);
    const fid = floatId.current++;
    setFloats(prev=>[...prev,fid]);
    setTimeout(()=>setFloats(prev=>prev.filter(x=>x!==fid)), 1400);
    try {
      await fbAddDonate(donorName.trim());
      setSummary(prev => ({ ...prev, donationTotal: (prev.donationTotal||0)+10000 }));
      setRecentDonates(prev => [{ name:donorName.trim(), amount:10000, ts:nowStr() }, ...prev].slice(0,10));
      setMyDonation(p=>p+10000);
      setThankMsg(true); setTimeout(()=>setThankMsg(false), 2800);
    } catch(e) { console.error(e); alert("저장 오류. 잠시 후 다시 시도해주세요."); }
    setDonating(false);
  }

  const vSummary   = summary.votes || {};
  const totalVotes = Object.values(vSummary).reduce((a,b)=>a+b,0);
  const getP       = id => totalVotes===0 ? 0 : Math.round(((vSummary[id]||0)/totalVotes)*100);
  const sorted     = [...CANDIDATES].sort((a,b)=>(vSummary[b.id]||0)-(vSummary[a.id]||0));
  const total      = summary.donationTotal || 0;
  const goalPct    = Math.min(100, Math.round((total/GOAL)*100));
  const treeCount  = Math.max(1, Math.min(20, Math.floor(total/50000)+1));
  const lastC      = CANDIDATES.find(c=>c.id===lastVoted);

  return (
    <div style={S.root}>
      <BgLayer/><Styles/>
      <div style={S.wrap}>

        {/* HEADER */}
        <div style={{textAlign:"center",padding:"36px 0 24px",animation:"fadeUp .8s ease both"}}>
          <div style={S.badge}>🌱 EVEZARY · 숲조성 특화 공익재단 이름 공모 · 2026</div>
          <h1 style={S.h1}>재단 이름을 <span style={{color:"#7CB342"}}>한 표</span>로 선택,<br/>재단후원자로<span style={{color:"#D4AC50"}}> 적극</span>동참해주세요</h1>
          <p style={S.subp}>대한민국 1호 산림탄소상쇄 기업 이브자리 공익재단<br/>이름 투표 + 숲조성 공익재단 후원 캠페인</p>
          {!loading && (
            <div style={{display:"flex",justifyContent:"center",gap:24,marginTop:18,flexWrap:"wrap"}}>
              {[
                {val:`${totalVotes}표`, label:"TOTAL VOTES",   color:"#7CB342"},
                {val:formatWon(total),  label:"후원 의향 총액", color:"#D4AC50"},
                {val:`${new Set(recentDonates.map(r=>r.name)).size}명`, label:"DONORS", color:"#78909C"},
              ].map(({val,label,color})=>(
                <div key={label} style={{textAlign:"center"}}>
                  <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:24,fontWeight:600,color,lineHeight:1}}>{val}</div>
                  <div style={{fontSize:9,color:"rgba(232,245,233,.3)",letterSpacing:2,marginTop:3}}>{label}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── 이벤트 배너 ── */}
        <div onClick={onEvent} className="chov" style={{background:"linear-gradient(135deg,#0d3320,#1a5c38)",border:"1px solid rgba(76,175,80,.35)",borderRadius:18,padding:"16px 20px",marginBottom:16,cursor:"pointer",animation:"fadeUp .6s .05s ease both",boxShadow:"0 4px 24px rgba(46,107,62,.3)"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
            <div>
              <div style={{fontSize:10,color:"#7CB342",letterSpacing:3,fontWeight:600,marginBottom:5}}>🗺️ 탄소상쇄숲 방문 인증 이벤트</div>
              <div style={{fontFamily:"'Noto Serif KR',serif",fontSize:15,fontWeight:700,color:"#e8f5e9",lineHeight:1.4}}>10곳 중 5곳 방문하고<br/><span style={{color:"#7CB342"}}>인증사진 제출</span>하면 경품 증정!</div>
              <div style={{fontSize:11,color:"rgba(232,245,233,.45)",marginTop:5}}>총 26,393주 · 17.87ha · 축구장 약 22개 규모</div>
            </div>
            <div style={{textAlign:"center",flexShrink:0}}>
              <div style={{fontSize:36}}>🌲</div>
              <div style={{fontSize:11,color:"#7CB342",fontWeight:700,marginTop:4}}>참여하기 →</div>
            </div>
          </div>
        </div>

        {loading ? <Loader/> : (<>

          {/* ── 후원 카드 ── */}
          <Card style={{marginBottom:18,animation:"fadeUp .7s .1s ease both"}}>
            <ShimmerBg/>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:18,gap:12}}>
              <div>
                <div style={S.cardTag}>🌳 1그루를 심는 마음으로 후원 캠페인</div>
                <div style={S.cardTitle}>자연에는 숲을 고객에겐 이브자리를<br/>새로운 공익재단을 후원해주세요 !!!</div>
                <div style={S.cardDesc}>버튼 1회 클릭 = <span style={{color:"#D4AC50",fontWeight:600}}>1만원 후원 의향</span> 등록<br/>재단 출범 첫 기부자 명단에 영구 등재됩니다</div>
              </div>
              <div style={{textAlign:"right",flexShrink:0}}>
                <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:28,fontWeight:700,color:"#D4AC50",lineHeight:1}}>{formatWon(total)}</div>
                <div style={{fontSize:9,color:"rgba(232,245,233,.3)",letterSpacing:1.5,marginTop:4}}>목표 {formatWon(GOAL)}</div>
              </div>
            </div>

            <div style={{marginBottom:16}}>
              <div style={{height:10,background:"rgba(255,255,255,.07)",borderRadius:5,overflow:"hidden",marginBottom:5}}>
                <div style={{height:"100%",borderRadius:5,width:`${goalPct}%`,background:"linear-gradient(90deg,#7a5c18,#D4AC50,#f5d060)",transition:"width 1.2s ease",boxShadow:goalPct>0?"0 0 12px rgba(212,172,80,.5)":"none"}}/>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"rgba(232,245,233,.25)"}}>
                <span>0원</span><span>{goalPct}% 달성 · 목표 {formatWon(GOAL)}</span>
              </div>
            </div>

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

            <input value={donorName} onChange={e=>setDonorName(e.target.value)} placeholder="후원자 이름(대리점명)을 입력해주세요 (필수)" maxLength={20} style={{...S.input,marginBottom:10}}/>

            {myDonation>0 && (
              <div style={{...S.myBadge,marginBottom:12}}>
                <span style={{fontSize:20}}>🌱</span>
                <div>
                  <div style={{fontSize:10,color:"#D4AC50",fontWeight:600,letterSpacing:1}}>나의 후원 의향</div>
                  <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:16,color:"#fff",fontWeight:600}}>{formatWon(myDonation)} <span style={{fontSize:12,color:"rgba(232,245,233,.45)"}}>({myDonation/10000}그루)</span></div>
                </div>
              </div>
            )}

            {recentDonates.length>0 && (
              <div style={{marginBottom:12}}>
                <div style={{fontSize:10,color:"rgba(232,245,233,.3)",letterSpacing:2,marginBottom:7}}>🌿 최근 후원자</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                  {recentDonates.slice(0,8).map((r,i)=>(
                    <span key={i} style={{fontSize:11,padding:"3px 10px",borderRadius:20,background:"rgba(184,148,58,.12)",color:"#D4AC50",border:"1px solid rgba(184,148,58,.2)"}}>{r.name} {formatWon(r.amount)}</span>
                  ))}
                </div>
              </div>
            )}

            <div style={{position:"relative"}}>
              {floats.map(id=>(
                <div key={id} style={{position:"absolute",top:-16,left:"50%",transform:"translateX(-50%)",fontFamily:"'Cormorant Garamond',serif",fontSize:20,fontWeight:700,color:"#f5c842",pointerEvents:"none",zIndex:30,whiteSpace:"nowrap",animation:"floatUp 1.4s ease-out both",textShadow:"0 2px 8px rgba(0,0,0,.5)"}}>🌳 + 10,000원</div>
              ))}
              {thankMsg && (
                <div style={{position:"absolute",bottom:"calc(100% + 12px)",left:"50%",background:"rgba(10,26,14,.96)",border:"1px solid rgba(184,148,58,.5)",borderRadius:12,padding:"10px 20px",fontSize:13,color:"#D4AC50",fontWeight:600,whiteSpace:"nowrap",zIndex:40,animation:"thankSlide 2.8s ease both",boxShadow:"0 4px 20px rgba(0,0,0,.6)",pointerEvents:"none"}}>
                  🌱 감사합니다! 지구의 숲이 한 그루 더 자랍니다
                </div>
              )}
              <button onClick={submitDonate} disabled={donating} className="dbtn" style={{...S.goldBtn,animation:donateAnim?"donateShake .55s ease":"none",opacity:donating?.5:1}}>
                {donating?"⏳ 처리 중...":"🌳  나무 한 그루 심기  ·  10,000원"}
                {!donating&&<Shimmer/>}
              </button>
            </div>
            <div style={{textAlign:"center",marginTop:9,fontSize:11,color:"rgba(232,245,233,.22)",lineHeight:1.6}}>※ 현재는 후원 의향 집계입니다. 실제 결제는 재단 출범 후 별도 안내됩니다.</div>
          </Card>

          {/* ── 투표 카드 ── */}
          <Card style={{marginBottom:14,animation:"fadeUp .7s .2s ease both"}}>
            <div style={{fontSize:11,letterSpacing:3,color:"rgba(232,245,233,.35)",marginBottom:16}}>🗳️ 재단 이름 투표 — 중복 참여 가능합니다</div>

            {lastVoted && lastC && (
              <div style={{...S.myBadge,marginBottom:14,borderColor:`${lastC.accent}55`,animation:"popIn .4s ease both"}}>
                <span style={{fontSize:22}}>✅</span>
                <div>
                  <div style={{fontSize:11,color:"rgba(232,245,233,.5)",marginBottom:2}}>투표 완료!</div>
                  <div style={{fontFamily:"'Noto Serif KR',serif",fontSize:14,fontWeight:700,color:"#fff"}}>{lastC.name}</div>
                  <div style={{fontSize:11,color:"rgba(232,245,233,.4)",marginTop:1}}>현재 {vSummary[lastC.id]||0}표 · {getP(lastC.id)}%</div>
                </div>
                <button onClick={()=>setLastVoted(null)} style={{marginLeft:"auto",background:"none",border:"none",color:"rgba(232,245,233,.3)",fontSize:16,cursor:"pointer"}}>×</button>
              </div>
            )}

            <input value={voterName} onChange={e=>setVoterName(e.target.value)} placeholder="투표자의 이름(대리점명)을 입력해주세요 (필수)" maxLength={20} style={{...S.input,marginBottom:12}}/>

            <div style={{display:"flex",flexDirection:"column",gap:9,marginBottom:14}}>
              {CANDIDATES.map((c,i)=>{
                const sel=selected===c.id;
                return (
                  <div key={c.id} className="chov" onClick={()=>setSelected(c.id)} style={{background:sel?`linear-gradient(135deg,${c.color}55,${c.color}22)`:"rgba(255,255,255,.04)",border:`1.5px solid ${sel?c.accent:"rgba(255,255,255,.08)"}`,borderRadius:13,padding:"12px 14px",boxShadow:sel?`0 4px 18px ${c.color}44`:"none",animation:`fadeUp .5s ${.07*i+.1}s ease both`,animationFillMode:"forwards",opacity:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:11}}>
                      <div style={{width:20,height:20,borderRadius:"50%",flexShrink:0,border:`2px solid ${sel?c.accent:"rgba(255,255,255,.2)"}`,background:sel?c.accent:"transparent",display:"flex",alignItems:"center",justifyContent:"center",animation:sel?"pulse 2s infinite":"none"}}>
                        {sel&&<span style={{fontSize:10,color:"#fff"}}>✓</span>}
                      </div>
                      <div style={{flex:1}}>
                        <div style={{display:"flex",alignItems:"baseline",gap:8,flexWrap:"wrap",marginBottom:4}}>
                          <span style={{fontFamily:"'Noto Serif KR',serif",fontSize:15,fontWeight:700,color:sel?"#fff":"#c8e6c9"}}>{c.name}</span>
                          <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:11,fontStyle:"italic",color:"rgba(232,245,233,.28)"}}>{c.en}</span>
                        </div>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <div style={{height:5,flex:1,background:"rgba(255,255,255,.06)",borderRadius:3,overflow:"hidden"}}>
                            <div style={{height:"100%",width:`${getP(c.id)}%`,background:`linear-gradient(90deg,${c.color},${c.accent})`,borderRadius:3,transition:"width 1s ease"}}/>
                          </div>
                          <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:15,color:c.accent,minWidth:42,textAlign:"right"}}>{getP(c.id)}%</span>
                          <span style={{fontSize:10,color:"rgba(232,245,233,.3)",minWidth:28}}>{vSummary[c.id]||0}표</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <textarea value={voteReason} onChange={e=>setVoteReason(e.target.value)} placeholder="이 이름을 선택한 이유 또는 다른 추천이름를 남겨주세요 (선택, 최대 100자)" maxLength={100} rows={2} style={{...S.input,resize:"none",lineHeight:1.6,marginBottom:12}}/>

            <button onClick={submitVote} disabled={submittingV||!selected} className="chov" style={{width:"100%",padding:"15px",background:(!selected||submittingV)?"rgba(76,175,80,.25)":"linear-gradient(135deg,#2E6B3E,#4CAF50)",border:"none",borderRadius:13,color:"#fff",fontSize:14,fontWeight:700,letterSpacing:1.5,cursor:(!selected||submittingV)?"not-allowed":"pointer",fontFamily:"'Noto Sans KR',sans-serif",boxShadow:selected?"0 6px 20px rgba(76,175,80,.35)":"none",position:"relative",overflow:"hidden",transition:"all .2s"}}>
              {submittingV?"⏳ 제출 중...":selected?`「${CANDIDATES.find(c=>c.id===selected)?.name}」에 투표하기 →`:"후보를 선택해주세요"}
              {selected&&!submittingV&&<Shimmer/>}
            </button>

            {recentVotes.length>0 && (
              <div style={{marginTop:16}}>
                <div style={{fontSize:10,color:"rgba(232,245,233,.3)",letterSpacing:2,marginBottom:8}}>🗳️ 최근 투표자</div>
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  {recentVotes.slice(0,5).map((r,i)=>{
                    const c=CANDIDATES.find(x=>x.id===r.candidateId);
                    return (
                      <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 12px",background:"rgba(255,255,255,.03)",borderRadius:9,borderLeft:`3px solid ${c?.accent||"#4CAF50"}`}}>
                        <span style={{fontSize:13,fontWeight:600,color:"#e8f5e9",minWidth:55}}>{r.name}</span>
                        <span style={{fontSize:11,color:c?.accent,flex:1}}>→ {c?.name}</span>
                        {r.reason&&<span style={{fontSize:10,color:"rgba(232,245,233,.35)",maxWidth:110,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>"{r.reason}"</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </Card>

          <button onClick={loadAll} style={S.refreshBtn}>🔄 결과 새로고침</button>
          <div style={{textAlign:"center",marginTop:10}}>
            <button onClick={onAdmin} style={{background:"none",border:"none",fontSize:11,color:"rgba(232,245,233,.2)",cursor:"pointer",letterSpacing:2,textDecoration:"underline",fontFamily:"'Noto Sans KR',sans-serif"}}>관리자 패널</button>
          </div>
        </>)}
        <Footer/>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
function AdminPanel({ onBack }) {
  const [adminOk,   setAdminOk]   = useState(false);
  const [pw,        setPw]        = useState("");
  const [pwErr,     setPwErr]     = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [activeTab, setActiveTab] = useState("votes");
  const [allVotes,   setAllVotes]   = useState([]);
  const [allDonates, setAllDonates] = useState([]);
  const [summary,    setSummary]    = useState({ votes:{}, donationTotal:0 });

  async function login() {
    if (pw === ADMIN_PW) { setAdminOk(true); setPwErr(false); await loadAdminData(); }
    else setPwErr(true);
  }

  async function loadAdminData() {
    setLoading(true);
    try {
      const [sum, votes, donates] = await Promise.all([fbLoadSummary(), fbLoadVotes(), fbLoadDonations()]);
      setSummary(sum); setAllVotes(votes); setAllDonates(donates);
    } catch(e) { console.error(e); }
    setLoading(false);
  }

  function dlCSV(rows, filename) {
    const bom = "\uFEFF";
    const csv = bom + rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8;"}));
    a.download = filename; a.click();
  }

  function exportVotes() {
    const rows=[["번호","이름","선택한 이름","이유","일시"]];
    allVotes.forEach((r,i)=>{const c=CANDIDATES.find(x=>x.id===r.candidateId);rows.push([i+1,r.name,c?.name||r.candidateId,r.reason||"",r.ts]);});
    dlCSV(rows,"evezary_votes.csv");
  }
  function exportDonors() {
    const rows=[["번호","후원자 이름","금액","일시"]];
    allDonates.forEach((r,i)=>rows.push([i+1,r.name,r.amount,r.ts]));
    dlCSV(rows,"evezary_donors.csv");
  }

  const vSum        = summary.votes||{};
  const totalVotes  = Object.values(vSum).reduce((a,b)=>a+b,0);
  const totalDonate = summary.donationTotal||0;
  const donorAgg    = allDonates.reduce((acc,r)=>{acc[r.name]=(acc[r.name]||0)+r.amount;return acc;},{});

  return (
    <div style={S.root}>
      <BgLayer dark/><Styles/>
      <div style={S.wrap}>
        <div style={{display:"flex",alignItems:"center",gap:12,padding:"28px 0 20px"}}>
          <button onClick={onBack} style={{background:"rgba(255,255,255,.07)",border:"1px solid rgba(255,255,255,.12)",borderRadius:8,color:"rgba(232,245,233,.7)",fontSize:13,padding:"6px 14px",cursor:"pointer",fontFamily:"'Noto Sans KR',sans-serif"}}>← 돌아가기</button>
          <div>
            <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:22,color:"#e8f5e9",letterSpacing:3,fontStyle:"italic"}}>EVEZARY</div>
            <div style={{fontSize:10,color:"rgba(232,245,233,.3)",letterSpacing:3}}>관리자 패널</div>
          </div>
        </div>

        {!adminOk ? (
          <Card>
            <div style={{fontSize:13,color:"rgba(232,245,233,.5)",marginBottom:16}}>🔐 관리자 비밀번호를 입력해주세요</div>
            <input type="password" value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key==="Enter"&&login()} placeholder="비밀번호" style={{...S.input,marginBottom:10}}/>
            {pwErr&&<div style={{fontSize:12,color:"#ef5350",marginBottom:10}}>비밀번호가 올바르지 않습니다.</div>}
            <button onClick={login} style={S.goldBtn}>로그인 →</button>
          </Card>
        ) : (<>
          <div style={{display:"flex",gap:12,marginBottom:18,flexWrap:"wrap"}}>
            {[
              {icon:"🗳️",val:`${totalVotes}표`,    label:"총 투표수",    color:"#7CB342"},
              {icon:"💰",val:formatWon(totalDonate),label:"후원 의향 총액",color:"#D4AC50"},
              {icon:"👤",val:`${Object.keys(donorAgg).length}명`,label:"후원자 수",color:"#78909C"},
            ].map(({icon,val,label,color})=>(
              <div key={label} style={{flex:1,minWidth:110,background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.08)",borderRadius:14,padding:"14px",textAlign:"center"}}>
                <div style={{fontSize:20,marginBottom:4}}>{icon}</div>
                <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20,fontWeight:600,color,lineHeight:1}}>{val}</div>
                <div style={{fontSize:10,color:"rgba(232,245,233,.35)",marginTop:4,letterSpacing:1}}>{label}</div>
              </div>
            ))}
          </div>

          <div style={{display:"flex",gap:8,marginBottom:14}}>
            {[["votes","🗳️ 투표 명단"],["donors","🌳 후원 명단"]].map(([id,label])=>(
              <button key={id} onClick={()=>setActiveTab(id)} style={{flex:1,padding:"10px 6px",borderRadius:10,border:"none",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"'Noto Sans KR',sans-serif",background:activeTab===id?"rgba(76,175,80,.2)":"rgba(255,255,255,.05)",color:activeTab===id?"#7CB342":"rgba(232,245,233,.5)",borderBottom:activeTab===id?"2px solid #4CAF50":"2px solid transparent",transition:"all .2s"}}>{label}</button>
            ))}
          </div>

          {loading ? <Loader/> : (<>
            {activeTab==="votes" && (
              <Card>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                  <div style={{fontSize:11,color:"rgba(232,245,233,.4)",letterSpacing:2}}>총 {allVotes.length}건</div>
                  <button onClick={exportVotes} style={S.exportBtn}>⬇ CSV 다운로드</button>
                </div>
                <div style={{marginBottom:16}}>
                  {[...CANDIDATES].sort((a,b)=>(vSum[b.id]||0)-(vSum[a.id]||0)).map(c=>{
                    const pct=totalVotes===0?0:Math.round(((vSum[c.id]||0)/totalVotes)*100);
                    return (
                      <div key={c.id} style={{marginBottom:10}}>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                          <span style={{fontSize:13,color:"#e8f5e9",fontFamily:"'Noto Serif KR',serif"}}>{c.name}</span>
                          <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:15,color:c.accent}}>{pct}% <span style={{fontSize:11,color:"rgba(232,245,233,.4)"}}>{vSum[c.id]||0}표</span></span>
                        </div>
                        <div style={{height:6,background:"rgba(255,255,255,.06)",borderRadius:3,overflow:"hidden"}}>
                          <div style={{height:"100%",width:`${pct}%`,background:`linear-gradient(90deg,${c.color},${c.accent})`,borderRadius:3}}/>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div style={{maxHeight:360,overflowY:"auto",display:"flex",flexDirection:"column",gap:7}}>
                  {allVotes.map((r,i)=>{
                    const c=CANDIDATES.find(x=>x.id===r.candidateId);
                    return (
                      <div key={i} style={{display:"flex",gap:10,alignItems:"flex-start",padding:"9px 12px",background:"rgba(255,255,255,.03)",borderRadius:9,borderLeft:`3px solid ${c?.accent||"#4CAF50"}`}}>
                        <span style={{fontSize:10,color:"rgba(232,245,233,.25)",minWidth:22,paddingTop:1}}>{allVotes.length-i}</span>
                        <div style={{flex:1}}>
                          <div style={{display:"flex",gap:10,alignItems:"baseline",flexWrap:"wrap"}}>
                            <span style={{fontSize:13,fontWeight:600,color:"#e8f5e9"}}>{r.name}</span>
                            <span style={{fontSize:11,color:c?.accent}}>→ {c?.name}</span>
                          </div>
                          {r.reason&&<div style={{fontSize:11,color:"rgba(232,245,233,.45)",marginTop:2}}>"{r.reason}"</div>}
                          <div style={{fontSize:10,color:"rgba(232,245,233,.2)",marginTop:2}}>{r.ts}</div>
                        </div>
                      </div>
                    );
                  })}
                  {!allVotes.length&&<div style={{textAlign:"center",padding:30,color:"rgba(232,245,233,.3)",fontSize:13}}>아직 투표 데이터가 없습니다.</div>}
                </div>
              </Card>
            )}

            {activeTab==="donors" && (
              <Card>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                  <div style={{fontSize:11,color:"rgba(232,245,233,.4)",letterSpacing:2}}>총 {allDonates.length}건</div>
                  <button onClick={exportDonors} style={S.exportBtn}>⬇ CSV 다운로드</button>
                </div>
                <div style={{marginBottom:14,padding:"12px 14px",background:"rgba(184,148,58,.08)",border:"1px solid rgba(184,148,58,.2)",borderRadius:12}}>
                  <div style={{fontSize:10,color:"#D4AC50",letterSpacing:2,marginBottom:8}}>후원자별 합계</div>
                  {Object.entries(donorAgg).sort((a,b)=>b[1]-a[1]).map(([name,amt],i)=>(
                    <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid rgba(184,148,58,.1)"}}>
                      <span style={{fontSize:13,color:"#e8f5e9"}}>{name}</span>
                      <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:15,color:"#D4AC50",fontWeight:600}}>{formatWon(amt)} <span style={{fontSize:10,color:"rgba(232,245,233,.4)"}}>({amt/10000}그루)</span></span>
                    </div>
                  ))}
                  {!allDonates.length&&<div style={{textAlign:"center",padding:16,color:"rgba(232,245,233,.3)",fontSize:13}}>아직 후원 데이터가 없습니다.</div>}
                </div>
                <div style={{maxHeight:320,overflowY:"auto",display:"flex",flexDirection:"column",gap:7}}>
                  {allDonates.map((r,i)=>(
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
            <button onClick={loadAdminData} style={{...S.refreshBtn,marginTop:12}}>🔄 새로고침</button>
          </>)}
        </>)}
        <Footer/>
      </div>
    </div>
  );
}

// ── 공통 컴포넌트 ─────────────────────────────────────────
// ─────────────────────────────────────────────────────────
function EventPage({ onBack }) {
  const [step, setStep]         = useState("intro");
  const [name, setName]         = useState("");
  const [phone, setPhone]       = useState("");
  const [checked, setChecked]   = useState([]);
  const [photos, setPhotos]     = useState({});      // {siteId: File}
  const [previews, setPreviews] = useState({});      // {siteId: dataURL}
  const [progress, setProgress] = useState({});      // {siteId: 0~100}
  const [uploading, setUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState("");  // 진행 메시지
  const [submissions, setSubmissions] = useState([]);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminPw, setAdminPw]   = useState("");
  const [adminOk, setAdminOk]   = useState(false);
  const [pwErr, setPwErr]       = useState(false);

  const toggleSite = (id) => {
    setChecked(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handlePhoto = (siteId, file) => {
    if (!file) return;
    setPhotos(prev => ({ ...prev, [siteId]: file }));
    const reader = new FileReader();
    reader.onload = e => setPreviews(prev => ({ ...prev, [siteId]: e.target.result }));
    reader.readAsDataURL(file);
  };

  const canSubmit = checked.length >= REQUIRED_VISITS &&
    checked.every(id => previews[id]) &&
    name.trim() && phone.trim();

  async function submitEvent() {
    if (!canSubmit || uploading) return;
    setUploading(true);

    try {
      // 1단계: Firestore에 임시 문서 생성 → ID 획득
      setUploadStep("📋 제출 정보 등록 중...");
      const submissionId = `${Date.now()}_${name.trim().replace(/\s/g,"")}`;

      // 2단계: 사진 순차 업로드
      const photoURLs = {};
      for (const siteId of checked) {
        const file = photos[siteId];
        if (!file) continue;
        const site = SITES.find(s => s.id === siteId);
        setUploadStep(`📷 사진 업로드 중... ${site.label}`);
        photoURLs[siteId] = await fbUploadPhoto(
          siteId, file, submissionId,
          (sid, pct) => setProgress(prev => ({ ...prev, [sid]: pct }))
        );
      }

      // 3단계: Firestore에 최종 저장
      setUploadStep("✅ 최종 저장 중...");
      const visitedSites = checked.map(id => {
        const s = SITES.find(x => x.id === id);
        return `${s.label}(${s.year})`;
      }).join(", ");

      await fbSubmitEvent({
        submissionId,
        name: name.trim(),
        phone: phone.trim(),
        visitedSites,
        visitCount: checked.length,
        photoURLs,
        photoCount: Object.keys(photoURLs).length,
      });

      setStep("done");
    } catch(e) {
      console.error(e);
      alert("제출 오류가 발생했습니다. 잠시 후 다시 시도해주세요.\n" + e.message);
    }
    setUploading(false);
    setUploadStep("");
  }

  async function loadSubmissions() {
    setLoadingSubs(true);
    try { setSubmissions(await fbLoadEvents()); }
    catch(e) { console.error(e); }
    setLoadingSubs(false);
  }

  function loginAdmin() {
    if (adminPw === EVENT_ADMIN_PW) { setAdminOk(true); setPwErr(false); loadSubmissions(); }
    else setPwErr(true);
  }

  function dlEventsCSV() {
    const bom = "\uFEFF";
    const rows = [["번호","이름","연락처","방문 조성지","방문수","사진수","제출일시"]];
    submissions.forEach((r,i) => rows.push([i+1, r.name, r.phone, r.visitedSites, r.visitCount, r.photoCount, r.ts]));
    const csv = bom + rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8;"}));
    a.download = "evezary_event.csv"; a.click();
  }

  const totalTrees = SITES.reduce((a,s) => a + s.trees, 0);

  return (
    <div style={S.root}>
      <BgLayer/><Styles/>
      <div style={S.wrap}>

        {/* 헤더 */}
        <div style={{display:"flex",alignItems:"center",gap:12,padding:"24px 0 8px"}}>
          <button onClick={onBack} style={{background:"rgba(255,255,255,.07)",border:"1px solid rgba(255,255,255,.12)",borderRadius:8,color:"rgba(232,245,233,.7)",fontSize:13,padding:"6px 14px",cursor:"pointer",fontFamily:"'Noto Sans KR',sans-serif"}}>← 돌아가기</button>
          <div>
            <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20,color:"#e8f5e9",letterSpacing:3,fontStyle:"italic"}}>EVEZARY</div>
            <div style={{fontSize:10,color:"rgba(232,245,233,.3)",letterSpacing:3}}>탄소상쇄숲 방문 인증 이벤트</div>
          </div>
        </div>

        {step === "done" ? (
          <Card style={{textAlign:"center",padding:"40px 24px",animation:"popIn .5s ease both"}}>
            <div style={{fontSize:56,marginBottom:16}}>🎉</div>
            <div style={{fontFamily:"'Noto Serif KR',serif",fontSize:22,fontWeight:700,color:"#7CB342",marginBottom:10}}>제출 완료!</div>
            <div style={{fontSize:14,color:"rgba(232,245,233,.6)",lineHeight:1.8,marginBottom:24}}>
              <strong style={{color:"#e8f5e9"}}>{name}</strong>님의 방문 인증이 접수되었습니다.<br/>
              검토 후 경품 증정 안내 연락을 드립니다.<br/>
              <span style={{fontSize:12,color:"rgba(232,245,233,.35)"}}>연락처: {phone}</span>
            </div>
            <div style={{display:"flex",flexWrap:"wrap",gap:8,justifyContent:"center",marginBottom:24}}>
              {checked.map(id => {
                const s = SITES.find(x => x.id === id);
                return <span key={id} style={{fontSize:12,padding:"4px 12px",borderRadius:20,background:"rgba(76,175,80,.15)",color:"#7CB342",border:"1px solid rgba(76,175,80,.3)"}}>{s.icon} {s.label}</span>;
              })}
            </div>
            <button onClick={onBack} style={S.goldBtn}>메인으로 돌아가기</button>
          </Card>
        ) : (
          <>
            {/* 이벤트 소개 */}
            <Card style={{marginBottom:14,animation:"fadeUp .6s ease both"}}>
              <ShimmerBg/>
              <div style={{fontSize:10,color:"#7CB342",letterSpacing:3,fontWeight:600,marginBottom:8}}>🌲 이벤트 개요</div>
              <div style={{fontFamily:"'Noto Serif KR',serif",fontSize:18,fontWeight:700,color:"#fff",lineHeight:1.5,marginBottom:10}}>
                이브자리가 심은 숲을 플로깅하며 걸어보세요
              </div>
              <div style={{fontSize:13,color:"rgba(232,245,233,.55)",lineHeight:1.8,marginBottom:14}}>
                40년간 조성한 탄소상쇄숲 9곳 중 <strong style={{color:"#7CB342"}}>5곳 이상</strong> 방문 후<br/>
                각 장소에서 찍은 인증사진을 제출하시면 소정의 경품을 드립니다.(안내판주변인증사진)
              </div>
              <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
                {[
                  {icon:"🌳", val:`${totalTrees.toLocaleString()}주`, label:"총 식재"},
                  {icon:"🗺️", val:"17.87ha", label:"총 면적"},
                  {icon:"⚽", val:"약 22개", label:"축구장 크기"},
                  {icon:"📍", val:"10곳", label:"조성지"},
                ].map(({icon,val,label}) => (
                  <div key={label} style={{flex:1,minWidth:70,background:"rgba(76,175,80,.07)",border:"1px solid rgba(76,175,80,.15)",borderRadius:12,padding:"12px 8px",textAlign:"center"}}>
                    <div style={{fontSize:18,marginBottom:4}}>{icon}</div>
                    <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:17,fontWeight:600,color:"#7CB342"}}>{val}</div>
                    <div style={{fontSize:10,color:"rgba(232,245,233,.3)",marginTop:2,letterSpacing:1}}>{label}</div>
                  </div>
                ))}
              </div>
            </Card>

            {/* 조성지 목록 */}
            <Card style={{marginBottom:14,animation:"fadeUp .6s .1s ease both"}}>
              <div style={{fontSize:10,color:"#D4AC50",letterSpacing:3,fontWeight:600,marginBottom:12}}>
                📍 방문 조성지 선택 <span style={{color:"rgba(232,245,233,.4)",fontWeight:400}}>({checked.length}/{REQUIRED_VISITS}곳 이상 선택)</span>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {SITES.map((s, i) => {
                  const sel = checked.includes(s.id);
                  return (
                    <div key={s.id} style={{animation:`fadeUp .4s ${i*0.05+.1}s ease both`,animationFillMode:"forwards",opacity:0}}>
                      <div
                        onClick={() => toggleSite(s.id)}
                        className="chov"
                        style={{
                          background: sel ? "rgba(76,175,80,.12)" : "rgba(255,255,255,.03)",
                          border: `1.5px solid ${sel ? "#4CAF50" : "rgba(255,255,255,.08)"}`,
                          borderRadius: 13, padding: "12px 14px", cursor: "pointer",
                          boxShadow: sel ? "0 2px 12px rgba(76,175,80,.2)" : "none",
                        }}
                      >
                        <div style={{display:"flex",alignItems:"center",gap:10}}>
                          <div style={{width:22,height:22,borderRadius:"50%",flexShrink:0,border:`2px solid ${sel?"#4CAF50":"rgba(255,255,255,.2)"}`,background:sel?"#4CAF50":"transparent",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12}}>
                            {sel ? "✓" : ""}
                          </div>
                          <div style={{fontSize:22,flexShrink:0}}>{s.icon}</div>
                          <div style={{flex:1}}>
                            <div style={{display:"flex",alignItems:"baseline",gap:8,flexWrap:"wrap"}}>
                              <span style={{fontFamily:"'Noto Serif KR',serif",fontSize:14,fontWeight:700,color:sel?"#7CB342":"#c8e6c9"}}>{s.label}</span>
                              <span style={{fontSize:11,color:"rgba(232,245,233,.35)"}}>{s.year}년 · {s.loc}</span>
                            </div>
                            <div style={{fontSize:11,color:"rgba(232,245,233,.4)",marginTop:3}}>{s.trees.toLocaleString()}주 · {s.area}</div>
                          </div>
                          <div style={{fontSize:11,color:sel?"#7CB342":"rgba(232,245,233,.25)",fontWeight:600}}>{sel?"선택됨":"선택"}</div>
                        </div>
                      </div>
                      {/* 사진 업로드 — 선택된 경우만 표시 */}
                      {sel && (
                        <div style={{marginTop:8,marginLeft:44,animation:"fadeUp .3s ease both"}}>
                          <label style={{display:"block",cursor:"pointer"}}>
                            {previews[s.id] ? (
                              <div style={{position:"relative",display:"inline-block"}}>
                                <img src={previews[s.id]} alt="인증" style={{width:"100%",maxWidth:280,height:120,objectFit:"cover",borderRadius:10,border:"2px solid #4CAF50"}}/>
                                <div style={{position:"absolute",top:6,right:6,background:"rgba(76,175,80,.85)",borderRadius:6,padding:"2px 8px",fontSize:11,color:"#fff",fontWeight:600}}>✓ 사진 등록</div>
                              </div>
                            ) : (
                              <div style={{border:"1.5px dashed rgba(76,175,80,.4)",borderRadius:10,padding:"14px 16px",display:"flex",alignItems:"center",gap:10,background:"rgba(76,175,80,.04)"}}>
                                <span style={{fontSize:22}}>📷</span>
                                <div>
                                  <div style={{fontSize:13,color:"#7CB342",fontWeight:600}}>인증사진 첨부 (필수)</div>
                                  <div style={{fontSize:11,color:"rgba(232,245,233,.35)"}}>클릭하여 사진 선택</div>
                                </div>
                              </div>
                            )}
                            <input type="file" accept="image/*" capture="environment" onChange={e => handlePhoto(s.id, e.target.files[0])} style={{display:"none"}}/>
                          </label>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* 참가자 정보 */}
            <Card style={{marginBottom:14,animation:"fadeUp .6s .2s ease both"}}>
              <div style={{fontSize:10,color:"#D4AC50",letterSpacing:3,fontWeight:600,marginBottom:12}}>👤 참가자 정보</div>
              <input value={name} onChange={e=>setName(e.target.value)} placeholder="이름 (필수)" maxLength={20} style={{...S.input,marginBottom:10}}/>
              <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="연락처 — 010-0000-0000 (필수)" maxLength={20} style={{...S.input}}/>
            </Card>

            {/* 제출 버튼 */}
            <div style={{marginBottom:8}}>
              {checked.length < REQUIRED_VISITS && (
                <div style={{textAlign:"center",fontSize:12,color:"rgba(232,245,233,.4)",marginBottom:10}}>
                  {REQUIRED_VISITS - checked.length}곳 더 선택해주세요 ({checked.length}/{REQUIRED_VISITS})
                </div>
              )}
              {checked.length >= REQUIRED_VISITS && !checked.every(id => previews[id]) && (
                <div style={{textAlign:"center",fontSize:12,color:"#FF7043",marginBottom:10}}>
                  📷 선택한 모든 조성지에 인증사진을 첨부해주세요
                </div>
              )}
              {/* 업로드 진행 표시 */}
              {uploading && (
                <div style={{marginBottom:14,padding:"14px 16px",background:"rgba(76,175,80,.08)",border:"1px solid rgba(76,175,80,.25)",borderRadius:12}}>
                  <div style={{fontSize:13,color:"#7CB342",fontWeight:600,marginBottom:10}}>{uploadStep}</div>
                  {checked.map(id => {
                    const s = SITES.find(x => x.id === id);
                    const pct = progress[id] || 0;
                    return (
                      <div key={id} style={{marginBottom:7}}>
                        <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"rgba(232,245,233,.5)",marginBottom:3}}>
                          <span>{s.icon} {s.label}</span>
                          <span>{pct === 100 ? "✅ 완료" : pct > 0 ? `${pct}%` : "대기중"}</span>
                        </div>
                        <div style={{height:4,background:"rgba(255,255,255,.07)",borderRadius:2,overflow:"hidden"}}>
                          <div style={{height:"100%",width:`${pct}%`,background:"linear-gradient(90deg,#2E6B3E,#4CAF50)",borderRadius:2,transition:"width .3s ease"}}/>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <button
                onClick={submitEvent}
                disabled={!canSubmit || uploading}
                className="chov"
                style={{
                  width:"100%",padding:"17px",
                  background: canSubmit && !uploading ? "linear-gradient(135deg,#2E6B3E,#4CAF50)" : "rgba(76,175,80,.2)",
                  border:"none",borderRadius:14,color:"#fff",fontSize:15,fontWeight:700,
                  letterSpacing:1.5,cursor:canSubmit&&!uploading?"pointer":"not-allowed",
                  fontFamily:"'Noto Sans KR',sans-serif",
                  boxShadow:canSubmit&&!uploading?"0 6px 20px rgba(76,175,80,.35)":"none",
                  position:"relative",overflow:"hidden",transition:"all .2s"
                }}
              >
                {uploading ? `⏳ ${uploadStep||"업로드 중..."}` : canSubmit ? `🌲 인증 제출하기 (${checked.length}곳 방문)` : "조건을 충족해주세요"}
                {canSubmit && !uploading && <Shimmer/>}
              </button>
              <div style={{textAlign:"center",marginTop:8,fontSize:11,color:"rgba(232,245,233,.25)"}}>※ 제출 후 담당자 검토 → 경품 발송 안내 연락</div>
            </div>

            {/* 관리자 링크 */}
            <div style={{textAlign:"center",marginTop:14}}>
              {!showAdmin ? (
                <button onClick={()=>setShowAdmin(true)} style={{background:"none",border:"none",fontSize:11,color:"rgba(232,245,233,.2)",cursor:"pointer",letterSpacing:2,textDecoration:"underline",fontFamily:"'Noto Sans KR',sans-serif"}}>이벤트 관리자</button>
              ) : (
                <Card style={{marginTop:8}}>
                  {!adminOk ? (
                    <>
                      <input type="password" value={adminPw} onChange={e=>setAdminPw(e.target.value)} onKeyDown={e=>e.key==="Enter"&&loginAdmin()} placeholder="관리자 비밀번호" style={{...S.input,marginBottom:8}}/>
                      {pwErr && <div style={{fontSize:12,color:"#ef5350",marginBottom:8}}>비밀번호가 올바르지 않습니다.</div>}
                      <button onClick={loginAdmin} style={S.goldBtn}>로그인 →</button>
                    </>
                  ) : (
                    <>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                        <div style={{fontSize:13,color:"#7CB342",fontWeight:600}}>이벤트 참가 현황 ({submissions.length}건)</div>
                        <div style={{display:"flex",gap:8}}>
                          <button onClick={loadSubmissions} style={S.exportBtn}>🔄 새로고침</button>
                          <button onClick={dlEventsCSV} style={S.exportBtn}>⬇ CSV</button>
                        </div>
                      </div>
                      {loadingSubs ? <Loader/> : (
                        <div style={{maxHeight:360,overflowY:"auto",display:"flex",flexDirection:"column",gap:7}}>
                          {submissions.map((r,i) => (
                            <div key={i} style={{padding:"10px 12px",background:"rgba(76,175,80,.06)",borderRadius:10,borderLeft:"3px solid #4CAF50"}}>
                              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                                <span style={{fontSize:13,fontWeight:600,color:"#e8f5e9"}}>{r.name}</span>
                                <span style={{fontSize:11,color:"#7CB342"}}>{r.visitCount}곳 방문</span>
                              </div>
                              <div style={{fontSize:11,color:"rgba(232,245,233,.4)",marginBottom:3}}>{r.phone}</div>
                              <div style={{fontSize:11,color:"rgba(232,245,233,.35)",lineHeight:1.6,marginBottom:6}}>{r.visitedSites}</div>
                              {/* 사진 썸네일 */}
                              {r.photoURLs && Object.keys(r.photoURLs).length > 0 && (
                                <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:4}}>
                                  {Object.entries(r.photoURLs).map(([sid, url]) => {
                                    const site = SITES.find(s => s.id === sid);
                                    return (
                                      <a key={sid} href={url} target="_blank" rel="noreferrer" style={{textDecoration:"none"}}>
                                        <div style={{position:"relative"}}>
                                          <img src={url} alt={site?.label} style={{width:72,height:54,objectFit:"cover",borderRadius:7,border:"1px solid rgba(76,175,80,.4)"}}/>
                                          <div style={{position:"absolute",bottom:0,left:0,right:0,background:"rgba(0,0,0,.55)",borderRadius:"0 0 7px 7px",fontSize:9,color:"#e8f5e9",textAlign:"center",padding:"2px 0"}}>{site?.icon} {site?.label.substring(0,5)}</div>
                                        </div>
                                      </a>
                                    );
                                  })}
                                </div>
                              )}
                              <div style={{fontSize:10,color:"rgba(232,245,233,.2)"}}>{r.ts}</div>
                            </div>
                          ))}
                          {!submissions.length && <div style={{textAlign:"center",padding:24,color:"rgba(232,245,233,.3)",fontSize:13}}>아직 참가 데이터가 없습니다.</div>}
                        </div>
                      )}
                    </>
                  )}
                </Card>
              )}
            </div>
          </>
        )}
        <Footer/>
      </div>
    </div>
  );
}

// ── 공통 컴포넌트 ─────────────────────────────────────────
function BgLayer({ dark }) {
  return (
    <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0}}>
      {[...Array(12)].map((_,i)=>(<div key={i} style={{position:"absolute",bottom:0,left:`${i*9}%`,width:0,height:0,borderLeft:`${20+(i%3)*12}px solid transparent`,borderRight:`${20+(i%3)*12}px solid transparent`,borderBottom:`${80+(i%4)*40}px solid rgba(46,107,62,${dark?.02:.04+(i%3)*.02})`}}/>))}
      {[...Array(6)].map((_,i)=>(<div key={i} style={{position:"absolute",width:3,height:3,borderRadius:"50%",background:"#f5c842",boxShadow:"0 0 8px 3px rgba(245,200,66,.5)",top:`${20+(i*13)%60}%`,left:`${5+(i*17)%90}%`,animation:`ff${i%3} ${3+i*.7}s ease-in-out infinite ${i*.4}s`}}/>))}
    </div>
  );
}
function Styles() {
  return <style>{`
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
  `}</style>;
}
function Card({ children, style }) { return <div style={{background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.08)",borderRadius:20,padding:"20px",position:"relative",overflow:"hidden",...style}}>{children}</div>; }
function ShimmerBg() { return <div style={{position:"absolute",top:0,left:"-100%",width:"60%",height:"100%",background:"linear-gradient(90deg,transparent,rgba(184,148,58,.06),transparent)",animation:"shimmer 5s 1s infinite",pointerEvents:"none"}}/>; }
function Shimmer() { return <div style={{position:"absolute",top:0,left:"-100%",width:"60%",height:"100%",background:"linear-gradient(90deg,transparent,rgba(255,255,255,.2),transparent)",animation:"shimmer 2.5s infinite"}}/>; }
function Loader() { return <div style={{textAlign:"center",padding:60,color:"rgba(232,245,233,.4)"}}><div style={{fontSize:32,marginBottom:12}}>🌿</div><div style={{fontSize:13,letterSpacing:2}}>불러오는 중...</div></div>; }
function Footer() { return <div style={{textAlign:"center",marginTop:32,paddingTop:18,borderTop:"1px solid rgba(255,255,255,.06)"}}><div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:16,fontStyle:"italic",color:"rgba(232,245,233,.18)",letterSpacing:4}}>EVEZARY</div><div style={{fontSize:10,color:"rgba(232,245,233,.14)",marginTop:4,letterSpacing:2}}>이브자리 공익재단 네이밍 공모 · 2026.03.15 – 04.15</div></div>; }

const S = {
  root:{ minHeight:"100vh", background:"linear-gradient(160deg,#0a1a0e 0%,#0f2515 45%,#162d1a 100%)", fontFamily:"'Noto Sans KR','Apple SD Gothic Neo',sans-serif", color:"#e8f5e9", position:"relative", overflowX:"hidden" },
  wrap:{ position:"relative", zIndex:1, maxWidth:680, margin:"0 auto", padding:"0 16px 72px" },
  badge:{ display:"inline-block", background:"rgba(184,148,58,.15)", border:"1px solid rgba(184,148,58,.4)", borderRadius:20, padding:"5px 18px", fontSize:11, letterSpacing:3, color:"#D4AC50", marginBottom:16, fontWeight:500 },
  h1:{ fontFamily:"'Noto Serif KR',serif", fontSize:"clamp(21px,5vw,29px)", fontWeight:900, color:"#e8f5e9", lineHeight:1.5, margin:"0 0 10px" },
  subp:{ fontSize:13, color:"rgba(232,245,233,.5)", fontWeight:300, lineHeight:1.7, margin:0 },
  cardTag:{ fontSize:11, color:"#D4AC50", letterSpacing:3, fontWeight:600, marginBottom:6 },
  cardTitle:{ fontFamily:"'Noto Serif KR',serif", fontSize:17, fontWeight:700, color:"#fff", lineHeight:1.45 },
  cardDesc:{ fontSize:12, color:"rgba(232,245,233,.5)", marginTop:7, lineHeight:1.7 },
  input:{ width:"100%", background:"rgba(255,255,255,.07)", border:"1px solid rgba(255,255,255,.12)", borderRadius:10, padding:"11px 14px", fontSize:13, fontFamily:"'Noto Sans KR',sans-serif", outline:"none", boxSizing:"border-box", color:"#e8f5e9" },
  myBadge:{ background:"rgba(184,148,58,.12)", border:"1px solid rgba(184,148,58,.25)", borderRadius:12, padding:"10px 14px", display:"flex", alignItems:"center", gap:10 },
  goldBtn:{ width:"100%", padding:"17px", background:"linear-gradient(135deg,#7a5c18,#D4AC50,#c9a030)", border:"none", borderRadius:14, color:"#1a0c00", fontSize:15, fontWeight:700, letterSpacing:1.5, cursor:"pointer", fontFamily:"'Noto Sans KR',sans-serif", boxShadow:"0 6px 24px rgba(184,148,58,.38)", position:"relative", overflow:"hidden", transition:"all .2s" },
  refreshBtn:{ width:"100%", padding:"11px", background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.08)", borderRadius:11, color:"rgba(232,245,233,.45)", fontSize:12, cursor:"pointer", fontFamily:"'Noto Sans KR',sans-serif", letterSpacing:1, transition:"all .2s" },
  exportBtn:{ padding:"6px 14px", background:"rgba(184,148,58,.18)", border:"1px solid rgba(184,148,58,.35)", borderRadius:8, color:"#D4AC50", fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"'Noto Sans KR',sans-serif", letterSpacing:0.5 },
};
