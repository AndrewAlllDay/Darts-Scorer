import React, { useState, useEffect } from 'react';
import { RotateCcw, Delete, X, Users, Play, ArrowRight, ArrowLeft, Target, Trophy, AlertCircle, Home } from 'lucide-react';

type AppMode = 'setup-players' | 'setup-game' | 'playing';
type GameType = '20' | '301' | '501' | '701' | 'cricket';

type Dart = {
  value: number;
  multiplier: number;
};

type CricketMarks = {
  [key: number]: number; // 15, 16, 17, 18, 19, 20, 25
};

type PlayerData = {
  score: number;
  marks: CricketMarks;
};

type TurnSummary = {
  player: number;
  darts: Dart[];
  x01Total: number;
};

const gameDescriptions: Record<GameType, string> = {
  '20': 'Quick Test',
  '301': 'Zero Out',
  '501': 'Zero Out',
  '701': 'Zero Out',
  'cricket': 'Highest Score Wins'
};

// --- Custom Cricket Mark SVG Component ---
const CricketMark = ({ marks }: { marks: number }) => {
  if (marks === 0) return <div className="w-6 h-6" />;
  return (
    <svg className="w-6 h-6 text-orange-500 drop-shadow-md" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
      {marks >= 1 && <line x1="20" y1="4" x2="4" y2="20" />}
      {marks >= 2 && <line x1="4" y1="4" x2="20" y2="20" />}
      {marks >= 3 && <circle cx="12" cy="12" r="10" />}
    </svg>
  );
};

