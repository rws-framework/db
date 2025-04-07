import { RWSModel } from "../_model";
export declare class TimeSeriesUtils {
    static getTimeSeriesModelFields(model: RWSModel<any>): {
        [key: string]: {
            collection: string;
            hydrationField: string;
            ids: string[];
        };
    };
    static checkTimeSeries(constructor: any): boolean;
}
