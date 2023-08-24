"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.typed = exports.getMask = exports.PropType = void 0;
let iconvDecode;
let iconvEncode;
let inspect;
if (typeof process !== 'undefined' && typeof process.versions.node !== 'undefined') {
    Promise.resolve().then(() => __importStar(require('util'))).then(util => {
        inspect = util.inspect;
    });
}
Promise.resolve().then(() => __importStar(require('iconv-lite'))).then(({ encode, decode }) => {
    iconvEncode = encode;
    iconvDecode = decode;
})
    .catch(() => {
    iconvEncode = undefined;
    iconvDecode = undefined;
});
let useColors = false;
let colors = [0];
Promise.resolve().then(() => __importStar(require('debug'))).then(debug => {
    colors = debug.colors.map(color => typeof color === 'string' ? parseInt(color.slice(1), 16) : color);
    useColors = debug.useColors() && colors && colors.length > 1;
})
    .catch(() => {
    useColors = false;
    colors.length = 1;
});
var PropType;
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
})(PropType = exports.PropType || (exports.PropType = {}));
const isSimpleType = (desc) => desc.struct === undefined &&
    typeof desc.type !== 'string' &&
    desc.type !== PropType.Buffer &&
    desc.type !== PropType.String &&
    desc.type !== PropType.StringArray;
