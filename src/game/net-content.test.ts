import { test } from 'node:test'
import assert from 'node:assert/strict'
import { NET_CASES, alcancaveis, culpados } from './net-content.ts'

test('todo caso tem exatamente uma causa raiz', () => {
  // Duas raizes deixariam o desafio ambiguo, e ambiguidade num jogo com
  // premio e briga na fila.
  for (const c of NET_CASES) {
    assert.equal(culpados(c).length, 1, c.label + ' deveria ter uma causa so')
  }
})

test('a causa e sempre alcancavel a partir da internet', () => {
  // Se a causa estivesse escura tambem, ela seria sintoma de outra coisa.
  for (const c of NET_CASES) {
    const vivos = alcancaveis(c)
    const raiz = culpados(c)[0]
    const link = c.links.find(l => !l.ok && l.to === raiz)!
    assert.ok(vivos.has(link.from), c.label + ': a causa nasce em area viva')
    assert.ok(!vivos.has(raiz), c.label + ': a causa em si fica escura')
  }
})

test('todo caso tem sintomas alem da causa', () => {
  // Sem pontos escuros a mais, o desafio vira "toque no unico apagado" e
  // perde exatamente a licao que ele existe para dar.
  for (const c of NET_CASES) {
    const vivos = alcancaveis(c)
    const escuros = c.nodes.filter(n => !vivos.has(n.id))
    assert.ok(escuros.length >= 2, c.label + ': so ' + escuros.length + ' ponto escuro, sem sintoma para confundir')
  }
})

test('todo link rompido explica a causa', () => {
  for (const c of NET_CASES) {
    for (const l of c.links.filter(x => !x.ok)) {
      assert.ok(l.causa && l.causa.length > 20, c.label + ': link rompido sem explicacao')
    }
  }
})

test('todo link liga nos que existem', () => {
  for (const c of NET_CASES) {
    const ids = new Set(c.nodes.map(n => n.id))
    for (const l of c.links) {
      assert.ok(ids.has(l.from), c.label + ': link partindo de no inexistente ' + l.from)
      assert.ok(ids.has(l.to), c.label + ': link chegando em no inexistente ' + l.to)
    }
  }
})

test('todo no esta ligado a alguma coisa', () => {
  for (const c of NET_CASES) {
    for (const n of c.nodes) {
      const ligado = c.links.some(l => l.from === n.id || l.to === n.id)
      assert.ok(ligado, c.label + ': ' + n.name + ' flutuando solto na topologia')
    }
  }
})
