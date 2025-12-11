import React, { useState, useEffect } from 'react';
import { User, GameState, RoundResult, LeaderboardEntry } from './types';
import { ROUNDS } from './constants';
import { GeminiService } from './services/geminiService';
import { socketService } from './services/socketService';
import Auth from './components/Auth';
import GameRound from './components/GameRound';
import { Trophy, LogOut, LayoutGrid, Activity, Wifi } from 'lucide-react';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [geminiService, setGeminiService] = useState<GeminiService | null>(null);
  const [view, setView] = useState<'dashboard' | 'game'>('dashboard');
  
  const [gameState, setGameState] = useState<GameState>(() => {
    const saved = localStorage.getItem('gameState');
    return saved ? JSON.parse(saved) : {
      currentRoundId: 1,
      completedRounds: [],
      results: {},
      totalScore: 0,
    };
  });
  
  // Leaderboard is now driven by socket
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  // Restore user and service from sessionStorage
  useEffect(() => {
    const savedUser = sessionStorage.getItem('user');
    const savedApiKey = sessionStorage.getItem('apiKey');
    
    if (savedUser && savedApiKey) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      setGeminiService(new GeminiService(savedApiKey));
      
      // Reconnect to socket
      socketService.connect(parsedUser, (data) => {
        setLeaderboard(data);
        setIsConnected(true);
      });
    }
  }, []);

  // Save gameState to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('gameState', JSON.stringify(gameState));
  }, [gameState]);

  const handleLogin = (user: User, service: GeminiService) => {
    setUser(user);
    setGeminiService(service);
    setView('dashboard');
    
    // Save user and API key to sessionStorage for page refresh recovery
    sessionStorage.setItem('user', JSON.stringify(user));
    // Note: Store just a flag or handle API key more securely in production
    sessionStorage.setItem('apiKey', (service as any).apiKey || '');
    
    // Connect to Socket Server
    socketService.connect(user, (data) => {
        setLeaderboard(data);
        setIsConnected(true);
    });
  };

  const startRound = () => {
    setView('game');
    // Notify server
    socketService.updateProgress(gameState.totalScore, `Round ${gameState.currentRoundId}`);
  };

  const handleRoundComplete = (result: RoundResult) => {
    const newTotal = gameState.totalScore + result.score;
    const completed = [...gameState.completedRounds, result.roundId];
    const nextRoundId = result.roundId + 1;
    const isFinished = completed.length === ROUNDS.length;

    setGameState(prev => ({
      ...prev,
      totalScore: newTotal,
      completedRounds: completed,
      currentRoundId: nextRoundId,
      results: { ...prev.results, [result.roundId]: result }
    }));

    // Notify server of new score
    const status = isFinished ? "Finished" : "Thinking...";
    socketService.updateProgress(newTotal, status);

    setView('dashboard');
  };

  // Auth Guard
  if (!user || !geminiService) {
    return <Auth onLogin={handleLogin} />;
  }

  const currentRoundData = ROUNDS.find(r => r.id === gameState.currentRoundId);
  const isGameComplete = gameState.completedRounds.length === ROUNDS.length;

  return (
    <div className="min-h-screen text-slate-200 flex flex-col md:flex-row font-sans">
      
      {/* Sidebar / Mobile Header */}
      <div className="w-full md:w-80 bg-slate-900/40 backdrop-blur-md border-r border-slate-800 flex flex-col">
        <div className="p-8 border-b border-slate-800/50 flex items-center gap-4">
           <img 
             src="https://avatars.githubusercontent.com/u/53648600?s=200&v=4" 
             alt="ACM DTU" 
             className="w-12 h-12 rounded-xl shadow-lg shadow-blue-500/20" 
           />
           <div>
             <h1 className="font-bold text-xl text-white tracking-tight">Promptify</h1>
             <p className="text-xs text-slate-500 font-medium">v1.0.0</p>
           </div>
        </div>

        {/* User Stats */}
        <div className="p-6">
            <div className="flex items-center gap-4 mb-8 bg-slate-800/30 p-4 rounded-2xl border border-slate-700/30">
                <img src={user.avatarUrl} alt="Avatar" className="w-12 h-12 rounded-full border-2 border-slate-700" />
                <div>
                    <div className="font-bold text-white text-lg">{user.username}</div>
                    <div className="flex gap-2">
                         <div className="text-xs font-mono text-blue-400 bg-blue-950/30 px-2 py-0.5 rounded border border-blue-900/50 inline-block mt-1">
                            SCORE: {gameState.totalScore}
                        </div>
                        {isConnected && (
                             <div className="text-xs font-mono text-green-400 bg-green-950/30 px-2 py-0.5 rounded border border-green-900/50 inline-block mt-1 flex items-center gap-1">
                                <Wifi size={10} /> LIVE
                            </div>
                        )}
                    </div>
                </div>
            </div>
            
            <div className="space-y-3">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 pl-1">Campaign</div>
                {ROUNDS.map(round => {
                    const isCompleted = gameState.completedRounds.includes(round.id);
                    const isCurrent = round.id === gameState.currentRoundId;
                    const result = gameState.results[round.id];

                    return (
                        <div key={round.id} className={`p-4 rounded-xl border transition-all ${
                            isCurrent ? 'border-blue-500/30 bg-blue-600/10 shadow-[0_0_20px_-5px_rgba(59,130,246,0.3)]' : 
                            isCompleted ? 'border-slate-800 bg-slate-800/20' : 'border-transparent opacity-40'
                        }`}>
                            <div className="flex justify-between items-center mb-1">
                                <span className={`text-sm font-bold ${isCurrent ? 'text-white' : 'text-slate-400'}`}>Round {round.id}</span>
                                {isCompleted && (
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${result.score > 75 ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                        {result.score}
                                    </span>
                                )}
                            </div>
                            <div className="text-xs text-slate-500 truncate font-medium">{round.title}</div>
                        </div>
                    );
                })}
            </div>
        </div>
        
        <div className="mt-auto p-6 border-t border-slate-800/50">
             <button onClick={() => { socketService.disconnect(); window.location.reload(); }} className="flex items-center gap-3 text-slate-500 hover:text-white transition-colors text-sm font-medium w-full px-2 py-2 rounded-lg hover:bg-slate-800/50">
                 <LogOut size={16} /> Sign Out
             </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 relative flex flex-col overflow-hidden">
        
        {view === 'dashboard' && (
            <div className="flex-1 p-6 md:p-12 overflow-y-auto">
                <div className="max-w-5xl mx-auto space-y-12">
                    
                    {/* Hero Action */}
                    <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-10 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none transition-all group-hover:bg-blue-600/20"></div>
                        
                        <h2 className="text-4xl font-extrabold mb-4 text-white relative z-10">
                            {isGameComplete ? "Challenge Complete!" : `Ready for Round ${gameState.currentRoundId}?`}
                        </h2>
                        <p className="text-slate-400 max-w-lg mb-8 text-lg relative z-10 leading-relaxed">
                            {isGameComplete 
                                ? `You finished with a total score of ${gameState.totalScore}. Check your rank on the leaderboard below.`
                                : "Analyze the target output. Craft the perfect prompt. One attempt per round. Precision is key."
                            }
                        </p>
                        
                        {!isGameComplete ? (
                            <button 
                                onClick={startRound}
                                className="px-8 py-4 bg-white text-slate-950 font-bold rounded-xl hover:bg-blue-50 transition-all shadow-xl shadow-white/5 flex items-center gap-3 relative z-10 group/btn"
                            >
                                <LayoutGrid size={20} className="group-hover/btn:rotate-180 transition-transform duration-500" /> 
                                Enter Round {gameState.currentRoundId}
                            </button>
                        ) : (
                             <div className="inline-flex items-center gap-2 px-6 py-3 bg-green-500/10 text-green-400 rounded-full border border-green-500/20 font-semibold relative z-10">
                                 <Trophy size={18} /> All Rounds Finished
                             </div>
                        )}
                    </div>

                    {/* Leaderboard */}
                    <div>
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-yellow-500/10 rounded-lg">
                                    <Trophy className="text-yellow-500" size={24} />
                                </div>
                                <h3 className="text-2xl font-bold text-white">Global Leaderboard</h3>
                            </div>
                            
                            {isConnected ? (
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-900/30 border border-green-500/30 rounded-full">
                                    <span className="relative flex h-2.5 w-2.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                                    </span>
                                    <span className="text-xs font-bold text-green-400 uppercase tracking-wide">Socket Connected</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-red-900/30 border border-red-500/30 rounded-full">
                                    <span className="relative flex h-2.5 w-2.5">
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                                    </span>
                                    <span className="text-xs font-bold text-red-400 uppercase tracking-wide">Offline</span>
                                </div>
                            )}
                        </div>
                        
                        {!isConnected && leaderboard.length === 0 ? (
                            <div className="p-12 text-center bg-slate-900/50 rounded-2xl border border-slate-800 border-dashed">
                                <Activity className="mx-auto text-slate-600 mb-3" size={32} />
                                <p className="text-slate-400">Connecting to leaderboard server...</p>
                                <p className="text-slate-600 text-xs mt-2">Make sure <code>node server.js</code> is running.</p>
                            </div>
                        ) : (
                            <div className="bg-slate-900/40 backdrop-blur-sm border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-slate-950/50 text-slate-500 text-xs uppercase font-bold tracking-wider">
                                        <tr>
                                            <th className="p-5 w-20 text-center">Rank</th>
                                            <th className="p-5">Player</th>
                                            <th className="p-5">Status</th>
                                            <th className="p-5 text-right">Score</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/50">
                                        {leaderboard.map((entry) => (
                                            <tr key={entry.username} className={`group hover:bg-slate-800/30 transition-colors ${entry.username === user.username ? 'bg-blue-600/5' : ''}`}>
                                                <td className="p-5 text-center font-mono text-slate-500 group-hover:text-white font-medium">
                                                    #{entry.rank}
                                                </td>
                                                <td className="p-5">
                                                    <div className="flex items-center gap-4">
                                                        <img src={entry.avatarUrl} alt="" className="w-10 h-10 rounded-full bg-slate-800 shadow-md border border-slate-700" />
                                                        <div className="flex flex-col">
                                                            <span className={`font-semibold ${entry.username === user.username ? 'text-blue-400' : 'text-slate-300'}`}>
                                                                {entry.username} {entry.username === user.username && '(You)'}
                                                            </span>
                                                            {entry.isBot && <span className="text-[10px] text-slate-600 font-mono uppercase">Bot</span>}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-5">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium border ${
                                                        entry.status === 'Finished' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                                        entry.status.includes('Round') ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                        'bg-slate-700/30 text-slate-400 border-slate-600/30'
                                                    }`}>
                                                        {entry.status === 'Thinking...' && <Activity size={10} className="animate-pulse" />}
                                                        {entry.status}
                                                    </span>
                                                </td>
                                                <td className="p-5 text-right font-mono font-bold text-slate-200 text-lg">
                                                    {entry.score}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                </div>
            </div>
        )}

        {view === 'game' && currentRoundData && (
            <div className="flex-1 relative">
                <GameRound 
                    round={currentRoundData} 
                    service={geminiService} 
                    onComplete={handleRoundComplete}
                    isLastRound={gameState.currentRoundId === ROUNDS.length}
                />
            </div>
        )}

      </div>
    </div>
  );
};

export default App;