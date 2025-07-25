import React from "react";
import { Link, useNavigate } from "react-router-dom";

const Navbar = () => {
    const navigate = useNavigate();
    const token = localStorage.getItem("token"); // ✅ Check if user is logged in

    const handleLogout = () => {
        localStorage.removeItem("token"); // ✅ Remove token on logout
        alert("Logged out successfully");
        navigate("/signin"); // ✅ Redirect to login page
    };

    return (
        <nav className="navbar navbar-expand-lg navbar-dark bg-dark px-3">
            <Link className="navbar-brand" to="/">
                🌿 Vegetation Map
            </Link>
            <button
                className="navbar-toggler"
                type="button"
                data-bs-toggle="collapse"
                data-bs-target="#navbarNav"
                aria-controls="navbarNav"
                aria-expanded="false"
                aria-label="Toggle navigation"
            >
                <span className="navbar-toggler-icon"></span>
            </button>
            <div className="collapse navbar-collapse" id="navbarNav">
                <ul className="navbar-nav ms-auto">
                    <li className="nav-item">
                        <Link className="nav-link" to="/">Home</Link>
                    </li>
                    <li className="nav-item">
                        <Link className="nav-link" to="/map">Map</Link>
                    </li>
                    <li className="nav-item">
                        <Link className="nav-link" to="/about">About</Link>
                    </li>
                    <li className="nav-item">
                        {token ? (
                            <button className="btn btn-danger" onClick={handleLogout}>
                                Logout
                            </button>
                        ) : (
                            <Link className="nav-link btn btn-success text-white px-3" to="/signin">
                                Login
                            </Link>
                        )}
                    </li>
                </ul>
            </div>
        </nav>
    );
};

export default Navbar;
