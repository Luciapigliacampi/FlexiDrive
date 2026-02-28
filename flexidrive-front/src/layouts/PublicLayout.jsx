import Navbar from "../components/Navbar";
import { Outlet } from "react-router-dom";

const PublicLayout = () => {
  return (
    <div>
      <Navbar />
      <Outlet />
    </div>
  );
};

export default PublicLayout;
