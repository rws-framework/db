import 'reflect-metadata';
import { OpModelType } from '../models/interfaces/OpModelType';
interface ITrackerOpts {
    required?: boolean;
    isArray?: boolean;
    relationField?: string;
    relatedToField?: string;
    relatedTo?: OpModelType<any>;
    inversionModel?: OpModelType<any>;
    relationName?: string;
    dbOptions?: {
        mysql?: {
            useText?: boolean;
            maxLength?: number;
            useUuid?: boolean;
        };
        postgres?: {
            useText?: boolean;
            useUuid?: boolean;
        };
        mongodb?: {
            customType?: string;
        };
    };
}
interface IMetaOpts extends ITrackerOpts {
    type: any;
    tags: string[];
    required: boolean;
    isArray: boolean;
}
declare function TrackType(type: any, opts?: ITrackerOpts | null, tags?: string[]): (target: any, key: string) => void;
export default TrackType;
export { IMetaOpts, ITrackerOpts };
