import { CIDADE, UA, num, tipoDoTexto } from './comum.js';

export const NOME = 'Beira Rio';
export const ESPERADO = 60;

// Imobiliária local (beirarioimoveis.com.br). Site dinâmico (renderiza via JS).
// A imobiliária anuncia em várias cidades; o segmento de cidade na URL precisa
// ser "itumbiara" (o "itumbiara-go" é ignorado e volta o Brasil inteiro).
// Reforçamos filtrando pelos links que contêm "itumbiara".
const BASE = 'https://www.beirarioimoveis.com.br/venda/imoveis/itumbiara/todos-os-bairros/0-quartos/0-suite-ou-mais/0-vaga/0-banheiro-ou-mais/todos-os-condominios?valorminimo=0&valormaximo=0&pagina=';
const MAX_PAGINAS = 40;

function extrairCards() {
  const out = [];
  for (const c of document.querySelectorAll('.property')) {
    const link = (c.querySelector('a[href*="/imovel/"]')?.getAttribute('href') || '').split('?')[0];
    if (!link || !/itumbiara/i.test(link)) continue;
    out.push({
      link,
      precoTexto: c.querySelector('.property-price')?.textContent.replace(/\s+/g, ' ').trim() || '',
      title: c.querySelector('.title')?.textContent.replace(/\s+/g, ' ').trim() || '',
      facilities: [...c.querySelectorAll('.facilities-list li span')].map((s) => s.textContent.replace(/\s+/g, ' ').trim()),
    });
  }
  return out;
}

function normalizar(raw) {
  const facil = (re) => { const f = raw.facilities.find((x) => re.test(x)); return f ? num(f) : null; };
  const slug = raw.link.split('/').slice(-2)[0] || ''; // .../imovel/<slug>/<id>
  // título: "Tipo | Bairro - Itumbiara"
  const bairro = raw.title.includes('|') ? raw.title.split('|')[1].split(' - ')[0].trim() : null;
  return {
    fonte: 'Beira Rio',
    tipo: tipoDoTexto(raw.title + ' ' + raw.link),
    preco: /consulte|sob/i.test(raw.precoTexto) ? null : num(raw.precoTexto),
    quartos: facil(/quarto/i),
    banheiros: null,
    vagas: facil(/vaga/i),
    area: facil(/m²/),
    suites: num((slug.match(/(\d+)-su[ií]tes?/i) || [])[1]),
    bairro: bairro || null,
    cidade: CIDADE,
    endereco: null,
    titulo: raw.title || null,
    link: raw.link,
  };
}

export async function coletar(browser, log = console.log) {
  const ctx = await browser.newContext({ userAgent: UA, locale: 'pt-BR', viewport: { width: 1366, height: 900 } });
  const page = await ctx.newPage();
  const vistos = new Map();

  for (let p = 1; p <= MAX_PAGINAS; p++) {
    let raws = [];
    for (let tentativa = 0; tentativa < 2; tentativa++) {
      try {
        await page.goto(BASE + p, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForSelector('.property', { timeout: 12000 });
      } catch { /* pode ser página vazia (fim) ou fluke do SPA */ }
      await page.waitForTimeout(500);
      raws = await page.evaluate(extrairCards);
      if (raws.length) break; // conseguiu; senão tenta de novo
    }
    let novos = 0;
    for (const r of raws) if (!vistos.has(r.link)) { vistos.set(r.link, normalizar(r)); novos++; }
    log(`  [Beira Rio] pág ${p}: ${raws.length} cards (${novos} novos) — total ${vistos.size}`);
    if (raws.length === 0) {
      if (vistos.size > 0) break;   // já coletamos tudo; chegou ao fim
      if (p >= 3) break;            // início vazio persistente: desiste
      continue;                     // fluke de renderização; tenta a próxima página
    }
    if (novos === 0) break;         // páginas repetindo; para
    await page.waitForTimeout(500 + Math.random() * 400);
  }

  await ctx.close();
  const lista = [...vistos.values()];
  log(`  [Beira Rio] coletados: ${lista.length} (${lista.filter((i) => i.preco != null).length} com preço)`);
  return lista;
}
