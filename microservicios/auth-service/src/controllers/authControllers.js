//microservicios\auth-service\src\controllers\authControllers.js
import DireccionFrecuente from "../models/direccionFrecuenteModel.js";
import Destinatario from "../models/destinatarioModel.js";
import {
  registerUser,
  loginUser,
  verifyTotp as verifyTotpService,
  enableTotp as enableTotpService,
  confirmTotp as confirmTotpService,
  resetTotp as resetTotpService,
  googleLoginService, completeComisionistaService, registerVehiculoService, checkUserProfile
} from '../services/authService.js';
import { registroSchema, loginSchema, userIdSchema, confirmTotpSchema, updateProfileSchema, completeComisionistaSchema } from '../validations/authValidations.js';
import Usuario from '../models/userModel.js';
import UsuarioRol from '../models/userRoleModel.js';
import Rol from '../models/roleModel.js';
import Vehiculo from '../models/vehiculoModel.js';
import Comisionista from '../models/comisionistaModel.js';
import bcrypt from 'bcrypt';
import { updateProfileService } from "../services/authService.js";
import { verificarToken } from "../utils/jwt.js";


export const register = async (req, res, next) => {
  try {
    registroSchema.parse(req.body);
    const result = await registerUser(req.body);
    return res.status(201).json(result); // Agregado return
  } catch (err) {
    return next(err); // Agregado return
  }
};


export const login = async (req, res, next) => {
  try {
    loginSchema.parse(req.body);
    const result = await loginUser(req.body);

    // Si el servicio dice que falta el TOTP, devolvemos el código 200 pero con la info de setup
    if (result.requiresTotp || result.requiresSetup) {
      return res.status(200).json({
        requiresTotp: result.requiresTotp || false,
        requiresSetup: result.requiresSetup || false,
        tempToken: result.tempToken, // Este es el que genera tu servicio
        usuarioId: result.usuarioId
      });
    }

    // Si el usuario NO tiene 2FA (flujo viejo o desactivado), devuelve el token final
    return res.status(200).json(result);

  } catch (err) {
    return next(err);
  }
};

export const verifyTotp = async (req, res, next) => {
  try {
    const { tempToken, codigoIngresado } = req.body;
    const result = await verifyTotpService({ tempToken, codigoIngresado });
    return res.status(200).json(result);
  } catch (err) {
    res.status(401);
    return next(err);
  }
};

