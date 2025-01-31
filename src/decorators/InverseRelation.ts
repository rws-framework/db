import 'reflect-metadata';
import { RWSModel, OpModelType } from '../models/_model';

interface InverseRelationOpts{
    key: string,
    inversionModel: OpModelType<RWSModel<any>>,
    foreignKey: string    
  }

  function InverseRelation(inversionModel: () => OpModelType<RWSModel<any>>, sourceModel: () => OpModelType<RWSModel<any>>, foreignKey: string = null) {    
    return function(target: any, key: string) {     
        // Store the promise in metadata immediately
        const metadataPromise = Promise.resolve().then(() => {
            const model = inversionModel();
            const source = sourceModel();
    
            const metaOpts: InverseRelationOpts = {
                key,
                inversionModel: model,
                foreignKey: foreignKey ? foreignKey : `${source._collection}_id`
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