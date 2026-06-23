import { useState, useEffect, useCallback } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const PRODUCTOS = [
  "Chaleco Geoplus Gabardina",
  "Chaleco Geolite Poplin",
  "Buzo Hi-Lite Pilot 360",
  "Buzo Dual Lite Pilot",
  "Buzo Reflect Lite Pilot",
  "Pantalón Treklite",
  "Pantalón Treklite Reflect",
  "Chaleco Geotech",
  "Chaleco Geoshield K18",
];

const SEMAFORO = [
  { valor: "verde",    label: "Positiva",  color: "#22c55e" },
  { valor: "amarillo", label: "Neutral",   color: "#eab308" },
  { valor: "rojo",     label: "Difícil",   color: "#ef4444" },
];

const PREGUNTAS = [
  { id: "consulto", label: "Consultó",   opciones: ["Sí", "No"],
    colores: { "Sí": "#22c55e", "No": "#555" } },
  { id: "interes",  label: "Interés",    opciones: ["Alto", "Medio", "Bajo"],
    colores: { "Alto": "#22c55e", "Medio": "#eab308", "Bajo": "#ef4444" } },
  { id: "pediria",  label: "Lo pediría", opciones: ["Sí", "Tal vez", "No"],
    colores: { "Sí": "#22c55e", "Tal vez": "#eab308", "No": "#ef4444" } },
];

const T = {
  bg: "#080808", surface: "#101010", border: "#1c1c1c",
  border2: "#242424", textDim: "#444", textSub: "#777",
  textBase: "#aaa", textHigh: "#eee", accent: "#fff",
  green: "#22c55e", yellow: "#eab308", red: "#ef4444",
};

const STORAGE_KEY = "k8-visitas-v3";
const POLL_MS = 3000;

async function load() {
  try {
    const r = await window.storage.get(STORAGE_KEY, true);
    return r ? JSON.parse(r.value) : [];
  } catch { return []; }
}
async function save(data) {
  try { await window.storage.set(STORAGE_KEY, JSON.stringify(data), true); } catch {}
}

function fechaCorta(iso) {
  return new Date(iso).toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit", year: "2-digit" });
}
function nombreCorto(p) {
  return p.replace("Chaleco ", "").replace("Buzo ", "").replace("Pantalón ", "");
}

