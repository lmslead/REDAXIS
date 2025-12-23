import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./ScreenshotShield.css";

const WATERMARK_ROWS = 12;
const TIMESTAMP_REFRESH_MS = 30_000;
const FLASH_DURATION_MS = 700;

const buildUserLabel = (user) => {
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.name;
  const identifier = user?.employeeId || user?.email || user?.personalEmail || user?._id;
  return {
    name: (fullName || "Authorized Personnel").toUpperCase(),
    identifier: (identifier || "RESTRICTED").toUpperCase(),
  };
};

const ScreenshotShield = ({ user }) => {
  const [timestamp, setTimestamp] = useState(() => new Date());
  const [shieldFlash, setShieldFlash] = useState(false);
  const flashTimeoutRef = useRef();

  useEffect(() => {
    const interval = window.setInterval(() => setTimestamp(new Date()), TIMESTAMP_REFRESH_MS);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    return () => {
      if (flashTimeoutRef.current) {
        window.clearTimeout(flashTimeoutRef.current);
      }
    };
  }, []);

  const triggerShieldResponse = useCallback(() => {
    if (flashTimeoutRef.current) {
      window.clearTimeout(flashTimeoutRef.current);
    }
    setShieldFlash(true);
    flashTimeoutRef.current = window.setTimeout(() => setShieldFlash(false), FLASH_DURATION_MS);

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText("Screenshot capture is disabled for this workspace.").catch(() => undefined);
    }
  }, []);

  const handleKeyDown = useCallback(
    (event) => {
      const key = (event.key || "").toLowerCase();
      const isPrintScreen = event.key === "PrintScreen";
      const isBlockedCombo =
        ((event.ctrlKey || event.metaKey) && ["p"].includes(key)) || // Ctrl/Cmd + P
        ((event.ctrlKey || event.metaKey) && event.shiftKey && ["s"].includes(key)) || // Ctrl/Cmd + Shift + S (cross-platform)
        (event.metaKey && event.shiftKey && ["3", "4", "5"].includes(key)) || // Cmd + Shift + 3/4/5 (macOS specific)
        ((event.code === 'OSLeft' || event.code === 'OSRight') && event.shiftKey && key === 's'); // Windows Key + Shift + S (Windows specific)

      if (isPrintScreen || isBlockedCombo) {
        event.preventDefault();
        event.stopPropagation();
        triggerShieldResponse();
      }
    },
    [triggerShieldResponse]
  );

  const handleKeyUp = useCallback(
    (event) => {
      if (event.key === "PrintScreen") {
        event.preventDefault();
        event.stopPropagation();
        triggerShieldResponse();
      }
    },
    [triggerShieldResponse]
  );

  const preventContextMenu = useCallback((event) => {
    event.preventDefault();
  }, []);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown, true);
    document.addEventListener("keyup", handleKeyUp, true);
    document.addEventListener("contextmenu", preventContextMenu, true);

    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      document.removeEventListener("keyup", handleKeyUp, true);
      document.removeEventListener("contextmenu", preventContextMenu, true);
    };
  }, [handleKeyDown, handleKeyUp, preventContextMenu]);

  const { name, identifier } = useMemo(() => buildUserLabel(user), [user]);
  const watermarkLine = useMemo(() => {
    return `${name} • ${identifier} • ${timestamp.toLocaleString()}`;
  }, [name, identifier, timestamp]);

  const watermarkRows = useMemo(
    () => Array.from({ length: WATERMARK_ROWS }, (_, index) => `${watermarkLine} • REDAXIS HRMS • NO SCREENSHOTS ${index + 1}`),
    [watermarkLine]
  );

  return (
    <div
      className={`screenshot-shield${shieldFlash ? " screenshot-shield--flash" : ""}`}
      aria-hidden="true"
    >
      <div className="screenshot-shield__watermark">
        {watermarkRows.map((row, index) => (
          <span key={`shield-row-${index}`}>{row}</span>
        ))}
      </div>
    </div>
  );
};

export default ScreenshotShield;
