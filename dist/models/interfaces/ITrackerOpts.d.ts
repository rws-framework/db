import { OpModelType } from "./OpModelType";
export interface ITrackerOpts {
    required?: boolean;
    isArray?: boolean;
    relationField?: string;
    relatedToField?: string;
    relatedTo?: OpModelType<any>;
    inversionModel?: OpModelType<any>;
    relationName?: string;
    dbOptions?: {
        mysql?: {
            useType?: string;
            useText?: boolean;
            maxLength?: number;
            useUuid?: boolean;
        };
        postgres?: {
            useText?: boolean;
            useUuid?: boolean;
        };
        mongodb?: {
            customType?: string;
        };
    };
}
