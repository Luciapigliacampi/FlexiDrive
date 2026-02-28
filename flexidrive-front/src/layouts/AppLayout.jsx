import { Outlet } from "react-router-dom";

const AppLayout = () => {
    return (
        <div className="min-h-screen bg-gray-100">
            <Outlet />
        </div>
    )
}

export default AppLayout;