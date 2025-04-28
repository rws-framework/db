import 'reflect-metadata';
import { RWSModel, OpModelType } from '../models/_model';
export type CascadingSetup = 'Cascade' | 'Restrict' | 'NoAction' | 'SetNull';
export interface IRelationOpts {
    required?: boolean;
    key: string;
    relationField: string;
    relatedToField?: string;
    mappingName?: string;
    relatedTo: OpModelType<RWSModel<any>>;
    many?: boolean;
    embed?: boolean;
    useUuid?: boolean;
    relationName?: string;
    cascade?: {
        onDelete?: CascadingSetup;
        onUpdate?: CascadingSetup;
    };
}
declare function Relation(theModel: () => OpModelType<RWSModel<any>>, relationOptions?: Partial<IRelationOpts>): (target: any, key: string) => void;
export default Relation;
