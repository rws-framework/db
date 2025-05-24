import 'reflect-metadata';
import { RWSModel, OpModelType } from '../models/_model';
import { ModelUtils } from '../models/utils/ModelUtils';

export interface InverseRelationOpts {
    key: string,
    inversionModel: OpModelType<RWSModel<any>>
    foreignKey: string
    singular?: boolean
    relationName?: string
    mappingName?: string
}

function guessForeignKey(inversionModel: OpModelType<RWSModel<any>>, bindingModel: OpModelType<RWSModel<any>>, decoratorsData: any)
{
    let key: string | null = null;
    let defaultKey = `${bindingModel._collection}_id`;  

    const relDecorators: Record<string, {
        annotationType: string;
        metadata: any;
    }> = {};

    const trackDecorators: Record<string, {
        annotationType: string;
        metadata: any;
    }> = {};

    if(Object.keys(trackDecorators).includes(key)){
        return key;
    }

    for(const decKey of Object.keys(decoratorsData)){
        const dec = decoratorsData[decKey];
        if(dec.annotationType === 'Relation'){
            relDecorators[decKey] = dec;
        }      
        if(dec.annotationType === 'TrackType'){
            trackDecorators[decKey] = dec;
        }                
    }

    for(const relKey of Object.keys(relDecorators)){
        const prodMeta = relDecorators[relKey]?.metadata;
        if(prodMeta && prodMeta.relatedTo._collection === bindingModel._collection){            
            return prodMeta.relationField;
        }
    }

    return key;
}

function InverseRelation(inversionModel: () => OpModelType<RWSModel<any>>, sourceModel: () => OpModelType<RWSModel<any>>, relationOptions: Partial<InverseRelationOpts> = null) {
    return function (target: any, key: string) {
        const metadataPromise = Promise.resolve().then(async () => {
            const model = inversionModel();
            const source = sourceModel();
            const decoratorsData = await ModelUtils.getModelAnnotations(model);           

            const metaOpts: InverseRelationOpts = {
                ...relationOptions,
                key,                
                inversionModel: model,
                foreignKey: relationOptions && relationOptions.foreignKey ? relationOptions.foreignKey : guessForeignKey(model, source, decoratorsData),
                // Generate a unique relation name if one is not provided
                relationName: relationOptions && relationOptions.relationName ?
                    relationOptions.relationName :
                    null
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
