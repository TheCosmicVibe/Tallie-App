import { Router } from 'express';
import { ReservationController } from '../controllers/reservationController';
import { asyncHandler } from '../middleware/asyncHandler';
import { validate, validateParams, validateQuery, schemas, paramSchema } from '../middleware/validator';

const router = Router();
const controller = new ReservationController();

// Availability check
router.get(
  '/restaurants/:restaurantId/availability',
  validateParams(paramSchema('restaurantId')),
  validateQuery(schemas.availabilityQuery),
  asyncHandler(controller.checkAvailability)
);

// Reservations by date
router.get(
  '/restaurants/:restaurantId/reservations',
  validateParams(paramSchema('restaurantId')),
  validateQuery(schemas.dateQuery),
  asyncHandler(controller.getReservationsByDate)
);

// Create reservation
router.post(
  '/restaurants/:restaurantId/reservations',
  validateParams(paramSchema('restaurantId')),
  validate(schemas.createReservation),
  asyncHandler(controller.createReservation)
);

// Get single reservation
router.get(
  '/:id',
  validateParams(paramSchema('id')),
  asyncHandler(controller.getReservation)
);

// Update reservation
router.put(
  '/:id',
  validateParams(paramSchema('id')),
  validate(schemas.updateReservation),
  asyncHandler(controller.updateReservation)
);

// Cancel reservation
router.delete(
  '/:id',
  validateParams(paramSchema('id')),
  asyncHandler(controller.cancelReservation)
);

export default router;
