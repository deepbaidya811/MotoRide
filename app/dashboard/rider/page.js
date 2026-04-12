"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function RiderDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showSwitchConfirm, setShowSwitchConfirm] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData) {
      router.push("/login");
      return;
    }
    const parsed = JSON.parse(userData);
    setUser(parsed);
    if (parsed.userType !== "rider") {
      router.push("/dashboard/passenger");
    }
  }, [router]);

  const switchToPassenger = async () => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        await fetch("/api/auth/update-user-type", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ userType: "passenger" })
        });
      } catch (e) {}
    }
    const updatedUser = { ...user, userType: "passenger" };
    localStorage.setItem("user", JSON.stringify(updatedUser));
    router.push("/dashboard/passenger");
  };

  const handleLogout = async () => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: { "Authorization": `Bearer ${token}` }
        });
      } catch (e) {}
    }
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    router.push("/login");
  };

  if (!user) return null;

  return (
    <div className="h-screen w-screen overflow-hidden bg-white">
      <header className="fixed top-0 left-0 right-0 bg-white/90 backdrop-blur-md z-50 border-b border-gray-100 shadow-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
              </svg>
            </div>
            <span className="text-xl font-bold text-black">MotoRide</span>
          </div>
          <div className="relative">
            <button
              onClick={() => setShowProfile(!showProfile)}
              className="flex items-center gap-2 text-black font-medium hover:text-gray-600"
            >
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">{user.name.charAt(0).toUpperCase()}</span>
              </div>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showProfile && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-2">
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="font-medium text-black">{user.name}</p>
                  <p className="text-sm text-gray-500">{user.email}</p>
                </div>
                <button
                  onClick={() => setShowSwitchConfirm(true)}
                  className="w-full text-left px-4 py-2 text-green-600 hover:bg-gray-50 font-medium"
                >
                  Switch to Passenger
                </button>
                <button
                  onClick={() => router.push("/dashboard/profile")}
                  className="w-full text-left px-4 py-2 text-black hover:bg-gray-50"
                >
                  Settings
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-red-600 hover:bg-gray-50"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {showSwitchConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-xl font-bold text-black mb-4">Switch to Passenger?</h3>
            <p className="text-gray-600 mb-6">You will be able to book rides from riders.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowSwitchConfirm(false)}
                className="flex-1 bg-gray-200 text-black py-3 rounded-lg font-semibold hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={switchToPassenger}
                className="flex-1 bg-green-500 text-white py-3 rounded-lg font-semibold hover:bg-green-600"
              >
                Switch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}