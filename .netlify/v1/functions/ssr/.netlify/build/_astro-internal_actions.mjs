import './chunks/_astro_actions_CzcLow6c.mjs';
import { z } from 'zod';
import fs from 'fs';
import { Jimp, loadFont } from 'jimp';
import { SANS_16_BLACK } from 'jimp/fonts';
import { d as defineAction } from './chunks/server_DTYgO-Dg.mjs';

class ImageProcessor {
  /**
   * Convierte una imagen a escala de grises y mejora su contraste
   * @param imageBuffer - Buffer de la imagen o ruta del archivo
   * @param contrastLevel - Nivel de contraste (-1 a 1, donde 0 es sin cambios)
   * @returns Promise<Buffer> - Imagen procesada en buffer
   */
  static async convertToGrayscaleAndEnhanceContrast(imageBuffer, contrastLevel = 0.3) {
    try {
      const image = await Jimp.read(imageBuffer);
      image.greyscale();
      image.contrast(contrastLevel);
      image.normalize();
      const processedBuffer = await image.getBuffer("image/png");
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
  static async processImageWithCanvas(imageFile, contrastLevel = 1.5) {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();
      if (!ctx) {
        throw new Error("No se pudo obtener el contexto 2D del canvas");
      }
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          const gray = Math.round(
            0.299 * data[i] + // Red
            0.587 * data[i + 1] + // Green
            0.114 * data[i + 2]
            // Blue
          );
          let contrastedGray = ((gray / 255 - 0.5) * contrastLevel + 0.5) * 255;
          contrastedGray = Math.max(0, Math.min(255, contrastedGray));
          data[i] = contrastedGray;
          data[i + 1] = contrastedGray;
          data[i + 2] = contrastedGray;
        }
        ctx.putImageData(imageData, 0, 0);
        resolve(imageData);
      };
      img.onerror = () => reject(new Error("Error cargando la imagen"));
      img.src = URL.createObjectURL(imageFile);
    });
  }
  /**
   * Función para obtener las dimensiones de una imagen
   * @param imageBuffer - Buffer de la imagen
   * @returns Promise<{width: number, height: number}>
   */
  static async getImageDimensions(imageBuffer) {
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
  static async applyThreshold(imageBuffer, threshold = 128) {
    try {
      const image = await Jimp.read(imageBuffer);
      image.scan(0, 0, image.bitmap.width, image.bitmap.height, function(x, y, idx) {
        const gray = this.bitmap.data[idx];
        const binaryValue = gray > threshold ? 255 : 0;
        this.bitmap.data[idx] = binaryValue;
        this.bitmap.data[idx + 1] = binaryValue;
        this.bitmap.data[idx + 2] = binaryValue;
      });
      return await image.getBuffer("image/png");
    } catch (error) {
      if (error instanceof Error) throw new Error(`Error aplicando umbralización: ${error.message}`);
      console.error(error);
      throw error;
    }
  }
}

