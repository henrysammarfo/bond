import { createContext, useContext, useState, type ReactNode } from "react";

type DemoState = { pendingFinalized: boolean; finalize: () => void; notifications: boolean; setNotifications: (value: boolean) => void };
const DemoContext = createContext<DemoState | undefined>(undefined);

export function DemoProvider({ children }: { children: ReactNode }) {
  const [pendingFinalized, setPendingFinalized] = useState(false);
  const [notifications, setNotifications] = useState(true);
  return <DemoContext.Provider value={{ pendingFinalized, finalize: () => setPendingFinalized(true), notifications, setNotifications }}>{children}</DemoContext.Provider>;
}

export function useDemo() {
  const context = useContext(DemoContext);
  if (!context) throw new Error("useDemo must be used within DemoProvider");
  return context;
}