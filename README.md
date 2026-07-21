# Imóveis Itumbiara

Dashboard que junta os imóveis à venda de Itumbiara-GO num só lugar, com filtro por valor, quartos, banheiros, vagas, área, tipo e bairro. Fonte: Wimoveis (que já agrega a maioria das imobiliárias da cidade).

## Site público

**https://anavrodovalho.github.io/imoveis-itumbiara/** — qualquer pessoa acessa por esse link.

## Usar localmente

Dê **duplo clique em `index.html`**. Abre no navegador, sem precisar de servidor. Cada card leva ao anúncio original.

## Atualizar os imóveis na hora

```bash
cd ~/Desktop/imoveis-itumbiara
npm run scrape
```

Leva ~1 min. Regrava `data/imoveis.json` e `data/imoveis.js`. Recarregue o `index.html`.

## Atualização automática

Já está agendada: roda todo dia às **08:07** sozinho (agente `launchd` do macOS). Só precisa do Mac ligado no horário. Log em `atualizar.log`.

Desligar:
```bash
launchctl unload ~/Library/LaunchAgents/com.henrique.imoveis-itumbiara.plist
```
Religar: troque `unload` por `load`. Mudar o horário: edite `Hour`/`Minute` no `.plist` e recarregue.

## Limitações

- **Suíte**: o card de listagem do Wimoveis mostra quartos e banheiros, mas não separa "suíte". Dá pra usar banheiros como aproximação (2+ banheiros ≈ tem suíte). Se quiser suíte de verdade, é preciso abrir cada anúncio — mais lento; pode ser adicionado depois.
- **Fonte única**: hoje só Wimoveis. Ele já reúne a maioria das imobiliárias locais (Beira Rio, Viga, Citti etc.) e mostra preço real. VivaReal/ZAP também dá pra somar, mas exige o mesmo tipo de coletor.
- Imobiliárias locais (Viga, Citti) foram descartadas como fonte porque escondem 100% dos preços ("Consulte o Valor"), o que inviabiliza filtrar por valor.

## Estrutura

- `scraper.js` — coletor (Playwright)
- `index.html` — dashboard (roda offline)
- `data/imoveis.json` / `data/imoveis.js` — dados coletados
- `atualizar.sh` + `.plist` — automação diária
