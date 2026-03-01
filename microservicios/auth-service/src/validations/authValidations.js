// microservicios\auth-service\src\validations\authValidations.js
import { z } from 'zod';

export const registroSchema = z.object({
  nombre: z.string().min(2, "El nombre debe tener al menos 2 letras"),
  apellido: z.string().min(2, "El apellido es obligatorio"), // <--- Agregalo acá
  email: z.string().email("El formato del email no es válido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  dni: z.number().positive("El DNI debe ser un número positivo"),
  telefono: z.string()
    .min(10, "El teléfono es demasiado corto")
    .max(15, "El teléfono es demasiado largo")
    .regex(/^\d+$/, "El teléfono solo debe contener números") 
    // .transform() ayuda a limpiar si mandan espacios o un "+"
    .transform(val => val.replace(/\D/g, '')),
  fecha_nacimiento: z.string().or(z.date()), // Acepta string de fecha o fecha
  rol: z.string().min(1, "El rol es obligatorio")
});

export const loginSchema = z.object({
  email: z.string().email("Formato de email inválido"),
  password: z.string().min(1, "La contraseña es requerida")
});


// Esquema para acciones que solo requieren el ID de usuario (Enable y Reset)
export const userIdSchema = z.object({
  userId: z.string().length(24, "El ID de usuario debe ser un ID válido de MongoDB (24 caracteres)")
});

// Esquema para confirmar el TOTP
export const confirmTotpSchema = z.object({
  userId: z.string().length(24, "ID inválido"),
  codigoIngresado: z.string().length(6, "El código debe ser de 6 dígitos")
});


export const updateProfileSchema = z.object({
  dni: z
    .number({ invalid_type_error: "El DNI debe ser un número" })
    .min(1000000, "DNI demasiado corto")
    .max(99999999, "DNI demasiado largo"),
  
  fecha_nacimiento: z
    .string()
    .refine((fecha) => !isNaN(Date.parse(fecha)), {
      message: "Fecha de nacimiento inválida",
    })
    .transform((fecha) => new Date(fecha))
    .refine((fecha) => fecha < new Date(), {
      message: "La fecha de nacimiento no puede ser futura",
    }),

  rol: z.enum(['cliente', 'comisionista'], {
    errorMap: () => ({ message: "El rol debe ser 'cliente' o 'comisionista'" }),
  }),

  telefono: z
    .union([z.string(), z.number()])
    .transform((val) => String(val).replace(/\D/g, ""))
    .refine((val) => val.length >= 7, { message: "Teléfono demasiado corto" })
    .optional(),
});

export const completeComisionistaSchema = z.object({
  entidadBancaria: z.string().min(2, "Ingresá el nombre del banco"),
  nroCuenta: z.string().min(5, "Número de cuenta inválido"),
  alias: z.string().min(3, "Alias demasiado corto"),
  tipoCuenta: z.string().min(1, "El tipo de cuenta es obligatorio"), 
  cbu: z.string().length(22, "El CBU debe tener 22 dígitos").regex(/^\d+$/),
  cuit: z.string().regex(/^\d{2}-\d{8}-\d{1}$/, "Formato de CUIT inválido"),
  
  // Agregamos estos dos para que Zod no se queje de las rutas de las fotos
  dniFrenteUrl: z.string().optional().nullable(),
  dniDorsoUrl: z.string().optional().nullable()
});