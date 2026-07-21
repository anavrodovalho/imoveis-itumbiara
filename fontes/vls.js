import { coletarKenlo } from './kenlo.js';

// Imobiliária local (vlsseguroseimoveis.com.br) — plataforma Kenlo.
export const NOME = 'VLS';
export const ESPERADO = 150;

const BASE = 'https://www.vlsseguroseimoveis.com.br/imoveis/a-venda/itumbiara';

export const coletar = (browser, log) => coletarKenlo(browser, { nome: NOME, base: BASE }, log);
