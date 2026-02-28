//flexidrive-front\src\layouts\ClienteLayout.jsx
import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";

export default function ClienteLayout() {
  return (
    <div className="min-h-screen bg-slate-100">
      <Navbar />
      <main className="mx-auto">
        <Outlet />
      </main>
    </div>
  );
}
