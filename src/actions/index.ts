import { ActionError, defineAction } from 'astro:actions';
import { z } from 'zod';
import { CounterController } from '@Modules/counter/controllers/CounterController';
// import type { User } from '@Types/user';

const counterController = new CounterController();

export const server = {
  processImage: defineAction({
    accept: 'form',
    input: z.object({
      image: z.instanceof(File),
      sensitivity: z.number().min(1).max(100).default(50),
      quarters: z.number().min(1).max(4).default(2),
      name: z.string().min(1).max(50),
    }),
    handler: async (input) => {
      try {
        console.log('Procesando imagen:', { name: input.name, sensitivity: input.sensitivity, quarters: input.quarters });
        // Convertir File a Buffer
        const arrayBuffer = await input.image.arrayBuffer();
        if (!arrayBuffer) throw new ActionError({message: "No se ha pudo sacar el buffer", code: 'BAD_REQUEST'});
        const buffer = Buffer.from(arrayBuffer);
        
        // Crear objeto usuario
        // const user: User = {
        //   name: input.userName,
        //   email: input.userEmail
        // };
        
        // Procesar la imagen
        const result = await counterController.uploadImage(
          buffer,
          input.sensitivity,
          input.name,
          input.quarters,
        );
        // user
        
        if (result.status === 'error') {
          throw new ActionError({message: result.message, code: 'BAD_REQUEST'});
        }
        
        const response = {
          success: true,
          data: result.data
        };
        return response;
      } catch (error) {
        
        if (error instanceof Error) {
          
          throw new ActionError({message: error.message, code: 'BAD_REQUEST'});
        }
        
        throw new ActionError({message:'Error desconocido procesando la imagen',code: 'INTERNAL_SERVER_ERROR'});
      }
    }
  })
};