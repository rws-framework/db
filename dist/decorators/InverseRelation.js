"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const ModelUtils_1 = require("../models/utils/ModelUtils");
function guessForeignKey(inversionModel, bindingModel, decoratorsData) {
    var _a;
    let key = null;
    let defaultKey = `${bindingModel._collection}_id`;
    const relDecorators = {};
    const trackDecorators = {};
    if (Object.keys(trackDecorators).includes(key)) {
        return key;
    }
    for (const decKey of Object.keys(decoratorsData)) {
        const dec = decoratorsData[decKey];
        if (dec.annotationType === 'Relation') {
            relDecorators[decKey] = dec;
        }
        if (dec.annotationType === 'TrackType') {
            trackDecorators[decKey] = dec;
        }
    }
    for (const relKey of Object.keys(relDecorators)) {
        const prodMeta = (_a = relDecorators[relKey]) === null || _a === void 0 ? void 0 : _a.metadata;
        if (prodMeta && prodMeta.relatedTo._collection === bindingModel._collection) {
            return prodMeta.relationField;
        }
    }
    return key;
}
function InverseRelation(inversionModel, sourceModel, relationOptions = null) {
    return function (target, key) {
        const metadataPromise = Promise.resolve().then(async () => {
            const model = inversionModel();
            const source = sourceModel();
            const decoratorsData = await ModelUtils_1.ModelUtils.getModelAnnotations(model);
            const metaOpts = {
                ...relationOptions,
                key,
                inversionModel: model,
                foreignKey: relationOptions && relationOptions.foreignKey ? relationOptions.foreignKey : guessForeignKey(model, source, decoratorsData),
                // Generate a unique relation name if one is not provided
                relationName: relationOptions && relationOptions.relationName ?
                    relationOptions.relationName.toLowerCase() :
                    `${model._collection}_${key}_${source._collection}`.toLowerCase()
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