export const enableTotp = async (req, res, next) => {
  try {
    userIdSchema.parse(req.body);
    // Corregido: Llamamos a la función importada directamente
    const result = await enableTotpService(req.body.userId);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
};

export const confirmTotp = async (req, res, next) => {
  try {
    confirmTotpSchema.parse(req.body);
    const result = await confirmTotpService(req.body);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
};

export const resetTotp = async (req, res, next) => {
  try {
    userIdSchema.parse(req.body);
    const result = await resetTotpService({ userId: req.body.userId });
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
};

export const googleLogin = async (req, res, next) => {
  try {
    const { idToken } = req.body; // Esto es lo que mandará el Front
    if (!idToken) throw new Error("Falta el idToken de Google");

    const result = await googleLoginService(idToken);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
};



/* export const updateProfile = async (req, res, next) => {
  try {
    // 1. Validamos los datos que vienen del Front
    const datosValidados = updateProfileSchema.parse(req.body);
    
    const userId = req.userId; // Viene del authMiddleware

    // 2. Usamos los datos ya validados por Zod
    const usuarioActualizado = await Usuario.findByIdAndUpdate(
      userId,
      datosValidados, 
      { new: true }
    );

    if (!usuarioActualizado) {
        throw new Error("Usuario no encontrado");
    }

    res.status(200).json({
      message: "Perfil completado con éxito",
      usuario: {
          nombre: usuarioActualizado.nombre,
          dni: usuarioActualizado.dni,
          rol: usuarioActualizado.rol
      }
    });
  } catch (error) {
    // Si Zod falla, este 'next' lo manda directo a tu errorHandler
    next(error);
  }
}; */

// export const updateProfile = async (req, res, next) => {
//   try {
//     // 1. Validamos los datos con Zod (dni, fecha_nacimiento, rol)
//     const { dni, fecha_nacimiento, rol } = updateProfileSchema.parse(req.body);

//     const userId = req.userId; // Extraído del authMiddleware

//     // 2. Actualizamos datos básicos en la colección de Usuario
//     const usuarioActualizado = await Usuario.findByIdAndUpdate(
//       userId,
//       { dni, fecha_nacimiento },
//       { new: true }
//     );

//     if (!usuarioActualizado) {
//       throw new Error("Usuario no encontrado");
//     }

//     // 3. Verificamos que el rol exista en la DB (para obtener el _id correcto)
//     const rolDB = await Rol.findById(rol);
//     if (!rolDB) {
//       throw new Error("El rol seleccionado no es válido");
//     }

//     // 4. Guardamos la relación en la tabla 'usuarioxrol'
//     // El upsert hace que si no existe la relación (caso Google), la cree.
//     await UsuarioRol.findOneAndUpdate(
//       { usuarioId: userId },
//       { rolId: rolDB._id },
//       { upsert: true, new: true }
//     );

//     // 5. Si el rol es 'comisionista', creamos su perfil específico si no existe
//     if (String(rolDB._id) === 'comisionista') {
//       const existeComisionista = await Comisionista.findOne({ usuarioId: userId });
//       if (!existeComisionista) {
//         await Comisionista.create({
//           usuarioId: userId,
//           verificado: false
//           // Los campos cuil, alias y cbu se llenarán después
//         });
//         console.log(`✅ Perfil de comisionista creado para: ${userId}`);
//       }
//     }
//     // 🌟 --- LO NUEVO: Generar Token con el ROL incluido ---
//     const tokenActualizado = generarTokenSesion({ userId, rol: rolDB._id });

//     // 6. Respuesta final exitosa
//   res.status(200).json({
//       message: "Perfil y Rol completados con éxito",
//       token: tokenActualizado, // Crucial para que el Front actualice el rol en el almacenamiento
//       perfilCompleto: true,    // Le confirma al Front que ya puede salir del formulario
//       requiresSetup: !usuarioActualizado.totpSecret, // Si es true, ella lo manda a configurar el QR
//       rol: rolDB._id,
//       usuario: {
//         id: usuarioActualizado._id,
//         nombre: usuarioActualizado.nombre,
//         dni: usuarioActualizado.dni
//       }
//     });

//   } catch (error) {
//     // Cualquier error (de Zod o de DB) cae aquí y va a tu errorHandler
//     next(error);
//   }
// };

export const updateProfile = async (req, res, next) => {
  try {
    // 1) Tomamos el tempToken del header Authorization
    const auth = req.headers.authorization || "";
    const tempToken = auth.startsWith("Bearer ") ? auth.slice(7) : "";

    console.log("📥 Body recibido:", req.body);
    console.log("🔑 TempToken recibido:", tempToken ? "SÍ" : "NO");

    if (!tempToken) throw new Error("Falta Authorization Bearer tempToken");

    // 2) Zod valida dni, fecha_nacimiento, rol ("cliente"|"comisionista")
    const parsed = updateProfileSchema.parse(req.body);

     console.log("✅ Zod parsed:", parsed);

    // 3) Delegamos lógica al service
    const result = await updateProfileService(tempToken, parsed);

    return res.status(200).json(result);
  } catch (err) {
    console.log("❌ Error en updateProfile:", err.message, err.issues || "");
    return next(err);
  }
};

/* export const updateComisionistaData = async (req, res, next) => {
  try {
    // 1. Validamos los campos con el esquema que ya tenés
    const datosValidados = completeComisionistaSchema.parse(req.body);
    
    // 2. El ID viene del token (authMiddleware)
    const userId = req.userId; 

    // 3. Llamamos al servicio (Importante: pasamos los datos limpios)
    const result = await completeComisionistaService(userId, datosValidados);

    return res.status(200).json({
      message: "Datos bancarios actualizados correctamente",
      comisionista: result
    });
  } catch (err) {
    return next(err);
  }
}; */
/* 
export const updateComisionistaData = async (req, res, next) => {
  try {
    // 1. Validamos los campos de texto con Zod
    // Multer pone los textos en req.body automáticamente
    completeComisionistaSchema.parse(req.body);
    
    const userId = req.userId; // Extraído de tu authMiddleware

    // 2. Capturamos las rutas de los archivos procesados por Multer
    // Usamos el encadenamiento opcional para evitar errores si falta un archivo
    const dniFrenteUrl = req.files?.dniFrente ? req.files.dniFrente[0].path : null;
    const dniDorsoUrl = req.files?.dniDorso ? req.files.dniDorso[0].path : null;

    // 3. Juntamos TODO en un solo objeto para el servicio
    const datosParaGuardar = {
      ...req.body,
      dniFrenteUrl,
      dniDorsoUrl
    };

    // 4. Llamamos al servicio para guardar en MongoDB
    const result = await completeComisionistaService(userId, datosParaGuardar);

    return res.status(200).json({
      message: "Datos bancarios y documentos actualizados correctamente",
      comisionista: result
    });
  } catch (err) {
    // Si falla Zod o la DB, el errorHandler se encarga
    return next(err);
  }
};
 */

export const updateComisionistaDataTemp = async (req, res, next) => {
  try {
    completeComisionistaSchema.parse(req.body);

    const auth = req.headers.authorization || "";
    const tempToken = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!tempToken) throw new Error("Falta Authorization Bearer tempToken");

    const decoded = verificarToken(tempToken);
    if (decoded.step !== "setup") throw new Error("Token inválido para completar comisionista.");

    const userId = decoded.userId;

    const dniFrenteUrl = req.files?.dniFrente
      ? req.files.dniFrente[0].path.replace(/\\/g, "/")
      : null;

    const dniDorsoUrl = req.files?.dniDorso
      ? req.files.dniDorso[0].path.replace(/\\/g, "/")
      : null;

    const datosParaGuardar = { ...req.body, dniFrenteUrl, dniDorsoUrl };

    const result = await completeComisionistaService(userId, datosParaGuardar);

    return res.status(200).json({
      message: "Datos comisionista completos. Ahora falta seguridad (2FA/TOTP).",
      comisionista: result,
      next: "totp" // el front decide a dónde ir
    });
  } catch (err) {
    return next(err);
  }
};

export const updateComisionistaData = async (req, res, next) => {
  try {
    // 1. Validamos los campos de texto con Zod
    completeComisionistaSchema.parse(req.body);

    const userId = req.userId;

    // 2. Capturamos y formateamos las rutas de los archivos
    // El .replace cambia \ por / para que Windows no de problemas
    const dniFrenteUrl = req.files?.dniFrente
      ? req.files.dniFrente[0].path.replace(/\\/g, '/')
      : null;

    const dniDorsoUrl = req.files?.dniDorso
      ? req.files.dniDorso[0].path.replace(/\\/g, '/')
      : null;

    // 3. Juntamos todo
    const datosParaGuardar = {
      ...req.body,
      dniFrenteUrl,
      dniDorsoUrl
    };

    // 4. Guardamos en la base de datos
    const result = await completeComisionistaService(userId, datosParaGuardar);

    // Si llegamos acá, devolvemos el éxito
    return res.status(200).json({
      message: "Datos bancarios y documentos actualizados correctamente",
      comisionista: result
    });

  } catch (err) {
    // Si hay un error, lo mandamos al errorHandler
    return next(err);
  }
};

export const approveComisionista = async (req, res, next) => {
  try {
    const { usuarioId } = req.body;

    // 1) Buscar relación usuario - rol
    const relacion = await UsuarioRol.findOne({ usuarioId });

    if (!relacion) {
      return res.status(400).json({ message: "Usuario sin rol asignado." });
    }

    // 2) Traer el documento del rol para comparar por nombre (string)
    const rolDoc = await Rol.findById(relacion.rolId);

    if (!rolDoc || rolDoc.nombre !== "comisionista") {
      return res.status(400).json({ message: "El usuario no tiene rol de comisionista." });
    }

    // 3) Si es comisionista, ahora sí lo aprobamos
    const comisionista = await Comisionista.findOneAndUpdate(
      { usuarioId },
      { verificado: true },
      { new: true }
    );

    if (!comisionista) {
      return res.status(404).json({ message: "No se encontró el perfil técnico del comisionista." });
    }

    return res.status(200).json({
      message: "¡Comisionista aprobado con éxito!",
      comisionista
    });
  } catch (error) {
    next(error);
  }
};

//crud usuarios
export const getMyFullProfile = async (req, res, next) => {
  try {
    // 1️⃣ Usuario base (sin contraseña)
    const usuario = await Usuario.findById(req.userId)
      .select("-contraseña_hash");

    if (!usuario) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    // 2️⃣ Rol desde tabla intermedia (STRING)
    const relacion = await UsuarioRol.findOne({ usuarioId: req.userId });

    // 🔥 CLAVE: rol ya es STRING
    const rol = relacion ? relacion.rolId : "cliente";

    // 3️⃣ Datos técnicos si es comisionista
    let datosComisionista = null;

    if (rol === "comisionista") {
      datosComisionista = await Comisionista.findOne({
        usuarioId: req.userId
      });
    }

    // 4️⃣ Respuesta final unificada
    return res.status(200).json({
      usuario,
      rol,
      comisionista: datosComisionista
    });

  } catch (error) {
    next(error);
  }
};

/* export const updateFullProfile = async (req, res, next) => {
  try {
    const { nombre, apellido, dni, fecha_nacimiento, datosBancarios } = req.body;

    // 1. Actualizamos la tabla Usuario
    const usuario = await Usuario.findByIdAndUpdate(
      req.userId,
      { nombre, apellido, dni, fecha_nacimiento },
      { new: true, runValidators: true }
    );

    // 2. Si vienen datos bancarios y el usuario es comisionista, actualizamos esa tabla
    if (datosBancarios) {
      await Comisionista.findOneAndUpdate(
        { usuarioId: req.userId },
        { ...datosBancarios },
        { new: true }
      );
    }

    res.status(200).json({ message: "Perfil actualizado con éxito" });
  } catch (error) {
    next(error);
  }
}; */

export const updateFullProfile = async (req, res, next) => {
  try {
    const {
      nombre, apellido, dni, fecha_nacimiento,
      passwordVieja, passwordNueva, // Campos de seguridad
      datosBancarios, // Campos de comisionista
      vehiculo // Para la tabla Vehiculo (marca, modelo, etc.)
    } = req.body;

    const userId = req.userId;

    // 1. Buscamos al usuario actual para comparar datos
    const usuarioActual = await Usuario.findById(userId);
    if (!usuarioActual) return res.status(404).json({ message: "Usuario no encontrado" });

    let updateUserData = {};

    // 2. LÓGICA DE CONTRASEÑA (Solo si quiere cambiarla)
    if (passwordNueva && passwordNueva.trim() !== "") {
      // ¿Mandó la vieja?
      if (!passwordVieja) {
        return res.status(400).json({ message: "Debes ingresar la contraseña actual para establecer una nueva." });
      }

      // ¿La vieja es correcta?
      const esCorrecta = await bcrypt.compare(passwordVieja, usuarioActual.contraseña_hash);
      if (!esCorrecta) {
        return res.status(401).json({ message: "La contraseña actual es incorrecta." });
      }

      // Si todo OK, hasheamos la nueva
      const salt = await bcrypt.genSalt(10);
      updateUserData.contraseña_hash = await bcrypt.hash(passwordNueva, salt);
    }

    // 3. ACTUALIZACIÓN SELECTIVA (Solo si el dato viene en el body)
    if (nombre) updateUserData.nombre = nombre;
    if (apellido) updateUserData.apellido = apellido;
    if (dni) updateUserData.dni = dni;
    if (fecha_nacimiento) updateUserData.fecha_nacimiento = fecha_nacimiento;

    // Guardamos cambios en Usuario
    const usuarioActualizado = await Usuario.findByIdAndUpdate(
      userId,
      { $set: updateUserData },
      { new: true }
    );

    // 4. LÓGICA DE COMISIONISTA
    const relacion = await UsuarioRol.findOne({ usuarioId: userId });

    if (relacion && relacion.rolId === 'comisionista') { // O 'comisionista', según tu ID
      // Si mandó datos bancarios, los actualizamos
      if (datosBancarios) {
        await Comisionista.findOneAndUpdate(
          { usuarioId: userId },
          { $set: datosBancarios },
          { new: true }
        );
      }
      // Actualizar datos del vehículo (si manda el vehiculoId)
      if (vehiculo && vehiculo.id) {
        await Vehiculo.findOneAndUpdate(
          { _id: vehiculo.id, comisionistaId: userId }, // Seguridad: que sea SU vehículo
          { $set: vehiculo },
          { new: true }
        );
      }
    }

    res.status(200).json({
      message: "¡Perfil actualizado con éxito!",
      usuario: {
        nombre: usuarioActualizado.nombre,
        email: usuarioActualizado.email
      }
    });

  } catch (error) {
    next(error);
  }
};

export const disableAccount = async (req, res, next) => {
  try {
    await Usuario.findByIdAndUpdate(req.userId, { estado: "inactivo" });

    res.status(200).json({
      message: "Cuenta desactivada correctamente. Ya no aparecerás en las búsquedas."
    });
  } catch (error) {
    next(error);
  }
};

//admin cambio de estado usuario
export const adminDisableUser = async (req, res, next) => {
  try {
    const { usuarioId } = req.body; // El Admin manda el ID de la persona a desactivar

    const usuario = await Usuario.findByIdAndUpdate(
      usuarioId,
      { estado: "inactivo" },
      { new: true }
    );

    if (!usuario) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    res.status(200).json({
      message: `El usuario ${usuario.email} ha sido desactivado por el administrador.`
    });
  } catch (error) {
    next(error);
  }
};

export const registerVehiculo = async (req, res, next) => {
  try {
    const userId = req.userId; // Viene del authMiddleware
    const vehiculo = await registerVehiculoService(userId, req.body);

    res.status(201).json({
      message: "Vehículo registrado con éxito. Pendiente de verificación.",
      vehiculo
    });
  } catch (error) {
    next(error);
  }
};

// Endpoint para que Marta elija sus vehículos al aceptar un envío
export const getMyVehicles = async (req, res, next) => {
  try {
    const vehiculos = await Vehiculo.find({ comisionistaId: req.userId });
    res.status(200).json(vehiculos);
  } catch (error) {
    next(error);
  }
};
//aprovar q esta verificado el vehiculo. 
export const approveVehiculo = async (req, res, next) => {
  try {
    const { vehiculoId } = req.body;

    const vehiculo = await Vehiculo.findByIdAndUpdate(
      vehiculoId,
      { verificado: true },
      { new: true }
    );

    if (!vehiculo) {
      return res.status(404).json({ message: "Vehículo no encontrado." });
    }

    res.status(200).json({
      message: "Vehículo verificado con éxito por el administrador.",
      vehiculo
    });
  } catch (error) {
    next(error);
  }
};

export const getComisionistasHabilitados = async (req, res, next) => {
  try {
    const relaciones = await UsuarioRol.find({ rolId: "comisionista" });
    const ids = relaciones.map(r => r.usuarioId);

    if (!ids.length) return res.status(200).json([]);

    const comisionistas = await Usuario.find({
      _id: { $in: ids },
      estado: "activo"
    }).select("nombre apellido email dni");

    const habilitados = [];

    for (let comi of comisionistas) {
      const status = await checkUserProfile(comi._id);

      if (
        status.perfilCompleto &&
        status.datosComisionistaCompletos &&
        status.tieneVehiculo
      ) {
        habilitados.push({
          id: comi._id,
          nombre: comi.nombre,
          apellido: comi.apellido,
          email: comi.email,
          verificado: true
        });
      }
    }

    res.status(200).json(habilitados);
  } catch (error) {
    next(error);
  }
};

export const getUserPublicInfo = async (req, res, next) => {
  try {
    const { id } = req.params;
    const usuario = await Usuario.findById(id).select('nombre apellido telefono email');

    if (!usuario) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    res.status(200).json(usuario);
  } catch (error) {
    next(error);
  }
};

export const getMyStatus = async (req, res, next) => {
  try {
    const status = await checkUserProfile(req.userId);
    res.status(200).json(status);
  } catch (error) {
    next(error);
  }
};

export const getPublicComisionistaProfile = async (req, res, next) => {
  try {
    const { id } = req.params;
    const usuario = await Usuario.findById(id).select('nombre apellido telefono email');
    const comisionista = await Comisionista.findOne({ usuarioId: id }).select('verificado reputacion');
    const vehiculo = await Vehiculo.findOne({ comisionistaId: id, verificado: true }).select('marca modelo patente color');

    if (!usuario) return res.status(404).json({ message: "Comisionista no encontrado" });

    res.status(200).json({ usuario, comisionista, vehiculo });
  } catch (error) {
    next(error);
  }
};

export const updateReputacionComisionista = async (req, res, next) => {
  try {
    const { id } = req.params; // Este es el usuarioId que viene del Micro de Calificaciones
    const { promedio } = req.body;

    // 1. Intentamos actualizar directamente en la tabla Comisionistas
    // Buscamos por usuarioId porque es la relación que tenés
    const perfilComisionista = await Comisionista.findOneAndUpdate(
      { usuarioId: id },
      { reputacion: promedio },
      { new: true }
    );

    // 2. Si no existe en esta tabla, significa que NO es un comisionista
    if (!perfilComisionista) {
      return res.status(404).json({
        message: "Error: El usuario no posee un perfil de comisionista activo."
      });
    }

    res.status(200).json({
      message: "Reputación actualizada con éxito en el perfil técnico.",
      reputacion: perfilComisionista.reputacion
    });
  } catch (error) {
    next(error);
  }
};

// ===============================
// Direcciones frecuentes (ORIGEN)
// ===============================
export const getMisDirecciones = async (req, res) => {
  try {
    const list = await DireccionFrecuente.find({ userId: req.userId }).sort({ createdAt: -1 });
    return res.status(200).json(list);
  } catch (e) {
    return res.status(500).json({ error: "Error al obtener direcciones." });
  }
};

export const addMiDireccion = async (req, res) => {
  try {
    const { alias, direccion, ciudad, provincia, cp, placeId, lat, lng } = req.body;

    if (!alias || !direccion || !ciudad || !provincia || !cp || !placeId || lat == null || lng == null) {
      return res.status(400).json({ error: "Faltan campos obligatorios." });
    }

    const created = await DireccionFrecuente.create({
      userId: req.userId,
      alias: String(alias).trim(),
      direccion: String(direccion).trim(),
      ciudad: String(ciudad).trim(),
      provincia: String(provincia).trim(),
      cp: String(cp).trim(),
      placeId: String(placeId).trim(),
      lat: Number(lat),
      lng: Number(lng),
    });

    return res.status(201).json(created);
  } catch (e) {
    return res.status(500).json({ error: "Error al guardar dirección." });
  }
};

export const deleteMiDireccion = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await DireccionFrecuente.findOneAndDelete({ _id: id, userId: req.userId });
    if (!deleted) return res.status(404).json({ error: "Dirección no encontrada." });

    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: "Error al eliminar dirección." });
  }
};

