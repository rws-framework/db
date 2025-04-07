"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
function TrackType(type, opts = null, tags = []) {
    if (!opts) {
        opts = {
            required: false
        };
    }
    const required = opts.required;
    const metaOpts = { type, tags, required };
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
    //const resolvedType = typeof type === 'function' ? type() : type;   
    if (type._collection) {
        metaOpts.type = type;
    }
    return function (target, key) {
        Reflect.defineMetadata(`TrackType:${key}`, metaOpts, target);
    };
}
exports.default = TrackType;
