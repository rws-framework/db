"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HydrateUtils = void 0;
const TimeSeriesUtils_1 = require("./TimeSeriesUtils");
const RelationUtils_1 = require("./RelationUtils");
const ModelUtils_1 = require("./ModelUtils");
const chalk_1 = __importDefault(require("chalk"));
class HydrateUtils {
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
        for (const key in data) {
            if (data.hasOwnProperty(key)) {
                if (!fullDataMode && (model).constructor._CUT_KEYS.includes(key)) {
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
    static async hydrateRelations(model, relManyData, relOneData, seriesHydrationfields, fullDataMode, data, postLoadExecute = false) {
        // Handle many-to-many relations
        for (const key in relManyData) {
            if (!fullDataMode && model.constructor._CUT_KEYS.includes(key)) {
                continue;
            }
            const relMeta = relManyData[key];
            const relationEnabled = !RelationUtils_1.RelationUtils.checkRelDisabled(model, relMeta.key);
            if (relationEnabled) {
                const pk = ModelUtils_1.ModelUtils.findPrimaryKeyFields(model.constructor);
                if (relMeta.singular) {
                    model[relMeta.key] = await relMeta.inversionModel.findOneBy({
                        conditions: {
                            [relMeta.foreignKey]: data[pk]
                        },
                        allowRelations: false,
                        cancelPostLoad: !postLoadExecute
                    });
                }
                else {
                    model[relMeta.key] = await relMeta.inversionModel.findBy({
                        conditions: {
                            [relMeta.foreignKey]: data[pk]
                        },
                        allowRelations: false,
                        cancelPostLoad: !postLoadExecute
                    });
                }
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
                const pk = ModelUtils_1.ModelUtils.findPrimaryKeyFields(relMeta.model);
                const where = {};
                if (Array.isArray(pk)) {
                    console.log(chalk_1.default.yellowBright(`Hydration field "${relMeta.hydrationField}" on model "${model.constructor.name}" leads to compound key. Ignoring.`));
                    continue;
                }
                else {
                    where[pk] = data[relMeta.hydrationField];
                }
                model[relMeta.key] = await relMeta.model.findOneBy({ conditions: where }, { allowRelations: false });
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
