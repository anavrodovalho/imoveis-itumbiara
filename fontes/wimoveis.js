import { CIDADE, UA, num, tipoDoTexto } from './comum.js';

export const NOME = 'Wimoveis';
export const ESPERADO = 300; // se coletar bem menos, provável bloqueio temporário

const BASE = 'https://www.wimoveis.com.br/venda/imoveis/go/itumbiara';
const MAX_PAGINAS = 40;

function extrairCards() {
  const cards = document.querySelectorAll('[data-qa="posting PROPERTY"]');
  return [...cards].map((c) => {
    const feats = [...c.querySelectorAll('[data-qa="POSTING_CARD_FEATURES"] *')]
      .map((e) => e.textContent.trim()).filter(Boolean);
    const path = c.getAttribute('data-to-posting') || c.querySelector('a')?.getAttribute('href') || '';
    return {
      id: c.getAttribute('data-id'),
      precoTexto: c.querySelector('[data-qa="POSTING_CARD_PRICE"]')?.textContent?.trim() || null,
      local: c.querySelector('[data-qa="POSTING_CARD_LOCATION"]')?.textContent?.trim() || null,
      endereco: c.querySelector('[data-qa="POSTING_CARD_LOCATION_ADDRESS"]')?.textContent?.trim() || null,
      titulo: c.querySelector('h2, [data-qa="POSTING_CARD_DESCRIPTION"]')?.textContent?.trim() || null,
      feats,
      link: path.startsWith('http') ? path.split('?')[0] : 'https://www.wimoveis.com.br' + path.split('?')[0],
    };
  });
}

function normalizar(raw) {
  const feat = (re) => { const f = raw.feats.find((x) => re.test(x)); return f ? num(f) : null; };
  const preco = /consulte|sob/i.test(raw.precoTexto || '') ? null : num(raw.precoTexto);
  return {
    fonte: 'Wimoveis',
    tipo: tipoDoTexto((raw.titulo || '') + ' ' + raw.link),
    preco,
    quartos: feat(/quarto/i),
    banheiros: feat(/banheiro/i),
    vagas: feat(/vaga|garagem/i),
    area: feat(/m²/),
    suites: null,
    bairro: (raw.local || '').split(',')[0].trim() || null,
    cidade: CIDADE,
    endereco: raw.endereco,
    titulo: raw.titulo,
    link: raw.link,
  };
}

export async function coletar(browser, log = console.log) {
  const ctx = await browser.newContext({ userAgent: UA, locale: 'pt-BR', viewport: { width: 1366, height: 900 } });
  const page = await ctx.newPage();
  const vistos = new Map();
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForSelector('[data-qa="posting PROPERTY"]', { timeout: 20000 });
  const total = num(await page.title());
  log(`  [Wimoveis] anunciados: ${total || '?'}`);
  const primeiroId = () => page.evaluate(() => document.querySelector('[data-qa="posting PROPERTY"]')?.getAttribute('data-id') || '');

  for (let p = 1; p <= MAX_PAGINAS; p++) {
    const raws = await page.evaluate(extrairCards);
    let novos = 0;
    for (const r of raws) if (r.id && !vistos.has(r.id)) { vistos.set(r.id, normalizar(r)); novos++; }
    if (novos === 0 && p > 1) break;
    if (total && vistos.size >= total) break;
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const next = page.locator('[data-qa="PAGING_NEXT"], a.paging-module__page-arrow-next, [class*="page-arrow"]:not([class*="disabled"])').last();
    if (!(await next.count()) || !(await next.isVisible().catch(() => false))) break;
    const antes = await primeiroId();
    await next.click({ timeout: 8000 }).catch(() => {});
    try {
      await page.waitForFunction((id) => document.querySelector('[data-qa="posting PROPERTY"]')?.getAttribute('data-id') !== id, antes, { timeout: 15000 });
    } catch { break; }
    await page.waitForTimeout(1000 + Math.random() * 700);
  }
  await ctx.close();
  const lista = [...vistos.values()];
  log(`  [Wimoveis] coletados: ${lista.length}`);
  return lista;
}
