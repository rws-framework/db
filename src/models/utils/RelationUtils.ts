import { RelOneMetaType, RelManyMetaType } from '../types/RelationTypes';
import { IRWSModel } from '../../types/IRWSModel';
import { OpModelType, RWSModel } from '../_model';
import { ModelUtils } from './ModelUtils';
import { IRelationOpts } from 'src/decorators/Relation';

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
                        foreignKey: resolvedMetadata.relatedToField,
                        cascade: resolvedMetadata.cascade
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
                        foreignKey: resolvedMetadata.foreignKey,     
                        singular: resolvedMetadata?.singular || false             
                    };
                }
            }                         
        } 
    
        return relIds;
    }

    static bindRelation(relatedModel: RWSModel<any>): { connect: { id: string | number } } | null {    
        if(!relatedModel || !relatedModel.id){
            return null;
        }

        return {
            connect: {
                id: relatedModel.id
            }
        };
    }

    static async hasRelation(constructor: any, variable: string): Promise<boolean> {
        const dbAnnotations = await ModelUtils.getModelAnnotations(constructor);
        type AnnotationType = { annotationType: string, key: string };
    
        const dbProperties: string[] = Object.keys(dbAnnotations)
            .map((key: string): AnnotationType => {return {...dbAnnotations[key], key};})
            .filter((element: AnnotationType) => element.annotationType === 'Relation' )
            .map((element: AnnotationType) => element.key);
    
        return dbProperties.includes(variable);
    }

    static async getRelationKey(constructor: any, variable: string): Promise<string | null> {
        const dbAnnotations = await ModelUtils.getModelAnnotations(constructor);
        type AnnotationType = { annotationType: string, key: string };
    
        const relationMeta = Object.keys(dbAnnotations)
            .map((key: string) => {return {...dbAnnotations[key], key};})
            .filter((element: AnnotationType) => element.annotationType === 'Relation' )
            .find((element: AnnotationType) => element.key === variable) as unknown as { metadata: IRelationOpts };
        ;
        

        if(!relationMeta){
            return null;
        }
    
        return relationMeta.metadata.relationField;
    }

    static checkRelDisabled(model: RWSModel<any>, key: string): boolean {
        const constructor = model.constructor as OpModelType<any>;

        let declaredRelations: string[] = [];

        for(const relKey in constructor._RELATIONS){
            const relEntry = constructor._RELATIONS[relKey];

            if(relEntry === true){
                declaredRelations.push(relKey);
            }
        }

        // if((model.constructor as OpModelType<any>)._collection === 'product'){
        //     console.log({key, declaredRelations});
        //  }         

        // A relation disabled through declared relations
        if(declaredRelations.length && !declaredRelations.includes(key)){
            return true;
        }

        // A relation disabled directly
        return Object.keys(constructor._RELATIONS).includes(key) && constructor._RELATIONS[key] === false;
    }
}
