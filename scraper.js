import { chromium } from 'playwright';
import { writeFileSync, readFileSync, mkdirSync } from 'fs';
import { CIDADE } from './fontes/comum.js';
import * as viga from './fontes/viga.js';
import * as wecorretora from './fontes/wecorretora.js';
import * as beirario from './fontes/beirario.js';
import * as inovare from './fontes/inovare.js';
import * as vls from './fontes/vls.js';

// Inovare/VLS (Kenlo) e Beira Rio têm mais campos, então vêm primeiro (vencem na dedup).
// Wimóveis foi removida: bloqueio anti-robô só entrega a 1ª página (~30 de 399).
const FONTES = [inovare, vls, beirario, wecorretora, viga];

const normBairro = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
const chave = (i) => `${i.tipo}|${normBairro(i.bairro)}|${i.preco}`;

// dados anteriores por fonte, pra preservar quando uma coleta vier fraca (bloqueio de um dia)
function anteriorPorFonte() {
  const m = {};
  try {
    for (const i of JSON.parse(readFileSync('data/imoveis.json', 'utf8')).imoveis) {
      const f = i.fonte || (i.fontes && i.fontes[0]) || 'Wimoveis';
      (m[f] = m[f] || []).push({ ...i, fonte: f, fontes: i.fontes || [f] });
    }
  } catch {}
  return m;
}

const anterior = anteriorPorFonte();
const browser = await chromium.launch({ headless: true });
let todos = [];
for (const f of FONTES) {
  const prev = anterior[f.NOME] || [];
  let novos = [];
  try { novos = await f.coletar(browser); }
  catch (e) { console.log(`  [${f.NOME}] falhou: ${e.message.slice(0, 70)}`); }
  if (novos.length < Math.max(f.ESPERADO * 0.5, 10) && prev.length > novos.length) {
    console.log(`  [${f.NOME}] coleta fraca (${novos.length}); mantendo ${prev.length} do dia anterior`);
    todos = todos.concat(prev);
  } else {
    todos = todos.concat(novos);
  }
}
await browser.close();

// Deduplicação: itens com mesmo tipo+bairro+preço são o mesmo imóvel anunciado em
// mais de uma fonte. Mantém o 1º (Wimoveis, mais completo) e anota as fontes.
const comPreco = new Map();
const semPreco = [];
let dups = 0;
for (const i of todos) {
  if (i.preco == null) { semPreco.push(i); continue; }
  const k = chave(i);
  if (comPreco.has(k)) {
    const ex = comPreco.get(k);
    ex.fontes = [...new Set([...(ex.fontes || [ex.fonte]), i.fonte])];
    dups++;
  } else {
    i.fontes = [i.fonte];
    comPreco.set(k, i);
  }
}
const imoveis = [...comPreco.values(), ...semPreco]
  .sort((a, b) => (a.preco ?? Infinity) - (b.preco ?? Infinity));

const porFonte = {};
for (const i of imoveis) for (const f of (i.fontes || [i.fonte])) porFonte[f] = (porFonte[f] || 0) + 1;

mkdirSync('data', { recursive: true });
const payload = {
  atualizadoEm: new Date().toISOString(),
  cidade: CIDADE,
  fontes: Object.keys(porFonte),
  total: imoveis.length,
  comPreco: imoveis.filter((i) => i.preco != null).length,
  porFonte,
  imoveis,
};
writeFileSync('data/imoveis.json', JSON.stringify(payload, null, 2));
writeFileSync('data/imoveis.js', 'window.__IMOVEIS__ = ' + JSON.stringify(payload) + ';');
console.log(`\nSalvo: ${payload.total} imóveis (${payload.comPreco} com preço, ${dups} duplicados removidos).`);
console.log('Por fonte:', JSON.stringify(porFonte));
