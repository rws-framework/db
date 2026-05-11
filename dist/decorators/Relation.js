"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const _DEFAULT_CASCADE = { onDelete: 'SetNull', onUpdate: 'Cascade' };
const _DEFAULTS = { required: false, many: false, embed: false, cascade: null };
function Relation(theModel, relationOptions = _DEFAULTS) {
    return function (target, key) {
        // Store the factory lazily — do NOT call theModel() here.
        // Calling it eagerly via Promise.resolve().then() races with module
        // initialisation: in Jest globalSetup (which uses dynamic import()),
        // microtasks can fire before all circular-dependency modules have
        // finished loading, so theModel() may return undefined at that point.
        // getModelAnnotations() calls the factory only when it is actually
        // needed, by which time every module is guaranteed to be loaded.
        Reflect.defineMetadata(`Relation:${key}`, {
            factory: theModel,
            options: { ...relationOptions },
            key
        }, target);
    };
}
exports.default = Relation;
