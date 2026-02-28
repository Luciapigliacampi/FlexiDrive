import { useState } from "react";
import { Input, Button, Card } from "../../components/UI";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  function submit(e) {
    e.preventDefault();
    setSent(true);
  }

  return (
    <div className="mx-auto max-w-xl py-12">
      <Card title="Recuperar contraseña">
        {!sent ? (
          <form onSubmit={submit} className="space-y-4">
            <p className="text-slate-500">Ingresá tu email y te enviamos instrucciones.</p>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" />
            <Button type="submit" className="w-full">Enviar</Button>
          </form>
        ) : (
          <div>
            <p className="text-slate-700 font-semibold">Listo ✅</p>
            <p className="mt-2 text-slate-500">Si el email existe, vas a recibir un mensaje con los pasos.</p>
          </div>
        )}
      </Card>
    </div>
  );
}
