"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RelationUtils = void 0;
const ModelUtils_1 = require("./ModelUtils");
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
                        foreignKey: resolvedMetadata.relatedToField,
                        cascade: resolvedMetadata.cascade
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
                        foreignKey: resolvedMetadata.foreignKey,
                        singular: resolvedMetadata?.singular || false,
                        orderBy: resolvedMetadata?.orderBy || null
                    };
                }
            }
        }
        return relIds;
    }
    static bindRelation(relatedModel) {
        if (!relatedModel || !relatedModel.id) {
            return null;
        }
        return {
            connect: {
                id: relatedModel.id
            }
        };
    }
    static async hasRelation(constructor, variable) {
        const dbAnnotations = await ModelUtils_1.ModelUtils.getModelAnnotations(constructor);
        const dbProperties = Object.keys(dbAnnotations)
            .map((key) => { return { ...dbAnnotations[key], key }; })
            .filter((element) => element.annotationType === 'Relation')
            .map((element) => element.key);
        return dbProperties.includes(variable);
    }
    static async getRelationKey(constructor, variable) {
        const dbAnnotations = await ModelUtils_1.ModelUtils.getModelAnnotations(constructor);
        const relationMeta = Object.keys(dbAnnotations)
            .map((key) => { return { ...dbAnnotations[key], key }; })
            .filter((element) => element.annotationType === 'Relation')
            .find((element) => element.key === variable);
        ;
        if (!relationMeta) {
            return null;
        }
        return relationMeta.metadata.relationField;
    }
    static checkRelDisabled(model, key) {
        const constructor = model.constructor;
        let declaredRelations = [];
        for (const relKey in constructor._RELATIONS) {
            const relEntry = constructor._RELATIONS[relKey];
            if (relEntry === true) {
                declaredRelations.push(relKey);
            }
        }
        // if((model.constructor as OpModelType<any>)._collection === 'product'){
        //     console.log({key, declaredRelations});
        //  }         
        // A relation disabled through declared relations
        if (declaredRelations.length && !declaredRelations.includes(key)) {
            return true;
        }
        // A relation disabled directly
        return Object.keys(constructor._RELATIONS).includes(key) && constructor._RELATIONS[key] === false;
    }
}
exports.RelationUtils = RelationUtils;
