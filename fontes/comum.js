export const CIDADE = 'Itumbiara';
export const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36';

export const num = (s) => {
  const m = String(s || '').replace(/\./g, '').match(/\d+/);
  return m ? parseInt(m[0], 10) : null;
};

export function tipoDoTexto(t) {
  t = (t || '').toLowerCase();
  for (const [re, tipo] of [
    [/apartamento|apto|kitnet|studio/, 'Apartamento'],
    [/casa de condom|condom/, 'Casa em condomínio'],
    [/casa|sobrado/, 'Casa'],
    [/terreno|lote|[áa]gio/, 'Terreno'],
    [/galp|armaz/, 'Galpão'],
    [/sala|comercial|loja|ponto/, 'Comercial'],
    [/fazenda|s[íi]tio|ch[áa]cara|rural|rancho/, 'Rural'],
  ]) if (re.test(t)) return tipo;
  return 'Outro';
}
