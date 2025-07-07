import { Jimp } from 'jimp';

export class ImageProcessor {
  /**
   * Convierte una imagen a escala de grises y mejora su contraste
   * @param imageBuffer - Buffer de la imagen o ruta del archivo
   * @param contrastLevel - Nivel de contraste (-1 a 1, donde 0 es sin cambios)
   * @returns Promise<Buffer> - Imagen procesada en buffer
   */
  static async convertToGrayscaleAndEnhanceContrast(
    imageBuffer: Buffer | string,
    contrastLevel: number = 0.3
  ): Promise<Buffer | undefined> {
    try {
      // Cargar la imagen usando Jimp
      const image = await Jimp.read(imageBuffer);

      // Convertir a escala de grises
      image.greyscale();

      // Mejorar el contraste
      image.contrast(contrastLevel);

      // Opcional: Aplicar normalización para mejorar la diferenciación
      image.normalize();

      // Convertir de vuelta a buffer
      const processedBuffer = await image.getBuffer("image/png"); //.getBufferAsync(MIME_PNG);

      return processedBuffer;
    } catch (error) {
      if (error instanceof Error) throw new Error(`Error procesando la imagen: ${error.message}`);
      console.error(error);
    }
  }

  /**
   * Versión alternativa usando Canvas API (para navegador)
   * @param imageFile - File object de la imagen
   * @param contrastLevel - Nivel de contraste (1.0 = sin cambios, >1.0 = más contraste)
   * @returns Promise<ImageData> - Datos de la imagen procesada
   */
  static async processImageWithCanvas(
    imageFile: File,
    contrastLevel: number = 1.5
  ): Promise<ImageData> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      if (!ctx) {
        throw new Error('No se pudo obtener el contexto 2D del canvas');
      }
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;

        // Dibujar la imagen en el canvas
        ctx.drawImage(img, 0, 0);

        // Obtener los datos de la imagen
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Procesar cada pixel
        for (let i = 0; i < data.length; i += 4) {
          // Convertir a escala de grises usando la fórmula luminancia
          const gray = Math.round(
            0.299 * data[i] +     // Red
            0.587 * data[i + 1] + // Green
            0.114 * data[i + 2]   // Blue
          );

          // Aplicar contraste
          let contrastedGray = ((gray / 255 - 0.5) * contrastLevel + 0.5) * 255;
          contrastedGray = Math.max(0, Math.min(255, contrastedGray));

          // Asignar el valor de gris a todos los canales
          data[i] = contrastedGray;     // Red
          data[i + 1] = contrastedGray; // Green
          data[i + 2] = contrastedGray; // Blue
          // data[i + 3] es el canal alpha, lo dejamos sin cambios
        }

        // Aplicar los datos procesados de vuelta al canvas
        ctx.putImageData(imageData, 0, 0);

        resolve(imageData);
      };

      img.onerror = () => reject(new Error('Error cargando la imagen'));
      img.src = URL.createObjectURL(imageFile);
    });
  }

  /**
   * Función para obtener las dimensiones de una imagen
   * @param imageBuffer - Buffer de la imagen
   * @returns Promise<{width: number, height: number}>
   */
  static async getImageDimensions(imageBuffer: Buffer): Promise<{ width: number, height: number }> {
    try {
      const image = await Jimp.read(imageBuffer);
      return {
        width: image.width,
        height: image.height
      };
    } catch (error) {
      if (error instanceof Error) throw new Error(`Error obteniendo dimensiones: ${error.message}`);
      console.error(error);
      throw error;
    }
  }

  /**
   * Función para aplicar umbralización (binarización) a una imagen
   * @param imageBuffer - Buffer de la imagen en escala de grises
   * @param threshold - Valor umbral (0-255)
   * @returns Promise<Buffer>
   */
  static async applyThreshold(imageBuffer: Buffer, threshold: number = 128): Promise<Buffer> {
    try {
      const image = await Jimp.read(imageBuffer);

      image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, idx) {
        // Obtener el valor de gris (ya que la imagen está en escala de grises, R=G=B)
        const gray = this.bitmap.data[idx];

        // Aplicar umbralización
        const binaryValue = gray > threshold ? 255 : 0;

        // Asignar el valor binario a todos los canales
        this.bitmap.data[idx] = binaryValue;     // Red
        this.bitmap.data[idx + 1] = binaryValue; // Green
        this.bitmap.data[idx + 2] = binaryValue; // Blue
        // Alpha channel permanece sin cambios
      });

      return await image.getBuffer("image/png"); //Async(Jimp.default.MIME_PNG);
    } catch (error) {
      if (error instanceof Error) throw new Error(`Error aplicando umbralización: ${error.message}`);
      console.error(error);
      throw error;
    }
  }
}