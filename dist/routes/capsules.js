"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
// import { getAll } from '../controllers/capsules';
const capsulesRouter = (0, express_1.Router)();
capsulesRouter.post('/create');
// capsulesRouter.get('/getAll' , getAll);
exports.default = capsulesRouter;
