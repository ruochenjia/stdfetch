/// <reference types="node" resolution-mode="require"/>

import http from "http";
import https from "https";
import fs from "fs";
import util from "util";
import stream from "stream";
import Path from "path";
import _status from "./status.js";
import _mime from "./mime.js";

const httpAgent = new http.Agent({});
const httpsAgent = new https.Agent({});
const zeroStream = stream.Readable.from([], { autoDestroy: false, emitClose: true, encoding: "utf-8" });
const zeroArrayBuffer = new ArrayBuffer(0);
const zeroBuffer = Buffer.from(zeroArrayBuffer, 0, 0);
const pipeline = util.promisify(stream.pipeline);

class FetchError extends Error { }
class LogicError extends Error { }
class Cloneable extends null {
	clone(): this { throw new Error("Function not implemented"); }
}
Object.setPrototypeOf(Cloneable, class _Null_ { });

type nul = null | undefined | void;
type RequestCredentials = "include" | "omit" | "same-origin"
type RequestCache = "default" | "force-cache" | "no-cache" | "no-store" | "only-if-cached" | "reload";
type RequestDestination = "";
type RequestMode = "same-origin" | "cors" | "navigate" | "no-cors";
type RequestRedirect = "error" | "follow" | "manual";
type ReferrerPolicy = "" | "origin" | "same-origin" | "no-referrer" | "no-referrer-when-downgrade" | "origin-when-cross-origin" | "strict-origin" | "strict-origin-when-cross-origin" | "unsafe-url";
type ResponseType = "basic" | "cors" | "default" | "error" | "opaque" | "opaqueredirect";
type RequestInfo = Request | URL | string;
type DataInit = ArrayBufferLike | ArrayLike<number>;
type SourceInit = DataInit | string | Buffer;
type BodyInit = stream.Readable | SourceInit | Body;
type HeadersInit = [string, string][] | Record<string, string> | Headers;

interface RequestInit {
	readonly body?: BodyInit | nul;
	readonly cache?: RequestCache | nul;
	readonly credentials?: RequestCredentials | nul;
	readonly headers?: HeadersInit | nul;
	readonly integrity?: string | nul;
	readonly keepalive?: boolean | nul;
	readonly method?: string | nul;
	readonly mode?: RequestMode | nul;
	readonly redirect?: RequestRedirect | nul;
	readonly referrer?: string | nul;
	readonly referrerPolicy?: ReferrerPolicy | nul;
}

interface ResponseInit {
	readonly headers?: HeadersInit | nul;
	readonly redirected?: boolean | nul;
	readonly status?: number | nul;
	readonly statusText?: string | nul;
	readonly type?: ResponseType | nul;
	readonly url?: string | URL | nul;
}

export class Headers extends Cloneable {
	readonly get: (key: string) => string;
	readonly set: (key: string, value: string) => this;
	readonly has: (key: string) => boolean;
	readonly delete: (key: string) => boolean;
	readonly clear: () => void;
	readonly assign: (init: HeadersInit) => void;

	declare readonly keys: string[];
	declare readonly values: string[];
	declare readonly entries: [string, string][];
	declare readonly size: number;
	declare readonly map: Record<string, string>;

	constructor(init?: HeadersInit | nul) {
		super();
		const variables: Record<string, string> = headersInit(init);

		this.get = (key) => {
			checkHeaderKey(key = key.toLowerCase());
			return variables[key] || "";
		};

		this.set = (key, value) => {
			checkHeaderKey(key = key.toLowerCase());
			variables[key] = value;
			return this;
		};

		this.has = (key) => {
			return key.toLowerCase() in variables;
		};

		this.delete = (key) => {
			checkHeaderKey(key = key.toLowerCase());
			return delete variables[key];
		};

		this.clear = () => {
			for (const k of Object.keys(variables)) {
				delete variables[k];
			}
		};

		this.assign = (init) => {
			Object.assign(variables, headersInit(init));
		};

		Object.defineProperty(this, "keys", {
			get: () => Object.keys(variables),
			enumerable: false,
			configurable: false
		});

		Object.defineProperty(this, "values", {
			get: () => Object.values(variables),
			enumerable: false,
			configurable: false
		});

		Object.defineProperty(this, "entries", {
			get: () => Object.entries(variables),
			enumerable: false,
			configurable: false
		});

		Object.defineProperty(this, "size", {
			get: () => Object.keys(variables).length,
			enumerable: false,
			configurable: false
		});

		Object.defineProperty(this, "map", {
			get: () => ({ ...variables }),
			enumerable: false,
			configurable: false
		});
	}
}

