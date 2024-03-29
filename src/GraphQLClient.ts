import type { GraphQLPayload, GraphQLStreamOptions, GraphQLVariables } from '@/types'
import type { DocumentNode } from 'graphql'
import type { Response } from 'node-fetch'

import { print } from 'graphql'
import fetch from 'isomorphic-fetch'

import GraphQLStreamReader from '@/GraphQLStreamReader'

class GraphQLClient {
  private readonly url: string

  constructor(url: string) {
    this.url = url
  }

  async request<TData = any, TVariables = GraphQLVariables>(
    query: DocumentNode | string,
    variables?: TVariables
  ): Promise<TData> {
    const response = await this.post(query, variables)

    const { headers } = response
    const type = headers?.get('content-type')?.toLowerCase()

    if (
      type?.startsWith('application/json') === false &&
      type?.startsWith('application/graphql-response+json') === false
    ) {
      throw new Error(`A unexpected content-type '${headers?.get('content-type')}' received from response.`)
    }

    const payload = (await response.json()) as GraphQLPayload
    return payload.data
  }

  async stream<TData = any, TVariables = GraphQLVariables>(
    query: DocumentNode | string,
    variables?: TVariables,
    options?: GraphQLStreamOptions<TData>
  ): Promise<void> {
    const response = await this.post(query, variables)

    const { headers } = response
    const type = headers?.get('content-type')?.toLowerCase()

    if (
      type?.startsWith('application/json') === false &&
      type?.startsWith('application/graphql-response+json') === false &&
      /^multipart\/mixed/.test(type ?? '') === false
    ) {
      throw new Error(`A unexpected content-type '${type}' received from response.`)
    }

    if (type?.startsWith('application/json') || type?.startsWith('application/graphql-response+json')) {
      const payload = (await response.json()) as GraphQLPayload

      if (options?.next) {
        options.next(payload.data)
      }

      if (options?.complete) {
        options.complete(payload.data)
      }

      return
    }

    const reader = new GraphQLStreamReader(response)
    if (options?.next) {
      reader.on('data', options.next)
    }

    if (options?.chunk) {
      reader.on('chunk', options.chunk)
    }

    if (options?.error) {
      reader.on('error', options.error)
    }

    if (options?.complete) {
      reader.on('close', options.complete)
    }
  }

  private async post(document: DocumentNode | string, variables?: GraphQLVariables): Promise<Response> {
    let query = document
    if (typeof query === 'object') query = print(query)

    const response = await fetch(this.url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({ query, variables }),
    })

    return response
  }
}

export default GraphQLClient
