import { RWSModel } from "../core/RWSModel";
import { OpModelType } from "..";
export declare class ModelUtils {
    static getModelAnnotations<T extends unknown>(constructor: new () => T): Promise<Record<string, {
        annotationType: string;
        metadata: any;
    }>>;
    static checkDbVariable(constructor: any, variable: string): Promise<boolean>;
    static isSubclass<T, C extends new () => T>(constructor: C, baseClass: new () => T): boolean;
    static getModelScalarFields(model: RWSModel<any>): string[];
    static findPrimaryKeyFields(opModel: OpModelType<any>): string | string[];
    static entryExists(model: RWSModel<any>): Promise<boolean>;
}
