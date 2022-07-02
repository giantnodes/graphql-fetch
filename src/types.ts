export type GraphQLVariables = { [key: string]: any }

export type GraphQLPayload = { [key: string]: any }

export type GraphQLExtension = { [key: string]: any }

export type GraphQLError = {
  message: string
  locations?: Array<{
    line: number
    column: number
  }>
  path?: Array<string | number>
}

export type GraphQLResponse = {
  data: GraphQLPayload
  errors?: Array<GraphQLError>
  extensions?: GraphQLExtension
  label?: string
  path?: Array<string | number>
}

export type GraphQLStreamOptions<T> = {
  next?(data: T): void
  chunk?(chunk: any): void
  error?(error: GraphQLError): void
  complete?(): void
}
