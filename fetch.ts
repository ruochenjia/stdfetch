import http from "http";
import https from "https";
import fs from "fs";
import stream from "stream";
import { define } from "./util.js";

const httpAgent = new http.Agent({});
const httpsAgent = new https.Agent({});
const zeroBuffer = new ArrayBuffer(0);
const decoder = new TextDecoder("utf-8", { fatal: false, ignoreBOM: false });

class FetchError extends Error {
	constructor(message?: string | undefined) {
		super(message);
	}
}

class LogicError extends Error {
	constructor(message?: string | undefined) {
		super(message);
	}
}

type nul = null | undefined | void;
type RequestMode = "same-origin" | "cors" | "navigate" | "no-cors";
type RequestRedirect = "error" | "follow" | "manual";
type RequestCache = "default" | "force-cache" | "no-cache" | "no-store" | "only-if-cached" | "reload";
type ReferrerPolicy = "" | "origin" | "same-origin" | "no-referrer" | "no-referrer-when-downgrade" | "origin-when-cross-origin" | "strict-origin" | "strict-origin-when-cross-origin" | "unsafe-url"
type DataInit = ArrayBufferLike | ArrayLike<number>;
type SourceInit = DataInit | string | Buffer;
type BodyInit = stream.Readable | SourceInit | Body;

function toBuffer(stream: stream.Readable): Promise<Buffer> {
	return new Promise((resolve, reject) => {
		const chunks: any[] = [];
		stream.removeAllListeners();
		stream.setMaxListeners(3);
		stream.on("data", (chunk) => chunks.push(chunk));
		stream.on("end", () => resolve(Buffer.concat(chunks)));
		stream.on("error", (error) => reject(error));
	});
}

interface MapLike<E> {
	[k: string]: E;
}

interface Cloneable<E> {
	readonly clone: () => E;
}

interface Headers extends MapLike<string> {
}

interface RequestInit {
	readonly body?: BodyInit | nul;
	readonly method?: string | nul;
	readonly headers?: Headers | nul;
	readonly keepalive?: boolean | nul;
	readonly integrity?: string | nul;
	readonly mode?: RequestMode | nul;
	readonly cache?: RequestCache | nul;
	readonly redirect?: RequestRedirect | nul;
	readonly referrer?: string | nul;
	readonly referrerPolicy?: ReferrerPolicy | nul;
}

interface ResponseInit {
	readonly headers?: Headers | nul;
	readonly status?: number | nul;
	readonly statusText?: string | nul;
	readonly redirected?: boolean | nul;
	readonly url?: string | URL | nul;
}

export class Body {
	readonly body: stream.Readable | null;

	#cachedBuf: ArrayBuffer | nul;
	#cachedText: string | nul;
	#cachedJson: any;

	constructor(init?: BodyInit | nul) {
		switch (typeof init) {
			case "string":
				this.#cachedText = init;
				this.body = stream.Readable.from(init, { encoding: "utf-8", autoDestroy: false, emitClose: false });
				break;
			case "object":
				if (init == null) {
					this.body = null;
				} else if (init instanceof Body) {
					this.body = init.body;
					this.#cachedBuf = init.#cachedBuf;
					this.#cachedText = init.#cachedText;
					this.#cachedJson = init.#cachedJson;
				} else if (init instanceof stream.Readable) {
					this.body = init;
				} else {
					const buf = new Uint8Array(init);
					this.#cachedBuf = buf;
					this.body = stream.Readable.from(buf, { autoDestroy: false, emitClose: false });
				}
				break;
			default:
				this.body = null;
		}

		if (init == null) {
			this.body = null;
		} else if (init instanceof Body) {
			this.body = init.body;
			this.#cachedBuf = init.#cachedBuf;
			this.#cachedText = init.#cachedText;
			this.#cachedJson = init.#cachedJson;
		} else if (init instanceof stream.Readable) {
			this.body = init;
		} else if (typeof init == "string") {

		}
	}

	async arrayBuffer() {
		const cached = this.#cachedBuf;
		if (cached != null)
			return cached;

		const buf = this.body;
		if (buf == null) {
			return this.#cachedBuf = zeroBuffer;
		}

		const buffer = (await toBuffer(buf)).buffer;
		return this.#cachedBuf = buffer;

	}

