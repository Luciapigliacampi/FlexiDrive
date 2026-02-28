//microservicios\auth-service\src\services\authService.js
import bcrypt from 'bcrypt';
import Usuario from '../models/userModel.js';
import UsuarioRol from '../models/userRoleModel.js';
import Rol from '../models/roleModel.js';
import Comisionista from '../models/comisionistaModel.js';
import Vehiculo from '../models/vehiculoModel.js';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode-terminal';
import { OAuth2Client } from 'google-auth-library';
import { generarTokenTemporal, generarTokenSesion, verificarToken } from '../utils/jwt.js';

// Registro de usuario
export const registerUser = async (data) => {
  const {
    nombre, apellido, email, password, rol,
    dni, fecha_nacimiento, telefono
  } = data;

  // 1. Validaciones
  const existe = await Usuario.findOne({ email });
  if (existe) throw new Error('Email ya registrado');

  const rolDB = await Rol.findById(rol);
  if (!rolDB) throw new Error('Rol inválido');

  // 2. Hash contraseña y crear usuario
  const contraseña_hash = await bcrypt.hash(password, 10);
  const usuario = await Usuario.create({
    nombre, apellido, email, contraseña_hash,
    dni, fecha_nacimiento, telefono, estado: 'activo'
    // ✅ NO se asigna totpSecret aquí → queda undefined/null
    // El flujo de Setup 2FA lo genera cuando el usuario hace login por primera vez
  });

  // 3. Relación usuario - rol
  await UsuarioRol.create({ usuarioId: usuario._id, rolId: rolDB._id });

  // 4. Datos extra para comisionista
  if (rolDB.nombre === 'comisionista') {
    await Comisionista.create({
      usuarioId: usuario._id,
      verificado: false
    });
  }

  // 5. Respuesta (sin otpauthUrl porque no se genera secret)
  return { message: 'Usuario creado correctamente', usuarioId: usuario._id };
};


export const checkUserProfile = async (userId) => {
  const usuario = await Usuario.findById(userId);
  const relacionRol = await UsuarioRol.findOne({ usuarioId: userId });

  // 1. Datos básicos del usuario (DNI y Fecha Nac son obligatorios para todos)
  const tieneDatosBasicos = !!(usuario?.dni && usuario?.fecha_nacimiento && usuario?.telefono);

  let datosComisionistaCompletos = false;
  let tieneVehiculo = false;
  let rol = "pendiente";

  // 2. Lógica específica si es Comisionista
  if (relacionRol?.rolId) {
    const rolDoc = await Rol.findById(relacionRol.rolId);
    rol = rolDoc?.nombre || "pendiente"

    const comi = await Comisionista.findOne({ usuarioId: userId });
    const vehiculo = await Vehiculo.findOne({ comisionistaId: userId });

    // Verificamos datos bancarios y fotos
    datosComisionistaCompletos = !!(
      comi?.alias &&
      comi?.cbu &&
      comi?.cuit &&
      comi?.dniFrenteUrl &&
      comi?.dniDorsoUrl
    );

    // Verificamos si registró al menos un vehículo
    tieneVehiculo = !!vehiculo;
  }

  return {
    perfilCompleto: tieneDatosBasicos && rol !== 'pendiente',
    datosComisionistaCompletos, // Datos bancarios/DNI
    tieneVehiculo,             // ¿Cargó la Kangoo?
    rol
  };
};

// Login de usuario (Paso 1)
export const loginUser = async ({ email, password }) => {
  const usuario = await Usuario.findOne({ email });
  if (!usuario || usuario.estado !== 'activo') {
    throw new Error('Credenciales inválidas o usuario inactivo');
  }

  // 🛡️ Agregamos esta validación para evitar el error de data and hash
  if (!usuario.contraseña_hash) {
    throw new Error('Este usuario no tiene contraseña (registrado con Google). Usa el inicio de sesión con Google.');
  }
  const passwordOk = await bcrypt.compare(password, usuario.contraseña_hash);
  if (!passwordOk) throw new Error('Credenciales inválidas');

  // SI NO TIENE TOTP: Setup
  if (!usuario.totpSecret) {
    const tempToken = generarTokenTemporal({ userId: usuario._id, step: 'setup' });
    return { requiresSetup: true, tempToken, usuarioId: usuario._id };
  }

  // SI YA TIENE TOTP: Desafío
  const tempToken = generarTokenTemporal({ userId: usuario._id, step: 'totp' });
  return { requiresTotp: true, tempToken };
};

