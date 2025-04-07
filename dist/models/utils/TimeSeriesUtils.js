"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimeSeriesUtils = void 0;
class TimeSeriesUtils {
    static getTimeSeriesModelFields(model) {
        const timeSeriesIds = {};
        for (const key in model) {
            if (model.hasOwnProperty(key)) {
                const meta = Reflect.getMetadata(`InverseTimeSeries:${key}`, model);
                if (meta) {
                    if (!timeSeriesIds[key]) {
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
    static checkTimeSeries(constructor) {
        const data = constructor.prototype;
        for (const key in data) {
            if (data.hasOwnProperty(key)) {
                if (Reflect.getMetadata(`InverseTimeSeries:${key}`, constructor.prototype)) {
                    return true;
                }
            }
        }
        return false;
    }
}
exports.TimeSeriesUtils = TimeSeriesUtils;
