import { IDbOpts } from "./IDbOpts";
import { OpModelType } from "./OpModelType";
export interface ITrackerOpts extends IDbOpts {
    required?: boolean;
    unique?: boolean | string;
    isArray?: boolean;
    relationField?: string;
    relatedToField?: string;
    relatedTo?: OpModelType<any>;
    inversionModel?: OpModelType<any>;
    relationName?: string;
}
