import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Music, Sliders, Sparkles } from 'lucide-react';
import { soundManager } from '../utils/audio';
import { getHighFxSetting, setHighFxSetting } from '../utils/fxSettings';

export default function AudioControls() {
  const [open, setOpen] = useState(false);
  const [muted, setMuted] = useState(false);
  const [sfxVol, setSfxVol] = useState(70);
  const [bgmVol, setBgmVol] = useState(30);
  const [bgmPlaying, setBgmPlaying] = useState(false);
  const [highFx, setHighFx] = useState(true);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const s = soundManager.getSettings();
    setMuted(s.isMuted);
    setSfxVol(Math.round(s.sfxVolume * 100));
    setBgmVol(Math.round(s.bgmVolume * 100));
    setBgmPlaying(s.bgmPlaying);
    setHighFx(getHighFxSetting());

    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMuteToggle = () => {
    const next = !muted;
    setMuted(next);
    soundManager.setMuted(next);
  };

  const handleSfxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseInt(e.target.value, 10);
    setSfxVol(v);
    soundManager.setSfxVolume(v / 100);
  };

  const handleBgmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseInt(e.target.value, 10);
    setBgmVol(v);
    soundManager.setBgmVolume(v / 100);
  };

  const handleBgmToggle = () => {
    const isPlaying = soundManager.toggleBgm();
    setBgmPlaying(isPlaying);
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(!open)}
        className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-lg border border-zinc-700 transition-colors flex items-center gap-1.5 text-base"
        title="ตั้งค่าเสียง"
      >
        {muted ? <VolumeX size={18} className="text-red-400" /> : <Volume2 size={18} className="text-amber-400" />}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-72 md:w-80 bg-zinc-900/98 backdrop-blur-md border border-zinc-700 rounded-xl p-4 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 text-base space-y-3.5">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
            <span className="font-bold text-zinc-200 flex items-center gap-1.5">
              <Sliders size={16} className="text-amber-400" /> ตั้งค่าเสียง (Audio)
            </span>
            <button
              onClick={handleMuteToggle}
              className={`px-2.5 py-1 rounded-md text-sm font-bold uppercase transition-colors ${
                muted ? "bg-red-900/50 text-red-300 border border-red-700" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
              }`}
            >
              {muted ? "ปิดเสียงอยู่" : "เปิดเสียง"}
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-zinc-300 mb-1">
                <span>เสียงเอฟเฟกต์ (SFX)</span>
                <span className="font-mono text-amber-400 font-bold">{sfxVol}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={sfxVol}
                onChange={handleSfxChange}
                disabled={muted}
                className="w-full accent-amber-500 cursor-pointer disabled:opacity-40 h-2"
              />
            </div>

            <div>
              <div className="flex justify-between text-zinc-300 mb-1 items-center">
                <span className="flex items-center gap-1">
                  <Music size={15} className={bgmPlaying ? "text-green-400" : "text-zinc-500"} />
                  เพลงพื้นหลัง (Ambient)
                </span>
                <button
                  onClick={handleBgmToggle}
                  className={`text-xs px-2 py-0.5 rounded font-bold transition-colors ${
                    bgmPlaying ? "bg-green-900/60 text-green-300" : "bg-zinc-800 text-zinc-400"
                  }`}
                >
                  {bgmPlaying ? "กำลังเล่น" : "ปิด"}
                </button>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={bgmVol}
                onChange={handleBgmChange}
                disabled={muted}
                className="w-full accent-amber-500 cursor-pointer disabled:opacity-40 h-2"
              />
            </div>

            {/* Visual FX Mode Toggle */}
            <div className="pt-2 border-t border-zinc-800 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-zinc-300">
                <Sparkles size={15} className={highFx ? "text-cyan-400" : "text-zinc-500"} />
                เอฟเฟกต์ภาพสูง (High FX)
              </span>
              <button
                type="button"
                onClick={() => {
                  const next = !highFx;
                  setHighFx(next);
                  setHighFxSetting(next);
                }}
                className={`w-10 h-6 rounded-full transition-colors relative flex items-center px-0.5 cursor-pointer ${
                  highFx ? "bg-cyan-600" : "bg-zinc-800"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    highFx ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}