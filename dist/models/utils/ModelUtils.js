"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModelUtils = void 0;
const FieldsHelper_1 = require("../../helper/FieldsHelper");
class ModelUtils {
    static async getModelAnnotations(constructor) {
        const annotationsData = {};
        const metadataKeys = Reflect.getMetadataKeys(constructor.prototype);
        const filteredMetaKeys = metadataKeys.filter((metaKey) => {
            const [annotationType, annotatedField] = metaKey.split(':');
            if (annotationType === 'TrackType' && annotatedField === 'id' && metadataKeys.includes('IdType:' + annotatedField)) {
                return false;
            }
            return true;
        });
        // Process all metadata keys and collect promises
        const metadataPromises = filteredMetaKeys.map(async (fullKey) => {
            const [annotationType, propertyKey] = fullKey.split(':');
            const metadata = Reflect.getMetadata(fullKey, constructor.prototype);
            if (metadata) {
                // If this is a relation metadata with a promise
                if (metadata.promise && (annotationType === 'Relation' || annotationType === 'InverseRelation')) {
                    const resolvedMetadata = await metadata.promise;
                    annotationsData[propertyKey] = {
                        annotationType,
                        metadata: resolvedMetadata
                    };
                }
                else {
                    // Handle non-relation metadata as before
                    const key = metadata.key || propertyKey;
                    annotationsData[key] = {
                        annotationType,
                        metadata
                    };
                }
            }
        });
        // Wait for all metadata to be processed
        await Promise.all(metadataPromises);
        return annotationsData;
    }
    static async checkDbVariable(constructor, variable) {
        if (variable === 'id') {
            return true;
        }
        const dbAnnotations = await ModelUtils.getModelAnnotations(constructor);
        const dbProperties = Object.keys(dbAnnotations)
            .map((key) => { return { ...dbAnnotations[key], key }; })
            .filter((element) => element.annotationType === 'TrackType')
            .map((element) => element.key);
        return dbProperties.includes(variable);
    }
    static isSubclass(constructor, baseClass) {
        return baseClass.prototype.isPrototypeOf(constructor.prototype);
    }
    static getModelScalarFields(model) {
        return FieldsHelper_1.FieldsHelper.getAllClassFields(model)
            .filter((item) => item.indexOf('TrackType') === 0)
            .map((item) => item.split(':').at(-1));
    }
}
exports.ModelUtils = ModelUtils;