// Verificación TOTP (Paso 2)
export const verifyTotp = async ({ tempToken, codigoIngresado }) => {
  const decoded = verificarToken(tempToken);

  if (decoded.step !== "totp") {
    throw new Error("Paso de verificación inválido");
  }

  const usuario = await Usuario.findById(decoded.userId);
  if (!usuario) throw new Error("Usuario no encontrado");

  const verified = speakeasy.totp.verify({
    secret: usuario.totpSecret,
    encoding: "base32",
    token: String(codigoIngresado).trim(),
    window: 6
  });

  if (!verified) throw new Error("Código TOTP inválido");

  // 🔥 BUSCAMOS ROL COMO STRING
  const relacion = await UsuarioRol.findOne({ usuarioId: usuario._id });
  let miRol = "cliente";

  if (relacion?.rolId) {
    const rolDoc = await Rol.findById(relacion.rolId);
    miRol = rolDoc?.nombre || "cliente";
  }

  const token = generarTokenSesion({
    userId: usuario._id,
    rol: miRol
  });

  const estadoPerfil = await checkUserProfile(usuario._id);

  return {
    message: "Login exitoso",
    token,
    ...estadoPerfil,
    rol: miRol,
    usuario: {
      id: usuario._id,
      nombre: usuario.nombre,
      email: usuario.email
    }
  };
};
/* =========================
    HABILITAR TOTP (para usuarios existentes)
========================= */

export const enableTotp = async (userId) => {
  const usuario = await Usuario.findById(userId);
  if (!usuario) throw new Error('Usuario no encontrado');

  // 1. Generar secreto y ASEGURAR que sea base32 puro
  const secret = speakeasy.generateSecret({ length: 20 });
  const secretBase32 = secret.base32; // Este es el texto: F5JHC...

  // 2. Generar la URL usando EL MISMO secreto que guardamos
  const otpauthUrl = `otpauth://totp/FlexiDrive:${usuario.email}?secret=${secretBase32}&issuer=FlexiDrive`;

  // 3. Guardar en la DB
  usuario.tempTotpSecret = secretBase32;
  await usuario.save();

  // 4. Mostrar en consola
  console.log("\n------------------------------------------------");
  console.log(`💾 Secreto Guardado: ${secretBase32}`);
  console.log(`🚀 ESCANEA ESTE QR:`);

  // Usamos la URL construida manualmente para evitar errores de la librería
  qrcode.generate(otpauthUrl, { small: true });

  console.log("------------------------------------------------\n");

  return {
    message: 'Escanea el QR para activar 2FA.',
    otpauthUrl,
    userId: usuario._id
  };
};

/* =========================
    CONFIRMAR ACTIVACIÓN TOTP
   ========================= */

// microservicios/auth-service/src/services/authService.js
export const confirmTotp = async ({ userId, codigoIngresado }) => {
  const usuario = await Usuario.findById(userId);

  if (!usuario || !usuario.tempTotpSecret) {
    throw new Error("No hay un secreto TOTP pendiente de activación.");
  }

  const secretToVerify = String(usuario.tempTotpSecret).toUpperCase().trim();

  const verified = speakeasy.totp.verify({
    secret: secretToVerify,
    encoding: "base32",
    token: String(codigoIngresado).trim(),
    window: 6,
  });

  if (!verified) {
    throw new Error("Código TOTP inválido. Revisá la hora de tu celular.");
  }

  // ✅ Activar 2FA
  usuario.totpSecret = secretToVerify;
  usuario.tempTotpSecret = undefined;
  await usuario.save();

  // ✅ Importantísimo: devolver un tempToken para el paso siguiente (TOTP challenge)
  const tempToken = generarTokenTemporal({ userId: usuario._id, step: "totp" });

  return {
    message: "2FA activada con éxito. Ahora verificá el código para iniciar sesión.",
    requiresTotp: true,
    tempToken,
  };
};

