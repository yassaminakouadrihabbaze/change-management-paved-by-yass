import { describe, expect, it } from 'vitest'
import { cn } from './utils'

describe('cn()', () => {
  it('F-001 AC-4: joins multiple class names', () => {
    expect(cn('px-2', 'py-1')).toBe('px-2 py-1')
  })

  it('F-001 AC-4: resolves conflicting Tailwind utilities so the last one wins', () => {
    // This is the behaviour plain string concatenation cannot provide, and the
    // reason tailwind-merge is a dependency rather than a template literal.
    expect(cn('px-2', 'px-4')).toBe('px-4')
    expect(cn('text-sm text-muted-foreground', 'text-lg')).toBe('text-muted-foreground text-lg')
  })

  it('F-001 AC-4: applies conditional classes and drops falsy values', () => {
    expect(cn('base', true && 'on', false && 'off', undefined, null)).toBe('base on')
  })

  it('F-001 AC-4: accepts arrays and objects', () => {
    expect(cn(['flex', 'gap-2'], { 'p-4': true, 'p-8': false })).toBe('flex gap-2 p-4')
  })

  it('F-001 AC-4: treats display utilities as conflicting', () => {
    // `flex` and `block` are both `display`, so the later one wins rather than
    // both surviving. Worth pinning: it is the behaviour most likely to surprise
    // someone composing conditional classes.
    expect(cn('flex', 'block')).toBe('block')
  })

  it('F-001 AC-4: returns an empty string when given nothing', () => {
    expect(cn()).toBe('')
  })
})
