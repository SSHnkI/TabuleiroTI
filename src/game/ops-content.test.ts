import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  SUPORTE_CASES, SEGURANCA_CASES, distanciaKm, relogio, SEDE,
} from './ops-content.ts'

test('a fila de suporte sempre tem mais de um nivel de urgencia', () => {
  // Uma fila toda do mesmo nivel nao tem ordem para descobrir.
  for (const c of SUPORTE_CASES) {
    const niveis = new Set(c.incidentes.map(i => i.urgencia))
    assert.ok(niveis.size >= 2, c.label + ': todos os chamados na mesma urgencia')
  }
})

test('todo chamado explica por que tem aquela urgencia', () => {
  for (const c of SUPORTE_CASES) {
    for (const i of c.incidentes) {
      assert.ok(i.why.length > 20, c.label + ': ' + i.texto + ' sem justificativa')
    }
  }
})

test('todo caso de seguranca tem invasor, e ele nao e o unico acesso', () => {
  for (const c of SEGURANCA_CASES) {
    const inv = c.acessos.filter(a => a.invasor)
    assert.ok(inv.length >= 1, c.label + ': sem invasor')
    assert.ok(c.acessos.length - inv.length >= 3,
      c.label + ': poucos acessos legitimos, o invasor fica obvio demais')
    for (const a of inv) assert.ok(a.why && a.why.length > 30, c.label + ': invasor sem explicacao')
  }
})

test('a viagem impossivel e mesmo impossivel', () => {
  // A pista so funciona se o par realmente nao couber no tempo. Um teste
  // aqui evita inventar um caso "suspeito" que na verdade e viavel de aviao.
  for (const c of SEGURANCA_CASES) {
    for (const inv of c.acessos.filter(a => a.invasor)) {
      const mesmoUsuario = c.acessos.filter(a => a.usuario === inv.usuario && a.id !== inv.id)
      if (mesmoUsuario.length === 0) continue  // caso do ADMIN de madrugada
      const par = mesmoUsuario.reduce((m, a) =>
        Math.abs(a.hora - inv.hora) < Math.abs(m.hora - inv.hora) ? a : m)
      const km = distanciaKm(inv, par)
      const horas = Math.abs(inv.hora - par.hora) / 60
      const kmh = km / Math.max(horas, 0.01)
      assert.ok(kmh > 1000,
        c.label + ': ' + inv.usuario + ' precisaria de ' + Math.round(kmh)
          + ' km/h, o que um aviao faz. Nao serve como pista.')
    }
  }
})

test('o relogio formata como a fabrica le', () => {
  assert.equal(relogio(0), '00:00')
  assert.equal(relogio(9 * 60 + 6), '09:06')
  assert.equal(relogio(23 * 60 + 59), '23:59')
})

test('a distancia bate com a realidade', () => {
  // Joinville a Kiev tem cerca de 11 mil km. Se esta conta quebrar, a
  // explicacao mostrada ao jogador passa a mentir.
  const km = distanciaKm(SEDE, { lat: 50.4, lon: 30.5 })
  assert.ok(km > 10000 && km < 12500, 'deu ' + km + ' km')
  assert.equal(distanciaKm(SEDE, SEDE), 0)
})
