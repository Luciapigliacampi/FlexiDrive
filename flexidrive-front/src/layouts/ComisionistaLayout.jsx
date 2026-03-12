//flexidrive-front\src\layouts\ComisionistaLayout.jsx
import { Outlet } from "react-router-dom";
import SidebarComisionista from "../components/Sidebar";
import NavbarComisionista from "../components/NavbarComisionista";

export default function ComisionistaLayout() {
  return (
    <div className="min-h-screen bg-slate-100 flex">
      <SidebarComisionista />

      <div className="flex-1 flex flex-col">
        <NavbarComisionista />

        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}