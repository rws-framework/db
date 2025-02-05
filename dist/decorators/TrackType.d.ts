import 'reflect-metadata';
import { OpModelType } from '../models/_model';
interface ITrackerOpts {
    required?: boolean;
    relationField?: string;
    relatedToField?: string;
    relatedTo?: OpModelType<any>;
    inversionModel?: OpModelType<any>;
    relationName?: string;
}
interface IMetaOpts extends ITrackerOpts {
    type: any;
    tags: string[];
}
declare function TrackType(type: any, opts?: ITrackerOpts | null, tags?: string[]): (target: any, key: string) => void;
export default TrackType;
export { IMetaOpts, ITrackerOpts };
