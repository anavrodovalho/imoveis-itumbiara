import { coletarKenlo } from './kenlo.js';

// Imobiliária local (souinovareimoveis.com.br) — plataforma Kenlo.
export const NOME = 'Inovare';
export const ESPERADO = 200;

const BASE = 'https://www.souinovareimoveis.com.br/imoveis/a-venda/itumbiara';

export const coletar = (browser, log) => coletarKenlo(browser, { nome: NOME, base: BASE }, log);
