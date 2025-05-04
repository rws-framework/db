import 'reflect-metadata';
import { ITrackerOpts } from '../models/interfaces/ITrackerOpts';
import { IIdTypeOpts } from '../models/interfaces/IIdTypeOpts';
  
export interface IIdMetaOpts extends IIdTypeOpts {
    type: any,
}
  
function IdType(type: any, opts: IIdTypeOpts | null = null, tags: string[] = []) {   
    const metaOpts: IIdMetaOpts = { type, dbOptions: opts && opts.dbOptions ? opts.dbOptions : null };
    
    if(opts && opts.dbOptions){
        metaOpts.dbOptions = opts.dbOptions;
    }

    if(opts && opts.noAuto){
        metaOpts.noAuto = opts.noAuto;
    }

    return function(target: any, key: string) {                  
        Reflect.defineMetadata(`IdType:${key}`, metaOpts, target);
    };
}

export default IdType;
export { IIdTypeOpts};
