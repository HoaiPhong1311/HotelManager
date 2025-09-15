package com.PhongLee0938.HotelManager.service.impl;

import com.PhongLee0938.HotelManager.dto.BookingDTO;
import com.PhongLee0938.HotelManager.dto.Response;
import com.PhongLee0938.HotelManager.entity.Booking;
import com.PhongLee0938.HotelManager.entity.Room;
import com.PhongLee0938.HotelManager.entity.User;
import com.PhongLee0938.HotelManager.exception.OurException;
import com.PhongLee0938.HotelManager.repo.BookingRepository;
import com.PhongLee0938.HotelManager.repo.RoomRepository;
import com.PhongLee0938.HotelManager.repo.UserRepository;
import com.PhongLee0938.HotelManager.service.interfac.IBookingService;
import com.PhongLee0938.HotelManager.service.interfac.IRoomService;
import com.PhongLee0938.HotelManager.utils.Utils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class BookingService implements IBookingService {

    @Autowired
    private BookingRepository bookingRepository;
    @Autowired
    private IRoomService roomService;
    @Autowired
    private RoomRepository roomRepository;
    @Autowired
    private UserRepository userRepository;

    @Override
    public Response saveBooking(Long roomId, Long userId, Booking bookingRequest) {

        Response response = new Response();
        try{
            if(bookingRequest.getCheckOutDate().isBefore(bookingRequest.getCheckInDate())){
                throw new IllegalArgumentException("Check in Date should be before Check Out Date");
            }

            Room room = roomRepository.findById(roomId).orElseThrow(() -> new OurException("Room not found"));
            User user = userRepository.findById(userId).orElseThrow(() -> new OurException("User not found"));

            List<Booking> existingBookings = room.getBookings();

            if(!roomIsAvailable(bookingRequest, existingBookings)){
                throw new IllegalArgumentException("Room is not available for selected date range");
            }

            bookingRequest.setRoom(room);
            bookingRequest.setUser(user);
            String bookingConfirmationCode = Utils.generateRandomConfirmationCode(10);
            bookingRequest.setBookingConfirmationCode(bookingConfirmationCode);
            bookingRequest.calculateTotalNumOfGuests();
            bookingRepository.save(bookingRequest);
            response.setStatusCode(200);
            response.setMessage("Booking successful");
            response.setBookingConfirmationCode(bookingConfirmationCode);
        } catch(OurException e){
            response.setStatusCode(404);
            response.setMessage(e.getMessage());
        } catch (Exception e) {
            response.setStatusCode(500);
            response.setMessage("Error saving a booking " + e.getMessage());
        }

        return response;
    }

    @Override
    public Response findBookingByConfirmationCode(String confirmationCode) {

        Response response = new Response();
        try{
            Booking booking = bookingRepository.findByBookingConfirmationCode(confirmationCode).orElseThrow(() -> new OurException("Booking not found"));
            BookingDTO bookingDTO = Utils.mapBookingEntityToBookingDTOPlusBookedRooms(booking, true);
            response.setStatusCode(200);
            response.setMessage("Successfully found booking with confirmation code " + confirmationCode);
            response.setBooking(bookingDTO);
        } catch(OurException e){
            response.setStatusCode(404);
            response.setMessage(e.getMessage());
        } catch (Exception e) {
            response.setStatusCode(500);
            response.setMessage("Error finding a booking " + e.getMessage());
        }

        return response;
    }

    @Override
    public Response getAllBookings() {

        Response response = new Response();
        try{
            List<Booking> bookingList = bookingRepository.findAll(Sort.by(Sort.Direction.DESC, "id"));
            List<BookingDTO> bookingDTOList = bookingList.stream()
                .map(booking -> Utils.mapBookingEntityToBookingDTOPlusBookedRooms(booking, true))
                .collect(Collectors.toList());
            response.setStatusCode(200);
            response.setMessage("Successfully found all bookings");
            response.setBookingList(bookingDTOList);
        } catch(OurException e){
            response.setStatusCode(404);
            response.setMessage(e.getMessage());
        } catch (Exception e) {
            response.setStatusCode(500);
            response.setMessage("Error getting all bookings " + e.getMessage());
        }

        return response;
    }

    @Override
    public Response cancelBooking(Long bookingId) {

        Response response = new Response();
        try{
            bookingRepository.findById(bookingId).orElseThrow(() -> new OurException("Booking not found"));
            bookingRepository.deleteById(bookingId);
            response.setStatusCode(200);
            response.setMessage("Successfully deleted booking with id " + bookingId);
        } catch(OurException e){
            response.setStatusCode(404);
            response.setMessage(e.getMessage());
        } catch (Exception e) {
            response.setStatusCode(500);
            response.setMessage("Error cancelling a booking " + e.getMessage());
        }

        return response;
    }

    private boolean roomIsAvailable(Booking bookingRequest, List<Booking> existingBookings) {
        return existingBookings.stream()
                .noneMatch(existingBooking ->
                        bookingRequest.getCheckInDate().isBefore(existingBooking.getCheckOutDate()) &&
                                bookingRequest.getCheckOutDate().isAfter(existingBooking.getCheckInDate())
                );
    }
}
