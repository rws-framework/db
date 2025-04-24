import 'reflect-metadata';
import { OpModelType } from '../models/interfaces/OpModelType';

interface ITrackerOpts{
    required?: boolean,
    isArray?: boolean,
    relationField?: string,
    relatedToField?: string,
    relatedTo?: OpModelType<any>,
    inversionModel?: OpModelType<any>,
    relationName?: string,
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
    }
  }
  
  interface IMetaOpts extends ITrackerOpts{
    type: any,
    tags: string[],
    required: boolean,
    isArray: boolean
  }
  
function TrackType(type: any, opts: ITrackerOpts | null = null, tags: string[] = []) {
    if(!opts){
        opts = {
            required: false,
            isArray: false
        };
    }
    
    if(!opts?.required){
        opts.required = false;
    }

    if(!opts?.isArray){
        opts.isArray = false;
    }
  
    const required = opts.required;
    const isArray = opts.isArray;
  
    const metaOpts: IMetaOpts = {type, tags, required, isArray};
  
    if(opts.relatedToField && opts.relatedTo){
        metaOpts.relatedToField = opts.relatedToField;      
        metaOpts.relatedTo = opts.relatedTo;

        if(!opts.relationField){
            metaOpts.relationField = opts.relatedTo + '_id';
        } else{
            metaOpts.relationField = opts.relationField;
        }
    }     
  
    if(opts.inversionModel){
        metaOpts.inversionModel = opts.inversionModel;  
    }
    
    // Copy dbOptions if present
    if(opts.dbOptions){
        metaOpts.dbOptions = opts.dbOptions;
    }
  
    //const resolvedType = typeof type === 'function' ? type() : type;   
    
    if(type._collection){    
        metaOpts.type = (type as any);
    }
  
    return function(target: any, key: string) {          
        Reflect.defineMetadata(`TrackType:${key}`, metaOpts, target);
    };
}

export default TrackType;
export {IMetaOpts, ITrackerOpts};
