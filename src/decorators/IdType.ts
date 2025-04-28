import 'reflect-metadata';
import { ITrackerOpts } from '../models/interfaces/ITrackerOpts';
import { IIdTypeOpts } from '../models/interfaces/IIdTypeOpts';
  
interface IMetaOpts extends ITrackerOpts {
    type: any,
}
  
function IdType(type: any, opts: IIdTypeOpts | null = null, tags: string[] = []) {   
    const metaOpts: IMetaOpts = { type: 'id' };
    return function(target: any, key: string) {          
        Reflect.defineMetadata(`IdType:${key}`, metaOpts, target);
    };
}

export default IdType;
export {IMetaOpts, IIdTypeOpts};
