/// <reference types="node" resolution-mode="require"/>
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _Body_cachedBuf, _Body_cachedText, _Body_cachedJson;
import http from "http";
import https from "https";
import fs from "fs";
import stream from "stream";
import Path from "path";
import { buffer } from "get-stream";
import { define } from "./util.js";
import _mime from "./mime.js";
const httpAgent = new http.Agent({});
const httpsAgent = new https.Agent({});
const zeroStream = stream.Readable.from([], { autoDestroy: false, emitClose: false, encoding: "utf-8" });
const zeroBuffer = new ArrayBuffer(0);
const decoder = new TextDecoder("utf-8", { fatal: false, ignoreBOM: false });
class FetchError extends Error {
    constructor(message) {
        super(message);
    }
}
class LogicError extends Error {
    constructor(message) {
        super(message);
    }
}
class Cloneable {
    constructor() {
        const _ref = this;
        this.this = _ref;
        this.self = _ref;
    }
    clone() {
        throw new Error("Function not implemented");
    }
}
export class Body extends Cloneable {
    constructor(init) {
        super();
        _Body_cachedBuf.set(this, void 0);
        _Body_cachedText.set(this, void 0);
        _Body_cachedJson.set(this, void 0);
        switch (typeof init) {
            case "string":
                __classPrivateFieldSet(this, _Body_cachedText, init, "f");
                this.body = stream.Readable.from(init, { encoding: "utf-8", autoDestroy: false, emitClose: false });
                break;
            case "object":
                if (init == null) {
                    this.body = null;
                }
                else if (init instanceof Body) {
                    this.body = init.body;
                    __classPrivateFieldSet(this, _Body_cachedBuf, __classPrivateFieldGet(init, _Body_cachedBuf, "f"), "f");
                    __classPrivateFieldSet(this, _Body_cachedText, __classPrivateFieldGet(init, _Body_cachedText, "f"), "f");
                    __classPrivateFieldSet(this, _Body_cachedJson, __classPrivateFieldGet(init, _Body_cachedJson, "f"), "f");
                }
                else if (init instanceof stream.Readable) {
                    this.body = init;
                }
                else {
                    const buf = new Uint8Array(init);
                    __classPrivateFieldSet(this, _Body_cachedBuf, buf, "f");
                    this.body = stream.Readable.from(buf, { autoDestroy: false, emitClose: false });
                }
                break;
            default:
                this.body = null;
        }
    }
    async arrayBuffer() {
        const cached = __classPrivateFieldGet(this, _Body_cachedBuf, "f");
        if (cached != null)
            return cached;
        const body = this.body;
        if (body == null)
            return __classPrivateFieldSet(this, _Body_cachedBuf, zeroBuffer, "f");
        const buf = await buffer(body, {});
        return __classPrivateFieldSet(this, _Body_cachedBuf, buf.buffer, "f");
    }
    async text() {
        const cached = __classPrivateFieldGet(this, _Body_cachedText, "f");
        if (cached != null)
            return cached;
        const text = decoder.decode(await this.arrayBuffer(), { stream: false });
        return __classPrivateFieldSet(this, _Body_cachedText, text, "f");
    }
    async json() {
        const cached = __classPrivateFieldGet(this, _Body_cachedJson, "f");
        if (cached != null)
            return cached;
        const json = JSON.parse(await this.text());
        return __classPrivateFieldSet(this, _Body_cachedJson, json, "f");
    }
}
_Body_cachedBuf = new WeakMap(), _Body_cachedText = new WeakMap(), _Body_cachedJson = new WeakMap();
export class Request extends Body {
    constructor(url, init) {
        const cfg = init || {};
        super(cfg.body);
        this.destination = "";
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
export class Response extends Body {
    constructor(body, init) {
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
        this.statusText = cfg.statusText || "";
        this.type = cfg.type || "default";
        this.url = url == null ? "" : validateUrl(url);
    }
    writeResponse(outgoing, options) {
        outgoing.writeHead(this.status, this.statusText, this.headers);
        (this.body || zeroStream).pipe(outgoing, options);
    }
}
function validateUrl(url) {
    if (url instanceof URL)
        return url.href;
    try {
        return new URL(url).href;
    }
    catch (err) {
        throw new LogicError(`'${url}' is not a valid URL`);
    }
}
function rawFetch(request) {
    const url = new URL(request.url);
    const protocol = url.protocol;
    const host = url.host;
    const headers = request.headers;
    headers["host"] = url.host;
    const options = {
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
    let outgoing;
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
async function redirectFetch(request, count = 0) {
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
    define(request, "url", new URL(location, request.url));
    return await redirectFetch(request, ++count);
}
async function noRedirectFetch(request) {
    const response = await rawFetch(request);
    const status = response.statusCode || 200;
    if (status < 300 || status > 399) {
        return response;
    }
    throw new FetchError("Redirect error is set");
}
async function remoteFetch(request) {
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
function fetchDataUrl(url) {
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
function fetchJavascriptUrl(url) {
    const data = decodeURIComponent(url.pathname);
    try {
        eval(data);
        return new Response(void 0, { status: 200, url });
    }
    catch (err) {
        throw new FetchError("Script execution failed: " + (err instanceof Error ? err.message : err));
    }
}
function localFetch(url) {
    const path = decodeURIComponent(url.pathname);
    const mime = _mime[Path.extname(path)];
    const headers = {};
    if (mime != null)
        headers["content-type"] = mime;
    try {
        return new Response(fs.readFileSync(path, {}), {
            status: 200,
            url,
            headers
        });
    }
    catch (err) {
        throw new FetchError("Failed to fetch: " + (err instanceof Error ? err.message : err));
    }
}
function getRequest(req, init) {
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
export default async function fetch(req, init) {
    const request = getRequest(req, init);
    const url = new URL(request.url);
    const protocol = url.protocol;
    switch (protocol) {
        case "http:":
        case "https:":
            const incoming = await remoteFetch(request);
            const headers = incoming.headers;
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
export async function safeFetch(request, init) {
    try {
        return await fetch(request, init);
    }
    catch (err) {
        return null;
    }
}
