import { CIDADE, UA, num, tipoDoTexto } from './comum.js';

// Helper compartilhado para imobiliárias na plataforma Kenlo (ex: Inovare, VLS).
// Listagem de venda por cidade em `${base}?pagina=N`, 12 cards por página.
// Card: a.card-with-buttons (__title=tipo, __heading="Bairro - Cidade - GO",
// __value=preço). Área/quartos/etc saem do texto e do slug do link.
const MAX_PAGINAS = 90;

function extrairCards() {
  return [...document.querySelectorAll('a.card-with-buttons')].map((c) => ({
    link: c.href.split('?')[0],
    tipo: c.querySelector('.card-with-buttons__title')?.textContent.replace(/\s+/g, ' ').trim() || '',
    heading: c.querySelector('.card-with-buttons__heading')?.textContent.replace(/\s+/g, ' ').trim() || '',
    precoTexto: c.querySelector('.card-with-buttons__value')?.textContent.replace(/\s+/g, ' ').trim() || '',
    texto: c.textContent.replace(/\s+/g, ' ').trim(),
  }));
}

function normalizar(raw, fonteNome) {
  const g = (re) => { const m = raw.texto.match(re); return m ? num(m[1]) : null; };
  const bairro = raw.heading ? raw.heading.split(' - ')[0].trim() : null;
  const slug = raw.link.split('/').slice(-2)[0] || '';
  const areaM = slug.match(/(\d[\d-]*)-m$/); // "176-m" -> 176 ; "1-440-m" -> 1440
  // preço: só valor de venda. Ignora aluguel ("R$ .../mês") e "Sob consulta".
  const preco = /m[êe]s|sob|consulte/i.test(raw.precoTexto) ? null : num(raw.precoTexto);
  return {
    fonte: fonteNome,
    tipo: tipoDoTexto(raw.tipo + ' ' + raw.link),
    preco,
    quartos: g(/(\d+)\s*Quartos?/i),
    banheiros: g(/(\d+)\s*Banheiros?/i),
    vagas: g(/(\d+)\s*Vagas?/i),
    area: areaM ? parseInt(areaM[1].replace(/-/g, ''), 10) : null,
    suites: g(/(\d+)\s*Su[íi]tes?/i),
    bairro: bairro || null,
    cidade: CIDADE,
    endereco: null,
    titulo: (raw.tipo + (bairro ? ' - ' + bairro : '')).trim() || null,
    link: raw.link,
  };
}

export async function coletarKenlo(browser, { nome, base }, log = console.log) {
  const ctx = await browser.newContext({ userAgent: UA, locale: 'pt-BR', viewport: { width: 1366, height: 900 } });
  const page = await ctx.newPage();
  const vistos = new Map();

  for (let p = 1; p <= MAX_PAGINAS; p++) {
    try {
      await page.goto(`${base}?pagina=${p}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForSelector('a.card-with-buttons', { timeout: 12000 });
    } catch { break; } // sem cards = fim das páginas
    await page.waitForTimeout(400);
    const raws = await page.evaluate(extrairCards);
    let novos = 0;
    for (const r of raws) {
      // reforça o filtro de cidade (a URL /itumbiara já filtra, mas garantimos)
      if (!/itumbiara/i.test(r.heading) && !/itumbiara/i.test(r.link)) continue;
      if (!vistos.has(r.link)) { vistos.set(r.link, normalizar(r, nome)); novos++; }
    }
    log(`  [${nome}] pág ${p}: ${raws.length} cards (${novos} novos) — total ${vistos.size}`);
    if (raws.length === 0 || novos === 0) break;
    await page.waitForTimeout(400 + Math.random() * 400);
  }

  await ctx.close();
  const lista = [...vistos.values()];
  log(`  [${nome}] coletados: ${lista.length} (${lista.filter((i) => i.preco != null).length} com preço)`);
  return lista;
}
