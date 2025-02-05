"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FieldsHelper = void 0;
class FieldsHelper {
    constructor() {
        throw new Error(`Class ${this.constructor.name} cannot be instanced.`);
    }
    static getAllClassFields(target) {
        // Get instance properties
        const instanceFields = Object.getOwnPropertyNames(target.prototype);
        // Get static properties
        const staticFields = Object.getOwnPropertyNames(target);
        // Get decorated properties using Reflect metadata if available
        const decoratedFields = Reflect.getMetadataKeys(target.prototype) || [];
        // Combine all fields and remove duplicates and methods
        const allFields = new Set([
            ...instanceFields,
            ...staticFields,
            ...decoratedFields
        ]);
        // Filter out constructor and methods
        return Array.from(allFields).filter(field => {
            // Remove constructor
            if (field === 'constructor')
                return false;
            // Remove methods
            const descriptor = Object.getOwnPropertyDescriptor(target.prototype, field);
            if (descriptor && typeof descriptor.value === 'function')
                return false;
            return true;
        });
    }
    ;
}
exports.FieldsHelper = FieldsHelper;
