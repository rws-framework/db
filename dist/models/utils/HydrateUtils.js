"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HydrateUtils = void 0;
const TimeSeriesUtils_1 = require("./TimeSeriesUtils");
const RelationUtils_1 = require("./RelationUtils");
const ModelUtils_1 = require("./ModelUtils");
class HydrateUtils {
    static async hydrateDataFields(model, collections_to_models, relOneData, seriesHydrationfields, fullDataMode, data) {
        const timeSeriesIds = TimeSeriesUtils_1.TimeSeriesUtils.getTimeSeriesModelFields(model);
        for (const key in data) {
            if (data.hasOwnProperty(key)) {
                if (!fullDataMode && (model).constructor._CUT_KEYS.includes(key)) {
                    continue;
                }
                if (Object.keys(relOneData).includes(key)) {
                    continue;
                }
                if (seriesHydrationfields.includes(key)) {
                    continue;
                }
                const timeSeriesMetaData = timeSeriesIds[key];
                if (timeSeriesMetaData) {
                    model[key] = data[key];
                    const seriesModel = collections_to_models[timeSeriesMetaData.collection];
                    const dataModels = await seriesModel.findBy({
                        id: { in: data[key] }
                    });
                    seriesHydrationfields.push(timeSeriesMetaData.hydrationField);
                    model[timeSeriesMetaData.hydrationField] = dataModels;
                }
                else {
                    model[key] = data[key];
                }
            }
        }
    }
    static async hydrateRelations(model, relManyData, relOneData, seriesHydrationfields, fullDataMode, data) {
        // Handle many-to-many relations
        for (const key in relManyData) {
            if (!fullDataMode && model.constructor._CUT_KEYS.includes(key)) {
                continue;
            }
            const relMeta = relManyData[key];
            //  console.log({relMeta});
            const relationEnabled = !RelationUtils_1.RelationUtils.checkRelDisabled(model, relMeta.key);
            if (relationEnabled) {
                model[relMeta.key] = await relMeta.inversionModel.findBy({
                    conditions: {
                        [relMeta.foreignKey]: data.id
                    },
                    allowRelations: false
                });
            }
        }
        // Handle one-to-one relations
        for (const key in relOneData) {
            if (!fullDataMode && model.constructor._CUT_KEYS.includes(key)) {
                continue;
            }
            const relMeta = relOneData[key];
            const relationEnabled = !RelationUtils_1.RelationUtils.checkRelDisabled(model, relMeta.key);
            if (!data[relMeta.hydrationField] && relMeta.required) {
                throw new Error(`Relation field "${relMeta.hydrationField}" is required in model ${this.constructor.name}.`);
            }
            if (relationEnabled && data[relMeta.hydrationField]) {
                model[relMeta.key] = await relMeta.model.findOneBy({ conditions: { [relMeta.foreignKey]: data[relMeta.hydrationField] } }, { allowRelations: false });
            }
            else if (relationEnabled && !data[relMeta.hydrationField] && data[relMeta.key]) {
                const newRelModel = await relMeta.model.create(data[relMeta.key]);
                model[relMeta.key] = await newRelModel.save();
            }
            const cutKeys = model.constructor._CUT_KEYS;
            const trackedField = Object.keys((await ModelUtils_1.ModelUtils.getModelAnnotations(model.constructor))).includes(relMeta.hydrationField);
            if (!cutKeys.includes(relMeta.hydrationField) && !trackedField) {
                cutKeys.push(relMeta.hydrationField);
            }
            // seriesHydrationfields.push(relMeta.hydrationField);
        }
    }
}
exports.HydrateUtils = HydrateUtils;
