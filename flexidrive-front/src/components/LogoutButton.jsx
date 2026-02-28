import useAuth from "../hooks/useAuth";

export default function LogoutButton({ className = "" }) {
  const { logout } = useAuth();

  return (
    <button
      onClick={logout}
      className={`text-sm font-medium text-red-600 hover:text-red-700 transition ${className}`}
    >
      Cerrar sesión
    </button>
  );
}
