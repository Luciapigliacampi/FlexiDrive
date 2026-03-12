// flexidrive-front/src/components/TestDatePanel.jsx
// ─── Solo se renderiza cuando VITE_USE_TEST_DATE=true
//     Sincroniza TEST_DATE y TEST_HOUR en envio-service Y ia-route-service
//     en una sola acción, sin reiniciar ningún servidor.

import { useEffect, useRef, useState } from "react";
import { FlaskConical, ChevronDown, ChevronUp, RefreshCw, Play, SkipForward } from "lucide-react";
import api from "../services/api";

const ENVIO_BASE = import.meta.env.VITE_ENVIO_API_URL || "http://localhost:3001";
const IA_ROUTE_BASE = import.meta.env.VITE_IA_API_URL    || "http://localhost:3002";
const USE_TEST   = import.meta.env.VITE_USE_TEST_DATE === "true";

const FRANJAS = [
  { label: "antes de todo",    hora: 7  },
  { label: "inicio mañana",    hora: 8  },
  { label: "mañana activa",    hora: 9  },
  { label: "inicio tarde",     hora: 13 },
  { label: "inicio noche",     hora: 17 },
  { label: "fin del día",      hora: 20 },
  { label: "cron cancelación", hora: 23 },
];

// Llama a ambos servicios en paralelo
async function patchBoth(body) {
  const [r1, r2] = await Promise.allSettled([
    api.patch(`${ENVIO_BASE}/api/test/config`, body).then(r => r.data),
    api.patch(`${IA_ROUTE_BASE}/api/test/config`,    body).then(r => r.data),
  ]);
  const ok1 = r1.status === "fulfilled";
  const ok2 = r2.status === "fulfilled";
  if (!ok1 && !ok2) throw new Error("Ambos servicios fallaron");
  return { ...(ok1 ? r1.value : r2.value), _envioOk: ok1, _iaOk: ok2 };
}

async function fetchConfig() {
  const r = await api.get(`${ENVIO_BASE}/api/test/config`);
  return r.data;
}

async function triggerCancelar() {
  const r = await api.post(`${ENVIO_BASE}/api/test/cancelar-vencidos`);
  return r.data;
}

