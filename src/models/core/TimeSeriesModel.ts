import { RWSModel } from './RWSModel';
import { TrackType } from '../../decorators';

export default class TimeSeriesModel<ChildClass> extends RWSModel<TimeSeriesModel<ChildClass>> {
    @TrackType(Number) value: number;

    @TrackType(Date) timestamp: Date;
    
    @TrackType(Object)
    params: any;

    constructor(data?: any) {    
        super(data);

        if(!this.timestamp) {
            this.timestamp = new Date();
        }
    }
}
