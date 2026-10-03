// Widget de pantalla de inicio para iOS — app Scriptable (gratis, App Store).
// Instalar: copia este archivo a Scriptable (carpeta Scriptable en iCloud Drive) o pega el código
// en un script nuevo llamado "Finanzas CL". Luego: mantén pulsada la pantalla de inicio → + →
// Scriptable → elige tamaño (pequeño, mediano o grande) → en el widget: Script = Finanzas CL,
// When Interacting = Open URL (abre la app Finanzas Pro CL).
// Mismas fuentes que la app, gratis y sin clave:
//   mindicador.cl (Banco Central / SII): dólar observado, euro, UF, UTM, cobre
//   INE (api-calculadora.ine.cl): IPC oficial
//   CoinGecko, contrastado con Binance: bitcoin, en dólares
//   gold-api.com: oro (onza troy), en dólares
//   api.boostr.cl: feriados, para correr los vencimientos al día hábil siguiente
// Criptos y oro se piden en dólares y se pasan a pesos con el dólar observado, igual que la app.

const APP_URL = "https://doclam2015-create.github.io/finanzas-cl/";

async function j(u) { const r = new Request(u); r.timeoutInterval = 10; return await r.loadJSON() }
const tryJ = async u => { try { return await j(u) } catch (e) { return null } };
const ym = (y, m) => { const d = new Date(y, m, 1); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") };
const iso = d => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
const MES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const MESL = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
const Y = hoy.getFullYear();
const INE = "https://api-calculadora.ine.cl/";

// Todo en paralelo: el widget tiene pocos segundos para cargar.
const [ind, dolarS, ck, bin, oro, ineMeses, ineMesesAnt, ferA, ferB] = await Promise.all([
  tryJ("https://mindicador.cl/api"),
  tryJ("https://mindicador.cl/api/dolar"),
  tryJ("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd"),
  tryJ("https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT"),
  tryJ("https://api.gold-api.com/price/XAU"),
  tryJ(INE + "ServiciosCalculadoraMeses?anio=" + Y),
  tryJ(INE + "ServiciosCalculadoraMeses?anio=" + (Y - 1)),
  tryJ("https://api.boostr.cl/holidays/" + Y + ".json"),
  tryJ("https://api.boostr.cl/holidays/" + (Y + 1) + ".json")
]);

const val = k => ind && ind[k] ? ind[k].valor : null;
const usd = val("dolar");

// Dólar: variación contra el día hábil anterior
let dolarVar = null;
if (dolarS && dolarS.serie && dolarS.serie.length > 1) dolarVar = dolarS.serie[0].valor - dolarS.serie[1].valor;

// Bitcoin en dólares: CoinGecko; si se aleja más de 1% de Binance, manda el exchange
let btcUsd = ck && ck.bitcoin ? ck.bitcoin.usd : null;
const binP = bin && bin.price ? parseFloat(bin.price) : null;
if (binP && (!btcUsd || Math.abs(binP / btcUsd - 1) > 0.01)) btcUsd = binP;

// IPC: último mes publicado por el INE, variación mensual y en 12 meses
let ipcMes = null, ipc12 = null, ipcK = null;
const meses = (ineMeses && ineMeses.length ? ineMeses : null), anioIpc = meses ? Y : Y - 1;
const lista = meses || ineMesesAnt;
if (lista && lista.length) {
  const m = Math.max(...lista.map(x => x.nmes)) - 1;
  ipcK = [anioIpc, m];
  const v = async (a, b) => {
    const r = await tryJ(`${INE}ServiciosCalculadoraVariacion?mesInicio=${a[1] + 1}&AnioInicio=${a[0]}&mesTermino=${b[1] + 1}&AnioTermino=${b[0]}&valor_a_ajustar=100000`);
    const x = r && r[0] ? parseFloat(String(r[0].variacion_ipc).replace(",", ".")) : NaN;
    return isFinite(x) ? x : null;
  };
  const prev = new Date(anioIpc, m - 1, 1);
  [ipcMes, ipc12] = await Promise.all([v([prev.getFullYear(), prev.getMonth()], ipcK), v([anioIpc - 1, m], ipcK)]);
}

// Próximos vencimientos: F29 (día 12 y 20) y cotizaciones (día 10 y 13), art. 36 del Código Tributario
const fer = new Set([...(ferA && ferA.data || []), ...(ferB && ferB.data || [])].map(f => f.date));
const habil = d => { while (d.getDay() === 0 || d.getDay() === 6 || fer.has(iso(d)) || (d.getMonth() === 11 && d.getDate() === 31)) d = new Date(d.getTime() + 864e5); return d };
const ven = [];
for (let k = 0; k < 3; k++) {
  const M = hoy.getMonth() + k, per = MESL[((M % 12) + 11) % 12];
  ven.push([habil(new Date(Y, M, 10)), "Cotizaciones " + per]);
  ven.push([habil(new Date(Y, M, 12)), "F29 " + per]);
  ven.push([new Date(Y, M, 13), "Cotizaciones electrónicas"]);
  ven.push([habil(new Date(Y, M, 20)), "F29 por internet"]);
}
const proximos = ven.filter(v => v[0] >= hoy).sort((a, b) => a[0] - b[0]);

/* ---------- dibujo ---------- */
const C = { bg: "#000000", dim: "#8e8e93", blue: "#0a84ff", green: "#30d158", red: "#ff453a", orange: "#ff9f0a", purple: "#bf5af2", txt: "#ffffff" };
const clp = n => n == null ? "—" : "$" + Math.round(n).toLocaleString("es-CL");
const clp2 = n => n == null ? "—" : "$" + n.toLocaleString("es-CL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = n => n == null ? "—" : (n > 0 ? "+" : "") + n.toLocaleString("es-CL", { maximumFractionDigits: 1 }) + "%";
const fam = config.widgetFamily || "large";

const w = new ListWidget();
w.backgroundColor = new Color(C.bg);
w.setPadding(12, 14, 12, 14);
w.url = APP_URL;

const head = w.addStack();
const t = head.addText("FINANZAS CL");
t.font = Font.boldSystemFont(11); t.textColor = new Color(C.blue);
head.addSpacer();
const hora = head.addText(new Date().toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" }));
hora.font = Font.systemFont(10); hora.textColor = new Color(C.dim);
w.addSpacer(6);

function fila(cont, label, texto, color, sub, subColor) {
  const s = cont.addStack(); s.centerAlignContent();
  const a = s.addText(label); a.font = Font.systemFont(12); a.textColor = new Color(C.dim); a.lineLimit = 1;
  s.addSpacer();
  if (sub) { const c = s.addText(sub + " "); c.font = Font.systemFont(10); c.textColor = new Color(subColor || C.dim) }
  const b = s.addText(texto); b.font = Font.boldSystemFont(fam === "small" ? 14 : 15); b.textColor = new Color(color); b.lineLimit = 1; b.minimumScaleFactor = 0.7;
  cont.addSpacer(4);
}
const dVar = dolarVar == null ? null : (dolarVar > 0 ? "▲" : dolarVar < 0 ? "▼" : "") + Math.abs(dolarVar).toLocaleString("es-CL", { maximumFractionDigits: 2 });
const dCol = dolarVar > 0 ? C.red : dolarVar < 0 ? C.green : C.dim;   // dólar sube = peso pierde
const ipcTxt = ipcK ? "IPC " + MES[ipcK[1]] : "IPC";

if (fam === "small") {
  fila(w, "Dólar", clp2(usd), C.green);
  fila(w, "UF", clp(val("uf")), C.green);
  fila(w, "UTM", clp(val("utm")), C.blue);
  fila(w, ipcTxt, pct(ipcMes), C.orange);
} else {
  const cols = w.addStack();
  const izq = cols.addStack(); izq.layoutVertically();
  cols.addSpacer(14);
  const der = cols.addStack(); der.layoutVertically();
  fila(izq, "Dólar", clp2(usd), C.green, fam === "large" ? dVar : null, dCol);
  fila(izq, "Euro", clp2(val("euro")), C.blue);
  fila(izq, "UF", clp(val("uf")), C.green);
  fila(izq, "UTM", clp(val("utm")), C.blue);
  fila(der, "Bitcoin", clp(btcUsd && usd ? btcUsd * usd : null), C.orange);
  fila(der, "Oro oz", clp(oro && oro.price && usd ? oro.price * usd : null), C.orange);
  fila(der, ipcTxt, pct(ipcMes), C.orange);
  fila(der, "IPC 12m", pct(ipc12), C.orange);

  if (fam === "large") {
    w.addSpacer(4);
    fila(w, "Cobre (libra)", val("libra_cobre") ? "US$" + val("libra_cobre").toLocaleString("es-CL", { maximumFractionDigits: 2 }) : "—", C.orange);
    fila(w, "UTA", clp(val("utm") ? val("utm") * 12 : null), C.blue);
    w.addSpacer(6);
    const st = w.addText("PRÓXIMOS VENCIMIENTOS"); st.font = Font.boldSystemFont(10); st.textColor = new Color(C.blue);
    w.addSpacer(4);
    proximos.slice(0, 4).forEach(([d, x]) => {
      const dias = Math.round((d - hoy) / 864e5);
      fila(w, d.getDate() + " " + MES[d.getMonth()] + " · " + x, dias === 0 ? "hoy" : "en " + dias + " d", dias <= 3 ? C.red : C.txt);
    });
  }
}

w.addSpacer();
const pie = w.addText("Banco Central · INE · SII");
pie.font = Font.systemFont(9); pie.textColor = new Color(C.dim);

w.refreshAfterDate = new Date(Date.now() + 30 * 60 * 1000);   // iOS decide, esto es una sugerencia

if (config.runsInWidget) Script.setWidget(w);
else if (fam === "small") await w.presentSmall();
else if (fam === "medium") await w.presentMedium();
else await w.presentLarge();
Script.complete();
