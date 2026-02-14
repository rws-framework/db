import { RWSModel } from "../core/RWSModel";
import { RelManyMetaType, RelOneMetaType } from "../types/RelationTypes";
import { IRWSModel } from "../../types/IRWSModel";
export declare class HydrateUtils {
    /**
     * Preprocess database data to convert foreign keys to relation objects when relations are not already populated
     */
    static preprocessForeignKeys(data: any, model: RWSModel<any>, relOneData: RelOneMetaType<IRWSModel>): Promise<any>;
    static hydrateDataFields(model: RWSModel<any>, collections_to_models: {
        [key: string]: any;
    }, relOneData: RelOneMetaType<IRWSModel>, seriesHydrationfields: string[], fullDataMode: boolean, data: {
        [key: string]: any;
    }): Promise<void>;
    static hydrateRelations(model: RWSModel<any>, relManyData: RelManyMetaType<IRWSModel>, relOneData: RelOneMetaType<IRWSModel>, seriesHydrationfields: string[], fullDataMode: boolean, data: {
        [key: string]: any;
    }, postLoadExecute?: boolean): Promise<void>;
    /**
     * Get all database fields for a model excluding ignored ones
     */
    private static getFieldsExcludingIgnored;
}
