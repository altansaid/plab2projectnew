import React from "react";
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

  return (
    <div className="min-h-screen bg-gray-50">
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
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 to-indigo-100 py-12 sm:py-16 md:py-20">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-8 md:gap-12 items-center">
            <div className="max-w-xl mx-auto lg:mx-0">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 sm:mb-6 leading-tight text-center lg:text-left">
                Master Your <span className="text-blue-500">PLAB 2</span> Exam
                with Confidence
              </h1>
              <p className="text-lg sm:text-xl text-gray-600 mb-6 sm:mb-8 leading-relaxed text-center lg:text-left">
                Comprehensive exam preparation platform designed specifically
                for medical professionals. Practice with real scenarios, track
                your progress, and achieve your dream of practicing medicine in
                the UK.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <button
                  onClick={handleStartSession}
                  className="w-full sm:w-auto bg-blue-500 hover:bg-blue-600 text-white px-6 sm:px-8 py-3 rounded-lg font-semibold text-base sm:text-lg transition-colors flex items-center justify-center"
                >
                  Start Session
                  <ChevronRight className="ml-2 h-5 w-5" />
                </button>
                {isAuthenticated ? (
                  <button
                    onClick={handleGoToDashboard}
                    className="w-full sm:w-auto border-2 border-pink-500 text-pink-500 hover:bg-pink-500 hover:text-white px-6 sm:px-8 py-3 rounded-lg font-semibold text-base sm:text-lg transition-colors"
                  >
                    Go to Dashboard
                  </button>
                ) : (
                  <button
                    onClick={handleJoinSession}
                    className="w-full sm:w-auto border-2 border-pink-500 text-pink-500 hover:bg-pink-500 hover:text-white px-6 sm:px-8 py-3 rounded-lg font-semibold text-base sm:text-lg transition-colors"
                  >
                    Join Session
                  </button>
                )}
              </div>
            </div>
            <div className="mt-8 lg:mt-0 lg:pl-8">
              <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-lg max-w-md mx-auto">
                <div className="flex items-center space-x-4 mb-6">
                  <div className="bg-blue-100 p-2 sm:p-3 rounded-lg">
                    <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg sm:text-xl">
                      Clinical Scenarios
                    </h3>
                    <p className="text-gray-600 text-sm sm:text-base">
                      Practice with real PLAB 2 cases
                    </p>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 sm:p-4 mb-4">
                  <p className="text-sm sm:text-base text-gray-700 mb-2">
                    <span className="font-medium">Patient:</span> Sample case
                    preview
                  </p>
                  <p className="text-sm sm:text-base text-gray-700">
                    <span className="font-medium">Your task:</span> Take history
                    and examination
                  </p>
                </div>
                <div className="flex space-x-2">
                  <div className="h-2 bg-blue-500 rounded-full flex-1"></div>
                  <div className="h-2 bg-blue-500 rounded-full flex-1"></div>
                  <div className="h-2 bg-blue-500 rounded-full flex-1"></div>
                  <div className="h-2 bg-gray-200 rounded-full flex-1"></div>
                </div>
                <p className="text-xs sm:text-sm text-gray-600 mt-2">
                  Station Progress Indicator
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 sm:py-16 md:py-20 bg-white">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
              Everything You Need to Pass PLAB 2
            </h2>
            <p className="text-lg sm:text-xl text-gray-600 max-w-2xl sm:max-w-3xl mx-auto">
              Our comprehensive platform provides all the tools and resources
              you need to succeed in your PLAB 2 examination.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {/* Feature 1 */}
            <div className="bg-gray-50 rounded-lg p-6 sm:p-8 hover:shadow-lg transition-shadow">
              <div className="bg-blue-100 p-2 sm:p-3 rounded-lg w-fit mb-4">
                <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2 sm:mb-3">
                Practice Sessions
              </h3>
              <p className="text-sm sm:text-base text-gray-600">
                Real-time practice sessions with peers, covering all types of
                clinical scenarios you'll encounter in PLAB 2.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-gray-50 rounded-lg p-6 sm:p-8 hover:shadow-lg transition-shadow">
              <div className="bg-pink-100 p-2 sm:p-3 rounded-lg w-fit mb-4">
                <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-pink-500" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2 sm:mb-3">
                Timed Stations
              </h3>
              <p className="text-sm sm:text-base text-gray-600">
                Experience realistic station timing and transitions, just like
                in the actual PLAB 2 examination.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-gray-50 rounded-lg p-6 sm:p-8 hover:shadow-lg transition-shadow">
              <div className="bg-blue-100 p-2 sm:p-3 rounded-lg w-fit mb-4">
                <BarChart3 className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2 sm:mb-3">
                Performance Feedback
              </h3>
              <p className="text-sm sm:text-base text-gray-600">
                Receive detailed feedback from peers and track your progress
                across different clinical scenarios.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-gray-50 rounded-lg p-6 sm:p-8 hover:shadow-lg transition-shadow">
              <div className="bg-pink-100 p-2 sm:p-3 rounded-lg w-fit mb-4">
                <BookOpen className="h-6 w-6 sm:h-8 sm:w-8 text-pink-500" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2 sm:mb-3">
                Clinical Cases
              </h3>
              <p className="text-sm sm:text-base text-gray-600">
                Access a wide range of clinical scenarios covering all major
                specialties and common PLAB 2 topics.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-gray-50 rounded-lg p-6 sm:p-8 hover:shadow-lg transition-shadow">
              <div className="bg-blue-100 p-2 sm:p-3 rounded-lg w-fit mb-4">
                <Users className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2 sm:mb-3">
                Peer Learning
              </h3>
              <p className="text-sm sm:text-base text-gray-600">
                Practice with fellow medical professionals and learn from each
                other's experiences and feedback.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-gray-50 rounded-lg p-6 sm:p-8 hover:shadow-lg transition-shadow">
              <div className="bg-pink-100 p-2 sm:p-3 rounded-lg w-fit mb-4">
                <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-pink-500" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2 sm:mb-3">
                Progress Tracking
              </h3>
              <p className="text-sm sm:text-base text-gray-600">
                Monitor your improvement over time with detailed performance
                analytics and progress reports.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <img
                src="/logo.png"
                alt="PLAB 2 Practice"
                className="h-6 w-auto"
              />
            </div>

            <p className="text-gray-400 text-center md:text-right">
              © {new Date().getFullYear()} PLAB 2 Practice Platform. Helping
              medical professionals achieve their UK practice goals.
            </p>

            <a
              href="https://buymeacoffee.com/plab2practice"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-[#FFDD00] text-black font-semibold px-4 py-2 rounded-md mb-4 md:mb-0"
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
