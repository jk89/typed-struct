/// <reference types="node" />
export declare type ExtractType<C, clear extends boolean = true> = C extends new () => infer T ? clear extends true ? Omit<T, '__struct' | 'toJSON'> : T : never;
declare type FilterFlags<Base, Condition> = {
    [Key in keyof Base]: Base[Key] extends Condition ? Key : never;
};
declare type FilterNames<Base, Condition> = FilterFlags<Base, Condition>[keyof Base];
declare type OmitType<Base, Condition> = Omit<Base, FilterNames<Base, Condition>>;
declare type ConditionalExtend<Base, Extender, Condition extends boolean> = Condition extends true ? Base & Extender : Base;
declare type StructGuard<ClassName extends string> = {
    readonly __struct: ClassName;
};
interface Constructable {
    new (...args: any[]): any;
}
declare type Id<T> = {} & {
    [P in keyof T]: T[P];
};
declare type ReplaceDistributive<Base, Condition, Target> = Base extends any ? Base extends Condition ? Target : Base extends Record<PropertyKey, unknown> ? Id<ReplaceRecursively<Base, Condition, Target>> : Base extends string ? string : Base extends Iterable<unknown> ? Id<ReplaceDistributive<IteratorType<Base>, Condition, Target>>[] : Base : never;
declare type ReplaceDistributiveNot<Base, Condition, Target> = Base extends any ? Base extends Condition ? Base : Base extends Record<PropertyKey, unknown> ? Id<ReplaceRecursivelyNot<Base, Condition, Target>> : Base extends string ? string : Base extends Iterable<unknown> ? Id<ReplaceDistributiveNot<IteratorType<Base>, Condition, Target>>[] : Target : never;
declare type IteratorType<T> = T extends Iterable<infer E> ? E : never;
declare type ReplaceRecursively<Base, Condition, Target> = {
    [P in keyof Base]: ReplaceDistributive<Base[P], Condition, Target>;
};
declare type ReplaceRecursivelyNot<Base, Condition, Target> = {
    [P in keyof Base]: ReplaceDistributiveNot<Base[P], Condition, Target>;
};
declare type OmitTypeDistributive<Base, Condition> = Base extends any ? Base extends Record<PropertyKey, unknown> ? Id<OmitTypeRecursively<Base, Condition>> : Base : never;
declare type OmitTypeRecursively<Base, Condition> = OmitType<{
    [P in keyof Base]: OmitTypeDistributive<Base[P], Condition>;
}, Condition>;
declare type Item<A> = A extends any ? (A extends readonly (infer T)[] ? T : A) : never;
declare type DeepWriteable<T> = {
    -readonly [P in keyof T]: T[P] extends Record<PropertyKey, unknown> ? Id<DeepWriteable<T[P]>> : T[P];
};
declare type POJO<T> = Id<DeepWriteable<ReplaceRecursivelyNot<ReplaceRecursively<OmitTypeRecursively<T, Function | undefined>, Date | bigint, string>, string | number | boolean | null, unknown>>>;
export declare enum PropType {
    UInt8 = 0,
    Int8 = 1,
    UInt16 = 2,
    Int16 = 3,
    UInt32 = 4,
    Int32 = 5,
    Float32 = 6,
    Float64 = 7,
    Boolean8 = 8,
    Boolean16 = 9,
    Boolean32 = 10,
    BCD = 11,
    Struct = 12,
    Buffer = 13,
    String = 14,
    StringArray = 15,
    BigInt64 = 16,
    BigUInt64 = 17
}
export declare type BitMask = readonly [offset: number, length: number];
export declare type BitMaskN<M extends number> = readonly [offset: BitOffset<M>, length: BitLength<M>];
declare type AssignableTypes = number | boolean | string | Date | bigint;
export declare type Getter<R> = (type: string, buffer: Buffer) => R | undefined;
export declare type Setter<R> = (type: string, buffer: Buffer, value: R) => boolean;
declare type BitMaskSize = 8 | 16 | 32;
export declare const getMask: (offset: number, length: number, size: BitMaskSize) => number;
declare type ExtendStruct<T, ClassName extends string, N extends string, R, HasCRC extends boolean = false, Readonly = R extends AssignableTypes ? false : true> = Struct<T & (Readonly extends false ? {
    [P in N]: R;
} : {
    readonly [P in N]: R;
}), ClassName, HasCRC>;
declare type StructInstance<T, ClassName extends string> = T & {
    toJSON(): POJO<T>;
} & StructGuard<ClassName>;
export declare type CRCCalc = (buf: Buffer, previous?: number) => number;
export declare type CRCOpts = {
    calc: CRCCalc;
    initial?: number;
    start?: number;
};
export interface CRC<T extends Constructable> {
    crc(instance: InstanceType<T>, needUpdate?: boolean): number;
}
export declare type WithCRC<T extends Constructable, HasCRC extends boolean> = ConditionalExtend<T, CRC<T>, HasCRC>;
export interface StructConstructor<T, ClassName extends string> {
    readonly prototype: T & {
        toJSON(): POJO<T>;
    };
    readonly baseSize: number;
    new (): StructInstance<T, ClassName>;
    new (size: number): StructInstance<T, ClassName>;
    new (raw: Buffer, clone?: boolean): StructInstance<T, ClassName>;
    new (array: number[]): StructInstance<T, ClassName>;
    getOffsetOf(name: keyof T): number;
    getOffsets(): Record<keyof T, number>;
    swap(instance: StructInstance<T, ClassName>, name: keyof T): Buffer;
    raw(instance: StructInstance<T, ClassName>): Buffer;
    raw(instance: POJO<T>): Buffer | undefined;
}
export declare function typed<T extends number | bigint | string>(): T | undefined;
export declare type StringOpts<R extends string> = {
    encoding?: string;
    length: number;
    literal?: undefined;
} | {
    encoding?: string;
    length?: undefined;
    literal: R;
};
export declare type StringArrayOpts = Id<Omit<StringOpts<string>, 'literal' | 'length'> & {
    lines: number;
    length: number;
}>;
declare type Prepend<A, Prefix> = A extends unknown[] ? ((t: Prefix, ...a: A) => void) extends (..._: infer Result) => void ? Result : never : never;
declare type PrependNextNum<A extends unknown[]> = A['length'] extends infer T ? Prepend<A, T> : never;
declare type EnumerateInternal<A extends Array<unknown>, N extends number> = {
    0: A;
    1: EnumerateInternal<PrependNextNum<A>, N>;
}[N extends A['length'] ? 0 : 1];
declare type ArrayItem<A> = A extends (infer E)[] ? E : never;
export declare type Enumerate<N extends number> = ArrayItem<EnumerateInternal<[], N>>;
export declare type Range<FROM extends number, TO extends number> = Exclude<Enumerate<TO>, Enumerate<FROM>>;
declare type BitOffset<N extends number> = Enumerate<N>;
declare type BitLength<N extends number> = Exclude<BitOffset<N>, 0> | N;
export default class Struct<T = {}, ClassName extends string = 'Structure', HasCRC extends boolean = false> {
    private defaultClassName?;
    private props;
    private size;
    private currentPosition;
    private tailed;
    constructor(defaultClassName?: ClassName | undefined);
    private get position();
    private set position(value);
    static raw: <S extends StructGuard<string>>(structure: S) => Buffer;
    getSize: () => number;
    getOffsetOf: (name: keyof T) => number | undefined;
    getOffsets: () => Record<keyof T, number>;
    Int8: <N extends string, R extends number>(name: N | N[], literal?: R | undefined) => ExtendStruct<T, ClassName, N, R, false, R extends AssignableTypes ? false : true>;
    UInt8: <N extends string, R extends number>(name: N | N[], literal?: R | undefined) => ExtendStruct<T, ClassName, N, R, false, R extends AssignableTypes ? false : true>;
    Int16LE: <N extends string, R extends number>(name: N | N[], literal?: R | undefined) => ExtendStruct<T, ClassName, N, R, false, R extends AssignableTypes ? false : true>;
    UInt16LE: <N extends string, R extends number>(name: N | N[], literal?: R | undefined) => ExtendStruct<T, ClassName, N, R, false, R extends AssignableTypes ? false : true>;
    Int32LE: <N extends string, R extends number>(name: N | N[], literal?: R | undefined) => ExtendStruct<T, ClassName, N, R, false, R extends AssignableTypes ? false : true>;
    UInt32LE: <N extends string, R extends number>(name: N | N[], literal?: R | undefined) => ExtendStruct<T, ClassName, N, R, false, R extends AssignableTypes ? false : true>;
    Int16BE: <N extends string, R extends number>(name: N | N[], literal?: R | undefined) => ExtendStruct<T, ClassName, N, R, false, R extends AssignableTypes ? false : true>;
    UInt16BE: <N extends string, R extends number>(name: N | N[], literal?: R | undefined) => ExtendStruct<T, ClassName, N, R, false, R extends AssignableTypes ? false : true>;
    Int32BE: <N extends string, R extends number>(name: N | N[], literal?: R | undefined) => ExtendStruct<T, ClassName, N, R, false, R extends AssignableTypes ? false : true>;
    UInt32BE: <N extends string, R extends number>(name: N | N[], literal?: R | undefined) => ExtendStruct<T, ClassName, N, R, false, R extends AssignableTypes ? false : true>;
    Float32LE: <N extends string, R extends number>(name: N | N[], literal?: R | undefined) => ExtendStruct<T, ClassName, N, R, false, R extends AssignableTypes ? false : true>;
    Float64LE: <N extends string, R extends number>(name: N | N[], literal?: R | undefined) => ExtendStruct<T, ClassName, N, R, false, R extends AssignableTypes ? false : true>;
    Float32BE: <N extends string, R extends number>(name: N | N[], literal?: R | undefined) => ExtendStruct<T, ClassName, N, R, false, R extends AssignableTypes ? false : true>;
    Float64BE: <N extends string, R extends number>(name: N | N[], literal?: R | undefined) => ExtendStruct<T, ClassName, N, R, false, R extends AssignableTypes ? false : true>;
    BigInt64LE: <N extends string, R extends bigint>(name: N | N[], literal?: R | undefined) => ExtendStruct<T, ClassName, N, R, false, R extends AssignableTypes ? false : true>;
    BigInt64BE: <N extends string, R extends bigint>(name: N | N[], literal?: R | undefined) => ExtendStruct<T, ClassName, N, R, false, R extends AssignableTypes ? false : true>;
    BigUInt64LE: <N extends string, R extends bigint>(name: N | N[], literal?: R | undefined) => ExtendStruct<T, ClassName, N, R, false, R extends AssignableTypes ? false : true>;
    BigUInt64BE: <N extends string, R extends bigint>(name: N | N[], literal?: R | undefined) => ExtendStruct<T, ClassName, N, R, false, R extends AssignableTypes ? false : true>;
    Boolean8: <N extends string, R extends boolean>(name: N | N[], literal?: R | undefined) => ExtendStruct<T, ClassName, N, R, false, R extends AssignableTypes ? false : true>;
    Boolean16: <N extends string, R extends boolean>(name: N | N[], literal?: R | undefined) => ExtendStruct<T, ClassName, N, R, false, R extends AssignableTypes ? false : true>;
    Boolean32: <N extends string, R extends boolean>(name: N | N[], literal?: R | undefined) => ExtendStruct<T, ClassName, N, R, false, R extends AssignableTypes ? false : true>;
    BCD: <N extends string, R extends number>(name: N | N[], literal?: R | undefined) => ExtendStruct<T, ClassName, N, R, false, R extends AssignableTypes ? false : true>;
    Struct: <N extends string, S, StructClass extends string>(name: N | N[], struct: StructConstructor<Item<S>, StructClass>) => ExtendStruct<T, ClassName, N, S, false, S extends AssignableTypes ? false : true>;
    Bits8: <N extends string>(fields: Record<N, BitMaskN<8>>) => ExtendStruct<T, ClassName, N, number, false, false>;
    Bits16: <N extends string>(fields: Record<N, BitMaskN<16>>) => ExtendStruct<T, ClassName, N, number, false, false>;
    Bits32: <N extends string>(fields: Record<N, BitMaskN<32>>) => ExtendStruct<T, ClassName, N, number, false, false>;
    Buffer<N extends string>(name: N | N[], length?: number): ExtendStruct<T, ClassName, N, Buffer>;
    String<N extends string>(name: N | N[]): ExtendStruct<T, ClassName, N, string>;
    String<N extends string>(name: N | N[], length: number): ExtendStruct<T, ClassName, N, string>;
    String<N extends string>(name: N | N[], encoding: string): ExtendStruct<T, ClassName, N, string>;
    String<N extends string>(name: N | N[], length: number, encoding: string): ExtendStruct<T, ClassName, N, string>;
    String<N extends string>(name: N | N[], encoding: string, length: number): ExtendStruct<T, ClassName, N, string>;
    String<N extends string, R extends string>(name: N | N[], opts: StringOpts<R>): ExtendStruct<T, ClassName, N, R>;
    Int8Array: <N extends string>(name: N | N[], length?: number | undefined) => ExtendStruct<T, ClassName, N, Int8Array, false, true>;
    UInt8Array: <N extends string>(name: N | N[], length?: number | undefined) => ExtendStruct<T, ClassName, N, Uint8Array, false, true>;
    Int16Array: <N extends string>(name: N | N[], length?: number | undefined) => ExtendStruct<T, ClassName, N, Int16Array, false, true>;
    UInt16Array: <N extends string>(name: N | N[], length?: number | undefined) => ExtendStruct<T, ClassName, N, Uint16Array, false, true>;
    Int32Array: <N extends string>(name: N | N[], length?: number | undefined) => ExtendStruct<T, ClassName, N, Int32Array, false, true>;
    UInt32Array: <N extends string>(name: N | N[], length?: number | undefined) => ExtendStruct<T, ClassName, N, Uint32Array, false, true>;
    Float32Array: <N extends string>(name: N | N[], length?: number | undefined) => ExtendStruct<T, ClassName, N, Float32Array, false, true>;
    Float64Array: <N extends string>(name: N | N[], length?: number | undefined) => ExtendStruct<T, ClassName, N, Float64Array, false, true>;
    BigInt64Array: <N extends string>(name: N | N[], length?: number | undefined) => ExtendStruct<T, ClassName, N, BigInt64Array, false, true>;
    BigUInt64Array: <N extends string>(name: N | N[], length?: number | undefined) => ExtendStruct<T, ClassName, N, BigUint64Array, false, true>;
    StructArray: <N extends string, S, StructClass extends string>(name: N | N[], struct: StructConstructor<S, StructClass>, length?: number | undefined) => ExtendStruct<T, ClassName, N, S[], false, true>;
    StringArray<N extends string>(name: N | N[], opts: StringArrayOpts): ExtendStruct<T, ClassName, N, string[]>;
    Custom<N extends string, ReturnType>(name: N | N[], size: number | undefined, getter: Getter<ReturnType>): ExtendStruct<T, ClassName, N, ReturnType, false, true>;
    Custom<N extends string, ReturnType>(name: N | N[], size: number | undefined, getter: Getter<ReturnType>, setter: Setter<ReturnType>): ExtendStruct<T, ClassName, N, ReturnType, false, false>;
    CRC8<N extends string>(name: N | N[]): ExtendStruct<T, ClassName, N, number>;
    CRC8<N extends string>(name: N | N[], calc: CRCCalc, initial?: number): ExtendStruct<T, ClassName, N, number, true>;
    CRC8<N extends string>(name: N, opts: CRCOpts): ExtendStruct<T, ClassName, N, number, true>;
    CRC16LE<N extends string>(name: N | N[]): ExtendStruct<T, ClassName, N, number>;
    CRC16LE<N extends string>(name: N | N[], calc: CRCCalc, initial?: number): ExtendStruct<T, ClassName, N, number, true>;
    CRC16LE<N extends string>(name: N, opts: CRCOpts): ExtendStruct<T, ClassName, N, number, true>;
    CRC16BE<N extends string>(name: N | N[]): ExtendStruct<T, ClassName, N, number>;
    CRC16BE<N extends string>(name: N | N[], calc: CRCCalc, initial?: number): ExtendStruct<T, ClassName, N, number, true>;
    CRC16BE<N extends string>(name: N, opts: CRCOpts): ExtendStruct<T, ClassName, N, number, true>;
    CRC32LE<N extends string>(name: N | N[]): ExtendStruct<T, ClassName, N, number>;
    CRC32LE<N extends string>(name: N | N[], calc: CRCCalc, initial?: number): ExtendStruct<T, ClassName, N, number, true>;
    CRC32LE<N extends string>(name: N, opts: CRCOpts): ExtendStruct<T, ClassName, N, number, true>;
    CRC32BE<N extends string>(name: N | N[]): ExtendStruct<T, ClassName, N, number>;
    CRC32BE<N extends string>(name: N | N[], calc: CRCCalc, initial?: number): ExtendStruct<T, ClassName, N, number, true>;
    CRC32BE<N extends string>(name: N, opts: CRCOpts): ExtendStruct<T, ClassName, N, number, true>;
    seek(bytes: number): Struct<T, ClassName, HasCRC>;
    back(steps?: number): Struct<T, ClassName, HasCRC>;
    align2(): Struct<T, ClassName, HasCRC>;
    align4(): Struct<T, ClassName, HasCRC>;
    align8(): Struct<T, ClassName, HasCRC>;
    compile(className?: string | undefined): WithCRC<StructConstructor<Id<T>, ClassName>, HasCRC>;
    protected swap: (name: keyof T, raw: Buffer) => Buffer;
    private createProp;
    private createTypedArray;
    private createBitFields;
    private createCRCProp;
}
export {};