class CounterController {
  async uploadImage(file, sensitivity, name, quarters = 2, user) {
    try {
      const imgGrayScale = await this.setGrays(file);
      if (!imgGrayScale) throw new Error("Error procesando la imagen");
      const imgHeightWidth = await this.getImageHL(imgGrayScale);
      const heightQuarter = Math.floor(imgHeightWidth.height / quarters);
      const widthQuarter = Math.floor(imgHeightWidth.width / quarters);
      const totalColoniesByQuarter = [];
      const quarterImage = [];
      for (let i = 0; i < quarters; i++) {
        for (let j = 0; j < quarters; j++) {
          const cut = await this.cropImageQuarter(
            imgGrayScale,
            j * widthQuarter,
            i * heightQuarter,
            widthQuarter,
            heightQuarter
          );
          if (!cut) throw new Error("Error procesando la imagen");
          await this.saveImage(cut, name, i, j, user);
          const totalColonies = await this.countColonies(cut, quarters, sensitivity);
          totalColoniesByQuarter.push(totalColonies.total);
          quarterImage.push(totalColonies.img);
        }
      }
      let colonies = 0;
      totalColoniesByQuarter.forEach((item) => {
        colonies += item;
      });
      const average = Math.ceil(colonies / totalColoniesByQuarter.length);
      const overviewImg64 = await this.overviewImage(imgGrayScale, quarters, totalColoniesByQuarter);
      return {
        status: "ok",
        data: {
          avg: average,
          ovv: overviewImg64,
          totals: {
            quarters: totalColoniesByQuarter,
            imgs: quarterImage
          }
        }
      };
    } catch (error) {
      if (error instanceof Error) {
        return {
          status: "error",
          data: null,
          message: `Error procesando imagen: ${error.message}`
        };
      }
      console.error(error);
      throw error;
    }
  }
  async setGrays(file) {
    try {
      const processedImage = await ImageProcessor.convertToGrayscaleAndEnhanceContrast(file, 0.4);
      return processedImage;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Error convirtiendo a escala de grises: ${error.message}`);
      }
      console.error(error);
      throw error;
    }
  }
  async getImageHL(imageBuffer) {
    try {
      const dimensions = await ImageProcessor.getImageDimensions(imageBuffer);
      return dimensions;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Error obteniendo dimensiones: ${error.message}`);
      }
      console.error(error);
      return { height: 0, width: 0 };
    }
  }
  async cropImageQuarter(imageBuffer, x, y, width, height) {
    try {
      const image = await Jimp.read(imageBuffer);
      const cropped = image.crop({ x, y, w: width, h: height });
      return await cropped.getBuffer("image/png");
    } catch (error) {
      if (error instanceof Error) throw new Error(`Error recortando imagen: ${error.message}`);
      return null;
    }
  }
  async saveImage(file, name, x, y, user) {
    try {
      const dirName = `./uploads/${user.name}_imgs/${name}/`;
      const fileName = `${dirName}quarter_${x}_${y}.png`;
      if (!fs.existsSync(dirName)) {
        fs.mkdirSync(dirName, { recursive: true });
      }
      if (!fs.existsSync(fileName)) {
        fs.writeFileSync(fileName, file);
      }
      return { success: true, path: fileName };
    } catch (error) {
      if (error instanceof Error) throw new Error(`Error guardando imagen: ${error.message}`);
      console.error(error);
      return { success: false, path: "" };
    }
  }
  async countColonies(cut, quarters = 2, sensitivity = 50) {
    try {
      const thresholdedImage = await ImageProcessor.applyThreshold(cut, sensitivity);
      const colonies = Math.floor(Math.random() * 50) + 10;
      const overview = thresholdedImage.toString("base64");
      return { total: colonies, img: overview };
    } catch (error) {
      if (error instanceof Error) throw new Error(`Error contando colonias: ${error.message}`);
      return { total: 0, img: "" };
    }
  }
  async overviewImage(image, quarters, totals) {
    try {
      const jimpImage = await Jimp.read(image);
      const font = await loadFont(SANS_16_BLACK);
      const h = jimpImage.height;
      const w = jimpImage.width;
      const qh = Math.floor(h / quarters);
      const qw = Math.floor(w / quarters);
      const lineColor = 4278190335;
      const textBackgroundColor = 170;
      const lineWidth = 3;
      for (let i = 1; i < quarters; i++) {
        const x = i * qw;
        for (let y = 0; y < h; y++) {
          for (let thickness = 0; thickness < lineWidth; thickness++) {
            if (x + thickness < w) {
              jimpImage.setPixelColor(lineColor, x + thickness, y);
            }
          }
        }
      }
      for (let i = 1; i < quarters; i++) {
        const y = i * qh;
        for (let x = 0; x < w; x++) {
          for (let thickness = 0; thickness < lineWidth; thickness++) {
            if (y + thickness < h) {
              jimpImage.setPixelColor(lineColor, x, y + thickness);
            }
          }
        }
      }
      for (let x = 0; x < w; x++) {
        for (let thickness = 0; thickness < lineWidth; thickness++) {
          jimpImage.setPixelColor(lineColor, x, thickness);
          if (h - 1 - thickness >= 0) {
            jimpImage.setPixelColor(lineColor, x, h - 1 - thickness);
          }
        }
      }
      for (let y = 0; y < h; y++) {
        for (let thickness = 0; thickness < lineWidth; thickness++) {
          jimpImage.setPixelColor(lineColor, thickness, y);
          if (w - 1 - thickness >= 0) {
            jimpImage.setPixelColor(lineColor, w - 1 - thickness, y);
          }
        }
      }
      let idx = 0;
      for (let i = 0; i < quarters; i++) {
        for (let j = 0; j < quarters; j++) {
          const x = j * qw;
          const y = i * qh;
          const texto = totals[idx].toString();
          const textX = x + Math.floor(qw / 2) - texto.length * 4;
          const textY = y + Math.floor(qh / 2) - 8;
          const backgroundPadding = 8;
          const backgroundWidth = texto.length * 8 + backgroundPadding * 2;
          const backgroundHeight = 16 + backgroundPadding;
          for (let bgY = textY - backgroundPadding; bgY < textY + backgroundHeight; bgY++) {
            for (let bgX = textX - backgroundPadding; bgX < textX + backgroundWidth; bgX++) {
              if (bgX >= x && bgX < x + qw && bgY >= y && bgY < y + qh && bgX >= 0 && bgX < w && bgY >= 0 && bgY < h) {
                jimpImage.setPixelColor(textBackgroundColor, bgX, bgY);
              }
            }
          }
          jimpImage.print({ x: Math.max(x + 5, textX), y: Math.max(y + 5, textY), text: texto, font });
          idx++;
        }
      }
      const buffer = await jimpImage.getBuffer("image/png");
      return buffer.toString("base64");
    } catch (error) {
      if (error instanceof Error) throw new Error(`Error creando imagen overview: ${error.message}`);
      return "";
    }
  }
}

const counterController = new CounterController();
const server = {
  processImage: defineAction({
    accept: "form",
    input: z.object({
      image: z.instanceof(File),
      sensitivity: z.number().min(1).max(100).default(50),
      quarters: z.number().min(1).max(4).default(2),
      name: z.string().min(1).max(50),
      userName: z.string().min(1).max(50),
      userEmail: z.string().email()
    }),
    handler: async (input) => {
      try {
        const arrayBuffer = await input.image.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const user = {
          name: input.userName,
          email: input.userEmail
        };
        const result = await counterController.uploadImage(
          buffer,
          input.sensitivity,
          input.name,
          input.quarters,
          user
        );
        if (result.status === "error") {
          throw new Error(result.message);
        }
        return {
          success: true,
          data: result.data
        };
      } catch (error) {
        console.error("Error procesando imagen:", error);
        return {
          success: false,
          error: error.message || "Error desconocido procesando la imagen"
        };
      }
    }
  })
};

export { server };
