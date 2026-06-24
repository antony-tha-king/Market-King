"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { getLocalStorageItem, setLocalStorageItem } from "@/lib/utils";

export interface DerivAccountInfo {
  loginid: string;
  email: string;
  currency: string;
  balance: number;
}

const ENDPOINTS = [
  "wss://ws.derivws.com/websockets/v3",
  "wss://ws.binaryws.com/websockets/v3"
];

export function useDerivApi() {
  const [token, setToken] = useState<string>("");
  const [appId, setAppId] = useState<string>("1089");
  const [syncEnabled, setSyncEnabled] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [accountInfo, setAccountInfo] = useState<DerivAccountInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const keepAliveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const endpointIndexRef = useRef<number>(0);

  // Initialize values from localStorage on mount
  useEffect(() => {
    setToken(getLocalStorageItem<string>("deriv_api_token", ""));
    setAppId(getLocalStorageItem<string>("deriv_app_id", "1089"));
    setSyncEnabled(false); // Force disabled as Deriv Sync is removed
  }, []);

  const disconnect = useCallback(() => {
    if (keepAliveIntervalRef.current) {
      clearInterval(keepAliveIntervalRef.current);
      keepAliveIntervalRef.current = null;
    }
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
    setIsAuthorized(false);
    setBalance(null);
    setAccountInfo(null);
  }, []);

  const connectToEndpoint = useCallback((apiToken: string, apiAppId: string, endpointIndex: number) => {
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
    }

    const baseEndpoint = ENDPOINTS[endpointIndex % ENDPOINTS.length];
    const wsUrl = `${baseEndpoint}?app_id=${apiAppId}`;
    
    console.log(`Connecting to Deriv WebSocket endpoint: ${wsUrl}`);

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      // Set a 4-second connection timeout to trigger fallback if connection hangs
      connectionTimeoutRef.current = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          console.warn(`Connection to ${baseEndpoint} timed out. Trying fallback...`);
          ws.close();
          // Try next endpoint
          const nextIndex = endpointIndex + 1;
          if (nextIndex < ENDPOINTS.length) {
            connectToEndpoint(apiToken, apiAppId, nextIndex);
          } else {
            setError("Connection timed out. Please check your network or verify your App ID/API Token scopes.");
          }
        }
      }, 4000);

      ws.onopen = () => {
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
        }
        setIsConnected(true);
        setError(null);
        // Step 1: Send authorization request immediately
        ws.send(JSON.stringify({ authorize: apiToken }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // Handle Error Responses
          if (data.error) {
            setError(data.error.message || "An error occurred with Deriv API.");
            if (data.msg_type === "authorize") {
              setIsAuthorized(false);
              disconnect();
            }
            return;
          }

          // Step 2: Handle Authorization Response
          if (data.msg_type === "authorize" && data.authorize) {
            setIsAuthorized(true);
            const auth = data.authorize;
            setAccountInfo({
              loginid: auth.loginid,
              email: auth.email,
              currency: auth.currency,
              balance: parseFloat(auth.balance)
            });
            setBalance(parseFloat(auth.balance));

            // Save valid configs
            setLocalStorageItem("deriv_api_token", apiToken);
            setLocalStorageItem("deriv_app_id", apiAppId);
            setToken(apiToken);
            setAppId(apiAppId);

            // Step 3: Subscribe to live balance updates
            ws.send(JSON.stringify({ balance: 1, subscribe: 1 }));

            // Start ping keep-alive every 30s to keep connection alive
            if (keepAliveIntervalRef.current) clearInterval(keepAliveIntervalRef.current);
            keepAliveIntervalRef.current = setInterval(() => {
              if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({ ping: 1 }));
              }
            }, 30000);
          }

          // Step 4: Handle Live Balance Updates
          if (data.msg_type === "balance" && data.balance) {
            const newBalance = parseFloat(data.balance.balance);
            setBalance(newBalance);
            if (accountInfo) {
              setAccountInfo(prev => prev ? { ...prev, balance: newBalance } : null);
            }
          }

        } catch (e) {
          console.error("Error parsing Deriv WebSocket message", e);
        }
      };

      ws.onerror = (e) => {
        console.error(`WebSocket error on ${baseEndpoint}:`, e);
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
        }
        
        // Try fallback endpoint immediately on error
        const nextIndex = endpointIndex + 1;
        if (nextIndex < ENDPOINTS.length) {
          console.log("Switching to fallback endpoint...");
          connectToEndpoint(apiToken, apiAppId, nextIndex);
        } else {
          setError("Connection failed. Deriv blocks connections from custom ports like :9002 unless you register and input your custom App ID in the developers dashboard.");
          disconnect();
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        setIsAuthorized(false);
      };

    } catch (e) {
      console.error("Failed to establish Deriv WebSocket connection", e);
      setError("Failed to create connection socket.");
    }
  }, [disconnect, accountInfo]);

  const connect = useCallback((apiToken: string, apiAppId: string = "1089") => {
    disconnect();
    endpointIndexRef.current = 0;
    connectToEndpoint(apiToken, apiAppId, 0);
  }, [disconnect, connectToEndpoint]);

  // Connect automatically if sync is enabled and a token exists
  useEffect(() => {
    disconnect();
  }, [syncEnabled, token, appId, connect, disconnect]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (keepAliveIntervalRef.current) clearInterval(keepAliveIntervalRef.current);
      if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  const toggleSync = useCallback((enabled: boolean) => {
    setSyncEnabled(enabled);
    setLocalStorageItem("deriv_sync_enabled", enabled);
    if (!enabled) {
      disconnect();
    } else if (token && appId) {
      connect(token, appId);
    }
  }, [token, appId, connect, disconnect]);

  const removeToken = useCallback(() => {
    setLocalStorageItem("deriv_api_token", "");
    setLocalStorageItem("deriv_app_id", "1089");
    setToken("");
    setAppId("1089");
    toggleSync(false);
    disconnect();
  }, [toggleSync, disconnect]);

  return {
    token,
    appId,
    syncEnabled,
    isConnected,
    isAuthorized,
    balance,
    accountInfo,
    error,
    connect,
    disconnect,
    toggleSync,
    removeToken
  };
}
