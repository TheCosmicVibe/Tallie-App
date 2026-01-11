import { Router } from 'express';
import { RestaurantController } from '../controllers/restaurantController';
import { asyncHandler } from '../middleware/asyncHandler';
import { validate, validateParams, validateQuery, schemas } from '../middleware/validator';
import Joi from 'joi';

const router = Router();
const controller = new RestaurantController();

// Restaurant routes
router.post(
  '/',
  validate(schemas.createRestaurant),
  asyncHandler(controller.createRestaurant)
);

router.get(
  '/',
  asyncHandler(controller.getAllRestaurants)
);

router.get(
  '/:id',
  validateParams(schemas.idParam),
  asyncHandler(controller.getRestaurant)
);

router.get(
  '/:id/availability',
  validateParams(schemas.idParam),
  validateQuery(
    Joi.object({
      date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
      time: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/).required(),
    })
  ),
  asyncHandler(controller.getRestaurantAvailability)
);

// Table routes
router.post(
  '/:id/tables',
  validateParams(schemas.idParam),
  validate(schemas.createTable),
  asyncHandler(controller.addTable)
);

router.put(
  '/:id/tables/:tableId',
  validateParams(
    Joi.object({
      id: Joi.number().integer().min(1).required(),
      tableId: Joi.number().integer().min(1).required(),
    })
  ),
  validate(Joi.object({
    tableNumber: Joi.string().min(1).max(50).optional(),
    capacity: Joi.number().integer().min(1).max(50).optional(),
    location: Joi.string().max(100).optional(),
    isActive: Joi.boolean().optional(),
  })),
  asyncHandler(controller.updateTable)
);

router.delete(
  '/:id/tables/:tableId',
  validateParams(
    Joi.object({
      id: Joi.number().integer().min(1).required(),
      tableId: Joi.number().integer().min(1).required(),
    })
  ),
  asyncHandler(controller.deleteTable)
);

export default router;