const getShift = (start, length, size) => size - start - length;
const getMask = (offset, length, size) => {
    if (offset < 0 || length <= 0 || offset + length > size)
        throw new TypeError('Invalid params');
    return length === 32 ? 0xffffffff : ((1 << length) - 1) << getShift(offset, length, size);
};
exports.getMask = getMask;
const getBits = (src, [start, length], size) => (src & (0, exports.getMask)(start, length, size)) >>> getShift(start, length, size);
const setBits = (dest, [start, length], value, size) => {
    if (length === 32)
        return value >>> 0;
    const mask = (0, exports.getMask)(start, length, size);
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
function typed() {
    return undefined;
}
exports.typed = typed;
class Struct {
    constructor(defaultClassName) {
        this.defaultClassName = defaultClassName;
        this.props = new Map();
        this.size = 0;
        this.currentPosition = 0;
        this.tailed = false;
        this.getSize = () => this.size;
        this.getOffsetOf = (name) => this.props.get(name)?.offset;
        this.getOffsets = () => Object.fromEntries([...this.props.entries()].map(([name, { offset }]) => [name, offset]));
        this.Int8 = (name, literal) => this.createProp(name, {
            literal,
            type: PropType.Int8,
        });
        this.UInt8 = (name, literal) => this.createProp(name, {
            type: PropType.UInt8,
            literal,
        });
        this.Int16LE = (name, literal) => this.createProp(name, {
            type: PropType.Int16,
            literal,
        });
        this.UInt16LE = (name, literal) => this.createProp(name, {
            type: PropType.UInt16,
            literal,
        });
        this.Int32LE = (name, literal) => this.createProp(name, {
            type: PropType.Int32,
            literal,
        });
        this.UInt32LE = (name, literal) => this.createProp(name, {
            type: PropType.UInt32,
            literal,
        });
        this.Int16BE = (name, literal) => this.createProp(name, {
            type: PropType.Int16,
            literal,
            be: true,
        });
        this.UInt16BE = (name, literal) => this.createProp(name, {
            type: PropType.UInt16,
            literal,
            be: true,
        });
        this.Int32BE = (name, literal) => this.createProp(name, {
            type: PropType.Int32,
            literal,
            be: true,
        });
        this.UInt32BE = (name, literal) => this.createProp(name, {
            type: PropType.UInt32,
            literal,
            be: true,
        });
        this.Float32LE = (name, literal) => this.createProp(name, {
            type: PropType.Float32,
            literal,
        });
        this.Float64LE = (name, literal) => this.createProp(name, {
            type: PropType.Float64,
            literal,
        });
        this.Float32BE = (name, literal) => this.createProp(name, {
            type: PropType.Float32,
            literal,
            be: true,
        });
        this.Float64BE = (name, literal) => this.createProp(name, {
            type: PropType.Float64,
            literal,
            be: true,
        });
        this.BigInt64LE = (name, literal) => this.createProp(name, {
            type: PropType.BigInt64,
            literal,
        });
        this.BigInt64BE = (name, literal) => this.createProp(name, {
            type: PropType.BigInt64,
            literal,
            be: true,
        });
        this.BigUInt64LE = (name, literal) => this.createProp(name, {
            type: PropType.BigUInt64,
            literal,
        });
        this.BigUInt64BE = (name, literal) => this.createProp(name, {
            type: PropType.BigUInt64,
            literal,
            be: true,
        });
        this.Boolean8 = (name, literal) => this.createProp(name, {
            type: PropType.Boolean8,
            literal,
        });
        this.Boolean16 = (name, literal) => this.createProp(name, {
            type: PropType.Boolean16,
            literal,
        });
        this.Boolean32 = (name, literal) => this.createProp(name, {
            type: PropType.Boolean32,
            literal,
        });
        this.BCD = (name, literal) => this.createProp(name, {
            type: PropType.BCD,
            literal,
        });
        this.Struct = (name, struct) => this.createProp(name, {
            type: PropType.Struct,
            struct,
        });
        this.Bits8 = (fields) => this.createBitFields(PropType.UInt8, fields);
        this.Bits16 = (fields) => this.createBitFields(PropType.UInt16, fields);
        this.Bits32 = (fields) => this.createBitFields(PropType.UInt32, fields);
        this.Int8Array = (name, length) => this.createTypedArray(name, PropType.Int8, length);
        this.UInt8Array = (name, length) => this.createTypedArray(name, PropType.UInt8, length);
        this.Int16Array = (name, length) => this.createTypedArray(name, PropType.Int16, length);
        this.UInt16Array = (name, length) => this.createTypedArray(name, PropType.UInt16, length);
        this.Int32Array = (name, length) => this.createTypedArray(name, PropType.Int32, length);
        this.UInt32Array = (name, length) => this.createTypedArray(name, PropType.UInt32, length);
        this.Float32Array = (name, length) => this.createTypedArray(name, PropType.Float32, length);
        this.Float64Array = (name, length) => this.createTypedArray(name, PropType.Float64, length);
        this.BigInt64Array = (name, length) => this.createTypedArray(name, PropType.BigInt64, length);
        this.BigUInt64Array = (name, length) => this.createTypedArray(name, PropType.BigUInt64, length);
        this.StructArray = (name, struct, length) => this.createProp(name, {
            type: PropType.Struct,
            len: length,
            tail: length === undefined,
            struct: struct,
        });
        this.swap = (name, raw) => {
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
        this.createTypedArray = (name, type, length) => this.createProp(name, {
            type,
            len: length,
            tail: length === undefined,
        });
    }
    get position() {
        return this.currentPosition;
    }
    set position(value) {
        this.currentPosition = Math.max(0, value);
        this.size = Math.max(this.currentPosition, this.size);
    }
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
            toJSON() {
                return toPOJO(this);
            }
        }
        Structure.baseSize = baseSize;
        Structure.getOffsetOf = getOffsetOf;
        Structure.getOffsets = getOffsets;
        Structure.swap = (instance, name) => swap(name, Struct.raw(instance));
        Structure.raw = (instance) => Struct.raw(instance);
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
exports.default = Struct;
Struct.raw = (structure) => structure.$raw;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RydWN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL3N0cnVjdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQVNBLElBQUksV0FBc0MsQ0FBQztBQUMzQyxJQUFJLFdBQXNDLENBQUM7QUFDM0MsSUFBSSxPQUF3RSxDQUFDO0FBRTdFLElBQUksT0FBTyxPQUFPLEtBQUssV0FBVyxJQUFJLE9BQU8sT0FBTyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEtBQUssV0FBVyxFQUFFO0lBQ2xGLGtEQUFPLE1BQU0sSUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUU7UUFDekIsT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUM7SUFDekIsQ0FBQyxDQUFDLENBQUM7Q0FDSjtBQUVELGtEQUFPLFlBQVksSUFDaEIsSUFBSSxDQUFDLENBQUMsRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBRTtJQUMzQixXQUFXLEdBQUcsTUFBTSxDQUFDO0lBQ3JCLFdBQVcsR0FBRyxNQUFNLENBQUM7QUFDdkIsQ0FBQyxDQUFDO0tBQ0QsS0FBSyxDQUVKLEdBQUcsRUFBRTtJQUNILFdBQVcsR0FBRyxTQUFTLENBQUM7SUFDeEIsV0FBVyxHQUFHLFNBQVMsQ0FBQztBQUMxQixDQUFDLENBQ0YsQ0FBQztBQUVKLElBQUksU0FBUyxHQUFHLEtBQUssQ0FBQztBQUN0QixJQUFJLE1BQU0sR0FBYSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBRTNCLGtEQUFPLE9BQU8sSUFDWCxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUU7SUFDWixNQUFNLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxPQUFPLEtBQUssS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFD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