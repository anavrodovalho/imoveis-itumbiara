# Configuração no computador da Ana Laura (Windows)

Objetivo: fazer este computador coletar os imóveis e atualizar o site sozinho todo dia.
Por que aqui: a internet residencial passa pelo bloqueio dos portais (o Wimoveis bloqueia servidores de nuvem, mas não computadores comuns).

## Como configurar (fácil)

Abra o Claude Code neste computador e **cole o prompt abaixo**. Ele faz tudo sozinho:

---

```
Preciso configurar um coletor de imóveis pra rodar automaticamente todo dia
neste computador Windows e publicar num site no GitHub. Faça tudo isto, e me
avise se precisar de alguma decisão minha:

1. Verifique se o Node.js está instalado (node -v). Se não estiver, instale
   com: winget install OpenJS.NodeJS.LTS

2. Verifique se o git está conectado ao GitHub (gh auth status). Se não
   estiver, me ajude a fazer login (gh auth login).

3. Clone o repositório anavrodovalho/imoveis-itumbiara numa pasta minha
   (ex: Documentos\imoveis-itumbiara). Se a pasta já existir, use ela e rode
   git pull.

4. Dentro da pasta do projeto, rode:  npm ci
   e depois:  npx playwright install chromium

5. Teste rodando uma vez:  node atualizar.mjs
   Deve coletar ~500 imóveis e dar push. Confirme que o push funcionou sem
   erro de permissão. Se der erro de permissão, me avise.

6. Crie uma Tarefa Agendada do Windows (use PowerShell Register-ScheduledTask)
   que rode "node atualizar.mjs" na pasta do projeto TODO DIA às 12h.
   IMPORTANTE: ative a opção StartWhenAvailable (executar assim que possível
   se o computador estava desligado no horário), porque o PC nem sempre está
   ligado ao meio-dia.

7. Me mostre a tarefa criada e confirme que está tudo funcionando.

O resultado esperado: o site https://anavrodovalho.github.io/imoveis-itumbiara/
passa a atualizar sozinho todo dia a partir deste computador.
```

---

## Depois de configurado

- O site atualiza sozinho todo dia (quando o computador estiver ligado; se estava desligado, roda assim que ligar).
- Pra atualizar na hora, sem esperar: abrir a pasta do projeto e rodar `node atualizar.mjs` (ou pedir isso pro Claude Code).
- Pra ver o site: https://anavrodovalho.github.io/imoveis-itumbiara/
