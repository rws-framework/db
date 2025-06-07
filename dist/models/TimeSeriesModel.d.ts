import { RWSModel } from './_model';
export default class TimeSeriesModel<ChildClass> extends RWSModel<TimeSeriesModel<ChildClass>> {
    value: number;
    timestamp: Date;
    params: any;
    constructor(data?: any);
}