	async text() {
		const cached = this.#cachedText;
		if (cached != null)
			return cached;

		const text = decoder.decode(await this.arrayBuffer(), { stream: false });
		return this.#cachedText = text;
	}

	async json() {
		const cached = this.#cachedJson;
		if (cached != null)
			return cached;

		const json = JSON.parse(await this.text());
		return this.#cachedJson = json;
	}
}

export class Request extends Body implements RequestInit, Cloneable<Request> {
	readonly method: string;
	readonly headers: Headers;
	readonly keepalive: boolean;
	readonly integrity: string;
	readonly mode: RequestMode;
	readonly cache: RequestCache;
	readonly redirect: RequestRedirect;
	readonly referrer: string;
	readonly referrerPolicy: ReferrerPolicy;
	readonly url: string;

	constructor(url: string | URL, init?: RequestInit | nul) {
		const cfg = init || {};
		super(cfg.body);
		this.method = cfg.method || "GET";
		this.headers = cfg.headers || {};
		this.keepalive = cfg.keepalive || false;
		this.integrity = cfg.integrity || "";
		this.mode = cfg.mode || "cors";
		this.cache = cfg.cache || "default";
		this.redirect = cfg.redirect || "follow";
		this.referrer = cfg.referrer || "";
		this.referrerPolicy = cfg.referrerPolicy || "";
		this.url = url instanceof URL ? url.href: url;
	}

	clone(): Request {
		throw new Error("Function not implemented");
	}
}

export class Response extends Body implements ResponseInit, Cloneable<Response> {
	readonly headers: Headers;
	readonly status: number;
	readonly statusText: string;
	readonly ok: boolean;
	readonly redirected: boolean;
	readonly url: string;

	constructor(body?: BodyInit | nul, init?: ResponseInit) {
		super(body);
		const cfg = init || {};
		const status = cfg.status || 200;
		const url = cfg.url || "";

		this.headers = cfg.headers || {};
		this.statusText = cfg.statusText || "";
		this.redirected = cfg.redirected || false;
		this.status = status;
		this.ok = status >= 200 && status < 300;
		this.url = url instanceof URL ? url.href : url;
	}

	clone(): Response {
		throw new Error("Function not implemented");
	}
}

function rawFetch(request: Request): Promise<http.IncomingMessage> {
	const url = new URL(request.url);
	const protocol = url.protocol;
	const host = url.host;
	const headers = request.headers;

	const options: http.RequestOptions = {
		protocol,
		host,

		// This is the path includes searchParams, so do not use 'url.pathname' here
		// Instead, remove the origin from the href
		path: url.href.substring(url.origin.length),
		method: request.method,
		headers,
		setHost: true,
		timeout: 10000,
		localAddress: "",
		localPort: 0,
	
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

	const body = request.body;
	if (body != null)
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

	define(request, "url", location);
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

	if (meta[1] != "base64") {
		return new Response(body, {
			status: 200,
			headers: { "content-type": mime },
			url
		});
	}

	return new Response(Buffer.from(body, "base64"), {
		status: 200,
		headers: { "content-type": mime },
		url
	});
}

function fetchJavascriptUrl(url: URL) {
	const data = decodeURIComponent(url.pathname);
	try {
		eval(data);
		return new Response(void 0, { status: 200, url });
	} catch (err) {
		return new Response(void 0, { status: 0, url });
	}
}

export default async function fetch(request: Request) {
	const url = new URL(request.url);
	const protocol = url.protocol;

	switch (protocol) {
		case "http:":
		case "https:":
			const incoming = await remoteFetch(request);
			const headers = incoming.headers as Headers;
			const redirectCount = headers["_$0_redirect_count"] || 0;

			return new Response(incoming, {
				status: incoming.statusCode,
				statusText: incoming.statusMessage,
				redirected: redirectCount > 0,
				headers,
				url
			});
		case "file:":
			const buf = fs.readFileSync(url.pathname, { });
			return new Response(buf, { status: 200, url });
		case "data:":
			return fetchDataUrl(url);
		case "blob:":
			throw new FetchError("Invalid URL");
		case "javascript:":
			return fetchJavascriptUrl(url);
		default:
			throw new FetchError("Unsupported protocol: " + protocol);
	}
}

export { fetch };

export async function safeFetch(request: Request) {
	try {
		return await fetch(request);
	} catch (err) {
		return null;
	}
}
