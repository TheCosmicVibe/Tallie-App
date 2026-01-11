import { Router } from 'express';
import { WaitlistController } from '../controllers/waitlistController';
import { asyncHandler } from '../middleware/asyncHandler';
import { validate, validateParams, validateQuery, schemas, paramSchema } from '../middleware/validator';
import Joi from 'joi';

const router = Router();
const controller = new WaitlistController();

// Add to waitlist
router.post(
  '/restaurants/:restaurantId/waitlist',
  validateParams(paramSchema('restaurantId')),
  validate(schemas.createWaitlist),
  asyncHandler(controller.addToWaitlist.bind(controller))
);

// Get waitlist
router.get(
  '/restaurants/:restaurantId/waitlist',
  validateParams(paramSchema('restaurantId')),
  validateQuery(
    Joi.object({
      date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional(),
    })
  ),
  asyncHandler(controller.getWaitlist.bind(controller))
);

// Update waitlist status
router.patch(
  '/:id',
  validateParams(paramSchema('id')),
  validate(
    Joi.object({
      status: Joi.string()
        .valid('waiting', 'notified', 'seated', 'cancelled', 'expired')
        .required(),
    })
  ),
  asyncHandler(controller.updateWaitlistStatus.bind(controller))
);

// Remove from waitlist
router.delete(
  '/:id',
  validateParams(paramSchema('id')),
  asyncHandler(controller.removeFromWaitlist.bind(controller))
);

export default router;
