let iconvDecode;
let iconvEncode;
let inspect;
if (typeof process !== 'undefined' && typeof process.versions.node !== 'undefined') {
    import('util').then(util => {
        inspect = util.inspect;
    });
}
import('iconv-lite')
    .then(({ encode, decode }) => {
    iconvEncode = encode;
    iconvDecode = decode;
})
    .catch(() => {
    iconvEncode = undefined;
    iconvDecode = undefined;
});
let useColors = false;
let colors = [0];
import('debug')
    .then(debug => {
    colors = debug.colors.map(color => typeof color === 'string' ? parseInt(color.slice(1), 16) : color);
    useColors = debug.useColors() && colors && colors.length > 1;
})
    .catch(() => {
    useColors = false;
    colors.length = 1;
});
export var PropType;
(function (PropType) {
    PropType[PropType["UInt8"] = 0] = "UInt8";
    PropType[PropType["Int8"] = 1] = "Int8";
    PropType[PropType["UInt16"] = 2] = "UInt16";
    PropType[PropType["Int16"] = 3] = "Int16";
    PropType[PropType["UInt32"] = 4] = "UInt32";
    PropType[PropType["Int32"] = 5] = "Int32";
    PropType[PropType["Float32"] = 6] = "Float32";
    PropType[PropType["Float64"] = 7] = "Float64";
    PropType[PropType["Boolean8"] = 8] = "Boolean8";
    PropType[PropType["Boolean16"] = 9] = "Boolean16";
    PropType[PropType["Boolean32"] = 10] = "Boolean32";
    PropType[PropType["BCD"] = 11] = "BCD";
    PropType[PropType["Struct"] = 12] = "Struct";
    PropType[PropType["Buffer"] = 13] = "Buffer";
    PropType[PropType["String"] = 14] = "String";
    PropType[PropType["StringArray"] = 15] = "StringArray";
    PropType[PropType["BigInt64"] = 16] = "BigInt64";
    PropType[PropType["BigUInt64"] = 17] = "BigUInt64";
})(PropType || (PropType = {}));
const isSimpleType = (desc) => desc.struct === undefined &&
    typeof desc.type !== 'string' &&
    desc.type !== PropType.Buffer &&
    desc.type !== PropType.String &&
    desc.type !== PropType.StringArray;
