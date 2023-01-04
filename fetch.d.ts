/// <reference types="node" resolution-mode="require"/>
/// <reference types="node" resolution-mode="require"/>
/// <reference types="node" resolution-mode="require"/>
/// <reference types="node" resolution-mode="require"/>
import http from "http";
import stream from "stream";
type nul = null | undefined | void;
type RequestCredentials = "include" | "omit" | "same-origin";
type RequestCache = "default" | "force-cache" | "no-cache" | "no-store" | "only-if-cached" | "reload";
type RequestDestination = "";
type RequestMode = "same-origin" | "cors" | "navigate" | "no-cors";
type RequestRedirect = "error" | "follow" | "manual";
type ReferrerPolicy = "" | "origin" | "same-origin" | "no-referrer" | "no-referrer-when-downgrade" | "origin-when-cross-origin" | "strict-origin" | "strict-origin-when-cross-origin" | "unsafe-url";
type ResponseType = "basic" | "cors" | "default" | "error" | "opaque" | "opaqueredirect";
type DataInit = ArrayBufferLike | ArrayLike<number>;
type SourceInit = DataInit | string | Buffer;
type BodyInit = stream.Readable | SourceInit | Body;
interface MapLike<E> {
    [k: string]: E;
}
interface Headers extends MapLike<string> {
}
interface RequestInit {
    readonly body?: BodyInit | nul;
    readonly cache?: RequestCache | nul;
    readonly credentials?: RequestCredentials | nul;
    readonly headers?: Headers | nul;
    readonly integrity?: string | nul;
    readonly keepalive?: boolean | nul;
    readonly method?: string | nul;
    readonly mode?: RequestMode | nul;
    readonly redirect?: RequestRedirect | nul;
    readonly referrer?: string | nul;
    readonly referrerPolicy?: ReferrerPolicy | nul;
}
interface ResponseInit {
    readonly headers?: Headers | nul;
    readonly redirected?: boolean | nul;
    readonly status?: number | nul;
    readonly statusText?: string | nul;
    readonly type?: ResponseType | nul;
    readonly url?: string | URL | nul;
}
declare class Cloneable {
    readonly this: typeof this;
    readonly self: typeof this;
    constructor();
    clone(): this;
}
export declare class Body extends Cloneable {
    #private;
    readonly body: stream.Readable | null;
    constructor(init?: BodyInit | nul);
    buffer(): Promise<Buffer>;
    arrayBuffer(): Promise<ArrayBufferLike>;
    blob(): Promise<import("buffer").Blob>;
    text(): Promise<string>;
    json(): Promise<any>;
}
export declare class Request extends Body implements RequestInit {
    readonly cache: RequestCache;
    readonly credentials: RequestCredentials;
    readonly destination: RequestDestination;
    readonly headers: Headers;
    readonly integrity: string;
    readonly keepalive: boolean;
    readonly method: string;
    readonly mode: RequestMode;
    readonly redirect: RequestRedirect;
    readonly referrer: string;
    readonly referrerPolicy: ReferrerPolicy;
    readonly url: string;
    constructor(url: string | URL, init?: RequestInit | nul);
}
export declare class Response extends Body implements ResponseInit {
    readonly headers: Headers;
    readonly ok: boolean;
    readonly redirected: boolean;
    readonly status: number;
    readonly statusText: string;
    readonly type: ResponseType;
    readonly url: string;
    constructor(body?: BodyInit | nul, init?: ResponseInit);
    writeResponse(outgoing: http.ServerResponse, options?: {
        end?: boolean;
    }): void;
}
type RequestInfo = Request | URL | string;
export default function fetch(req: RequestInfo, init?: RequestInit | nul): Promise<Response>;
export { fetch };
export declare function safeFetch(request: RequestInfo, init?: RequestInit | nul): Promise<Response | null>;
