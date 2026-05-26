"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAccessToken = generateAccessToken;
exports.generateRefreshToken = generateRefreshToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const accessSecret = process.env.JWT_ACCESS_SECRET;
const refreshSecret = process.env.JWT_REFRESH_SECRET;
function generateAccessToken(user) {
    return jsonwebtoken_1.default.sign(user, accessSecret, { expiresIn: "15m" });
}
function generateRefreshToken(user) {
    return jsonwebtoken_1.default.sign(user, refreshSecret, { expiresIn: "7d" });
}
//# sourceMappingURL=tokens.js.map