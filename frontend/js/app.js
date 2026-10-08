// WebAR de apoio a manutencao - Torno CNC 01 (prototipo didatico)
// Valores de monitoramento vem da API Flask; nada de telemetria fica fixo aqui.

const params = new URLSearchParams(location.search);
const EQUIPAMENTO_ID = params.get("id") || "CNC-01";
// URL da API: ?api=https://minha-api.exemplo.com  (obrigatorio HTTPS se a pagina for HTTPS)
const API_BASE = (params.get("api") || `${location.protocol}//${location.hostname}:5000`).replace(/\/$/, "");
const TIMEOUT_MS = 5000;

// Proporcao altura/largura da imagem do target (1200x800 => 0.6667).
// Se trocar a imagem, ajuste este valor.
const TARGET_ASPECT = 1;

// Posicoes normalizadas na imagem do target (0,0 = canto superior esquerdo; 1,1 = inferior direito)
const HOTSPOTS = [
  { id: "cabecote", rotulo: "1", nx: 0.12, ny: 0.40, titulo: "Cabeçote e placa", linhas: [
    ["Função", "Aloja o eixo que gira a placa, responsável por fixar e rotacionar a peça durante a usinagem."],
    ["Inspeção", "Observar fixação das castanhas, folgas visíveis e ruídos incomuns."],
    ["Manutenção", "Seguir o plano de lubrificação e inspeção do manual do fabricante."] ] },
  { id: "torre", rotulo: "2", nx: 0.51, ny: 0.40, titulo: "Torre de ferramentas", linhas: [
    ["Função", "Porta-ferramentas giratório que posiciona a ferramenta de corte certa para cada operação."],
    ["Inspeção", "Verificar fixação das ferramentas e desgaste aparente das pastilhas."],
    ["Manutenção", "Limpeza de cavacos e checagem do posicionamento conforme o procedimento da empresa."] ] },
  { id: "painel", rotulo: "3", nx: 0.32, ny: 0.30, titulo: "Painel de comando (IHM)", linhas: [
    ["Função", "Interface do comando CNC: seleção de programas, coordenadas e alarmes."],
    ["Inspeção", "Conferir mensagens de alarme, botão de emergência acessível e tela legível."],
    ["Manutenção", "Limpeza externa com máquina desligada e registro de alarmes recorrentes."] ] },
  { id: "protecao", rotulo: "4", nx: 0.21, ny: 0.45, titulo: "Proteção da área de usinagem", linhas: [
    ["Função", "Porta/proteção que impede acesso à área de corte durante o movimento."],
    ["Segurança", "Nunca anular intertravamentos. Siga as normas e procedimentos de segurança da empresa."],
    ["Inspeção", "Verificar integridade do visor, fechamento e funcionamento do intertravamento."] ] },
  { id: "monitoramento", rotulo: "M", nx: 0.40, ny: 0.17, titulo: "Monitoramento (dados da API)", monitor: true },
];

const $ = (id) => document.getElementById(id);
const painel = $("painel"), corpo = $("painel-corpo"), btnAtualizar = $("painel-atualizar");
let hotspotAtivo = null;

// ---------- Painel ----------
function abrirPainel(h) {
  hotspotAtivo = h;
  $("painel-titulo").textContent = h.titulo;
  corpo.replaceChildren();
  painel.hidden = false;
  btnAtualizar.hidden = !h.monitor;
  if (h.monitor) return carregarTelemetria(EQUIPAMENTO_ID);
  const dl = document.createElement("dl");
  h.linhas.forEach(([k, v]) => {
    const dt = document.createElement("dt"); dt.textContent = k;
    const dd = document.createElement("dd"); dd.textContent = v;
    dl.append(dt, dd);
  });
  corpo.append(dl);
}
$("painel-fechar").addEventListener("click", () => { painel.hidden = true; hotspotAtivo = null; });
btnAtualizar.addEventListener("click", () => carregarTelemetria(EQUIPAMENTO_ID));

function mostrarTexto(msg, classe) {
  corpo.replaceChildren();
  const p = document.createElement("p");
  p.textContent = msg; if (classe) p.className = classe;
  corpo.append(p);
}

