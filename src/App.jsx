import { useState, useEffect, useCallback } from "react";

const FLAGS = { USD: "🇺🇸", EUR: "🇪🇺", BRL: "🇧🇷" };
const NAMES = { USD: "Dólar", EUR: "Euro", BRL: "Real" };
const SYMS  = { USD: "$", EUR: "€", BRL: "R$" };
const DAYS  = { "1": 1, "7": 7, "15": 15, "30": 30 };
const PLBLS = { "1": "1 dia", "7": "7 dias", "15": "15 dias", "30": "30 dias" };

function pastDateStr(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function fmt(v) {
  if (v == null || isNaN(v)) return "—";
  return v >= 1000
    ? v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : v.toFixed(4);
}

function calc(from, to, amt, r) {
  if (!r || amt <= 0) return null;
  if (from === "USD" && to === "BRL") return amt * r.USDBRL;
  if (from === "USD" && to === "EUR") return amt * r.USDEUR;
  if (from === "BRL" && to === "USD") return amt / r.USDBRL;
  if (from === "BRL" && to === "EUR") return amt / r.EURBRL;
  if (from === "EUR" && to === "BRL") return amt * r.EURBRL;
  if (from === "EUR" && to === "USD") return amt * r.EURUSD;
  return null;
}

function varKey(a, b) {
  const pair = [a, b].sort().join("");
  if (pair === "BRLEUR") return "EURBRL";
  if (pair === "BRLUSD") return "USDBRL";
  if (pair === "EURUSD") return "EURUSD";
}

export default function App() {
  const [base, setBase]       = useState("USD");
  const [amt, setAmt]         = useState("1");
  const [period, setPeriod]   = useState("1");
  const [cur, setCur]         = useState(null);   // current rates object
  const [past, setPast]       = useState(null);   // past rates object
  const [vars, setVars]       = useState(null);   // variation %
  const [loading, setLoading] = useState(false);
  const [updated, setUpdated] = useState(null);
  const [error, setError]     = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [rCur, rPast] = await Promise.all([
        fetch("https://api.frankfurter.app/latest?from=USD&to=EUR,BRL").then(r => r.json()),
        fetch(`https://api.frankfurter.app/${pastDateStr(DAYS[period])}?from=USD&to=EUR,BRL`).then(r => r.json()),
      ]);

      // Build current rate set
      const cUE = rCur.rates.EUR;
      const cUB = rCur.rates.BRL;
      const curRates = {
        USDEUR: cUE, USDBRL: cUB,
        EURBRL: cUB / cUE, EURUSD: 1 / cUE,
        BRLUSD: 1 / cUB, BRLEUR: cUE / cUB,
      };

      // Build past rate set
      const pUE = rPast.rates.EUR;
      const pUB = rPast.rates.BRL;
      const pastRates = {
        USDEUR: pUE, USDBRL: pUB,
        EURBRL: pUB / pUE, EURUSD: 1 / pUE,
        BRLUSD: 1 / pUB, BRLEUR: pUE / pUB,
      };

      // Variations
      const v = {};
      ["USDBRL", "EURBRL", "EURUSD"].forEach(k => {
        v[k] = ((curRates[k] - pastRates[k]) / pastRates[k]) * 100;
      });

      setCur(curRates);
      setPast(pastRates);
      setVars(v);
      setUpdated(new Date());
    } catch (e) {
      setError("Não foi possível buscar as cotações. Tente novamente.");
    }
    setLoading(false);
  }, [period]);

  useEffect(() => { load(); }, [load]);

  const numAmt = parseFloat(amt) || 0;
  const others = ["USD", "EUR", "BRL"].filter(c => c !== base);

  const S = {
    page: { minHeight:"100vh", background:"#0a0c10", color:"#e8eaf0", fontFamily:"'DM Mono','Fira Code','Courier New',monospace", display:"flex", flexDirection:"column", alignItems:"center", padding:"40px 20px", position:"relative", overflow:"hidden" },
    grid: { position:"fixed", inset:0, zIndex:0, backgroundImage:"linear-gradient(rgba(0,255,136,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,136,0.03) 1px, transparent 1px)", backgroundSize:"40px 40px", pointerEvents:"none" },
    glow: { position:"fixed", top:"-200px", left:"50%", transform:"translateX(-50%)", width:"600px", height:"400px", background:"radial-gradient(ellipse, rgba(0,255,136,0.06) 0%, transparent 70%)", pointerEvents:"none", zIndex:0 },
    wrap: { position:"relative", zIndex:1, width:"100%", maxWidth:"640px" },
  };

  return (
    <div style={S.page}>
      <div style={S.grid} />
      <div style={S.glow} />
      <div style={S.wrap}>

        {/* Header */}
        <div style={{ textAlign:"center", marginBottom:"40px" }}>
          <div style={{ display:"inline-flex", alignItems:"center", gap:"10px", background:"rgba(0,255,136,0.08)", border:"1px solid rgba(0,255,136,0.2)", padding:"6px 16px", borderRadius:"20px", marginBottom:"16px", fontSize:"11px", color:"#00ff88", letterSpacing:"2px", textTransform:"uppercase" }}>
            <span style={{ width:"6px", height:"6px", borderRadius:"50%", background: loading ? "#ff9500" : "#00ff88", boxShadow: loading ? "0 0 8px #ff9500" : "0 0 8px #00ff88", animation:"pulse 2s infinite" }} />
            {loading ? "Atualizando..." : "Live"}
          </div>
          <h1 style={{ margin:0, fontSize:"clamp(26px,6vw,40px)", fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, letterSpacing:"-1px", background:"linear-gradient(135deg,#ffffff 30%,#00ff88)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
            Câmbio em Tempo Real
          </h1>
          <p style={{ margin:"8px 0 0", color:"#5a6070", fontSize:"13px" }}>
            {updated ? `Atualizado às ${updated.toLocaleTimeString("pt-BR")}` : "Buscando cotações..."}
          </p>
        </div>

        {/* Error */}
        {error && <div style={{ background:"rgba(255,80,80,0.1)", border:"1px solid rgba(255,80,80,0.3)", borderRadius:"12px", padding:"14px 18px", marginBottom:"20px", color:"#ff6060", fontSize:"13px", textAlign:"center" }}>{error}</div>}

        {/* Moeda base */}
        <div style={{ marginBottom:"24px" }}>
          <label style={{ display:"block", fontSize:"11px", color:"#5a6070", letterSpacing:"2px", textTransform:"uppercase", marginBottom:"10px" }}>Moeda Base</label>
          <div style={{ display:"flex", gap:"10px" }}>
            {["USD","EUR","BRL"].map(c => (
              <button key={c} onClick={() => setBase(c)} style={{ flex:1, padding:"14px 8px", border:"1px solid", borderColor: base===c ? "#00ff88" : "rgba(255,255,255,0.08)", borderRadius:"12px", cursor:"pointer", background: base===c ? "rgba(0,255,136,0.1)" : "rgba(255,255,255,0.03)", color: base===c ? "#00ff88" : "#7a8090", display:"flex", flexDirection:"column", alignItems:"center", gap:"4px", boxShadow: base===c ? "0 0 20px rgba(0,255,136,0.1)" : "none" }}>
                <span style={{ fontSize:"22px" }}>{FLAGS[c]}</span>
                <span style={{ fontSize:"14px", fontWeight:700 }}>{c}</span>
                <span style={{ fontSize:"11px", opacity:0.7 }}>{NAMES[c]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Valor */}
        <div style={{ marginBottom:"24px" }}>
          <label style={{ display:"block", fontSize:"11px", color:"#5a6070", letterSpacing:"2px", textTransform:"uppercase", marginBottom:"10px" }}>Valor</label>
          <div style={{ position:"relative" }}>
            <span style={{ position:"absolute", left:"18px", top:"50%", transform:"translateY(-50%)", fontSize:"18px", color:"#00ff88", fontWeight:700 }}>{SYMS[base]}</span>
            <input type="number" value={amt} onChange={e => setAmt(e.target.value)}
              style={{ width:"100%", padding:"18px 18px 18px 46px", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:"12px", color:"#ffffff", fontSize:"24px", fontWeight:700, outline:"none", boxSizing:"border-box", fontFamily:"inherit" }}
              onFocus={e => e.target.style.borderColor="rgba(0,255,136,0.4)"}
              onBlur={e => e.target.style.borderColor="rgba(255,255,255,0.1)"}
              placeholder="1"
            />
          </div>
        </div>

        {/* Período */}
        <div style={{ marginBottom:"28px" }}>
          <label style={{ display:"block", fontSize:"11px", color:"#5a6070", letterSpacing:"2px", textTransform:"uppercase", marginBottom:"10px" }}>Variação do Período</label>
          <div style={{ display:"flex", gap:"8px" }}>
            {Object.entries(PLBLS).map(([k,lbl]) => (
              <button key={k} onClick={() => setPeriod(k)} style={{ flex:1, padding:"10px 4px", border:"1px solid", borderColor: period===k ? "rgba(0,255,136,0.5)" : "rgba(255,255,255,0.08)", borderRadius:"8px", cursor:"pointer", background: period===k ? "rgba(0,255,136,0.08)" : "transparent", color: period===k ? "#00ff88" : "#5a6070", fontSize:"12px", fontWeight: period===k ? 700 : 400, fontFamily:"inherit" }}>{lbl}</button>
            ))}
          </div>
        </div>

        {/* Cards */}
        <div style={{ display:"flex", flexDirection:"column", gap:"12px" }}>
          {others.map(tgt => {
            const vk    = varKey(base, tgt);
            const vPct  = vars ? vars[vk] : null;
            const isPos = vPct >= 0;
            const nowV  = calc(base, tgt, numAmt, cur);
            const thenV = calc(base, tgt, numAmt, past);

            return (
              <div key={tgt} style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:"16px", padding:"20px 24px", display:"flex", alignItems:"center", justifyContent:"space-between", position:"relative", overflow:"hidden" }}>
                {/* barra lateral */}
                <div style={{ position:"absolute", top:0, left:0, bottom:0, width:"3px", background: vPct==null ? "#333" : isPos ? "#00ff88" : "#ff4560", borderRadius:"16px 0 0 16px" }} />

                {/* esquerda */}
                <div style={{ display:"flex", alignItems:"center", gap:"14px" }}>
                  <span style={{ fontSize:"32px" }}>{FLAGS[tgt]}</span>
                  <div>
                    <div style={{ fontSize:"16px", fontWeight:700, color:"#e8eaf0" }}>{NAMES[tgt]}</div>
                    <div style={{ fontSize:"12px", color:"#5a6070", marginTop:"2px" }}>{tgt}</div>
                  </div>
                </div>

                {/* direita */}
                <div style={{ textAlign:"right" }}>
                  {loading ? (
                    <div style={{ color:"#5a6070", fontSize:"14px" }}>Carregando...</div>
                  ) : (
                    <>
                      {/* valor ATUAL */}
                      <div style={{ fontSize:"22px", fontWeight:700, color:"#ffffff" }}>
                        {SYMS[tgt]}{fmt(nowV)}
                      </div>

                      {/* variação % */}
                      {vPct != null && (
                        <div style={{ fontSize:"12px", marginTop:"4px", color: isPos ? "#00ff88" : "#ff4560", display:"flex", alignItems:"center", gap:"4px", justifyContent:"flex-end" }}>
                          <span>{isPos ? "▲" : "▼"}</span>
                          <span>{Math.abs(vPct).toFixed(2)}%</span>
                          <span style={{ color:"#5a6070" }}>({PLBLS[period]})</span>
                        </div>
                      )}

                      {/* valor HISTÓRICO */}
                      {thenV != null && (
                        <div style={{ marginTop:"7px", paddingTop:"7px", borderTop:"1px solid rgba(255,255,255,0.07)", fontSize:"11px", color:"#4a5565" }}>
                          há {PLBLS[period]}:{" "}
                          <span style={{ color:"#6a7585", fontWeight:600 }}>
                            {SYMS[tgt]}{fmt(thenV)}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Tabela de taxas */}
        {cur && (
          <div style={{ marginTop:"24px", padding:"16px 20px", background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.05)", borderRadius:"12px", display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:"12px" }}>
            {[["USD/BRL", cur.USDBRL], ["EUR/BRL", cur.EURBRL], ["EUR/USD", cur.EURUSD]].map(([lbl, val]) => (
              <div key={lbl} style={{ textAlign:"center" }}>
                <div style={{ fontSize:"10px", color:"#5a6070", letterSpacing:"1px" }}>{lbl}</div>
                <div style={{ fontSize:"14px", color:"#a0a8b8", fontWeight:600, marginTop:"2px" }}>{val?.toFixed(4) || "—"}</div>
              </div>
            ))}
          </div>
        )}

        {/* Botão atualizar */}
        <button onClick={load} disabled={loading} style={{ width:"100%", marginTop:"16px", padding:"14px", background: loading ? "rgba(0,255,136,0.05)" : "rgba(0,255,136,0.1)", border:"1px solid rgba(0,255,136,0.3)", borderRadius:"12px", color: loading ? "#5a6070" : "#00ff88", cursor: loading ? "not-allowed" : "pointer", fontSize:"13px", fontFamily:"inherit", letterSpacing:"1px", textTransform:"uppercase" }}>
          {loading ? "Atualizando..." : "↻ Atualizar Cotações"}
        </button>

        <p style={{ textAlign:"center", fontSize:"11px", color:"#3a4050", marginTop:"20px" }}>
          Fonte: frankfurter.app • {new Date().toLocaleDateString("pt-BR")}
        </p>
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance:none; }
        input[type=number] { -moz-appearance:textfield; }
        button { transition: all 0.2s; }
      `}</style>
    </div>
  );
}
