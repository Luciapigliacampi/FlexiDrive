import { Link } from "react-router-dom";
import { Clock, Truck, Sparkles } from "lucide-react";
import heroImg from "../../assets/hero.svg";

export default function Home() {


  return (
    <main className="bg-slate-50">
      <section className="bg-slate-100">
        <div className="mx-auto max-w-7xl px-6 sm:px-10 lg:px-4 py-20">


          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 xl:gap-6 items-center">

            {/* IZQUIERDA */}
            <div className="lg:col-span-7">
              <h1 className="font-organetto text-xl sm:text-4xl font-extrabold tracking-tight text-blue-700 leading-10 ">
                FLEXIBILIDAD EN <br /> TRANSPORTE
              </h1>

              <p className="max-w-md font-medium">
                Conectamos clientes con comisionistas para envíos rápidos,
                seguros y con seguimiento en tiempo real.
              </p>

            </div>

            {/* CENTRO */}
            <div className="lg:col-span-5 flex justify-center">
              <img
                src={heroImg}
                alt="FlexiDrive"
                className="w-full max-w-[600px] object-contain"
              />
            </div>

          </div>

          {/* CARDS ABAJO (más parecidas al boceto) */}
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-slate-100/80 border border-slate-300 rounded-2xl p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl border border-slate-300 bg-white flex items-center justify-center">
                <Clock className="w-6 h-6 text-slate-800" />
              </div>
              <div className="text-xl font-semibold text-blue-700">Envíos rápidos</div>
            </div>

            <div className="bg-slate-100/80 border border-slate-300 rounded-2xl p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl border border-slate-300 bg-white flex items-center justify-center">
                <Truck className="w-6 h-6 text-slate-800" />
              </div>
              <div className="text-xl font-semibold text-blue-700">Envíos flexibles</div>
            </div>

            <div className="bg-slate-100/80 border border-slate-300 rounded-2xl p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl border border-slate-300 bg-white flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-slate-800" />
              </div>
              <div className="text-xl font-semibold text-blue-700">Optimización con IA</div>
            </div>
          </div>
        </div>
      </section>

    </main>
  );
}

function FeatureCard({ icon, title }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex items-center gap-4">
      <div className="w-12 h-12 rounded-xl border border-slate-200 flex items-center justify-center text-slate-800">
        {icon}
      </div>
      <div className="text-lg font-semibold text-blue-700 leading-tight">
        {title}
      </div>
    </div>
  );
}
