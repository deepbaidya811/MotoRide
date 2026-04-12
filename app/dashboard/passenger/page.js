"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

const Map = dynamic(() => import("./Map"), { ssr: false });

export default function PassengerDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showSwitchConfirm, setShowSwitchConfirm] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [pickupLocation, setPickupLocation] = useState("");
  const [dropoffLocation, setDropoffLocation] = useState("");
  const [pickupCoords, setPickupCoords] = useState(null);
  const [dropoffCoords, setDropoffCoords] = useState(null);
  const [distance, setDistance] = useState(null);
  const [routeCoords, setRouteCoords] = useState(null);
  const [showPickupSuggestions, setShowPickupSuggestions] = useState(false);
  const [showDropoffSuggestions, setShowDropoffSuggestions] = useState(false);
  const [pickupSuggestions, setPickupSuggestions] = useState([]);
  const [dropoffSuggestions, setDropoffSuggestions] = useState([]);
  const [pickupLoading, setPickupLoading] = useState(false);
  const [dropoffLoading, setDropoffLoading] = useState(false);
  const pickupRef = useRef(null);
  const dropoffRef = useRef(null);
  const pickupTimeoutRef = useRef(null);
  const dropoffTimeoutRef = useRef(null);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData) {
      router.push("/login");
      return;
    }
    const parsed = JSON.parse(userData);
    setUser(parsed);
    if (parsed.userType !== "passenger") {
      router.push("/dashboard/rider");
    }
  }, [router]);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
      },
      () => {}
    );
  }, []);

  const useCurrentLocation = async () => {
    if (userLocation) {
      const newPickupCoords = { lat: userLocation.lat, lon: userLocation.lng };
      setPickupCoords(newPickupCoords);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${userLocation.lat}&lon=${userLocation.lng}`
        );
        const data = await res.json();
        if (data.display_name) {
          setPickupLocation(data.display_name.split(",").slice(0, 3).join(","));
        } else {
          setPickupLocation(`${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}`);
        }
      } catch (e) {
        setPickupLocation(`${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}`);
      }
      if (dropoffCoords) {
        calculateDistance(newPickupCoords, dropoffCoords);
      }
    }
  };

const calculateDistance = async (pickup, dropoff) => {
    if (!pickup || !dropoff) return;
    try {
      const res = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${pickup.lon},${pickup.lat};${dropoff.lon},${dropoff.lat}?overview=full&geometries=geojson`
      );
      const data = await res.json();
      console.log("OSRM Response:", data);
      if (data.routes && data.routes[0]) {
        setDistance((data.routes[0].distance / 1000).toFixed(1));
        setRouteCoords(data.routes[0].geometry.coordinates);
        console.log("Route coords set:", data.routes[0].geometry.coordinates.length);
      }
    } catch (e) {
      console.error("OSRM Error:", e);
      setRouteCoords(null);
      const R = 6371;
      const dLat = (parseFloat(dropoff.lat) - parseFloat(pickup.lat)) * Math.PI / 180;
      const dLon = (parseFloat(dropoff.lon) - parseFloat(pickup.lon)) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(parseFloat(pickup.lat) * Math.PI / 180) * Math.cos(parseFloat(dropoff.lat) * Math.PI / 180) *
        Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      setDistance((R * c).toFixed(1));
    }
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (pickupRef.current && !pickupRef.current.contains(e.target)) {
        setShowPickupSuggestions(false);
      }
      if (dropoffRef.current && !dropoffRef.current.contains(e.target)) {
        setShowDropoffSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const searchLocation = async (query, setSuggestions, setLoading) => {
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`
      );
      const data = await res.json();
      setSuggestions(data);
    } catch (e) {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePickupChange = (e) => {
    const value = e.target.value;
    setPickupLocation(value);
    if (pickupTimeoutRef.current) clearTimeout(pickupTimeoutRef.current);
    pickupTimeoutRef.current = setTimeout(() => {
      searchLocation(value, setPickupSuggestions, setPickupLoading);
    }, 300);
    setShowPickupSuggestions(true);
  };

  const handleDropoffChange = (e) => {
    const value = e.target.value;
    setDropoffLocation(value);
    if (dropoffTimeoutRef.current) clearTimeout(dropoffTimeoutRef.current);
    dropoffTimeoutRef.current = setTimeout(() => {
      searchLocation(value, setDropoffSuggestions, setDropoffLoading);
    }, 300);
    setShowDropoffSuggestions(true);
  };

  const switchToRider = async () => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        await fetch("/api/auth/update-user-type", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ userType: "rider" })
        });
      } catch (e) {}
    }
    const updatedUser = { ...user, userType: "rider" };
    localStorage.setItem("user", JSON.stringify(updatedUser));
    router.push("/dashboard/rider");
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
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center">
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
              <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center">
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
                  Switch to Rider
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

      <div className="fixed top-16 left-4 right-4 z-40">
        <div className="flex gap-2 bg-white p-2 rounded-xl shadow-lg">
          <div className="flex-1 relative" ref={pickupRef}>
            <div className="relative flex items-center">
              <input
                type="text"
                placeholder="Pickup location"
                value={pickupLocation}
                onChange={handlePickupChange}
                onFocus={() => setShowPickupSuggestions(true)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none"
              />
              <button
                type="button"
                onClick={useCurrentLocation}
                className="absolute right-2 p-1 text-gray-500 hover:text-black"
                title="Use current location"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              {pickupLoading && (
                <div className="absolute right-10 top-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-black rounded-full animate-spin"></div>
                </div>
              )}
            </div>
            {showPickupSuggestions && (
              <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-40 overflow-auto z-50">
                {pickupLoading ? (
                  <div className="px-4 py-2 text-sm text-gray-500">Searching...</div>
                ) : pickupSuggestions.length > 0 ? (
                  pickupSuggestions.map((place, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setPickupLocation(place.display_name.split(",").slice(0, 3).join(","));
                        const newPickupCoords = { lat: place.lat, lon: place.lon };
                        setPickupCoords(newPickupCoords);
                        setShowPickupSuggestions(false);
                        if (dropoffCoords) {
                          calculateDistance(newPickupCoords, dropoffCoords);
                        }
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 border-b border-gray-100"
                    >
                      <p className="text-sm text-black truncate">{place.display_name}</p>
                    </button>
                  ))
                ) : pickupLocation.length >= 3 ? (
                  <div className="px-4 py-2 text-sm text-gray-500">No results found</div>
                ) : null}
              </div>
            )}
          </div>
          <div className="flex-1 relative" ref={dropoffRef}>
            <div className="relative">
              <input
                type="text"
                placeholder="Drop-off location"
                value={dropoffLocation}
                onChange={handleDropoffChange}
                onFocus={() => setShowDropoffSuggestions(true)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none"
              />
              {dropoffLoading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-black rounded-full animate-spin"></div>
                </div>
              )}
            </div>
            {showDropoffSuggestions && (
              <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-40 overflow-auto z-50">
                {dropoffLoading ? (
                  <div className="px-4 py-2 text-sm text-gray-500">Searching...</div>
                ) : dropoffSuggestions.length > 0 ? (
                  dropoffSuggestions.map((place, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setDropoffLocation(place.display_name.split(",").slice(0, 3).join(","));
                        const newDropoffCoords = { lat: place.lat, lon: place.lon };
                        setDropoffCoords(newDropoffCoords);
                        setShowDropoffSuggestions(false);
                        if (pickupCoords) {
                          calculateDistance(pickupCoords, newDropoffCoords);
                        }
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 border-b border-gray-100"
                    >
                      <p className="text-sm text-black truncate">{place.display_name}</p>
                    </button>
                  ))
                ) : dropoffLocation.length >= 3 ? (
                  <div className="px-4 py-2 text-sm text-gray-500">No results found</div>
                ) : null}
              </div>
            )}
          </div>
          {distance && (
            <div className="absolute -bottom-8 left-0 right-0 text-center">
              <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                {distance} km
              </span>
            </div>
          )}
          <button className="px-6 bg-black text-white rounded-lg font-medium">
            Find Ride
          </button>
        </div>
      </div>

      {showSwitchConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-xl font-bold text-black mb-4">Switch to Rider?</h3>
            <p className="text-gray-600 mb-6">You will be able to accept ride requests and earn money.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowSwitchConfirm(false)}
                className="flex-1 bg-gray-200 text-black py-3 rounded-lg font-semibold hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={switchToRider}
                className="flex-1 bg-black text-white py-3 rounded-lg font-semibold hover:bg-gray-800"
              >
                Switch
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="fixed top-24 left-0 right-0 bottom-0" style={{ height: "calc(100vh - 96px)" }}>
<Map
          pickupCoords={pickupCoords} 
          dropoffCoords={dropoffCoords} 
          userLocation={userLocation}
          routeCoords={routeCoords}
        />
      </div>
    </div>
  );
}