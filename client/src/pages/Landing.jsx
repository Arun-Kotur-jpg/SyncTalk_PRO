import { Link } from 'react-router-dom';
import { Zap, Shield, ArrowRight, Sparkles, Lock, MessageCircle, Users, Mic, Globe } from 'lucide-react';
import Button from '../components/common/Button';

const Landing = () => {
  return (
    <div className="min-h-screen flex flex-col font-sans bg-dark-950 text-dark-200">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 md:px-16 py-5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-primary-600 rounded-full flex items-center justify-center shadow-lg shadow-primary-600/20">
            <span className="font-bold text-white text-lg leading-none">S</span>
          </div>
          <span className="text-xl font-semibold tracking-tight text-dark-100">SyncTalk</span>
        </div>
        <div className="flex items-center gap-6">
          <a href="#features" className="hidden sm:block text-sm text-dark-400 hover:text-dark-200 transition-colors">
            Features
          </a>
          <Link to="/login" className="text-sm text-dark-400 hover:text-dark-200 transition-colors">
            Log in
          </Link>
          <Link to="/register">
            <Button size="sm">Get Started</Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 py-16 md:py-24">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-8 bg-primary-500/10 border border-primary-500/20">
          <Sparkles size={14} className="text-primary-400" />
          <span className="text-xs font-medium text-primary-400">Now with AI Chat Summaries</span>
        </div>
        
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 max-w-2xl leading-tight text-dark-100">
          SyncTalk, <br className="hidden md:block" />
          <span className="text-primary-400">simple and fast.</span>
        </h1>
        
        <p className="text-base md:text-lg max-w-lg mb-10 leading-relaxed text-dark-400">
          Real-time messaging with voice notes and AI summaries. Built for software teams who want to communicate without the clutter.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <Link to="/register">
            <Button size="lg" className="w-full sm:w-auto">
              Start chatting for free
              <ArrowRight size={18} />
            </Button>
          </Link>
          <a href="#features" className="px-6 py-3 w-full sm:w-auto flex items-center justify-center rounded-xl font-medium text-sm transition-colors bg-dark-800 text-dark-200 hover:bg-dark-700 border border-dark-700">
            Learn more
          </a>
        </div>
      </main>

      {/* Divider */}
      <div className="w-16 h-px mx-auto bg-dark-800" />

      {/* Features */}
      <section id="features" className="max-w-4xl mx-auto px-6 py-20 md:py-28">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-4 text-dark-100">Why SyncTalk?</h2>
        <p className="text-center mb-16 max-w-md mx-auto text-dark-400">
          Everything your team needs to stay in sync — nothing it doesn't.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-12 gap-y-14">
          <FeatureItem icon={Zap} title="Fast" desc="Instant delivery powered by WebSockets. No refresh, no waiting." />
          <FeatureItem icon={Lock} title="Private" desc="End-to-end secure channels with JWT auth and strict access controls." />
          <FeatureItem icon={Globe} title="Synced" desc="Messages stay in sync across every device, every time." />
          <FeatureItem icon={Sparkles} title="Smart" desc="AI summaries turn long threads into quick bullet-point recaps." />
          <FeatureItem icon={Mic} title="Voice" desc="Context-aware voice messages when typing isn't enough." />
          <FeatureItem icon={Users} title="Teams" desc="Create groups, manage members, and keep conversations organized." />
        </div>
      </section>

      {/* Footer */}
      <footer className="px-8 md:px-16 py-8 mt-auto border-t border-dark-800">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-dark-500">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary-600 rounded-full flex items-center justify-center">
              <span className="font-bold text-white text-xs leading-none">S</span>
            </div>
            <span className="font-medium text-dark-400">SyncTalk</span>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/changelog" className="hover:text-dark-300 transition-colors">Changelog</Link>
            <span>Built for teams that ship fast.</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

const FeatureItem = ({ icon: Icon, title, desc }) => (
  <div className="text-center md:text-left">
    <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 mx-auto md:mx-0 bg-dark-800 border border-dark-700">
      <Icon className="text-primary-400" size={20} />
    </div>
    <h3 className="text-lg font-bold mb-1.5 text-dark-100">{title}</h3>
    <p className="text-sm leading-relaxed text-dark-400">{desc}</p>
  </div>
);

export default Landing;
