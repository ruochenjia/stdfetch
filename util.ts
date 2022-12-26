
type PropDesc = {
	configurable?: boolean;
	enumerable?: boolean;
	writable?: boolean;
	get?: () => any;
	set?: (v: any) => any;
	value?: any;
};
type PropOptions = PropDesc | boolean | null | undefined;

function parseDesc(options?: PropOptions) {
	switch(typeof options) {
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

export function define<E extends object>(obj: E, key: string, value?: any, options?: PropOptions) {
	options = parseDesc(options);
	if (options.get == null && options.set == null) {
		if (!("value" in options)) {
			options.value = value;
		}
	} else {
		delete options.value;
		delete options.writable;
		delete options.enumerable;
	}

	Object.defineProperty(obj, key, options);
}

export function descs<E extends object>(obj: E) {
	const descs = Object.getOwnPropertyDescriptors(obj);
	const descsRet : { [name: string]: PropDesc; } = {};
	for (const key in descs) {
		descsRet[key] = descs[key];
	}
	return descsRet;
}

export function keys<E extends object>(obj: E) {
	const descs = Object.getOwnPropertyDescriptors(obj);
	const keys = [];
	for (const key in descs) {
		keys.push(key);
	}
	return keys;
}

export function assign<T extends object, O extends object>(to: T, from: O) {
	const d = descs(from);
	for (const k in d) {
		define(to, k, void 0, d[k]);
	}
}

export function clone<E extends object>(obj: E) {
	const cloned = {} as E;
	assign(cloned, obj);
	return cloned;
}

export class Null {
	protected readonly __defineGetter__ = void 0;
	protected readonly __defineSetter__ = void 0;
	protected readonly __lookupGetter__ = void 0;
	protected readonly __lookupSetter__ = void 0;
	protected readonly __proto__ = void 0;
	protected readonly hasOwnProperty = void 0;
	protected readonly isPrototypeOf = void 0;
	protected readonly propertyIsEnumerable = void 0;
	protected readonly toLocaleString = void 0;
	protected readonly toString = void 0;
	protected readonly valueOf = void 0;

	protected constructor() {
		define(this, "constructor", void 0, { writable: false, enumerable: false, configurable: false });
	}

	static readonly instance = new Null();
}

export class RawObject extends Null {
	readonly [name: string | number]: any;

	constructor(initObj?: object) {
		super();
		if (initObj != null) {
			assign(this, initObj);
		}
	}
}
