/// <reference types="node" resolution-mode="require"/>

import http from "http";
import https from "https";
import fs from "fs";
import stream from "stream";
import Path from "path";
import { buffer } from "get-stream";
import _status from "./status.js";
import _mime from "./mime.js";

const httpAgent = new http.Agent({});
const httpsAgent = new https.Agent({});
const zeroStream = stream.Readable.from([], { autoDestroy: false, emitClose: true, encoding: "utf-8" });
const zeroArrayBuffer = new ArrayBuffer(0);
const zeroBuffer = Buffer.from(zeroArrayBuffer, 0, 0);

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
type RequestCredentials = "include" | "omit" | "same-origin"
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

class Cloneable extends null {
	clone(): this {
		throw new Error("Function not implemented");
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
				} else {
					const buf = new Uint8Array(init);
					this.#cachedBuffer = Buffer.from(buf);
					this.#cachedArrayBuffer = buf.buffer;
					this.body = stream.Readable.from(buf, { encoding: "binary", autoDestroy: true, emitClose: true });
				}
				break;
			default:
				this.body = null;
		}
	}

	async buffer() {
		const cached = this.#cachedBuffer;
		if (cached != null)
			return cached;

		const body = this.body;
		if (body == null)
			return this.#cachedBuffer = zeroBuffer;

		return this.#cachedBuffer = await buffer(body, {});
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
		this.headers = cfg.headers || {};
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

		this.headers = cfg.headers || {};
		this.ok = status >= 200 && status < 300;
		this.redirected = cfg.redirected || false;
		this.status = status;
		this.statusText = cfg.statusText || (_status[status] || "");
		this.type = cfg.type || "default";
		this.url = url == null ? "" : validateUrl(url);
	}

	writeResponse(outgoing: http.ServerResponse, options?: { end?: boolean; }) {
		outgoing.writeHead(this.status, this.statusText, this.headers);
		(this.body || zeroStream).pipe(outgoing, options);
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

function rawFetch(request: Request): Promise<http.IncomingMessage> {
	const url = new URL(request.url);
	const protocol = url.protocol;
	const host = url.host;
	const headers = request.headers;

	headers["host"] = url.host;

	const options: http.RequestOptions = {
		protocol,
		host,

		// This is the path includes searchParams, so do not use 'url.pathname' here
		// Instead, remove the origin from the href
		path: url.href.substring(url.origin.length),
		method: request.method,
		headers,
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
		throw new FetchError("Script execution failed: " + (err instanceof Error ? err.message: err));
	}
}

function localFetch(url: URL) {
	const path = decodeURIComponent(url.pathname);
	const mime = _mime[Path.extname(path)];
	const headers: Headers = {};
	if (mime != null)
		headers["content-type"] = mime;

	try {
		return new Response(fs.readFileSync(path, { }), {
			status: 200,
			url,
			headers
		});
	} catch (err) {
		throw new FetchError("Failed to fetch: " + (err instanceof Error ? err.message: err));
	}
}

type RequestInfo = Request | URL | string;

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
