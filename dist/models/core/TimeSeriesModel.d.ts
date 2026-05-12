import { RWSModel } from './RWSModel';
export default class TimeSeriesModel<T> extends RWSModel<T> {
    value: number;
    timestamp: Date;
    params: any;
    constructor(data?: any);
}
