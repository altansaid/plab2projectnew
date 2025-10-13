import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate, Link } from "react-router-dom";
import { RootState } from "../../store";
import { logout } from "../../features/auth/authSlice";
import { Helmet } from "react-helmet-async";
import { Menu as MenuIcon, X } from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useSelector(
    (state: RootState) => state.auth
  );
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const closeMenus = () => {
    setIsUserMenuOpen(false);
    setIsMobileMenuOpen(false);
  };

  const handleLogout = () => {
    dispatch(logout());
    closeMenus();
    navigate("/");
  };

  const handleProfile = () => {
    navigate("/profile");
    closeMenus();
  };

  const handleDashboard = () => {
    navigate("/dashboard");
    closeMenus();
  };

  const handleAdmin = () => {
    navigate("/admin");
    closeMenus();
  };

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Helmet>
        <title>PLAB 2 Practice Platform</title>
        <meta
          name="description"
          content="Practice PLAB 2 exam scenarios with real-time sessions, feedback, and analytics. Prepare effectively for PLAB 2 with our interactive platform."
        />
        <meta property="og:site_name" content="PLAB 2 Practice" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="robots" content="index, follow" />
      </Helmet>
      {/* Top notification strip */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-2 text-white text-sm">
            <span className="hidden sm:inline">
              Looking for a study buddy? Join our Discord community and connect
              with others preparing for PLAB 2!
            </span>
            <a
              href="https://discord.gg/Ymv4KEWZEp"
              target="_blank"
              rel="noopener noreferrer"
              className="sm:ml-2 underline font-semibold hover:text-white/90"
            >
              Join our Discord
            </a>
          </div>
        </div>
      </div>
      {/* Navigation - Tailwind-based, inspired by Sample.tsx */}
      <nav
        className={`sticky top-0 z-[1201] transition-all duration-300 ${
          scrolled
            ? "bg-white/95 backdrop-blur-md shadow-lg"
            : "bg-white/80 backdrop-blur"
        }`}
      >
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-3">
            <Link to="/" className="flex items-center">
              <img
                src="/logo.png"
                alt="PLAB 2 Practice"
                className="h-12 w-auto"
              />
            </Link>

            {/* Desktop actions */}
            <div className="hidden md:flex items-center space-x-8">
              {isAuthenticated ? (
                <div className="relative flex items-center space-x-6">
                  <button
                    onClick={() => navigate("/session/join")}
                    className="text-gray-600 hover:text-blue-600 transition-colors"
                  >
                    Join Session
                  </button>
                  <button
                    onClick={() => navigate("/session/configure")}
                    className="text-gray-600 hover:text-blue-600 transition-colors"
                  >
                    Start Session
                  </button>
                  <button
                    onClick={() => setIsUserMenuOpen((v) => !v)}
                    className="w-9 h-9 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold flex items-center justify-center shadow hover:shadow-md transition-shadow"
                    aria-haspopup="true"
                    aria-expanded={isUserMenuOpen}
                  >
                    {user?.name?.charAt(0).toUpperCase()}
                  </button>
                  {/* User dropdown */}
                  {isUserMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-[1300]">
                      {user?.role === "ADMIN" && (
                        <button
                          onClick={handleAdmin}
                          className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          Admin Panel
                        </button>
                      )}
                      <button
                        onClick={handleDashboard}
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        Dashboard
                      </button>
                      <button
                        onClick={handleProfile}
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        My Profile
                      </button>
                      <div className="my-2 border-t border-gray-100" />
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
                      >
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center space-x-8">
                  <Link
                    to="/login"
                    className="text-gray-600 hover:text-blue-600 transition-colors"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="px-4 py-2 rounded-full text-white bg-gradient-to-r from-blue-500 to-purple-600 hover:shadow-lg hover:scale-[1.02] transition-all"
                  >
                    Get Started
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile toggle */}
            <button
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
              onClick={() => {
                setIsMobileMenuOpen((v) => !v);
                setIsUserMenuOpen(false);
              }}
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <MenuIcon className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100">
            <div className="px-4 py-4 space-y-2">
              {isAuthenticated ? (
                <>
                  <button
                    onClick={() => {
                      navigate("/session/join");
                      setIsMobileMenuOpen(false);
                    }}
                    className="block w-full text-left px-2 py-3 text-gray-600 hover:text-blue-600"
                  >
                    Join Session
                  </button>
                  <button
                    onClick={() => {
                      navigate("/session/configure");
                      setIsMobileMenuOpen(false);
                    }}
                    className="block w-full text-left px-2 py-3 text-gray-600 hover:text-blue-600"
                  >
                    Start Session
                  </button>
                  {user?.role === "ADMIN" && (
                    <button
                      onClick={handleAdmin}
                      className="block w-full text-left px-2 py-3 text-gray-600 hover:text-blue-600"
                    >
                      Admin Panel
                    </button>
                  )}
                  <button
                    onClick={handleDashboard}
                    className="block w-full text-left px-2 py-3 text-gray-600 hover:text-blue-600"
                  >
                    Dashboard
                  </button>
                  <button
                    onClick={handleProfile}
                    className="block w-full text-left px-2 py-3 text-gray-600 hover:text-blue-600"
                  >
                    My Profile
                  </button>
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-2 py-3 text-red-600 hover:text-red-700"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block w-full text-left px-2 py-3 text-gray-600 hover:text-blue-600"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block w-full text-center px-4 py-3 rounded-full text-white bg-gradient-to-r from-blue-500 to-purple-600 hover:shadow-lg"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </nav>

      <main className="flex-1">{children}</main>
    </div>
  );
};

export default Layout;
