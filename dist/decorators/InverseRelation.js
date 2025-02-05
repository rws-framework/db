"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
function InverseRelation(inversionModel, sourceModel, foreignKey = null) {
    return function (target, key) {
        // Store the promise in metadata immediately
        const metadataPromise = Promise.resolve().then(() => {
            const model = inversionModel();
            const source = sourceModel();
            const metaOpts = {
                key,
                inversionModel: model,
                foreignKey: foreignKey ? foreignKey : `${source._collection}_id`
            };
            return metaOpts;
        });
        // Store both the promise and the key information
        Reflect.defineMetadata(`InverseRelation:${key}`, {
            promise: metadataPromise,
            key
        }, target);
    };
}
exports.default = InverseRelation;
