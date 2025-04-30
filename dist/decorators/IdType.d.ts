import 'reflect-metadata';
import { IIdTypeOpts } from '../models/interfaces/IIdTypeOpts';
export interface IIdMetaOpts extends IIdTypeOpts {
    type: any;
}
declare function IdType(type: any, opts?: IIdTypeOpts | null, tags?: string[]): (target: any, key: string) => void;
export default IdType;
export { IIdTypeOpts };
