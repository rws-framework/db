"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
function TrackType(type, opts = null, tags = []) {
    if (!opts) {
        opts = {
            required: false,
            isArray: false
        };
    }
    if (!(opts === null || opts === void 0 ? void 0 : opts.required)) {
        opts.required = false;
    }
    if (!(opts === null || opts === void 0 ? void 0 : opts.isArray)) {
        opts.isArray = false;
    }
    const required = opts.required;
    const isArray = opts.isArray;
    const metaOpts = { type, tags, required, isArray };
    if (opts.relatedToField && opts.relatedTo) {
        metaOpts.relatedToField = opts.relatedToField;
        metaOpts.relatedTo = opts.relatedTo;
        if (!opts.relationField) {
            metaOpts.relationField = opts.relatedTo + '_id';
        }
        else {
            metaOpts.relationField = opts.relationField;
        }
    }
    if (opts.inversionModel) {
        metaOpts.inversionModel = opts.inversionModel;
    }
    // Copy dbOptions if present
    if (opts.dbOptions) {
        metaOpts.dbOptions = opts.dbOptions;
    }
    //const resolvedType = typeof type === 'function' ? type() : type;   
    if (type._collection) {
        metaOpts.type = type;
    }
    return function (target, key) {
        Reflect.defineMetadata(`TrackType:${key}`, metaOpts, target);
    };
}
exports.default = TrackType;