/* =========================
    DESACTIVAR TOTP (Controlada)
========================= */
export const disableTotp = async ({ userId, password, codigoIngresado }) => {
  const usuario = await Usuario.findById(userId);
  if (!usuario) throw new Error('Usuario no encontrado');

  // 1. Verificar Contraseña
  const passwordOk = await bcrypt.compare(password, usuario.contraseña_hash);
  if (!passwordOk) throw new Error('Contraseña incorrecta.');

  if (!usuario.totpSecret) throw new Error('2FA no está activa.');

  // 2. Verificar Código TOTP
  const verified = speakeasy.totp.verify({
    secret: usuario.totpSecret,
    encoding: 'base32',
    token: codigoIngresado,
    window: 1
  });

  if (!verified) throw new Error('Código TOTP inválido.');

  // 3. Desactivar
  usuario.totpSecret = undefined;
  await usuario.save();

  return { message: '2FA desactivada con éxito.' };
};

/* =========================
    RESTABLECER TOTP (Versión Simplificada)
   ========================= */
export const resetTotp = async ({ userId }) => {
  const usuario = await Usuario.findById(userId);
  if (!usuario) {
    throw new Error('Usuario no encontrado');
  }

  // Simplemente borramos el secreto. 
  // Al hacer esto, la próxima vez que intente loguearse, 
  // el sistema detectará que no tiene 2FA y le pedirá setup (requiresSetup: true)
  usuario.totpSecret = undefined;
  usuario.tempTotpSecret = undefined;

  await usuario.save();

  return {
    message: 'Seguridad restablecida. En tu próximo login deberás vincular tu dispositivo nuevamente.'
  };
};


const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const googleLoginService = async (idToken) => {
  const ticket = await client.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  const { email, given_name, family_name } = ticket.getPayload();

  let usuario = await Usuario.findOne({ email });

  if (!usuario) {
    usuario = await Usuario.create({
      // ✅ FIX: fallback para cuentas sin nombre configurado en Google
      nombre:   given_name  || "",
      apellido: family_name || "",
      email,
      estado: "activo",
      // totpSecret no se asigna → mismo flujo que registro normal
    });
    console.log(`✨ Nuevo usuario Google creado: ${email}`);
  }

  const relacion = await UsuarioRol.findOne({ usuarioId: usuario._id });
  const rol = relacion ? relacion.rolId : "pendiente";

  const estadoPerfil = await checkUserProfile(usuario._id);
  const tiene2FA = !!usuario.totpSecret;

  // 1️⃣ Sin perfil completo → completar datos
  if (!estadoPerfil.perfilCompleto) {
    const tempToken = generarTokenTemporal({ userId: usuario._id, step: "setup" });
    return {
      requiresSetup: true,
      perfilCompleto: false,
      tempToken,
      next: "complete-profile",
      rol,
      ...estadoPerfil,
      usuario: {
        id: usuario._id,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        email: usuario.email,
      },
    };
  }

  // 2️⃣ Perfil OK + tiene 2FA → verificar TOTP
  if (tiene2FA) {
    const tempToken = generarTokenTemporal({ userId: usuario._id, step: "totp" });
    return {
      requiresTotp: true,
      tempToken,
      next: "totp",
      rol,
      ...estadoPerfil,
      usuario: {
        id: usuario._id,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        email: usuario.email,
      },
    };
  }

  // 3️⃣ Perfil OK + NO tiene 2FA → setup 2FA
  const tempToken = generarTokenTemporal({ userId: usuario._id, step: "setup" });
  return {
    requiresSetup: true,
    perfilCompleto: true,   // ← explícito para que Login.jsx abra el modal correcto
    tempToken,
    next: "setup-2fa",
    // ✅ usuarioId explícito para que Login.jsx pueda setearlo en setupUserId
    usuarioId: String(usuario._id),
    rol,
    ...estadoPerfil,
    usuario: {
      id: usuario._id,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      email: usuario.email,
    },
  };
};


