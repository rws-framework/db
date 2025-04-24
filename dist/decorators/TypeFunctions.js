"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StringType = StringType;
exports.NumberType = NumberType;
exports.BooleanType = BooleanType;
exports.DateType = DateType;
exports.ObjectType = ObjectType;
exports.ArrayType = ArrayType;
exports.IdType = IdType;
require("reflect-metadata");
const TrackType_1 = __importDefault(require("./TrackType"));
/**
 * String type function
 * @param optsOrRequired Options object or boolean indicating if field is required
 */
function StringType(optsOrRequired) {
    var _a, _b, _c, _d, _e, _f;
    let opts = {};
    if (typeof optsOrRequired === 'boolean') {
        opts.required = optsOrRequired;
    }
    else if (optsOrRequired) {
        opts = optsOrRequired;
    }
    const tags = [];
    // Add database-specific tags based on options
    if ((_b = (_a = opts.dbOptions) === null || _a === void 0 ? void 0 : _a.mysql) === null || _b === void 0 ? void 0 : _b.useText) {
        tags.push('db.Text');
    }
    else if ((_d = (_c = opts.dbOptions) === null || _c === void 0 ? void 0 : _c.mysql) === null || _d === void 0 ? void 0 : _d.maxLength) {
        tags.push(`db.VarChar(${opts.dbOptions.mysql.maxLength})`);
    }
    if ((_f = (_e = opts.dbOptions) === null || _e === void 0 ? void 0 : _e.postgres) === null || _f === void 0 ? void 0 : _f.useText) {
        tags.push('db.Text');
    }
    // Return a property decorator that calls TrackType
    return function (target, propertyKey) {
        if (typeof propertyKey === 'string') {
            (0, TrackType_1.default)(String, opts, tags)(target, propertyKey);
        }
    };
}
/**
 * Number type function
 * @param optsOrRequired Options object or boolean indicating if field is required
 */
function NumberType(optsOrRequired) {
    let opts = {};
    if (typeof optsOrRequired === 'boolean') {
        opts.required = optsOrRequired;
    }
    else if (optsOrRequired) {
        opts = optsOrRequired;
    }
    // Return a property decorator that calls TrackType
    return function (target, propertyKey) {
        if (typeof propertyKey === 'string') {
            (0, TrackType_1.default)(Number, opts)(target, propertyKey);
        }
    };
}
/**
 * Boolean type function
 * @param optsOrRequired Options object or boolean indicating if field is required
 */
function BooleanType(optsOrRequired) {
    let opts = {};
    if (typeof optsOrRequired === 'boolean') {
        opts.required = optsOrRequired;
    }
    else if (optsOrRequired) {
        opts = optsOrRequired;
    }
    // Return a property decorator that calls TrackType
    return function (target, propertyKey) {
        if (typeof propertyKey === 'string') {
            (0, TrackType_1.default)(Boolean, opts)(target, propertyKey);
        }
    };
}
/**
 * Date type function
 * @param optsOrRequired Options object or boolean indicating if field is required
 */
function DateType(optsOrRequired) {
    let opts = {};
    if (typeof optsOrRequired === 'boolean') {
        opts.required = optsOrRequired;
    }
    else if (optsOrRequired) {
        opts = optsOrRequired;
    }
    // Return a property decorator that calls TrackType
    return function (target, propertyKey) {
        if (typeof propertyKey === 'string') {
            (0, TrackType_1.default)(Date, opts)(target, propertyKey);
        }
    };
}
/**
 * Object type function (maps to JSON in databases)
 * @param optsOrRequired Options object or boolean indicating if field is required
 */
function ObjectType(optsOrRequired) {
    let opts = {};
    if (typeof optsOrRequired === 'boolean') {
        opts.required = optsOrRequired;
    }
    else if (optsOrRequired) {
        opts = optsOrRequired;
    }
    // Return a property decorator that calls TrackType
    return function (target, propertyKey) {
        if (typeof propertyKey === 'string') {
            (0, TrackType_1.default)(Object, opts)(target, propertyKey);
        }
    };
}
/**
 * Array type function
 * @param itemType Type of array items
 * @param optsOrRequired Options object or boolean indicating if field is required
 */
function ArrayType(itemType, optsOrRequired) {
    let opts = { isArray: true };
    if (typeof optsOrRequired === 'boolean') {
        opts.required = optsOrRequired;
    }
    else if (optsOrRequired) {
        opts = { ...optsOrRequired, isArray: true };
    }
    // Return a property decorator that calls TrackType
    return function (target, propertyKey) {
        if (typeof propertyKey === 'string') {
            (0, TrackType_1.default)(itemType, opts)(target, propertyKey);
        }
    };
}
/**
 * ID type function
 * @param optsOrRequired Options object or boolean indicating if field is required
 */
function IdType(optsOrRequired) {
    var _a, _b, _c, _d;
    let opts = {};
    if (typeof optsOrRequired === 'boolean') {
        opts.required = optsOrRequired;
    }
    else if (optsOrRequired) {
        opts = optsOrRequired;
    }
    const tags = ['id'];
    // Add database-specific tags based on options
    if ((_b = (_a = opts.dbOptions) === null || _a === void 0 ? void 0 : _a.postgres) === null || _b === void 0 ? void 0 : _b.useUuid) {
        tags.push('default(uuid())');
    }
    else if ((_d = (_c = opts.dbOptions) === null || _c === void 0 ? void 0 : _c.mysql) === null || _d === void 0 ? void 0 : _d.useUuid) {
        tags.push('default(uuid())');
    }
    else {
        tags.push('default(autoincrement())');
    }
    // Return a property decorator that calls TrackType
    return function (target, propertyKey) {
        var _a, _b, _c, _d;
        if (typeof propertyKey === 'string') {
            const type = ((_b = (_a = opts.dbOptions) === null || _a === void 0 ? void 0 : _a.postgres) === null || _b === void 0 ? void 0 : _b.useUuid) || ((_d = (_c = opts.dbOptions) === null || _c === void 0 ? void 0 : _c.mysql) === null || _d === void 0 ? void 0 : _d.useUuid) ? String : Number;
            (0, TrackType_1.default)(type, opts, tags)(target, propertyKey);
        }
    };
}
