import 'reflect-metadata';
import { RWSModel, OpModelType } from '../models/_model';

interface InverseRelationOpts{
    key: string,
    inversionModel: OpModelType<RWSModel<any>>,
    foreignKey: string,
    singular?: boolean    
    relationName?: string
  }

  function InverseRelation(inversionModel: () => OpModelType<RWSModel<any>>, sourceModel: () => OpModelType<RWSModel<any>>, relationOptions: Partial<InverseRelationOpts> = null) {    
    return function(target: any, key: string) {             
        const metadataPromise = Promise.resolve().then(() => {
            const model = inversionModel();
            const source = sourceModel();
    
            const metaOpts: InverseRelationOpts = {
                ...relationOptions,
                key,
                inversionModel: model,
                foreignKey: relationOptions && relationOptions.foreignKey ? relationOptions.foreignKey : `${source._collection}_id`,
                // Generate a unique relation name if one is not provided
                relationName: relationOptions && relationOptions.relationName ? 
                  relationOptions.relationName.toLowerCase() : 
                  `${model._collection}_${key}_${source._collection}`.toLowerCase()
            };             
    
            return metaOpts;
        });

        // Store both the promise and the key information
        Reflect.defineMetadata(`InverseRelation:${key}`, {
            promise: metadataPromise,
            key
        }, target);
    };
}

export default InverseRelation;
export {InverseRelationOpts};