export const completeComisionistaService = async (userId, data) => {
  // data incluye: entidadBancaria, nroCuenta, tipoCuenta, alias, cbu, cuit, dniFrenteUrl, dniDorsoUrl

  const actualizado = await Comisionista.findOneAndUpdate(
    { usuarioId: userId },
    {
      ...data,
      // Forzamos que el usuarioId esté siempre presente en caso de que sea un 'upsert' (creación)
      usuarioId: userId
    },
    {
      new: true,
      upsert: true, // Si no existe el registro en la tabla 'comisionista', lo crea ahora
      runValidators: true // Valida contra el Schema de Mongoose
    }
  );

  // Con upsert: true, es muy difícil que 'actualizado' sea null, 
  // pero lo dejamos por seguridad.
  if (!actualizado) {
    throw new Error("No se pudo procesar el perfil del comisionista.");
  }

  return actualizado;
};

export const registerVehiculoService = async (userId, data) => {
  // Verificamos si la patente ya existe para no duplicar
  const existePatente = await Vehiculo.findOne({ patente: data.patente });
  if (existePatente) throw new Error("Esta patente ya está registrada en el sistema.");

  const nuevoVehiculo = await Vehiculo.create({
    ...data,
    comisionistaId: userId,
    verificado: false // El admin deberá aprobarlo después
  });

  return nuevoVehiculo;
};

export const updateProfileService = async (tempToken, { dni, fecha_nacimiento, rol, telefono }) => {
  // 1) Verificamos tempToken
  const decoded = verificarToken(tempToken);

  // Solo permitimos completar perfil en step=setup
  if (decoded.step !== "setup") {
    throw new Error("Token inválido para completar perfil (step != setup).");
  }

  const userId = decoded.userId;

  // 2) Actualizamos datos básicos
  const usuario = await Usuario.findByIdAndUpdate(
    userId,
    { dni, fecha_nacimiento, telefono },
    { new: true }
  );
  if (!usuario) throw new Error("Usuario no encontrado");

  // 3) Buscamos el rol por NOMBRE (porque rol viene como string)
  const rolDB = await Rol.findOne({ nombre: rol }); // "cliente" | "comisionista"
  if (!rolDB) throw new Error("Rol inválido");

  // 4) Upsert relación usuario-rol
  await UsuarioRol.findOneAndUpdate(
    { usuarioId: userId },
    { usuarioId: userId, rolId: rol },
    { upsert: true, new: true }
  );

  // 5) Si es comisionista, crear perfil técnico si no existe
  if (rol === "comisionista") {
    const existe = await Comisionista.findOne({ usuarioId: userId });
    if (!existe) {
      await Comisionista.create({ usuarioId: userId, verificado: false });
    }
  }

  // 7) Recalcular “semáforos”
  const estadoPerfil = await checkUserProfile(userId);

  if (rol === "comisionista") {
    const newTemp = generarTokenTemporal({ userId, step: "setup" }); // seguimos en setup
    return {
      message: "Perfil básico completado. Falta completar datos de comisionista.",
      next: "complete-comisionista",
      requiresSetup: true,
      tempToken: newTemp,
      ...estadoPerfil,
      rol,
      usuario: { id: usuario._id, nombre: usuario.nombre, email: usuario.email }
    };
  }

  // 8) Si es cliente, ya puede ir al paso de seguridad (2FA)
  const tiene2FA = !!usuario.totpSecret;

  if (tiene2FA) {
    const newTemp = generarTokenTemporal({ userId, step: "totp" });
    return {
      message: "Perfil completado. Falta verificar TOTP.",
      next: "totp",
      requiresTotp: true,
      tempToken: newTemp,
      ...estadoPerfil,
      rol,
      usuario: { id: usuario._id, nombre: usuario.nombre, email: usuario.email }
    };
  }

  const newTemp = generarTokenTemporal({ userId, step: "setup" });
  return {
    message: "Perfil completado. Falta configurar 2FA.",
    next: "setup-2fa",
    requiresSetup: true,
    tempToken: newTemp,
    ...estadoPerfil,
    rol,
    usuario: { id: usuario._id, nombre: usuario.nombre, email: usuario.email }
  };
};