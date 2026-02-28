import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">404</h1>
      <p className="mt-2 text-gray-600">No encontramos esa página.</p>
      <Link className="text-blue-600 underline mt-4 inline-block" to="/">
        Volver al inicio
      </Link>
    </div>
  );
}
