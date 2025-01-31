const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
};

/** options for each client instance */
interface ClientOptions extends RequestInit {
  /** set the common root URL for all API requests */
  baseUrl?: string;
}

interface BaseParams {
  path?: Record<string, unknown>;
  query?: Record<string, unknown>;
}

type TruncatedResponse = Omit<Response, 'arrayBuffer' | 'blob' | 'body' | 'clone' | 'formData' | 'json' | 'text'>;
/** Infer request/response from content type */
type Unwrap<T> = T extends {
  content: { 'application/json': { schema: any } };
}
  ? T['content']['application/json']['schema']
  : T extends { content: { 'application/json': any } }
  ? T['content']['application/json']
  : T extends { content: { '*/*': { schema: any } } }
  ? T['content']['*/*']['schema']
  : T extends { content: { '*/*': any } }
  ? T['content']['*/*']
  : T;

export default function createClient<T>(defaultOptions?: ClientOptions) {
  const defaultHeaders = new Headers({
    ...DEFAULT_HEADERS,
    ...(defaultOptions?.headers ?? {}),
  });

  async function coreFetch<U extends keyof T, M extends keyof T[U]>(url: U, options: FetchOptions<U, M>): Promise<FetchResponse<U, M>> {
    let { headers, body, params = {}, ...init } = options || {};
    // URL
    let finalURL = `${defaultOptions?.baseUrl ?? ''}${url as string}`;
    const { path, query } = (params as BaseParams | undefined) ?? {};
    if (path) for (const [k, v] of Object.entries(path)) finalURL = finalURL.replace(`{${k}}`, encodeURIComponent(`${v}`.trim()));
    if (query) finalURL = `${finalURL}?${new URLSearchParams(query as any).toString()}`;
    // headers
    const baseHeaders = new Headers(defaultHeaders); // clone defaults (don’t overwrite!)
    const headerOverrides = new Headers(headers);
    for (const [k, v] of headerOverrides.entries()) {
      if (v === undefined || v === null) baseHeaders.delete(k); // allow `undefined` | `null` to erase value
      else baseHeaders.set(k, v);
    }
    // fetch!
    const res = await fetch(finalURL, {
      redirect: 'follow',
      ...defaultOptions,
      ...init,
      headers: baseHeaders,
      body: typeof body === 'string' ? body : JSON.stringify(body),
    });
    const response: TruncatedResponse = {
      bodyUsed: res.bodyUsed,
      headers: res.headers,
      ok: res.ok,
      redirected: res.redirected,
      status: res.status,
      statusText: res.statusText,
      type: res.type,
      url: res.url,
    };
    return res.ok ? { data: await res.json(), response } : { error: await res.json(), response };
  }

  type PathParams<U extends keyof T> = T[U] extends { parameters: any } ? { params: T[U]['parameters'] } : { params?: BaseParams };
  type MethodParams<U extends keyof T, M extends keyof T[U]> = T[U][M] extends {
    parameters: any;
  }
    ? { params: T[U][M]['parameters'] }
    : { params?: BaseParams };
  type Params<U extends keyof T, M extends keyof T[U]> = PathParams<U> & MethodParams<U, M>;
  type Body<U extends keyof T, M extends keyof T[U]> = T[U][M] extends {
    requestBody: any;
  }
    ? { body: Unwrap<T[U][M]['requestBody']> }
    : { body?: never };
  type FetchOptions<U extends keyof T, M extends keyof T[U]> = Params<U, M> & Body<U, M> & Omit<RequestInit, 'body'>;
  type Success<T> = T extends { 200: any } ? T[200] : T extends { 201: any } ? T[201] : T extends { 202: any } ? T[202] : T extends { default: any } ? T['default'] : unknown;
  type Error<T> = T extends { 500: any }
    ? T[500]
    : T extends { 404: any }
    ? T[404]
    : T extends { 402: any }
    ? T[402]
    : T extends { 401: any }
    ? T[401]
    : T extends { 400: any }
    ? T[400]
    : T extends { 422: any }
    ? T[422]
    : T extends { 418: any }
    ? T[418]
    : T extends { 417: any }
    ? T[417]
    : T extends { 416: any }
    ? T[416]
    : T extends { 415: any }
    ? T[415]
    : T extends { 414: any }
    ? T[414]
    : T extends { 413: any }
    ? T[413]
    : T extends { 412: any }
    ? T[412]
    : T extends { 411: any }
    ? T[411]
    : T extends { 410: any }
    ? T[410]
    : T extends { 409: any }
    ? T[409]
    : T extends { 408: any }
    ? T[408]
    : T extends { 407: any }
    ? T[407]
    : T extends { 406: any }
    ? T[406]
    : T extends { 405: any }
    ? T[405]
    : T extends { default: any }
    ? T['default']
    : unknown;
  type FetchResponse<U extends keyof T, M extends keyof T[U]> =
    | {
        data: T[U][M] extends { responses: any } ? Unwrap<Success<T[U][M]['responses']>> : unknown;
        error?: never;
        response: TruncatedResponse;
      }
    | {
        data?: never;
        error: T[U][M] extends { responses: any } ? Unwrap<Error<T[U][M]['responses']>> : unknown;
        response: TruncatedResponse;
      };

  return {
    /** Call a GET endpoint */
    async get<U extends keyof T, M extends keyof T[U]>(url: T[U] extends { get: any } ? U : never, options: FetchOptions<U, M>) {
      return coreFetch(url, { ...options, method: 'GET' });
    },
    /** Call a PUT endpoint */
    async put<U extends keyof T, M extends keyof T[U]>(url: T[U] extends { put: any } ? U : never, options: FetchOptions<U, M>) {
      return coreFetch(url, { ...options, method: 'PUT' });
    },
    /** Call a POST endpoint */
    async post<U extends keyof T, M extends keyof T[U]>(url: T[U] extends { post: any } ? U : never, options: FetchOptions<U, M>) {
      return coreFetch(url, { ...options, method: 'POST' });
    },
    /** Call a DELETE endpoint */
    async del<U extends keyof T, M extends keyof T[U]>(url: T[U] extends { delete: any } ? U : never, options: FetchOptions<U, M>) {
      return coreFetch(url, { ...options, method: 'DELETE' });
    },
    /** Call a OPTIONS endpoint */
    async options<U extends keyof T, M extends keyof T[U]>(url: T[U] extends { options: any } ? U : never, options: FetchOptions<U, M>) {
      return coreFetch(url, { ...options, method: 'OPTIONS' });
    },
    /** Call a HEAD endpoint */
    async head<U extends keyof T, M extends keyof T[U]>(url: T[U] extends { head: any } ? U : never, options: FetchOptions<U, M>) {
      return coreFetch(url, { ...options, method: 'HEAD' });
    },
    /** Call a PATCH endpoint */
    async patch<U extends keyof T, M extends keyof T[U]>(url: T[U] extends { patch: any } ? U : never, options: FetchOptions<U, M>) {
      return coreFetch(url, { ...options, method: 'PATCH' });
    },
    /** Call a TRACE endpoint */
    async trace<U extends keyof T, M extends keyof T[U]>(url: T[U] extends { trace: any } ? U : never, options: FetchOptions<U, M>) {
      return coreFetch(url, { ...options, method: 'TRACE' });
    },
  };
}
