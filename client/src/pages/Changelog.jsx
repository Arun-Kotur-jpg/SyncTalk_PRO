import { Link } from 'react-router-dom';
import { ArrowLeft, Star, Zap, Shield, Sparkles } from 'lucide-react';
import Button from '../components/common/Button';

const releases = [
  {
    version: 'v1.2.0',
    date: 'July 10, 2026',
    title: 'Polish & Quality of Life',
    changes: [
      { type: 'feature', text: 'Added scroll-to-bottom behavior and new messages pill' },
      { type: 'feature', text: 'Copy link to specific messages for easy sharing' },
      { type: 'feature', text: 'Mark all conversations as read button in sidebar' },
      { type: 'feature', text: 'Cmd/Ctrl+K shortcut to quickly search conversations' },
      { type: 'improvement', text: 'Mention notifications now include context snippets with highlighted text' },
      { type: 'improvement', text: 'Landing page updated to dark theme to match application aesthetics' }
    ]
  },
  {
    version: 'v1.1.0',
    date: 'July 5, 2026',
    title: 'Extended Chat Features',
    changes: [
      { type: 'feature', text: 'Pin and unpin important messages to the top of the conversation' },
      { type: 'feature', text: 'React to messages with a variety of emojis' },
      { type: 'feature', text: 'See who is online and when users were last seen' },
      { type: 'feature', text: 'Mute/unmute conversation notifications' },
      { type: 'improvement', text: 'Ownership transfer when group creator leaves' }
    ]
  },
  {
    version: 'v1.0.0',
    date: 'June 30, 2026',
    title: 'Initial Release',
    changes: [
      { type: 'feature', text: 'Real-time messaging with WebSockets' },
      { type: 'feature', text: 'Direct messaging and group chats' },
      { type: 'feature', text: 'Voice notes with AI-powered transcription' },
      { type: 'feature', text: 'End-to-end JWT authentication' }
    ]
  }
];

const getTypeIcon = (type) => {
  switch (type) {
    case 'feature':
      return <Star size={14} className="text-amber-400" />;
    case 'improvement':
      return <Zap size={14} className="text-primary-400" />;
    case 'fix':
      return <Shield size={14} className="text-emerald-400" />;
    default:
      return <Sparkles size={14} className="text-blue-400" />;
  }
};

const getTypeColor = (type) => {
  switch (type) {
    case 'feature':
      return 'bg-amber-400/10 border-amber-400/20 text-amber-400';
    case 'improvement':
      return 'bg-primary-400/10 border-primary-400/20 text-primary-400';
    case 'fix':
      return 'bg-emerald-400/10 border-emerald-400/20 text-emerald-400';
    default:
      return 'bg-blue-400/10 border-blue-400/20 text-blue-400';
  }
};

const Changelog = () => {
  return (
    <div className="min-h-screen bg-dark-950 text-dark-200 font-sans">
      <nav className="border-b border-dark-800 bg-dark-900/50 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-dark-400 hover:text-dark-200 transition-colors">
              <ArrowLeft size={20} />
            </Link>
            <span className="font-semibold text-lg text-dark-100">Changelog</span>
          </div>
          <Link to="/register">
            <Button size="sm">Get Started</Button>
          </Link>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-12 md:py-20">
        <div className="mb-16">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 text-dark-100">What's new in SyncTalk</h1>
          <p className="text-lg text-dark-400">Discover the latest updates, improvements, and fixes.</p>
        </div>

        <div className="space-y-16">
          {releases.map((release) => (
            <div key={release.version} className="relative">
              <div className="md:flex gap-8 items-baseline">
                <div className="md:w-48 flex-shrink-0 mb-4 md:mb-0">
                  <div className="sticky top-24">
                    <h2 className="text-2xl font-bold text-dark-100 mb-1">{release.version}</h2>
                    <time className="text-sm font-medium text-dark-500">{release.date}</time>
                  </div>
                </div>
                
                <div className="flex-1 bg-dark-900 border border-dark-800 rounded-2xl p-6 md:p-8 shadow-lg shadow-black/20">
                  <h3 className="text-xl font-bold text-dark-100 mb-6">{release.title}</h3>
                  <ul className="space-y-4">
                    {release.changes.map((change, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <div className={`mt-0.5 px-2 py-1 rounded border text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 flex-shrink-0 w-28 ${getTypeColor(change.type)}`}>
                          {getTypeIcon(change.type)}
                          {change.type}
                        </div>
                        <span className="text-dark-300 leading-relaxed pt-0.5">{change.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t border-dark-800 mt-20 py-8">
        <div className="max-w-4xl mx-auto px-6 text-center text-dark-500 text-sm">
          <p>© 2026 SyncTalk. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Changelog;