const getShift = (start, length, size) => size - start - length;
export const getMask = (offset, length, size) => {
    if (offset < 0 || length <= 0 || offset + length > size)
        throw new TypeError('Invalid params');
    return length === 32 ? 0xffffffff : ((1 << length) - 1) << getShift(offset, length, size);
};
const getBits = (src, [start, length], size) => (src & getMask(start, length, size)) >>> getShift(start, length, size);
const setBits = (dest, [start, length], value, size) => {
    if (length === 32)
        return value >>> 0;
    const mask = getMask(start, length, size);
    const save = dest & ~mask;
    return (save | ((value << getShift(start, length, size)) & mask)) >>> 0;
};
const getUnsigned = (value, size) => (size < 32 ? value & ((1 << size) - 1) : value) >>> 0;
function getSize(type) {
    switch (type) {
        case PropType.Int8:
        case PropType.UInt8:
        case PropType.Boolean8:
        case PropType.BCD:
            return 1;
        case PropType.Int16:
        case PropType.UInt16:
        case PropType.Boolean16:
            return 2;
        case PropType.Int32:
        case PropType.UInt32:
        case PropType.Boolean32:
        case PropType.Float32:
            return 4;
        case PropType.Float64:
        case PropType.BigInt64:
        case PropType.BigUInt64:
            return 8;
        default:
            return undefined;
    }
}
const decodeMaskedValue = (src, size, mask) => mask ? getBits(src, mask, size) : getUnsigned(src, size);
const encodeMaskedValue = (dest, value, size, mask) => (mask ? setBits(dest, mask, value, size) : getUnsigned(value, size));
const getValue = (info, data) => {
    const { len, offset, type, mask, be, tail } = info;
    if ((len && len > 0) || tail)
        throw new TypeError('Array not allowed');
    switch (type) {
        case PropType.UInt8:
            return decodeMaskedValue(data.slice(offset).readUInt8(), 8, mask);
        case PropType.Int8:
            if (mask !== undefined)
                throw new TypeError('Signed types do not support bit masks');
            return data.readInt8(offset);
        case PropType.UInt16:
            return decodeMaskedValue(be ? data.slice(offset).readUInt16BE() : data.slice(offset).readUInt16LE(), 16, mask);
        case PropType.Int16:
            if (mask !== undefined)
                throw new TypeError('Signed types do not support bit masks');
            return be ? data.readInt16BE(offset) : data.readInt16LE(offset);
        case PropType.UInt32:
            return decodeMaskedValue(be ? data.slice(offset).readUInt32BE() : data.slice(offset).readUInt32LE(), 32, mask);
        case PropType.Int32:
            if (mask !== undefined)
                throw new TypeError('Signed types do not support bit masks');
            return be ? data.readInt32BE(offset) : data.readInt32LE(offset);
        case PropType.Float32:
            if (mask !== undefined)
                throw new TypeError('Float type do not support bit masks');
            return be ? data.readFloatBE(offset) : data.readFloatLE(offset);
        case PropType.Float64:
            if (mask !== undefined)
                throw new TypeError('Double type do not support bit masks');
            return be ? data.readDoubleBE(offset) : data.readDoubleLE(offset);
        case PropType.Boolean8:
            return !!decodeMaskedValue(data.readUInt8(offset), 8, mask);
        case PropType.Boolean16:
            return !!decodeMaskedValue(data.readUInt16LE(offset), 16, mask);
        case PropType.Boolean32:
            return !!decodeMaskedValue(data.readUInt32LE(offset), 32, mask);
        case PropType.BCD:
            return Math.floor(data[0] / 16) * 10 + (data[0] % 16);
        case PropType.BigInt64:
            return be ? data.readBigInt64BE(offset) : data.readBigInt64LE(offset);
        case PropType.BigUInt64:
            return be ? data.readBigUInt64BE(offset) : data.readBigUInt64LE(offset);
        default:
            return undefined;
    }
};
const setValue = (info, data, value) => {
    const { mask, ...other } = info;
    const { len, offset, type, be, tail } = other;
    if ((len && len > 0) || tail)
        throw new TypeError('Array not allowed');
    const encode = (val, size) => {
        const numValue = Number(val);
        return encodeMaskedValue(getValue(other, data), numValue, size, mask);
    };
    switch (type) {
        case PropType.UInt8:
            data.slice(offset).writeUInt8(encode(value, 8));
            return true;
        case PropType.Int8:
            if (mask !== undefined)
                throw new TypeError('Signed types do not support bit masks');
            data.writeInt8(Number(value), offset);
            return true;
        case PropType.UInt16:
            if (be)
                data.slice(offset).writeUInt16BE(encode(value, 16));
            else
                data.slice(offset).writeUInt16LE(encode(value, 16));
            return true;
        case PropType.Int16:
            if (mask !== undefined)
                throw new TypeError('Signed types do not support bit masks');
            if (be)
                data.writeInt16BE(Number(value), offset);
            else
                data.writeInt16LE(Number(value), offset);
            return true;
        case PropType.UInt32:
            if (be)
                data.slice(offset).writeUInt32BE(encode(value, 32));
            else
                data.slice(offset).writeUInt32LE(encode(value, 32));
            return true;
        case PropType.Int32:
            if (mask !== undefined)
                throw new TypeError('Signed types do not support bit masks');
            if (be)
                data.writeInt32BE(Number(value), offset);
            else
                data.writeInt32LE(Number(value), offset);
            return true;
        case PropType.Float32:
            if (mask !== undefined)
                throw new TypeError('Float type do not support bit masks');
            if (be)
                data.writeFloatBE(Number(value), offset);
            else
                data.writeFloatLE(Number(value), offset);
            return true;
        case PropType.Float64:
            if (mask !== undefined)
                throw new TypeError('Double type do not support bit masks');
            if (be)
                data.writeDoubleBE(Number(value), offset);
            else
                data.writeDoubleLE(Number(value), offset);
            return true;
        case PropType.Boolean8:
            data.writeUInt8(encode(value ? 0xff : 0, 8), offset);
            return true;
        case PropType.Boolean16: {
            const val = encode(value ? 0xffff : 0, 16);
            data.writeUInt16LE(val, offset);
            return true;
        }
        case PropType.Boolean32: {
            const val = encode(value ? 0xffffffff : 0, 32);
            data.writeUInt32LE(val, offset);
            return true;
        }
        case PropType.BCD:
            data.writeUInt8(Math.floor(Number(value) / 10) * 16 + (Number(value) % 10), offset);
            return true;
        case PropType.BigInt64:
            if (be)
                data.writeBigInt64BE(BigInt(value), offset);
            else
                data.writeBigInt64LE(BigInt(value), offset);
            return true;
        case PropType.BigUInt64:
            if (be)
                data.writeBigUInt64BE(BigInt(value), offset);
            else
                data.writeBigUInt64LE(BigInt(value), offset);
            return true;
        default:
            return false;
    }
};
function defineProps(obj, props, data) {
    [...props.entries()].forEach(([name, info]) => {
        Object.defineProperty(obj, name, createPropDesc(info, data));
    });
    return obj;
}
const throwUnknownType = (type) => {
    throw TypeError(`Unknown type "${type}"`);
};
const getTypedArrayConstructor = (type) => {
    switch (type) {
        case PropType.Int8:
            return Int8Array;
        case PropType.UInt8:
        case PropType.Boolean8:
            return Uint8Array;
        case PropType.Int16:
            return Int16Array;
        case PropType.UInt16:
        case PropType.Boolean16:
            return Uint16Array;
        case PropType.Int32:
            return Int32Array;
        case PropType.UInt32:
        case PropType.Boolean32:
            return Uint32Array;
        case PropType.Float32:
            return Float32Array;
        case PropType.Float64:
            return Float64Array;
        case PropType.BigInt64:
            return BigInt64Array;
        case PropType.BigUInt64:
            return BigUint64Array;
        default:
            throw new TypeError('Invalid array type');
    }
};
const getString = (buf, encoding) => {
    let end = buf.indexOf(0);
    if (end < 0)
        end = buf.length;
    return iconvDecode
        ? iconvDecode(buf.slice(0, end), encoding)
        : buf.toString(encoding, 0, end);
};
const setString = (buf, encoding, value) => {
    const encoded = iconvEncode
        ? iconvEncode(value, encoding)
        : Buffer.from(value, encoding);
    if (encoded.length > buf.length)
        throw new TypeError(`String is too long`);
    encoded.copy(buf);
    buf.fill(0, encoded.length);
};
const createPropDesc = (info, data) => {
    const desc = { enumerable: true };
    if (typeof info.type === 'string') {
        const { len, getter, setter, offset, type, tail } = info;
        const buf = data.slice(offset, tail ? undefined : offset + (len ?? 0));
        if (getter) {
            desc.get = () => getter(type, buf) ?? throwUnknownType(type);
        }
        if (setter) {
            desc.set = (value) => setter(type, buf, value) || throwUnknownType(type);
        }
        if (!getter && !setter) {
            desc.value = buf;
        }
    }
    else if (info.type === PropType.Buffer) {
        desc.value = data.slice(info.offset, info.len && info.len > 0 ? info.offset + info.len : info.len);
    }
    else if (isSimpleType(info)) {
        if (!isCrc(info) && (info.len || info.tail)) {
            const TypedArray = getTypedArrayConstructor(info.type);
            const len = info.len ?? Math.floor((data.length - info.offset) / getSize(info.type));
            desc.value = new TypedArray(data.buffer, data.byteOffset + info.offset, len);
        }
        else {
            info.literal === undefined || setValue(info, data, info.literal);
            desc.get = () => getValue(info, data);
            desc.set = value => {
                if (info.literal !== undefined && value !== info.literal)
                    throw new TypeError(`Invalid value, expected ${info.literal}`);
                else
                    setValue(info, data, value);
            };
        }
    }
    else if (info.struct) {
        const S = info.struct;
        let value;
        const { len, tail, offset } = info;
        if (len || tail) {
            value = [];
            const count = len ?? Math.floor((data.length - offset) / S.baseSize);
            for (let i = 0; i < count; i += 1) {
                const start = offset + S.baseSize * i;
                value.push(new S(data.slice(start, start + S.baseSize)));
            }
            Object.freeze(value);
        }
        else {
            value = new S(data.slice(offset, offset + S.baseSize));
        }
        desc.value = value;
    }
    else if (info.type === PropType.String) {
        const { len, offset, encoding = 'utf-8', literal } = info;
        const buf = data.slice(offset, len && len > 0 ? offset + len : len);
        literal === undefined || setString(buf, encoding, literal);
        desc.get = () => getString(buf, encoding);
        desc.set = (newValue) => {
            if (literal !== undefined && newValue !== literal)
                throw new TypeError(`Invalid value, expected "${literal}"`);
            setString(buf, encoding, newValue);
        };
    }
    else if (info.type === PropType.StringArray) {
        const { len, offset, encoding = 'utf-8', size } = info;
        if (!len || !size)
            throw new TypeError('Invalid descriptor');
        const getBuf = (index) => {
            if (Number.isInteger(index) && index >= 0 && index < len) {
                const start = offset + index * size;
                return data.slice(start, start + size);
            }
            throw RangeError(`The argument must be between 0 and ${len - 1}`);
        };
        const getter = (index) => getString(getBuf(index), encoding);
        const setter = (index, value) => setString(getBuf(index), encoding, value);
        const target = [...Array(len)];
        Object.defineProperties(target, {
            length: { value: len },
            ...(inspect && {
                [inspect.custom]: {
                    value: (...args) => inspect?.(target.map((_, index) => getter(index)), ...args.slice(1)),
                },
            }),
            [Symbol.iterator]: {
                value: function* iterator() {
                    for (let i = 0; i < len; i += 1) {
                        yield getter(i);
                    }
                },
            },
        });
        [...Array(len)].forEach((_, index) => {
            Object.defineProperty(target, index.toString(), {
                get: () => getter(index),
                set: value => setter(index, value),
                enumerable: true,
                configurable: false,
            });
        });
        Object.preventExtensions(target);
        desc.value = target;
    }
    return desc;
};
const isCrc = (info) => info.len === -1 &&
    typeof info.type !== 'string' &&
    info.type !== PropType.Buffer &&
    info.type !== PropType.String;
