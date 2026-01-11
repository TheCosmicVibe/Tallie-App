import { Router } from 'express';
import { ReservationController } from '../controllers/reservationController';
import { asyncHandler } from '../middleware/asyncHandler';
import { validate, validateParams, validateQuery, schemas } from '../middleware/validator';

const router = Router();
const controller = new ReservationController();

// Availability check
router.get(
  '/restaurants/:restaurantId/availability',
  validateParams(schemas.idParam.keys({ restaurantId: schemas.idParam.extract('id') })),
  validateQuery(schemas.availabilityQuery),
  asyncHandler(controller.checkAvailability)
);

// Reservations by date
router.get(
  '/restaurants/:restaurantId/reservations',
  validateParams(schemas.idParam.keys({ restaurantId: schemas.idParam.extract('id') })),
  validateQuery(schemas.dateQuery),
  asyncHandler(controller.getReservationsByDate)
);

// Create reservation
router.post(
  '/restaurants/:restaurantId/reservations',
  validateParams(schemas.idParam.keys({ restaurantId: schemas.idParam.extract('id') })),
  validate(schemas.createReservation),
  asyncHandler(controller.createReservation)
);

// Get single reservation
router.get(
  '/:id',
  validateParams(schemas.idParam),
  asyncHandler(controller.getReservation)
);

// Update reservation
router.put(
  '/:id',
  validateParams(schemas.idParam),
  validate(schemas.updateReservation),
  asyncHandler(controller.updateReservation)
);

// Cancel reservation
router.delete(
  '/:id',
  validateParams(schemas.idParam),
  asyncHandler(controller.cancelReservation)
);

export default router;
