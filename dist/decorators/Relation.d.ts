import 'reflect-metadata';
import { RWSModel, OpModelType } from '../models/_model';
type CascadingSetup = 'Cascade' | 'Restrict' | 'NoAction' | 'SetNull';
interface IRelationOpts {
    required?: boolean;
    key: string;
    relationField: string;
    relatedToField?: string;
    relatedTo: OpModelType<RWSModel<any>>;
    many?: boolean;
    embed?: boolean;
    cascade: {
        onDelete: CascadingSetup;
        onUpdate: CascadingSetup;
    };
}
declare function Relation(theModel: () => OpModelType<RWSModel<any>>, relationOptions?: Partial<IRelationOpts>): (target: any, key: string) => void;
export default Relation;
export { IRelationOpts };
