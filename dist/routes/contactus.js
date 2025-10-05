"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const contactus_1 = require("../controllers/contactus");
const contactUsRouter = (0, express_1.Router)();
contactUsRouter.post('/', contactus_1.postContactForm);
exports.default = contactUsRouter;