// ===============================
// Destinatarios (DESTINO)
// ===============================
export const getMisDestinatarios = async (req, res) => {
  try {
    const list = await Destinatario.find({ userId: req.userId }).sort({ createdAt: -1 });
    return res.status(200).json(list);
  } catch (e) {
    return res.status(500).json({ error: "Error al obtener destinatarios." });
  }
};

export const addMiDestinatario = async (req, res) => {
  try {
    const {
      apellido, nombre, dni, telefono,
      direccion, ciudad, provincia, cp,
      placeId, lat, lng,
    } = req.body;

    // ✅ Validación completa
    if (!apellido || !nombre || !dni || !telefono || !direccion ||
      !ciudad || !provincia || !cp || !placeId || lat == null || lng == null) {
      return res.status(400).json({ error: "Faltan campos obligatorios." });
    }

    const dniStr = String(dni).trim();
    if (!/^\d{7,8}$/.test(dniStr)) {
      return res.status(400).json({ error: "DNI inválido (7 u 8 dígitos)." });
    }

    const created = await Destinatario.create({
      userId: req.userId,
      // ✅ "alias" eliminado: no existe en el modelo DestinatarioSchema
      apellido: String(apellido).trim(),
      nombre: String(nombre).trim(),
      dni: dniStr,
      telefono: String(telefono).trim(),
      direccion: String(direccion).trim(),
      ciudad: String(ciudad).trim(),
      provincia: String(provincia).trim(),
      cp: String(cp).trim(),
      placeId: String(placeId).trim(),
      lat: Number(lat),
      lng: Number(lng),
    });

    return res.status(201).json(created);
  } catch (e) {
    return res.status(500).json({ error: "Error al guardar destinatario." });
  }
};