export class Body extends Cloneable {
	readonly body: stream.Readable | null;

	#cachedBuffer: Buffer | nul;
	#cachedArrayBuffer: ArrayBufferLike | nul;
	#cachedBlob: Blob | nul;
	#cachedText: string | nul;
	#cachedJson: any;

	constructor(init?: BodyInit | nul) {
		super();
		if (init == null) {
			this.body = null;
			return;
		}

		switch (typeof init) {
			case "string":
				this.body = stream.Readable.from(init, { encoding: "utf-8", autoDestroy: true, emitClose: true });
				this.#cachedText = init;
				break;
			case "object":
				if (init instanceof Body) {
					this.body = init.body;
					this.#cachedBuffer = init.#cachedBuffer;
					this.#cachedArrayBuffer = init.#cachedArrayBuffer;
					this.#cachedText = init.#cachedText;
					this.#cachedJson = init.#cachedJson;
				} else if (init instanceof stream.Readable) {
					this.body = init;
				} else if (init instanceof Buffer) {
					this.#cachedBuffer = init;
					this.#cachedArrayBuffer = init.buffer;
					this.body = stream.Readable.from(init, { encoding: "binary", autoDestroy: true, emitClose: true });
				} else {
					const buf = new Uint8Array(init);
					this.#cachedBuffer = Buffer.from(buf, 0, buf.length);
					this.#cachedArrayBuffer = buf.buffer;
					this.body = stream.Readable.from(buf, { encoding: "binary", autoDestroy: true, emitClose: true });
				}
				break;
			default:
				throw new LogicError("Invalid type for body init.");
		}
	}

	async buffer() {
		const cached = this.#cachedBuffer;
		if (cached != null)
			return cached;

		const body = this.body;
		if (body == null)
			return this.#cachedBuffer = zeroBuffer;

		return this.#cachedBuffer = await getStreamBuffer(body);
	}

	async arrayBuffer() {
		const cached = this.#cachedArrayBuffer;
		if (cached != null)
			return cached;

		const buffer = (await this.buffer()).buffer;
		return this.#cachedArrayBuffer = buffer;
	}

	async blob() {
		const cached = this.#cachedBlob;
		if (cached != null)
			return cached;

		const blob = new Blob([await this.buffer()], { encoding: "binary", type: "unknown" });
		return this.#cachedBlob = blob;
	}

	async text() {
		const cached = this.#cachedText;
		if (cached != null)
			return cached;

		const text = (await this.buffer()).toString("utf-8");
		return this.#cachedText = text;
	}

	async json() {
		const cached = this.#cachedJson;
		if (cached != null)
			return cached;

		const json = JSON.parse(await this.text());
		return this.#cachedJson = json;
	}

	async writeData(out: stream.Writable, options?: { end?: boolean | nul; } | nul) {
		const buf = await this.buffer();
		const opt = options || {};
		out.write(buf);
		if (opt.end)
			out.end();
	}
}

export class Request extends Body implements RequestInit {
	readonly cache: RequestCache;
	readonly credentials: RequestCredentials;
	readonly destination: RequestDestination = "";
	readonly headers: Headers;
	readonly integrity: string;
	readonly keepalive: boolean;
	readonly method: string;
	readonly mode: RequestMode;
	readonly redirect: RequestRedirect;
	readonly referrer: string;
	readonly referrerPolicy: ReferrerPolicy;
	readonly url: string;

