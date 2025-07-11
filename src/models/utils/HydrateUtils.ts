import { RWSModel } from "../core/RWSModel";
import { RelManyMetaType, RelOneMetaType } from "../types/RelationTypes";
import { IRWSModel } from "../../types/IRWSModel";
import { TimeSeriesUtils } from "./TimeSeriesUtils";
import { RelationUtils } from "./RelationUtils";
import { OpModelType } from "..";
import { ModelUtils } from "./ModelUtils";
import chalk from 'chalk';

export class HydrateUtils {
    static async hydrateDataFields(model: RWSModel<any>, collections_to_models: { [key: string]: any }, relOneData: RelOneMetaType<IRWSModel>, seriesHydrationfields: string[], fullDataMode: boolean, data: { [key: string]: any }) {
        const timeSeriesIds = TimeSeriesUtils.getTimeSeriesModelFields(model);
        for (const key in data) {
            if (data.hasOwnProperty(key)) {
                if (!fullDataMode && ((model).constructor as OpModelType<any>)._CUT_KEYS.includes(key)) {
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
                } else {
                    model[key] = data[key];
                }
            }
        }       
    }

    static async hydrateRelations(model: RWSModel<any>, relManyData: RelManyMetaType<IRWSModel>, relOneData: RelOneMetaType<IRWSModel>, seriesHydrationfields: string[], fullDataMode: boolean, data: { [key: string]: any }, postLoadExecute = false) {
        // Handle many-to-many relations
        for (const key in relManyData) {
            if (!fullDataMode && (model as any).constructor._CUT_KEYS.includes(key)) {
                continue;
            }

            const relMeta = relManyData[key];

            const relationEnabled = !RelationUtils.checkRelDisabled(model, relMeta.key);



            if (relationEnabled) {
                const pk = ModelUtils.findPrimaryKeyFields(model.constructor as OpModelType<any>) as string;

                if (relMeta.singular) {
                    model[relMeta.key] = await relMeta.inversionModel.findOneBy({
                        conditions: {
                            [relMeta.foreignKey]: data[pk]
                        },
                        allowRelations: false,
                        cancelPostLoad: !postLoadExecute
                    });
                } else {
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
            if (!fullDataMode && ((model as any).constructor as OpModelType<any>)._CUT_KEYS.includes(key)) {
                continue;
            }

            const relMeta = relOneData[key];
            const relationEnabled = !RelationUtils.checkRelDisabled(model, relMeta.key);

            if (!data[relMeta.hydrationField] && relMeta.required) {
                throw new Error(`Relation field "${relMeta.hydrationField}" is required in model ${this.constructor.name}.`)
            }

            if (relationEnabled && data[relMeta.hydrationField]) {
                const pk = ModelUtils.findPrimaryKeyFields(relMeta.model);

                const where: any = {};

                if (Array.isArray(pk)) {
                    console.log(chalk.yellowBright(`Hydration field "${relMeta.hydrationField}" on model "${model.constructor.name}" leads to compound key. Ignoring.`));
                    continue;
                } else {
                    where[pk as string] = data[relMeta.hydrationField]
                }

                model[relMeta.key] = await relMeta.model.findOneBy({ conditions: where }, { allowRelations: false });
            }
            else if (relationEnabled && !data[relMeta.hydrationField] && data[relMeta.key]) {
                const newRelModel: RWSModel<any> = await relMeta.model.create(data[relMeta.key]);
                model[relMeta.key] = await newRelModel.save();
            }

            const cutKeys = ((model.constructor as OpModelType<any>)._CUT_KEYS as string[]);

            const trackedField = Object.keys((await ModelUtils.getModelAnnotations(model.constructor as OpModelType<any>))).includes(relMeta.hydrationField);

            if (!cutKeys.includes(relMeta.hydrationField) && !trackedField) {
                cutKeys.push(relMeta.hydrationField)
            }

            // seriesHydrationfields.push(relMeta.hydrationField);
        }
    }
}
