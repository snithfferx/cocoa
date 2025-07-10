import { Jimp } from 'jimp';
// import cv from "@techstark/opencv-js"
import cvReadyPromise from "@techstark/opencv-js";
// import * as cv from '@techstark/opencv-js';
import {createCanvas, Image, ImageData} from 'canvas';

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
  ): Promise<Buffer | null> {
    try {
      // Cargar la imagen usando Jimp
      const image = await Jimp.read(imageBuffer);
      // if (!image) throw new Error("CTGaE_Error: No se pudo leer la imagen.");
      // Convertir a escala de grises
      image.greyscale();

      // Mejorar el contraste
      image.contrast(contrastLevel);

      // Opcional: Aplicar normalización para mejorar la diferenciación
      image.normalize();

      // Convertir de vuelta a buffer
      const processedBuffer = await image.getBuffer("image/png"); //.getBufferAsync(MIME_PNG);
      // if (processedBuffer) throw new Error("CTGaE_Error: No se pudo crear imagen png.");
      return processedBuffer;
    } catch (error) {
      if (error instanceof Error) throw new Error(`CTGaE_Error procesando la imagen: ${error.message}`);
      console.error(error);
      return null;
    }
  }

  /**
   * Versión alternativa usando Canvas API (para navegador)
   * @param imageFile - File object de la imagen
   * @param contrastLevel - Nivel de contraste (1.0 = sin cambios, >1.0 = más contraste)
   * @returns Promise<ImageData> - Datos de la imagen procesada
   */
  /* static async processImageWithCanvas(
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
  } */

  /**
   * Función para obtener las dimensiones de una imagen
   * @param imageBuffer - Buffer de la imagen
   * @returns Promise<{width: number, height: number}>
   */
  static async getImageDimensions(imageBuffer: Buffer): Promise<{ width: number, height: number }> {
    try {
      const image = await Jimp.read(imageBuffer);
      if (!image) throw new Error("getImageDimensions_Error: No se puede leer la imagen");
      
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
      const bitmap = image.bitmap;
      const height = bitmap.height;
      const width = bitmap.width;
      image.scan(0, 0, width, height, function (x, y, idx) {
        // Obtener el valor de gris (ya que la imagen está en escala de grises, R=G=B)
        const gray = bitmap.data[idx];

        // Aplicar umbralización
        const binaryValue = gray > threshold ? 255 : 0;

        // Asignar el valor binario a todos los canales
        bitmap.data[idx] = binaryValue;     // Red
        bitmap.data[idx + 1] = binaryValue; // Green
        bitmap.data[idx + 2] = binaryValue; // Blue
        // Alpha channel permanece sin cambios
      });

      return await image.getBuffer("image/png"); //Async(Jimp.default.MIME_PNG);
    } catch (error) {
      if (error instanceof Error) throw new Error(`Error aplicando umbralización: ${error.message}`);
      console.error(error);
      throw error;
    }
  }

  /**
   * Encuentra contornos en una imagen binarizada
   * @param imageBuffer - Buffer de la imagen en escala de grises
   * @param sensitivity - Sensibilidad de detección
   * @returns Promise<total:number, image:Buffer> - Número de contornos encontrados y su imagen
   */
  static async findContours(imageBuffer: Buffer, sensitivity: number = 50): Promise<{total:number, image:Buffer}|null> {
    try {
      // Asegurarse de que OpenCV esté inicializado correctamente
      const cv = await cvReadyPromise;
      // Crear imagen
      const image = new Image();
      // Agregar buffer
      image.src = imageBuffer;
      // Crear lienzo de imagen
      const imageCanvas = createCanvas(image.width,image.height);
      // Obtener el contexto
      const context = imageCanvas.getContext('2d');
      // Dibujar imagen
      context.drawImage(image,0,0);
      // Obtener datos de imagen
      const imageData = context.getImageData(0,0,image.width,image.height)
      // Convertir en Mat
      const source = cv.matFromImageData(imageData);
      const gray = new cv.Mat();
      const edges = new cv.Mat();
      const contours = new cv.MatVector();
      const hierarchy = new cv.Mat();
      // Procesarmiento
      cv.cvtColor(source,gray,cv.COLOR_RGBA2GRAY,0);
      cv.Canny(gray,edges,sensitivity,150);
      cv.findContours(edges,contours,hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
      let coloniasValidas = 0;
      for (let i = 0; i < contours.size(); ++i) {
        const contorno = contours.get(i);
        const area = cv.contourArea(contorno);
        if (area > 20) { // Ajusta el umbral según tu imagen
          coloniasValidas++;
        }
      }
      // Dibujando contornos
      for (let i = 0; i < contours.size(); ++i) {
        cv.drawContours(source, contours, i, new cv.Scalar(255, 0, 0, 255), 2);
      }
      // Convertir resultado en imagen
      const result = createCanvas(source.cols, source.rows);
      const resultContext = result.getContext('2d');
      
      // Crear una ImageData a partir de la matriz source
      const imgData = new ImageData(
        new Uint8ClampedArray(source.data),
        source.cols,
        source.rows
      );
      
      // Dibujar la ImageData en el canvas
      resultContext.putImageData(imgData, 0, 0);
      const resultBuffer = result.toBuffer();

      // Liberar memoria
      source.delete(); gray.delete(); edges.delete(); contours.delete(); hierarchy.delete();
      return {total: coloniasValidas, image:resultBuffer};
    } catch (error) {
      if (error instanceof Error) throw new Error(`Error encontrando contornos: ${error.message}`);
      console.error(error);
      // throw error;
      return null;
    }
  }
}