const App: React.FC = () => {
  // --- App State ---
  const [appMode, setAppMode] = useState<AppMode>('setup-players');
  const [playerCount, setPlayerCount] = useState<number>(0);
  const [gameType, setGameType] = useState<GameType | null>(null);

  // --- Game State ---
  const [scores, setScores] = useState<number[]>([]); // For X01 Games
  const [playerData, setPlayerData] = useState<PlayerData[]>([]); // For Cricket

  const [activePlayer, setActivePlayer] = useState<number>(0);
  const [currentTurn, setCurrentTurn] = useState<Dart[]>([]);
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);

  // --- Alert States ---
  const [winner, setWinner] = useState<number | null>(null);
  const [showBust, setShowBust] = useState<boolean>(false);
  const [showQuitConfirm, setShowQuitConfirm] = useState<boolean>(false);
  const [turnSummary, setTurnSummary] = useState<TurnSummary | null>(null);
  const [recapTimeLeft, setRecapTimeLeft] = useState<number>(4);

  const segments: number[] = Array.from({ length: 20 }, (_, i) => i + 1);
  const isCricketGame = gameType === 'cricket';

  // --- Auto-Advance Timer for Recap ---
  useEffect(() => {
    if (!turnSummary) return;

    const interval = setInterval(() => {
      setRecapTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          // Auto-acknowledge when timer hits 0
          setTurnSummary(null);
          setCurrentTurn([]);
          setSelectedNumber(null);
          setActivePlayer((p) => (p + 1) % playerCount);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [turnSummary, playerCount]);


  // --- Setup Actions ---
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

  const handleQuitClick = (): void => {
    setShowQuitConfirm(true);
  };

  const confirmQuit = (): void => {
    setAppMode('setup-players');
    setPlayerCount(0);
    setGameType(null);
    setWinner(null);
    setShowBust(false);
    setShowQuitConfirm(false);
    setTurnSummary(null);
  };

  const cancelQuit = (): void => {
    setShowQuitConfirm(false);
  };

  const playAgain = (): void => {
    startGame();
  };

  const returnToMenu = (): void => {
    setAppMode('setup-players');
    setPlayerCount(0);
    setGameType(null);
    setWinner(null);
    setShowBust(false);
    setTurnSummary(null);
  };

  // --- Game Actions ---
  const handleNumberSelect = (value: number): void => {
    if (currentTurn.length >= 3) return;
    setSelectedNumber(value);
  };

  const handleMultiplierSelect = (multiplier: number): void => {
    if (selectedNumber === null || currentTurn.length >= 3) return;
    setCurrentTurn([...currentTurn, { value: selectedNumber, multiplier }]);
    setSelectedNumber(null);
  };

  const handleMiss = (): void => {
    if (currentTurn.length >= 3) return;
    setCurrentTurn([...currentTurn, { value: 0, multiplier: 1 }]);
    setSelectedNumber(null);
  };

  const removeLastDart = (): void => {
    setCurrentTurn(currentTurn.slice(0, -1));
    setSelectedNumber(null);
  };

  // --- Live Projection Logic ---
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
          if (!allOthersClosed) {
            projected[activePlayer].score += (dart.value * marksToAdd);
          }
        }
      }
    });
    return projected;
  };

  const getProjectedX01Scores = (): number[] => {
    if (scores.length === 0) return [];
    const turnTotal = currentTurn.reduce((sum, dart) => {
      if (dart.value === 25) return sum + (dart.multiplier === 2 ? 50 : 25);
      return sum + (dart.value * dart.multiplier);
    }, 0);

    return scores.map((score, index) => {
      if (index === activePlayer) {
        return score - turnTotal;
      }
      return score;
    });
  };

  const confirmTurn = (): void => {
    if (isCricketGame) {
      const newPlayerData = getProjectedCricketData();
      setPlayerData(newPlayerData);

      const isClosed = Object.values(newPlayerData[activePlayer].marks).every(m => m === 3);
      const isWinningScore = newPlayerData.every((p: PlayerData, i: number) => i === activePlayer || newPlayerData[activePlayer].score >= p.score);

      if (isClosed && isWinningScore) {
        setWinner(activePlayer);
      } else {
        setRecapTimeLeft(4);
        setTurnSummary({
          player: activePlayer,
          darts: [...currentTurn],
          x01Total: 0
        });
      }

    } else {
      // --- X01 Logic ---
      const turnTotal = currentTurn.reduce((sum, dart) => {
        if (dart.value === 25) return sum + (dart.multiplier === 2 ? 50 : 25);
        return sum + (dart.value * dart.multiplier);
      }, 0);

      const currentScore = scores[activePlayer];
      const newScore = currentScore - turnTotal;

      if (newScore > 0) {
        const newScores = [...scores];
        newScores[activePlayer] = newScore;
        setScores(newScores);

        setRecapTimeLeft(4);
        setTurnSummary({
          player: activePlayer,
          darts: [...currentTurn],
          x01Total: turnTotal
        });
      } else if (newScore === 0) {
        const newScores = [...scores];
        newScores[activePlayer] = 0;
        setScores(newScores);
        setWinner(activePlayer);
      } else {
        setShowBust(true);
      }
    }
  };

  const acknowledgeBust = (): void => {
    setShowBust(false);
    setCurrentTurn([]);
    setSelectedNumber(null);
    setActivePlayer((prev) => (prev + 1) % playerCount);
  };

  const acknowledgeRecap = (): void => {
    setTurnSummary(null);
    setCurrentTurn([]);
    setSelectedNumber(null);
    setActivePlayer((prev) => (prev + 1) % playerCount);
  };

  const renderDartText = (dart: Dart) => {
    if (dart.value === 0) return 'MISS';
    if (dart.value === 25) return dart.multiplier === 2 ? 'DBULL' : 'BULL';
    const prefix = dart.multiplier === 1 ? '' : dart.multiplier === 2 ? 'D' : 'T';
    return `${prefix}${dart.value}`;
  };

  const projectedScores = getProjectedX01Scores();
  const projectedPlayerData = getProjectedCricketData();


  // ==========================================
  // MASTER WRAPPER & SLIDING SCREENS
  // ==========================================
  return (
    <div className="relative h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">

      {/* Dynamic CSS Keyframes for Modals */}
      <style>{`
        @keyframes popIn {
          0% { opacity: 0; transform: scale(0.9) translateY(10px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-pop-in {
          animation: popIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes shrinkWidth {
          from { width: 100%; }
          to { width: 0%; }
        }
        .animate-shrink {
          animation: shrinkWidth 4s linear forwards;
        }
      `}</style>

      {/* --------------------------------------
          SCREEN 1: PLAYER SETUP
          -------------------------------------- */}
      <div
        className={`absolute inset-0 w-full h-full transition-transform duration-500 ease-in-out ${appMode === 'setup-players' ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        <div className="flex flex-col h-full w-full p-6 max-w-2xl mx-auto justify-center relative">
          <div className="text-center mb-16 space-y-4">
            <div className="inline-flex items-center justify-center p-6 bg-slate-900 rounded-full mb-4 shadow-xl shadow-orange-500/10">
              <Users size={64} className="text-orange-500" />
            </div>
            <h1 className="text-5xl font-black tracking-tight">DartBoard Studio</h1>
          </div>

          <div className="space-y-12">
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((num) => (
                <button
                  key={num}
                  onClick={() => setPlayerCount(num)}
                  className={`py-8 rounded-2xl text-3xl font-black transition-all border-4 
                    ${playerCount === num
                      ? 'bg-orange-500 border-orange-600 text-white shadow-lg shadow-orange-500/20 scale-105'
                      : 'bg-slate-900 border-slate-800 text-slate-500 hover:bg-slate-800'
                    }`}
                >
                  {num} {num === 1 ? 'PLAYER' : 'PLAYERS'}
                </button>
              ))}
            </div>

            <button
              onClick={() => setAppMode('setup-game')}
              disabled={playerCount === 0}
              className={`w-full py-8 rounded-3xl font-black text-3xl uppercase tracking-widest shadow-xl flex items-center justify-center gap-4 transition-all
                ${playerCount === 0
                  ? 'bg-slate-800 text-slate-600 cursor-not-allowed opacity-50'
                  : 'bg-blue-600 active:bg-blue-700 text-white active:scale-95'
                }`}
            >
              Next Step
              <ArrowRight size={32} />
            </button>
          </div>
        </div>
      </div>


      {/* --------------------------------------
          SCREEN 2: GAME SETUP
          -------------------------------------- */}
      <div
        className={`absolute inset-0 w-full h-full transition-transform duration-500 ease-in-out ${appMode === 'setup-game' ? 'translate-x-0' :
            appMode === 'playing' ? '-translate-x-full' : 'translate-x-full'
          }`}
      >
        <div className="flex flex-col h-full w-full p-6 max-w-2xl mx-auto justify-center relative">

          <button
            onClick={() => setAppMode('setup-players')}
            className="absolute top-6 left-6 p-4 bg-slate-800 rounded-full text-slate-400 active:bg-slate-700 transition-colors z-10 shadow-lg"
          >
            <ArrowLeft size={32} />
          </button>

          <div className="text-center mb-16 space-y-4">
            <div className="inline-flex items-center justify-center p-6 bg-slate-900 rounded-full mb-4 shadow-xl shadow-orange-500/10">
              <Target size={64} className="text-orange-500" />
            </div>
            <h1 className="text-5xl font-black tracking-tight">Select Game</h1>
          </div>

          <div className="space-y-12">
            <div className="grid grid-cols-2 gap-4">
              {(['20', '301', '501', '701', 'cricket'] as GameType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setGameType(type)}
                  className={`py-6 rounded-2xl transition-all border-4 flex flex-col items-center justify-center gap-1
                    ${gameType === type
                      ? 'bg-orange-500 border-orange-600 text-white shadow-lg shadow-orange-500/20 scale-105'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
                    }`}
                >
                  <span className={`font-black leading-none ${type === 'cricket' ? 'text-3xl' : 'text-4xl'}`}>
                    {type === 'cricket' ? 'CRICKET' : type}
                  </span>
                  <span className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${gameType === type ? 'text-orange-200' : 'text-slate-500'}`}>
                    {gameDescriptions[type]}
                  </span>
                </button>
              ))}

              <button
                disabled
                className="py-6 rounded-2xl transition-all border-4 bg-slate-950 border-slate-900 text-slate-700 opacity-50 relative overflow-hidden flex flex-col items-center justify-center gap-1"
              >
                <span className="font-black leading-none text-3xl">MORE</span>
                <span className="text-[10px] font-bold uppercase tracking-widest mt-1 text-slate-500">Coming Soon</span>
              </button>
            </div>

            <button
              onClick={startGame}
              disabled={!gameType}
              className={`w-full py-8 rounded-3xl font-black text-3xl uppercase tracking-widest shadow-xl flex items-center justify-center gap-4 transition-all
                ${!gameType
                  ? 'bg-slate-800 text-slate-600 cursor-not-allowed opacity-50'
                  : 'bg-green-600 active:bg-green-700 text-white active:scale-95'
                }`}
            >
              <Play size={32} fill="currentColor" />
              Start Match
            </button>
          </div>
        </div>
      </div>


      {/* --------------------------------------
          SCREEN 3: ACTIVE GAME
          -------------------------------------- */}
      <div
        className={`absolute inset-0 w-full h-full transition-transform duration-500 ease-in-out ${appMode === 'playing' ? 'translate-x-0' : 'translate-x-full'
          }`}
      >
        <div className="flex flex-col h-full w-full p-4 max-w-2xl mx-auto relative">

          <div className="flex items-start mb-4 w-full">

            {/* Left Action Area */}
            <div className="w-16 shrink-0 flex justify-start">
              <button
                onClick={handleQuitClick}
                className="p-3 bg-slate-800 rounded-xl text-slate-400 active:bg-red-900 transition-colors flex flex-col items-center gap-1 z-10 w-full"
              >
                <RotateCcw size={24} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Quit</span>
              </button>
            </div>

            {/* --- SCOREBOARDS --- */}
            <div className="flex-1 flex justify-center mx-2 min-w-0">
              {isCricketGame ? (
                <div className="w-full max-w-sm bg-slate-900 rounded-xl border-2 border-slate-800 p-2 shadow-inner">
                  {/* Cricket Players Header */}
                  <div className="flex border-b-2 border-slate-800 pb-1 mb-1">
                    <div className="w-8 shrink-0"></div>
                    {projectedPlayerData.map((p, i) => (
                      <div key={i} className={`flex-1 flex flex-col items-center justify-center transition-all ${activePlayer === i ? 'text-orange-500 scale-110 drop-shadow-md' : 'text-slate-500'}`}>
                        <p className="text-[9px] font-black uppercase">P{i + 1}</p>
                        <p className="text-lg font-black leading-none">{p.score}</p>
                      </div>
                    ))}
                  </div>
                  {/* Cricket Grid */}
                  <div className="flex flex-col">
                    {[20, 19, 18, 17, 16, 15, 25].map(target => (
                      <div key={target} className="flex items-center bg-slate-950/50 even:bg-transparent rounded px-1">
                        <div className="w-8 text-center font-black text-sm text-slate-300 shrink-0">
                          {target === 25 ? 'B' : target}
                        </div>
                        {projectedPlayerData.map((p, i) => (
                          <div key={i} className={`flex-1 flex justify-center py-0.5 transition-opacity ${activePlayer === i ? 'opacity-100' : 'opacity-40'}`}>
                            <CricketMark marks={p.marks[target]} />
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex justify-center gap-2 flex-wrap mb-2">
                  {projectedScores.map((score, index) => {
                    const isActive = activePlayer === index;
                    // If projected score is negative, render it red
                    const isBust = score < 0;
                    const isWin = score === 0;

                    return (
                      <div
                        key={index}
                        className={`flex flex-col items-center justify-center px-4 py-2 rounded-xl border-2 transition-all min-w-[80px]
                          ${isActive
                            ? `bg-slate-900 shadow-lg scale-105 ${isBust ? 'border-red-500 shadow-red-500/20' : isWin ? 'border-green-500 shadow-green-500/20' : 'border-orange-500 shadow-orange-500/20'}`
                            : 'bg-slate-900 border-slate-800 opacity-50'}`}
                      >
                        <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isActive ? (isBust ? 'text-red-500' : isWin ? 'text-green-500' : 'text-orange-500') : 'text-slate-500'}`}>
                          P{index + 1}
                        </p>
                        <h2 className={`font-black tabular-nums leading-none ${isActive ? (isBust ? 'text-4xl text-red-500' : isWin ? 'text-4xl text-green-400' : 'text-4xl text-white') : 'text-2xl text-slate-400'}`}>
                          {score}
                        </h2>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right Action Spacer (Balances the Quit button to keep scores mathematically centered) */}
            <div className="w-16 shrink-0"></div>

          </div>

          {/* 3 Dart Display */}
          <div className="flex justify-center gap-4 mb-4">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`w-16 h-20 rounded-xl border-2 flex items-center justify-center text-2xl font-bold transition-all
                  ${currentTurn[i] !== undefined ? 'border-orange-500 bg-orange-500/20 text-white' : 'border-slate-800 text-slate-800'}`}
              >
                {currentTurn[i] ? renderDartText(currentTurn[i]) : '•'}
              </div>
            ))}
          </div>

          {/* Input Section */}
          <div className="flex-1 flex flex-col gap-4">
            <div className="grid grid-cols-4 gap-2 flex-1">
              {segments.map((num) => (
                <button
                  key={num}
                  onClick={() => handleNumberSelect(num)}
                  className="bg-slate-800 text-slate-100 active:bg-slate-700 rounded-lg text-3xl font-bold transition-colors shadow-lg"
                >
                  {num}
                </button>
              ))}
              <button
                onClick={() => handleNumberSelect(25)}
                className="bg-red-900 text-red-100 active:bg-red-800 rounded-lg font-bold text-2xl transition-colors shadow-lg"
              >
                BULL
              </button>
              <button
                onClick={handleMiss}
                className="bg-slate-700 text-slate-300 rounded-lg font-bold text-2xl active:bg-slate-600 shadow-lg"
              >
                MISS
              </button>
              <button
                onClick={removeLastDart}
                className="bg-slate-900 rounded-lg flex items-center justify-center col-span-2 text-slate-500 active:bg-slate-800 shadow-lg"
              >
                <Delete size={32} />
              </button>
            </div>

            {/* Final Submit */}
            <button
              onClick={confirmTurn}
              disabled={currentTurn.length === 0}
              className="w-full py-6 bg-green-600 active:bg-green-700 disabled:opacity-30 disabled:grayscale rounded-2xl font-black text-2xl uppercase mt-2 transition-all shadow-xl flex items-center justify-center gap-2"
            >
              Submit Turn
              {!isCricketGame && (
                <span className="text-green-300 ml-2 text-lg">
                  ({currentTurn.reduce((sum, dart) => sum + (dart.value === 25 ? dart.multiplier * 25 : dart.value * dart.multiplier), 0)})
                </span>
              )}
            </button>
          </div>
        </div>
      </div>


      {/* =========================================
          OVERLAYS & MODALS
          ========================================= */}

      {/* Modifier Modal Overlay */}
      {selectedNumber !== null && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 backdrop-blur-sm p-6">
          <div className="bg-slate-800 w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-slate-700 animate-pop-in">
            <div className="bg-slate-900 p-6 flex justify-between items-center border-b border-slate-700">
              <h2 className="text-4xl font-black text-orange-500 tracking-wider">
                {selectedNumber === 25 ? 'BULLSEYE' : selectedNumber}
              </h2>
              <button
                onClick={() => setSelectedNumber(null)}
                className="p-3 bg-slate-800 rounded-full text-slate-400 active:bg-slate-700 transition-colors"
              >
                <X size={32} />
              </button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <button
                onClick={() => handleMultiplierSelect(1)}
                className="py-8 bg-slate-700 active:bg-slate-600 rounded-2xl text-3xl font-bold tracking-widest shadow-lg transition-transform active:scale-95"
              >
                SINGLE {selectedNumber === 25 ? '(25)' : ''}
              </button>
              <button
                onClick={() => handleMultiplierSelect(2)}
                className="py-8 bg-slate-700 active:bg-slate-600 rounded-2xl text-3xl font-bold tracking-widest shadow-lg transition-transform active:scale-95 border-l-8 border-orange-500"
              >
                DOUBLE {selectedNumber === 25 ? '(50)' : ''}
              </button>
              {selectedNumber !== 25 && (
                <button
                  onClick={() => handleMultiplierSelect(3)}
                  className="py-8 bg-slate-700 active:bg-slate-600 rounded-2xl text-3xl font-bold tracking-widest shadow-lg transition-transform active:scale-95 border-l-8 border-red-500"
                >
                  TRIPLE
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Turn Recap Overlay */}
      {turnSummary !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-6">
          <div className="bg-slate-900 w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-slate-700 text-center p-8 relative animate-pop-in">
            <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-widest">
              Player {turnSummary.player + 1}
            </h2>
            <p className="text-slate-400 font-bold mb-6 uppercase tracking-widest">Turn Complete</p>

            <div className="flex justify-center gap-3 mb-8">
              {turnSummary.darts.map((dart, i) => (
                <div key={i} className="w-16 h-16 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-xl font-bold text-white shadow-inner">
                  {renderDartText(dart)}
                </div>
              ))}
              {/* Fill empty spots if they submitted with less than 3 darts */}
              {Array.from({ length: 3 - turnSummary.darts.length }).map((_, i) => (
                <div key={`empty-${i}`} className="w-16 h-16 rounded-xl bg-slate-800/50 border border-slate-800 flex items-center justify-center text-xl font-bold text-slate-600">
                  -
                </div>
              ))}
            </div>

            {!isCricketGame && (
              <div className="mb-8">
                <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mb-1">Points Scored</p>
                <p className="text-5xl font-black text-green-400">{turnSummary.x01Total}</p>
              </div>
            )}

            <button
              onClick={acknowledgeRecap}
              className="w-full py-6 bg-blue-600 active:bg-blue-700 rounded-2xl font-black text-xl uppercase tracking-widest shadow-xl transition-transform active:scale-95 flex items-center justify-center gap-3 relative z-10"
            >
              Pass to P{((turnSummary.player + 1) % playerCount) + 1} ({recapTimeLeft}s)
              <ArrowRight size={28} />
            </button>

            {/* Shrinking Time Bar */}
            <div className="absolute bottom-0 left-0 h-1.5 bg-blue-500 animate-shrink" />
          </div>
        </div>
      )}

      {/* Quit Confirmation Overlay */}
      {showQuitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-6">
          <div className="bg-slate-900 w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-slate-700 text-center p-8 animate-pop-in">
            <div className="flex justify-center mb-6 text-red-500">
              <AlertCircle size={64} />
            </div>
            <h2 className="text-3xl font-black text-white mb-2">Quit Match?</h2>
            <p className="text-slate-400 mb-8">Current progress will be lost.</p>

            <div className="flex gap-4">
              <button
                onClick={cancelQuit}
                className="flex-1 py-4 bg-slate-800 active:bg-slate-700 rounded-xl font-bold text-slate-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmQuit}
                className="flex-1 py-4 bg-red-600 active:bg-red-700 rounded-xl font-bold text-white transition-colors shadow-lg shadow-red-500/20"
              >
                Quit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bust Overlay (X01 Only) */}
      {showBust && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-red-950/90 backdrop-blur-md p-6">
          <div className="bg-slate-900 w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden flex flex-col border-4 border-red-600 text-center p-8 animate-pop-in">
            <div className="flex justify-center mb-6 text-red-500">
              <AlertCircle size={80} />
            </div>
            <h2 className="text-6xl font-black text-white mb-2 tracking-widest">BUST!</h2>
            <p className="text-slate-400 text-xl mb-8">Score remains {scores[activePlayer]}</p>

            <button
              onClick={acknowledgeBust}
              className="w-full py-6 bg-red-600 active:bg-red-700 rounded-2xl font-black text-2xl uppercase tracking-widest shadow-xl transition-transform active:scale-95 flex items-center justify-center gap-3"
            >
              Pass to P{((activePlayer + 1) % playerCount) + 1}
              <ArrowRight size={28} />
            </button>
          </div>
        </div>
      )}

      {/* Winner Overlay */}
      {winner !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-yellow-900/95 backdrop-blur-md p-6">
          <div className="bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col border-4 border-yellow-500 text-center p-8 animate-pop-in">
            <div className="flex justify-center mb-6 text-yellow-500 animate-pulse">
              <Trophy size={100} />
            </div>
            <h2 className="text-5xl font-black text-white mb-2 tracking-tight">PLAYER {winner + 1}</h2>
            <h3 className="text-4xl font-bold text-yellow-500 mb-10 tracking-widest">WINS!</h3>

            <div className="flex flex-col gap-4">
              <button
                onClick={playAgain}
                className="w-full py-6 bg-yellow-600 active:bg-yellow-700 rounded-2xl font-black text-2xl uppercase tracking-widest shadow-xl transition-transform active:scale-95 flex justify-center items-center gap-3 text-slate-900"
              >
                <RotateCcw size={28} />
                Play Again
              </button>
              <button
                onClick={returnToMenu}
                className="w-full py-6 bg-slate-800 active:bg-slate-700 rounded-2xl font-black text-xl uppercase tracking-widest shadow-xl transition-transform active:scale-95 flex justify-center items-center gap-3 text-slate-300"
              >
                <Home size={28} />
                Main Menu
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default App;