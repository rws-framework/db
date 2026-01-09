import { RWSModel } from "../core/RWSModel";
import { FieldsHelper } from '../../helper/FieldsHelper';
import { OpModelType } from "..";
import { ISuperTagData } from "../../decorators/RWSCollection";
import { FindByType } from "../../types/FindParams";

export class ModelUtils {
    static async getModelAnnotations<T extends unknown>(constructor: new () => T): Promise<Record<string, {annotationType: string, metadata: any}>> {    
        const annotationsData: Record<string, {annotationType: string, metadata: any}> = {};
    
        const metadataKeys = Reflect.getMetadataKeys(constructor.prototype);

        const filteredMetaKeys = metadataKeys.filter((metaKey) => {
            const [annotationType, annotatedField] = metaKey.split(':');
            if(annotationType === 'TrackType' && annotatedField === 'id' && metadataKeys.includes('IdType:' + annotatedField)){
                return false;
            }

            return true;
        });
        
        // Process all metadata keys and collect promises
        const metadataPromises = filteredMetaKeys.map(async (fullKey: string) => {
            const [annotationType, propertyKey] = fullKey.split(':');
            const metadata = Reflect.getMetadata(fullKey, constructor.prototype);
    
            if (metadata) {
                // If this is a relation metadata with a promise
                if (metadata.promise && (annotationType === 'Relation' || annotationType === 'InverseRelation')) {
                    const resolvedMetadata = await metadata.promise;
                    annotationsData[propertyKey] = {
                        annotationType,
                        metadata: resolvedMetadata
                    };
                } else {
                    // Handle non-relation metadata as before
                    const key = metadata.key || propertyKey;
                    annotationsData[key] = {
                        annotationType,
                        metadata
                    };
                }
            }
        });
    
        // Wait for all metadata to be processed
        await Promise.all(metadataPromises);
        
        return annotationsData;
    }

    static async checkDbVariable(constructor: any, variable: string): Promise<boolean> {                   
        if(variable === 'id'){
            return true;
        }
        
        const dbAnnotations = await ModelUtils.getModelAnnotations(constructor);
        type AnnotationType = { annotationType: string, key: string };
    
        const dbProperties: string[] = Object.keys(dbAnnotations)
            .map((key: string): AnnotationType => {return {...dbAnnotations[key], key};})
            .filter((element: AnnotationType) => element.annotationType === 'TrackType' )
            .map((element: AnnotationType) => element.key);
    
        return dbProperties.includes(variable);
    }

    static isSubclass<T, C extends new () => T>(constructor: C, baseClass: new () => T): boolean {
        return baseClass.prototype.isPrototypeOf(constructor.prototype);
    }

    static getModelScalarFields(model: RWSModel<any>): string[] {       
        return FieldsHelper.getAllClassFields(model.constructor)
                .filter((item: string) => item.indexOf('TrackType') === 0)
                .map((item: string) => item.split(':').at(-1));
    }

    static findPrimaryKeyFields(opModel: OpModelType<any>): string  | string[]
    {
        if(opModel._NO_ID){
            const foundSuperId: ISuperTagData = opModel._SUPER_TAGS.find(tag => tag.tagType === 'id');

            if(foundSuperId){
                return foundSuperId.fields;
            }

            const foundSuperUnique: ISuperTagData = opModel._SUPER_TAGS.find(tag => tag.tagType === 'unique');

            if(foundSuperUnique){
                return foundSuperUnique.fields;
            }
        }

        return 'id';
    }

    static async entryExists(model: RWSModel<any>): Promise<boolean>
    {
        let entryHasData = true;
        let compoundId = false;

        const foundPrimaryKey = this.findPrimaryKeyFields(model.constructor as OpModelType<any>);

        if(Array.isArray(foundPrimaryKey)){
            compoundId = true;
            for(const idKey of foundPrimaryKey){
                if(!Object.hasOwn(model, idKey)){
                    entryHasData = false;
                }

                if(Object.hasOwn(model, idKey) && !model[idKey]){
                    entryHasData = false;
                }
            }
        }else{
            if(Object.hasOwn(model, foundPrimaryKey) && !model[foundPrimaryKey]){
                entryHasData = false;
            }

            if(!Object.hasOwn(model, foundPrimaryKey)){
                entryHasData = false;
            }
        }

        if(!entryHasData){
            return false;
        }        

        const constructor = model.constructor as OpModelType<any>;
        const conditions: FindByType['conditions'] = {};

        if(compoundId){           
            for(const key of foundPrimaryKey){
                conditions[key] = model[key];
            }

            return (await constructor.findOneBy({ conditions  }) !== null);
        }else{
            conditions[foundPrimaryKey as string] = model[foundPrimaryKey as string];
        }

        return (await constructor.findOneBy({ conditions })) !== null;
    }
}
