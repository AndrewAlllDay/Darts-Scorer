import React, { useState, useEffect, useCallback } from 'react';
import { RotateCcw, Delete, X, Users, Play, ArrowRight, ArrowLeft, Target, Trophy, AlertCircle, Home, Star } from 'lucide-react';

type AppMode = 'setup-players' | 'setup-game' | 'playing';
type GameType = '20' | '301' | '501' | '701' | 'cricket';

type Dart = {
  value: number;
  multiplier: number;
};

type CricketMarks = {
  [key: number]: number;
};

type PlayerData = {
  score: number;
  marks: CricketMarks;
};

type AwardType = 'HAT TRICK' | 'THREE IN A BED' | 'WHITE HORSE' | 'TON 80' | 'HIGH TON' | 'LOW TON' | '9 MARK' | '7 MARK' | '5 MARK' | null;

type TurnSummary = {
  player: number;
  darts: Dart[];
  x01Total: number;
  cricketMarksEarned: Record<number, number>;
};

const gameDescriptions: Record<GameType, string> = {
  '20': 'Quick Test',
  '301': 'Zero Out',
  '501': 'Zero Out',
  '701': 'Zero Out',
  'cricket': 'Highest Score Wins'
};

const CricketMark = ({ marks, size = "w-6 h-6" }: { marks: number; size?: string }) => {
  if (marks === 0) return <div className={size} />;
  return (
    <svg className={`${size} text-orange-500 drop-shadow-md`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
      {marks >= 1 && <line x1="20" y1="4" x2="4" y2="20" />}
      {marks >= 2 && <line x1="4" y1="4" x2="20" y2="20" />}
      {marks >= 3 && <circle cx="12" cy="12" r="10" />}
    </svg>
  );
};

const App: React.FC = () => {
  const [appMode, setAppMode] = useState<AppMode>('setup-players');
  const [playerCount, setPlayerCount] = useState<number>(0);
  const [gameType, setGameType] = useState<GameType | null>(null);
  const [scores, setScores] = useState<number[]>([]);
  const [playerData, setPlayerData] = useState<PlayerData[]>([]);
  const [activePlayer, setActivePlayer] = useState<number>(0);
  const [currentTurn, setCurrentTurn] = useState<Dart[]>([]);
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
  const [winner, setWinner] = useState<number | null>(null);
  const [showBust, setShowBust] = useState<boolean>(false);
  const [showQuitConfirm, setShowQuitConfirm] = useState<boolean>(false);
  const [turnSummary, setTurnSummary] = useState<TurnSummary | null>(null);
  const [recapTimeLeft, setRecapTimeLeft] = useState<number>(4);
  const [activeAward, setActiveAward] = useState<AwardType>(null);

  const segments: number[] = Array.from({ length: 20 }, (_, i) => i + 1);
  const isCricketGame = gameType === 'cricket';

  const acknowledgeRecap = useCallback(() => {
    setTurnSummary(null);
    setCurrentTurn([]);
    setSelectedNumber(null);
    setActivePlayer((prev) => (prev + 1) % playerCount);
    setRecapTimeLeft(4);
  }, [playerCount]);

  const acknowledgeBust = useCallback(() => {
    setShowBust(false);
    setCurrentTurn([]);
    setSelectedNumber(null);
    setActivePlayer((prev) => (prev + 1) % playerCount);
  }, [playerCount]);

  useEffect(() => {
    if (!turnSummary) return;
    const interval = setInterval(() => {
      setRecapTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          acknowledgeRecap();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [turnSummary, acknowledgeRecap]);

  useEffect(() => {
    if (activeAward) {
      const timer = setTimeout(() => setActiveAward(null), 2500);
      return () => clearTimeout(timer);
    }
  }, [activeAward]);

  const startGame = () => {
    if (!gameType) return;
    if (gameType === 'cricket') {
      setPlayerData(Array(playerCount).fill(null).map(() => ({
        score: 0,
        marks: { 20: 0, 19: 0, 18: 0, 17: 0, 16: 0, 15: 0, 25: 0 }
      })));
      setScores([]);
    } else {
      const startingScore = parseInt(gameType, 10);
      setScores(Array(playerCount).fill(startingScore));
      setPlayerData([]);
    }
    setActivePlayer(0);
    setCurrentTurn([]);
    setSelectedNumber(null);
    setWinner(null);
    setShowBust(false);
    setShowQuitConfirm(false);
    setTurnSummary(null);
    setAppMode('playing');
  };

  const returnToMenu = () => {
    setAppMode('setup-players');
    setPlayerCount(0);
    setGameType(null);
    setWinner(null);
    setShowBust(false);
    setShowQuitConfirm(false);
    setTurnSummary(null);
    setCurrentTurn([]);
    setSelectedNumber(null);
  };

  const handleMultiplierSelect = (multiplier: number) => {
    if (selectedNumber === null || currentTurn.length >= 3) return;
    setCurrentTurn(prev => [...prev, { value: selectedNumber as number, multiplier }]);
    setSelectedNumber(null);
  };

  const getProjectedCricketData = (): PlayerData[] => {
    if (playerData.length === 0) return [];
    const projected: PlayerData[] = JSON.parse(JSON.stringify(playerData));
    currentTurn.forEach(dart => {
      if ((dart.value >= 15 && dart.value <= 20) || dart.value === 25) {
        let marksToAdd = dart.multiplier;
        const currentMarks = projected[activePlayer].marks[dart.value];
        const marksNeededToClose = 3 - currentMarks;
        if (marksNeededToClose > 0) {
          const marksApplied = Math.min(marksToAdd, marksNeededToClose);
          projected[activePlayer].marks[dart.value] += marksApplied;
          marksToAdd -= marksApplied;
        }
        if (marksToAdd > 0) {
          let allOthersClosed = true;
          for (let i = 0; i < playerCount; i++) {
            if (i !== activePlayer && projected[i].marks[dart.value] < 3) {
              allOthersClosed = false;
              break;
            }
          }
          if (!allOthersClosed) projected[activePlayer].score += (dart.value * marksToAdd);
        }
      }
    });
    return projected;
  };

  const confirmTurn = () => {
    const turnTotal = currentTurn.reduce((sum, dart) => {
      if (dart.value === 25) return sum + (dart.multiplier === 2 ? 50 : 25);
      return sum + (dart.value * dart.multiplier);
    }, 0);

    const bulls = currentTurn.filter(d => d.value === 25).length;
    if (bulls === 3) setActiveAward('HAT TRICK');
    if (!isCricketGame && turnTotal === 180) setActiveAward('TON 80');

    if (isCricketGame) {
      const marksEarnedThisTurn: Record<number, number> = {};
      currentTurn.forEach(dart => {
        if ((dart.value >= 15 && dart.value <= 20) || dart.value === 25) {
          const currentMarks = playerData[activePlayer].marks[dart.value];
          const possibleNewMarks = Math.min(dart.multiplier, 3 - currentMarks);
          if (possibleNewMarks > 0) {
            marksEarnedThisTurn[dart.value] = (marksEarnedThisTurn[dart.value] || 0) + possibleNewMarks;
          }
        }
      });

      const newPlayerData = getProjectedCricketData();
      setPlayerData(newPlayerData);
      const isClosed = Object.values(newPlayerData[activePlayer].marks).every(m => m === 3);
      const isWinningScore = newPlayerData.every((p, i) => i === activePlayer || newPlayerData[activePlayer].score >= p.score);

      if (isClosed && isWinningScore) {
        setWinner(activePlayer);
      } else {
        setRecapTimeLeft(4);
        setTurnSummary({ player: activePlayer, darts: [...currentTurn], x01Total: 0, cricketMarksEarned: marksEarnedThisTurn });
      }
    } else {
      const currentScore = scores[activePlayer];
      const newScore = currentScore - turnTotal;
      if (newScore > 0) {
        setScores(prev => { const s = [...prev]; s[activePlayer] = newScore; return s; });
        setRecapTimeLeft(4);
        setTurnSummary({ player: activePlayer, darts: [...currentTurn], x01Total: turnTotal, cricketMarksEarned: {} });
      } else if (newScore === 0) {
        setWinner(activePlayer);
      } else {
        setShowBust(true);
      }
    }
  };

  const renderDartText = (dart: Dart) => {
    if (dart.value === 0) return 'MISS';
    if (dart.value === 25) return dart.multiplier === 2 ? 'DBULL' : 'BULL';
    const prefix = dart.multiplier === 1 ? '' : dart.multiplier === 2 ? 'D' : 'T';
    return `${prefix}${dart.value}`;
  };

  return (
    <div className="h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      <style>{`
        @keyframes popIn { 0% { opacity: 0; transform: scale(0.9) translateY(10px); } 100% { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes awardIn { 0% { opacity: 0; transform: scale(0.5) rotate(-10deg); } 70% { transform: scale(1.1) rotate(5deg); } 100% { opacity: 1; transform: scale(1) rotate(0); } }
        @keyframes shrinkWidth { from { width: 100%; } to { width: 0%; } }
        .animate-pop-in { animation: popIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-award { animation: awardIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        .animate-shrink { animation: shrinkWidth 4s linear forwards; }
      `}</style>

      {/* SCREEN 1: PLAYER SETUP */}
      {appMode === 'setup-players' && (
        <div className="flex flex-col h-full w-full p-6 max-w-2xl mx-auto justify-center animate-pop-in">
          <div className="text-center mb-16">
            <div className="inline-flex items-center justify-center p-6 bg-slate-900 rounded-full mb-4 shadow-xl shadow-orange-500/10">
              <Users size={64} className="text-orange-500" />
            </div>
            <h1 className="text-5xl font-black tracking-tight uppercase">DartBoard Studio</h1>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-8">
            {[1, 2, 3, 4].map(num => (
              <button key={num} onClick={() => setPlayerCount(num)} className={`py-8 rounded-2xl text-3xl font-black border-4 transition-all ${playerCount === num ? 'bg-orange-500 border-orange-600' : 'bg-slate-900 border-slate-800'}`}>{num} PLAYER{num > 1 ? 'S' : ''}</button>
            ))}
          </div>
          <button onClick={() => setAppMode('setup-game')} disabled={playerCount === 0} className="w-full py-8 bg-blue-600 rounded-3xl font-black text-3xl uppercase tracking-widest disabled:opacity-50 transition-all">Next Step <ArrowRight className="inline ml-2" /></button>
        </div>
      )}

      {/* SCREEN 2: GAME SETUP */}
      {appMode === 'setup-game' && (
        <div className="flex flex-col h-full w-full p-6 max-w-2xl mx-auto justify-center animate-pop-in">
          <button onClick={() => setAppMode('setup-players')} className="absolute top-6 left-6 p-4 bg-slate-800 rounded-full text-slate-400"><ArrowLeft size={32} /></button>
          <div className="text-center mb-16">
            <div className="inline-flex items-center justify-center p-6 bg-slate-900 rounded-full mb-4 shadow-xl shadow-orange-500/10">
              <Target size={64} className="text-orange-500" />
            </div>
            <h1 className="text-5xl font-black tracking-tight uppercase">Select Game</h1>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-8">
            {(['20', '301', '501', '701', 'cricket'] as GameType[]).map(type => (
              <button key={type} onClick={() => setGameType(type)} className={`py-6 rounded-2xl border-4 transition-all ${gameType === type ? 'bg-orange-500 border-orange-600 text-white' : 'bg-slate-900 border-slate-800 text-slate-400'}`}>
                <span className="font-black text-4xl block">{type.toUpperCase()}</span>
                <span className="text-[10px] uppercase opacity-50">{gameDescriptions[type]}</span>
              </button>
            ))}
          </div>
          <button onClick={startGame} disabled={!gameType} className="w-full py-8 bg-green-600 rounded-3xl font-black text-3xl uppercase tracking-widest disabled:opacity-50 transition-all"><Play className="inline mr-2 fill-current" /> Start Match</button>
        </div>
      )}

      {/* SCREEN 3: ACTIVE GAME */}
      {appMode === 'playing' && (
        <div className="flex flex-col h-full w-full p-4 max-w-2xl mx-auto animate-pop-in">
          <div className="flex items-start mb-4">
            <button onClick={() => setShowQuitConfirm(true)} className="p-3 bg-slate-800 rounded-xl text-slate-400 w-16 flex flex-col items-center gap-1"><RotateCcw size={24} /><span className="text-[10px] font-bold">QUIT</span></button>
            <div className="flex-1 mx-2">
              {isCricketGame ? (
                <div className="bg-slate-900 rounded-xl border-2 border-slate-800 p-2 shadow-inner">
                  <div className="flex border-b-2 border-slate-800 pb-1 mb-1">
                    <div className="w-8"></div>
                    {playerData.map((p, i) => (
                      <div key={i} className={`flex-1 text-center ${activePlayer === i ? 'text-orange-500 scale-110' : 'text-slate-500'}`}>
                        <p className="text-xs font-black">P{i + 1}</p>
                        <p className="text-sm font-bold opacity-80">{p.score}</p>
                      </div>
                    ))}
                  </div>
                  {[20, 19, 18, 17, 16, 15, 25].map(target => (
                    <div key={target} className="flex items-center px-1">
                      <div className="w-8 text-center font-black text-sm text-slate-300">{target === 25 ? 'B' : target}</div>
                      {getProjectedCricketData().map((p, i) => (
                        <div key={i} className={`flex-1 flex justify-center py-0.5 ${activePlayer === i ? 'opacity-100' : 'opacity-40'}`}><CricketMark marks={p.marks[target]} /></div>
                      ))}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex justify-center gap-2">
                  {scores.map((score, index) => (
                    <div key={index} className={`flex-1 p-2 rounded-xl border-2 text-center ${activePlayer === index ? 'bg-slate-900 border-orange-500' : 'bg-slate-900 border-slate-800 opacity-50'}`}>
                      <p className="text-[10px] font-black uppercase text-orange-500">P{index + 1}</p>
                      <h2 className="text-3xl font-black">{score - (index === activePlayer ? currentTurn.reduce((s, d) => s + (d.value === 25 ? d.multiplier * 25 : d.value * d.multiplier), 0) : 0)}</h2>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="w-16"></div>
          </div>

          <div className="flex justify-center gap-4 mb-4">
            {[0, 1, 2].map(i => (
              <div key={i} className={`w-16 h-20 rounded-xl border-2 flex items-center justify-center text-2xl font-bold ${currentTurn[i] ? 'border-orange-500 bg-orange-500/20' : 'border-slate-800 text-slate-800'}`}>
                {currentTurn[i] ? renderDartText(currentTurn[i]) : '•'}
              </div>
            ))}
          </div>

          <div className="flex-1 grid grid-cols-4 gap-2 mb-4">
            {segments.map(num => <button key={num} onClick={() => setSelectedNumber(num)} className="bg-slate-800 text-slate-100 rounded-lg text-3xl font-bold shadow-lg active:bg-slate-700">{num}</button>)}
            <button onClick={() => setSelectedNumber(25)} className="bg-red-900 text-red-100 rounded-lg font-bold text-2xl shadow-lg active:bg-red-800">BULL</button>
            <button onClick={() => setCurrentTurn(prev => [...prev, { value: 0, multiplier: 1 }])} className="bg-slate-700 text-slate-300 rounded-lg font-bold text-2xl shadow-lg active:bg-slate-600">MISS</button>
            <button onClick={() => setCurrentTurn(prev => prev.slice(0, -1))} className="bg-slate-900 rounded-lg flex items-center justify-center col-span-2 text-slate-500 shadow-lg active:bg-slate-800"><Delete size={32} /></button>
          </div>

          <button onClick={confirmTurn} disabled={currentTurn.length === 0} className="w-full py-6 bg-green-600 rounded-2xl font-black text-2xl uppercase shadow-xl active:bg-green-700">Submit Turn</button>
        </div>
      )}

      {/* OVERLAYS & MODALS */}
      {selectedNumber !== null && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 backdrop-blur-sm p-6">
          <div className="bg-slate-800 w-full max-w-sm rounded-3xl border border-slate-700 animate-pop-in">
            <div className="bg-slate-900 p-6 flex justify-between items-center border-b border-slate-700">
              <h2 className="text-4xl font-black text-orange-500 uppercase">{selectedNumber === 25 ? 'Bullseye' : selectedNumber}</h2>
              <button onClick={() => setSelectedNumber(null)} className="p-3 bg-slate-800 rounded-full text-slate-400"><X size={32} /></button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <button onClick={() => handleMultiplierSelect(1)} className="py-8 bg-slate-700 rounded-2xl text-3xl font-bold uppercase active:scale-95 transition-transform">Single</button>
              <button onClick={() => handleMultiplierSelect(2)} className="py-8 bg-slate-700 rounded-2xl text-3xl font-bold uppercase border-l-8 border-orange-500 active:scale-95 transition-transform">Double</button>
              {selectedNumber !== 25 && <button onClick={() => handleMultiplierSelect(3)} className="py-8 bg-slate-700 rounded-2xl text-3xl font-bold uppercase border-l-8 border-red-500 active:scale-95 transition-transform">Triple</button>}
            </div>
          </div>
        </div>
      )}

      {activeAward && (
        <div className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center">
          <div className="animate-award bg-gradient-to-b from-orange-400 to-red-600 p-1 rounded-[40px] shadow-2xl">
            <div className="bg-slate-950 px-12 py-8 rounded-[38px] flex flex-col items-center border-4 border-white/20">
              <Star className="text-yellow-400 mb-2 fill-yellow-400" size={64} />
              <h2 className="text-6xl font-black text-white italic drop-shadow-[0_4px_0_rgba(0,0,0,1)] uppercase">{activeAward}</h2>
            </div>
          </div>
        </div>
      )}

      {turnSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm p-6">
          <div className="bg-slate-900 w-full max-w-sm rounded-3xl border border-slate-700 p-8 relative animate-pop-in text-center shadow-2xl">
            <h2 className="text-3xl font-black text-white mb-6 uppercase">Player {turnSummary.player + 1}</h2>
            <div className="flex justify-center gap-3 mb-8">
              {turnSummary.darts.map((d, i) => <div key={i} className="w-16 h-16 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-xl font-bold text-white">{renderDartText(d)}</div>)}
              {Array.from({ length: 3 - turnSummary.darts.length }).map((_, i) => <div key={i} className="w-16 h-16 rounded-xl bg-slate-800/50 flex items-center justify-center text-slate-600">-</div>)}
            </div>
            {isCricketGame && Object.keys(turnSummary.cricketMarksEarned).length > 0 && (
              <div className="mb-8 bg-slate-950/40 p-6 rounded-3xl border border-slate-800">
                <p className="text-slate-500 text-xs font-black uppercase mb-4">Marks Earned</p>
                <div className="flex flex-wrap justify-center gap-8">
                  {Object.entries(turnSummary.cricketMarksEarned).map(([val, marks]) => (
                    <div key={val} className="flex flex-col items-center gap-2">
                      <span className="text-xl font-black text-white bg-slate-800 w-10 h-10 flex items-center justify-center rounded-full border border-slate-700">{val === '25' ? 'B' : val}</span>
                      <CricketMark marks={marks} size="w-12 h-12" />
                    </div>
                  ))}
                </div>
              </div>
            )}
            {!isCricketGame && <div className="mb-8"><p className="text-slate-500 text-sm font-bold uppercase opacity-50">Points Scored</p><p className="text-6xl font-black text-green-400">{turnSummary.x01Total}</p></div>}
            <button onClick={acknowledgeRecap} className="w-full py-6 bg-blue-600 rounded-2xl font-black text-xl flex items-center justify-center gap-3 active:scale-95 transition-transform">Next P{((turnSummary.player + 1) % playerCount) + 1} ({recapTimeLeft}s) <ArrowRight size={28} /></button>
            <div className="absolute bottom-0 left-0 h-1.5 bg-blue-500 animate-shrink" />
          </div>
        </div>
      )}

      {showQuitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-6">
          <div className="bg-slate-900 w-full max-w-sm rounded-3xl border border-slate-700 text-center p-8 animate-pop-in">
            <div className="flex justify-center mb-6 text-red-500"><AlertCircle size={64} /></div>
            <h2 className="text-3xl font-black text-white mb-2 uppercase">Quit Match?</h2>
            <div className="flex gap-4 mt-8">
              <button onClick={() => setShowQuitConfirm(false)} className="flex-1 py-4 bg-slate-800 rounded-xl font-bold">Cancel</button>
              <button onClick={returnToMenu} className="flex-1 py-4 bg-red-600 rounded-xl font-bold text-white shadow-lg shadow-red-500/20">Quit</button>
            </div>
          </div>
        </div>
      )}

      {showBust && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-red-950/90 backdrop-blur-md p-6">
          <div className="bg-slate-900 w-full max-w-sm rounded-3xl border-4 border-red-600 text-center p-8 animate-pop-in">
            <div className="flex justify-center mb-6 text-red-500"><AlertCircle size={80} /></div>
            <h2 className="text-6xl font-black text-white tracking-widest uppercase italic">Bust!</h2>
            <button onClick={acknowledgeBust} className="w-full py-6 bg-red-600 rounded-2xl font-black text-2xl mt-8 shadow-xl">Pass Turn</button>
          </div>
        </div>
      )}

      {winner !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-yellow-900/95 backdrop-blur-md p-6">
          <div className="bg-slate-900 w-full max-w-md rounded-3xl border-4 border-yellow-500 text-center p-8 animate-pop-in shadow-2xl">
            <Trophy size={100} className="text-yellow-500 mx-auto mb-6" />
            <h2 className="text-5xl font-black text-white uppercase italic mb-8">P{winner + 1} Wins!</h2>
            <button onClick={startGame} className="w-full py-6 bg-yellow-600 rounded-2xl font-black text-2xl mb-4 text-slate-900 flex justify-center items-center gap-3 active:scale-95 transition-transform shadow-xl"><RotateCcw size={28} /> Play Again</button>
            <button onClick={returnToMenu} className="w-full py-4 bg-slate-800 rounded-2xl font-bold text-slate-400 flex justify-center items-center gap-2 active:scale-95 transition-transform"><Home size={20} /> Menu</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;