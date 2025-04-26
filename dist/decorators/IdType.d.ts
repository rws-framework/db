import 'reflect-metadata';
import { ITrackerOpts } from '../models/interfaces/ITrackerOpts';
interface IIdTypeOpts {
    dbOptions?: ITrackerOpts['dbOptions'];
}
interface IMetaOpts extends ITrackerOpts {
    type: any;
}
declare function IdType(type: any, opts?: IIdTypeOpts | null, tags?: string[]): (target: any, key: string) => void;
export default IdType;
export { IMetaOpts, IIdTypeOpts };
