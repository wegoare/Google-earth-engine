import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "../../firebaseConfig"; // Import Firebase auth
import { FcGoogle } from "react-icons/fc"; // Google Icon

const Signup = () => {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const navigate = useNavigate();

    // Handle email/password signup
    const handleSignup = async (e) => {
        e.preventDefault();
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            console.log("User signed up:", userCredential.user);
            alert("Signup Successful!");
            navigate("/"); // Redirect to Home
        } catch (error) {
            alert(error.message);
        }
    };

    // Handle Google Sign-In
    const handleGoogleSignup = async () => {
        const provider = new GoogleAuthProvider();
        try {
            const result = await signInWithPopup(auth, provider);
            console.log("Google User:", result.user);
            alert("Signup Successful with Google!");
            navigate("/"); // Redirect to Home
        } catch (error) {
            alert(error.message);
        }
    };

    return (
        <div className="container d-flex justify-content-center align-items-center vh-100">
            <div className="card shadow-lg p-4" style={{ width: "350px", borderRadius: "10px" }}>
                <h2 className="text-center mb-4">Sign Up</h2>
                <form onSubmit={handleSignup}>
                    <div className="mb-3">
                        <label className="form-label">Name</label>
                        <input
                            type="text"
                            className="form-control"
                            placeholder="Enter your name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>
                    <div className="mb-3">
                        <label className="form-label">Email</label>
                        <input
                            type="email"
                            className="form-control"
                            placeholder="Enter your email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className="mb-3">
                        <label className="form-label">Password</label>
                        <input
                            type="password"
                            className="form-control"
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <button type="submit" className="btn btn-primary w-100">
                        Sign Up
                    </button>
                </form>

                {/* Google Sign-In Button */}
                <button
                    className="btn btn-light w-100 mt-3 d-flex align-items-center justify-content-center border"
                    onClick={handleGoogleSignup}
                >
                    <FcGoogle className="me-2" size={20} /> Sign Up with Google
                </button>

                <p className="text-center mt-3">
                    Already have an account? <a href="/signin">Sign In</a>
                </p>
            </div>
        </div>
    );
};

export default Signup;
