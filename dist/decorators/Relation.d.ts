import 'reflect-metadata';
import { RWSModel, OpModelType } from '../models/_model';
interface IRelationOpts {
    required?: boolean;
    key?: string;
    relationField?: string;
    relatedToField?: string;
    relatedTo: OpModelType<RWSModel<any>>;
}
declare function Relation(theModel: () => OpModelType<RWSModel<any>>, required?: boolean, relationField?: string, relatedToField?: string): (target: any, key: string) => void;
export default Relation;
export { IRelationOpts };
