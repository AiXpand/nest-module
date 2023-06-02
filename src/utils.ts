export function IsObject<T>(x: T | undefined | null | boolean | string | symbol | number): x is T {
    return typeof x === 'object' ? x !== null : typeof x === 'function';
}
