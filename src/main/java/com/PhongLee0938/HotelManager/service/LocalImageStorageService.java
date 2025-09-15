package com.PhongLee0938.HotelManager.service;

import com.PhongLee0938.HotelManager.exception.OurException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Service
public class LocalImageStorageService {

    @Value("${app.upload.dir}")
    private String uploadDir;

    public String saveImage(MultipartFile photo) {
        try{
            if(photo == null || photo.isEmpty()){
                throw new OurException("Uploaded file is empty.");
            }

            String originalFilename = StringUtils.cleanPath(
                    Objects.requireNonNull(photo.getOriginalFilename(), "File name is invalid.")
            );

            String extension = getFileExtension(originalFilename);
            if(!isAllowedImageExt(extension)){
                throw new OurException("Only image files (jpg, jpeg, png, gif, webp) are allowed.");
            }

            Path uploadPath = Paths.get(uploadDir).toAbsolutePath().normalize();
            Files.createDirectories(uploadPath);

            String newFileName = UUID.randomUUID() + "." + extension;
            Path targetPath = uploadPath.resolve(newFileName);

            try(InputStream inputStream = photo.getInputStream()){
                Files.copy(inputStream, targetPath, StandardCopyOption.REPLACE_EXISTING);
            }

            return "/upload/" + newFileName;
        } catch(IOException e){
            e.printStackTrace();
            throw new OurException("Fail to save image: " + e.getMessage());
        }
    }

    private String getFileExtension(String filename){
        int dotIndex = filename.lastIndexOf('.');
        return (dotIndex != -1) ? filename.substring(dotIndex + 1).toLowerCase() : "";
    }

    private boolean isAllowedImageExt(String ext){
        List<String>  allowed = List.of("jpg", "jpeg", "png", "gif", "webp");
        return allowed.contains(ext.toLowerCase());
    }
}