// ---------- Integracao com a API Flask ----------
async function carregarTelemetria(id) {
  mostrarTexto("Consultando a API…");
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(`${API_BASE}/api/equipamentos/${encodeURIComponent(id)}/telemetria`, { signal: ctrl.signal });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const d = await r.json();
    if (hotspotAtivo && hotspotAtivo.monitor) renderTelemetria(d);
  } catch (e) {
    console.error("Falha ao consultar a API:", e);
    if (hotspotAtivo && hotspotAtivo.monitor)
      mostrarTexto("⚠ Não foi possível consultar\nos dados do equipamento.\nVerifique a disponibilidade\ndo serviço e tente novamente.", "erro");
  } finally { clearTimeout(t); }
}

function renderTelemetria(d) {
  if (d.atualizacao === null) return mostrarTexto("A API respondeu, mas ainda não recebeu dados do simulador MQTT.");
  const linhas = [
    ["Status", d.status ?? "—"],
    ["Temperatura", d.temperatura != null ? `${d.temperatura} °C (simulado)` : "—"],
    ["Vibração", d.vibracao != null ? `${d.vibracao} mm/s (simulado)` : "—"],
    ["Última atualização", d.atualizacao],
  ];
  corpo.replaceChildren();
  const dl = document.createElement("dl");
  linhas.forEach(([k, v]) => {
    const dt = document.createElement("dt"); dt.textContent = k;
    const dd = document.createElement("dd"); dd.textContent = v;
    dl.append(dt, dd);
  });
  corpo.append(dl);
}

// ---------- Hotspots (botoes DOM) ----------
const container = $("hotspots");
HOTSPOTS.forEach((h) => {
  const b = document.createElement("button");
  b.className = "hotspot" + (h.monitor ? " monitor" : "");
  b.textContent = h.rotulo;
  b.setAttribute("aria-label", h.titulo);
  b.addEventListener("pointerup", (ev) => { ev.preventDefault(); abrirPainel(h); });
  container.append(b);
  h.el = b;
});

function mostrarHotspots(v) { HOTSPOTS.forEach((h) => h.el.classList.toggle("visivel", v)); }

// ---------- Modo AR (index.html) ----------
const cena = document.querySelector("a-scene");
if (cena) {
  const estado = $("estado"), dica = $("dica"), alvo = $("alvo");
  const THREE = AFRAME.THREE;
  const v = new THREE.Vector3();
  let ativo = false;

  // ancoras 3D filhas do target: acompanham o tracking (unidade: largura do target = 1)
  HOTSPOTS.forEach((h) => {
    const a = document.createElement("a-entity");
    a.setAttribute("position", `${h.nx - 0.5} ${(0.5 - h.ny) * TARGET_ASPECT} 0`);
    alvo.appendChild(a);
    h.ancora = a;
  });

  const set = (txt, cls) => { estado.textContent = txt; estado.className = "estado " + (cls || ""); };
  set("Iniciando câmera…");
  cena.addEventListener("arReady", () => set("Procurando target…"));
  cena.addEventListener("arError", () => set("Erro: câmera ou arquivo .mind", "erro"));
  alvo.addEventListener("targetFound", () => { ativo = true; set("RA ATIVA", "ativa"); dica.classList.add("oculta"); mostrarHotspots(true); });
  alvo.addEventListener("targetLost", () => { ativo = false; set("Procurando target…"); mostrarHotspots(false); });

  function projetar() {
    if (ativo && cena.camera) {
      const r = cena.renderer.domElement.getBoundingClientRect();
      HOTSPOTS.forEach((h) => {
        h.ancora.object3D.getWorldPosition(v);
        v.project(cena.camera);
        const x = r.left + (v.x * 0.5 + 0.5) * r.width;
        const y = r.top + (-v.y * 0.5 + 0.5) * r.height;
        h.el.style.transform = `translate(${x}px, ${y}px)`;
      });
    }
    requestAnimationFrame(projetar);
  }
  requestAnimationFrame(projetar);
} else {
  // ---------- Modo demo (demo.html): sem camera ----------
  const img = $("demo-img");
  const posicionar = () => HOTSPOTS.forEach((h) => {
    h.el.style.transform = `translate(${h.nx * img.clientWidth}px, ${h.ny * img.clientHeight}px)`;
  });
  img.addEventListener("load", () => { posicionar(); mostrarHotspots(true); });
  window.addEventListener("resize", posicionar);
  if (img.complete) { posicionar(); mostrarHotspots(true); }
}
