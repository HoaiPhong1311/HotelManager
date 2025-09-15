package com.PhongLee0938.HotelManager.service.interfac;

import com.PhongLee0938.HotelManager.dto.LoginRequest;
import com.PhongLee0938.HotelManager.dto.Response;
import com.PhongLee0938.HotelManager.entity.User;

public interface IUserService {

    Response register(User user);

    Response login(LoginRequest loginRequest);

    Response getAllUser();

    Response getUserBookingHistory(String userId);

    Response deleteUser(String userId);

    Response getUserById(String userId);

    Response getMyInfo(String email);
}
