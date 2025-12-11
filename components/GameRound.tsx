import React, { useState, useEffect } from 'react';
import { RoundData, RoundResult } from '../types';
import { GeminiService } from '../services/geminiService';
import { Send, Image as ImageIcon, Type, Loader2, CheckCircle2, ArrowRight, BarChart, Clock } from 'lucide-react';

interface GameRoundProps {
  round: RoundData;
  service: GeminiService;
  onComplete: (result: RoundResult) => void;
  isLastRound: boolean;
}

const GameRound: React.FC<GameRoundProps> = ({ round, service, onComplete, isLastRound }) => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isJudging, setIsJudging] = useState(false);
  const [generatedOutput, setGeneratedOutput] = useState<string | null>(null);
  const [result, setResult] = useState<RoundResult | null>(null);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes in seconds
  const [isTimeUp, setIsTimeUp] = useState(false);

  // Timer effect
  useEffect(() => {
    if (result || isTimeUp) return; // Stop timer if round is complete or time is up

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setIsTimeUp(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [result, isTimeUp]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerColor = () => {
    if (timeLeft <= 30) return 'text-red-500';
    if (timeLeft <= 60) return 'text-yellow-500';
    return 'text-green-500';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isGenerating || result) return;

    setIsGenerating(true);

    try {
      // 1. Generate Content
      let output = "";
      if (round.type === 'text') {
        output = await service.generateText(prompt);
      } else {
        output = await service.generateImage(prompt);
      }
      setGeneratedOutput(output);
      setIsGenerating(false);

      // 2. Judge Content
      setIsJudging(true);
      const judgment = await service.calculateSimilarity(round.targetContent, output, round.type);
      
      const roundResult: RoundResult = {
        roundId: round.id,
        userPrompt: prompt,
        generatedContent: output,
        score: judgment.score,
        reasoning: judgment.reasoning
      };
      
      setResult(roundResult);

    } catch (err) {
      console.error(err);
      alert("Error during generation. Please try again.");
    } finally {
      setIsGenerating(false);
      setIsJudging(false);
    }
  };

  if (result) {
    // RESULTS VIEW
    return (
      <div className="flex flex-col h-full animate-in fade-in duration-500">
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
          {/* Score Header */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center">
            <h2 className="text-zinc-400 uppercase tracking-wider text-sm font-semibold mb-2">Similarity Score</h2>
            <div className={`text-6xl font-black ${
                result.score >= 80 ? 'text-green-500' :
                result.score >= 50 ? 'text-yellow-500' : 'text-red-500'
            }`}>
              {result.score}
            </div>
            <div className="mt-4 p-4 bg-zinc-950/50 rounded-lg text-left">
                <span className="text-zinc-500 text-xs uppercase font-bold">Judge's Reasoning:</span>
                <p className="text-zinc-300 mt-1">{result.reasoning}</p>
            </div>
          </div>

          {/* Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-blue-400 font-semibold">
                 <CheckCircle2 size={18} /> Target
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 h-64 overflow-auto">
                {round.type === 'text' ? (
                  <pre className="text-xs text-zinc-300 whitespace-pre-wrap font-mono">{round.displayTarget || round.targetContent}</pre>
                ) : (
                  <img src={round.targetContent} alt="Target" className="w-full h-full object-contain" />
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-purple-400 font-semibold">
                 <Type size={18} /> Your Output
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 h-64 overflow-auto">
                {round.type === 'text' ? (
                  <pre className="text-xs text-zinc-300 whitespace-pre-wrap font-mono">{result.generatedContent}</pre>
                ) : (
                  <img src={result.generatedContent} alt="Generated" className="w-full h-full object-contain" />
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
          <button
            onClick={() => onComplete(result)}
            className="w-full bg-white hover:bg-zinc-200 text-black font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-transform active:scale-[0.98]"
          >
            {isLastRound ? 'Finish Game' : 'Next Round'} <ArrowRight size={20} />
          </button>
        </div>
      </div>
    );
  }

  // GAMEPLAY VIEW
  return (
    <div className="flex flex-col h-full">
      {/* Top Bar: Target Info */}
      <div className="p-6 border-b border-zinc-800 bg-zinc-900/50">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            Round {round.id}: {round.title}
          </h2>
          <div className="flex items-center gap-4">
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${round.type === 'text' ? 'bg-blue-900/30 text-blue-400' : 'bg-pink-900/30 text-pink-400'}`}>
              {round.type} Challenge
            </span>
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full font-bold ${
              isTimeUp ? 'bg-red-900/30 text-red-400' :
              timeLeft <= 30 ? 'bg-red-900/30 text-red-400' : 
              timeLeft <= 60 ? 'bg-yellow-900/30 text-yellow-400' : 
              'bg-green-900/30 text-green-400'
            }`}>
              <Clock size={16} />
              <span className="font-mono">{formatTime(timeLeft)}</span>
            </div>
          </div>
        </div>
        <p className="text-zinc-400 mb-4">{round.description}</p>
        
        {isTimeUp && (
          <div className="mb-4 p-4 bg-red-900/30 border border-red-500/50 rounded-lg">
            <p className="text-red-400 font-semibold">⏰ Time's up! You can still submit your answer.</p>
          </div>
        )}
        
        <div className="bg-black/40 border border-zinc-800 rounded-lg p-4 max-h-48 overflow-y-auto">
          <div className="text-xs text-zinc-500 uppercase font-bold mb-2">Target Output</div>
          {round.type === 'text' ? (
             <pre className="text-sm text-zinc-300 font-mono whitespace-pre-wrap">{round.displayTarget || round.targetContent}</pre>
          ) : (
             <div className="flex justify-center">
                 <img src={round.targetContent} alt="Target" className="h-32 rounded-md border border-zinc-700" />
             </div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="flex-1 p-6 flex flex-col justify-end">
        <form onSubmit={handleSubmit} className="relative">
          <div className="absolute -top-10 left-0 text-zinc-500 text-sm font-medium">
             Your Prompt (1 Attempt Only)
          </div>
          <div className="relative group">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isGenerating || isJudging}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-4 pr-16 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all h-32 resize-none font-mono text-sm placeholder-zinc-600 disabled:opacity-50"
              placeholder={round.type === 'text' ? "Write a prompt to generate the text above..." : "Describe the image above to generate it..."}
            />
            <button
              type="submit"
              disabled={!prompt.trim() || isGenerating || isJudging}
              className="absolute bottom-4 right-4 bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-lg disabled:opacity-0 disabled:pointer-events-none transition-all duration-300 shadow-lg shadow-blue-900/20"
            >
              <Send size={18} />
            </button>
          </div>
        </form>
      </div>

      {/* Loading Overlay */}
      {(isGenerating || isJudging) && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="text-center space-y-4">
            <Loader2 className="animate-spin text-blue-500 mx-auto" size={48} />
            <div className="text-xl font-bold text-white">
              {isGenerating ? "Gemini is thinking..." : "The Judge is deciding..."}
            </div>
            <p className="text-zinc-400 text-sm">
                {isGenerating ? "Generating content based on your prompt." : "Calculating cosine similarity & semantic match."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameRound;