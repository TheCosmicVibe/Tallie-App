import { Router } from 'express';
import { WaitlistController } from '../controllers/waitlistController';
import { asyncHandler } from '../middleware/asyncHandler';
import { validate, validateParams, validateQuery, schemas } from '../middleware/validator';
import Joi from 'joi';

const router = Router();
const controller = new WaitlistController();

// Add to waitlist
router.post(
  '/restaurants/:restaurantId/waitlist',
  validateParams(schemas.idParam.keys({ restaurantId: schemas.idParam.extract('id') })),
  validate(schemas.createWaitlist),
  asyncHandler(controller.addToWaitlist)
);

// Get waitlist
router.get(
  '/restaurants/:restaurantId/waitlist',
  validateParams(schemas.idParam.keys({ restaurantId: schemas.idParam.extract('id') })),
  validateQuery(
    Joi.object({
      date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional(),
    })
  ),
  asyncHandler(controller.getWaitlist)
);

// Update waitlist status
router.patch(
  '/:id',
  validateParams(schemas.idParam),
  validate(
    Joi.object({
      status: Joi.string()
        .valid('waiting', 'notified', 'seated', 'cancelled', 'expired')
        .required(),
    })
  ),
  asyncHandler(controller.updateWaitlistStatus)
);

// Remove from waitlist
router.delete(
  '/:id',
  validateParams(schemas.idParam),
  asyncHandler(controller.removeFromWaitlist)
);

export default router;
