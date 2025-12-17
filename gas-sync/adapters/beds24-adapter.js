Last login: Wed Dec 17 17:33:33 on ttys000
stevedriver@Macmini ~ % sed -n '1140,1170p' ~/Desktop/ZGAS/16-12-2025\ Start\ of\ UI\ for\ GasSync/beds24-adapter.js
              }
            }
            
            // Temporarily set propKey for this property
            const savedPropKey = this.propKey;
            this.propKey = propertyPropKey;
            
            // 2. Sync room types for each property
            const roomTypesResult = await this.getRoomTypes(property.externalId);
            if (roomTypesResult.success) {
              for (const roomType of roomTypesResult.data) {
                try {
                  await this.syncRoomTypeToDatabase(roomType, property.externalId);
                  stats.roomTypes.synced++;
                } catch (e) {
                  stats.roomTypes.errors++;
                }
              }
            }
            
            // 3. Sync images (V1 API)
            if (this.apiKey && this.propKey) {
              const imagesResult = await this.getImages(property.externalId);
              if (imagesResult.success) {
                for (const image of imagesResult.data) {
                  try {
                    await this.syncImageToDatabase(image, property.externalId);
                    stats.images.synced++;
                  } catch (e) {
                    stats.images.errors++;
                  }
stevedriver@Macmini ~ % 
