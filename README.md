# Brokerage-

import { useState, useEffect, useRef, createContext, useContext, useCallback } from "react";
import { Switch, Route, Router as WouterRouter, Link } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import NotFound from "@/pages/not-found";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { TrendingUp, Shield, BarChart2, ChevronRight, Menu, X, Star, MessageCircle, Copy, Check, Gift, Lock, Eye, EyeOff, Settings, LogOut, ExternalLink, RotateCcw, Save, Trash2, Plus, User, UserPlus, Wallet, ArrowDownCircle, ArrowUpCircle, Clock, DollarSign, Activity, Bell } from "lucide-react";
import { SiTelegram, SiTradingview, SiBinance, SiVisa, SiMastercard, SiBitcoin, SiEthereum, SiTether } from "react-icons/si";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const queryClient = new QueryClient();

// ==========================================
// Telegram Bot Config
// Fill in your own values from @BotFather
// ==========================================
const TELEGRAM_BOT_TOKEN = "YOUR_BOT_TOKEN_HERE";   // e.g. "7123456789:AAFxxxxxxxxxxxxxxxx"
const TELEGRAM_CHAT_ID   = "YOUR_CHAT_ID_HERE";     // e.g. "-1001234567890"

// ==========================================
// Auth System
// ==========================================
type Transaction = {
  id: string;
  type: "deposit" | "withdrawal";
  amount: number;
  status: "completed" | "pending";
  date: string;
  note?: string;
};

type AuthUser = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  plan: string;
  balance: number;
  transactions: Transaction[];
};

type Notification = {
  id: string;
  type: "deposit" | "withdrawal" | "info";
  title: string;
  message: string;
};

type AuthCtx = {
  user: AuthUser | null;
  login: (email: string, password: string) => boolean;
  register: (name: string, email: string, password: string, plan: string) => boolean;
  logout: () => void;
  addTransaction: (type: "deposit" | "withdrawal", amount: number, note?: string) => void;
  notifications: Notification[];
  pushNotification: (n: Omit<Notification, "id">) => void;
};

const AuthContext = createContext<AuthCtx | null>(null);
const USERS_KEY = "califox_users";
const SESSION_KEY = "califox_session";

function simpleHash(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  return h.toString(36);
}

function loadUsers(): AuthUser[] {
  try { return JSON.parse(localStorage.getItem(USERS_KEY) ?? "[]"); } catch { return []; }
}
function saveUsers(users: AuthUser[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}
function loadSession(): AuthUser | null {
  try { const id = sessionStorage.getItem(SESSION_KEY); if (!id) return null;
    return loadUsers().find(u => u.id === id) ?? null; } catch { return null; }
}

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(loadSession);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const pushNotification = useCallback((n: Omit<Notification, "id">) => {
    const id = Math.random().toString(36).slice(2);
    setNotifications(prev => [...prev, { ...n, id }]);
    setTimeout(() => setNotifications(prev => prev.filter(x => x.id !== id)), 6000);
  }, []);

  const login = useCallback((email: string, password: string) => {
    const users = loadUsers();
    const found = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.passwordHash === simpleHash(password));
    if (!found) return false;
    sessionStorage.setItem(SESSION_KEY, found.id);
    setUser(found);
    pushNotification({ type: "info", title: "Welcome back!", message: `Logged in as ${found.name}` });
    return true;
  }, [pushNotification]);

  const register = useCallback((name: string, email: string, password: string, plan: string) => {
    const users = loadUsers();
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) return false;
    const newUser: AuthUser = {
      id: Math.random().toString(36).slice(2),
      name, email, passwordHash: simpleHash(password), plan,
      balance: 0,
      transactions: [],
    };
    saveUsers([...users, newUser]);
    sessionStorage.setItem(SESSION_KEY, newUser.id);
    setUser(newUser);
    pushNotification({ type: "info", title: "Account created!", message: `Welcome to Califox Global, ${name}!` });
    return true;
  }, [pushNotification]);

  const logout = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY);
    setUser(null);
  }, []);

  const addTransaction = useCallback((type: "deposit" | "withdrawal", amount: number, note?: string) => {
    if (!user) return;
    const tx: Transaction = {
      id: Math.random().toString(36).slice(2),
      type, amount, note,
      status: "completed",
      date: new Date().toISOString(),
    };
    const newBalance = type === "deposit" ? user.balance + amount : Math.max(0, user.balance - amount);
    const updated: AuthUser = { ...user, balance: newBalance, transactions: [tx, ...user.transactions] };
    const users = loadUsers().map(u => u.id === user.id ? updated : u);
    saveUsers(users);
    setUser(updated);
    pushNotification(
      type === "deposit"
        ? { type: "deposit", title: "Deposit Successful!", message: `$${amount.toLocaleString()} has been added to your account.` }
        : { type: "withdrawal", title: "Withdrawal Initiated!", message: `$${amount.toLocaleString()} withdrawal is being processed.` }
    );
  }, [user, pushNotification]);

  return (
    <AuthContext.Provider value={{ user, login, register, logout, addTransaction, notifications, pushNotification }}>
      {children}
      <NotificationStack notifications={notifications} />
    </AuthContext.Provider>
  );
}

function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

