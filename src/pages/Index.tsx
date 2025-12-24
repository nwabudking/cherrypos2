import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Cherry, UtensilsCrossed, Wine, Users, ArrowRight, Sparkles } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Hero Section */}
      <div className="relative min-h-screen flex items-center justify-center">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cherry/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gold/10 rounded-full blur-3xl animate-pulse delay-1000" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cherry-dark/30 rounded-full blur-3xl" />
        </div>

        {/* Grid pattern overlay */}
        <div 
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `linear-gradient(hsl(var(--cherry) / 0.3) 1px, transparent 1px),
                             linear-gradient(90deg, hsl(var(--cherry) / 0.3) 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
          }}
        />

        {/* Content */}
        <div className="relative z-10 text-center px-4 max-w-5xl mx-auto">
          {/* Logo */}
          <div className="mb-8 animate-fade-in">
            <div className="inline-flex items-center justify-center w-24 h-24 gradient-cherry rounded-3xl glow-cherry mb-6 animate-scale-in">
              <Cherry className="w-12 h-12 text-primary-foreground" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-5xl md:text-7xl font-bold mb-6 animate-slide-up">
            <span className="text-gradient-cherry">Cherry</span>
            <br />
            <span className="text-foreground">Dining & Lounge</span>
          </h1>

          {/* Tagline */}
          <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-2xl mx-auto animate-slide-up" style={{ animationDelay: '0.1s' }}>
            Experience culinary excellence in an atmosphere of refined elegance. 
            Where every meal becomes a memorable occasion.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <Button 
              size="lg" 
              className="gradient-cherry glow-cherry-sm text-lg px-8 py-6 group"
              onClick={() => navigate('/dashboard')}
            >
              Enter Dashboard
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="text-lg px-8 py-6 border-cherry/30 hover:bg-cherry/10 hover:border-cherry/50"
              onClick={() => navigate('/auth')}
            >
              Staff Login
            </Button>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-muted-foreground/30 rounded-full flex justify-center pt-2">
            <div className="w-1.5 h-3 bg-cherry rounded-full animate-pulse" />
          </div>
        </div>
      </div>

      {/* Features Section */}
      <section className="py-24 px-4 relative">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cherry/10 border border-cherry/20 mb-6">
              <Sparkles className="w-4 h-4 text-cherry" />
              <span className="text-sm text-cherry font-medium">Premium Experience</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Exceptional in Every Way
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              From intimate dinners to grand celebrations, we craft experiences that linger in memory.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Fine Dining Card */}
            <div className="group relative p-8 rounded-3xl bg-card/50 border border-border/50 backdrop-blur-sm hover:border-cherry/30 transition-all duration-500 hover:-translate-y-2">
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-cherry/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-cherry/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <UtensilsCrossed className="w-8 h-8 text-cherry" />
                </div>
                <h3 className="text-2xl font-semibold text-foreground mb-3">Fine Dining</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Exquisite cuisine crafted by master chefs using the finest seasonal ingredients.
                </p>
              </div>
            </div>

            {/* Premium Bar Card */}
            <div className="group relative p-8 rounded-3xl bg-card/50 border border-border/50 backdrop-blur-sm hover:border-gold/30 transition-all duration-500 hover:-translate-y-2">
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-gold/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-gold/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Wine className="w-8 h-8 text-gold" />
                </div>
                <h3 className="text-2xl font-semibold text-foreground mb-3">Premium Bar</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Curated selection of fine wines, artisanal cocktails, and rare spirits.
                </p>
              </div>
            </div>

            {/* Elegant Lounge Card */}
            <div className="group relative p-8 rounded-3xl bg-card/50 border border-border/50 backdrop-blur-sm hover:border-cherry/30 transition-all duration-500 hover:-translate-y-2">
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-cherry/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-cherry/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Users className="w-8 h-8 text-cherry" />
                </div>
                <h3 className="text-2xl font-semibold text-foreground mb-3">Elegant Lounge</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Sophisticated ambiance perfect for intimate gatherings and special occasions.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quote Section */}
      <section className="py-24 px-4 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cherry/5 to-transparent" />
        <div className="max-w-4xl mx-auto text-center relative">
          <div className="text-6xl text-cherry/20 font-serif mb-6">"</div>
          <blockquote className="text-2xl md:text-3xl font-light text-foreground leading-relaxed mb-8">
            Where culinary artistry meets timeless elegance, 
            <span className="text-gradient-cherry font-medium"> every moment becomes extraordinary.</span>
          </blockquote>
          <div className="flex items-center justify-center gap-3">
            <div className="w-12 h-0.5 bg-cherry/30" />
            <span className="text-muted-foreground">Cherry Dining & Lounge</span>
            <div className="w-12 h-0.5 bg-cherry/30" />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border/50">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 gradient-cherry rounded-xl flex items-center justify-center">
              <Cherry className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-foreground font-semibold">Cherry Dining & Lounge</span>
          </div>
          <p className="text-muted-foreground text-sm">
            © {new Date().getFullYear()} All rights reserved. Crafted with excellence.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
