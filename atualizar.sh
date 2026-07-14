#!/bin/bash
# Roda o coletor e registra log. Usado pelo agendamento diário (launchd).
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"
cd "$(dirname "$0")" || exit 1
echo "===== $(date '+%Y-%m-%d %H:%M:%S') =====" >> atualizar.log
node scraper.js >> atualizar.log 2>&1
# publica os dados novos no site (GitHub Pages)
git add data/imoveis.json data/imoveis.js >> atualizar.log 2>&1
if ! git diff --staged --quiet; then
  git commit -m "Atualiza imóveis ($(date '+%Y-%m-%d'))" >> atualizar.log 2>&1
  git push >> atualizar.log 2>&1 && echo "publicado no site" >> atualizar.log
fi
echo "" >> atualizar.log
