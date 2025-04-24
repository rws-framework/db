import 'reflect-metadata';
import { ITrackerOpts } from './TrackType';
/**
 * Type function options interface
 */
interface ITypeFunctionOpts extends ITrackerOpts {
}
/**
 * String type function
 * @param optsOrRequired Options object or boolean indicating if field is required
 */
declare function StringType(optsOrRequired?: ITypeFunctionOpts | boolean): PropertyDecorator;
/**
 * Number type function
 * @param optsOrRequired Options object or boolean indicating if field is required
 */
declare function NumberType(optsOrRequired?: ITypeFunctionOpts | boolean): PropertyDecorator;
/**
 * Boolean type function
 * @param optsOrRequired Options object or boolean indicating if field is required
 */
declare function BooleanType(optsOrRequired?: ITypeFunctionOpts | boolean): PropertyDecorator;
/**
 * Date type function
 * @param optsOrRequired Options object or boolean indicating if field is required
 */
declare function DateType(optsOrRequired?: ITypeFunctionOpts | boolean): PropertyDecorator;
/**
 * Object type function (maps to JSON in databases)
 * @param optsOrRequired Options object or boolean indicating if field is required
 */
declare function ObjectType(optsOrRequired?: ITypeFunctionOpts | boolean): PropertyDecorator;
/**
 * Array type function
 * @param itemType Type of array items
 * @param optsOrRequired Options object or boolean indicating if field is required
 */
declare function ArrayType(itemType: any, optsOrRequired?: ITypeFunctionOpts | boolean): PropertyDecorator;
/**
 * ID type function
 * @param optsOrRequired Options object or boolean indicating if field is required
 */
declare function IdType(optsOrRequired?: ITypeFunctionOpts | boolean): PropertyDecorator;
export { StringType, NumberType, BooleanType, DateType, ObjectType, ArrayType, IdType, ITypeFunctionOpts };
