import Joi from 'joi';

export const registerSchema = {
  body: Joi.object({
    email: Joi.string().email().max(200).required(),
    password: Joi.string().min(8).max(100).required(),
    fullName: Joi.string().min(2).max(200).required(),
  }).unknown(false),
};

export const loginSchema = {
  body: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }).unknown(false),
};