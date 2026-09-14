# MISSÃO TI :: contexto do projeto

Este arquivo existe para alguem (ou algum assistente) pegar este projeto do
zero, em outra maquina ou outra conta, e continuar sem quebrar o que ja
funciona. Leia inteiro antes de mexer: quase toda secao aqui foi escrita
depois de um erro, e desfazer qualquer uma delas reintroduz um defeito.

**Primeira coisa a fazer numa sessao nova:** ler este arquivo e o
[RESTAURAR.md](RESTAURAR.md).

---

## 1. O que e

Jogo de quiosque para o estande da area de TI numa feira interna da
**Plastireal**, fabrica de plastico em Joinville (SC). A feira tem convidados
externos e **premiacao para o melhor estande**. O objetivo declarado do dono
do projeto e ganhar esse premio.

| | |
|---|---|
| Hardware alvo | Monitor **touchscreen de 24 polegadas, 1920x1080** |
| Como roda no dia | `INICIAR-ESTANDE.bat`, em localhost, **sem internet** |
| Partida | Cerca de 2 minutos, 5 etapas |
| Modos | solo, duelo, revezamento, equipe |
| Desafios | 12 tipos, 5 deles em 3D |
| Tamanho | ~13.500 linhas de TypeScript |
| Testes | 71, todos passando |

Tambem funciona em celular (instalavel, offline) e publicado em GitHub Pages,
mas **isso e secundario**: o estande e o produto.

---

## 2. Regras que nao se negociam

Vieram do dono do projeto, e varias custaram retrabalho para descobrir.

1. **Qualquer adulto funcional sem conhecimento tecnico tem que passar.**
   Toda resposta precisa ser derivavel do que esta na tela. Nunca exigir
   saber de TI.
2. **Ao mesmo tempo, nao pode ser infantil.** A solucao nao e baixar a
   dificuldade: e tirar dica permanente da tela e so mostrar ajuda depois de
   9 a 14 segundos parado (`src/components/StuckHint.tsx`).
3. **A cor nunca decide.** Se existe um unico item vermelho e a pergunta e
   "qual esta com problema", o desafio virou combinar cor. Varios itens
   acusam problema; quem decide e ler o nome contra o que o chamado diz.
4. **O dedo ganha de qualquer efeito.** Se a latencia do toque passar de
   100ms, o efeito sai, por mais bonito que esteja.
5. **Glow e CSS, nunca postprocessing de WebGL.** E o que viabiliza 3D em
   video integrado.
6. **Roda offline.** Zero chamada externa no `dist/`. Fontes locais, som
   sintetizado em WebAudio, nenhum CDN.
7. **Rodada justa.** A curva de criticidade e FIXA (toda rodada vale
   exatamente 100 pontos); so o sorteio de qual desafio cai onde e aleatorio.
   Ha premio em jogo.
8. **Sem travessao nem meia-risca** em nada: texto, codigo, comentario,
   commit. Usar virgula, dois pontos, parenteses ou reescrever.
9. **Sem rastro de ferramenta de IA** no repositorio: nada de rodape de
   coautoria em commit, nada de arquivo de configuracao de assistente
   versionado.

---

## 3. Como rodar

```bash
npm install        # so uma vez, precisa de internet
npm test           # 71 testes, node --test com tipos nativos
npm run build      # tsc -b && vite build
npm run preview    # serve dist/ na porta 4173
npm run dev        # desenvolvimento, porta 5173
```

No dia da feira: **duplo clique em `INICIAR-ESTANDE.bat`**. Ele constroi se
precisar, sobe o servidor, espera o HTTP 200 e abre o Chrome em modo quiosque
com perfil proprio.

> **Nunca abrir em janela anonima.** O ranking do dia vive no armazenamento do
> navegador e some ao fechar uma janela anonima.

> `npm install` e `npm run build` precisam de internet e devem rodar **dias
> antes**. No dia nao se instala nada.

### Enderecos uteis

| Endereco | Para que |
|---|---|
| `?treino=1` | Abre a escolha de desafio. Nao forca rodada nenhuma |
| `?tv=1` | Mesma build vira painel de segunda tela |

---

## 4. Atalhos escondidos da tela inicial

