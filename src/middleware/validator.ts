import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ApiError } from '../utils/ApiError';

export const validate = (schema: Joi.ObjectSchema) => {
    return (req: Request, _res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errorMessage = error.details
        .map((detail) => detail.message)
        .join(', ');
      throw ApiError.badRequest(errorMessage);
    }

    req.body = value;
    next();
  };
};

export const validateQuery = (schema: Joi.ObjectSchema) => {
  // res is unused here, rename to _res to avoid TS6133
  return (req: Request, _res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errorMessage = error.details
        .map((detail) => detail.message)
        .join(', ');
      throw ApiError.badRequest(errorMessage);
    }

    req.query = value;
    next();
  };
};

export const validateParams = (schema: Joi.ObjectSchema) => {
  // res is unused here, rename to _res to avoid TS6133
  return (req: Request, _res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errorMessage = error.details
        .map((detail) => detail.message)
        .join(', ');
      throw ApiError.badRequest(errorMessage);
    }

    req.params = value;
    next();
  };
};

// Validation Schemas
export const schemas = {
  createRestaurant: Joi.object({
    name: Joi.string().min(2).max(255).required(),
    openingTime: Joi.string()
      .pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)
      .required(),
    closingTime: Joi.string()
      .pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)
      .required(),
    totalTables: Joi.number().integer().min(1).required(),
    address: Joi.string().max(500).optional(),
    phone: Joi.string()
      .pattern(/^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/)
      .optional(),
    email: Joi.string().email().optional(),
  }),

  createTable: Joi.object({
    tableNumber: Joi.string().min(1).max(50).required(),
    capacity: Joi.number().integer().min(1).max(50).required(),
    location: Joi.string().max(100).optional(),
    isActive: Joi.boolean().optional(),
  }),

  createReservation: Joi.object({
    customerName: Joi.string().min(2).max(255).required(),
    customerPhone: Joi.string()
      .pattern(/^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/)
      .required(),
    customerEmail: Joi.string().email().optional(),
    partySize: Joi.number().integer().min(1).max(50).required(),
    reservationDate: Joi.string()
      .pattern(/^\d{4}-\d{2}-\d{2}$/)
      .required(),
    reservationTime: Joi.string()
      .pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)
      .required(),
    duration: Joi.number().integer().min(30).max(480).optional(),
    specialRequests: Joi.string().max(1000).optional(),
  }),

  updateReservation: Joi.object({
    reservationDate: Joi.string()
      .pattern(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    reservationTime: Joi.string()
      .pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)
      .optional(),
    partySize: Joi.number().integer().min(1).max(50).optional(),
    duration: Joi.number().integer().min(30).max(480).optional(),
    status: Joi.string()
      .valid('pending', 'confirmed', 'completed', 'cancelled', 'no_show')
      .optional(),
    specialRequests: Joi.string().max(1000).optional(),
  }),

  createWaitlist: Joi.object({
    customerName: Joi.string().min(2).max(255).required(),
    customerPhone: Joi.string()
      .pattern(/^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/)
      .required(),
    customerEmail: Joi.string().email().optional(),
    partySize: Joi.number().integer().min(1).max(50).required(),
    preferredTime: Joi.string()
      .pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)
      .optional(),
    notes: Joi.string().max(1000).optional(),
  }),

  idParam: Joi.object({
    id: Joi.number().integer().min(1).required(),
  }),

  availabilityQuery: Joi.object({
    date: Joi.string()
      .pattern(/^\d{4}-\d{2}-\d{2}$/)
      .required(),
    partySize: Joi.number().integer().min(1).max(50).required(),
    duration: Joi.number().integer().min(30).max(480).optional(),
  }),

  dateQuery: Joi.object({
    date: Joi.string()
      .pattern(/^\d{4}-\d{2}-\d{2}$/)
      .required(),
  }),

  paginationQuery: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
  }),
};
