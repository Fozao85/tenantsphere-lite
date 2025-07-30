const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
// const sharp = require('sharp'); // Temporarily disabled - install with: npm install sharp
const { v4: uuidv4 } = require('uuid');
const { logger } = require('../utils/logger');

class ImageService {
  constructor() {
    this.uploadDir = 'public/uploads/properties';
    this.maxFileSize = 5 * 1024 * 1024; // 5MB
    this.allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    this.imageSizes = {
      thumbnail: { width: 300, height: 200 },
      medium: { width: 800, height: 600 },
      large: { width: 1200, height: 900 }
    };
    
    this.initializeUploadDirectory();
  }

  // Initialize upload directory
  async initializeUploadDirectory() {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
      logger.info(`Image upload directory initialized: ${this.uploadDir}`);
    } catch (error) {
      logger.error('Failed to initialize upload directory:', error);
    }
  }

  // Configure multer for file uploads
  getMulterConfig() {
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, this.uploadDir);
      },
      filename: (req, file, cb) => {
        const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
      }
    });

    const fileFilter = (req, file, cb) => {
      if (this.allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'), false);
      }
    };

    return multer({
      storage,
      fileFilter,
      limits: {
        fileSize: this.maxFileSize,
        files: 10 // Maximum 10 images per upload
      }
    });
  }

  // Process uploaded images (simplified - direct file storage)
  async processImages(files, propertyId) {
    const processedImages = [];

    for (const file of files) {
      try {
        const imageId = uuidv4();
        const fileExtension = path.extname(file.originalname).toLowerCase();
        const filename = `${propertyId}_${imageId}${fileExtension}`;
        const filepath = path.join(this.uploadDir, filename);

        // Ensure the upload directory exists
        await fs.mkdir(this.uploadDir, { recursive: true });

        // Copy the file to the uploads directory
        await fs.copyFile(file.path, filepath);

        // Clean up original temporary file
        try {
          await fs.unlink(file.path);
        } catch (unlinkError) {
          // Ignore cleanup errors for temp files
        }

        // Create image record with direct URL
        const imageUrl = `/uploads/properties/${filename}`;

        processedImages.push({
          id: imageId,
          originalName: file.originalname,
          url: imageUrl,
          filename: filename,
          uploadedAt: new Date(),
          mimeType: file.mimetype,
          size: await this.getFileSize(filepath)
        });

        console.log(`✅ Successfully processed image: ${file.originalname} -> ${filename}`);

      } catch (error) {
        console.error(`❌ Error processing image ${file.originalname}:`, error);
        // Clean up on error
        try {
          await fs.unlink(file.path);
        } catch (unlinkError) {
          // Ignore cleanup errors
        }
      }
    }

    console.log(`📸 Processed ${processedImages.length} images for property ${propertyId}`);
    return processedImages;
  }

  // Get file size
  async getFileSize(filepath) {
    try {
      const stats = await fs.stat(filepath);
      return stats.size;
    } catch (error) {
      return 0;
    }
  }

  // Delete property images
  async deletePropertyImages(images) {
    for (const image of images) {
      try {
        // Delete all sizes of the image
        for (const size of Object.values(image.sizes)) {
          const filepath = path.join(this.uploadDir, size.filename);
          await fs.unlink(filepath);
        }
        logger.info(`Deleted images for image ID: ${image.id}`);
      } catch (error) {
        logger.warn(`Failed to delete image ${image.id}:`, error.message);
      }
    }
  }

  // Generate image URLs for different sizes
  generateImageUrls(baseUrl, images) {
    return images.map(image => ({
      id: image.id,
      originalName: image.originalName,
      thumbnail: `${baseUrl}${image.sizes.thumbnail.url}`,
      medium: `${baseUrl}${image.sizes.medium.url}`,
      large: `${baseUrl}${image.sizes.large.url}`,
      uploadedAt: image.uploadedAt
    }));
  }

  // Validate image URLs (for external images)
  async validateImageUrl(url) {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      const contentType = response.headers.get('content-type');
      
      return {
        valid: response.ok && contentType && contentType.startsWith('image/'),
        contentType,
        size: response.headers.get('content-length')
      };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  // Create image gallery HTML
  generateImageGallery(images, propertyTitle) {
    if (!images || images.length === 0) {
      return '<div class="no-images">No images available</div>';
    }

    let galleryHtml = `<div class="image-gallery" data-property="${propertyTitle}">`;
    
    // Main image
    const mainImage = images[0];
    galleryHtml += `
      <div class="main-image">
        <img src="${mainImage.sizes.large.url}" alt="${propertyTitle}" class="main-img">
      </div>
    `;

    // Thumbnail strip
    if (images.length > 1) {
      galleryHtml += '<div class="thumbnail-strip">';
      images.forEach((image, index) => {
        galleryHtml += `
          <img src="${image.sizes.thumbnail.url}" 
               alt="${propertyTitle} - Image ${index + 1}" 
               class="thumbnail ${index === 0 ? 'active' : ''}"
               onclick="switchMainImage('${image.sizes.large.url}', this)">
        `;
      });
      galleryHtml += '</div>';
    }

    galleryHtml += '</div>';
    return galleryHtml;
  }

  // Get image statistics
  async getImageStatistics() {
    try {
      const files = await fs.readdir(this.uploadDir);
      const imageFiles = files.filter(file => 
        file.endsWith('.webp') || file.endsWith('.jpg') || file.endsWith('.png')
      );

      let totalSize = 0;
      for (const file of imageFiles) {
        const filepath = path.join(this.uploadDir, file);
        const size = await this.getFileSize(filepath);
        totalSize += size;
      }

      return {
        totalImages: imageFiles.length,
        totalSize: totalSize,
        totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
        uploadDirectory: this.uploadDir
      };
    } catch (error) {
      logger.error('Error getting image statistics:', error);
      return {
        totalImages: 0,
        totalSize: 0,
        totalSizeMB: '0.00',
        uploadDirectory: this.uploadDir,
        error: error.message
      };
    }
  }

  // Clean up orphaned images (images not associated with any property)
  async cleanupOrphanedImages(activePropertyIds) {
    try {
      const files = await fs.readdir(this.uploadDir);
      let cleanedCount = 0;

      for (const file of files) {
        // Extract property ID from filename (format: propertyId_imageId_size.webp)
        const parts = file.split('_');
        if (parts.length >= 2) {
          const propertyId = parts[0];
          
          if (!activePropertyIds.includes(propertyId)) {
            const filepath = path.join(this.uploadDir, file);
            await fs.unlink(filepath);
            cleanedCount++;
          }
        }
      }

      logger.info(`Cleaned up ${cleanedCount} orphaned image files`);
      return cleanedCount;
    } catch (error) {
      logger.error('Error cleaning up orphaned images:', error);
      return 0;
    }
  }
}

module.exports = ImageService;
