"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const _DEFAULTS = { required: false, many: false, embed: false, cascade: { onDelete: 'SetNull', onUpdate: 'Cascade' } };
function Relation(theModel, relationOptions = _DEFAULTS) {
    return function (target, key) {
        // Store the promise in metadata immediately
        console.log('for', { key });
        const metadataPromise = Promise.resolve().then(() => {
            const relatedTo = theModel();
            const metaOpts = {
                ...relationOptions,
                cascade: relationOptions.cascade || _DEFAULTS.cascade,
                relatedTo,
                relationField: relationOptions.relationField ? relationOptions.relationField : relatedTo._collection + '_id',
                key,
                // Generate a unique relation name if one is not provided
                relationName: relationOptions.relationName ?
                    relationOptions.relationName.toLowerCase() :
                    `${target.constructor.name.toLowerCase()}_${key}_${relatedTo._collection.toLowerCase()}`
            };
            return metaOpts;
        });
        // Store both the promise and the key information
        Reflect.defineMetadata(`Relation:${key}`, {
            promise: metadataPromise,
            key
        }, target);
    };
}
exports.default = Relation;
