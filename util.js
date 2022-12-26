function parseDesc(options) {
    switch (typeof options) {
        case "boolean":
            options = {
                writable: options,
                enumerable: options,
                configurable: options
            };
            break;
        case "undefined":
            options = {};
            break;
        case "object":
            if (options == null)
                options = {};
            break;
        default:
            throw new TypeError("Invalid arguments");
    }
    return options;
}
export function define(obj, key, value, options) {
    options = parseDesc(options);
    if (options.get == null && options.set == null) {
        if (!("value" in options)) {
            options.value = value;
        }
    }
    else {
        delete options.value;
        delete options.writable;
        delete options.enumerable;
    }
    Object.defineProperty(obj, key, options);
}
export function descs(obj) {
    const descs = Object.getOwnPropertyDescriptors(obj);
    const descsRet = {};
    for (const key in descs) {
        descsRet[key] = descs[key];
    }
    return descsRet;
}
export function keys(obj) {
    const descs = Object.getOwnPropertyDescriptors(obj);
    const keys = [];
    for (const key in descs) {
        keys.push(key);
    }
    return keys;
}
export function assign(to, from) {
    const d = descs(from);
    for (const k in d) {
        define(to, k, void 0, d[k]);
    }
}
export function clone(obj) {
    const cloned = {};
    assign(cloned, obj);
    return cloned;
}
export class Null {
    constructor() {
        this.__defineGetter__ = void 0;
        this.__defineSetter__ = void 0;
        this.__lookupGetter__ = void 0;
        this.__lookupSetter__ = void 0;
        this.__proto__ = void 0;
        this.hasOwnProperty = void 0;
        this.isPrototypeOf = void 0;
        this.propertyIsEnumerable = void 0;
        this.toLocaleString = void 0;
        this.toString = void 0;
        this.valueOf = void 0;
        define(this, "constructor", void 0, { writable: false, enumerable: false, configurable: false });
    }
}
Null.instance = new Null();
export class RawObject extends Null {
    constructor(initObj) {
        super();
        if (initObj != null) {
            assign(this, initObj);
        }
    }
}
