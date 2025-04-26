import 'reflect-metadata';
import { ITrackerOpts } from '../models/interfaces/ITrackerOpts';
interface IMetaOpts extends ITrackerOpts {
    type: any;
    tags: string[];
}
declare function TrackType(type: any, opts?: ITrackerOpts | null, tags?: string[]): (target: any, key: string) => void;
export default TrackType;
export { IMetaOpts };
