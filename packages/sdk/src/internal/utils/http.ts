import axios, { AxiosError } from "axios"
import { removeUndefinedProperties } from "./object"

export type Headers = Record<string, string>
export type QueryParams = Record<string, string|number|undefined|string[]|boolean>
export type BodyParams = any
export { AxiosError }

export default class HttpClient {
    private baseUrl = ''
    private headers: Headers = {}
    constructor(url: string, port?: number, headers?: Headers, private withCredentials?: boolean) {
        if (port) {
          url = url + ":" + port.toString()
        }

        if (url) {
          // Throws an error if format is invalid
          new URL(url)

          if (url.endsWith('/')) {
            url = url.substring(0, url.length - 1)
          }

          this.baseUrl = url
        }

        if (headers) {
          if (typeof headers !== 'object') {
            throw new Error('Invalid headers, must be an object')
          }
          const keys = Object.keys(headers)
          for (const key of keys) {
            if (typeof (headers[key]) !== 'string' && typeof (headers[key]) !== 'number') {
              throw new Error(`Invalid headers, key ${key} must be a string or number`)
            }
          }
          this.headers = headers
        }
    }

    private formatUrl (path: string): string {
        if (!path.startsWith('/')) {
            throw new Error(`Invalid path ${path}`)
        }
        return this.baseUrl + path
    }

    private getHeaders (headers?: Headers): Headers {
      return removeUndefinedProperties({ ...this.headers, ...headers })
    }

    public async get <T extends unknown, U = QueryParams> (path: string, query?: U, headers?: Headers, withCredentials = this.withCredentials): Promise<T> {
        const response = await axios.get<T>(this.formatUrl(path), {
            headers: this.getHeaders(headers),
            params: removeUndefinedProperties({...query}),
            ...(withCredentials && { withCredentials }),
        })
        return response.data
    }

    public async post <T extends unknown, U = BodyParams> (path: string, body?: U, headers?: Headers, withCredentials = this.withCredentials): Promise<T> {
        const data = Array.isArray(body) ? body : {...removeUndefinedProperties({...body})}
        const response = await axios.post<T>(this.formatUrl(path), data, {
            headers: this.getHeaders(headers),
            ...(withCredentials && { withCredentials }),
        })
        return response.data
    }

    public async delete <T extends unknown, U = QueryParams> (path: string, query?: U, headers?: Headers, withCredentials = this.withCredentials): Promise<T> {
        const response = await axios.delete<T>(this.formatUrl(path), {
            headers: this.getHeaders(headers),
            params: removeUndefinedProperties({...query}),
            ...(withCredentials && { withCredentials }),
        })
        return response.data
    }
}