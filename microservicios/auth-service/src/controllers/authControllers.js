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
    return res.status(201).json(result);
  } catch (err) {
    return next(err);
  }
};


export const login = async (req, res, next) => {
  try {
    loginSchema.parse(req.body);
    const result = await loginUser(req.body);

    if (result.requiresTotp || result.requiresSetup) {
      return res.status(200).json({
        requiresTotp: result.requiresTotp || false,
        requiresSetup: result.requiresSetup || false,
        tempToken: result.tempToken,
        usuarioId: result.usuarioId
      });
    }

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
    const { idToken } = req.body;
    if (!idToken) throw new Error("Falta el idToken de Google");

    const result = await googleLoginService(idToken);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const auth = req.headers.authorization || "";
    const tempToken = auth.startsWith("Bearer ") ? auth.slice(7) : "";

    console.log("📥 Body recibido:", req.body);
    console.log("🔑 TempToken recibido:", tempToken ? "SÍ" : "NO");

    if (!tempToken) throw new Error("Falta Authorization Bearer tempToken");

    const parsed = updateProfileSchema.parse(req.body);

    console.log("✅ Zod parsed:", parsed);

    const result = await updateProfileService(tempToken, parsed);

    return res.status(200).json(result);
  } catch (err) {
    console.log("❌ Error en updateProfile:", err.message, err.issues || "");
    return next(err);
  }
};

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
      next: "totp"
    });
  } catch (err) {
    return next(err);
  }
};

export const updateComisionistaData = async (req, res, next) => {
  try {
    completeComisionistaSchema.parse(req.body);

    const userId = req.userId;

    const dniFrenteUrl = req.files?.dniFrente
      ? req.files.dniFrente[0].path.replace(/\\/g, '/')
      : null;

    const dniDorsoUrl = req.files?.dniDorso
      ? req.files.dniDorso[0].path.replace(/\\/g, '/')
      : null;

    const datosParaGuardar = {
      ...req.body,
      dniFrenteUrl,
      dniDorsoUrl
    };

    const result = await completeComisionistaService(userId, datosParaGuardar);

    return res.status(200).json({
      message: "Datos bancarios y documentos actualizados correctamente",
      comisionista: result
    });

  } catch (err) {
    return next(err);
  }
};

