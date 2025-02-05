"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
function InverseTimeSeries(timeSeriesModel, hydrationField) {
    const metaOpts = {
        timeSeriesModel: timeSeriesModel,
        hydrationField: hydrationField
    };
    return function (target, key) {
        Reflect.defineMetadata(`InverseTimeSeries:${key}`, metaOpts, target);
    };
}
exports.default = InverseTimeSeries;
