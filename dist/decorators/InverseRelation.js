"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
function InverseRelation(inversionModel, sourceModel, relationOptions = null) {
    return function (target, key) {
        const metadataPromise = Promise.resolve().then(() => {
            const model = inversionModel();
            const source = sourceModel();
            const metaOpts = {
                ...relationOptions,
                key,
                inversionModel: model,
                foreignKey: relationOptions && relationOptions.foreignKey ? relationOptions.foreignKey : `${source._collection}_id`
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