export const approveComisionista = async (req, res, next) => {
  try {
    const { usuarioId } = req.body;

    const relacion = await UsuarioRol.findOne({ usuarioId });

    if (!relacion) {
      return res.status(400).json({ message: "Usuario sin rol asignado." });
    }

    const rolDoc = await Rol.findById(relacion.rolId);

    if (!rolDoc || rolDoc.nombre !== "comisionista") {
      return res.status(400).json({ message: "El usuario no tiene rol de comisionista." });
    }

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

export const getMyFullProfile = async (req, res, next) => {
  try {
    const usuario = await Usuario.findById(req.userId)
      .select("-contraseña_hash");

    if (!usuario) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    const relacion = await UsuarioRol.findOne({ usuarioId: req.userId });
    const rol = relacion ? relacion.rolId : "cliente";

    let datosComisionista = null;

    if (rol === "comisionista") {
      datosComisionista = await Comisionista.findOne({ usuarioId: req.userId });
    }

    return res.status(200).json({
      usuario,
      rol,
      comisionista: datosComisionista
    });

  } catch (error) {
    next(error);
  }
};

export const updateFullProfile = async (req, res, next) => {
  try {
    const {
      nombre, apellido, dni, fecha_nacimiento,
      passwordVieja, passwordNueva,
      datosBancarios,
      vehiculo
    } = req.body;

    const userId = req.userId;

    const usuarioActual = await Usuario.findById(userId);
    if (!usuarioActual) return res.status(404).json({ message: "Usuario no encontrado" });

    let updateUserData = {};

    if (passwordNueva && passwordNueva.trim() !== "") {
      if (!passwordVieja) {
        return res.status(400).json({ message: "Debes ingresar la contraseña actual para establecer una nueva." });
      }

      const esCorrecta = await bcrypt.compare(passwordVieja, usuarioActual.contraseña_hash);
      if (!esCorrecta) {
        return res.status(401).json({ message: "La contraseña actual es incorrecta." });
      }

      const salt = await bcrypt.genSalt(10);
      updateUserData.contraseña_hash = await bcrypt.hash(passwordNueva, salt);
    }

    if (nombre) updateUserData.nombre = nombre;
    if (apellido) updateUserData.apellido = apellido;
    if (dni) updateUserData.dni = dni;
    if (fecha_nacimiento) updateUserData.fecha_nacimiento = fecha_nacimiento;

    const usuarioActualizado = await Usuario.findByIdAndUpdate(
      userId,
      { $set: updateUserData },
      { new: true }
    );

    const relacion = await UsuarioRol.findOne({ usuarioId: userId });

    if (relacion && relacion.rolId === 'comisionista') {
      if (datosBancarios) {
        await Comisionista.findOneAndUpdate(
          { usuarioId: userId },
          { $set: datosBancarios },
          { new: true }
        );
      }
      if (vehiculo && vehiculo.id) {
        await Vehiculo.findOneAndUpdate(
          { _id: vehiculo.id, comisionistaId: userId },
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

export const adminDisableUser = async (req, res, next) => {
  try {
    const { usuarioId } = req.body;

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
    const userId = req.userId;
    const vehiculo = await registerVehiculoService(userId, req.body);

    res.status(201).json({
      message: "Vehículo registrado con éxito. Pendiente de verificación.",
      vehiculo
    });
  } catch (error) {
    next(error);
  }
};

export const getMyVehicles = async (req, res, next) => {
  try {
    const vehiculos = await Vehiculo.find({ comisionistaId: req.userId });
    res.status(200).json(vehiculos);
  } catch (error) {
    next(error);
  }
};

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

// ✅ FIX: incluye aceptaEfectivo y aceptaTransferencia
export const getPublicComisionistaProfile = async (req, res, next) => {
  try {
    const { id } = req.params;
    const usuario = await Usuario.findById(id).select('nombre apellido telefono email');
    const comisionista = await Comisionista.findOne({ usuarioId: id })
      .select('verificado reputacion aceptaEfectivo aceptaTransferencia');
    const vehiculo = await Vehiculo.findOne({ comisionistaId: id, verificado: true })
      .select('marca modelo patente color');

    if (!usuario) return res.status(404).json({ message: "Comisionista no encontrado" });

    res.status(200).json({ usuario, comisionista, vehiculo });
  } catch (error) {
    next(error);
  }
};

export const updateReputacionComisionista = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { promedio } = req.body;

    const perfilComisionista = await Comisionista.findOneAndUpdate(
      { usuarioId: id },
      { reputacion: promedio },
      { new: true }
    );

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

function pickProvincia(body) {
  const p = body?.provincia && typeof body.provincia === "object" ? body.provincia : null;
  const provinciaId = (p?.provinciaId ?? body?.provinciaId ?? "").toString().trim();
  const provinciaNombre = (p?.provinciaNombre ?? body?.provinciaNombre ?? "").toString().trim();
  return { provinciaId, provinciaNombre };
}

function pickLocalidad(body) {
  const l = body?.localidad && typeof body.localidad === "object" ? body.localidad : null;
  const localidadId = (l?.localidadId ?? body?.localidadId ?? "").toString().trim();
  const localidadNombre = (l?.localidadNombre ?? body?.localidadNombre ?? "").toString().trim();
  return { localidadId, localidadNombre };
}

function addLegacyStrings(doc) {
  const o = doc?.toObject ? doc.toObject() : doc;
  return {
    ...o,
    ciudad: o?.localidad?.localidadNombre ?? "",
    provincia: o?.provincia?.provinciaNombre ?? "",
  };
}

export const getMisDirecciones = async (req, res) => {
  try {
    const list = await DireccionFrecuente.find({ userId: req.userId }).sort({ createdAt: -1 });
    return res.status(200).json(list.map(addLegacyStrings));
  } catch (e) {
    return res.status(500).json({ error: "Error al obtener direcciones." });
  }
};

export const addMiDireccion = async (req, res) => {
  try {
    const { alias, direccion, cp, placeId, lat, lng } = req.body;

    const provincia = pickProvincia(req.body);
    const localidad = pickLocalidad(req.body);

    if (!alias || !direccion || !cp || !placeId || lat == null || lng == null) {
      return res.status(400).json({ error: "Faltan campos obligatorios." });
    }

    if (!provincia.provinciaId || !provincia.provinciaNombre) {
      return res.status(400).json({
        error: "Error de validación",
        detalles: [{ campo: "provincia", mensaje: "provinciaId y provinciaNombre son obligatorios." }],
      });
    }

    if (!localidad.localidadId || !localidad.localidadNombre) {
      return res.status(400).json({
        error: "Error de validación",
        detalles: [{ campo: "localidad", mensaje: "localidadId y localidadNombre son obligatorios." }],
      });
    }

    const created = await DireccionFrecuente.create({
      userId: req.userId,
      alias: String(alias).trim(),
      direccion: String(direccion).trim(),
      provincia: {
        provinciaId: provincia.provinciaId,
        provinciaNombre: provincia.provinciaNombre,
      },
      localidad: {
        localidadId: localidad.localidadId,
        localidadNombre: localidad.localidadNombre,
      },
      cp: String(cp).trim(),
      placeId: String(placeId).trim(),
      lat: Number(lat),
      lng: Number(lng),
    });

    return res.status(201).json(addLegacyStrings(created));
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
    return res.status(200).json(list.map(addLegacyStrings));
  } catch (e) {
    return res.status(500).json({ error: "Error al obtener destinatarios." });
  }
};

export const addMiDestinatario = async (req, res) => {
  try {
    const {
      apellido, nombre, dni, telefono,
      direccion, cp,
      placeId, lat, lng,
    } = req.body;

    const provincia = pickProvincia(req.body);
    const localidad = pickLocalidad(req.body);

    if (!apellido || !nombre || !dni || !telefono || !direccion || !cp || !placeId || lat == null || lng == null) {
      return res.status(400).json({ error: "Faltan campos obligatorios." });
    }

    if (!provincia.provinciaId || !provincia.provinciaNombre) {
      return res.status(400).json({
        error: "Error de validación",
        detalles: [{ campo: "provincia", mensaje: "provinciaId y provinciaNombre son obligatorios." }],
      });
    }

    if (!localidad.localidadId || !localidad.localidadNombre) {
      return res.status(400).json({
        error: "Error de validación",
        detalles: [{ campo: "localidad", mensaje: "localidadId y localidadNombre son obligatorios." }],
      });
    }

    const dniStr = String(dni).trim();
    if (!/^\d{7,8}$/.test(dniStr)) {
      return res.status(400).json({ error: "DNI inválido (7 u 8 dígitos)." });
    }

    const created = await Destinatario.create({
      userId: req.userId,
      apellido: String(apellido).trim(),
      nombre: String(nombre).trim(),
      dni: dniStr,
      telefono: String(telefono).trim(),
      direccion: String(direccion).trim(),
      provincia: {
        provinciaId: provincia.provinciaId,
        provinciaNombre: provincia.provinciaNombre,
      },
      localidad: {
        localidadId: localidad.localidadId,
        localidadNombre: localidad.localidadNombre,
      },
      cp: String(cp).trim(),
      placeId: String(placeId).trim(),
      lat: Number(lat),
      lng: Number(lng),
    });

    return res.status(201).json(addLegacyStrings(created));
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
    const userId = req.userId;

    const { nombre, tipo, marca, modelo, patente, adicionales, capacidad } = req.body;

    const actualizado = await Vehiculo.findOneAndUpdate(
      { _id: id, comisionistaId: userId },
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

export const deleteVehiculo = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const eliminado = await Vehiculo.findOneAndDelete({
      _id: id,
      comisionistaId: userId,
    });

    if (!eliminado) {
      return res.status(404).json({ message: "Vehículo no encontrado o no autorizado." });
    }

    return res.status(200).json({ ok: true, message: "Vehículo eliminado." });
  } catch (error) {
    next(error);
  }
};

export const getDestinatarioById = async (req, res) => {
  try {
    const { id } = req.params;
    const dest = await Destinatario.findById(id).select("apellido nombre dni telefono");
    if (!dest) return res.status(404).json({ error: "Destinatario no encontrado." });
    res.status(200).json(dest);
  } catch (e) {
    res.status(500).json({ error: "Error al obtener destinatario." });
  }
};
