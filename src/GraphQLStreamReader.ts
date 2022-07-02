import type { GraphQLPayload, GraphQLResponse } from '@/types'

import { ReadableStream } from 'web-streams-polyfill/ponyfill/es6'

type MultiPartStreamReaderEvent = 'data' | 'chunk' | 'error' | 'close'

class GraphQLStreamReader {
  private callbacks: Record<string, ((...args: any[]) => void)[]>

  private boundary: string = '-'

  private contents?: GraphQLResponse

  constructor(response: any) {
    this.callbacks = {}
    this.boundary = `--${GraphQLStreamReader.getBoundary(response.headers?.get('content-type'))}`

    this.parse(response)
  }

  private static getBoundary(value: string): string {
    const boundary = value.split('boundary=')[1]
    if (boundary) {
      return boundary.replace(/^('|")/, '').replace(/('|")$/, '')
    }

    return '-'
  }

  private static getHeaders(value: string): Record<string, string> {
    const headers: Record<string, string> = {}

    value.split(';').forEach((line) => {
      const i = line.indexOf(':')

      if (i > -1) {
        const name = line.slice(0, i).toLowerCase().trim()
        const text = line
          .slice(i + 1)
          .toLowerCase()
          .trim()
        headers[name] = text
      }
    })

    return headers
  }

  private async parse(response: any): Promise<ReadableStream> {
    const reader = response.body.getReader()
    const $this = this
    let buffer = ''

    const stream = new ReadableStream({
      async start(controller) {
        const read = async () => {
          const iteration = await reader.read()
          if (iteration.done) {
            controller.close()
            $this.emit('close')
            return
          }

          // @ts-ignore this is handled via fastestsmallesttextencoderdecoder
          const chunk = new TextDecoder('utf8').decode(iteration.value).trim()
          buffer += chunk

          let bi = buffer.indexOf($this.boundary)
          while (bi > -1) {
            const message = buffer.slice(0, bi)
            buffer = buffer.slice(bi + $this.boundary.length)

            if (message.trim()) {
              const index = message.indexOf('\r\n\r\n')
              const headers = GraphQLStreamReader.getHeaders(message.slice(0, index))

              if (headers['content-type'] !== 'application/json') {
                throw new Error(`invalid chunk due to unexpected content-type ${headers['content-type']}.`)
              }

              const body = message.slice(index)
              if (body.trim()) {
                const json = JSON.parse(body) as GraphQLResponse
                if ($this.contents === undefined) {
                  $this.contents = json
                }

                // merge the existing data with the new data received from the json in the chunk
                if (json.path) {
                  const path = Array.isArray(json.path) ? json.path : [json.path]
                  GraphQLStreamReader.merge($this.contents.data, json.data, path)
                }

                $this.emit('chunk', json.data)
              }
            }

            bi = buffer.indexOf($this.boundary)
          }

          $this.emit('data', $this.contents?.data)
          controller.enqueue(iteration.value)
          read()
        }

        read()
      },
    })

    return stream
  }

  private static merge(payload: GraphQLPayload, value: Record<string, any>, path: (string | number)[]): void {
    while (path.length > 1) {
      const shifted = path.shift()

      if (shifted !== undefined) {
        // eslint-disable-next-line no-param-reassign
        payload = payload[shifted]
      }
    }

    // assign the found record with the new key value pairs
    Object.keys(value).forEach((key) => {
      const shifted = path.shift()

      if (shifted !== undefined) {
        // eslint-disable-next-line no-param-reassign
        payload[shifted][key] = value[key]
      }
    })
  }

  private emit(event: MultiPartStreamReaderEvent, ...args: any[]): void {
    const callbacks = this.callbacks[event]
    if (callbacks) {
      callbacks.forEach((callback) => callback(...args))
    }
  }

  on(event: MultiPartStreamReaderEvent, listener: (...args: any[]) => void): void {
    if (!this.callbacks[event]) this.callbacks[event] = []
    this.callbacks[event].push(listener)
  }
}

export default GraphQLStreamReader
