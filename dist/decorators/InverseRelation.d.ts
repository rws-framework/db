import 'reflect-metadata';
import { RWSModel, OpModelType } from '../models/_model';
interface InverseRelationOpts {
    key: string;
    inversionModel: OpModelType<RWSModel<any>>;
    foreignKey: string;
}
declare function InverseRelation(inversionModel: () => OpModelType<RWSModel<any>>, sourceModel: () => OpModelType<RWSModel<any>>, foreignKey?: string): (target: any, key: string) => void;
export default InverseRelation;
export { InverseRelationOpts };