// ==========================================
// Notification Stack
// ==========================================
function NotificationStack({ notifications }: { notifications: Notification[] }) {
  const icons: Record<Notification["type"], React.ReactNode> = {
    deposit: <ArrowDownCircle className="h-5 w-5 text-emerald-400" />,
    withdrawal: <ArrowUpCircle className="h-5 w-5 text-amber-400" />,
    info: <Bell className="h-5 w-5 text-primary" />,
  };
  const colors: Record<Notification["type"], string> = {
    deposit: "border-emerald-500/30 bg-emerald-500/10",
    withdrawal: "border-amber-500/30 bg-amber-500/10",
    info: "border-primary/30 bg-primary/10",
  };
  return (
    <div className="fixed top-24 right-4 z-[200] flex flex-col gap-3 pointer-events-none">
      <AnimatePresence mode="sync">
        {notifications.map(n => (
          <motion.div
            key={n.id}
            initial={{ opacity: 0, x: 80, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 80, scale: 0.9 }}
            transition={{ duration: 0.3 }}
            className={`flex items-start gap-3 rounded-xl border ${colors[n.type]} backdrop-blur-sm px-4 py-3 shadow-xl max-w-xs pointer-events-auto`}
          >
            <div className="shrink-0 mt-0.5">{icons[n.type]}</div>
            <div>
              <p className="text-sm font-bold text-foreground">{n.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ==========================================
// Auth Modal (Login / Register)
// ==========================================
function AuthModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { login, register } = useAuth();
  const { plans } = usePlans();
  const [tab, setTab] = useState<"login" | "register">("login");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");

  const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });
  const registerSchema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(6),
    plan: z.string().min(1),
  });

  const loginForm = useForm({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" } });
  const regForm = useForm({ resolver: zodResolver(registerSchema), defaultValues: { name: "", email: "", password: "", plan: plans[0]?.name ?? "Starter" } });

  const onLogin = (v: z.infer<typeof loginSchema>) => {
    const ok = login(v.email, v.password);
    if (!ok) setError("Invalid email or password."); else { setError(""); onClose(); }
  };
  const onRegister = (v: z.infer<typeof registerSchema>) => {
    const ok = register(v.name, v.email, v.password, v.plan);
    if (!ok) setError("An account with this email already exists."); else { setError(""); onClose(); }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-6 z-10"
      >
        <button onClick={onClose} className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 mb-3">
            {tab === "login" ? <Lock className="h-5 w-5 text-primary" /> : <UserPlus className="h-5 w-5 text-primary" />}
          </div>
          <h2 className="text-xl font-display font-bold text-foreground">{tab === "login" ? "Sign in to your account" : "Create your account"}</h2>
        </div>
        {/* Tabs */}
        <div className="flex rounded-lg border border-border p-1 mb-6 gap-1">
          {(["login", "register"] as const).map(t => (
            <button key={t} onClick={() => { setTab(t); setError(""); }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              {t === "login" ? "Sign In" : "Register"}
            </button>
          ))}
        </div>
        {error && <p className="text-xs text-red-400 mb-4 flex items-center gap-1.5"><X className="h-3.5 w-3.5" />{error}</p>}

        {tab === "login" ? (
          <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Email</label>
              <input {...loginForm.register("email")} placeholder="you@example.com" autoComplete="email"
                className="w-full rounded-lg border border-border bg-background text-foreground px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground" />
            </div>
            <div className="relative">
              <label className="text-xs text-muted-foreground mb-1 block">Password</label>
              <input {...loginForm.register("password")} type={showPw ? "text" : "password"} placeholder="••••••••" autoComplete="current-password"
                className="w-full rounded-lg border border-border bg-background text-foreground px-3 py-2.5 pr-10 text-sm outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground" />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 bottom-2.5 text-muted-foreground hover:text-foreground" tabIndex={-1}>
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <Button type="submit" className="w-full">Sign In</Button>
          </form>
        ) : (
          <form onSubmit={regForm.handleSubmit(onRegister)} className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Full Name</label>
              <input {...regForm.register("name")} placeholder="John Doe" autoComplete="name"
                className="w-full rounded-lg border border-border bg-background text-foreground px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Email</label>
              <input {...regForm.register("email")} placeholder="you@example.com" autoComplete="email"
                className="w-full rounded-lg border border-border bg-background text-foreground px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground" />
            </div>
            <div className="relative">
              <label className="text-xs text-muted-foreground mb-1 block">Password</label>
              <input {...regForm.register("password")} type={showPw ? "text" : "password"} placeholder="Min. 6 characters" autoComplete="new-password"
                className="w-full rounded-lg border border-border bg-background text-foreground px-3 py-2.5 pr-10 text-sm outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground" />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 bottom-2.5 text-muted-foreground hover:text-foreground" tabIndex={-1}>
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Investment Plan</label>
              <select {...regForm.register("plan")}
                className="w-full rounded-lg border border-border bg-background text-foreground px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30">
                {plans.map(p => <option key={p.name} value={p.name}>{p.name} Plan — {p.minDeposit} min.</option>)}
              </select>
            </div>
            <Button type="submit" className="w-full">Create Account</Button>
          </form>
        )}
        <p className="text-center text-xs text-muted-foreground mt-4">
          {tab === "login" ? "Don't have an account? " : "Already have an account? "}
          <button onClick={() => { setTab(tab === "login" ? "register" : "login"); setError(""); }} className="text-primary hover:underline font-medium">
            {tab === "login" ? "Register" : "Sign in"}
          </button>
        </p>
      </motion.div>
    </div>
  );
}

// ==========================================
// User Dashboard Panel
// ==========================================
function UserDashboard({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, logout, addTransaction } = useAuth();
  const [view, setView] = useState<"home" | "deposit" | "withdraw">("home");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleAction = (type: "deposit" | "withdrawal") => {
    const val = parseFloat(amount.replace(/,/g, ""));
    if (!val || val <= 0) return;
    setSubmitting(true);
    setTimeout(() => {
      addTransaction(type, val, note || undefined);
      setAmount("");
      setNote("");
      setSubmitting(false);
      setView("home");
    }, 1200);
  };

  if (!open || !user) return null;

  return (
    <div className="fixed inset-0 z-[150] flex justify-end">
      <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}
        className="relative w-full max-w-sm bg-card border-l border-border h-full overflow-y-auto shadow-2xl z-10 flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-xs font-bold text-primary">
              {user.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
            </div>
            <div>
              <p className="text-sm font-bold text-foreground leading-none">{user.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{user.plan} Plan</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex-1 px-5 py-5 space-y-5">
          {view === "home" && (
            <>
              {/* Balance Card */}
              <div className="rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 p-5">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Portfolio Balance</p>
                <p className="text-3xl font-display font-bold text-foreground">${user.balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                <p className="text-xs text-primary mt-2 font-medium">{user.plan} Plan · Active</p>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setView("deposit")}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-colors">
                  <ArrowDownCircle className="h-6 w-6 text-emerald-400" />
                  <span className="text-sm font-medium text-foreground">Deposit</span>
                </button>
                <button onClick={() => setView("withdraw")}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border hover:border-amber-500/40 hover:bg-amber-500/5 transition-colors">
                  <ArrowUpCircle className="h-6 w-6 text-amber-400" />
                  <span className="text-sm font-medium text-foreground">Withdraw</span>
                </button>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-border p-4">
                  <p className="text-xs text-muted-foreground mb-1">Total Deposits</p>
                  <p className="text-base font-bold text-emerald-400">
                    ${user.transactions.filter(t => t.type === "deposit").reduce((a, t) => a + t.amount, 0).toLocaleString()}
                  </p>
                </div>
                <div className="rounded-xl border border-border p-4">
                  <p className="text-xs text-muted-foreground mb-1">Total Withdrawn</p>
                  <p className="text-base font-bold text-amber-400">
                    ${user.transactions.filter(t => t.type === "withdrawal").reduce((a, t) => a + t.amount, 0).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Transactions */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Transaction History</p>
                {user.transactions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground/50">
                    <Activity className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-xs">No transactions yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {user.transactions.slice(0, 10).map(tx => (
                      <div key={tx.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
                        <div className="flex items-center gap-2.5">
                          {tx.type === "deposit"
                            ? <ArrowDownCircle className="h-4 w-4 text-emerald-400 shrink-0" />
                            : <ArrowUpCircle className="h-4 w-4 text-amber-400 shrink-0" />}
                          <div>
                            <p className="text-xs font-medium text-foreground capitalize">{tx.type}</p>
                            <p className="text-xs text-muted-foreground">{new Date(tx.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-bold ${tx.type === "deposit" ? "text-emerald-400" : "text-amber-400"}`}>
                            {tx.type === "deposit" ? "+" : "-"}${tx.amount.toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground capitalize">{tx.status}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {(view === "deposit" || view === "withdraw") && (
            <>
              <button onClick={() => setView("home")} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-2">
                <ChevronRight className="h-3.5 w-3.5 rotate-180" /> Back
              </button>
              <div className={`rounded-xl border p-4 flex items-center gap-3 ${view === "deposit" ? "border-emerald-500/30 bg-emerald-500/10" : "border-amber-500/30 bg-amber-500/10"}`}>
                {view === "deposit" ? <ArrowDownCircle className="h-6 w-6 text-emerald-400 shrink-0" /> : <ArrowUpCircle className="h-6 w-6 text-amber-400 shrink-0" />}
                <div>
                  <p className="text-sm font-bold text-foreground">{view === "deposit" ? "Make a Deposit" : "Request Withdrawal"}</p>
                  <p className="text-xs text-muted-foreground">{view === "deposit" ? "Funds credited to your account instantly." : "Processed within 24–48 hours."}</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Amount (USD)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="number" min="1" value={amount} onChange={e => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full rounded-lg border border-border bg-background text-foreground pl-8 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Note (optional)</label>
                  <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. BTC transfer"
                    className="w-full rounded-lg border border-border bg-background text-foreground px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground" />
                </div>
                <Button
                  className={`w-full ${view === "withdraw" ? "bg-amber-500 hover:bg-amber-600 text-white" : ""}`}
                  disabled={!amount || parseFloat(amount) <= 0 || submitting}
                  onClick={() => handleAction(view === "deposit" ? "deposit" : "withdrawal")}
                >
                  {submitting ? "Processing…" : view === "deposit" ? "Confirm Deposit" : "Submit Withdrawal"}
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-5 py-4">
          <button onClick={() => { logout(); onClose(); }}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-red-400 transition-colors w-full">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ==========================================
// Countdown Timer (Plans)
// ==========================================
function useCountdown() {
  const [time, setTime] = useState({ h: 0, m: 0, s: 0 });
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const midnight = new Date();
      midnight.setHours(24, 0, 0, 0);
      const diff = Math.floor((midnight.getTime() - now.getTime()) / 1000);
      setTime({ h: Math.floor(diff / 3600), m: Math.floor((diff % 3600) / 60), s: diff % 60 });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

function CountdownTimer() {
  const { h, m, s } = useCountdown();
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <div className="flex items-center justify-center gap-2 mb-10">
      <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/30 rounded-xl px-5 py-3">
        <Clock className="h-4 w-4 text-red-400 shrink-0" />
        <span className="text-sm text-muted-foreground">Limited offer ends in</span>
        <span className="text-sm font-bold text-red-400 font-mono tabular-nums">{pad(h)}:{pad(m)}:{pad(s)}</span>
      </div>
    </div>
  );
}

// ==========================================
// Ticker
// ==========================================
const trades = [
  { name: "Ahmed M.", amount: "+$450", pair: "EUR/USD" },
  { name: "Chioma T.", amount: "+$820", pair: "GBP/JPY" },
  { name: "Raj P.", amount: "+$1,200", pair: "Gold Futures" },
  { name: "Zainab A.", amount: "+$650", pair: "Bitcoin/USDT" },
  { name: "Carlos S.", amount: "+$900", pair: "USD/JPY" },
  { name: "Elena R.", amount: "+$310", pair: "ETH/USDT" },
];

function Ticker() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % trades.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-primary/10 border-b border-primary/20 overflow-hidden h-12 flex items-center relative z-40">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-4">
        <div className="text-xs font-bold text-primary uppercase tracking-wider whitespace-nowrap hidden sm:block">
          Live Trades
        </div>
        <div className="flex-1 relative h-full flex items-center overflow-hidden">
          <AnimatePresence mode="popLayout">
            <motion.div
              key={index}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ duration: 0.5, ease: "backOut" }}
              className="flex items-center gap-3 absolute whitespace-nowrap"
            >
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <span className="text-sm text-foreground/80">{trades[index].name}</span>
              <span className="text-sm font-bold text-primary">{trades[index].amount}</span>
              <span className="text-sm text-muted-foreground">{trades[index].pair}</span>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// NavBar
// ==========================================
function NavBar() {
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [dashOpen, setDashOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollTo = (id: string) => {
    setMobileMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      <header className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? "bg-background/90 backdrop-blur-md border-b border-border shadow-md" : "bg-transparent"}`}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex-shrink-0 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} data-testid="link-logo">
              <span className="text-2xl font-display font-bold text-foreground">Califox <span className="text-primary">Global</span></span>
            </div>
            <nav className="hidden md:flex items-center gap-8">
              {["About", "Services", "Plans", "Contact"].map(item => (
                <button key={item} onClick={() => scrollTo(item.toLowerCase())}
                  className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors uppercase tracking-wider"
                  data-testid={`link-nav-${item.toLowerCase()}`}>{item}</button>
              ))}
            </nav>
            <div className="hidden md:flex items-center gap-3">
              <Button asChild variant="outline" className="border-primary/50 text-primary hover:bg-primary/10" data-testid="button-chat-support-desktop">
                <a href="https://t.me/califoxglobalplatform" target="_blank" rel="noopener noreferrer">
                  <SiTelegram className="mr-2 h-4 w-4" /> Chat Support
                </a>
              </Button>
              {user ? (
                <button onClick={() => setDashOpen(true)}
                  className="flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 hover:bg-primary/20 transition-colors"
                  data-testid="button-user-dashboard">
                  <div className="w-6 h-6 rounded-full bg-primary/30 flex items-center justify-center text-xs font-bold text-primary">
                    {user.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                  </div>
                  <span className="text-sm font-medium text-foreground">{user.name.split(" ")[0]}</span>
                </button>
              ) : (
                <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => setAuthOpen(true)} data-testid="button-sign-in">
                  <User className="h-4 w-4" /> Sign In
                </Button>
              )}
            </div>
            <div className="md:hidden flex items-center gap-2">
              {user && (
                <button onClick={() => setDashOpen(true)} className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-xs font-bold text-primary">
                  {user.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                </button>
              )}
              <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} data-testid="button-mobile-menu">
                {mobileMenuOpen ? <X /> : <Menu />}
              </Button>
            </div>
          </div>
        </div>
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-card border-b border-border overflow-hidden">
              <div className="px-4 pt-2 pb-6 space-y-4 flex flex-col">
                {["About", "Services", "Plans", "Contact"].map(item => (
                  <button key={item} onClick={() => scrollTo(item.toLowerCase())}
                    className="text-left px-3 py-2 text-base font-medium text-foreground hover:text-primary hover:bg-muted/50 rounded-md"
                    data-testid={`link-mobile-nav-${item.toLowerCase()}`}>{item}</button>
                ))}
                {!user && (
                  <Button variant="outline" className="w-full gap-2" onClick={() => { setMobileMenuOpen(false); setAuthOpen(true); }}>
                    <User className="h-4 w-4" /> Sign In / Register
                  </Button>
                )}
                <Button asChild className="w-full" data-testid="button-chat-support-mobile">
                  <a href="https://t.me/califoxglobalplatform" target="_blank" rel="noopener noreferrer">
                    <SiTelegram className="mr-2 h-4 w-4" /> Chat Support
                  </a>
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <AnimatePresence>{authOpen && <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />}</AnimatePresence>
      <AnimatePresence>{dashOpen && <UserDashboard open={dashOpen} onClose={() => setDashOpen(false)} />}</AnimatePresence>
    </>
  );
}

// ==========================================
// Sections
// ==========================================
function Hero() {
  return (
    <section className="relative h-screen min-h-[600px] flex items-center justify-center pt-20 overflow-hidden">
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.pexels.com/photos/10628030/pexels-photo-10628030.png"
          alt="Trading Terminal"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-background/80 bg-gradient-to-t from-background via-background/60 to-background/30" />
      </div>
      <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8 text-center max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <span className="inline-block py-1 px-3 rounded-full bg-primary/20 text-primary text-xs font-bold tracking-widest uppercase mb-6 border border-primary/30">
            Premium Investment Platform
          </span>
          <h1 className="text-5xl md:text-7xl font-display font-bold text-foreground mb-6 leading-tight">
            Trade Smarter. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-teal-200">
              Grow Faster.
            </span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
            Access global forex markets with expert guidance, cutting-edge tools, and investment plans tailored for your financial goals.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              className="w-full sm:w-auto text-lg h-14 px-8 rounded-sm font-semibold shadow-lg shadow-primary/20"
              onClick={() => {
                document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
              }}
              data-testid="button-hero-get-started"
            >
              Get Started Today
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="w-full sm:w-auto text-lg h-14 px-8 rounded-sm font-semibold border-border hover:bg-muted"
              onClick={() => {
                document.getElementById("plans")?.scrollIntoView({ behavior: "smooth" });
              }}
              data-testid="button-hero-view-plans"
            >
              View Plans
            </Button>
          </div>
        </motion.div>
      </div>
      {/* Live proof ticker */}
      <LiveProofTicker />

      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 animate-bounce">
        <div className="w-[30px] h-[50px] rounded-full border-2 border-muted-foreground flex justify-center p-2">
          <div className="w-1 h-3 bg-primary rounded-full animate-pulse" />
        </div>
      </div>
    </section>
  );
}

// ==========================================
// Live Proof Ticker
// ==========================================
const PROOF_ENTRIES = [
  { name: "James O.", city: "London", amount: 1_240, plan: "Growth" },
  { name: "Amira K.", city: "Dubai", amount: 3_870, plan: "Premium" },
  { name: "Carlos M.", city: "Madrid", amount: 580, plan: "Starter" },
  { name: "Sophie L.", city: "Paris", amount: 2_100, plan: "Growth" },
  { name: "David A.", city: "Toronto", amount: 7_500, plan: "Premium" },
  { name: "Fatima R.", city: "Riyadh", amount: 920, plan: "Starter" },
  { name: "Ethan B.", city: "New York", amount: 4_350, plan: "Premium" },
  { name: "Priya S.", city: "Singapore", amount: 1_680, plan: "Growth" },
  { name: "Marco T.", city: "Milan", amount: 640, plan: "Starter" },
  { name: "Aisha N.", city: "Nairobi", amount: 2_900, plan: "Growth" },
  { name: "Liam C.", city: "Dublin", amount: 5_200, plan: "Premium" },
  { name: "Yuki H.", city: "Tokyo", amount: 1_050, plan: "Growth" },
  { name: "Olga P.", city: "Zurich", amount: 8_100, plan: "Premium" },
  { name: "Kwame A.", city: "Accra", amount: 430, plan: "Starter" },
  { name: "Rachel M.", city: "Sydney", amount: 3_300, plan: "Growth" },
  { name: "Ibrahim F.", city: "Istanbul", amount: 760, plan: "Starter" },
  { name: "Elena V.", city: "Amsterdam", amount: 6_700, plan: "Premium" },
  { name: "Tunde A.", city: "Lagos", amount: 1_450, plan: "Growth" },
  { name: "Nina W.", city: "Vienna", amount: 2_250, plan: "Growth" },
  { name: "Ahmed S.", city: "Cairo", amount: 510, plan: "Starter" },
];

function LiveProofTicker() {
  const [current, setCurrent] = useState<(typeof PROOF_ENTRIES)[0] | null>(null);
  const [visible, setVisible] = useState(false);
  const indexRef = useRef(Math.floor(Math.random() * PROOF_ENTRIES.length));

  useEffect(() => {
    // Stagger the first appearance so it doesn't show instantly
    const initialDelay = setTimeout(() => show(), 3500);
    return () => clearTimeout(initialDelay);
  }, []);

  function show() {
    const entry = PROOF_ENTRIES[indexRef.current % PROOF_ENTRIES.length];
    indexRef.current += 1;
    setCurrent(entry);
    setVisible(true);

    // Hide after 4.5 s, then schedule the next one
    const hideTimer = setTimeout(() => {
      setVisible(false);
      const nextDelay = 5000 + Math.random() * 4000; // 5–9 s gap
      setTimeout(show, nextDelay);
    }, 4500);

    return () => clearTimeout(hideTimer);
  }

  if (!current) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key={current.name + current.amount}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="absolute bottom-24 left-4 sm:left-8 z-20 flex items-center gap-3 bg-card/90 border border-border backdrop-blur-sm rounded-xl px-4 py-3 shadow-xl shadow-black/30 max-w-xs"
          data-testid="live-proof-ticker"
        >
          {/* Avatar */}
          <div className="w-9 h-9 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0 text-xs font-bold text-primary">
            {current.name.split(" ").map(n => n[0]).join("")}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-semibold text-foreground truncate">{current.name}</span>
              <span className="text-xs text-muted-foreground">from {current.city}</span>
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              just earned{" "}
              <span className="text-primary font-bold">
                +${current.amount.toLocaleString("en-US")}
              </span>{" "}
              on{" "}
              <span className="font-medium text-foreground">{current.plan} Plan</span>
            </div>
          </div>
          {/* Green pulse dot */}
          <div className="shrink-0 w-2 h-2 rounded-full bg-primary animate-pulse" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ==========================================
// CountUp
// ==========================================
function CountUp({
  to,
  prefix = "",
  suffix = "",
  duration = 1800,
  className,
}: {
  to: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  className?: string;
}) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const start = performance.now();
          const tick = (now: number) => {
            const progress = Math.min((now - start) / duration, 1);
            // ease-out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(eased * to));
            if (progress < 1) requestAnimationFrame(tick);
            else setCount(to);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.4 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [to, duration]);

  return (
    <div ref={ref} className={className} data-testid="stat-countup">
      {prefix}{count.toLocaleString("en-US")}{suffix}
    </div>
  );
}

// ==========================================
// Live Rates
// ==========================================
type RateItem = {
  label: string;
  value: string | null;
  change: number | null;
  prefix?: string;
};

function useLiveRates() {
  const [rates, setRates] = useState<RateItem[]>([
    { label: "EUR/USD", value: null, change: null },
    { label: "GBP/USD", value: null, change: null },
    { label: "BTC/USD", value: null, change: null, prefix: "$" },
    { label: "ETH/USD", value: null, change: null, prefix: "$" },
  ]);

  const fetchRates = async () => {
    try {
      const [fxRes, cryptoRes] = await Promise.all([
        fetch("https://api.frankfurter.app/latest?from=EUR,GBP&to=USD"),
        fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true"
        ),
      ]);

      const fxData = await fxRes.json();
      const cryptoData = await cryptoRes.json();

      setRates([
        {
          label: "EUR/USD",
          value: fxData?.rates?.EUR?.USD?.toFixed(4) ?? fxData?.rates?.USD?.toFixed(4) ?? null,
          change: null,
        },
        {
          label: "GBP/USD",
          value: fxData?.rates?.GBP?.USD?.toFixed(4) ?? null,
          change: null,
        },
        {
          label: "BTC/USD",
          value: cryptoData?.bitcoin?.usd?.toLocaleString("en-US") ?? null,
          change: cryptoData?.bitcoin?.usd_24h_change ?? null,
          prefix: "$",
        },
        {
          label: "ETH/USD",
          value: cryptoData?.ethereum?.usd?.toLocaleString("en-US") ?? null,
          change: cryptoData?.ethereum?.usd_24h_change ?? null,
          prefix: "$",
        },
      ]);
    } catch {
      // silently keep previous values on network error
    }
  };

  useEffect(() => {
    const fetchAll = async () => {
      try {
        // jsDelivr-hosted currency API — CORS-safe, no key needed
        const [usdBaseRes, cryptoRes] = await Promise.all([
          fetch("https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json"),
          fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true"),
        ]);

        const usdBase = await usdBaseRes.json();
        const cryptoData = await cryptoRes.json();

        const usd = usdBase?.usd ?? {};
        const eurRate = usd?.eur ? (1 / usd.eur).toFixed(4) : null;
        const gbpRate = usd?.gbp ? (1 / usd.gbp).toFixed(4) : null;

        setRates([
          { label: "EUR/USD", value: eurRate, change: null },
          { label: "GBP/USD", value: gbpRate, change: null },
          {
            label: "BTC/USD",
            value: cryptoData?.bitcoin?.usd?.toLocaleString("en-US") ?? null,
            change: cryptoData?.bitcoin?.usd_24h_change ?? null,
            prefix: "$",
          },
          {
            label: "ETH/USD",
            value: cryptoData?.ethereum?.usd?.toLocaleString("en-US") ?? null,
            change: cryptoData?.ethereum?.usd_24h_change ?? null,
            prefix: "$",
          },
        ]);
      } catch {
        // silently keep previous values on error
      }
    };

    fetchAll();
    const interval = setInterval(fetchAll, 30000);
    return () => clearInterval(interval);
  }, []);

  return rates;
}

function LiveRates() {
  const rates = useLiveRates();

  return (
    <section className="bg-card/30 border-b border-border py-4" data-testid="section-live-rates">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {rates.map((rate, i) => (
            <motion.div
              key={rate.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.07 }}
              className="flex items-center justify-between bg-background border border-border rounded-lg px-4 py-3 gap-3"
              data-testid={`card-rate-${rate.label.replace("/", "-").toLowerCase()}`}
            >
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{rate.label}</p>
                <p className="text-base font-bold text-foreground mt-0.5 font-mono">
                  {rate.value
                    ? `${rate.prefix ?? ""}${rate.value}`
                    : <span className="text-muted-foreground/40 animate-pulse">—</span>}
                </p>
              </div>
              {rate.change !== null ? (
                <span
                  className={`text-xs font-semibold px-2 py-1 rounded-md ${
                    rate.change >= 0
                      ? "bg-primary/10 text-primary"
                      : "bg-red-500/10 text-red-400"
                  }`}
                >
                  {rate.change >= 0 ? "+" : ""}{rate.change.toFixed(2)}%
                </span>
              ) : (
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse shrink-0" />
              )}
            </motion.div>
          ))}
        </div>
        <p className="text-right text-[10px] text-muted-foreground/40 mt-2 uppercase tracking-wider">
          Rates refresh every 30s · Indicative only
        </p>
      </div>
    </section>
  );
}

// ==========================================
// Partners
// ==========================================
const partners = [
  { label: "TradingView", icon: SiTradingview },
  { label: "Binance", icon: SiBinance },
  { label: "MetaTrader 4", icon: null },
  { label: "Bitcoin", icon: SiBitcoin },
  { label: "Ethereum", icon: SiEthereum },
  { label: "Visa", icon: SiVisa },
  { label: "Mastercard", icon: SiMastercard },
  { label: "Tether", icon: SiTether },
  { label: "cTrader", icon: null },
  { label: "Bloomberg", icon: null },
];

function PartnerItem({ label, icon: Icon }: { label: string; icon: React.ElementType | null }) {
  return (
    <div className="flex items-center gap-2.5 px-8 text-muted-foreground/50 hover:text-muted-foreground/80 transition-colors duration-300 select-none whitespace-nowrap">
      {Icon && <Icon className="h-5 w-5 shrink-0" />}
      <span className="text-sm font-semibold tracking-wide uppercase">{label}</span>
    </div>
  );
}

function Partners() {
  const doubled = [...partners, ...partners];

  return (
    <section className="border-y border-border bg-card/20 py-6 overflow-hidden" data-testid="section-partners">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 mb-4">
        <p className="text-center text-xs font-bold tracking-widest uppercase text-muted-foreground/40">
          Integrated with &amp; trusted by
        </p>
      </div>
      <div className="relative">
        {/* Left fade */}
        <div className="pointer-events-none absolute left-0 top-0 h-full w-24 z-10 bg-gradient-to-r from-background to-transparent" />
        {/* Right fade */}
        <div className="pointer-events-none absolute right-0 top-0 h-full w-24 z-10 bg-gradient-to-l from-background to-transparent" />

        <motion.div
          className="flex"
          animate={{ x: ["0%", "-50%"] }}
          transition={{ duration: 28, ease: "linear", repeat: Infinity }}
        >
          {doubled.map((p, i) => (
            <PartnerItem key={i} label={p.label} icon={p.icon} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function About() {
  return (
    <section id="about" className="py-24 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-primary font-bold tracking-widest uppercase text-sm mb-3">Who We Are</h2>
            <h3 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-6">
              Empowering global traders.
            </h3>
            <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
              Califox Global is a trusted platform for forex and cryptocurrency investments. We connect ambitious traders and investors in Africa and globally to lucrative financial opportunities.
            </p>
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              Our institutional-grade tools, combined with deep market expertise, ensure that your portfolio doesn't just survive market volatility—it thrives.
            </p>
            <div className="grid grid-cols-2 gap-6 pt-6 border-t border-border">
              <div>
                <CountUp to={10000} suffix="+" prefix="" className="text-4xl font-display font-bold text-foreground mb-1" />
                <div className="text-sm text-muted-foreground uppercase tracking-wide">Active Traders</div>
              </div>
              <div>
                <CountUp to={50} suffix="M+" prefix="$" className="text-4xl font-display font-bold text-foreground mb-1" />
                <div className="text-sm text-muted-foreground uppercase tracking-wide">Trading Volume</div>
              </div>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            <div className="absolute inset-0 bg-primary/20 blur-3xl -z-10 rounded-full" />
            <img
              src="https://images.pexels.com/photos/7698712/pexels-photo-7698712.jpeg"
              alt="Professional Trading"
              className="rounded-lg shadow-2xl border border-border object-cover w-full h-[500px]"
            />
            <div className="absolute -bottom-8 -left-8 bg-card p-6 rounded-lg border border-border shadow-xl">
              <div className="flex items-center gap-4">
                <div className="bg-primary/20 p-3 rounded-full text-primary">
                  <Shield className="h-6 w-6" />
                </div>
                <div>
                  <div className="font-bold text-foreground">Regulated & Secure</div>
                  <div className="text-sm text-muted-foreground">Industry-standard protection</div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function Services() {
  const services = [
    {
      icon: TrendingUp,
      title: "Forex Trading",
      description: "Trade major, minor, and exotic pairs with tight spreads and lightning-fast execution."
    },
    {
      icon: Shield,
      title: "Secure Investments",
      description: "Your funds are protected with industry-standard security and cold-storage encryption."
    },
    {
      icon: BarChart2,
      title: "Market Analysis",
      description: "Access daily insights, professional technical analysis, and actionable trade setups."
    }
  ];

  return (
    <section id="services" className="py-24 bg-card/30 relative">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-primary font-bold tracking-widest uppercase text-sm mb-3">Our Services</h2>
          <h3 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-6">
            Everything you need to succeed
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {services.map((service, i) => (
            <motion.div
              key={service.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              <Card className="bg-background/50 border-border hover:border-primary/50 transition-colors h-full">
                <CardHeader>
                  <div className="bg-primary/10 w-14 h-14 rounded-lg flex items-center justify-center text-primary mb-4">
                    <service.icon className="h-7 w-7" />
                  </div>
                  <CardTitle className="text-2xl font-display">{service.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">{service.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { num: "01", title: "Create Your Account", desc: "Sign up in minutes with our streamlined verification process." },
    { num: "02", title: "Monitor Your Profits", desc: "Track your portfolio in real-time through our advanced dashboard." },
    { num: "03", title: "Withdraw Earnings", desc: "Enjoy fast, secure, and hassle-free withdrawals anytime." }
  ];

  return (
    <section className="py-24 bg-background border-y border-border relative overflow-hidden">
      {/* Decorative background lines */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'linear-gradient(to right, #10b981 1px, transparent 1px)', backgroundSize: '100px 100%' }} />
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-primary font-bold tracking-widest uppercase text-sm mb-3">How It Works</h2>
            <h3 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-6">
              Start trading in three steps.
            </h3>
            <p className="text-lg text-muted-foreground mb-10">
              We've removed the friction from global investing. Our streamlined portal gets you into the markets faster.
            </p>
            <Button asChild size="lg" className="h-14 px-8 text-lg w-full sm:w-auto" data-testid="button-access-portal">
              <a href="https://portal.califoxglobal.com" target="_blank" rel="noopener noreferrer">
                Access Portal
                <ChevronRight className="ml-2 h-5 w-5" />
              </a>
            </Button>
          </motion.div>

          <div className="space-y-8">
            {steps.map((step, i) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
                className="flex gap-6 group"
              >
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 rounded-full bg-card border border-border flex items-center justify-center text-xl font-display font-bold text-primary group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all duration-300">
                    {step.num}
                  </div>
                </div>
                <div>
                  <h4 className="text-xl font-bold text-foreground mb-2">{step.title}</h4>
                  <p className="text-muted-foreground">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ==========================================
// Plans Data (localStorage-backed)
// ==========================================
type PlanData = {
  name: string;
  minDeposit: string;
  roi: string;
  desc: string;
  features: string[];
  popular: boolean;
};

const DEFAULT_PLANS: PlanData[] = [
  {
    name: "Starter",
    minDeposit: "$250",
    roi: "3–5% weekly",
    desc: "Perfect for beginners looking to enter the forex market with expert guidance.",
    features: ["Standard Support", "Basic Analysis", "Weekly Reports", "Standard Spreads"],
    popular: false,
  },
  {
    name: "Growth",
    minDeposit: "$1,000",
    roi: "6–10% weekly",
    desc: "Our most popular tier. Designed for serious traders aiming for consistent growth.",
    features: ["Priority Support", "Advanced Analysis", "Daily Trade Setups", "Tight Spreads", "Personal Account Manager"],
    popular: true,
  },
  {
    name: "Premium",
    minDeposit: "$5,000+",
    roi: "12–18% weekly",
    desc: "Institutional-grade tools and white-glove service for high-net-worth investors.",
    features: ["24/7 Dedicated Support", "Institutional Analysis", "VIP Signal Room", "Raw Spreads", "Custom Wealth Planning"],
    popular: false,
  },
];

const PLANS_KEY = "califox_plans";

function usePlans() {
  const [plans, setPlansState] = useState<PlanData[]>(() => {
    try {
      const stored = localStorage.getItem(PLANS_KEY);
      if (stored) return JSON.parse(stored) as PlanData[];
    } catch {}
    return DEFAULT_PLANS;
  });

  const savePlans = (updated: PlanData[]) => {
    localStorage.setItem(PLANS_KEY, JSON.stringify(updated));
    setPlansState(updated);
  };

  return { plans, savePlans };
}

// ==========================================
// Plans Section
// ==========================================
function Plans() {
  const { plans } = usePlans();

  return (
    <section id="plans" className="py-24 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-primary font-bold tracking-widest uppercase text-sm mb-3">Investment Plans</h2>
          <h3 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-6">
            Tailored for your goals.
          </h3>
          <CountdownTimer />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              <Card className={`relative h-full flex flex-col ${plan.popular ? 'border-primary shadow-2xl shadow-primary/10 md:scale-105 z-10 bg-card' : 'border-border bg-background'}`}>
                {plan.popular && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-primary-foreground px-4 py-1 text-xs font-bold uppercase tracking-wider rounded-full">
                    Most Popular
                  </div>
                )}
                <CardHeader className="text-center pb-8 pt-8">
                  <CardTitle className="text-2xl font-display mb-4">{plan.name}</CardTitle>
                  <div className="text-4xl font-bold text-foreground mb-1">{plan.minDeposit}</div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide mb-3">Minimum Deposit</div>
                  {plan.roi && (
                    <div className="inline-flex items-center gap-1.5 bg-primary/10 border border-primary/20 text-primary text-sm font-semibold px-3 py-1 rounded-full">
                      <TrendingUp className="h-3.5 w-3.5" />
                      {plan.roi} ROI
                    </div>
                  )}
                </CardHeader>
                <CardContent className="flex-1">
                  <p className="text-center text-muted-foreground mb-8 text-sm h-10">{plan.desc}</p>
                  <ul className="space-y-4">
                    {plan.features.map(feature => (
                      <li key={feature} className="flex items-start text-sm">
                        <ChevronRight className="h-5 w-5 text-primary shrink-0 mr-2" />
                        <span className="text-foreground/80">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button 
                    className={`w-full ${plan.popular ? '' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}
                    variant={plan.popular ? "default" : "secondary"}
                    onClick={() => {
                      document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
                    }}
                    data-testid={`button-plan-${plan.name.toLowerCase()}`}
                  >
                    Select Plan
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ==========================================
// Testimonials
// ==========================================
const testimonials = [
  {
    name: "James Harrington",
    location: "Toronto, Canada",
    avatar: "JH",
    plan: "Growth Plan",
    rating: 5,
    quote: "After trying two other forex platforms, Califox is the one I actually stayed with. The account manager is proactive rather than reactive, and the dashboard gives me everything I need at a glance. Solid experience from day one."
  },
  {
    name: "Sophie Mercier",
    location: "Paris, France",
    avatar: "SM",
    plan: "Premium Plan",
    rating: 5,
    quote: "The analytical depth here is extraordinary. Daily briefings, clear entry and exit points, and a strategist who actually picks up the phone. My portfolio performance this year speaks for itself."
  },
  {
    name: "Liam O'Brien",
    location: "Dublin, Ireland",
    avatar: "LO",
    plan: "Starter Plan",
    rating: 5,
    quote: "I started with the minimum just to test the waters. The onboarding was thorough, support was genuinely helpful, and within two months I had enough confidence — and profit — to move up to the Growth plan."
  },
  {
    name: "Fatima Al-Rashid",
    location: "Dubai, UAE",
    avatar: "FA",
    plan: "Premium Plan",
    rating: 5,
    quote: "Managing significant capital requires a platform I can trust completely. Califox delivers on security, transparency, and execution. The withdrawal process is seamless — funds arrive exactly when promised."
  },
  {
    name: "Marco Esposito",
    location: "Milan, Italy",
    avatar: "ME",
    plan: "Growth Plan",
    rating: 5,
    quote: "The signal quality and the reasoning behind each trade set Califox apart. I have learned more about market dynamics here than from years of reading on my own. The team treats you like a serious investor, not a ticket number."
  },
  {
    name: "Priya Nambiar",
    location: "London, UK",
    avatar: "PN",
    plan: "Growth Plan",
    rating: 5,
    quote: "Califox balances structure and flexibility well. The tools are sophisticated without being overwhelming, the team is responsive, and the results have been consistent. I recommend it to anyone serious about forex."
  }
];

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${i < rating ? "fill-primary text-primary" : "fill-muted text-muted"}`}
        />
      ))}
    </div>
  );
}

function Testimonials() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const total = testimonials.length;

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => {
      setActive((prev) => (prev + 1) % total);
    }, 5000);
    return () => clearInterval(timer);
  }, [paused, total]);

  return (
    <section id="testimonials" className="py-24 bg-card/30 border-y border-border overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-primary font-bold tracking-widest uppercase text-sm mb-3">Client Stories</h2>
          <h3 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-4">
            Trusted by traders worldwide.
          </h3>
          <p className="text-muted-foreground text-lg">
            Real results from real investors across Africa, the Middle East, and Europe.
          </p>
        </div>

        {/* Featured testimonial */}
        <div
          className="relative max-w-3xl mx-auto mb-12"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -24 }}
              transition={{ duration: 0.45, ease: "easeInOut" }}
            >
              <Card
                className="border-primary/30 bg-background shadow-2xl shadow-primary/5 text-center p-2"
                data-testid={`card-testimonial-${active}`}
              >
                <CardContent className="pt-10 pb-8 px-8 md:px-14">
                  <div className="flex justify-center mb-6">
                    <StarRating rating={testimonials[active].rating} />
                  </div>
                  <blockquote className="text-xl md:text-2xl text-foreground/90 font-display leading-relaxed mb-8">
                    &ldquo;{testimonials[active].quote}&rdquo;
                  </blockquote>
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-primary font-bold text-sm">
                      {testimonials[active].avatar}
                    </div>
                    <div className="font-bold text-foreground">{testimonials[active].name}</div>
                    <div className="text-sm text-muted-foreground">{testimonials[active].location}</div>
                    <span className="mt-1 inline-block text-xs font-semibold tracking-wider uppercase bg-primary/10 text-primary border border-primary/20 rounded-full px-3 py-0.5">
                      {testimonials[active].plan}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Dot navigation */}
        <div className="flex justify-center gap-3 mb-12">
          {testimonials.map((_, i) => (
            <button
              key={i}
              onClick={() => { setActive(i); setPaused(true); }}
              className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                i === active ? "bg-primary w-6" : "bg-muted-foreground/30 hover:bg-muted-foreground/60"
              }`}
              aria-label={`View testimonial ${i + 1}`}
              data-testid={`button-testimonial-dot-${i}`}
            />
          ))}
        </div>

        {/* All cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
            >
              <Card
                className={`h-full cursor-pointer transition-all duration-300 border ${
                  i === active
                    ? "border-primary/60 bg-primary/5 shadow-lg shadow-primary/10"
                    : "border-border bg-background/60 hover:border-primary/30"
                }`}
                onClick={() => { setActive(i); setPaused(true); }}
                data-testid={`card-testimonial-grid-${i}`}
              >
                <CardContent className="pt-6 pb-6">
                  <StarRating rating={t.rating} />
                  <p className="mt-4 text-sm text-muted-foreground leading-relaxed line-clamp-4">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <div className="mt-5 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                      {t.avatar}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-foreground">{t.name}</div>
                      <div className="text-xs text-muted-foreground">{t.location}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ==========================================
// FAQ
// ==========================================
const faqs = [
  {
    q: "How do I make my first deposit?",
    a: "After creating your account on the portal, navigate to the Deposit section and choose your preferred payment method. We support bank transfers, and our team will confirm your deposit within one business day. The minimum deposit is $250 for the Starter plan."
  },
  {
    q: "How and when can I withdraw my earnings?",
    a: "Withdrawals can be requested at any time through the portal. Once submitted, funds are processed and transferred within 24–72 hours depending on your bank or payment provider. There are no hidden withdrawal fees."
  },
  {
    q: "Is my money safe with Califox Global?",
    a: "We use industry-standard cold-storage encryption and multi-factor authentication to protect all client funds and account data. Client capital is held in segregated accounts, meaning it is never mixed with company operating funds."
  },
  {
    q: "What returns can I realistically expect?",
    a: "Returns vary based on market conditions, the plan you choose, and your risk tolerance settings. We focus on consistent, sustainable growth rather than aggressive speculation. Your account manager will set clear expectations during onboarding."
  },
  {
    q: "Can I upgrade my investment plan later?",
    a: "Yes. You can upgrade from Starter to Growth or Growth to Premium at any time by topping up your account to the new plan's minimum threshold. Your account manager will guide you through the transition."
  },
  {
    q: "Do I need prior trading experience?",
    a: "No experience is necessary. The Starter plan is specifically designed for beginners. Our team handles the active trading and provides you with regular updates, so you can learn at your own pace while your account grows."
  },
  {
    q: "How do I get support if I have a problem?",
    a: "You can reach our support team via Telegram, the contact form on this page, or directly through your account manager once onboarded. We typically respond within a few hours, and Premium clients have access to 24/7 dedicated support."
  },
  {
    q: "Are there any fees or commissions?",
    a: "There are no hidden fees. Any applicable performance fees or spreads are disclosed upfront during onboarding. What you see in your dashboard is what you earn — no surprises at withdrawal time."
  }
];

function FAQ() {
  return (
    <section id="faq" className="py-24 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-primary font-bold tracking-widest uppercase text-sm mb-3">FAQ</h2>
          <h3 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-4">
            Common questions, clear answers.
          </h3>
          <p className="text-muted-foreground text-lg">
            Everything you need to know before getting started. Still have questions? Chat with us on Telegram.
          </p>
        </div>

        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5 }}
          >
            <Accordion type="single" collapsible className="space-y-3" data-testid="accordion-faq">
              {faqs.map((faq, i) => (
                <AccordionItem
                  key={i}
                  value={`faq-${i}`}
                  className="border border-border rounded-lg px-6 bg-card/40 hover:border-primary/40 transition-colors data-[state=open]:border-primary/50 data-[state=open]:bg-primary/5"
                  data-testid={`accordion-item-faq-${i}`}
                >
                  <AccordionTrigger
                    className="text-left font-semibold text-foreground hover:text-primary hover:no-underline py-5 text-base"
                    data-testid={`accordion-trigger-faq-${i}`}
                  >
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed pb-5 text-base">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="mt-10 text-center"
          >
            <p className="text-muted-foreground mb-4">Still have a question?</p>
            <Button asChild variant="outline" className="border-primary/50 text-primary hover:bg-primary/10" data-testid="button-faq-telegram">
              <a href="https://t.me/califoxglobalplatform" target="_blank" rel="noopener noreferrer">
                <SiTelegram className="mr-2 h-4 w-4" />
                Chat with us on Telegram
              </a>
            </Button>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

const contactSchema = z.object({
  fullName: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(5, "Phone number is required"),
  message: z.string().min(10, "Message must be at least 10 characters")
});

type ContactFormValues = z.infer<typeof contactSchema>;

function Contact() {
  const { toast } = useToast();
  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      message: ""
    }
  });

  const [sending, setSending] = useState(false);

  const onSubmit = async (data: ContactFormValues) => {
    setSending(true);
    const text =
      `📩 *New Enquiry — Califox Global*\n\n` +
      `👤 *Name:* ${data.fullName}\n` +
      `📧 *Email:* ${data.email}\n` +
      `📞 *Phone:* ${data.phone}\n\n` +
      `💬 *Message:*\n${data.message}`;

    try {
      if (TELEGRAM_BOT_TOKEN !== "YOUR_BOT_TOKEN_HERE") {
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text, parse_mode: "Markdown" }),
        });
      }
      toast({
        title: "Message Sent Successfully ✓",
        description: "One of our account managers will contact you shortly.",
        duration: 5000,
      });
      form.reset();
    } catch {
      toast({
        title: "Failed to send message",
        description: "Please reach us directly on Telegram.",
        duration: 5000,
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <section id="contact" className="py-24 bg-card/30 border-t border-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-primary font-bold tracking-widest uppercase text-sm mb-3">Get in Touch</h2>
            <h3 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-6">
              Ready to elevate your portfolio?
            </h3>
            <p className="text-lg text-muted-foreground mb-8">
              Whether you have a question about our plans, need assistance with your account, or want to discuss wealth management strategies, our team is here for you.
            </p>
            
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                  <SiTelegram className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground uppercase tracking-wide">Telegram Support</div>
                  <a href="https://t.me/califoxglobalplatform" target="_blank" rel="noopener noreferrer" className="text-lg font-bold text-foreground hover:text-primary transition-colors">
                    @califoxglobalplatform
                  </a>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Card className="border-border bg-card shadow-xl">
              <CardHeader>
                <CardTitle className="text-2xl">Send us a message</CardTitle>
                <CardDescription>Fill out the form below and we'll get back to you.</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="fullName"
                      render={({ field }) => (
                         <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John Doe" className="bg-background" {...field} data-testid="input-contact-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                           <FormItem>
                            <FormLabel>Email Address</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="john@example.com" className="bg-background" {...field} data-testid="input-contact-email" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                           <FormItem>
                            <FormLabel>Phone Number</FormLabel>
                            <FormControl>
                              <Input type="tel" placeholder="+1 (555) 000-0000" className="bg-background" {...field} data-testid="input-contact-phone" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="message"
                      render={({ field }) => (
                         <FormItem>
                          <FormLabel>Message</FormLabel>
                          <FormControl>
                            <Textarea placeholder="How can we help you?" className="min-h-[120px] bg-background" {...field} data-testid="input-contact-message" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full h-12 text-lg" disabled={sending} data-testid="button-contact-submit">
                      {sending ? "Sending…" : "Submit Message"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-background border-t border-border pt-16 pb-8">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-12">
          <div>
            <span className="text-2xl font-display font-bold text-foreground">
              Califox <span className="text-primary">Global</span>
            </span>
            <p className="text-muted-foreground mt-2 max-w-sm">
              Trade Smarter. Grow Faster. Your trusted partner in global forex and cryptocurrency markets.
            </p>
          </div>
          <div className="flex gap-4">
             <Button asChild variant="outline" size="icon" className="rounded-full">
               <a href="https://t.me/califoxglobalplatform" target="_blank" rel="noopener noreferrer" aria-label="Telegram">
                 <SiTelegram className="h-5 w-5" />
               </a>
             </Button>
          </div>
        </div>
        <div className="border-t border-border pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Califox Global. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-primary transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-primary transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-primary transition-colors">Risk Disclosure</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ==========================================
// Market News
// ==========================================
type NewsItem = {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  thumbnail: string;
  author: string;
};

function useMarketNews() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Try multiple RSS sources — first one to succeed wins
    const FEEDS = [
      "https://www.cnbc.com/id/10000664/device/rss/rss.html",
      "https://feeds.content.dowjones.io/public/rss/mw_realtimeheadlines",
      "https://www.coindesk.com/arc/outboundfeeds/rss/",
    ];

    const parseRSS = (xml: string, fallbackSource: string): NewsItem[] => {
      const doc = new DOMParser().parseFromString(xml, "text/xml");
      const items = Array.from(doc.querySelectorAll("item")).slice(0, 6);
      return items.map((item) => {
        const get = (tag: string) => item.querySelector(tag)?.textContent?.trim() ?? "";
        const mediaUrl =
          item.querySelector("media\\:thumbnail, media\\:content")?.getAttribute("url") ??
          item.querySelector("enclosure")?.getAttribute("url") ??
          "";
        const rawDesc = get("description").replace(/<[^>]+>/g, "");
        return {
          title: get("title"),
          link: get("link"),
          pubDate: get("pubDate"),
          description: rawDesc.slice(0, 130) + (rawDesc.length > 130 ? "…" : ""),
          thumbnail: mediaUrl,
          author: get("author") || get("dc\\:creator") || fallbackSource,
        };
      });
    };

    const fetchNews = async () => {
      for (const rssUrl of FEEDS) {
        try {
          const proxy = `https://api.allorigins.win/get?url=${encodeURIComponent(rssUrl)}`;
          const res = await fetch(proxy, { signal: AbortSignal.timeout(8000) });
          const json = await res.json();
          if (!json.contents) continue;
          const parsed = parseRSS(json.contents, new URL(rssUrl).hostname.replace("www.", ""));
          if (parsed.length > 0) {
            setNews(parsed);
            break;
          }
        } catch {
          continue; // try next feed
        }
      }
      setLoading(false);
    };

    fetchNews();
    const interval = setInterval(fetchNews, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return { news, loading };
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function MarketNews() {
  const { news, loading } = useMarketNews();

  return (
    <section id="news" className="py-24 bg-card/30 border-y border-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
          <div>
            <h2 className="text-primary font-bold tracking-widest uppercase text-sm mb-3">Market News</h2>
            <h3 className="text-4xl md:text-5xl font-display font-bold text-foreground">
              Stay ahead of the market.
            </h3>
          </div>
          <p className="text-xs text-muted-foreground/50 uppercase tracking-wider">Updates every 5 min</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border bg-background animate-pulse h-52" />
            ))}
          </div>
        ) : news.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">Unable to load news at the moment. Check back shortly.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {news.map((item, i) => (
              <motion.a
                key={item.link}
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.4, delay: i * 0.07 }}
                className="group flex flex-col bg-background border border-border rounded-xl overflow-hidden hover:border-primary/40 transition-colors duration-200"
                data-testid={`card-news-${i}`}
              >
                {item.thumbnail && (
                  <div className="h-40 overflow-hidden bg-muted shrink-0">
                    <img
                      src={item.thumbnail}
                      alt=""
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  </div>
                )}
                <div className="flex flex-col flex-1 p-5">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-xs font-semibold text-primary uppercase tracking-wider">{item.author}</span>
                    <span className="text-xs text-muted-foreground shrink-0">{timeAgo(item.pubDate)}</span>
                  </div>
                  <h4 className="text-sm font-bold text-foreground leading-snug mb-2 group-hover:text-primary transition-colors line-clamp-3">
                    {item.title}
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mt-auto pt-3 border-t border-border/50">
                    {item.description}
                  </p>
                </div>
              </motion.a>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// ==========================================
// Refer a Friend
// ==========================================
const REFERRAL_URL = "https://califoxglobal.com/?ref=friend";
const REFERRAL_MESSAGE = `I've been trading with Califox Global and the results have been great. They offer forex and crypto investment plans starting from $250 with a dedicated account manager. Check it out: ${REFERRAL_URL}`;

function ReferAFriend() {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMsg, setCopiedMsg] = useState(false);

  const copyToClipboard = (text: string, type: "link" | "msg") => {
    navigator.clipboard.writeText(text).then(() => {
      if (type === "link") {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2500);
      } else {
        setCopiedMsg(true);
        setTimeout(() => setCopiedMsg(false), 2500);
      }
    });
  };

  const perks = [
    "Earn a bonus credit for every friend who joins",
    "Your referral gets priority onboarding support",
    "No limit — refer as many people as you like",
  ];

  return (
    <section id="refer" className="py-24 bg-background relative overflow-hidden">
      {/* Decorative glow */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="w-[600px] h-[300px] bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.55 }}
          >
            <Card className="border-primary/25 bg-card shadow-2xl shadow-primary/5 overflow-hidden">
              {/* Top accent bar */}
              <div className="h-1 w-full bg-gradient-to-r from-primary/60 via-primary to-primary/60" />

              <CardContent className="p-8 md:p-12">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
                  {/* Left — copy */}
                  <div>
                    <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary text-xs font-bold tracking-widest uppercase px-3 py-1.5 rounded-full mb-5">
                      <Gift className="h-3.5 w-3.5" />
                      Refer a Friend
                    </div>
                    <h3 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4 leading-tight">
                      Share Califox. <br />
                      <span className="text-primary">Earn together.</span>
                    </h3>
                    <p className="text-muted-foreground leading-relaxed mb-8">
                      Know someone ready to grow their wealth? Send them your referral link and both of you benefit when they join.
                    </p>
                    <ul className="space-y-3">
                      {perks.map((perk, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                          <ChevronRight className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          {perk}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Right — copy tools */}
                  <div className="space-y-5">
                    {/* Referral link */}
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Your referral link</p>
                      <div className="flex items-center gap-2 bg-background border border-border rounded-lg px-4 py-3">
                        <span className="flex-1 text-sm text-foreground/70 truncate font-mono">
                          {REFERRAL_URL}
                        </span>
                        <button
                          onClick={() => copyToClipboard(REFERRAL_URL, "link")}
                          data-testid="button-copy-referral-link"
                          className="shrink-0 flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                        >
                          {copiedLink ? (
                            <><Check className="h-3.5 w-3.5" /> Copied</>
                          ) : (
                            <><Copy className="h-3.5 w-3.5" /> Copy</>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Pre-written message */}
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Or share this message</p>
                      <div className="relative bg-background border border-border rounded-lg p-4">
                        <p className="text-sm text-foreground/70 leading-relaxed pr-6">
                          {REFERRAL_MESSAGE}
                        </p>
                        <button
                          onClick={() => copyToClipboard(REFERRAL_MESSAGE, "msg")}
                          data-testid="button-copy-referral-message"
                          className="absolute top-3 right-3 text-muted-foreground hover:text-primary transition-colors"
                          aria-label="Copy message"
                        >
                          {copiedMsg ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Share via Telegram */}
                    <Button
                      asChild
                      className="w-full h-12"
                      data-testid="button-refer-telegram"
                    >
                      <a
                        href={`https://t.me/share/url?url=${encodeURIComponent(REFERRAL_URL)}&text=${encodeURIComponent("Join me on Califox Global — trade forex and crypto with expert guidance. Starting from $250.")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <SiTelegram className="mr-2 h-4 w-4" />
                        Share via Telegram
                      </a>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ==========================================
// Cookie Consent Banner
// ==========================================
function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("califox_cookie_consent");
    if (!consent) {
      const timer = setTimeout(() => setVisible(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const accept = () => {
    localStorage.setItem("califox_cookie_consent", "accepted");
    setVisible(false);
  };

  const decline = () => {
    localStorage.setItem("califox_cookie_consent", "declined");
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="fixed bottom-0 left-0 right-0 z-[60] px-4 pb-4 sm:px-6 pointer-events-none"
          data-testid="banner-cookie-consent"
        >
          <div className="max-w-3xl mx-auto bg-card border border-border rounded-xl shadow-2xl shadow-black/40 p-5 flex flex-col sm:flex-row items-start sm:items-center gap-5 pointer-events-auto">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground mb-1">We use cookies</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Califox Global uses cookies to improve your browsing experience, analyse site traffic, and personalise content. By clicking <span className="text-foreground font-medium">Accept</span>, you consent to our use of cookies in accordance with our{" "}
                <a href="#" className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors">Privacy Policy</a>.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={decline}
                data-testid="button-cookie-decline"
                className="px-4 py-2 text-xs font-semibold text-muted-foreground border border-border rounded-lg hover:bg-muted/40 hover:text-foreground transition-colors"
              >
                Decline
              </button>
              <button
                onClick={accept}
                data-testid="button-cookie-accept"
                className="px-4 py-2 text-xs font-semibold bg-primary text-primary-foreground rounded-lg hover:brightness-110 transition-all shadow-md shadow-primary/20"
              >
                Accept All
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ==========================================
// Risk Disclaimer Banner
// ==========================================
function RiskDisclaimer() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <motion.div
      initial={{ y: 60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 60, opacity: 0 }}
      transition={{ duration: 0.4, delay: 1.2, ease: "easeOut" }}
      className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border"
      data-testid="banner-risk-disclaimer"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-6">
        <p className="text-xs text-muted-foreground leading-relaxed">
          <span className="font-semibold text-foreground/70 mr-1">Risk Warning:</span>
          Trading forex and cryptocurrencies involves substantial risk of loss and is not suitable for all investors. Past performance is not indicative of future results. Only invest capital you can afford to lose. Califox Global does not provide financial advice.
        </p>
        <button
          onClick={() => setDismissed(true)}
          aria-label="Dismiss risk disclaimer"
          data-testid="button-dismiss-disclaimer"
          className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
}

// ==========================================
// Floating Chat
// ==========================================
function FloatingChat() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Expandable options */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.92 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="flex flex-col items-end gap-3"
          >
            {/* LiveChat Portal */}
            <a
              href="https://direct.lc.chat/19781205"
              target="_blank"
              rel="noopener noreferrer"
              data-testid="button-float-livechat"
              className="flex items-center gap-3 group"
            >
              <span className="bg-card border border-border text-foreground text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                Live Chat Portal
              </span>
              <div className="w-12 h-12 rounded-full bg-card border border-primary/40 shadow-lg flex items-center justify-center text-primary hover:bg-primary/10 hover:border-primary transition-all duration-200">
                <MessageCircle className="h-5 w-5" />
              </div>
            </a>

            {/* Telegram */}
            <a
              href="https://t.me/califoxglobalplatform"
              target="_blank"
              rel="noopener noreferrer"
              data-testid="button-float-telegram"
              className="flex items-center gap-3 group"
            >
              <span className="bg-card border border-border text-foreground text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                Telegram Support
              </span>
              <div className="w-12 h-12 rounded-full bg-[#2CA5E0] shadow-lg flex items-center justify-center text-white hover:brightness-110 transition-all duration-200">
                <SiTelegram className="h-5 w-5" />
              </div>
            </a>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle button */}
      <motion.button
        onClick={() => setOpen((prev) => !prev)}
        whileTap={{ scale: 0.92 }}
        aria-label={open ? "Close support menu" : "Open support menu"}
        data-testid="button-float-toggle"
        className="w-14 h-14 rounded-full bg-primary shadow-xl shadow-primary/30 flex items-center justify-center text-primary-foreground hover:brightness-110 transition-all duration-200 relative"
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.span key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.18 }}>
              <X className="h-6 w-6" />
            </motion.span>
          ) : (
            <motion.span key="chat" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.18 }}>
              <MessageCircle className="h-6 w-6" />
            </motion.span>
          )}
        </AnimatePresence>
        {/* Pulse ring */}
        {!open && (
          <span className="absolute inset-0 rounded-full bg-primary animate-ping opacity-25 pointer-events-none" />
        )}
      </motion.button>
    </div>
  );
}

function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary selection:text-primary-foreground">
      <Ticker />
      <NavBar />
      <main>
        <Hero />
        <LiveRates />
        <Partners />
        <About />
        <Services />
        <HowItWorks />
        <Plans />
        <Testimonials />
        <MarketNews />
        <ReferAFriend />
        <FAQ />
        <Contact />
      </main>
      <Footer />
      <CookieConsent />
      <RiskDisclaimer />
      <FloatingChat />
    </div>
  );
}

// ==========================================
// Admin Dashboard
// ==========================================
const ADMIN_PASSWORD = "Califox@2024";
const ADMIN_SESSION_KEY = "califox_admin_auth";

function AdminLogin({ onAuth }: { onAuth: () => void }) {
  const [pw, setPw] = useState("");
  const [error, setError] = useState(false);
  const [show, setShow] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pw === ADMIN_PASSWORD) {
      sessionStorage.setItem(ADMIN_SESSION_KEY, "1");
      onAuth();
    } else {
      setError(true);
      setPw("");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 mb-4">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-display font-bold text-foreground">Admin Access</h1>
          <p className="text-sm text-muted-foreground mt-1">Califox Global Control Panel</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type={show ? "text" : "password"}
              value={pw}
              onChange={(e) => { setPw(e.target.value); setError(false); }}
              placeholder="Enter admin password"
              autoComplete="current-password"
              className="w-full rounded-lg border border-border bg-card text-foreground px-4 py-3 pr-12 text-sm outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-muted-foreground"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShow(!show)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              tabIndex={-1}
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {error && (
            <p className="text-xs text-red-400 flex items-center gap-1.5">
              <X className="h-3.5 w-3.5" /> Incorrect password. Try again.
            </p>
          )}
          <Button type="submit" className="w-full" disabled={!pw}>
            Unlock Dashboard
          </Button>
        </form>
        <p className="text-center mt-6 text-xs text-muted-foreground">
          <a href="/" className="hover:text-primary underline underline-offset-2">← Back to site</a>
        </p>
      </div>
    </div>
  );
}

function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const { plans, savePlans } = usePlans();
  const [draft, setDraft] = useState<PlanData[]>(JSON.parse(JSON.stringify(plans)));
  const [saved, setSaved] = useState(false);

  const updateField = (i: number, field: keyof PlanData, value: string | boolean | string[]) => {
    setDraft(prev => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: value };
      return next;
    });
    setSaved(false);
  };

  const updateFeature = (pi: number, fi: number, val: string) => {
    setDraft(prev => {
      const next = [...prev];
      const feats = [...next[pi].features];
      feats[fi] = val;
      next[pi] = { ...next[pi], features: feats };
      return next;
    });
    setSaved(false);
  };

  const addFeature = (pi: number) => {
    setDraft(prev => {
      const next = [...prev];
      next[pi] = { ...next[pi], features: [...next[pi].features, "New feature"] };
      return next;
    });
  };

  const removeFeature = (pi: number, fi: number) => {
    setDraft(prev => {
      const next = [...prev];
      const feats = next[pi].features.filter((_, idx) => idx !== fi);
      next[pi] = { ...next[pi], features: feats };
      return next;
    });
  };

  const handleSave = () => {
    savePlans(draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleReset = () => {
    savePlans(DEFAULT_PLANS);
    setDraft(JSON.parse(JSON.stringify(DEFAULT_PLANS)));
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-sm px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <Settings className="h-4 w-4 text-primary" />
          </div>
          <span className="font-display font-bold text-foreground text-sm">Califox Admin</span>
          <span className="text-xs text-muted-foreground border-l border-border pl-3">Investment Plans</span>
        </div>
        <div className="flex items-center gap-3">
          <a href="/" target="_blank" rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors">
            <ExternalLink className="h-3.5 w-3.5" /> View site
          </a>
          <Button variant="ghost" size="sm" onClick={onLogout} className="text-xs text-muted-foreground hover:text-foreground gap-1.5">
            <LogOut className="h-3.5 w-3.5" /> Logout
          </Button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Manage Plans</h1>
            <p className="text-sm text-muted-foreground mt-1">Changes go live on the website the moment you click Save.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={handleReset} className="text-xs gap-1.5">
              <RotateCcw className="h-3.5 w-3.5" /> Reset to defaults
            </Button>
            <Button size="sm" onClick={handleSave} className="gap-1.5 min-w-24">
              {saved ? <><Check className="h-3.5 w-3.5" /> Saved!</> : <><Save className="h-3.5 w-3.5" /> Save changes</>}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {draft.map((plan, pi) => (
            <div key={pi} className={`rounded-xl border ${plan.popular ? 'border-primary/50 bg-card' : 'border-border bg-card/60'} p-5 space-y-4`}>
              {/* Popular toggle */}
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Plan {pi + 1}</label>
                <button
                  type="button"
                  onClick={() => updateField(pi, "popular", !plan.popular)}
                  className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border transition-colors ${plan.popular ? 'bg-primary/10 border-primary/40 text-primary' : 'bg-transparent border-border text-muted-foreground hover:border-primary/30'}`}
                >
                  <Star className={`h-3 w-3 ${plan.popular ? 'fill-primary' : ''}`} />
                  {plan.popular ? "Most Popular" : "Set as popular"}
                </button>
              </div>

              {/* Name */}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Plan Name</label>
                <input
                  value={plan.name}
                  onChange={(e) => updateField(pi, "name", e.target.value)}
                  className="w-full rounded-lg border border-border bg-background text-foreground px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              {/* Min Deposit */}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Minimum Deposit</label>
                <input
                  value={plan.minDeposit}
                  onChange={(e) => updateField(pi, "minDeposit", e.target.value)}
                  className="w-full rounded-lg border border-border bg-background text-foreground px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="e.g. $500"
                />
              </div>

              {/* ROI */}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">ROI / Returns</label>
                <input
                  value={plan.roi}
                  onChange={(e) => updateField(pi, "roi", e.target.value)}
                  className="w-full rounded-lg border border-border bg-background text-foreground px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="e.g. 5–8% weekly"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Description</label>
                <textarea
                  value={plan.desc}
                  onChange={(e) => updateField(pi, "desc", e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-border bg-background text-foreground px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
              </div>

              {/* Features */}
              <div>
                <label className="text-xs text-muted-foreground mb-2 block">Features</label>
                <div className="space-y-2">
                  {plan.features.map((feat, fi) => (
                    <div key={fi} className="flex items-center gap-2">
                      <input
                        value={feat}
                        onChange={(e) => updateFeature(pi, fi, e.target.value)}
                        className="flex-1 rounded-lg border border-border bg-background text-foreground px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-primary/30"
                      />
                      <button
                        type="button"
                        onClick={() => removeFeature(pi, fi)}
                        className="text-muted-foreground hover:text-red-400 transition-colors"
                        title="Remove"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addFeature(pi)}
                    className="w-full text-xs border border-dashed border-border text-muted-foreground hover:border-primary/40 hover:text-primary rounded-lg py-1.5 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Plus className="h-3 w-3" /> Add feature
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {saved && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 flex items-center gap-2 text-sm text-primary bg-primary/10 border border-primary/20 rounded-lg px-4 py-3"
          >
            <Check className="h-4 w-4" />
            Plans updated and live on the website.
          </motion.div>
        )}
      </div>
    </div>
  );
}

function AdminPage() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem(ADMIN_SESSION_KEY) === "1");

  const handleLogout = () => {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    setAuthed(false);
  };

  if (!authed) return <AdminLogin onAuth={() => setAuthed(true)} />;
  return <AdminDashboard onLogout={handleLogout} />;
}

// ==========================================
// Router
// ==========================================
function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/admin" component={AdminPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
