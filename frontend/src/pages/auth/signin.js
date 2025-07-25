import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "../../firebaseConfig";
import { signInWithRedirect, getRedirectResult } from "firebase/auth";
import { useEffect } from "react";
import { FcGoogle } from "react-icons/fc"; // ✅ Import Google Icon

const Signin = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const navigate = useNavigate();
    const googleProvider = new GoogleAuthProvider(); // Google Provider

    // 🔹 Email/Password Login
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            localStorage.setItem("token", userCredential.user.accessToken);
            alert("Login Successful");
            navigate("/");
        } catch (error) {
            alert(error.message);
        }
    };

    // 🔹 Google Login
    const handleGoogleLogin = async () => {
        try {
            const result = await signInWithPopup(auth, googleProvider);
            const user = result.user;
    
            // Send user data to backend to store/fetch and get your custom JWT
            const response = await fetch("http://localhost:4000/auth/google-auth", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    uid: user.uid,
                    email: user.email,
                    name: user.displayName,
                    photoURL: user.photoURL
                })
            });
    
            const data = await response.json();
    
            if (response.ok) {
                localStorage.setItem("token", data.token);
                alert("Google Login Successful");
                navigate("/");
            } else {
                alert(data.message || "Google login failed");
            }
    
        } catch (error) {
            alert("Google login error: " + error.message);
        }
    };

    // const handleGoogleLogin = async () => {
    //     try {
    //         await signInWithRedirect(auth, googleProvider);
    //     } catch (error) {
    //         alert(error.message);
    //     }
    // };
    
    // Handle the result after redirection
    // useEffect(() => {
    //     const getRedirectResult = async () => {
    //         try {
    //             const result = await getRedirectResult(auth);
    //             if (result) {
    //                 const userCredential = result.user;
    //                 localStorage.setItem("token", userCredential.accessToken);
    //                 alert("Google Login Successful");
    //                 navigate("/");
    //             }
    //         } catch (error) {
    //             alert(error.message);
    //         }
    //     };
    //     getRedirectResult();
    // }, []);
    

    return (
        <div className="container d-flex justify-content-center align-items-center vh-100">
            <div className="card shadow-lg p-4" style={{ width: "350px", borderRadius: "10px" }}>
                <h2 className="text-center mb-4">Sign In</h2>
                <form onSubmit={handleSubmit}>
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
                    <button type="submit" className="btn btn-success w-100 mb-2">
                        Sign In
                    </button>
                </form>

                {/* Google Login Button with Icon */}
                <button className="btn btn-light w-100 d-flex align-items-center justify-content-center" onClick={handleGoogleLogin}>
                    <FcGoogle className="me-2" size={20} /> {/* ✅ Google Icon */}
                    Sign in with Google
                </button>

                <p className="text-center mt-3">
                    Don't have an account? <a href="/signup">Sign Up</a>
                </p>
            </div>
        </div>
    );
};

export default Signin;
