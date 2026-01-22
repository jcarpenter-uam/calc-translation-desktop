import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  BiMicrophone,
  BiMicrophoneOff,
  BiPowerOff,
  BiLink,
  BiCheck,
  BiQuestionMark,
  BiX,
  BiDesktop,
  BiChevronUp,
  BiLayer,
} from "react-icons/bi";

export default function HostAudioSender({
  isAudioInitialized,
  isMuted,
  status,
  canvasRef,
  startAudio,
  toggleMute,
  disconnectSession,
  joinUrl,
  inputDevices = [],
}) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showDeviceMenu, setShowDeviceMenu] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowDeviceMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setShowHelp(false);
        setShowDeviceMenu(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showHelp, showDeviceMenu]);

  const handleCopy = async () => {
    if (!joinUrl) return;

    if (window.electronAPI && window.electronAPI.writeToClipboard) {
      await window.electronAPI.writeToClipboard(joinUrl);
    } else {
      await navigator.clipboard.writeText(joinUrl);
    }

    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDeviceSelect = (deviceId) => {
    setShowDeviceMenu(false);
    startAudio(deviceId);
  };

  if (status === "error") {
    return (
      <div className="text-red-500 text-sm font-bold text-center mt-4">
        {t("audio_connection_error")}
      </div>
    );
  }

  if (status === "disconnected") {
    return null;
  }

  if (!isAudioInitialized) {
    return (
      <div
        className="fixed bottom-[24px] left-1/2 transform -translate-x-1/2 z-[100]"
        ref={menuRef}
      >
        {/* Device Selection Menu */}
        {showDeviceMenu && (
          <div className="absolute bottom-full mb-3 left-1/2 transform -translate-x-1/2 w-64 bg-white dark:bg-zinc-800 rounded-xl shadow-2xl border border-zinc-200 dark:border-zinc-700 overflow-hidden animate-in fade-in slide-in-from-bottom-2">
            <div className="p-2 space-y-1">
              <div className="px-3 py-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Select Audio Source
              </div>

              {/* System Audio Option */}
              <button
                onClick={() => handleDeviceSelect("system")}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700/50 rounded-lg transition-colors text-left"
              >
                <BiDesktop className="text-blue-500" size={18} />
                <span>System Audio Only</span>
              </button>

              {/* Both Option */}
              <button
                onClick={() => handleDeviceSelect("both")}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700/50 rounded-lg transition-colors text-left"
              >
                <BiLayer className="text-purple-500" size={18} />
                <span>System + Microphone</span>
              </button>

              <div className="h-px bg-zinc-100 dark:bg-zinc-700 my-1" />

              {/* Microphone Options */}
              {inputDevices.length === 0 ? (
                <button
                  onClick={() => handleDeviceSelect(undefined)}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700/50 rounded-lg transition-colors text-left"
                >
                  <BiMicrophone className="text-green-500" size={18} />
                  <span>Default Microphone</span>
                </button>
              ) : (
                inputDevices.map((device) => (
                  <button
                    key={device.deviceId}
                    onClick={() => handleDeviceSelect(device.deviceId)}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700/50 rounded-lg transition-colors text-left truncate"
                  >
                    <BiMicrophone className="text-zinc-400" size={18} />
                    <span className="truncate">
                      {device.label ||
                        `Microphone ${device.deviceId.slice(0, 4)}...`}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        <div className="flex items-center bg-white dark:bg-zinc-800 p-[4px] rounded-full shadow-xl border border-zinc-200 dark:border-zinc-700">
          <button
            onClick={() => setShowDeviceMenu(!showDeviceMenu)}
            disabled={status !== "connected"}
            className={`flex items-center gap-2 cursor-pointer relative overflow-hidden px-3 py-1.5 rounded-full transition-colors ${
              status !== "connected"
                ? "text-zinc-400 cursor-not-allowed"
                : "text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20"
            }`}
          >
            {showDeviceMenu ? (
              <BiChevronUp size={14} />
            ) : (
              <BiMicrophone size={14} />
            )}
            <span className="text-xs font-bold uppercase tracking-wide whitespace-nowrap">
              {t("join_audio")}
            </span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`fixed bottom-0 left-1/2 transform -translate-x-1/2 z-[100] flex flex-col items-center gap-1 pb-6 px-8 transition-transform duration-500 ease-[cubic-bezier(0.19,1,0.22,1)] ${
          isHovered ? "translate-y-0" : "translate-y-[calc(100%-24px)]"
        }`}
      >
        <div
          className={`bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm rounded-t-lg px-6 pt-0.5 pb-1 shadow-sm border-t border-x border-zinc-100 dark:border-zinc-700/50 transition-opacity duration-500 ease-[cubic-bezier(0.19,1,0.22,1)] ${
            isHovered ? "opacity-0" : "opacity-100"
          }`}
        >
          <BiChevronUp size={24} className="text-zinc-500 dark:text-zinc-400" />
        </div>

        {/* Audio Controls Row */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-[4px] bg-white dark:bg-zinc-800 p-[4px] rounded-full shadow-xl border border-zinc-200 dark:border-zinc-700">
            {/* Mute/Unmute Button */}
            <button
              onClick={toggleMute}
              className={`cursor-pointer relative overflow-hidden p-[6px] rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                isMuted
                  ? "text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                  : "text-green-600 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-700"
              }`}
              title={isMuted ? t("unmute") : t("mute")}
            >
              <canvas
                ref={canvasRef}
                width={32}
                height={32}
                className="absolute inset-0 w-full h-full opacity-30 pointer-events-none"
              />
              <div className="relative z-10">
                {isMuted ? (
                  <BiMicrophoneOff size={14} />
                ) : (
                  <BiMicrophone size={14} />
                )}
              </div>
            </button>

            <div className="w-[1px] h-[16px] bg-zinc-200 dark:bg-zinc-700 mx-1"></div>

            {/* Copy Join Link Button */}
            <button
              onClick={handleCopy}
              className={`cursor-pointer p-[6px] rounded-full transition-colors ${
                copied
                  ? "text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400"
                  : "text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-700"
              }`}
              title={t("copy_join_link")}
            >
              {copied ? <BiCheck size={14} /> : <BiLink size={14} />}
            </button>

            <div className="w-[1px] h-[16px] bg-zinc-200 dark:bg-zinc-700 mx-1"></div>

            {/* End Broadcast Button */}
            <button
              onClick={disconnectSession}
              className="cursor-pointer p-[6px] hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors text-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              title={t("end_broadcast")}
            >
              <BiPowerOff size={14} />
            </button>
          </div>

          {/* Help Button */}
          <button
            onClick={() => setShowHelp(true)}
            className="cursor-pointer flex items-center justify-center bg-white dark:bg-zinc-800 w-[34px] h-[34px] rounded-full shadow-xl border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
            title={t("help")}
          >
            <BiQuestionMark size={16} />
          </button>
        </div>
      </div>

      {showHelp && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl max-w-sm w-full border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-100 uppercase tracking-wider">
                {t("host_controls")}
              </h3>
              <button
                onClick={() => setShowHelp(false)}
                className="cursor-pointer p-1 hover:bg-red-100 dark:hover:bg-red-800 rounded-full text-zinc-500 transition-colors"
              >
                <BiX size={20} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-full text-green-600 dark:text-green-400">
                  <BiMicrophone size={18} />
                </div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {t("mute_toggle")}
                </p>
              </div>

              <div className="flex items-center gap-4">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-full text-blue-600 dark:text-blue-400">
                  <BiLink size={18} />
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {t("copy_join_link")}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 whitespace-pre-line">
                    {t("copy_link_desc")}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-full text-red-500">
                  <BiPowerOff size={18} />
                </div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {t("end_broadcast")}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
