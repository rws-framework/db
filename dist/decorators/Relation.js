"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const _DEFAULT_CASCADE = { onDelete: 'SetNull', onUpdate: 'Cascade' };
const _DEFAULTS = { required: false, many: false, embed: false, cascade: null };
function Relation(theModel, relationOptions = _DEFAULTS) {
    return function (target, key) {
        // Store the promise in metadata immediately
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
                    relationOptions.relationName :
                    null
            };
            // Only set default cascade behavior if no explicit cascade was provided
            if (relationOptions.required && !relationOptions.cascade) {
                if (!metaOpts.cascade) {
                    metaOpts.cascade = {};
                }
                metaOpts.cascade.onDelete = 'Restrict';
            }
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
