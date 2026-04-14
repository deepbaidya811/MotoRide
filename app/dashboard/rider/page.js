"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { io } from "socket.io-client";

const Map = dynamic(() => import("./Map"), { ssr: false });

export default function RiderDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [requests, setRequests] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [activeTab, setActiveTab] = useState("available");
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const socketRef = useRef(null);
  const dragStartY = useRef(0);
  const dragStartHeight = useRef(0);

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

  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
      },
      () => {},
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  useEffect(() => {
    if (!user) return;
    const socket = io("http://localhost:5000");
    socketRef.current = socket;
    socket.on("connect", () => {
      socket.emit("join-rider");
    });
    socket.on("new-ride", (data) => {
      setRequests(prev => [data, ...prev]);
    });
    return () => {
      socket.disconnect();
    };
  }, [user]);

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch("http://localhost:5000/api/ride/dashboard", {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setRequests(data.requests || []);
          setHistory(data.history || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    if (user) fetchData();
  }, [user]);

  const acceptRide = async (requestId) => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const res = await fetch("http://localhost:5000/api/ride/accept", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ requestId })
      });
      if (res.ok) {
        setRequests(requests.filter(r => r.id !== requestId));
      }
    } catch (e) {
      console.error(e);
    }
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

  const toggleSheet = () => {
    setSheetExpanded(!sheetExpanded);
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
                  onClick={switchToPassenger}
                  className="w-full text-left px-4 py-2 text-black hover:bg-gray-50"
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

      <div className="fixed top-20 left-0 right-0 bottom-0" style={{ height: "calc(100vh - 80px)", zIndex: 10 }}>
        <Map riderLocation={userLocation} />
        {requests.length > 0 && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-green-500 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
            <span className="font-medium">{requests.length} rides nearby</span>
          </div>
        )}
      </div>

      <div
        className={`fixed left-0 right-0 bg-white border-t border-gray-200 transition-all duration-300 ${sheetExpanded ? "top-10" : "bottom-0"}`}
        style={{
          zIndex: sheetExpanded ? 40 : 50,
          height: sheetExpanded ? "calc(100vh - 80px)" : "auto",
          maxHeight: sheetExpanded ? "calc(100vh - 80px)" : "40vh",
          borderTopLeftRadius: "20px",
          borderTopRightRadius: "20px",
          boxShadow: "0 -4px 20px rgba(0, 0, 0, 0.1)"
        }}
      >
        <div
          onClick={toggleSheet}
          className="flex items-center justify-center py-3 cursor-pointer border-b border-gray-200"
          style={{ borderTopLeftRadius: "20px", borderTopRightRadius: "20px" }}
        >
          <div className="w-12 h-1 bg-gray-300 rounded-full"></div>
        </div>
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab("available")}
            className={`flex-1 py-3 font-medium text-center border-b-2 ${activeTab === "available" ? "border-green-500 text-green-600" : "border-transparent text-gray-500"}`}
          >
            Available
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex-1 py-3 font-medium text-center border-b-2 ${activeTab === "history" ? "border-green-500 text-green-600" : "border-transparent text-gray-500"}`}
          >
            History
          </button>
        </div>
        <div className="p-4 overflow-auto" style={{ maxHeight: sheetExpanded ? "calc(100vh - 180px)" : "calc(40vh - 100px)" }}>
          {loading ? (
            <div className="flex items-center justify-center h-20">
              <div className="w-6 h-6 border-2 border-gray-300 border-t-green-500 rounded-full animate-spin"></div>
            </div>
          ) : activeTab === "available" ? (
            requests.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-gray-500">No available rides</p>
              </div>
            ) : (
              <div className="space-y-2">
                {requests.map((req, i) => (
                  <div key={i} className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <p className="font-medium text-black text-sm">{req.pickup}</p>
                        <p className="text-xs text-gray-500">to {req.dropoff}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-green-600 font-semibold">₹{req.fare}</span>
                        <p className="text-xs text-gray-500">{req.distance} km</p>
                      </div>
                    </div>
                    {req.passengerName && (
                      <div className="bg-gray-50 rounded p-2 mb-2">
                        <p className="text-xs font-medium text-black">Passenger: {req.passengerName}</p>
                        <p className="text-xs text-gray-500">Phone: {req.passengerPhone}</p>
                      </div>
                    )}
                    <button
                      onClick={() => acceptRide(req.id)}
                      className="w-full bg-green-500 text-white py-1.5 rounded-lg font-medium text-sm hover:bg-green-600"
                    >
                      Accept
                    </button>
                  </div>
                ))}
              </div>
            )
          ) : (
            history.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-gray-500">No ride history</p>
              </div>
            ) : (
              <div className="space-y-2">
                {history.map((ride, i) => (
                  <div key={i} className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-medium text-black text-sm">{ride.pickup}</p>
                        <p className="text-xs text-gray-500">to {ride.dropoff}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-green-600 font-semibold">₹{ride.fare}</span>
                        <p className="text-xs text-gray-500">{ride.distance} km</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}