const selectColor = (name) => colors[Math.abs([...name].reduce((hash, ch) => (((hash << 5) - hash + ch.charCodeAt(0))) | 0, 0)) %
    (colors.length || 1)];
const isSimpleOrString = (value) => value === undefined || value === null || ['number', 'boolean', 'string'].includes(typeof value);
const isIterable = (arr) => Symbol.iterator in Object(arr);
const isObject = (obj) => obj != null &&
    !Array.isArray(obj) &&
    !Buffer.isBuffer(obj) &&
    typeof obj === 'object' &&
    Object.entries(obj).length > 0;
const toPOJO = (value) => {
    if (typeof value === 'bigint')
        return value.toString();
    if (isSimpleOrString(value))
        return value;
    if (isIterable(value))
        return [...value].map(toPOJO);
    if (isObject(value))
        return Object.entries(value).reduce((acc, [name, val]) => ({
            ...acc,
            [name]: toPOJO(val),
        }), {});
    try {
        return typeof value.toJSON === 'function' ? value.toJSON() : JSON.stringify(value);
    }
    catch {
        return value.toString();
    }
};
const nameIt = (name, superClass) => ({
    [name]: class extends superClass {
        constructor(...args) {
            super(...args);
        }
    },
}[name]);
const printBuffer = (data) => [...data].map(byte => byte.toString(16).padStart(2, '0')).join('-');
const colorPrint = (c, msg) => {
    const colorCode = `\u001B[3${c < 8 ? c : `8;5;${c}`}`;
    return `${colorCode};1m${msg}\u001B[0m`;
};
export function typed() {
    return undefined;
}
export default class Struct {
    defaultClassName;
    props = new Map();
    size = 0;
    currentPosition = 0;
    tailed = false;
    constructor(defaultClassName) {
        this.defaultClassName = defaultClassName;
    }
    get position() {
        return this.currentPosition;
    }
    set position(value) {
        this.currentPosition = Math.max(0, value);
        this.size = Math.max(this.currentPosition, this.size);
    }
    static raw = (structure) => structure.$raw;
    getSize = () => this.size;
    getOffsetOf = (name) => this.props.get(name)?.offset;
    getOffsets = () => Object.fromEntries([...this.props.entries()].map(([name, { offset }]) => [name, offset]));
    Int8 = (name, literal) => this.createProp(name, {
        literal,
        type: PropType.Int8,
    });
    UInt8 = (name, literal) => this.createProp(name, {
        type: PropType.UInt8,
        literal,
    });
    Int16LE = (name, literal) => this.createProp(name, {
        type: PropType.Int16,
        literal,
    });
    UInt16LE = (name, literal) => this.createProp(name, {
        type: PropType.UInt16,
        literal,
    });
    Int32LE = (name, literal) => this.createProp(name, {
        type: PropType.Int32,
        literal,
    });
    UInt32LE = (name, literal) => this.createProp(name, {
        type: PropType.UInt32,
        literal,
    });
    Int16BE = (name, literal) => this.createProp(name, {
        type: PropType.Int16,
        literal,
        be: true,
    });
    UInt16BE = (name, literal) => this.createProp(name, {
        type: PropType.UInt16,
        literal,
        be: true,
    });
    Int32BE = (name, literal) => this.createProp(name, {
        type: PropType.Int32,
        literal,
        be: true,
    });
    UInt32BE = (name, literal) => this.createProp(name, {
        type: PropType.UInt32,
        literal,
        be: true,
    });
    Float32LE = (name, literal) => this.createProp(name, {
        type: PropType.Float32,
        literal,
    });
    Float64LE = (name, literal) => this.createProp(name, {
        type: PropType.Float64,
        literal,
    });
    Float32BE = (name, literal) => this.createProp(name, {
        type: PropType.Float32,
        literal,
        be: true,
    });
    Float64BE = (name, literal) => this.createProp(name, {
        type: PropType.Float64,
        literal,
        be: true,
    });
    BigInt64LE = (name, literal) => this.createProp(name, {
        type: PropType.BigInt64,
        literal,
    });
    BigInt64BE = (name, literal) => this.createProp(name, {
        type: PropType.BigInt64,
        literal,
        be: true,
    });
    BigUInt64LE = (name, literal) => this.createProp(name, {
        type: PropType.BigUInt64,
        literal,
    });
    BigUInt64BE = (name, literal) => this.createProp(name, {
        type: PropType.BigUInt64,
        literal,
        be: true,
    });
    Boolean8 = (name, literal) => this.createProp(name, {
        type: PropType.Boolean8,
        literal,
    });
    Boolean16 = (name, literal) => this.createProp(name, {
        type: PropType.Boolean16,
        literal,
    });
    Boolean32 = (name, literal) => this.createProp(name, {
        type: PropType.Boolean32,
        literal,
    });
    BCD = (name, literal) => this.createProp(name, {
        type: PropType.BCD,
        literal,
    });
    Struct = (name, struct) => this.createProp(name, {
        type: PropType.Struct,
        struct,
    });
    Bits8 = (fields) => this.createBitFields(PropType.UInt8, fields);
    Bits16 = (fields) => this.createBitFields(PropType.UInt16, fields);
    Bits32 = (fields) => this.createBitFields(PropType.UInt32, fields);
    Buffer(name, length) {
        return this.createProp(name, {
            type: PropType.Buffer,
            tail: length === undefined || length < 0,
            len: length,
        });
    }
    String(name, arg1, arg2) {
        let length;
        let encoding;
        let literal;
        if (typeof arg1 === 'object') {
            length = arg1.length ?? arg1.literal.length;
            encoding = arg1.encoding;
            literal = arg1.literal;
        }
        else {
            [arg1, arg2].forEach(arg => {
                if (typeof arg === 'number')
                    length = arg;
                if (typeof arg === 'string')
                    encoding = arg;
            });
        }
        return this.createProp(name, {
            type: PropType.String,
            tail: length === undefined || length < 0,
            len: length,
            encoding,
            literal,
        });
    }
    Int8Array = (name, length) => this.createTypedArray(name, PropType.Int8, length);
    UInt8Array = (name, length) => this.createTypedArray(name, PropType.UInt8, length);
    Int16Array = (name, length) => this.createTypedArray(name, PropType.Int16, length);
    UInt16Array = (name, length) => this.createTypedArray(name, PropType.UInt16, length);
    Int32Array = (name, length) => this.createTypedArray(name, PropType.Int32, length);
    UInt32Array = (name, length) => this.createTypedArray(name, PropType.UInt32, length);
    Float32Array = (name, length) => this.createTypedArray(name, PropType.Float32, length);
    Float64Array = (name, length) => this.createTypedArray(name, PropType.Float64, length);
    BigInt64Array = (name, length) => this.createTypedArray(name, PropType.BigInt64, length);
    BigUInt64Array = (name, length) => this.createTypedArray(name, PropType.BigUInt64, length);
    StructArray = (name, struct, length) => this.createProp(name, {
        type: PropType.Struct,
        len: length,
        tail: length === undefined,
        struct: struct,
    });
    StringArray(name, opts) {
        return this.createProp(name, {
            type: PropType.StringArray,
            len: opts.lines,
            size: opts.length,
            encoding: opts.encoding,
        });
    }
    Custom(name, size, getter, setter) {
        return this.createProp(name, {
            type: Array.isArray(name) ? name[0] : name,
            len: size,
            tail: size === undefined,
            getter,
            setter,
        });
    }
    CRC8(name, arg1, arg2) {
        return this.createCRCProp(name, PropType.UInt8, false, arg1, arg2);
    }
    CRC16LE(name, arg1, arg2) {
        return this.createCRCProp(name, PropType.UInt16, false, arg1, arg2);
    }
    CRC16BE(name, arg1, arg2) {
        return this.createCRCProp(name, PropType.UInt16, true, arg1, arg2);
    }
    CRC32LE(name, arg1, arg2) {
        return this.createCRCProp(name, PropType.UInt32, false, arg1, arg2);
    }
    CRC32BE(name, arg1, arg2) {
        return this.createCRCProp(name, PropType.UInt32, true, arg1, arg2);
    }
    seek(bytes) {
        if (bytes === 0)
            this.position = this.size;
        else
            this.position += bytes;
        return this;
    }
    back(steps = 1) {
        if (steps < 0 || steps > this.props.size)
            throw new TypeError(`Invalid argument: back. Expected 0..${this.props.size}`);
        if (steps === 0)
            this.position = 0;
        else {
            const [prop] = [...this.props.values()].slice(-steps);
            this.position = prop.offset;
        }
        return this;
    }
    align2() {
        this.position += this.position % 2;
        return this;
    }
    align4() {
        const remainder = this.position % 4;
        if (remainder)
            this.position += 4 - remainder;
        return this;
    }
    align8() {
        const remainder = this.position % 8;
        if (remainder)
            this.position += 8 - remainder;
        return this;
    }
    compile(className = this.defaultClassName) {
        const { size: baseSize, props, getOffsetOf, getOffsets, swap } = this;
        class Structure {
            static baseSize = baseSize;
            static getOffsetOf = getOffsetOf;
            static getOffsets = getOffsets;
            constructor(rawOrSize, clone = false) {
                const size = Buffer.isBuffer(rawOrSize) || Array.isArray(rawOrSize)
                    ? rawOrSize.length
                    : rawOrSize ?? baseSize;
                if (size < baseSize)
                    throw TypeError(`[${className}]: Buffer size must be at least ${baseSize} (${size})`);
                let $raw;
                if (typeof rawOrSize === 'number' || rawOrSize === undefined) {
                    $raw = Buffer.alloc(size);
                }
                else {
                    $raw = clone || Array.isArray(rawOrSize) ? Buffer.from(rawOrSize) : rawOrSize;
                }
                defineProps(this, props, $raw);
                const toString = () => {
                    const { length } = $raw;
                    const offsets = Object.entries(getOffsets())
                        .map(([name, offset]) => [
                        name,
                        offset < 0 ? offset + length : offset,
                    ])
                        .sort(([, a], [, b]) => a - b);
                    if (offsets.length === 0)
                        return '';
                    const chunks = [];
                    for (let i = 0; i < offsets.length; i += 1) {
                        const [name, start] = offsets[i];
                        const prop = props.get(name);
                        switch (prop?.type) {
                            case PropType.Struct: {
                                const value = this[name];
                                if (prop.len === undefined)
                                    chunks.push([name, `${value}`]);
                                else if (Array.isArray(value))
                                    chunks.push([name, value.map(v => `${v}`).join(useColors ? colorPrint(2, '=') : '=')]);
                                break;
                            }
                            default: {
                                const [, end] = i + 1 < offsets.length ? offsets[i + 1] : [];
                                const buf = $raw.slice(start, end);
                                if (buf.length > 0)
                                    chunks.push([name, printBuffer(buf)]);
                            }
                        }
                    }
                    return chunks
                        .map(([name, value]) => useColors ? colorPrint(selectColor(name.toString()), value) : value)
                        .join('=');
                };
                Object.defineProperties(this, {
                    $raw: { value: $raw },
                    ...(inspect && {
                        [inspect.custom]: {
                            value: (...args) => inspect?.({ ...this }, ...args.slice(1)),
                        },
                    }),
                    [Symbol.toPrimitive]: { value: toString },
                    toString: { value: toString },
                });
            }
            static swap = (instance, name) => swap(name, Struct.raw(instance));
            static raw = (instance) => Struct.raw(instance);
            toJSON() {
                return toPOJO(this);
            }
        }
        const [name, info] = Array.from(props.entries()).pop() ?? [];
        if (info && isCrc(info)) {
            const { calc, initial, start } = info;
            if (calc) {
                Structure.crc = (instance, needUpdate = false) => {
                    const size = getSize(info.type);
                    const sum = calc(Structure.raw(instance).slice(start, -size), initial);
                    if (needUpdate && name) {
                        instance[name] = sum;
                    }
                    return sum;
                };
            }
        }
        return (className ? nameIt(className, Structure) : Structure);
    }
    swap = (name, raw) => {
        const prop = this.props.get(name);
        if (!prop)
            throw new TypeError(`Unknown property name "${name}"`);
        const { type, offset, len = 1 } = prop;
        const itemSize = getSize(type) ?? 1;
        const end = offset + itemSize * len;
        switch (itemSize) {
            case 1:
                return raw.slice(offset, end);
            case 2:
                return raw.slice(offset, end).swap16();
            case 4:
                return raw.slice(offset, end).swap32();
            case 8:
                return raw.slice(offset, end).swap64();
            default:
                throw new TypeError(`Invalid type ${typeof type === 'number' ? PropType[type] : type} for field ${name}`);
        }
    };
    createProp(nameOrAliases, info) {
        const self = this;
        const names = Array.isArray(nameOrAliases) ? nameOrAliases : [nameOrAliases];
        const [exists] = names.filter(name => self.props.has(name));
        if (exists !== undefined)
            throw TypeError(`Property "${exists}" already exists`);
        if (this.tailed && !isCrc(info) && !info.tail)
            throw TypeError(`Invalid property "${names[0]}". The tail buffer already created`);
        const itemSize = info.struct?.baseSize ?? info.size ?? getSize(info.type) ?? 1;
        if (info.tail)
            this.tailed = true;
        if (isCrc(info)) {
            const prev = Array.from(self.props.values()).pop();
            if (!prev)
                throw new TypeError('CRC should not to be first');
            if (prev.len === undefined) {
                prev.len = -itemSize;
            }
            else if (prev.len < 0) {
                if (prev.len !== -itemSize)
                    throw new TypeError(`Invalid tail buffer length. Expected ${-itemSize}`);
                return self;
            }
        }
        names.forEach(name => {
            self.props.set(name, { offset: isCrc(info) ? -itemSize : this.position, ...info });
        });
        const size = Math.abs(info.len ??
            (info.type === PropType.Buffer || info.tail ? 0 : 1)) * itemSize;
        this.position += size;
        return self;
    }
    createTypedArray = (name, type, length) => this.createProp(name, {
        type,
        len: length,
        tail: length === undefined,
    });
    createBitFields(type, fields) {
        const self = this;
        Object.entries(fields).forEach(([name, mask]) => {
            if (self.props.has(name))
                throw TypeError(`Property ${name} already exists`);
            self.props.set(name, {
                offset: this.position,
                type,
                mask,
                be: true,
            });
        });
        this.position += getSize(type);
        return self;
    }
    createCRCProp(name, type, be, arg1, arg2) {
        let calc;
        let initial;
        let start;
        if (typeof arg1 === 'function') {
            calc = arg1;
            initial = arg2 ?? 0;
        }
        else if (arg1) {
            calc = arg1.calc;
            initial = arg1.initial ?? 0;
            start = arg1.start ?? 0;
        }
        return this.createProp(name, {
            type,
            len: -1,
            be,
            calc,
            initial,
            start,
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RydWN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL3N0cnVjdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFTQSxJQUFJLFdBQXNDLENBQUM7QUFDM0MsSUFBSSxXQUFzQyxDQUFDO0FBQzNDLElBQUksT0FBd0UsQ0FBQztBQUU3RSxJQUFJLE9BQU8sT0FBTyxLQUFLLFdBQVcsSUFBSSxPQUFPLE9BQU8sQ0FBQyxRQUFRLENBQUMsSUFBSSxLQUFLLFdBQVcsRUFBRTtJQUNsRixNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFO1FBQ3pCLE9BQU8sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDO0lBQ3pCLENBQUMsQ0FBQyxDQUFDO0NBQ0o7QUFFRCxNQUFNLENBQUMsWUFBWSxDQUFDO0tBQ2pCLElBQUksQ0FBQyxDQUFDLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxFQUFFLEVBQUU7SUFDM0IsV0FBVyxHQUFHLE1BQU0sQ0FBQztJQUNyQixXQUFXLEdBQUcsTUFBTSxDQUFDO0FBQ3ZCLENBQUMsQ0FBQztLQUNELEtBQUssQ0FFSixHQUFHLEVBQUU7SUFDSCxXQUFXLEdBQUcsU0FBUyxDQUFDO0lBQ3hCLFdBQVcsR0FBRyxTQUFTLENBQUM7QUFDMUIsQ0FBQyxDQUNGLENBQUM7QUFFSixJQUFJLFNBQVMsR0FBRyxLQUFLLENBQUM7QUFDdEIsSUFBSSxNQUFNLEdBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUUzQixNQUFNLENBQUMsT0FBTyxDQUFDO0tBQ1osSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFO0lBQ1osTUFBTSxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsT0FBTyxLQUFLLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FB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