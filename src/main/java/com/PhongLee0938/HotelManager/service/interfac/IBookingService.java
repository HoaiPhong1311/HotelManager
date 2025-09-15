package com.PhongLee0938.HotelManager.service.interfac;

import com.PhongLee0938.HotelManager.dto.Response;
import com.PhongLee0938.HotelManager.entity.Booking;

public interface IBookingService {

    Response saveBooking(Long roomId, Long userId, Booking bookingRequest);

    Response findBookingByConfirmationCode(String confirmationCode);

    Response getAllBookings();

    Response cancelBooking(Long bookingId);
}
