"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HydrateUtils = void 0;
const TimeSeriesUtils_1 = require("./TimeSeriesUtils");
const RelationUtils_1 = require("./RelationUtils");
const ModelUtils_1 = require("./ModelUtils");
class HydrateUtils {
    /**
     * Preprocess database data to convert foreign keys to relation objects when relations are not already populated
     */
    static async preprocessForeignKeys(data, model, relOneData) {
        const processedData = { ...data };
        // For each relation, handle different scenarios during creation and updates
        for (const relationName in relOneData) {
            const relationMeta = relOneData[relationName];
            const foreignKeyField = relationMeta.hydrationField; // e.g., "tutorial_id"
            const relationField = relationMeta.key; // e.g., "tutorial"
            // Scenario 1: We have a foreign key value but no relation object (or the relation is just an ID)
            if (foreignKeyField in data && data[foreignKeyField] !== null && data[foreignKeyField] !== undefined &&
                (!data[relationField] || typeof data[relationField] !== 'object')) {
                // Create a minimal relation object with just the ID
                // This allows toMongo() to work properly without requiring full relation loading
                processedData[relationField] = { id: data[foreignKeyField] };
            }
            // Scenario 2: We have a relation object but no foreign key field (common during creation)
            // Ensure the foreign key field exists when we have a valid relation object
            else if (data[relationField] && typeof data[relationField] === 'object' &&
                data[relationField].id &&
                (!(foreignKeyField in data) || data[foreignKeyField] === null || data[foreignKeyField] === undefined)) {
                // Set the foreign key field from the relation object's ID
                processedData[foreignKeyField] = data[relationField].id;
            }
            // Scenario 3: Both relation object and foreign key exist, ensure they're consistent
            else if (data[relationField] && typeof data[relationField] === 'object' &&
                data[relationField].id && foreignKeyField in data &&
                data[foreignKeyField] !== data[relationField].id) {
                // Prioritize the relation object's ID
                processedData[foreignKeyField] = data[relationField].id;
            }
        }
        return processedData;
    }
    static async hydrateDataFields(model, collections_to_models, relOneData, seriesHydrationfields, fullDataMode, data) {
        const timeSeriesIds = TimeSeriesUtils_1.TimeSeriesUtils.getTimeSeriesModelFields(model);
        // Build a set of foreign key field names to skip
        const foreignKeyFields = new Set();
        for (const relationName in relOneData) {
            const relationMeta = relOneData[relationName];
            if (relationMeta.hydrationField) {
                foreignKeyFields.add(relationMeta.hydrationField);
            }
        }
        // Get ignored keys from model's @RWSCollection decorator
        const ignoredKeys = (model).constructor._CUT_KEYS || [];
        for (const key in data) {
            if (data.hasOwnProperty(key)) {
                if (!fullDataMode && ignoredKeys.includes(key)) {
                    continue;
                }
                // Skip relation property names
                if (Object.keys(relOneData).includes(key)) {
                    continue;
                }
                // Skip foreign key field names
                if (foreignKeyFields.has(key)) {
                    continue;
                }
                if (seriesHydrationfields.includes(key)) {
                    continue;
                }
                const timeSeriesMetaData = timeSeriesIds[key];
                if (timeSeriesMetaData) {
                    model[key] = data[key];
                    // Create model instances from provided time series data if available
                    const timeSeriesDataField = timeSeriesMetaData.hydrationField;
                    if (data[timeSeriesDataField] && Array.isArray(data[timeSeriesDataField])) {
                        const seriesModel = collections_to_models[timeSeriesMetaData.collection];
                        const modelInstances = [];
                        for (const seriesItemData of data[timeSeriesDataField]) {
                            const instanceData = typeof seriesItemData === 'object' ? seriesItemData : { id: seriesItemData };
                            const instance = new seriesModel();
                            for (const prop in instanceData) {
                                if (instanceData.hasOwnProperty(prop)) {
                                    instance[prop] = instanceData[prop];
                                }
                            }
                            modelInstances.push(instance);
                        }
                        model[timeSeriesDataField] = modelInstances;
                        seriesHydrationfields.push(timeSeriesDataField);
                    }
                }
                else {
                    model[key] = data[key];
                }
            }
        }
    }
    static async hydrateRelations(model, relManyData, relOneData, seriesHydrationfields, fullDataMode, data, postLoadExecute = false) {
        const ignoredKeys = (model).constructor._CUT_KEYS || [];
        // Handle many-to-many relations using provided nested data
        for (const key in relManyData) {
            if (!fullDataMode && ignoredKeys.includes(key)) {
                continue;
            }
            const relMeta = relManyData[key];
            const relationEnabled = !RelationUtils_1.RelationUtils.checkRelDisabled(model, relMeta.key);
            if (relationEnabled && data[relMeta.key]) {
                // Create model instances from provided relation data
                const relationData = data[relMeta.key];
                if (relMeta.singular) {
                    // Single related model
                    if (relationData && typeof relationData === 'object') {
                        const instance = new relMeta.inversionModel();
                        for (const prop in relationData) {
                            if (relationData.hasOwnProperty(prop)) {
                                instance[prop] = relationData[prop];
                            }
                        }
                        model[relMeta.key] = instance;
                    }
                }
                else {
                    // Multiple related models
                    if (Array.isArray(relationData)) {
                        const instances = [];
                        for (const itemData of relationData) {
                            if (itemData && typeof itemData === 'object') {
                                const instance = new relMeta.inversionModel();
                                for (const prop in itemData) {
                                    if (itemData.hasOwnProperty(prop)) {
                                        instance[prop] = itemData[prop];
                                    }
                                }
                                instances.push(instance);
                            }
                        }
                        model[relMeta.key] = instances;
                    }
                }
            }
        }
        // Handle one-to-one relations using provided nested data
        for (const key in relOneData) {
            if (!fullDataMode && ignoredKeys.includes(key)) {
                continue;
            }
            const relMeta = relOneData[key];
            const relationEnabled = !RelationUtils_1.RelationUtils.checkRelDisabled(model, relMeta.key);
            // If relation data is directly provided in the data object
            if (relationEnabled && data[relMeta.key]) {
                const relationData = data[relMeta.key];
                if (relationData && typeof relationData === 'object') {
                    const instance = new relMeta.model();
                    for (const prop in relationData) {
                        if (relationData.hasOwnProperty(prop)) {
                            instance[prop] = relationData[prop];
                        }
                    }
                    model[relMeta.key] = instance;
                }
            }
            // Handle case where we only have foreign key but relation is required
            else if (!data[relMeta.hydrationField] && relMeta.required) {
                // Only throw error if this is a fresh load AND we're not in creation mode
                // During creation, required relations might not have their foreign key set yet
                if (!model.id && data[relMeta.key]) {
                    // We have the relation object but not the foreign key - this is okay during creation
                    continue;
                }
                else if (!model.id && !data[relMeta.key]) {
                    throw new Error(`Required relation "${relMeta.key}" is missing in model ${model.constructor.name}.`);
                }
                // For existing models (reloads), skip loading this relation if the field is missing
                continue;
            }
            const cutKeys = ignoredKeys;
            const trackedField = Object.keys((await ModelUtils_1.ModelUtils.getModelAnnotations(model.constructor))).includes(relMeta.hydrationField);
            if (!cutKeys.includes(relMeta.hydrationField) && !trackedField) {
                cutKeys.push(relMeta.hydrationField);
            }
        }
    }
    /**
     * Get all database fields for a model excluding ignored ones
     */
    static async getFieldsExcludingIgnored(modelClass, ignoredKeys) {
        if (!ignoredKeys || ignoredKeys.length === 0) {
            return undefined;
        }
        // Get proper database fields from model annotations
        const tempInstance = new modelClass();
        const annotations = await ModelUtils_1.ModelUtils.getModelAnnotations(modelClass);
        // Get scalar fields (TrackType decorated fields)
        const scalarFields = ModelUtils_1.ModelUtils.getModelScalarFields(tempInstance);
        // Get relation fields from annotations
        const relationFields = Object.keys(annotations).filter(key => annotations[key].annotationType === 'Relation' ||
            annotations[key].annotationType === 'InverseRelation');
        // Combine all database fields
        const allDbFields = [...scalarFields, ...relationFields];
        // Filter out ignored keys
        const filteredFields = allDbFields.filter(field => !ignoredKeys.includes(field));
        // Always include id if not ignored
        if (!filteredFields.includes('id') && !ignoredKeys.includes('id')) {
            filteredFields.push('id');
        }
        return filteredFields.length > 0 ? filteredFields : undefined;
    }
}
exports.HydrateUtils = HydrateUtils;
