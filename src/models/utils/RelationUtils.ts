import { RelOneMetaType, RelManyMetaType } from '../types/RelationTypes';
import { IRWSModel } from '../../types/IRWSModel';
import { RWSModel } from '../_model';

export class RelationUtils {
    static async getRelationOneMeta(model: RWSModel<any>, classFields: string[]): Promise<RelOneMetaType<IRWSModel>> {
        const relIds: RelOneMetaType<IRWSModel> = {};
        const relationFields = classFields
            .filter((item: string) => item.indexOf('Relation') === 0 && !item.includes('Inverse'))
            .map((item: string) => item.split(':').at(-1));        
    
        for (const key of relationFields) {  
            const metadataKey = `Relation:${key}`;
            const metadata = Reflect.getMetadata(metadataKey, model);                 
            
            if (metadata && metadata.promise) {
                const resolvedMetadata = await metadata.promise;
                if (!relIds[key]) {
                    relIds[key] = {
                        key: resolvedMetadata.key,
                        required: resolvedMetadata.required,
                        model: resolvedMetadata.relatedTo,
                        hydrationField: resolvedMetadata.relationField,
                        foreignKey: resolvedMetadata.relatedToField
                    };
                }
            }                         
        } 
    
        return relIds;
    }

    static async getRelationManyMeta(model: RWSModel<any>, classFields: string[]): Promise<RelManyMetaType<IRWSModel>> {
        const relIds: RelManyMetaType<IRWSModel> = {};
    
        const inverseFields = classFields
            .filter((item: string) => item.indexOf('InverseRelation') === 0)
            .map((item: string) => item.split(':').at(-1));
                
        for (const key of inverseFields) {          
            const metadataKey = `InverseRelation:${key}`;
            const metadata = Reflect.getMetadata(metadataKey, model);                            
    
            if (metadata && metadata.promise) {
                const resolvedMetadata = await metadata.promise;
                if (!relIds[key]) {
                    relIds[key] = {       
                        key: resolvedMetadata.key,         
                        inversionModel: resolvedMetadata.inversionModel,
                        foreignKey: resolvedMetadata.foreignKey                   
                    };
                }
            }                         
        } 
    
        return relIds;
    }

    static bindRelation(relatedModel: RWSModel<any>): { connect: { id: string } } {
        return {
            connect: {
                id: relatedModel.id
            }
        };
    }

    static hasRelation(model: RWSModel<any>, key: string): boolean {
        // Check if the property exists and is an object with an id property
        return !!model[key] && typeof model[key] === 'object' && model[key] !== null && 'id' in model[key];
    }

    static checkRelEnabled(model: RWSModel<any>, key: string): boolean {
        return Object.keys((model.constructor as any)._RELATIONS).includes(key) && 
               (model.constructor as any)._RELATIONS[key] === true;
    }
}