export default function TestDatePanel() {
  if (!USE_TEST) return null;

  const [open,    setOpen]    = useState(false);
  const [config,  setConfig]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [msg,     setMsg]     = useState("");
  const [fecha,   setFecha]   = useState("");
  const [hora,    setHora]    = useState("");
  const timerRef = useRef(null);

  useEffect(() => {
    fetchConfig()
      .then(c => { setConfig(c); setFecha(c.TEST_DATE || "2026-03-06"); setHora(c.TEST_HOUR ?? "8"); })
      .catch(() => {});
  }, []);

  function showMsg(text) {
    setMsg(text);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setMsg(""), 3500);
  }

  async function apply(body) {
    setLoading(true);
    try {
      const c = await patchBoth(body);
      setConfig(c);
      setFecha(c.TEST_DATE);
      setHora(String(c.TEST_HOUR));
      const serv = [c._envioOk && "envio", c._iaOk && "ia-route"].filter(Boolean).join(" + ");
      showMsg(`✅ ${new Date(c.nowSimulado).toLocaleString("es-AR")}  [${serv}]`);
      window.dispatchEvent(new CustomEvent("test-date-changed", { detail: c }));
    } catch (e) {
      showMsg(`❌ ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleCancelar() {
    setLoading(true);
    try {
      const r = await triggerCancelar();
      showMsg(`✅ ${r.cancelados} envío(s) cancelados — recargando...`);
      // Delay para que MongoDB termine de escribir antes de recargar la lista
      await new Promise(res => setTimeout(res, 600));
      window.dispatchEvent(new CustomEvent("test-date-changed", {}));
    } catch {
      showMsg("❌ Error al cancelar vencidos");
    } finally {
      setLoading(false);
    }
  }

  function nextDay() {
    const [y, m, d] = fecha.split("-").map(Number);
    const next = new Date(y, m - 1, d + 1).toISOString().split("T")[0];
    setFecha(next);
    apply({ fecha: next, hora: parseInt(hora, 10) });
  }

  const horaNum = parseInt(hora, 10);

  return (
    <div style={{ position:"fixed", bottom:16, right:16, zIndex:9999, fontFamily:"'JetBrains Mono','Fira Code',monospace" }}>

      <button onClick={() => setOpen(v => !v)} style={{
        display:"flex", alignItems:"center", gap:6,
        background:"#1e293b", color:"#f8fafc",
        border:"1.5px solid #334155", borderRadius:12,
        padding:"8px 14px", fontSize:12, fontWeight:700,
        cursor:"pointer", boxShadow:"0 4px 24px rgba(0,0,0,.35)",
      }}>
        <FlaskConical size={15} color="#38bdf8" />
        <span style={{ color:"#38bdf8" }}>TEST</span>
        {config && (
          <span style={{ color:"#94a3b8", fontWeight:400 }}>
            {config.TEST_DATE} {String(config.TEST_HOUR).padStart(2,"0")}:00
          </span>
        )}
        {open ? <ChevronDown size={13}/> : <ChevronUp size={13}/>}
      </button>

      {open && (
        <div style={{
          position:"absolute", bottom:"calc(100% + 8px)", right:0, width:330,
          background:"#0f172a", border:"1.5px solid #1e293b",
          borderRadius:16, boxShadow:"0 8px 40px rgba(0,0,0,.5)", overflow:"hidden",
        }}>
          {/* Header */}
          <div style={{ display:"flex", alignItems:"center", gap:8, padding:"12px 16px", background:"#1e293b", borderBottom:"1px solid #334155" }}>
            <FlaskConical size={15} color="#38bdf8"/>
            <span style={{ color:"#f1f5f9", fontSize:13, fontWeight:700 }}>Panel de pruebas</span>
            <span style={{ marginLeft:"auto", fontSize:10, color:"#64748b", background:"#0f172a", padding:"2px 8px", borderRadius:99 }}>
              envio-service + ia-route
            </span>
          </div>

          <div style={{ padding:16, display:"flex", flexDirection:"column", gap:14 }}>

            {/* Fecha */}
            <div>
              <Lbl>Fecha simulada</Lbl>
              <div style={{ display:"flex", gap:8 }}>
                <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} style={inp()} />
                <button onClick={nextDay} disabled={loading} title="Día siguiente" style={btn("#0ea5e9")}>
                  <SkipForward size={14}/>
                </button>
              </div>
            </div>

            {/* Franjas */}
            <div>
              <Lbl>Hora simulada</Lbl>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                {FRANJAS.map(({ label, hora: h }) => (
                  <button key={h} disabled={loading} onClick={() => { setHora(String(h)); apply({ hora: h }); }} style={{
                    display:"flex", flexDirection:"column", alignItems:"center",
                    borderRadius:8, padding:"5px 9px", fontSize:12, fontWeight:700,
                    cursor:"pointer", fontFamily:"inherit", lineHeight:1.3,
                    background: horaNum === h ? "#0ea5e9" : "#1e293b",
                    color:      horaNum === h ? "#fff"    : "#94a3b8",
                    border:     horaNum === h ? "1px solid #0ea5e9" : "1px solid #334155",
                  }}>
                    {String(h).padStart(2,"0")}:00
                    <span style={{ opacity:.6, fontSize:9 }}>{label}</span>
                  </button>
                ))}
              </div>
              <div style={{ display:"flex", gap:8, marginTop:8 }}>
                <input type="number" min={0} max={23} value={hora} onChange={e => setHora(e.target.value)}
                  style={{ ...inp(), width:70 }}/>
                <button onClick={() => apply({ fecha, hora: parseInt(hora,10) })} disabled={loading}
                  style={{ ...btn("#6366f1"), flex:1, gap:6 }}>
                  <Play size={12}/> Aplicar fecha + hora
                </button>
              </div>
            </div>

            <div style={{ borderTop:"1px solid #1e293b" }}/>

            <div style={{ display:"flex", gap:8 }}>
              <button onClick={() => fetchConfig().then(c => { setConfig(c); showMsg("🔄 Config actualizada"); })}
                disabled={loading} style={{ ...btn("#334155"), flex:1, gap:6 }}>
                <RefreshCw size={12}/> Recargar
              </button>
              <button onClick={handleCancelar} disabled={loading} style={{ ...btn("#dc2626"), flex:1 }}>
                Cancelar vencidos
              </button>
            </div>

            {msg && (
              <div style={{ background:"#1e293b", borderRadius:8, padding:"8px 12px", fontSize:11, color:"#94a3b8", textAlign:"center" }}>
                {msg}
              </div>
            )}

            {config && (
              <div style={{ background:"#1e293b", borderRadius:8, padding:"8px 12px", fontSize:11 }}>
                <span style={{ color:"#64748b" }}>Ahora simulado: </span>
                <span style={{ color:"#38bdf8" }}>{new Date(config.nowSimulado).toLocaleString("es-AR")}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Lbl({ children }) {
  return <div style={{ color:"#94a3b8", fontSize:11, marginBottom:6, letterSpacing:"0.06em", textTransform:"uppercase" }}>{children}</div>;
}
function inp() {
  return { flex:1, background:"#1e293b", color:"#f1f5f9", border:"1px solid #334155", borderRadius:8, padding:"7px 10px", fontSize:13, outline:"none", fontFamily:"inherit", colorScheme:"dark" };
}
function btn(bg) {
  return { display:"flex", alignItems:"center", justifyContent:"center", background:bg, color:"#f1f5f9", border:"none", borderRadius:8, padding:"7px 12px", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" };
}
