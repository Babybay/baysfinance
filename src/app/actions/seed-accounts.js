"use server";
"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedAccounts = seedAccounts;
var prisma_1 = require("@/lib/prisma");
var client_1 = require("@prisma/client");
var defaultAccounts = [
    { code: "1101", name: "Kas", type: client_1.AccountType.Asset },
    { code: "1102", name: "Bank BCA", type: client_1.AccountType.Asset },
    { code: "1201", name: "Piutang Usaha", type: client_1.AccountType.Asset },
    { code: "2101", name: "Hutang Usaha", type: client_1.AccountType.Liability },
    { code: "3101", name: "Modal Saham", type: client_1.AccountType.Equity },
    { code: "3102", name: "Laba Ditahan", type: client_1.AccountType.Equity },
    { code: "4101", name: "Pendapatan Jasa", type: client_1.AccountType.Revenue },
    { code: "5101", name: "Beban Gaji", type: client_1.AccountType.Expense },
    { code: "5201", name: "Beban Sewa", type: client_1.AccountType.Expense },
    { code: "5301", name: "Beban Listrik & Air", type: client_1.AccountType.Expense },
];
function seedAccounts(clientId) {
    return __awaiter(this, void 0, void 0, function () {
        var existing, _i, defaultAccounts_1, acc, isExist, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 7, , 8]);
                    return [4 /*yield*/, prisma_1.prisma.account.count({
                            where: { clientId: clientId || null }
                        })];
                case 1:
                    existing = _a.sent();
                    if (existing > 0)
                        return [2 /*return*/, { success: true, message: "Accounts already exist" }];
                    _i = 0, defaultAccounts_1 = defaultAccounts;
                    _a.label = 2;
                case 2:
                    if (!(_i < defaultAccounts_1.length)) return [3 /*break*/, 6];
                    acc = defaultAccounts_1[_i];
                    return [4 /*yield*/, prisma_1.prisma.account.findFirst({
                            where: {
                                code: acc.code,
                                clientId: clientId || null,
                            }
                        })];
                case 3:
                    isExist = _a.sent();
                    if (!!isExist) return [3 /*break*/, 5];
                    return [4 /*yield*/, prisma_1.prisma.account.create({
                            data: __assign(__assign({}, acc), { clientId: clientId || null, isActive: true })
                        })];
                case 4:
                    _a.sent();
                    _a.label = 5;
                case 5:
                    _i++;
                    return [3 /*break*/, 2];
                case 6: return [2 /*return*/, { success: true, message: "Default accounts seeded successfully" }];
                case 7:
                    error_1 = _a.sent();
                    console.error("seedAccounts error:", error_1);
                    console.error("Error meta:", error_1.meta);
                    return [2 /*return*/, { success: false, error: "Gagal menyemai data akun" }];
                case 8: return [2 /*return*/];
            }
        });
    });
}
