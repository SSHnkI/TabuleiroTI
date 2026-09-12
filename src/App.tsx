import { useEffect, useReducer, useRef, useState } from 'react'
import ClickSpark from './components/ClickSpark'
import { reducer, initialState } from './game/state.ts'
import { loadRuns, subscribe } from './game/storage.ts'
import { startPerfMonitor, subscribePerf, type PerfState } from './visual/perf.ts'
import { Core } from './visual/Core.tsx'
import type { Intensity } from './visual/intensity.ts'
import type { Run } from './game/scoring.ts'
import { Attract } from './screens/Attract.tsx'
import { ModeSelect } from './screens/ModeSelect.tsx'
import { TouchKeyboard } from './screens/TouchKeyboard.tsx'
import { isRepeat, rankRuns, INDIVIDUAL_MODES, type GameMode } from './game/scoring.ts'
import { Result, teamNameOf, positionOf } from './screens/Result.tsx'
import { Ranking } from './screens/Ranking.tsx'
import { saveRun } from './game/storage.ts'
import { Admin } from './screens/Admin.tsx'
import { TvBoard } from './screens/TvBoard.tsx'
import { Duelo } from './screens/Duelo.tsx'
import { Briefing } from './screens/Briefing.tsx'
import { saveDuel } from './game/storage.ts'
import { loadMuted, setMuted, unlockAudio, sStart, sFinish } from './game/sound.ts'
import { Play } from './screens/Play.tsx'
import { FxProvider } from './visual/Fx.tsx'

/** Segundos parado antes de a tela voltar sozinha para o modo atracao.
 *  Garante que ninguem deixe o quiosque preso numa tela morta. */
const IDLE_SECONDS = 20

/** ?tv=1 transforma a mesma build no painel da segunda tela. Uma build so,
 *  dois papeis: se a TV nao aparecer no dia, nada muda. */
