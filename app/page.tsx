"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Github,
  Star,
  Download,
  Users,
  Zap,
  Shield,
  Palette,
  Rocket,
  Globe,
  Wrench,
  LucideIcon,
} from "lucide-react";

interface StatItem {
  number: string;
  label: string;
  icon: LucideIcon;
}

interface FeatureItem {
  icon: LucideIcon;
  title: string;
  description: string;
  gradient: string;
}

interface FooterSection {
  title: string;
  links: string[];
}

const LandingPage: React.FC = () => {
  const [scrollY, setScrollY] = useState<number>(0);
  const [isVisible, setIsVisible] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const AnimatedParticles: React.FC = () => {
    return (
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white/20 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${3 + Math.random() * 4}s`,
            }}
          />
        ))}
      </div>
    );
  };

  const Header: React.FC = () => {
    const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);

    return (
      <header
        className={`fixed top-0 w-full z-50 transition-all duration-300 ${
          scrollY > 50
            ? "bg-black/80 backdrop-blur-xl border-b border-white/10"
            : "bg-transparent"
        }`}
      >
        <nav className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold text-white">PixelNimbus</div>

            <div className="flex items-center space-x-4">
              <Link href="https://github.com/Mismail9961/PixelNimbus-SAAS-App">
                <button className="bg-white text-black px-6 py-2 rounded-full font-semibold hover:bg-gray-200 transition-all duration-300">
                  Get Code
                </button>
              </Link>
              <button
                className="md:hidden text-white"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                ☰
              </button>
            </div>
          </div>

          {isMenuOpen && (
            <div className="md:hidden mt-4 pb-4 border-t border-white/10">
              <div className="flex flex-col space-y-4 pt-4">
                {["Features", "Docs", "Community", "Contribute"].map((item) => (
                  <a
                    key={item}
                    href={`#${item.toLowerCase()}`}
                    className="text-white hover:text-gray-300 transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {item}
                  </a>
                ))}
              </div>
            </div>
          )}
        </nav>
      </header>
    );
  };

  const HeroSection: React.FC = () => {
    return (
      <section className="min-h-screen flex items-center justify-center relative overflow-hidden">
        <div className="container mx-auto px-6 text-center relative z-10">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-7xl font-bold mb-6 text-white animate-fade-in">
              Build the Future with{" "}
              <span className="text-white font-black">PixelNimbus</span>
            </h1>

            <p className="text-xl md:text-2xl text-gray-300 mb-8 leading-relaxed animate-fade-in-delay">
              Next-Gen Media Handling, Powered by AI.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link href="/home">
                <button className="bg-white text-black px-8 py-4 rounded-full text-lg font-semibold hover:bg-gray-200 transition-all duration-300">
                  <div className="flex items-center space-x-2">
                    <Rocket className="w-5 h-5" />
                    <span>Get Started</span>
                  </div>
                </button>
              </Link>
            </div>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-white rounded-full flex justify-center">
            <div className="w-1 h-3 bg-white rounded-full mt-2 animate-pulse"></div>
          </div>
        </div>
      </section>
    );
  };

  const FeaturesSection = () => {
    const features = [
      {
        icon: Zap,
        title: "Lightning Fast",
        description:
          "Optimized architecture delivers blazing-fast performance with minimal resource usage.",
        gradient: "",
      },
      {
        icon: Wrench,
        title: "Developer Friendly",
        description:
          "Intuitive APIs, comprehensive documentation, and powerful debugging tools make development a joy.",
        gradient: "",
      },
      {
        icon: Globe,
        title: "Cross Platform",
        description:
          "Write once, deploy everywhere. Supports web, mobile, desktop, and server.",
        gradient: "",
      },
      {
        icon: Shield,
        title: "Enterprise Ready",
        description:
          "Built-in security and scalable architecture ensure production-readiness.",
        gradient: "",
      },
      {
        icon: Palette,
        title: "Highly Customizable",
        description:
          "Flexible system lets you tailor every aspect to your needs.",
        gradient: "",
      },
      {
        icon: Rocket,
        title: "Future Proof",
        description:
          "Regular updates and modern standards keep your projects current.",
        gradient: "",
      },
    ];

    return (
      <section className="py-20 bg-black" id="features">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-6xl font-bold mb-4 text-white">
              Why Choose PixelNimbus?
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Discover the features that make it your go-to media platform
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <div
                key={i}
                className="group relative border border-white/10 rounded-2xl p-8 hover:border-white/20 transition-all duration-500 hover:-translate-y-4 hover:shadow-xl hover:shadow-white/10"
              >
                <div className="w-14 h-14 rounded-xl bg-white flex items-center justify-center mb-6">
                  <feature.icon className="w-7 h-7 text-black" />
                </div>

                <h3 className="text-2xl font-bold text-white mb-4">
                  {feature.title}
                </h3>

                <p className="text-gray-300">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  };

  const CTASection = () => {
    return (
      <section className="py-20 relative overflow-hidden ">
        <div className="container mx-auto px-6 text-center">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl md:text-6xl font-bold mb-6 text-white">
              Ready to Get Started?
            </h2>

            <p className="text-xl text-gray-300 mb-8">
              Next-Gen Media Handling, Powered by AI.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/home">
                <button className="bg-white text-black px-8 py-4 rounded-full text-lg font-semibold hover:bg-black hover:text-white transition-all duration-300">
                  <div className="flex items-center space-x-2">
                    <Rocket className="w-5 h-5" />
                    <span>Get Started</span>
                  </div>
                </button>
              </Link>

              <Link href="https://github.com/Mismail9961/PixelNimbus-SAAS-App">
                <button className=" text-white px-8 py-4 rounded-full text-lg font-semibold hover:bg-white hover:text-black transition-all duration-300">
                  Read Documentation
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  };

  const Footer = () => {
  return (
    <footer className="bg-black border-t border-white/10">
      <div className="container mx-auto px-6 py-9 text-center">
        <p className="text-white">
          © 2025 PixelNimbus. Open source under MIT License.
        </p>
      </div>
    </footer>
  );
};



  return (
    <div className="bg-black text-white min-h-screen">
      <AnimatedParticles />
      <Header />
      <HeroSection />
      <FeaturesSection />
      <CTASection />
      <Footer />

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 1s ease-out;
        }

        .animate-fade-in-delay {
          animation: fade-in 1s ease-out 0.3s both;
        }
      `}</style>
    </div>
  );
};

export default LandingPage;