	constructor(url: string | URL, init?: RequestInit | nul) {
		const cfg = init || {};
		super(cfg.body);
		this.cache = cfg.cache || "default";
		this.credentials = cfg.credentials || "same-origin";
		this.headers = new Headers(cfg.headers);
		this.integrity = cfg.integrity || "";
		this.keepalive = cfg.keepalive || false;
		this.method = cfg.method || "GET";
		this.mode = cfg.mode || "cors";
		this.redirect = cfg.redirect || "follow";
		this.referrer = cfg.referrer || "";
		this.referrerPolicy = cfg.referrerPolicy || "";
		this.url = validateUrl(url);
	}
}

export class Response extends Body implements ResponseInit {
	readonly headers: Headers;
	readonly ok: boolean;
	readonly redirected: boolean;
	readonly status: number;
	readonly statusText: string;
	readonly type: ResponseType;
	readonly url: string;

	constructor(body?: BodyInit | nul, init?: ResponseInit) {
		super(body);
		const cfg = init || {};
		const status = cfg.status || 200;
		const url = cfg.url;

		if (status < 100 || status > 599)
			throw new LogicError("Response status must be an integer between 100 and 599");

		this.headers = new Headers(cfg.headers);
		this.ok = status >= 200 && status < 300;
		this.redirected = cfg.redirected || false;
		this.status = status;
		this.statusText = cfg.statusText || (_status[status] || "");
		this.type = cfg.type || "default";
		this.url = url == null ? "" : validateUrl(url);
	}

	async writeResponse(outgoing: http.ServerResponse, options?: { end?: boolean | nul; } | nul) {
		outgoing.writeHead(this.status, this.statusText, this.headers.map);
		await this.writeData(outgoing, options);
	}
}

function validateUrl(url: string | URL) {
	if (url instanceof URL)
		return url.href;

	try {
		return new URL(url).href;
	} catch (err) {
		throw new LogicError(`'${url}' is not a valid URL`);
	}
}

function checkHeaderKey(key: string) {
	for (let i = 0; i < key.length; i++) {
		const ch = key.charCodeAt(i);
		if ((ch < 0x30 || ch > 0x39) && (ch < 0x61 || ch > 0x7a) && ch != 0x2d) {
			throw new LogicError("Invalid header key");
		}
	}
}

function headersInit(init?: HeadersInit | nul): Record<string, string> {
	if (init == null) {
		return {};
	} else if (init instanceof Headers) {
		return init.map;
	} else if (init instanceof Array) {
		const headers: Record<string, string> = {};
		for (const item of init) {
			const key = item[0].toLowerCase();
			const value = item[1];
			checkHeaderKey(key);
			headers[key] = value;
		}
		return headers;
	} else return headersInit(Object.entries(init));
}

async function getStreamBuffer(readable: stream.Readable) {
	const out = new stream.PassThrough({});
	const chunks: Uint8Array[] = [];
	out.on("data", (chunk) => chunks.push(chunk));
	await pipeline(readable, out);
	return Buffer.concat(chunks);
}

function rawFetch(request: Request): Promise<http.IncomingMessage> {
	const url = new URL(request.url);
	const protocol = url.protocol;
	const host = url.host;
	const headers = request.headers;

	headers.set("Host", url.host);

	const options: http.RequestOptions = {
		protocol,
		host,

		// This is the path includes searchParams, so do not use 'url.pathname' here
		// Instead, remove the origin from the href
		path: url.href.substring(url.origin.length),
		method: request.method,
		headers: headers.map,
		setHost: true,
		timeout: 10000
	};

	let outgoing: http.ClientRequest;

	switch (protocol) {
		case "http:":
			options.agent = httpAgent;
			outgoing = http.request(options);
			break;
		case "https:":
			options.agent = httpsAgent;
			outgoing = https.request(options);
			break;
		default:
			throw new FetchError("Unsupported protocol: " + protocol);
	}

	const body = request.body || zeroStream;
	body.pipe(outgoing, { end: true });

	return new Promise((resolve, reject) => {
		outgoing.on("response", resolve);
		outgoing.on("error", reject);
	});
}