export const deleteMiDestinatario = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await Destinatario.findOneAndDelete({ _id: id, userId: req.userId });
    if (!deleted) return res.status(404).json({ error: "Destinatario no encontrado." });

    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: "Error al eliminar destinatario." });
  }
};

export const updateVehiculo = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.userId; // del authMiddleware

    // Solo campos editables — nunca tocamos comisionistaId ni verificado
    const { nombre, tipo, marca, modelo, patente, adicionales, capacidad } = req.body;

    const actualizado = await Vehiculo.findOneAndUpdate(
      { _id: id, comisionistaId: userId }, // seguridad: solo su propio vehículo
      { $set: { nombre, tipo, marca, modelo, patente: patente?.toUpperCase(), adicionales, capacidad } },
      { new: true, runValidators: true }
    );

    if (!actualizado) {
      return res.status(404).json({ message: "Vehículo no encontrado o no autorizado." });
    }

    return res.status(200).json({
      message: "Vehículo actualizado con éxito.",
      vehiculo: actualizado,
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/auth/vehicles/:id
export const deleteVehiculo = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const eliminado = await Vehiculo.findOneAndDelete({
      _id: id,
      comisionistaId: userId, // seguridad: solo su propio vehículo
    });

    if (!eliminado) {
      return res.status(404).json({ message: "Vehículo no encontrado o no autorizado." });
    }

    return res.status(200).json({ ok: true, message: "Vehículo eliminado." });
  } catch (error) {
    next(error);
  }
};