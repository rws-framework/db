import 'reflect-metadata';
interface InverseTimeSeriesOpts {
    timeSeriesModel: string;
    hydrationField: string;
}
declare function InverseTimeSeries(timeSeriesModel: string, hydrationField: string): (target: any, key: string) => void;
export default InverseTimeSeries;
export { InverseTimeSeriesOpts };