const IS_TV = new URLSearchParams(location.search).has('tv')

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState)
  const [runs, setRuns] = useState<Run[]>(() => loadRuns())
  const [perf, setPerf] = useState<PerfState>({ fps: 60, tier: 'full', forced: false })
  const [count, setCount] = useState(1)
  /** Timestamp da partida gravada, usado para destacar a linha no ranking. */
  const [lastAt, setLastAt] = useState<number | null>(null)
  const savedFor = useRef<number | null>(null)
  const [muted, setMutedState] = useState(() => loadMuted())
  /** Batidas no canto secreto que abre o painel do operador. */
  const knocks = useRef<number[]>([])
  const idleRef = useRef(Date.now())

  useEffect(() => startPerfMonitor(), [])

  // O navegador so libera audio apos um gesto. Destravar no primeiro toque
  // da sessao evita o primeiro efeito sonoro sair mudo. Tecla tambem conta:
  // quem chega pelo teclado jogava a partida inteira no mudo.
  useEffect(() => {
    const once = () => {
      unlockAudio()
      window.removeEventListener('pointerdown', once)
      window.removeEventListener('keydown', once)
    }
    window.addEventListener('pointerdown', once)
    window.addEventListener('keydown', once)
    return () => {
      window.removeEventListener('pointerdown', once)
      window.removeEventListener('keydown', once)
    }
  }, [])
  useEffect(() => subscribePerf(setPerf), [])
  useEffect(() => subscribe(setRuns), [])

  // Grava a partida ao chegar no resultado, uma unica vez. O guarda e o
  // instante de inicio da partida: sem ele, qualquer re-render da tela de
  // resultado gravaria a mesma pontuacao de novo e sujaria o ranking.
  useEffect(() => {
    if (state.screen !== 'result' || state.mode === 'duelo') return
    if (savedFor.current === state.startedAt) return
    savedFor.current = state.startedAt
    sFinish()
    const at = Date.now()
    setLastAt(at)
    setRuns(saveRun({
      name: teamNameOf(state.players),
      mode: state.mode,
      score: state.score,
      secondsLeft: state.results.reduce((sum, r) => sum + Math.max(0, r.secondsLeft), 0),
      at,
      ranked: !state.training,
    }))
  }, [state.screen, state.startedAt])

  // Relogio do mini-game.
  useEffect(() => {
    if (state.screen !== 'playing' || state.paused) return
    const id = setInterval(() => dispatch({ type: 'tick' }), 1000)
    return () => clearInterval(id)
  }, [state.screen, state.paused])

  // Volta sozinho para a atracao. Nunca durante uma partida: ninguem perde
  // o jogo por estar pensando.
  useEffect(() => {
    const touch = () => { idleRef.current = Date.now() }
    for (const ev of ['pointerdown', 'keydown']) window.addEventListener(ev, touch)
    const id = setInterval(() => {
      const idle = (Date.now() - idleRef.current) / 1000
      if (idle > IDLE_SECONDS && state.screen !== 'attract' && state.screen !== 'playing') {
        dispatch({ type: 'abort' })
      }
    }, 1000)
    return () => {
      for (const ev of ['pointerdown', 'keydown']) window.removeEventListener(ev, touch)
      clearInterval(id)
    }
  }, [state.screen])

  // Nivel de intensidade do momento. E o que decide o orcamento de GPU:
  // durante um mini-game nada novo pode entrar em cena, porque o dedo
  // precisa de resposta em menos de 100ms.
  // Um desafio que ja e 3D dispensa o nucleo atras: dois contextos WebGL na
  // mesma tela custam o dobro pelo mesmo resultado.
  const em3D = state.screen === 'playing' && ['rack', 'wifi', 'rede', 'suporte', 'seguranca'].includes(state.round[state.index]?.id ?? '')

  const intensity: Intensity =
    state.screen === 'playing' ? 'interacao'
    : state.screen === 'result' ? 'cinematico'
    : 'idle'

  if (IS_TV) {
    return (
      <main className="relative h-full w-full overflow-hidden">
        <Core tier={perf.tier} intensity="idle" energy={0.3} center={[0.42, 0]} scale={1.15} />
        <div
          className="pointer-events-none absolute inset-0"
          style={{ zIndex: 20, background: 'radial-gradient(ellipse 120% 100% at 50% 50%, rgba(1,6,13,.35), rgba(1,6,13,.8))' }}
        />
        <div className="relative h-full w-full" style={{ zIndex: 30 }}>
          <TvBoard />
        </div>
      </main>
    )
  }

  return (
    <ClickSpark sparkColor="#7FE4FF" sparkCount={10} sparkRadius={22} sparkSize={9} duration={380}>
     <FxProvider>
      <main className="relative h-full w-full overflow-hidden">
        {/* Na atracao o nucleo mora a direita, atras do painel de ranking:
            centralizado ele atravessaria o titulo e comeria a legibilidade. */}
        {!em3D && <Core
          tier={perf.tier}
          intensity={intensity}
          energy={state.screen === 'attract' ? (state.combo > 0 ? 0.55 : 0.2) : 0.1}
          center={state.screen === 'attract' ? [0.40, -0.02] : [0, 0]}
          scale={state.screen === 'attract' ? 1.05 : 0.8}
        />}

        {/* L2 :: atmosfera.
            O nucleo e bonito, mas conteudo tocavel tem que ganhar dele sempre.
            Este veu recua o fundo nas telas de conteudo e quase some na
            atracao, onde nao ha nada para ler nem tocar. */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            zIndex: 20,
            background: state.screen === 'attract'
              ? 'radial-gradient(ellipse 130% 110% at 50% 50%, rgba(1,6,13,0), rgba(1,6,13,.40))'
              : 'radial-gradient(ellipse 120% 105% at 50% 50%, rgba(1,6,13,.42), rgba(1,6,13,.68))',
            transition: 'background var(--dur-enter) var(--ease-out)',
          }}
        />

        <div className="relative h-full w-full" style={{ zIndex: 30 }}>
        {state.screen === 'attract' && (
          <Attract runs={runs} onStart={() => dispatch({ type: 'goto', screen: 'mode' })} />
        )}
        {state.screen === 'mode' && (
          <ModeSelect
            onBack={() => dispatch({ type: 'abort' })}
            onPick={(mode, n) => { setCount(n); dispatch({ type: 'pickMode', mode, count: n }) }}
          />
        )}

        {state.screen === 'name' && (
          <TouchKeyboard
            count={count}
            onBack={() => dispatch({ type: 'goto', screen: 'mode' })}
            onDone={players => {
              // Segunda partida do mesmo nome vira treino: pontua e comemora
              // igual, mas nao entra no ranking. A regra e reavaliada na
              // leitura do ranking, entao isto aqui e so para a tela avisar.
              const training = players.some(p => isRepeat(runs, p.name, state.mode))
              dispatch({ type: 'setPlayers', players, training })
            }}
          />
        )}

        {state.screen === 'briefing' && (
          <Briefing
            mode={state.mode}
            players={state.players}
            onBack={() => dispatch({ type: 'goto', screen: 'name' })}
            onStart={() => { dispatch({ type: 'begin' }); sStart() }}
          />
        )}

        {/* Duelo tem tela propria: rodada propria, placar proprio e
            anuncio de vencedor no fim. Nao passa pelo resultado normal. */}
        {state.screen === 'playing' && state.mode === 'duelo' && (
          <Duelo
            players={state.players}
            onAbort={() => dispatch({ type: 'abort' })}
            onFinish={(winner, blocked) => {
              if (winner !== null) {
                saveDuel({
                  winner: state.players[winner].name,
                  loser: state.players[winner === 0 ? 1 : 0].name,
                  at: Date.now(),
                })
              }
              void blocked
              dispatch({ type: 'abort' })
            }}
          />
        )}

        {state.screen === 'playing' && state.mode !== 'duelo' && (
          <Play
            state={state}
            onDone={ratio => dispatch({ type: 'finishMinigame', ratio })}
            onPenalty={() => dispatch({ type: 'penalty' })}
            onPause={on => dispatch({ type: 'pause', on })}
          />
        )}

        {state.screen === 'result' && (
          <Result
            score={state.score}
            results={state.results}
            teamName={teamNameOf(state.players)}
            training={state.training}
            position={state.training ? null : positionOf(rankedFor(runs, state.mode), lastAt ?? 0)}
            total={rankedFor(runs, state.mode).length}
            onRanking={() => dispatch({ type: 'goto', screen: 'ranking' })}
            onAgain={() => dispatch({ type: 'abort' })}
          />
        )}

        {state.screen === 'ranking' && (
          <Ranking runs={runs} highlightAt={lastAt} onBack={() => dispatch({ type: 'abort' })} />
        )}

        {state.screen === 'admin' && (
          <Admin
            runs={runs}
            perf={perf}
            muted={muted}
            onMute={v => { setMuted(v); setMutedState(v) }}
            onRuns={setRuns}
            onClose={() => dispatch({ type: 'abort' })}
          />
        )}

        {/* Canto secreto do operador: cinco batidas em tres segundos.
            Um botao visivel vira brincadeira de visitante em dois minutos
            de feira, e ai o ranking do dia vira brincadeira junto. */}
        {state.screen !== 'admin' && (
          <button
            aria-label="Painel do operador"
            className="fixed left-0 top-0 h-20 w-20 opacity-0"
            style={{ zIndex: 55 }}
            onPointerDown={() => {
              const now = Date.now()
              knocks.current = [...knocks.current, now].filter(t => now - t < 3000)
              if (knocks.current.length >= 5) {
                knocks.current = []
                dispatch({ type: 'goto', screen: 'admin' })
              }
            }}
          />
        )}
        </div>

        {/* Camada ctOS: scanline, moldura de sistema e pulso de uplink.
            Tudo CSS puro, sem laco de animacao em JavaScript. */}
        <div className="ctos-scan" aria-hidden />
        <div className="ctos-frame" aria-hidden />
        <div className="ctos-uplink" aria-hidden />

        {/* Medidor de quadros. Some em producao, fica so no painel do operador. */}
        {import.meta.env.DEV && (
          <div
            className="tnum pointer-events-none fixed bottom-2 right-3 text-xs"
            style={{ color: perf.fps < 45 ? 'var(--color-signal-red)' : 'var(--color-micro)', zIndex: 90 }}
          >
            {perf.fps} fps · {perf.tier}
          </div>
        )}
      </main>
     </FxProvider>
    </ClickSpark>
  )
}


/** O ranking que a partida disputa depende do modo: uma pessoa sozinha nao
 *  compete com um quarteto. */
function rankedFor(runs: Run[], mode: GameMode) {
  return rankRuns(runs, INDIVIDUAL_MODES.includes(mode)
    ? INDIVIDUAL_MODES
    : (['revezamento', 'equipe'] as GameMode[]))
}
