import RWSModel, { TrackType as RWSTrackType } from '../models/_model';

export default class TimeSeriesModel<ChildClass> extends RWSModel<TimeSeriesModel<ChildClass>>{
    @RWSTrackType(Number) value: number;

    @RWSTrackType(Date) timestamp: Date;
    
    @RWSTrackType(Object)
        params: any;

    constructor(data?: any) {    
        super(data);

        if(!this.timestamp) {
            this.timestamp = new Date();
        }
    }
}