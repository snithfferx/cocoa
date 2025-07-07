/**
 * Utilidad para detección de contornos en imágenes
 * Esta es una implementación básica. Para detección más avanzada,
 * considera usar OpenCV.js o algoritmos más sofisticados
 */
export class ContourDetection {
  /**
   * Detecta contornos básicos en una imagen binarizada
   * @param imageData - Datos de la imagen en formato ImageData
   * @param minArea - Área mínima para considerar un contorno válido
   * @returns Array de contornos detectados
   */
  static detectContours(imageData: ImageData, minArea: number = 10): Array<{x: number, y: number, area: number}> {
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    const visited = new Array(width * height).fill(false);
    const contours: Array<{x: number, y: number, area: number}> = [];
    
    // Función para obtener el índice en el array de datos
    const getIndex = (x: number, y: number) => (y * width + x) * 4;
    
    // Función para verificar si un pixel es blanco (colonia)
    const isWhitePixel = (x: number, y: number) => {
      if (x < 0 || x >= width || y < 0 || y >= height) return false;
      const idx = getIndex(x, y);
      return data[idx] > 128; // Umbral para considerar blanco
    };
    
    // Flood fill para encontrar contornos conectados
    const floodFill = (startX: number, startY: number): number => {
      const stack = [{x: startX, y: startY}];
      let area = 0;
      
      while (stack.length > 0) {
        const {x, y} = stack.pop()!;
        const index = y * width + x;
        
        if (x < 0 || x >= width || y < 0 || y >= height || visited[index] || !isWhitePixel(x, y)) {
          continue;
        }
        
        visited[index] = true;
        area++;
        
        // Agregar píxeles vecinos
        stack.push({x: x + 1, y});
        stack.push({x: x - 1, y});
        stack.push({x, y: y + 1});
        stack.push({x, y: y - 1});
      }
      
      return area;
    };
    
    // Buscar contornos en toda la imagen
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = y * width + x;
        
        if (!visited[index] && isWhitePixel(x, y)) {
          const area = floodFill(x, y);
          
          if (area >= minArea) {
            contours.push({x, y, area});
          }
        }
      }
    }
    
    return contours;
  }
  
  /**
   * Filtra contornos por tamaño para eliminar ruido
   * @param contours - Array de contornos
   * @param minArea - Área mínima
   * @param maxArea - Área máxima
   * @returns Contornos filtrados
   */
  static filterContoursBySize(
    contours: Array<{x: number, y: number, area: number}>, 
    minArea: number = 10, 
    maxArea: number = 1000
  ): Array<{x: number, y: number, area: number}> {
    return contours.filter(contour => 
      contour.area >= minArea && contour.area <= maxArea
    );
  }
}