type PropDesc = {
    configurable?: boolean;
    enumerable?: boolean;
    writable?: boolean;
    get?: () => any;
    set?: (v: any) => any;
    value?: any;
};
type PropOptions = PropDesc | boolean | null | undefined;
export declare function define<E extends object>(obj: E, key: string, value?: any, options?: PropOptions): void;
export declare function descs<E extends object>(obj: E): {
    [name: string]: PropDesc;
};
export declare function keys<E extends object>(obj: E): string[];
export declare function assign<T extends object, O extends object>(to: T, from: O): void;
export declare function clone<E extends object>(obj: E): E;
export declare class Null {
    protected readonly __defineGetter__: undefined;
    protected readonly __defineSetter__: undefined;
    protected readonly __lookupGetter__: undefined;
    protected readonly __lookupSetter__: undefined;
    protected readonly __proto__: undefined;
    protected readonly hasOwnProperty: undefined;
    protected readonly isPrototypeOf: undefined;
    protected readonly propertyIsEnumerable: undefined;
    protected readonly toLocaleString: undefined;
    protected readonly toString: undefined;
    protected readonly valueOf: undefined;
    protected constructor();
    static readonly instance: Null;
}
export declare class RawObject extends Null {
    readonly [name: string | number]: any;
    constructor(initObj?: object);
}
export {};
