import type { GraphQLStreamOptions, GraphQLVariables } from '@/types'
import type { DocumentNode } from 'graphql'

import fetch from 'isomorphic-fetch'

import GraphQLStreamReader from '@/GraphQLStreamReader'

class GraphQLClient {
  private readonly url: string

  constructor(url: string) {
    this.url = url
  }

  async request<TData = any, TVariables = GraphQLVariables>(
    query: DocumentNode,
    variables: TVariables
  ): Promise<TData> {
    const response = await fetch(this.url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({ query, variables }),
    })

    const { headers } = response
    if (headers?.get('content-type').toLowerCase().startsWith('application/json')) {
      return response.json()
    }

    return response.text()
  }

  async stream<TData = any, TVariables = GraphQLVariables>(
    query: DocumentNode,
    variables: TVariables,
    options: GraphQLStreamOptions<TData>
  ): Promise<void> {
    const response = await fetch(this.url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({ query, variables }),
    })

    const { headers } = response
    if (/^multipart\/mixed/.test(headers?.get('content-type'))) {
      const reader = new GraphQLStreamReader(response)

      if (options.next) {
        reader.on('data', options.next)
      }

      if (options.chunk) {
        reader.on('chunk', options.chunk)
      }

      if (options.error) {
        reader.on('error', options.error)
      }

      if (options.complete) {
        reader.on('close', options.complete)
      }
    }
  }
}

export default GraphQLClient
