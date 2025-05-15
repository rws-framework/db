import { RWSModel } from "../core/RWSModel";
import { RelManyMetaType, RelOneMetaType } from "../types/RelationTypes";
import { IRWSModel } from "../../types/IRWSModel";
export declare class HydrateUtils {
    static hydrateDataFields(model: RWSModel<any>, collections_to_models: {
        [key: string]: any;
    }, relOneData: RelOneMetaType<IRWSModel>, seriesHydrationfields: string[], fullDataMode: boolean, data: {
        [key: string]: any;
    }): Promise<void>;
    static hydrateRelations(model: RWSModel<any>, relManyData: RelManyMetaType<IRWSModel>, relOneData: RelOneMetaType<IRWSModel>, seriesHydrationfields: string[], fullDataMode: boolean, data: {
        [key: string]: any;
    }): Promise<void>;
}
