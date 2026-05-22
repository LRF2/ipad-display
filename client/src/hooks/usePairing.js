import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { pairWithPin } from "../api";
import { TOKEN_KEY } from "../constants";


export function usePairing() {
  const initialToken = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get("token");
    if (urlToken) {
      window.localStorage.setItem(TOKEN_KEY, urlToken);
      return urlToken;
    }
    return window.localStorage.getItem(TOKEN_KEY) || "";
  }, []);

  const initialPin = useMemo(
    () => (new URLSearchParams(window.location.search).get("pin") || "").replace(/\D/g, "").slice(0, 6),
    []
  );

  const [token, setToken] = useState(initialToken);
  const [pin, setPin] = useState(initialPin);
  const [pairingError, setPairingError] = useState("");
  const [pairingBusy, setPairingBusy] = useState(false);
  const autoPairAttemptedRef = useRef(false);

  const clearSavedToken = useCallback(() => {
    window.localStorage.removeItem(TOKEN_KEY);
    setToken("");
  }, []);

  const submitPairing = useCallback(
    (pinToSubmit = pin) => {
      if (pinToSubmit.length !== 6 || pairingBusy) return Promise.resolve();
      setPairingBusy(true);
      setPairingError("");

      return pairWithPin(pinToSubmit)
        .then((data) => {
          window.localStorage.setItem(TOKEN_KEY, data.token);
          setToken(data.token);
          setPin("");
          return data;
        })
        .catch(() => {
          setPairingError("Pairing failed. Check the PIN printed by the server.");
        })
        .finally(() => setPairingBusy(false));
    },
    [pairingBusy, pin]
  );

  useEffect(() => {
    if (!token && initialPin.length === 6 && !autoPairAttemptedRef.current) {
      autoPairAttemptedRef.current = true;
      submitPairing(initialPin);
    }
  }, [initialPin, submitPairing, token]);

  const pairDevice = useCallback(
    (event) => {
      event.preventDefault();
      submitPairing();
    },
    [submitPairing]
  );

  return {
    token,
    pin,
    setPin,
    pairingError,
    pairingBusy,
    pairDevice,
    clearSavedToken,
  };
}
