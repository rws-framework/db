import 'reflect-metadata';
import { RWSModel, OpModelType } from '../models/_model';

export type CascadingSetup = 'Cascade' | 'Restrict' | 'NoAction' | 'SetNull';

export interface IRelationOpts {
    required?: boolean
    key: string
    relationField: string
    relatedToField?: string
    mappingName?: string
    relatedTo: OpModelType<RWSModel<any>>
    many?: boolean
    embed?: boolean
    useUuid?: boolean
    relationName?: string
    cascade?: {
        onDelete?: CascadingSetup,
        onUpdate?: CascadingSetup
    }
}

const _DEFAULT_CASCADE = { onDelete: 'SetNull', onUpdate: 'Cascade' };

const _DEFAULTS: Partial<IRelationOpts> = { required: false, many: false, embed: false, cascade: null};
  
function Relation(theModel: () => OpModelType<RWSModel<any>>, relationOptions: Partial<IRelationOpts> = _DEFAULTS) {
    return function(target: any, key: string) {     
        // Store the promise in metadata immediately
        
        const metadataPromise = Promise.resolve().then(() => {          
            const relatedTo = theModel();

            const metaOpts: IRelationOpts = {
                ...relationOptions, 
                cascade: relationOptions.cascade || _DEFAULTS.cascade,
                relatedTo,
                relationField: relationOptions.relationField ? relationOptions.relationField : relatedTo._collection + '_id',
                key,
                // Generate a unique relation name if one is not provided
                relationName: relationOptions.relationName ? 
                  relationOptions.relationName.toLowerCase() : 
                  `${target.constructor.name.toLowerCase()}_${key}_${relatedTo._collection.toLowerCase()}`
            };  
            
            if(relationOptions.required){
                metaOpts.cascade.onDelete = 'Restrict';
            }

            return metaOpts;
        });

        // Store both the promise and the key information
        Reflect.defineMetadata(`Relation:${key}`, {
            promise: metadataPromise,
            key
        }, target);
    };
}


export default Relation;

