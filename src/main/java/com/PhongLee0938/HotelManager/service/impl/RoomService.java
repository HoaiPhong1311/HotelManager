package com.PhongLee0938.HotelManager.service.impl;

import com.PhongLee0938.HotelManager.dto.Response;
import com.PhongLee0938.HotelManager.dto.RoomDTO;
import com.PhongLee0938.HotelManager.entity.Room;
import com.PhongLee0938.HotelManager.exception.OurException;
import com.PhongLee0938.HotelManager.repo.BookingRepository;
import com.PhongLee0938.HotelManager.repo.RoomRepository;
import com.PhongLee0938.HotelManager.service.LocalImageStorageService;
import com.PhongLee0938.HotelManager.service.interfac.IRoomService;
import com.PhongLee0938.HotelManager.utils.Utils;
import jdk.jshell.execution.Util;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Service
public class RoomService implements IRoomService {

    @Autowired
    private RoomRepository roomRepository;
    @Autowired
    private BookingRepository bookingRepository;
    @Autowired
    private LocalImageStorageService localImageStorageService;

    @Override
    public Response addNewRoom(MultipartFile photo, String roomType, BigDecimal roomPrice, String description) {

        Response response = new Response();
        try{
            String imageUrl = localImageStorageService.saveImage(photo);
            Room room = new Room();
            room.setRoomPhotoUrl(imageUrl);
            room.setRoomType(roomType);
            room.setRoomPrice(roomPrice);
            room.setRoomDescription(description);
            Room savedRoom = roomRepository.save(room);
            RoomDTO roomDTO = Utils.mapRoomEntityToRoomDTO(savedRoom);
            response.setStatusCode(200);
            response.setMessage("Successfully added new room");
            response.setRoom(roomDTO);

        } catch (Exception e) {
            response.setStatusCode(500);
            response.setMessage("Error saving a room " + e.getMessage());
        }
        return response;
    }

    @Override
    public List<String> getAllRoomsTypes() {
        return roomRepository.findDistinctRoomTypes();
    }

    @Override
    public Response getAllRooms() {

        Response response = new Response();
        try{
            List<Room> roomList = roomRepository.findAll(Sort.by(Sort.Direction.DESC, "id"));
            List<RoomDTO> roomDTOList = Utils.mapRoomListEntityToRoomListDTO(roomList);
            response.setStatusCode(200);
            response.setMessage("Successfully added new room");
            response.setRoomList(roomDTOList);

        } catch (Exception e) {
            response.setStatusCode(500);
            response.setMessage("Error get all rooms " + e.getMessage());
        }
        return response;
    }

    @Override
    public Response deleteRoom(Long roomId) {

        Response response = new Response();
        try{
            roomRepository.findById(roomId).orElseThrow(() -> new OurException("Room not found"));
            roomRepository.deleteById(roomId);
            response.setStatusCode(200);
            response.setMessage("Successfully deleted room");
        } catch (OurException e) {
            response.setStatusCode(404);
            response.setMessage("Room not found");
        }
        catch (Exception e) {
            response.setStatusCode(500);
            response.setMessage("Error deleting room " + e.getMessage());
        }
        return response;
    }

    @Override
    public Response updateRoom(Long roomId, String description, String roomType, BigDecimal roomPrice, MultipartFile photo) {

        Response response = new Response();
        try{
            String imageUrl = null;
            if(photo != null && !photo.isEmpty()){
                imageUrl = localImageStorageService.saveImage(photo);
            }
            Room room = roomRepository.findById(roomId).orElseThrow(() -> new OurException("Room not found"));
            if(roomType != null) room.setRoomType(roomType);
            if(roomPrice != null) room.setRoomPrice(roomPrice);
            if(description != null) room.setRoomDescription(description);
            if(imageUrl != null) room.setRoomPhotoUrl(imageUrl);

            Room updatedRoom = roomRepository.save(room);
            RoomDTO roomDTO = Utils.mapRoomEntityToRoomDTO(updatedRoom);

            response.setStatusCode(200);
            response.setMessage("Successfully deleted room");
            response.setRoom(roomDTO);
            
        } catch (OurException e) {
            response.setStatusCode(404);
            response.setMessage("Room not found");
        }
        catch (Exception e) {
            response.setStatusCode(500);
            response.setMessage("Error deleting room " + e.getMessage());
        }
        return response;
    }

    @Override
    public Response getRoomById(Long roomId) {

        Response response = new Response();
        try{
            Room room = roomRepository.findById(roomId).orElseThrow(() -> new OurException("Room not found"));
            RoomDTO roomDTO = Utils.mapRoomEntityToRoomDTOPlusBookings(room);
            response.setStatusCode(200);
            response.setMessage("Successfully retrieved room");
            response.setRoom(roomDTO);
        } catch (OurException e) {
            response.setStatusCode(404);
            response.setMessage("Room not found");
        }
        catch (Exception e) {
            response.setStatusCode(500);
            response.setMessage("Error saving room " + e.getMessage());
        }
        return response;
    }

    @Override
    public Response getAvailableRoomsByDateAndType(LocalDate checkInDate, LocalDate checkOutDate, String roomType) {

        Response response = new Response();
        try{
            List<Room> availableRooms = roomRepository.findAllAvailableRoomsByDatesAndTypes(checkInDate, checkOutDate, roomType);
            List<RoomDTO> roomDTOList = Utils.mapRoomListEntityToRoomListDTO(availableRooms);
            response.setStatusCode(200);
            response.setMessage("Successfully retrieved room");
            response.setRoomList(roomDTOList);
        } catch (Exception e) {
            response.setStatusCode(500);
            response.setMessage("Error saving room " + e.getMessage());
        }
        return response;
    }

    @Override
    public Response getAllAvailableRooms() {

        Response response = new Response();
        try{
            List<Room> roomList = roomRepository.getAllAvailableRooms();
            List<RoomDTO> roomDTOList = Utils.mapRoomListEntityToRoomListDTO(roomList);
            response.setStatusCode(200);
            response.setMessage("Successfully retrieved room");
            response.setRoomList(roomDTOList);
        } catch (OurException e) {
            response.setStatusCode(404);
            response.setMessage("Room not found");
        }
        catch (Exception e) {
            response.setStatusCode(500);
            response.setMessage("Error saving room " + e.getMessage());
        }
        return response;
    }
}
