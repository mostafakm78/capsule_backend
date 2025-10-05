"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUser = exports.getUsers = void 0;
const User_1 = __importDefault(require("../models/User"));
const getUsers = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const allUsers = yield User_1.default.find();
        res.status(200).json({ message: 'All Users', allUsers });
    }
    catch (error) {
        next({
            message: 'cant find All users!',
            data: error,
            statusCode: 500,
        });
    }
});
exports.getUsers = getUsers;
const createUser = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return next({
                message: 'Email and Password required',
                statusCode: 400,
                data: { email, password },
            });
        }
        const existingUser = yield User_1.default.findOne({ email });
        if (existingUser) {
            next({
                message: 'Email already exist',
                statusCode: 401,
            });
        }
        const newUser = yield User_1.default.create({ password, email });
        res.status(201).json({ message: 'User Created Successfully!', newUser });
    }
    catch (error) {
        next({
            statusCode: 500,
            data: error,
        });
    }
});
exports.createUser = createUser;
