"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RWSCollection = RWSCollection;
function RWSCollection(collectionName, options) {
    const metaOpts = { collectionName, options };
    return function (target) {
        target._collection = collectionName;
        if (options && options.relations) {
            target._collection = options.relations;
        }
        Reflect.defineMetadata(`RWSCollection`, metaOpts, target);
    };
}