Nao aparecem escritos na interface, de proposito: o operador precisa deles com
a fila andando, e um visitante curioso nao pode achar por acaso. Os dois
pedem **segurar 1,5 segundo**, nao tocar.

| Onde segurar | O que abre |
|---|---|
| O **TI** de MISSAO TI | Modo treino: escolhe o desafio, nao entra no placar |
| O **o** de Exp**o**plasti | Apagar o placar do dia, com confirmacao |

Mais: **cinco toques rapidos no canto superior esquerdo** abrem o painel do
operador (exportar CSV, desfazer ultima pontuacao, mudo, teste de
multi-toque, limpar ranking).

Os alvos invisiveis desses gestos tem cerca de 40px. Nao encolher: a letra
sozinha tem 11x17 pixels, que no monitor do estande e 3x5mm.

---

## 5. Arquitetura em uma pagina

```
src/
  App.tsx            roteia por estado, sem biblioteca de rota
  main.tsx           kiosk hardening + registro do service worker
  kiosk.ts           preventDefault em zoom, menu, arraste, F5
  game/
    state.ts         um useReducer so. Telas e acoes da partida
    scoring.ts       criticidade, pontos, ranking. A logica nao trivial
    challenges.ts    sorteia a rodada. rodadaDeUmTipo() para o treino
    content.ts       DADOS: ERP, senhas, fluxo, logs, chamados, rack, wifi
    net-content.ts   topologia de rede + alcancaveis() e culpados()
    ops-content.ts   suporte (chao de fabrica) e seguranca (globo)
    storage.ts       localStorage + chave espelho + BroadcastChannel + CSV
    sound.ts         WebAudio puro: ruido, filtro, impacto, combo, ambiente
  minigames/         os 12 desafios, um arquivo cada
  screens/           atracao, modos, teclado, regras, resultado, ranking,
                     painel do operador, TV, duelo, treino
  visual/
    Core.tsx         o unico canvas WebGL de fundo (OGL)
    Core2D.tsx       fallback em Canvas 2D da degradacao automatica
    perf.ts          mede frame rate e dispara a degradacao
    intensity.ts     os 4 niveis de intensidade e o orcamento de cada um
    Fx.tsx           flash, tremor, vinheta, glitch, cacos, combo
    juice.ts         congelamento de quadro, tranco e tremor de camera
    debris.ts        destrocos em voxel, instanciados (uma chamada de desenho)
    palette.glsl.ts  a paleta da marca em GLSL, fonte unica
```

### Stack

React 19, Vite 7, TypeScript, Tailwind v4.
Dependencias de runtime, deliberadamente enxutas: **motion, ogl,
canvas-confetti, lucide-react**, mais clsx e tailwind-merge.

**Sem three.js, sem GSAP, sem tsparticles, sem postprocessing.** OGL sao ~10KB
e faz tudo o que este jogo precisa.

---

## 6. Decisoes que custaram caro (nao desfazer sem ler)

### Um canvas WebGL por vez
Dois contextos na mesma tela custam o dobro pelo mesmo resultado. `App.tsx`
desliga o `<Core>` de fundo quando o desafio da vez ja e 3D.

### A economia sai do frame rate, nao da resolucao
Upscale borrado num monitor de 24 polegadas le como amador. O nucleo cai para
30fps durante a partida e mantem a densidade de pixel.

### O laco de render nunca para
`requestAnimationFrame` e re-agendado no topo da funcao, antes de qualquer
`return`. Um laco que para em aba oculta nao volta.

### Nada de contar tempo em requestAnimationFrame para decisao
O botao mais importante do app (segurar para iniciar) morreu assim: o
navegador pausa rAF e o contador nunca chegava ao fim. Hoje quem decide e
`setTimeout` e quem desenha e transicao de CSS.

### `loseContext()` e a estrategia de descarte
Nao existe `program.remove()` espalhado. A limpeza de cada cena 3D e sempre:
parar o laco, desconectar o observer, tirar os listeners, remover o canvas,
matar o contexto.

### O piso dissolve na transparencia, nao numa cor
Terminar numa cor deixava a borda do retangulo aparecendo contra o degrade da
pagina.

### Nenhuma superficie cai em preto
O fundo mais escuro que existe e `INK_800`, que ja e azul. Preto nao e cor
nenhuma da marca.

