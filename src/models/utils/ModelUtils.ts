import { RWSModel } from "../core/RWSModel";
import { FieldsHelper } from '../../helper/FieldsHelper';

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
        return FieldsHelper.getAllClassFields(model)
                .filter((item: string) => item.indexOf('TrackType') === 0)
                .map((item: string) => item.split(':').at(-1));
    }
}
