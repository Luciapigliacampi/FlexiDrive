import mongoose from 'mongoose';

const ComisionistaSchema = new mongoose.Schema({
  usuarioId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true
  },
  entidadBancaria: { type: String, required: false },
  nroCuenta:       { type: String, required: false },
  tipoCuenta:      { type: String, required: false },
  alias:           { type: String, required: false },
  cbu:             { type: String, required: false },
  cuit:            { type: String, required: false },
  dniFrenteUrl:    { type: String, required: false },
  dniDorsoUrl:     { type: String, required: false },
  fecha_Alta:      { type: Date, default: Date.now },
  verificado:      { type: Boolean, default: false },
  reputacion:      { type: Number, default: 5 },

  // Medios de pago habilitados
  aceptaEfectivo:     { type: Boolean, default: false },
  aceptaTransferencia: { type: Boolean, default: false },
});

export default mongoose.model('Comisionista', ComisionistaSchema, 'comisionista');
