import { defineAction } from 'astro:actions';
import { z } from 'zod';
import { CounterController } from '@Modules/counter/controllers/CounterController';
import type { User } from '@Types/user';

const counterController = new CounterController();

export const server = {
  processImage: defineAction({
    accept: 'form',
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
        // Convertir File a Buffer
        const arrayBuffer = await input.image.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        // Crear objeto usuario
        const user: User = {
          name: input.userName,
          email: input.userEmail
        };
        
        // Procesar la imagen
        const result = await counterController.uploadImage(
          buffer,
          input.sensitivity,
          input.name,
          input.quarters,
          user
        );
        
        if (result.status === 'error') {
          throw new Error(result.message);
        }
        
        return {
          success: true,
          data: result.data
        };
      } catch (error) {
        console.error('Error procesando imagen:', error);
        return {
          success: false,
          error: error.message || 'Error desconocido procesando la imagen'
        };
      }
    }
  })
};