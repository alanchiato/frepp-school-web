import { createServer } from 'node:http'
import { once } from 'node:events'
import { afterEach, beforeEach, expect, it } from 'vitest'
import { createBffClient } from '../src/shared/api/client'
import { ApiError, errorMessage } from '../src/shared/api/errors'
import { session } from './support/fixtures'

let status: number
let body: string
let calls: number
let base: string
let mode: 'normal' | 'headers-only'
const server = createServer((_req, res) => {
  calls++
  res.writeHead(status, { 'Content-Type': 'application/json' })
  if (mode === 'headers-only') { res.flushHeaders(); return }
  res.end(status === 204 ? undefined : body)
})
beforeEach(async () => {
  calls = 0; status = 200; body = JSON.stringify(session); mode = 'normal'
  server.listen(0, '127.0.0.1'); await once(server, 'listening')
  const address = server.address(); if (!address || typeof address === 'string') throw new Error('HTTP fixture missing')
  base = `http://127.0.0.1:${address.port}`
})
afterEach(async () => { server.closeAllConnections(); await new Promise<void>((resolve) => server.close(() => resolve())) })
it('accepts body-less logout 204 without JSON parsing', async () => {
  status = 204
  await expect(createBffClient(base).logout(new AbortController().signal)).resolves.toBeUndefined()
  expect(calls).toBe(1)
})
it('does not report logout success on a malformed success status', async () => {
  await expect(createBffClient(base).logout(new AbortController().signal)).rejects.toMatchObject({ code: 'invalid_response' })
})
it.each([401, 403, 500, 502, 504])('preserves status %s with unsafe or malformed error bodies', async (code) => {
  status = code; body = '<html>Untrusted internal error</html>'
  await expect(createBffClient(base).session(new AbortController().signal)).rejects.toMatchObject({ status: code, code: 'request_failed' })
  expect(calls).toBe(1)
})
it('rejects malformed success instead of manufacturing session data', async () => {
  body = 'not json'
  await expect(createBffClient(base).session(new AbortController().signal)).rejects.toBeInstanceOf(ApiError)
})
it('cancels response body reading with AbortSignal', async () => {
  mode = 'headers-only'
  const controller = new AbortController()
  const promise = createBffClient(base).session(controller.signal)
  const rejected = expect(promise).rejects.toMatchObject({ name: 'AbortError' })
  await once(server, 'request'); controller.abort(); await rejected
  expect(calls).toBe(1)
})
it('does not send a request with an already aborted signal', async () => {
  await expect(createBffClient(base).session(AbortSignal.abort())).rejects.toMatchObject({ name: 'AbortError' })
  expect(calls).toBe(0)
})
it('handles a real network refusal with a safe user message', async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()))
  try { await createBffClient(base).session(new AbortController().signal); throw new Error('Expected refusal') }
  catch (error) { expect(error).toBeInstanceOf(TypeError); expect(errorMessage(error)).toContain('Não foi possível conectar'); expect(errorMessage(error)).not.toContain(base) }
})
