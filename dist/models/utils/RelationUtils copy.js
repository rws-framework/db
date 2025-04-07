"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RelationUtils = void 0;
class RelationUtils {
    static async getRelationOneMeta(model, classFields) {
        const relIds = {};
        const relationFields = classFields
            .filter((item) => item.indexOf('Relation') === 0 && !item.includes('Inverse'))
            .map((item) => item.split(':').at(-1));
        for (const key of relationFields) {
            const metadataKey = `Relation:${key}`;
            const metadata = Reflect.getMetadata(metadataKey, model);
            if (metadata && metadata.promise) {
                const resolvedMetadata = await metadata.promise;
                if (!relIds[key]) {
                    relIds[key] = {
                        key: resolvedMetadata.key,
                        required: resolvedMetadata.required,
                        model: resolvedMetadata.relatedTo,
                        hydrationField: resolvedMetadata.relationField,
                        foreignKey: resolvedMetadata.relatedToField
                    };
                }
            }
        }
        return relIds;
    }
    static async getRelationManyMeta(model, classFields) {
        const relIds = {};
        const inverseFields = classFields
            .filter((item) => item.indexOf('InverseRelation') === 0)
            .map((item) => item.split(':').at(-1));
        for (const key of inverseFields) {
            const metadataKey = `InverseRelation:${key}`;
            const metadata = Reflect.getMetadata(metadataKey, model);
            if (metadata && metadata.promise) {
                const resolvedMetadata = await metadata.promise;
                if (!relIds[key]) {
                    relIds[key] = {
                        key: resolvedMetadata.key,
                        inversionModel: resolvedMetadata.inversionModel,
                        foreignKey: resolvedMetadata.foreignKey
                    };
                }
            }
        }
        return relIds;
    }
    static bindRelation(relatedModel) {
        return {
            connect: {
                id: relatedModel.id
            }
        };
    }
    static hasRelation(model, key) {
        // Check if the property exists and is an object with an id property
        return !!model[key] && typeof model[key] === 'object' && model[key] !== null && 'id' in model[key];
    }
    static checkRelEnabled(model, key) {
        return Object.keys(model.constructor._RELATIONS).includes(key) &&
            model.constructor._RELATIONS[key] === true;
    }
}
exports.RelationUtils = RelationUtils;
