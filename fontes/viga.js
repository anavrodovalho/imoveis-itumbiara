import { CIDADE, UA, num, tipoDoTexto } from './comum.js';

export const NOME = 'Viga';
export const ESPERADO = 40;

// A Viga (plataforma APRE) só revela preço ao navegar por faixa de valor.
// Varremos faixas cobrindo 0 → 50M; cada card revela "Valor de Venda R$ X".
const FAIXAS = [
  [0, 150000], [150000, 250000], [250000, 350000], [350000, 500000],
  [500000, 700000], [700000, 1000000], [1000000, 1500000],
  [1500000, 2500000], [2500000, 50000000],
];

function extrairCards() {
  const cards = document.querySelectorAll('.LI_ImovelInner, [class*="LI_Imovel"]');
  const out = [];
  for (const c of cards) {
    const a = c.querySelector('a[href*="vigaimoveis.com.br/"]:not([href*="whatsapp"]):not([href*="/imoveis"])');
    const link = a ? a.href.split('?')[0].split('#')[0] : null;
    if (!link || !/itumbiara/i.test(link)) continue;
    const valTxt = (c.querySelector('.ImovelValor')?.textContent || '').replace(/\s+/g, ' ');
    const preco = /consulte|sob/i.test(valTxt) ? null : (valTxt.match(/R\$\s?[\d.]{4,}/) || [null])[0];
    const local = c.querySelector('[class*="Bairro"], [class*="Local"], [class*="Endereco"]')?.textContent.replace(/\s+/g, ' ').trim() || null;
    out.push({ link, precoTexto: preco, local });
  }
  return out;
}

// pega o slug real do imóvel (ignora um sufixo /go, /uf de 2 letras no fim)
function slugDoLink(link) {
  const partes = link.replace(/\/[a-z]{2}$/i, '').split('/');
  return partes[partes.length - 1];
}

function bairroDoSlug(link) {
  const slug = slugDoLink(link).replace(/-[a-z0-9]{2,4}(-\d+)?$/i, '');
  const m = slug.match(/(?:quartos?|dormit[óo]rios?|su[ií]tes?|m)-(.+?)-itumbiara/i)
    || slug.match(/(?:terreno|lote|sala|galp[ãa]o|[áa]gio(?:-de-\w+)?)-(.+?)-itumbiara/i);
  if (!m) return null;
  return m[1].split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function normalizar(raw) {
  const slug = slugDoLink(raw.link);
  const quartos = num((slug.match(/(\d+)-(?:quartos?|dormit|su[ií]tes?)/i) || [])[1]);
  const bairro = raw.local ? raw.local.split(',')[0].trim() : bairroDoSlug(raw.link);
  return {
    fonte: 'Viga',
    tipo: tipoDoTexto(slug),
    preco: raw.precoTexto ? num(raw.precoTexto) : null,
    quartos,
    banheiros: null,
    vagas: null,
    area: null,
    suites: null,
    bairro: bairro || null,
    cidade: CIDADE,
    endereco: null,
    titulo: slug.replace(/-/g, ' '),
    link: raw.link,
  };
}

export async function coletar(browser, log = console.log) {
  const ctx = await browser.newContext({ userAgent: UA, locale: 'pt-BR', viewport: { width: 1366, height: 900 } });
  const page = await ctx.newPage();
  const vistos = new Map();

  for (const [min, max] of FAIXAS) {
    const url = `https://vigaimoveis.com.br/imoveis/venda/valor-${min}-${max}`;
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForTimeout(2200);
    } catch { continue; }
    const raws = await page.evaluate(extrairCards);
    let novos = 0;
    for (const r of raws) {
      const prev = vistos.get(r.link);
      const norm = normalizar(r);
      // mantém a entrada com preço, se aparecer em mais de uma faixa
      if (!prev) { vistos.set(r.link, norm); novos++; }
      else if (prev.preco == null && norm.preco != null) vistos.set(r.link, norm);
    }
    log(`  [Viga] faixa ${min}-${max}: ${raws.length} cards (${novos} novos) — total ${vistos.size}`);
    await page.waitForTimeout(600 + Math.random() * 500);
  }

  await ctx.close();
  const lista = [...vistos.values()];
  log(`  [Viga] coletados: ${lista.length} (${lista.filter((i) => i.preco != null).length} com preço)`);
  return lista;
}
