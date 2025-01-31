import 'reflect-metadata';
import { OpModelType } from '../models/_model';

interface ITrackerOpts{
    required?: boolean,
    relationField?: string
    relatedToField?: string,
    relatedTo?: OpModelType<any>,
    inversionModel?: OpModelType<any>,
    relationName?: string
  }
  
  interface IMetaOpts extends ITrackerOpts{
    type: any,
    tags: string[]
  }
  
function TrackType(type: any, opts: ITrackerOpts | null = null, tags: string[] = []) {
    if(!opts){
        opts = {
            required: false
        };
    }
  
    const required = opts.required;
  
    const metaOpts: IMetaOpts = {type, tags, required};
  
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