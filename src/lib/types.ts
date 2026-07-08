export type TokenRole = 'subj' | 'verb' | 'prefix' | 'aux' | 'art' | 'obj' | 'other'

export type Token = [text: string, role: TokenRole]

export interface Variant {
  de: Token[]
  ru: string
}

export interface Dimension {
  id: string
  label: string
  values: string[]
}

export interface Template {
  id: string
  label: string
  dimensions: Dimension[]
  variants: Record<string, Variant>
}