async function redirectFetch(request: Request, count: number = 0): Promise<http.IncomingMessage> {
	const response = await rawFetch(request);
	const status = response.statusCode || 200;
	const location = response.headers.location;

	if (location == null || status < 300 || status > 399) {
		// temporary header used to store redirect count
		response.headers["_$0_redirect_count"] = count.toString();
		return response;
	}

	if (count > 10) {
		throw new FetchError("Too many redirects");
	}

	Object.defineProperty(request, "url", { value: new URL(location, request.url).href });
	return await redirectFetch(request, ++count);
}

async function noRedirectFetch(request: Request) {
	const response = await rawFetch(request);
	const status = response.statusCode || 200;

	if (status < 300 || status > 399) {
		return response;
	}

	throw new FetchError("Redirect error is set");
}

async function remoteFetch(request: Request) {
	const redirect = request.redirect;
	switch (redirect) {
		case "follow":
			return await redirectFetch(request);
		case "manual":
			return await rawFetch(request);
		case "error":
			return await noRedirectFetch(request);
		default:
			throw new LogicError("Invalid request redirect mode: " + redirect);
	}
}

function fetchDataUrl(url: URL) {
	const data = decodeURIComponent(url.pathname);
	const head = data.split(",")[0];
	const body = data.substring(head.length + 1);

	const meta = head.split(";");
	const mime = meta[0];
	const encoding = meta[1];

	if (encoding == "base64") {
		return new Response(Buffer.from(body, "base64"), {
			status: 200,
			headers: { "Content-Type": mime },
			url
		});
	} else if (encoding.startsWith("charset=")) {
		return new Response(Buffer.from(body, encoding.substring(8) as BufferEncoding), {
			status: 200,
			headers: { "Content-Type": mime },
			url
		});
	} else {
		return new Response(body, {
			status: 200,
			headers: { "Content-Type": mime },
			url
		});
	}
}

function fetchJavascriptUrl(url: URL) {
	const data = decodeURIComponent(url.pathname);
	try {
		eval(data);
		return new Response(void 0, { status: 200, url });
	} catch (err) {
		throw new FetchError("Script execution failed: " + (err instanceof Error ? err.message : err));
	}
}

function localFetch(url: URL) {
	const path = decodeURIComponent(url.pathname);
	const mime = _mime[Path.extname(path)] || "application/unknown";

	try {
		return new Response(fs.readFileSync(path, {}), {
			status: 200,
			headers: { "Content-Type": mime },
			url
		});
	} catch (err) {
		throw new FetchError("Failed to fetch: " + (err instanceof Error ? err.message : err));
	}
}

function getRequest(req: RequestInfo, init?: RequestInit | nul) {
	switch (typeof req) {
		case "string":
			return new Request(req, init);
		case "object":
			if (req instanceof Request)
				return req;
			if (req instanceof URL)
				return new Request(req, init);
	}
	throw new LogicError("Parameter 'request' must be a string, URL, or Request object.");
}

export default async function fetch(req: RequestInfo, init?: RequestInit | nul) {
	const request = getRequest(req, init);
	const url = new URL(request.url);
	const protocol = url.protocol;

	switch (protocol) {
		case "http:":
		case "https:":
			const incoming = await remoteFetch(request);
			const headers = incoming.headers;
			const redirectCount = headers["_$0_redirect_count"] || 0;

			delete headers["_$0_redirect_count"];

			return new Response(incoming, {
				status: incoming.statusCode,
				statusText: incoming.statusMessage,
				redirected: redirectCount > 0,
				headers: headers as Record<string, string>,
				url
			});
		case "file:":
			return localFetch(url);
		case "data:":
			return fetchDataUrl(url);
		case "javascript:":
			return fetchJavascriptUrl(url);
		default:
			throw new FetchError("Unsupported protocol: " + protocol);
	}
}

export { fetch };

export async function safeFetch(request: RequestInfo, init?: RequestInit | nul) {
	try {
		return await fetch(request, init);
	} catch (err) {
		return null;
	}
}
