"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
const _model_1 = require("./_model");
class TimeSeriesModel extends _model_1.RWSModel {
    constructor(data) {
        super(data);
        if (!this.timestamp) {
            this.timestamp = new Date();
        }
    }
}
exports.default = TimeSeriesModel;
__decorate([
    (0, _model_1.TrackType)(Number),
    __metadata("design:type", Number)
], TimeSeriesModel.prototype, "value", void 0);
__decorate([
    (0, _model_1.TrackType)(Date),
    __metadata("design:type", Date)
], TimeSeriesModel.prototype, "timestamp", void 0);
__decorate([
    (0, _model_1.TrackType)(Object),
    __metadata("design:type", Object)
], TimeSeriesModel.prototype, "params", void 0);
