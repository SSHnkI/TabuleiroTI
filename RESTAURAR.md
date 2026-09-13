# PLASTIREAL PONTO ZERO

Este arquivo existe para uma coisa só: **devolver o projeto a um estado que funcionava**,
sem depender de memória, de conversa antiga ou de quem estava presente.

Se voce (ou um agente) leu isto porque alguem escreveu **`PLASTIREAL PONTO ZERO`**,
a resposta esta na secao "Como voltar", logo abaixo.

---

## Como voltar

Abra o terminal nesta pasta (`C:\Users\Victor\Desktop\Expoplasti`) e rode:

```bash
git stash push -u -m "antes-de-voltar" && git checkout ponto-zero
```

O `git stash` guarda o trabalho atual numa gaveta antes de voltar, entao **nada se perde**.
Se depois voce quiser o trabalho de volta: `git stash pop`.

Para conferir que voltou certo:

```bash
npm test && npm run build
```

Tem que dar **55 testes passando** e um build sem erro.

---

## O que e o `ponto-zero`

O estado do estande em **12 de setembro de 2026**, com tudo isto ja funcionando:

| Peca | Estado |
|---|---|
| Desafios | 12 tipos, 5 deles em 3D (rack, wifi, rede, suporte, seguranca) |
| Rodadas distintas | 10.800 |
| Modos | solo, duelo, revezamento, equipe |
| Visual | paleta da Plastireal, fontes locais, ambientes 3D sem preto |
| Operacao | painel do operador, modo TV (`?tv=1`), atalho `?desafio=<tipo>` |
| Testes | 55 passando |
| Build | roda offline, zero chamada externa |

---

## Todas as marcas

Cada etapa grande vira uma marca (tag). Para listar o que existe:

```bash
git tag -l -n9
```

Para voltar a qualquer uma delas, troque `ponto-zero` pelo nome da marca no comando de cima.

| Marca | O que e |
|---|---|
| `ponto-zero` | O estado descrito acima. O chao seguro. |
| `fase2-som-e-impacto` | Som de arcade (ruido, impacto, explosao, combo, ambiente), congelamento de quadro, tranco de camera, tremor e destrocos em voxel nas 5 cenas 3D. 66 testes. |
| `fase2-impacto-em-todos` | O mesmo impacto nos 12 desafios: estilhaco no ponto do dedo, onda de choque, selo de sequencia e leito de som tambem nos 7 que vivem no DOM. |
| `fase2-pwa-e-celular` | Instalavel no celular (manifest, icones, service worker) e layout que empilha abaixo de 1024px. O estande em 1920x1080 nao muda em nada. |

---

## Voltando so um arquivo

As vezes nao se quer desfazer tudo, so um arquivo que quebrou:

```bash
git checkout ponto-zero -- src/minigames/Rack.tsx
```

---

## Voltando para a ponta

Depois de olhar um estado antigo, para voltar ao trabalho mais recente:

```bash
git checkout main
```

---

## Copia online (GitHub Pages)

Existe um fluxo em `.github/workflows/pages.yml` que publica o jogo a cada push
na `main`. Ele roda os testes primeiro: **teste quebrado nao sobe site**.

O estande de verdade **nao depende disso**. No dia da feira roda o
`INICIAR-ESTANDE.bat`, em localhost, sem internet. O Pages e para ver de
qualquer lugar e para ter uma copia viva fora desta maquina.

Duas coisas para saber:

- O ranking do Pages e **separado** do ranking do estande. Cada endereco tem o
  proprio armazenamento no navegador, e `localhost` nao e `github.io`.
- O repositorio precisa ser **publico** para o Pages funcionar em conta gratuita.
  Em conta paga (Pro ou Team) funciona com repositorio privado.

## Se o git nao existir mais

Se alguem apagou a pasta `.git`, o historico se foi e este arquivo nao salva ninguem.
Nesse caso o que resta e a pasta `dist/`, que e o jogo ja construido e roda com
`INICIAR-ESTANDE.bat` mesmo sem o codigo-fonte.

**Nao apague `dist/` e nao apague `.git/`.**
