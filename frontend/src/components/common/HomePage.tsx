import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../store";
import {
  FileText,
  Clock,
  BarChart3,
  BookOpen,
  Users,
  TrendingUp,
  ChevronRight,
} from "lucide-react";
import { Helmet } from "react-helmet-async";
import { Play, Star } from "lucide-react";

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useSelector(
    (state: RootState) => state.auth
  );

  const handleStartSession = () => {
    if (isAuthenticated) {
      navigate("/session/create");
    } else {
      sessionStorage.setItem("redirectAfterLogin", "/session/create");
      navigate("/login");
    }
  };

  const handleJoinSession = () => {
    if (isAuthenticated) {
      navigate("/session/join");
    } else {
      sessionStorage.setItem("redirectAfterLogin", "/session/join");
      navigate("/login");
    }
  };

  const handleGoToDashboard = () => {
    navigate("/dashboard");
  };

  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <Helmet>
        <title>
          PLAB 2 Practice – Online Practice Sessions, Cases, and Feedback
        </title>
        <meta
          name="description"
          content="Prepare for PLAB 2 with interactive practice sessions, real clinical cases, role-based scenarios, and detailed feedback. Build confidence and track progress."
        />
        <link rel="canonical" href="https://plab2practice.com/" />
        <meta
          property="og:title"
          content="PLAB 2 Practice – Interactive Exam Preparation"
        />
        <meta
          property="og:description"
          content="Practice PLAB 2 cases with peers, role-play sessions, and get structured feedback."
        />
        <meta property="og:url" content="https://plab2practice.com/" />
        <meta
          property="og:image"
          content="https://plab2practice.com/og-image.jpg"
        />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "PLAB 2 Practice",
            url: "https://plab2practice.com/",
            potentialAction: {
              "@type": "SearchAction",
              target: "https://plab2practice.com/?q={search_term_string}",
              "query-input": "required name=search_term_string",
            },
          })}
        </script>
      </Helmet>
      {/* Hero Section - Sample.tsx inspired */}
      <section className="pt-12 sm:pt-16 md:pt-20 pb-12 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 overflow-hidden">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 sm:mb-14">
            {/* Badge */}
            <div className="inline-flex items-center px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full border border-purple-400 mb-8 hover:shadow-md transition-all duration-300">
              <Star className="h-4 w-4 text-yellow-500 mr-2" />
              <span className="text-sm font-medium text-gray-700">
                Trusted by PLAB 2 Candidates
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Prepare for Your{" "}
              <span className="bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
                PLAB 2
              </span>{" "}
              Exam – 100% Free
            </h1>

            <p className="text-lg sm:text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
              Practice real scenarios, get structured feedback, and track your
              progress — all on a modern platform, completely free of charge.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-10">
              <button
                onClick={handleStartSession}
                className="group bg-gradient-to-r from-blue-500 to-purple-600 text-white px-7 sm:px-8 py-3 sm:py-4 rounded-full font-semibold text-base sm:text-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 flex items-center"
              >
                Start Practicing Today
                <ChevronRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </button>
              {/* Secondary action removed per request */}
            </div>

            <div className="relative max-w-4xl mx-auto">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-gradient-to-r from-blue-500 to-purple-600 p-1 hover:shadow-3xl transition-shadow duration-500">
                <div className="bg-gray-900 rounded-xl aspect-video flex items-center justify-center">
                  <div className="text-center w-full h-full">
                    <iframe
                      className="w-full h-full rounded-xl"
                      src="https://www.youtube.com/embed/_QT3yEareTo?si=T8Dp4Z9E97i7BbiT"
                      title="YouTube video player"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      referrerPolicy="strict-origin-when-cross-origin"
                      allowFullScreen
                    ></iframe>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - Sample.tsx card styling */}
      <section id="features" className="py-16 bg-white">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Everything You Need to Pass PLAB 2
            </h2>
            <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto">
              Our comprehensive platform provides all the tools and resources
              you need to succeed.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="group bg-gradient-to-br from-gray-50 to-white rounded-3xl p-8 hover:shadow-2xl hover:shadow-blue-100 transition-all duration-500 border border-gray-100 hover:border-blue-200">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <FileText className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">
                Practice Sessions
              </h3>
              <p className="text-gray-600">
                Real-time practice sessions with peers, covering all clinical
                scenarios you'll encounter in PLAB 2.
              </p>
            </div>

            <div className="group bg-gradient-to-br from-gray-50 to-white rounded-3xl p-8 hover:shadow-2xl hover:shadow-blue-100 transition-all duration-500 border border-gray-100 hover:border-blue-200">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Clock className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">
                Timed Stations
              </h3>
              <p className="text-gray-600">
                Experience realistic station timing and transitions, just like
                in the actual examination.
              </p>
            </div>

            <div className="group bg-gradient-to-br from-gray-50 to-white rounded-3xl p-8 hover:shadow-2xl hover:shadow-blue-100 transition-all duration-500 border border-gray-100 hover:border-blue-200">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <BarChart3 className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">
                Performance Feedback
              </h3>
              <p className="text-gray-600">
                Receive detailed feedback from peers and track your progress
                across scenarios.
              </p>
            </div>

            <div className="group bg-gradient-to-br from-gray-50 to-white rounded-3xl p-8 hover:shadow-2xl hover:shadow-blue-100 transition-all duration-500 border border-gray-100 hover:border-blue-200">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <BookOpen className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">
                Clinical Cases
              </h3>
              <p className="text-gray-600">
                Access a wide range of clinical scenarios across major
                specialties.
              </p>
            </div>

            <div className="group bg-gradient-to-br from-gray-50 to-white rounded-3xl p-8 hover:shadow-2xl hover:shadow-blue-100 transition-all duration-500 border border-gray-100 hover:border-blue-200">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Users className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">
                Peer Learning
              </h3>
              <p className="text-gray-600">
                Practice with fellow medical professionals and learn from shared
                feedback.
              </p>
            </div>

            <div className="group bg-gradient-to-br from-gray-50 to-white rounded-3xl p-8 hover:shadow-2xl hover:shadow-blue-100 transition-all duration-500 border border-gray-100 hover:border-blue-200">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <TrendingUp className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">
                Progress Tracking
              </h3>
              <p className="text-gray-600">
                Monitor improvement over time with detailed analytics and
                progress reports.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact CTA - slim full-width, above footer */}
      <section className="py-8 sm:py-10 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <p className="text-white text-base sm:text-lg lg:text-xl font-semibold text-center sm:text-left">
              Want to reach out? Use our contact form to ask questions, share
              ideas, or give feedback.
            </p>
            <a
              href="https://forms.gle/ZFQhWvfxgjYViHDHA"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-6 py-3 rounded-full bg-white text-blue-600 font-semibold hover:shadow-2xl hover:scale-105 transition-all duration-300"
            >
              Contact Us
            </a>
          </div>
        </div>
      </section>

      {/* Footer - simplified Sample.tsx style */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center space-x-2">
              <img
                src="/logo.png"
                alt="PLAB 2 Practice"
                className="h-7 w-auto"
              />
              <span className="sr-only">PLAB 2 Practice</span>
            </div>
            <p className="text-gray-400 text-center md:text-right">
              © {new Date().getFullYear()} PLAB 2 Practice Platform
            </p>
            <a
              href="https://buymeacoffee.com/plab2practice"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-[#FFDD00] text-black font-semibold px-4 py-2 rounded-md"
            >
              Buy me a coffee
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
