import React, { useState } from 'react';
import { User } from '../types';
import { GeminiService } from '../services/geminiService';
import { Key, User as UserIcon, Loader2, AlertCircle } from 'lucide-react';


interface AuthProps {
  onLogin: (user: User, service: GeminiService) => void;
}

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !apiKey) {
      setError("Please fill in all fields");
      return;
    }

    setLoading(true);
    setError('');

    try {
      const service = new GeminiService(apiKey);
      const isValid = await service.validateKey();

      if (isValid) {
        onLogin({
          username,
          apiKey,
          avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`
        }, service);
      } else {
        setError("Invalid Gemini API Key or API unreachable.");
      }
    } catch (err) {
      setError("Something went wrong during validation.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl p-8 relative z-10">
        <div className="text-center mb-10">
          <div className="flex justify-center mb-6">
            <img 
              src="https://avatars.githubusercontent.com/u/53648600?s=200&v=4" 
              alt="ACM DTU Logo" 
              className="w-24 h-24 rounded-2xl shadow-2xl shadow-blue-500/20"
            />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2">
            Promptify
          </h1>
          <p className="text-slate-400">Craft prompts. Beat the AI.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <UserIcon size={14} /> Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder-slate-600"
              placeholder="Enter your handle..."
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <Key size={14} /> Gemini API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder-slate-600"
              placeholder="AIzaSy..."
            />
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-400 text-sm">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-4 rounded-xl transition-all transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={20} /> Connecting...
              </>
            ) : (
              "Start Challenge"
            )}
          </button>
        </form>
        
        <div className="mt-8 text-center">
            <p className="text-xs text-slate-500">
                Don't have a key? <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 transition-colors">Get one from Google AI Studio</a>
            </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;