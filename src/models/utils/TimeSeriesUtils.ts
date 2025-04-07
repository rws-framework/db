import { RWSModel } from "../_model";

export class TimeSeriesUtils {
    static getTimeSeriesModelFields(model: RWSModel<any>): {[key: string]: {collection: string, hydrationField: string, ids: string[]}} {
        const timeSeriesIds: {[key: string]: {collection: string, hydrationField: string, ids: string[]}} = {};

        for (const key in model) {
            if (model.hasOwnProperty(key)) {             
                const meta = Reflect.getMetadata(`InverseTimeSeries:${key}`, model);            
                if(meta){
                    if(!timeSeriesIds[key]){
                        timeSeriesIds[key] = {
                            collection: meta.timeSeriesModel,
                            hydrationField: meta.hydrationField,
                            ids: model[key]
                        };
                    }
                }                         
            }
        } 

        return timeSeriesIds;
    }

    static checkTimeSeries(constructor: any): boolean {            
        const data = constructor.prototype as any;

        for (const key in data) {
            if (data.hasOwnProperty(key)) {   
                if(Reflect.getMetadata(`InverseTimeSeries:${key}`, constructor.prototype)){
                    return true;
                }
            }
        }

        return false;
    }
}
