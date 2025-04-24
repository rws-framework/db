import 'reflect-metadata';
import { RWSModel, OpModelType } from '../models/_model';

type CascadingSetup = 'Cascade' | 'Restrict' | 'NoAction' | 'SetNull';

interface IRelationOpts {
    required?: boolean
    key: string
    relationField: string
    relatedToField?: string
    relatedTo: OpModelType<RWSModel<any>>
    many?: boolean
    embed?: boolean
    useUuid?: boolean
    relationName?: string
    cascade: {
        onDelete: CascadingSetup,
        onUpdate: CascadingSetup
    }
}

const _DEFAULTS: Partial<IRelationOpts> = { required: false, many: false, embed: false, cascade: { onDelete: 'SetNull', onUpdate: 'Cascade' }};
  
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
export {IRelationOpts};