### Grade nao recorta
Um filho mais alto que a linha invade a linha de baixo e e desenhado por cima.
Foi assim que o rodape cobriu o botao de iniciar no celular deitado. Toda
faixa de desafio tem `min-height: 0` e rola por dentro.

### Treino livre nao e gravado
Nem ranking, nem CSV, nem contagem de jogadores do dia. Um estande que ensaia
a manha inteira nao pode terminar o dia com o placar mentindo.

### O atalho `?desafio=` foi removido
Ficava grudado na URL: quem abrisse o jogo uma vez com ele jogava partida
apos partida com o mesmo desafio, sem aviso nenhum, e a rodada ainda saia
curta. O Modo Treino faz a mesma coisa, visivel e valendo para uma partida so.

---

## 7. Armadilhas ja pagas

Lista curta do que parece melhoria e nao e:

- **Nao trocar `Math.min(1, dt * k)` por interpolacao fixa.** A suavizacao
  precisa ser independente de frame rate.
- **Nao usar `inline-block` para aumentar area de toque em texto.** Cria ponto
  de quebra de linha: o nome da empresa quebrou como EXPO / PLASTI.
- **Nao deixar `NumberTicker` com `startOnView` no padrao.** Ele anima uma vez
  e congela. Sempre `startOnView={false}`.
- **Nao esquecer `min-w-0`** em filho de grade ou flex: o padrao e
  `min-width: auto` e um botao largo empurra a tela inteira para fora.
- **Nao reaplicar `renderer.setSize` sem devolver `style.width/height` para
  100%.** OGL escreve pixels no style dentro do setSize.
- **Nao criar `BroadcastChannel` em escopo de modulo** sem guardar por
  `typeof window`: trava o `node --test`.
- **Nao usar a normal de camera para decidir face de peca em shader.** Usar a
  normal de objeto (`vObjN`), senao o LED migra de face quando gira.

---

## 8. Verificacao antes de subir

```bash
npm test && npm run build
grep -rlE "fonts\.googleapis|fonts\.gstatic|cdn\.|unpkg|jsdelivr" dist/
```

O `grep` **tem que voltar vazio**: qualquer chamada externa quebra o estande
offline.

### No hardware real, obrigatorio e nunca feito ate agora

| Medida | Limite |
|---|---|
| Toque ate a faisca | menos de 100ms |
| Frame rate no Firewall | acima de 50fps sustentado |
| Teste de multi-toque | decide o destino do modo duelo |
| Fechar e reabrir o Chrome | o ranking continua la |
| Som com 40 pessoas conversando | audivel |

> **O som nunca foi ouvido por ninguem.** Todo o kit (`sound.ts`) foi escrito
> por sintese conhecida, sem conferencia auditiva. E o maior risco aberto.

---

## 9. Publicacao

Repositorio: `https://github.com/SSHnkI/TabuleiroTI`
Site: `https://sshnki.github.io/TabuleiroTI/`

O fluxo `.github/workflows/pages.yml` publica a cada push na `main`, pelos
**dois** caminhos que o GitHub oferece (branch `gh-pages` e artefato de
Pages), de proposito: com a chave na opcao errada o site servia a raiz do
repositorio, que tem o `index.html` de desenvolvimento, e a tela ficava preta.

Os testes sao o portao: **teste quebrado nao sobe site**.

Cada etapa grande vira uma marca. Ver `git tag -l -n9` e o
[RESTAURAR.md](RESTAURAR.md).

---

## 10. O que falta

- Medir tudo da secao 8 no monitor de verdade, com o dedo e com som
- Decidir o destino do modo duelo apos o teste de multi-toque
- Ensaio geral com 4 pessoas em fila, cronometrando a rotatividade
- Premios e a Parede de Campeoes (ver o plano de premiacao, fora do codigo)

---

## 11. Como conversar sobre este projeto

O dono e direto e valoriza diagnostico antes de conserto. O que funciona:

- **Medir antes de afirmar.** Varias vezes o defeito nao era onde parecia.
- **Dizer o que nao foi verificado.** Som nunca foi ouvido; varias medicoes
  aqui foram feitas em navegador embutido, que pausa animacao e bloqueia
  service worker.
- **Nao inventar trabalho.** Quando sete dos doze desafios ja estavam bons,
  o certo foi dizer isso, nao entregar sete commits que nao mudam nada.
