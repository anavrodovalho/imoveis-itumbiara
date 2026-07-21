import { CIDADE, UA, num, tipoDoTexto } from './comum.js';

export const NOME = 'WE Corretora';
export const ESPERADO = 40;

// Imobiliária local (wecorretora.com). A lista mistura venda e locação e às
// vezes traz imóveis de outras cidades; filtramos pelos links que são de
// venda E de Itumbiara (o slug termina em "-itumbiara-go").
const BASE = 'https://www.wecorretora.com/imobiliaria/itumbiara-go/imoveis';
const MAX_PAGINAS = 12;

function extrairCards() {
  const out = [];
  for (const art of document.querySelectorAll('article.c49-property-card')) {
    const oc = art.querySelector('[onclick*="window.open"]')?.getAttribute('onclick') || '';
    const link = (oc.match(/https?:\/\/[^']+/) || [null])[0];
    if (!link || !/\/venda-/.test(link) || !/-itumbiara-go/.test(link)) continue;
    out.push({
      link: link.split('?')[0],
      precoTexto: art.querySelector('.c49-property-card_price')?.textContent.replace(/\s+/g, ' ').trim() || '',
      address: art.querySelector('.c49-property-card_address')?.textContent.replace(/\s+/g, ' ').trim() || '',
      titulo: art.querySelector('.c49-property-card_title')?.textContent.replace(/\s+/g, ' ').trim() || '',
    });
  }
  return out;
}

function normalizar(raw) {
  const slug = raw.link.split('/').pop();
  const bairro = raw.address ? raw.address.split(',')[0].trim() : null;
  return {
    fonte: 'WE Corretora',
    tipo: tipoDoTexto(raw.titulo + ' ' + raw.link),
    preco: /consulte|sob/i.test(raw.precoTexto) ? null : num(raw.precoTexto),
    quartos: num((slug.match(/(\d+)-quartos?/i) || [])[1]),
    banheiros: null,
    vagas: null,
    area: null,
    suites: null,
    bairro: bairro || null,
    cidade: CIDADE,
    endereco: null,
    titulo: raw.titulo || null,
    link: raw.link,
  };
}

export async function coletar(browser, log = console.log) {
  const ctx = await browser.newContext({ userAgent: UA, locale: 'pt-BR', viewport: { width: 1366, height: 900 } });
  const page = await ctx.newPage();
  const vistos = new Map();

  for (let p = 1; p <= MAX_PAGINAS; p++) {
    try {
      await page.goto(`${BASE}/${p}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForSelector('article.c49-property-card', { timeout: 15000 });
    } catch { break; }
    await page.waitForTimeout(500);
    const raws = await page.evaluate(extrairCards);
    let novos = 0;
    for (const r of raws) if (!vistos.has(r.link)) { vistos.set(r.link, normalizar(r)); novos++; }
    log(`  [WE Corretora] pág ${p}: ${raws.length} venda (${novos} novos) — total ${vistos.size}`);
    if (novos === 0) break; // páginas se repetem; para quando não há nada novo
    await page.waitForTimeout(600 + Math.random() * 500);
  }

  await ctx.close();
  const lista = [...vistos.values()];
  log(`  [WE Corretora] coletados: ${lista.length} (${lista.filter((i) => i.preco != null).length} com preço)`);
  return lista;
}