export default function App() {
  const [tab, setTab] = useState("registro");
  const [visitas, setVisitas] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [toast, setToast] = useState("");
  const [form, setForm] = useState({
    cliente: "", fecha: new Date().toISOString().slice(0, 10),
    vendedor: "", semaforo: "", resumen: "", productos: {},
  });

  const fetchVisitas = useCallback(async (quiet = false) => {
    if (!quiet) setSyncing(true);
    const data = await load();
    setVisitas(data);
    setLastSync(new Date());
    if (!quiet) setSyncing(false);
  }, []);

  useEffect(() => { fetchVisitas(); }, [fetchVisitas]);
  useEffect(() => {
    const id = setInterval(() => fetchVisitas(true), POLL_MS);
    return () => clearInterval(id);
  }, [fetchVisitas]);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }

  function setProd(nombre, campo, valor) {
    setForm(f => ({
      ...f,
      productos: { ...f.productos, [nombre]: { ...(f.productos[nombre] || {}), [campo]: valor } },
    }));
  }

  async function guardar() {
    if (!form.cliente.trim()) { showToast("Escribe el nombre del cliente"); return; }
    if (!form.semaforo) { showToast("Selecciona el semáforo"); return; }
    setSyncing(true);
    const fresh = await load();
    const nuevas = [{ ...form, id: Date.now(), creadoEn: new Date().toISOString() }, ...fresh];
    await save(nuevas);
    setVisitas(nuevas);
    setForm({ cliente: "", fecha: new Date().toISOString().slice(0, 10), vendedor: "", semaforo: "", resumen: "", productos: {} });
    setSyncing(false);
    showToast("Visita guardada");
    setTab("dashboard");
  }

  // métricas
  const porProd = PRODUCTOS.map(p => ({
    name: nombreCorto(p), full: p,
    consultas: visitas.filter(v => v.productos[p]?.consulto === "Sí").length,
    alto: visitas.filter(v => v.productos[p]?.interes === "Alto").length,
    pediria: visitas.filter(v => v.productos[p]?.pediria === "Sí").length,
  })).sort((a, b) => b.consultas - a.consultas);

  const semStats = { verde: 0, amarillo: 0, rojo: 0 };
  visitas.forEach(v => { if (v.semaforo) semStats[v.semaforo]++; });

  // estilos reutilizables
  const card = { background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8 };

  return (
    <div style={{ fontFamily: "'Inter','SF Pro Display','Segoe UI',sans-serif", background: T.bg, minHeight: "100vh", color: T.textBase }}>

      {/* TOAST */}
      {toast && (
        <div style={{ position: "fixed", top: 18, right: 18, zIndex: 999, background: "#1a1a1a", border: `1px solid ${T.border2}`, borderRadius: 7, padding: "10px 18px", fontSize: 12, color: T.textHigh, boxShadow: "0 4px 20px #00000090" }}>
          {toast}
        </div>
      )}

      {/* HEADER */}
      <div style={{ borderBottom: `1px solid ${T.border}`, padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: T.textDim, marginBottom: 3 }}>K8 Chile · Caocho · 2026</div>
          <div style={{ fontSize: 17, fontWeight: 700, color: T.textHigh, letterSpacing: "-0.02em" }}>Investigación de Mercado</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 10, color: T.textDim }}>{syncing ? "Sincronizando…" : lastSync ? `Sync ${lastSync.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}` : ""}</div>
            <div style={{ fontSize: 10, color: T.textDim, marginTop: 1 }}>Compartido · tiempo real</div>
          </div>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: syncing ? T.yellow : T.green, boxShadow: `0 0 7px ${syncing ? T.yellow : T.green}` }} />
        </div>
      </div>

      {/* TABS */}
      <div style={{ display: "flex", borderBottom: `1px solid ${T.border}`, padding: "0 24px" }}>
        {[{ id: "registro", label: "Nueva visita" }, { id: "dashboard", label: "Dashboard" }, { id: "historial", label: "Historial" }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: "12px 0", marginRight: 24, background: "none", border: "none",
            color: tab === t.id ? T.textHigh : T.textDim,
            fontWeight: tab === t.id ? 600 : 400, fontSize: 12,
            cursor: "pointer", fontFamily: "inherit",
            borderBottom: tab === t.id ? `1px solid ${T.accent}` : "1px solid transparent",
            letterSpacing: "0.01em",
          }}>{t.label}</button>
        ))}
      </div>

      <div style={{ padding: "24px", maxWidth: 1060, margin: "0 auto" }}>

        {/* ══ REGISTRO ══ */}
        {tab === "registro" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Fila superior */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
              {[
                { label: "Cliente / empresa", key: "cliente", placeholder: "Ej: Ferretería El Maestro", type: "text" },
                { label: "Vendedor/a", key: "vendedor", placeholder: "Nombre", type: "text" },
                { label: "Fecha", key: "fecha", placeholder: "", type: "date" },
              ].map(f => (
                <div key={f.key}>
                  <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: T.textDim, marginBottom: 6 }}>{f.label}</div>
                  <input type={f.type} value={form[f.key]} placeholder={f.placeholder}
                    onChange={e => setForm(x => ({ ...x, [f.key]: e.target.value }))}
                    style={{ width: "100%", boxSizing: "border-box", background: T.surface, border: `1px solid ${T.border2}`, borderRadius: 6, padding: "8px 11px", color: T.textHigh, fontSize: 12, fontFamily: "inherit", outline: "none", colorScheme: "dark" }} />
                </div>
              ))}
            </div>

            {/* Semáforo */}
            <div>
              <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: T.textDim, marginBottom: 8 }}>Semáforo de la visita</div>
              <div style={{ display: "flex", gap: 8 }}>
                {SEMAFORO.map(s => (
                  <button key={s.valor} onClick={() => setForm(f => ({ ...f, semaforo: s.valor }))} style={{
                    display: "flex", alignItems: "center", gap: 7,
                    padding: "7px 16px", borderRadius: 5,
                    border: `1px solid ${form.semaforo === s.valor ? s.color : T.border2}`,
                    background: form.semaforo === s.valor ? `${s.color}12` : "transparent",
                    color: form.semaforo === s.valor ? s.color : T.textDim,
                    cursor: "pointer", fontSize: 12, fontWeight: 500, fontFamily: "inherit",
                  }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: s.color, display: "inline-block" }} />
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tabla productos */}
            <div>
              <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: T.textDim, marginBottom: 8 }}>Evaluación por producto</div>
              <div style={{ ...card, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#0c0c0c" }}>
                      <th style={{ padding: "9px 14px", textAlign: "left", fontSize: 10, color: T.textDim, letterSpacing: "0.1em", fontWeight: 600, textTransform: "uppercase" }}>Producto</th>
                      {PREGUNTAS.map(q => (
                        <th key={q.id} style={{ padding: "9px 12px", textAlign: "center", fontSize: 10, color: T.textDim, letterSpacing: "0.1em", fontWeight: 600, textTransform: "uppercase" }}>{q.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {PRODUCTOS.map((prod, i) => (
                      <tr key={prod} style={{ borderTop: `1px solid ${T.border}`, background: i % 2 ? "#0c0c0c" : "transparent" }}>
                        <td style={{ padding: "9px 14px", fontSize: 11, color: T.textBase, fontWeight: 500 }}>{prod}</td>
                        {PREGUNTAS.map(q => (
                          <td key={q.id} style={{ padding: "7px 10px", textAlign: "center" }}>
                            <div style={{ display: "flex", gap: 4, justifyContent: "center", flexWrap: "wrap" }}>
                              {q.opciones.map(op => {
                                const sel = form.productos[prod]?.[q.id] === op;
                                const col = q.colores[op] || T.accent;
                                return (
                                  <button key={op} onClick={() => setProd(prod, q.id, op)} style={{
                                    padding: "3px 8px", fontSize: 10, fontWeight: 500,
                                    borderRadius: 4, border: `1px solid ${sel ? col : T.border2}`,
                                    background: sel ? `${col}15` : "transparent",
                                    color: sel ? col : T.textDim,
                                    cursor: "pointer", transition: "all 0.1s", fontFamily: "inherit",
                                  }}>{op}</button>
                                );
                              })}
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Resumen */}
            <div>
              <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: T.textDim, marginBottom: 8 }}>Resumen de la visita</div>
              <textarea value={form.resumen} onChange={e => setForm(f => ({ ...f, resumen: e.target.value }))}
                placeholder="Comentarios del cliente, observaciones, oportunidades…" rows={4}
                style={{ width: "100%", boxSizing: "border-box", resize: "vertical", background: T.surface, border: `1px solid ${T.border2}`, borderRadius: 6, padding: "9px 12px", color: T.textHigh, fontSize: 12, lineHeight: 1.65, fontFamily: "inherit", outline: "none" }} />
            </div>

            <div>
              <button onClick={guardar} style={{
                background: T.accent, color: T.bg, border: "none", borderRadius: 6,
                padding: "10px 26px", fontSize: 12, fontWeight: 700,
                cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.02em",
              }}>{syncing ? "Guardando…" : "Guardar visita"}</button>
            </div>
          </div>
        )}

        {/* ══ DASHBOARD ══ */}
        {tab === "dashboard" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {visitas.length === 0 ? (
              <div style={{ textAlign: "center", padding: "80px 0", color: T.textDim, fontSize: 12 }}>Sin visitas registradas aún</div>
            ) : (
              <>
                {/* KPIs */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                  {[
                    { label: "Visitas totales", value: visitas.length, color: T.textHigh },
                    { label: "Más consultado", value: porProd[0]?.name || "—", color: T.textHigh, small: true },
                    { label: "Positivas", value: semStats.verde, color: T.green },
                    { label: "Difíciles", value: semStats.rojo, color: T.red },
                  ].map((k, i) => (
                    <div key={i} style={{ ...card, padding: "15px 17px" }}>
                      <div style={{ fontSize: k.small ? 14 : 24, fontWeight: 700, color: k.color, letterSpacing: "-0.02em" }}>{k.value}</div>
                      <div style={{ fontSize: 10, color: T.textDim, marginTop: 5, letterSpacing: "0.08em", textTransform: "uppercase" }}>{k.label}</div>
                    </div>
                  ))}
                </div>

                {/* SEMÁFORO RESÚMENES */}
                <div>
                  <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: T.textDim, marginBottom: 10 }}>Resumen de visitas</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {visitas.map(v => {
                      const sem = SEMAFORO.find(s => s.valor === v.semaforo) || SEMAFORO[1];
                      const consultados = PRODUCTOS.filter(p => v.productos[p]?.consulto === "Sí");
                      const altos = PRODUCTOS.filter(p => v.productos[p]?.interes === "Alto");
                      return (
                        <div key={v.id} style={{
                          ...card, borderLeft: `2px solid ${sem.color}`,
                          borderRadius: "0 7px 7px 0", padding: "13px 17px",
                          display: "grid", gridTemplateColumns: "12px 1fr auto", gap: 14, alignItems: "start",
                        }}>
                          <div style={{ width: 8, height: 8, borderRadius: "50%", background: sem.color, marginTop: 4, boxShadow: `0 0 6px ${sem.color}60` }} />
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                              <span style={{ fontSize: 13, fontWeight: 600, color: T.textHigh }}>{v.cliente}</span>
                              <span style={{ fontSize: 10, color: T.textDim }}>{fechaCorta(v.fecha)}</span>
                              {v.vendedor && <span style={{ fontSize: 10, color: T.textDim }}>· {v.vendedor}</span>}
                            </div>
                            {v.resumen && (
                              <div style={{ fontSize: 12, color: T.textSub, lineHeight: 1.6, marginBottom: consultados.length ? 8 : 0 }}>{v.resumen}</div>
                            )}
                            {consultados.length > 0 && (
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                                {consultados.map(p => (
                                  <span key={p} style={{
                                    fontSize: 10, padding: "2px 7px", borderRadius: 4,
                                    border: `1px solid ${altos.includes(p) ? T.green + "60" : T.border2}`,
                                    color: altos.includes(p) ? T.green : T.textDim,
                                  }}>{nombreCorto(p)}{altos.includes(p) ? " ↑" : ""}</span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div style={{ fontSize: 10, color: sem.color, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", whiteSpace: "nowrap" }}>{sem.label}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* GRÁFICO */}
                <div>
                  <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: T.textDim, marginBottom: 10 }}>Consultas por producto</div>
                  <div style={{ ...card, padding: "18px 14px" }}>
                    <ResponsiveContainer width="100%" height={210}>
                      <BarChart data={porProd} layout="vertical" margin={{ left: 0, right: 20 }}>
                        <XAxis type="number" tick={{ fill: T.textDim, fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                        <YAxis type="category" dataKey="name" tick={{ fill: T.textSub, fontSize: 11 }} width={155} axisLine={false} tickLine={false} />
                        <Tooltip cursor={{ fill: "rgba(255,255,255,0.03)" }} contentStyle={{ background: "#141414", border: `1px solid ${T.border2}`, borderRadius: 6, fontSize: 11, color: T.textBase }} />
                        <Bar dataKey="consultas" radius={[0, 4, 4, 0]} maxBarSize={12}>
                          {porProd.map((_, i) => <Cell key={i} fill={i === 0 ? T.accent : "#2a2a2a"} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* TABLA DETALLE */}
                <div>
                  <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: T.textDim, marginBottom: 10 }}>Detalle por producto</div>
                  <div style={{ ...card, overflow: "hidden" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ background: "#0c0c0c" }}>
                          {["Producto", "Consultas", "Interés alto", "Lo pediría"].map(h => (
                            <th key={h} style={{ padding: "9px 14px", textAlign: h === "Producto" ? "left" : "center", fontSize: 10, color: T.textDim, letterSpacing: "0.1em", fontWeight: 600, textTransform: "uppercase" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {porProd.map((p, i) => (
                          <tr key={p.full} style={{ borderTop: `1px solid ${T.border}`, background: i % 2 ? "#0c0c0c" : "transparent" }}>
                            <td style={{ padding: "8px 14px", fontSize: 11, color: T.textBase }}>{p.full}</td>
                            <td style={{ padding: "8px 14px", textAlign: "center", fontSize: 12, color: p.consultas > 0 ? T.textHigh : T.textDim, fontWeight: p.consultas > 0 ? 600 : 400 }}>{p.consultas}</td>
                            <td style={{ padding: "8px 14px", textAlign: "center", fontSize: 12, color: p.alto > 0 ? T.green : T.textDim, fontWeight: p.alto > 0 ? 600 : 400 }}>{p.alto}</td>
                            <td style={{ padding: "8px 14px", textAlign: "center", fontSize: 12, color: p.pediria > 0 ? T.green : T.textDim, fontWeight: p.pediria > 0 ? 600 : 400 }}>{p.pediria}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ══ HISTORIAL ══ */}
        {tab === "historial" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {visitas.length === 0 ? (
              <div style={{ textAlign: "center", padding: "80px 0", color: T.textDim, fontSize: 12 }}>Sin visitas registradas</div>
            ) : visitas.map(v => {
              const sem = SEMAFORO.find(s => s.valor === v.semaforo) || SEMAFORO[1];
              const consultados = PRODUCTOS.filter(p => v.productos[p]?.consulto === "Sí");
              const altos = PRODUCTOS.filter(p => v.productos[p]?.interes === "Alto");
              return (
                <div key={v.id} style={{ ...card, borderLeft: `2px solid ${sem.color}`, borderRadius: "0 7px 7px 0", padding: "14px 18px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 7, height: 7, borderRadius: "50%", background: sem.color }} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: T.textHigh }}>{v.cliente}</span>
                      <span style={{ fontSize: 10, color: T.textDim }}>{fechaCorta(v.fecha)}</span>
                      {v.vendedor && <span style={{ fontSize: 10, color: T.textDim }}>· {v.vendedor}</span>}
                    </div>
                    <span style={{ fontSize: 10, color: sem.color, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>{sem.label}</span>
                  </div>
                  {consultados.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: v.resumen ? 8 : 0 }}>
                      {consultados.map(p => (
                        <span key={p} style={{
                          fontSize: 10, padding: "2px 7px", borderRadius: 4,
                          border: `1px solid ${altos.includes(p) ? T.green + "60" : T.border2}`,
                          color: altos.includes(p) ? T.green : T.textDim,
                        }}>{nombreCorto(p)}{altos.includes(p) ? " ↑" : ""}</span>
                      ))}
                    </div>
                  )}
                  {v.resumen && <div style={{ fontSize: 12, color: T.textSub, lineHeight: 1.65 }}>{v.resumen}</div>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
