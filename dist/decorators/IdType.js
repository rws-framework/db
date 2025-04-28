"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
function IdType(type, opts = null, tags = []) {
    const metaOpts = { type, dbOptions: opts && opts.dbOptions ? opts.dbOptions : null };
    return function (target, key) {
        Reflect.defineMetadata(`IdType:${key}`, metaOpts, target);
    };
}
exports.default = IdType;
