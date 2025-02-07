"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
function Relation(theModel, required = false, relationField = null, relatedToField = 'id') {
    return function (target, key) {
        // Store the promise in metadata immediately
        const metadataPromise = Promise.resolve().then(() => {
            const relatedTo = theModel();
            const metaOpts = { required, relatedTo, relatedToField };
            if (!relationField) {
                metaOpts.relationField = relatedTo._collection + '_id';
            }
            else {
                metaOpts.relationField = relationField;
            }
            metaOpts.key = key;
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
