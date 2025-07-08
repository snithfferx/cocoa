import fs from 'fs';
import type { User } from '@Types/user';
import { ImageProcessor } from '@Utils/ImageProcessor';
import { Jimp, loadFont } from 'jimp';
import { SANS_16_BLACK } from 'jimp/fonts';

export class CounterController {
  async uploadImage(file: any, sensitivity: number, name: string, quarters: number = 2, user: User) {
    try {
      // Convertir imagen a escala de grises y mejorar contraste
      const imgGrayScale = await this.setGrays(file);
      if (!imgGrayScale) throw new Error('Error procesando la imagen');
      // Obtener dimensiones de la imagen
      const imgHeightWidth = await this.getImageHL(imgGrayScale);
      const heightQuarter = Math.floor(imgHeightWidth.height / quarters);
      const widthQuarter = Math.floor(imgHeightWidth.width / quarters);
      const totalColoniesByQuarter: number[] = [];
      const quarterImage = [];

      // Iterar por cada cuadrante de la imagen
      for (let i = 0; i < quarters; i++) {
        for (let j = 0; j < quarters; j++) {
          // Obtener el cuadrante de la imagen desde las coordenadas
          const cut = await this.cropImageQuarter(
            imgGrayScale,
            j * widthQuarter,
            i * heightQuarter,
            widthQuarter,
            heightQuarter
          );
          if (!cut) throw new Error('Error procesando la imagen');

          // Guardar el cuadrante de imagen en la carpeta del usuario
          // await this.saveImage(cut, name, i, j, user);

          // Contar colonias por cuadrante
          const totalColonies = await this.countColonies(cut, quarters, sensitivity);

          // Agregar total de colonias al array totalColoniesByQuarter
          totalColoniesByQuarter.push(totalColonies.total);
          quarterImage.push(totalColonies.img);
        }
      }

      // Sumatoria de totales
      let colonies = 0;
      totalColoniesByQuarter.forEach(item => {
        colonies += item;
      });

      // Promedio
      const average = Math.ceil(colonies / totalColoniesByQuarter.length);

      // Crear imagen con cuadrantes para retornar
      const overviewImg64 = await this.overviewImage(imgGrayScale, quarters, totalColoniesByQuarter);

      return {
        status: 'ok',
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
          status: 'error',
          data: null,
          message: `Error procesando imagen: ${error.message}`
        };
      }
      console.error(error);
      throw error;
    }
  }

  async setGrays(file: Buffer | string): Promise<Buffer | undefined> {
    try {
      // Convertir imagen a escala de grises y mejorar contraste
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

  async getImageHL(imageBuffer: Buffer): Promise<{ height: number, width: number }> {
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

  async cropImageQuarter(
    imageBuffer: Buffer,
    x: number,
    y: number,
    width: number,
    height: number
  ): Promise<Buffer | null> {
    try {
      // const Jimp = await import('jimp');
      const image = await Jimp.read(imageBuffer);
      const cropped = image.crop({ x, y, w: width, h: height });
      return await cropped.getBuffer('image/png');  //Async(Jimp.default.MIME_PNG);
    } catch (error) {
      if (error instanceof Error) throw new Error(`Error recortando imagen: ${error.message}`);
      return null;
    }
  }

  async saveImage(file: Buffer, name: string, x: number, y: number, user: User): Promise<{ success: boolean, path: string }> {
    try {
      // Crear nombre del directorio del usuario
      const dirName = `./uploads/${user.name}_imgs/${name}/`;
      // Nombre del archivo
      const fileName = `${dirName}quarter_${x}_${y}.png`;

      // Verificar si la carpeta existe, si no, crearla
      if (!fs.existsSync(dirName)) {
        fs.mkdirSync(dirName, { recursive: true });
      }

      // Verificar si la imagen no existe antes de escribirla
      if (!fs.existsSync(fileName)) {
        fs.writeFileSync(fileName, file);
      }
      return { success: true, path: fileName }
    } catch (error) {
      if (error instanceof Error) throw new Error(`Error guardando imagen: ${error.message}`);
      console.error(error);
      return { success: false, path: '' }
    }
  }

  async countColonies(cut: Buffer, quarters: number = 2, sensitivity: number = 50): Promise<{ total: number, img: string }> {
    try {
      // Aplicar umbralización adaptativa para mejorar la detección de colonias
      const thresholdedImage = await ImageProcessor.applyThreshold(cut, sensitivity);

      // Aquí implementarías la lógica de detección de contornos
      // Por ahora, retornamos un valor simulado
      const colonies = Math.floor(Math.random() * 50) + 10; // Valor simulado

      // Convertir imagen a base64 para overview
      const overview = thresholdedImage.toString('base64');

      return { total: colonies, img: overview };
    } catch (error) {
      if (error instanceof Error) throw new Error(`Error contando colonias: ${error.message}`);
      return { total: 0, img: '' };
    }
  }

  async overviewImage(image: Buffer, quarters: number, totals: number[]): Promise<string> {
    try {
      const jimpImage = await Jimp.read(image);
      const font = await loadFont(SANS_16_BLACK);

      const h = jimpImage.height;
      const w = jimpImage.width;
      const qh = Math.floor(h / quarters);
      const qw = Math.floor(w / quarters);

      // Colores para las líneas y texto
      const lineColor = 0xFF0000FF; // Rojo brillante
      const textBackgroundColor = 0x000000AA; // Negro semi-transparente
      const lineWidth = 3;

      // Dibujar rectángulo
      // Líneas verticales
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

      // Líneas horizontales
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

      // Dibujar borde exterior
      // Borde superior e inferior
      for (let x = 0; x < w; x++) {
        for (let thickness = 0; thickness < lineWidth; thickness++) {
          jimpImage.setPixelColor(lineColor, x, thickness); // Superior
          if (h - 1 - thickness >= 0) {
            jimpImage.setPixelColor(lineColor, x, h - 1 - thickness); // Inferior
          }
        }
      }

      // Borde izquierdo y derecho
      for (let y = 0; y < h; y++) {
        for (let thickness = 0; thickness < lineWidth; thickness++) {
          jimpImage.setPixelColor(lineColor, thickness, y); // Izquierdo
          if (w - 1 - thickness >= 0) {
            jimpImage.setPixelColor(lineColor, w - 1 - thickness, y); // Derecho
          }
        }
      }

      // Agregar texto con el total en cada cuadrante
      let idx = 0;
      for (let i = 0; i < quarters; i++) {
        for (let j = 0; j < quarters; j++) {
          const x = j * qw;
          const y = i * qh;

          // Agregar texto con el total
          const texto = totals[idx].toString();

          // Calcular posición centrada del texto en el cuadrante
          const textX = x + Math.floor(qw / 2) - (texto.length * 4); // Aproximación del ancho del texto
          const textY = y + Math.floor(qh / 2) - 8; // Centrar verticalmente
          
          // Crear un fondo semi-transparente para el texto
          const backgroundPadding = 8;
          const backgroundWidth = texto.length * 8 + backgroundPadding * 2;
          const backgroundHeight = 16 + backgroundPadding;

          // Dibujar fondo semi-transparente
          for (let bgY = textY - backgroundPadding; bgY < textY + backgroundHeight; bgY++) {
            for (let bgX = textX - backgroundPadding; bgX < textX + backgroundWidth; bgX++) {
              if (bgX >= x && bgX < x + qw && bgY >= y && bgY < y + qh && 
                  bgX >= 0 && bgX < w && bgY >= 0 && bgY < h) {
                jimpImage.setPixelColor(textBackgroundColor, bgX, bgY);
              }
            }
          }

          // Dibujar texto
          jimpImage.print({ x: Math.max(x + 5, textX), y: Math.max(y + 5, textY), text: texto, font: font });
          
          idx++;
        }
      }

      const buffer = await jimpImage.getBuffer('image/png');  //Async(Jimp.default.MIME_PNG);
      return buffer.toString('base64');
    } catch (error) {
      if (error instanceof Error) throw new Error(`Error creando imagen overview: ${error.message}`);
      return '';
    }
  }
}