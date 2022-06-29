export type HTTPVerb = 'GET' | 'POST' | 'PUT' | 'DELETE'
export type HTTPCall<V extends HTTPVerb> = {
  verb: V
  ressource: string
}
